/**
 * @file generator.js
 * @description 开发环境生成器
 *
 * 主要功能：
 * 将baseSchema和enums结合，生成serverSchema和clientSchema
 * 1.sql处理
 * 根据serverSchema和clientSchema生成serverDB/init.sql和clientDB/init.sql
 * 对生成的clientDB/init.sql进行转换，使其能配合同步架构工作
 * 修复serverDB/init.sql和clientDB/init.sql中的表名引用，使其能正确引用
 * 2.生成kysely类型
 * 3.生成zod类型
 * 4.生成QueryBuilder规则
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { execSync } from "child_process";

// 导入工具模块
import { PATHS, GENERATOR_CONFIG } from "./utils/config.js";
import { StringUtils, FileUtils, CommandUtils, LogUtils } from "./utils/common.js";
import { TypeConverter, COMMON_OPERATORS } from "./utils/typeConverter.js";
import { SchemaParser } from "./utils/schemaParser.js";
import { EnumProcessor } from "./utils/enumProcessor.js";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * SQL 生成器
 * 负责生成数据库初始化 SQL 脚本
 */
class SQLGenerator {
  /**
   * 生成 SQL 文件
   * @param {string} updatedSchema - 更新后的 schema 内容
   * @param {string} kyselyGenerator - Kysely generator 配置
   * @param {Array} clientGenerators - 客户端 generators 配置
   * @param {Map} enumDefinitions - 枚举定义
   */
  static generate(updatedSchema, kyselyGenerator, clientGenerators, enumDefinitions) {
    // 生成最终的 schema 文件
    const finalSchema = updatedSchema + "\n" + Array.from(enumDefinitions.values()).join("\n\n");

    // 创建临时 schema 文件
    FileUtils.safeWriteFile(PATHS.serverDB.tempSchema, finalSchema);
    FileUtils.safeWriteFile(
      PATHS.clientDB.tempSchema,
      clientGenerators.join("\n") + "\n" + kyselyGenerator + finalSchema,
    );

    // 生成 SQL 文件
    CommandUtils.execCommand(
      `npx prisma migrate diff --from-empty --to-schema-datamodel ${PATHS.serverDB.tempSchema} --script > ${PATHS.serverDB.sql}`,
    );
    CommandUtils.execCommand(
      `npx prisma migrate diff --from-empty --to-schema-datamodel ${PATHS.clientDB.tempSchema} --script > ${PATHS.clientDB.sql}`,
    );

    // 转换clientDB/init.sql
    this.transformClientSql();

    // 修复关系表名称
    this.fixRelationTableNames(updatedSchema);
  }

  /**
   * 将clientDB/init.sql转换为支持同步架构的sql
   */
  static transformClientSql() {
    const initSQLFilePath = PATHS.clientDB.sql;
    // 读取文件内容
    let initContent = fs.readFileSync(initSQLFilePath, "utf-8");

    // 删除所有 `ALTER TABLE` 语句中涉及 `FOREIGN KEY` 的行
    initContent = initContent.replace(/ALTER TABLE .* FOREIGN KEY.*;\n?/g, "");

    // **删除孤立的 `-- AddForeignKey` 行**
    initContent = initContent.replace(/-- AddForeignKey\s*\n?/g, "");

    // 删除所有的 `CREATE INDEX` 语句
    initContent = initContent.replace(/CREATE INDEX.*;\n?/g, "");
    initContent = initContent.replace(/CREATE UNIQUE INDEX.*;\n?/g, "");

    // **删除孤立的 `-- CreateIndex` 行**
    initContent = initContent.replace(/-- CreateIndex\s*\n?/g, "");

    // **去除可能多余的空行**
    // initContent = initContent.replace(/\n{2,}/g, "\n");

    fs.writeFileSync(initSQLFilePath, initContent, "utf-8");

    LogUtils.logSuccess("外键约束及索引已删除！");

    ///////////////// 将sql转换成  *_synced 表（只读副本）；*_local 表（本地状态 + 乐观更新）；VIEW（合并读取视图）； ////////////////////

    /**
     * 从原始 CREATE TABLE 语句中提取结构信息
     */
    function parseCreateTable(sql) {
      // 兼容诸如：
      // CREATE TABLE "public"."user" ( ... );
      // CREATE TABLE "user" ( ... );
      // CREATE TABLE public.user ( ... );
      // 注意：客户端转换阶段统一忽略 schema，使用裸表名生成 *_synced/*_local/视图
      const match = sql.match(/CREATE\s+TABLE\s+(?:"?([\w$]+)"?\.)?"?([\w$]+)"?\s*\(([\s\S]+?)\);/i);
      if (!match) return null;
      const [, _schema, rawName, body] = match;
      const tableName = rawName; // 丢弃 schema，使用原始表名
      const lines = body
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      const columns = [];
      const constraints = [];

      for (const line of lines) {
        if (line.startsWith("CONSTRAINT") || line.startsWith("PRIMARY KEY") || line.startsWith("UNIQUE")) {
          constraints.push(line.replace(/,+$/, ""));
        } else {
          columns.push(line.replace(/,+$/, ""));
        }
      }

      return { tableName, columns, constraints };
    }

    /**
     * 重命名主键约束
     */
    function renamePrimaryKeyConstraint(constraints, newName) {
      return constraints.map((constraint) => {
        // 兼容无 CONSTRAINT 名称的 PRIMARY KEY 定义
        if (/CONSTRAINT\s+"[^"]*"\s+PRIMARY KEY/i.test(constraint)) {
          return constraint.replace(/CONSTRAINT\s+"[^"]*"\s+PRIMARY KEY/i, `CONSTRAINT "${newName}" PRIMARY KEY`);
        }
        if (/PRIMARY\s+KEY/i.test(constraint)) {
          return constraint.replace(/PRIMARY\s+KEY/i, `CONSTRAINT "${newName}" PRIMARY KEY`);
        }
        return constraint;
      });
    }

    /**
     * 生成 synced 表结构
     */
    function generateSyncedTable({ tableName, columns, constraints }) {
      const renamedConstraints = renamePrimaryKeyConstraint(constraints, `${tableName}_synced_pkey`);
      const syncedCols = [...columns, `"write_id" UUID`];
      return `CREATE TABLE IF NOT EXISTS "${tableName}_synced" (\n  ${[...syncedCols, ...renamedConstraints].join(",\n  ")}\n);`;
    }

    /**
     * 生成 local 表结构
     */
    function generateLocalTable({ tableName, columns, constraints }) {
      const localCols = columns.map((col) => {
        const [name, type] = col.split(/\s+/, 2);
        if (name === "id") return col; // 保留主键原样
        return `${name} ${type}`;
      });

      const renamedConstraints = renamePrimaryKeyConstraint(constraints, `${tableName}_local_pkey`);

      return `CREATE TABLE IF NOT EXISTS "${tableName}_local" (\n  ${[
        ...localCols,
        `"changed_columns" TEXT[]`,
        `"is_deleted" BOOLEAN NOT NULL DEFAULT FALSE`,
        `"write_id" UUID NOT NULL`,
        ...renamedConstraints,
      ].join(",\n  ")}
);`;
    }

    /**
     * 生成视图
     */
    function generateView({ tableName, columns, constraints }) {
      const colNames = columns.map((col) => col.split(/\s+/, 1)[0].replace(/^"|"$/g, ""));

      // 解析主键字段
      const pkConstraint = constraints.find((c) => /PRIMARY\s+KEY/i.test(c));
      const pkCols = pkConstraint
        ? pkConstraint
            .match(/\(([^)]+)\)/)[1]
            .split(",")
            .map((s) => s.trim().replace(/"/g, ""))
        : [];

      // 对于关联表，如果没有主键，使用所有列作为主键
      if (pkCols.length === 0 && tableName.startsWith("_")) {
        pkCols.push(...colNames);
      }

      // 如果仍然没有主键，使用 UNION ALL 方式
      if (pkCols.length === 0) {
        return `
CREATE OR REPLACE VIEW "${tableName}" AS
  SELECT
  ${colNames.map((name) => `   synced."${name}" AS "${name}"`).join(",\n")}
  FROM "${tableName}_synced" AS synced
  UNION ALL
  SELECT
  ${colNames.map((name) => `   local."${name}" AS "${name}"`).join(",\n")}
  FROM "${tableName}_local" AS local
  WHERE local."is_deleted" = FALSE;`;
      }

      const selectLines = colNames.map((name) =>
        pkCols.includes(name)
          ? `   COALESCE(local."${name}", synced."${name}") AS "${name}"`
          : `   CASE
    WHEN '${name}' = ANY(local.changed_columns)
      THEN local."${name}"
      ELSE synced."${name}"
    END AS "${name}"`,
      );

      const joinCondition = pkCols.length
        ? pkCols.map((pk) => `synced."${pk}" = local."${pk}"`).join(" AND ")
        : colNames.map((c) => `synced."${c}" = local."${c}"`).join(" AND ");
      const whereCondition = pkCols.length
        ? `(${pkCols.map((pk) => `local."${pk}" IS NULL`).join(" OR ")} OR local."is_deleted" = FALSE)`
        : `local."is_deleted" = FALSE`;

      const view = `
CREATE OR REPLACE VIEW "${tableName}" AS
  SELECT
  ${selectLines.join(",\n")}
  FROM "${tableName}_synced" AS synced
  FULL OUTER JOIN "${tableName}_local" AS local
  ON ${joinCondition}
  WHERE ${whereCondition};`;

      const jsonFields = colNames.map((name) => `'${name}', NEW."${name}"`).join(",\n      ");
      const updateJsonFields = colNames
        .map((name) => `'${name}', COALESCE(NEW."${name}", local."${name}")`)
        .join(",\n      ");

      const changedColsCheck = colNames
        .filter((c) => !pkCols.includes(c))
        .map(
          (name) => `
    IF NEW."${name}" IS DISTINCT FROM synced."${name}" THEN
      changed_cols := array_append(changed_cols, '${name}');
    END IF;`,
        )
        .join("");

      const triggerFnInsert = `
CREATE OR REPLACE FUNCTION ${tableName}_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Add all non-primary key columns to changed_columns
    ${colNames
      .filter((name) => !pkCols.includes(name))
      .map((name) => `changed_cols := array_append(changed_cols, '${name}');`)
      .join("\n    ")}

    INSERT INTO "${tableName}_local" (
    ${colNames.map((name) => `"${name}"`).join(", ")},
    changed_columns,
    write_id
    )
    VALUES (
    ${colNames.map((name) => `NEW."${name}"`).join(", ")},
    changed_cols,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '${tableName}',
    'insert',
    jsonb_build_object(
        ${jsonFields}
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;`;

      const updateSetLines =
        colNames
          .filter((c) => !pkCols.includes(c))
          .map(
            (name) =>
              `
    "${name}" = CASE WHEN NEW."${name}" IS DISTINCT FROM synced."${name}" THEN NEW."${name}" ELSE local."${name}" END`,
          )
          .join(",") || "-- no non-pk fields";

      const triggerFnUpdate = `
CREATE OR REPLACE FUNCTION ${tableName}_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "${tableName}_synced"%ROWTYPE;
    local "${tableName}_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "${tableName}_synced" WHERE ${pkCols.map((pk) => `"${pk}" = NEW."${pk}"`).join(" AND ")};
    SELECT * INTO local FROM "${tableName}_local" WHERE ${pkCols.map((pk) => `"${pk}" = NEW."${pk}"`).join(" AND ")};
    ${changedColsCheck || "-- no non-pk fields to track"}
    IF NOT FOUND THEN
    INSERT INTO "${tableName}_local" (
        ${colNames.map((name) => `"${name}"`).join(", ")},
        changed_columns,
        write_id
    )
    VALUES (
        ${colNames.map((name) => `NEW."${name}"`).join(", ")},
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "${tableName}_local"
    SET
        ${updateSetLines},
        changed_columns = (
        SELECT array_agg(DISTINCT col) FROM (
            SELECT unnest(local.changed_columns) AS col
            UNION
            SELECT unnest(changed_cols) AS col
        ) AS cols
        ),
        write_id = local_write_id
    WHERE ${pkCols.map((pk) => `"${pk}" = NEW."${pk}"`).join(" AND ")};
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '${tableName}',
    'update',
    jsonb_strip_nulls(jsonb_build_object(
        ${updateJsonFields}
    )),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;`;

      const triggerFnDelete = `
CREATE OR REPLACE FUNCTION ${tableName}_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "${tableName}_local" WHERE ${pkCols.map((pk) => `"${pk}" = OLD."${pk}"`).join(" AND ")}) THEN
    UPDATE "${tableName}_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE ${pkCols.map((pk) => `"${pk}" = OLD."${pk}"`).join(" AND ")};
    ELSE
    INSERT INTO "${tableName}_local" (
        ${pkCols.join(", ")},
        "is_deleted",
        "write_id"
    )
    VALUES (
        ${pkCols.map((pk) => `OLD."${pk}"`).join(", ")},
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '${tableName}',
    'delete',
    jsonb_build_object(${pkCols.map((pk) => `'${pk}', OLD."${pk}"`).join(", ")}),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;`;

      const triggers = `
CREATE OR REPLACE TRIGGER ${tableName}_insert
INSTEAD OF INSERT ON "${tableName}"
FOR EACH ROW EXECUTE FUNCTION ${tableName}_insert_trigger();

CREATE OR REPLACE TRIGGER ${tableName}_update
INSTEAD OF UPDATE ON "${tableName}"
FOR EACH ROW EXECUTE FUNCTION ${tableName}_update_trigger();

CREATE OR REPLACE TRIGGER ${tableName}_delete
INSTEAD OF DELETE ON "${tableName}"
FOR EACH ROW EXECUTE FUNCTION ${tableName}_delete_trigger();
`;

      const syncedInsertUpdateCleanupFn = `
CREATE OR REPLACE FUNCTION ${tableName}_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "${tableName}_local"
  WHERE ${pkCols.map((pk) => `"${pk}" = NEW."${pk}"`).join(" AND ")}
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`;

      const syncedDeleteCleanupFn = `
CREATE OR REPLACE FUNCTION ${tableName}_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "${tableName}_local"
  WHERE ${pkCols.map((pk) => `"${pk}" = OLD."${pk}"`).join(" AND ")};
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
`;

      const syncedTriggers = `
CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "${tableName}_synced"
FOR EACH ROW EXECUTE FUNCTION ${tableName}_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "${tableName}_synced"
FOR EACH ROW EXECUTE FUNCTION ${tableName}_delete_local_on_synced_delete_trigger();
`;

      return [
        view,
        triggerFnInsert,
        triggerFnUpdate,
        triggerFnDelete,
        triggers,
        syncedInsertUpdateCleanupFn,
        syncedDeleteCleanupFn,
        syncedTriggers,
      ].join("\n");
    }

    // 匹配完整的 SQL 块（包括注释）
    // 分块：按语句起始拆分，保证注释与 CREATE TABLE 分离
    const blocks = initContent
      .split(/(?=^--|^CREATE\s|^ALTER\s|^DROP\s)/gim)
      .map((block) => block.trim())
      .filter(Boolean);

    const output = [];

    for (const block of blocks) {
      if (/^CREATE\s+TABLE/i.test(block)) {
        const parsed = parseCreateTable(block);
        if (!parsed) {
          output.push(`-- ⚠️ 无法解析的表定义保留如下：\n${block}`);
          continue;
        }

        const { tableName } = parsed;

        output.push(`-- ${tableName}`);

        // output.push(`-- DROP original "${tableName}"`);
        // output.push(`DROP TABLE IF EXISTS "${tableName}";\n`);

        // 跳过系统表/视图（以 public."_" 前缀的中间表除外）
        if (parsed.tableName && parsed.tableName.toLowerCase() !== 'changes') {
          output.push(generateSyncedTable(parsed));
          output.push(generateLocalTable(parsed));
          output.push(generateView(parsed));
        }
      } else {
        // 其余 SQL 保留
        output.push(block);
      }
    }

    const changesTable = `CREATE TABLE IF NOT EXISTS changes (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  value JSONB NOT NULL,
  write_id UUID NOT NULL,
  transaction_id XID8 NOT NULL
);

CREATE OR REPLACE FUNCTION changes_notify_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NOTIFY changes;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER changes_notify
AFTER INSERT ON changes
FOR EACH ROW
EXECUTE FUNCTION changes_notify_trigger();
`;

    fs.writeFileSync(initSQLFilePath, output.join("\n") + "\n" + changesTable, "utf-8");
    LogUtils.logSuccess(`已转换initSQL ${initSQLFilePath}`);
  }

  /**
   * 生成 Kysely 类型
   */
  static generateKyselyTypes() {
    CommandUtils.execCommand(`prisma generate --schema=${PATHS.clientDB.tempSchema} --generator=kysely`);
  }

  /**
   * 修复关系表名称
   * @param {string} updatedSchema - 更新后的 schema 内容
   */
  static fixRelationTableNames(updatedSchema) {
    // 使用 SchemaParser 自动检测需要修复的关系表名称
    const schemaAnalysis = SchemaParser.analyzeSchema(updatedSchema);
    const relationTables = schemaAnalysis.relationTables;

    // 修复 SQL 中的表名引用
    const fixTableNames = (sql) => {
      let fixedSql = sql;
      relationTables.forEach((tableName) => {
        // 替换表名引用，确保使用双引号包裹
        const regex = new RegExp(`\\b${tableName.toLowerCase()}\\b`, "g");
        fixedSql = fixedSql.replace(regex, `"${tableName}"`);
      });
      return fixedSql;
    };

    // 读取并修复 SQL 文件
    const serverSql = FileUtils.safeReadFile(PATHS.serverDB.sql);
    const clientSql = FileUtils.safeReadFile(PATHS.clientDB.sql);

    // 写入修复后的 SQL 文件
    FileUtils.safeWriteFile(PATHS.serverDB.sql, fixTableNames(serverSql));
    FileUtils.safeWriteFile(PATHS.clientDB.sql, fixTableNames(clientSql));
  }
}

/**
 * Zod Schema 生成器
 * 负责生成 Zod 验证模式
 */
class ZodGenerator {
  /**
   * 生成 Zod schemas
   */
  static generate() {
    // 从 db/generated/kysely/enums.ts 生成 zod 枚举
    const enumSchemas = this.generateEnumSchemas();

    // 从 Kysely 类型定义生成 Zod schemas
    const generatedSchemas = this.generateModelSchemas();

    // 生成最终的 Zod schemas 文件内容
    const zodFileContent = `// 由脚本自动生成，请勿手动修改
import { z } from "zod";

${enumSchemas}
${generatedSchemas}
`;

    // 写入 Zod schemas 文件
    FileUtils.safeWriteFile(PATHS.zod.schemas, zodFileContent);
  }

  /**
   * 生成枚举 schemas
   * @returns {string} 枚举 schemas 内容
   */
  static generateEnumSchemas() {
    let enumSchemas = "";
    const enumMap = new Map();

    if (fs.existsSync(PATHS.kysely.enums)) {
      const enumsContent = FileUtils.safeReadFile(PATHS.kysely.enums);
      const enumConstRegex = /export const (\w+) = \{([\s\S]*?)\} as const;/g;
      let match;

      while ((match = enumConstRegex.exec(enumsContent)) !== null) {
        const enumName = match[1];
        const body = match[2];
        const valueRegex = /['"]?\w+['"]?\s*:\s*['"]([^'"]+)['"]/g;
        let valueMatch;
        const values = [];

        while ((valueMatch = valueRegex.exec(body)) !== null) {
          values.push(valueMatch[1]);
        }

        if (values.length > 0) {
          enumSchemas += `export const ${enumName}Schema = z.enum([${values.map((v) => `"${v}"`).join(", ")}]);\n`;
          enumSchemas += `export type ${enumName}Type = z.infer<typeof ${enumName}Schema>;\n\n`;
          enumMap.set(enumName.toLowerCase(), values);
        }
      }
    }

    return enumSchemas;
  }

  /**
   * 生成模型 schemas
   * @returns {string} 模型 schemas 内容
   */
  static generateModelSchemas() {
    const kyselyTypes = FileUtils.safeReadFile(PATHS.kysely.types);
    const parsedTypes = this.parseTypes(kyselyTypes);
    
    // 生成 Zod schemas
    const modelSchemas = Object.entries(parsedTypes)
      .map(([typeName, fields]) => {
        const schemaName = `${typeName.toLowerCase()}Schema`;
        const fieldsStr = Object.entries(fields)
          .map(([fieldName, zodType]) => `  ${fieldName}: ${zodType}`)
          .join(",\n");

        return `export const ${schemaName} = z.object({\n${fieldsStr}\n});`;
      })
      .join("\n\n");

    // 生成 dbSchema
    const dbSchema = this.generateDbSchema(kyselyTypes);
    
    return modelSchemas + "\n\n" + dbSchema;
  }

  /**
   * 生成 dbSchema
   * @param {string} kyselyTypes - Kysely 类型内容
   * @returns {string} dbSchema 内容
   */
  static generateDbSchema(kyselyTypes) {
    // 查找 DB 类型定义
    const dbTypeRegex = /export\s+type\s+DB\s*=\s*\{([\s\S]*?)\};/g;
    const dbMatch = dbTypeRegex.exec(kyselyTypes);
    
    if (!dbMatch) {
      return "";
    }

    const dbFieldsStr = dbMatch[1];
    const dbFields = this.parseFields(dbFieldsStr);
    
    // 生成 dbSchema
    const fieldsStr = Object.entries(dbFields)
      .map(([fieldName, zodType]) => `  ${fieldName}: ${zodType}`)
      .join(",\n");

    return `export const dbSchema = z.object({\n${fieldsStr}\n});`;
  }

  /**
   * 检查类型是否是关联类型
   * @param {string} type - TypeScript 类型
   * @returns {boolean} 是否是关联类型
   */
  static isRelationType(type) {
    // 检查是否是关联类型（包含 To 的类型，如 armorTocrystal, avatarTocharacter 等）
    if (type.includes('To') || type.includes('Relation')) {
      return true;
    }
    
    // 检查是否在 Kysely 类型文件中定义（如 campA, campB 等）
    if (fs.existsSync(PATHS.kysely.types)) {
      const typesContent = FileUtils.safeReadFile(PATHS.kysely.types);
      const escapedType = type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const typeRegex = new RegExp(`export\\s+type\\s+${escapedType}\\s*=\\s*\\{`);
      return typeRegex.test(typesContent);
    }
    
    return false;
  }

  /**
   * 检查类型是否是枚举类型
   * @param {string} type - TypeScript 类型
   * @returns {boolean} 是否是枚举类型
   */
  static isEnumType(type) {
    // LogUtils.logInfo(`    🔍 检查枚举类型: "${type}"`);
    
    // 从 Kysely enums.ts 文件中读取枚举定义
    if (fs.existsSync(PATHS.kysely.enums)) {
      // LogUtils.logInfo(`    📁 Kysely enums 文件存在: ${PATHS.kysely.enums}`);
      const enumsContent = FileUtils.safeReadFile(PATHS.kysely.enums);
      
      // 检查是否存在对应的枚举定义
      const enumRegex = new RegExp(`export const ${type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} = \\{`);
      // LogUtils.logInfo(`    🔍 搜索模式: export const ${type} = {`);
      
      const isMatch = enumRegex.test(enumsContent);
      // LogUtils.logInfo(`    ${isMatch ? '✅' : '❌'} 枚举匹配结果: ${isMatch}`);
      
      // if (!isMatch) {
      //   // 显示文件中的前几行来帮助调试
      //   const lines = enumsContent.split('\n').slice(0, 10);
      //   LogUtils.logInfo(`    📄 文件前10行:`);
      //   lines.forEach((line, index) => {
      //     LogUtils.logInfo(`      ${index + 1}: ${line}`);
      //   });
      // }
      
      return isMatch;
    } else {
      // LogUtils.logInfo(`    ❌ Kysely enums 文件不存在: ${PATHS.kysely.enums}`);
      return false;
    }
  }

  /**
   * 转换类型到 Zod 类型
   * @param {string} type - TypeScript 类型
   * @returns {string} Zod 类型
   */
  static convertTypeToZod(type) {
    // LogUtils.logInfo(`🔄 转换类型: "${type}"`);
    
    // 处理联合类型
    if (type.includes("|")) {
      // LogUtils.logInfo(`  📋 检测到联合类型: ${type}`);
      const types = type.split("|").map((t) => t.trim());
      // 如果包含 null，使用 nullable()
      if (types.includes("null")) {
        const nonNullTypes = types.filter((t) => t !== "null");
        if (nonNullTypes.length === 1) {
          const result = `${this.convertTypeToZod(nonNullTypes[0])}.nullable()`;
          // LogUtils.logInfo(`  ✅ 联合类型结果: ${result}`);
          return result;
        }
        const result = `z.union([${nonNullTypes.map((t) => this.convertTypeToZod(t)).join(", ")}]).nullable()`;
        // LogUtils.logInfo(`  ✅ 联合类型结果: ${result}`);
        return result;
      }
      const result = `z.union([${types.map((t) => this.convertTypeToZod(t)).join(", ")}])`;
      // LogUtils.logInfo(`  ✅ 联合类型结果: ${result}`);
      return result;
    }

    // 处理数组类型
    if (type.endsWith("[]")) {
      // LogUtils.logInfo(`  📋 检测到数组类型: ${type}`);
      const baseType = type.slice(0, -2);
      const result = `z.array(${this.convertTypeToZod(baseType)}).nullable()`;
      // LogUtils.logInfo(`  ✅ 数组类型结果: ${result}`);
      return result;
    }

    // 处理基本类型
    // LogUtils.logInfo(`  🔍 检查基本类型: "${type}"`);
    switch (type) {
      case "string":
        // LogUtils.logInfo(`  ✅ 匹配基本类型: string -> z.string()`);
        return "z.string()";
      case "number":
        // LogUtils.logInfo(`  ✅ 匹配基本类型: number -> z.number()`);
        return "z.number()";
      case "boolean":
        // LogUtils.logInfo(`  ✅ 匹配基本类型: boolean -> z.boolean()`);
        return "z.boolean()";
      case "Date":
        // LogUtils.logInfo(`  ✅ 匹配基本类型: ${type} -> z.date()`);
        return "z.date()";
      case "Timestamp":
        // LogUtils.logInfo(`  ✅ 匹配基本类型: ${type} -> z.date()`);
        return "z.any()"; // 从数据库查询返回的 Timestamp 类型是 Date
      case "JsonValue":
      case "InputJsonValue":
        // LogUtils.logInfo(`  ✅ 匹配基本类型: ${type} -> JSON类型`);
        return `z.lazy(() => z.union([
          z.string(),
          z.number(),
          z.boolean(),
          z.literal(null),
          z.record(z.lazy(() => z.union([z.any(), z.literal(null)]))),
          z.array(z.lazy(() => z.union([z.any(), z.literal(null)])))
        ]))`;
      case "unknown":
        // LogUtils.logInfo(`  ✅ 匹配基本类型: unknown -> z.unknown()`);
        return `z.unknown()`;
      default:
        // LogUtils.logInfo(`  ❌ 未匹配基本类型，进入默认处理: "${type}"`);
        
        // 检查是否是枚举类型（以 Type 结尾）
        if (type.endsWith("Type")) {
          // LogUtils.logInfo(`  🔍 检测到枚举类型（Type结尾）: ${type}`);
          const enumName = type.replace("Type", "");
          // 确保枚举名称首字母大写
          const pascalCaseEnum = enumName.charAt(0).toUpperCase() + enumName.slice(1);
          const result = `${pascalCaseEnum}TypeSchema`;
          // LogUtils.logInfo(`  ✅ 枚举类型结果: ${result}`);
          return result;
        }
        
        // 检查是否是直接的枚举类型（如 MobDifficultyFlag）
        // LogUtils.logInfo(`  🔍 检查是否是直接枚举类型: ${type}`);
        if (this.isEnumType(type)) {
          const result = `${type}Schema`;
          // LogUtils.logInfo(`  ✅ 直接枚举类型结果: ${result}`);
          return result;
        } else {
          // LogUtils.logInfo(`  ❌ 不是直接枚举类型: ${type}`);
        }
        
        // 检查是否是关联类型（如 armorTocrystal, avatarTocharacter 等）
        if (this.isRelationType(type)) {
          const result = `${type.toLowerCase()}Schema`;
          // LogUtils.logInfo(`  ✅ 关联类型结果: ${result}`);
          return result;
        }
        
        // 检查是否是字面量类型
        if (type.startsWith('"') && type.endsWith('"')) {
          // LogUtils.logInfo(`  ✅ 检测到字面量类型: ${type}`);
          const result = `z.literal(${type})`;
          // LogUtils.logInfo(`  ✅ 字面量类型结果: ${result}`);
          return result;
        }
        
        // 对于未知类型，使用更安全的 JSON 类型
        // LogUtils.logInfo(`  ⚠️  未知类型，使用通用JSON类型: ${type}`);
        const result = `z.lazy(() => z.union([
          z.string(),
          z.number(),
          z.boolean(),
          z.literal(null),
          z.record(z.lazy(() => z.union([z.any(), z.literal(null)]))),
          z.array(z.lazy(() => z.union([z.any(), z.literal(null)])))
        ]))`;
        // LogUtils.logInfo(`  ✅ 通用JSON类型结果: ${result}`);
        return result;
    }
  }

  /**
   * 解析字段
   * @param {string} fieldsStr - 字段字符串
   * @returns {Object} 字段映射
   */
  static parseFields(fieldsStr) {
    const fields = {};
    const fieldRegex = /(\w+)(\?)?:\s*([^;]+);/g;
    let match;

    while ((match = fieldRegex.exec(fieldsStr)) !== null) {
      const [, name, optional, type] = match;
      const zodType = this.convertTypeToZod(type.trim());
      fields[name] = optional ? `${zodType}.nullable()` : zodType;
    }

    return fields;
  }

  /**
   * 解析类型定义
   * @param {string} kyselyTypes - Kysely 类型内容
   * @returns {Object} 类型映射
   */
  static parseTypes(kyselyTypes) {
    const types = {};
    const typeRegex = /export\s+type\s+(\w+)\s*=\s*\{([\s\S]*?)\};/g;
    let match;

    while ((match = typeRegex.exec(kyselyTypes)) !== null) {
      const [, typeName, fieldsStr] = match;
      
      // 跳过不需要的类型
      if (
        typeName === "Generated" ||
        typeName === "Timestamp" ||
        typeName === "DB"
      ) {
        continue;
      }

      types[typeName] = this.parseFields(fieldsStr);
    }

    return types;
  }
}

/**
 * QueryBuilder 生成器优化
 * 负责生成 QueryBuilder 的规则文件
 */
class QueryBuilderGenerator {
  static generate(enumTypeToNameMap) {
    LogUtils.logStep("QueryBuilder", "开始生成 QueryBuilder 规则");
    
    // 使用完整的 EnumProcessor
    const enumProcessor = new EnumProcessor();
    const { updatedSchema } = enumProcessor.processEnums().processSchema();
    
    // 解析 schema
    const models = SchemaParser.parseDetailedModels(updatedSchema);
    const schemaEnums = SchemaParser.parseEnums(updatedSchema);
    
    // 合并枚举定义（从 EnumProcessor 获取）
    const allEnums = {};
    for (const [enumName, values] of enumProcessor.getExtractedEnums()) {
      allEnums[enumName] = values;
    }
    Object.assign(allEnums, schemaEnums);
    
    let rulesContent = `// 由脚本自动生成，请勿手动修改
import { Fields } from "@query-builder/solid-query-builder";

// 通用操作符配置
export const OPERATORS = {
  string: ${JSON.stringify(COMMON_OPERATORS.string, null, 2)},
  number: ${JSON.stringify(COMMON_OPERATORS.number, null, 2)},
  date: ${JSON.stringify(COMMON_OPERATORS.date, null, 2)},
  boolean: ${JSON.stringify(COMMON_OPERATORS.boolean, null, 2)},
  enum: ${JSON.stringify(COMMON_OPERATORS.enum, null, 2)},
};

// 枚举值配置
`;

    // 生成枚举配置
    for (const [enumName, values] of Object.entries(allEnums)) {
      const pascalEnumName = StringUtils.toPascalCase(enumName);
      rulesContent += `export const ${pascalEnumName}Enum = [
  ${values.map(v => `{ value: "${v}", label: "${v}" }`).join(",\n  ")}
];

`;
    }

    // 生成字段配置
    for (const model of models) {
      const modelName = StringUtils.toPascalCase(model.name);
      rulesContent += `export const ${modelName}Fields: Fields[] = [
  ${model.fields.map(field => {
    const fieldName = StringUtils.toPascalCase(field.name);
    const label = StringUtils.generateLabel(field.name);
          const typeConfig = TypeConverter.prismaToQueryBuilder(field.type, field.isOptional);
    
    // 检查是否是枚举字段
    let enumConfig = "";
    let valueEditorType = typeConfig.valueEditorType;
    let inputType = typeConfig.inputType;
    
    if (field.enumType) {
      // 使用已建立的枚举映射
      const enumName = enumTypeToNameMap.get(field.enumType);
      
      if (enumName && allEnums[enumName]) {
        enumConfig = `,\n    values: ${StringUtils.toPascalCase(enumName)}Enum`;
        // 枚举字段使用 radio 组件
        valueEditorType = "radio";
        inputType = "radio";
      }
    }
    
    // 根据字段类型优化配置
    let additionalConfig = "";
    if (typeConfig.comparator === "boolean") {
      // 布尔字段使用 checkbox
      valueEditorType = "checkbox";
      inputType = "checkbox";
    } else if (typeConfig.comparator === "date") {
      // 日期字段使用文本输入（库不支持 date 类型）
      valueEditorType = "text";
      inputType = "text";
    } else if (typeConfig.comparator === "number") {
      // 数字字段使用文本输入（库不支持 number 类型）
      valueEditorType = "text";
      inputType = "number";
    }
    
    return `{
    name: "${fieldName}",
    label: "${label}",
    placeholder: "请选择或输入${label.toLowerCase()}",
    id: "${field.name}",
    valueEditorType: "${valueEditorType}",
    inputType: "${inputType}",
    comparator: "${typeConfig.comparator}",
    operators: OPERATORS.${typeConfig.comparator},
    defaultOperator: "${typeConfig.operators[0].value}",
    defaultValue: ${field.isOptional ? 'null' : '""'}${enumConfig}${additionalConfig}
  }`;
  }).join(",\n  ")}
];

`;
    }

    FileUtils.safeWriteFile(PATHS.queryBuilder.rules, rulesContent);
    LogUtils.logSuccess("QueryBuilder 规则生成完成！");
    
    const stats = {
      "模型数量": models.length,
      "字段总数": models.reduce((sum, model) => sum + model.fields.length, 0),
      "枚举数量": Object.keys(allEnums).length,
      "文件大小": `${Math.round(rulesContent.length / 1024)}KB`
    };
    console.log(LogUtils.formatStats(stats));
  }
}

/**
 * 主函数
 * 协调所有生成器的执行
 */
async function main() {
  try {
    LogUtils.logStep("初始化", "开始生成...");

    // 确保目录存在
    FileUtils.ensureDirectories(GENERATOR_CONFIG.directories);

    // 1. 处理枚举和 Schema
    LogUtils.logStep("枚举处理", "处理枚举和 Schema");
    const enumProcessor = new EnumProcessor();
    const { updatedSchema, kyselyGenerator, clientGenerators } = enumProcessor.processEnums().processSchema();

    // 2. 生成 SQL
    LogUtils.logStep("SQL生成", "生成 SQL");
    SQLGenerator.generate(updatedSchema, kyselyGenerator, clientGenerators, enumProcessor.getEnumDefinitions());

    // 3. 生成 Kysely 类型
    LogUtils.logStep("Kysely生成", "生成 Kysely 类型");
    SQLGenerator.generateKyselyTypes();

    // 4. 生成 Zod schemas (移到Kysely类型生成之后)
    LogUtils.logStep("Zod生成", "生成 Zod schemas");
    ZodGenerator.generate();

    // 5. 生成 QueryBuilder 规则
    LogUtils.logStep("QueryBuilder生成", "生成 QueryBuilder 规则");
    QueryBuilderGenerator.generate(enumProcessor.getEnumTypeToNameMap());

    // 清理临时文件
    FileUtils.cleanupTempFiles(GENERATOR_CONFIG.tempFiles);

    LogUtils.logSuccess("所有生成完成！");
  } catch (error) {
    LogUtils.logError("生成失败", error);
    process.exit(1);
  }
}

// 如果直接运行此文件，则执行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
main();
}
