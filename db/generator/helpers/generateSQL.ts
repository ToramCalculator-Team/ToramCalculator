/**
 * @file generateSQL.ts
 * @description SQL 生成器
 * 从 Prisma schema 生成 SQL 初始化脚本，支持同步架构
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { writeFileSafely } from "../utils/writeFileSafely";

interface TableStructure {
  tableName: string;
  columns: string[];
  constraints: string[];
}

/**
 * SQL 生成器
 */
export class SQLGenerator {
  private tempSchemaPath: string;
  private outputDir: string;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
    // 使用与主生成器相同的临时文件路径
    this.tempSchemaPath = path.join(outputDir, "schema.prisma");
  }

  /**
   * 生成 SQL 文件
   */
  async generate(schemaContent: string): Promise<void> {
    try {
      console.log("🔍 生成 SQL 初始化脚本...");
      
      // 1. 写入临时 schema 文件
      this.writeTempSchema(schemaContent);
      
      // 2. 生成服务端 SQL
      const serverSQL = this.generateServerSQL();
      
      // 3. 生成客户端 SQL（带同步架构转换）
      const clientSQL = this.generateClientSQL();
      
      // 4. 写入输出文件
      const serverSQLPath = path.join(this.outputDir, "server.sql");
      const clientSQLPath = path.join(this.outputDir, "client.sql");
      
      writeFileSafely(serverSQLPath, serverSQL);
      writeFileSafely(clientSQLPath, clientSQL);
      
      // 5. 修复关系表名称
      this.fixRelationTableNames(schemaContent);
      
      console.log("✅ SQL 初始化脚本生成完成");
    } catch (error) {
      console.error("❌ SQL 初始化脚本生成失败:", error);
      throw error;
    }
  }

  /**
   * 写入临时 schema 文件
   */
  private writeTempSchema(schemaContent: string): void {
    writeFileSafely(this.tempSchemaPath, schemaContent);
  }

  /**
   * 生成服务端 SQL
   */
  private generateServerSQL(): string {
    try {
      // 确保临时 schema 文件存在
      if (!fs.existsSync(this.tempSchemaPath)) {
        throw new Error(`临时 schema 文件不存在: ${this.tempSchemaPath}`);
      }

      const command = `npx prisma migrate diff --from-empty --to-schema-datamodel ${this.tempSchemaPath} --script`;
      console.log(`🔍 执行命令: ${command}`);
      
      const sql = execSync(command, { 
        encoding: 'utf-8',
        cwd: process.cwd(),
        stdio: 'pipe'
      });
      
      console.log("✅ 服务端 SQL 生成成功");
      return sql;
    } catch (error) {
      console.warn("⚠️  服务端 SQL 生成失败，使用默认 SQL:", error);
      return this.getDefaultSQL();
    }
  }

  /**
   * 生成客户端 SQL
   */
  private generateClientSQL(): string {
    try {
      // 先生成基础 SQL
      const baseSQL = this.generateServerSQL();
      
      // 转换客户端 SQL
      const transformedSQL = this.transformClientSql(baseSQL);
      
      console.log("✅ 客户端 SQL 生成成功");
      return transformedSQL;
    } catch (error) {
      console.warn("⚠️  客户端 SQL 生成失败，使用默认 SQL:", error);
      return this.getDefaultClientSQL();
    }
  }

  /**
   * 转换客户端 SQL 为同步架构
   */
  private transformClientSql(initContent: string): string {
    console.log("🔧 转换客户端 SQL 为同步架构...");
    
    // 删除外键约束和索引
    let content = initContent;
    
    // 删除所有 `ALTER TABLE` 语句中涉及 `FOREIGN KEY` 的行
    content = content.replace(/ALTER TABLE .* FOREIGN KEY.*;\n?/g, "");
    
    // 删除孤立的 `-- AddForeignKey` 行
    content = content.replace(/-- AddForeignKey\s*\n?/g, "");
    
    // 删除所有的 `CREATE INDEX` 语句
    content = content.replace(/CREATE INDEX.*;\n?/g, "");
    content = content.replace(/CREATE UNIQUE INDEX.*;\n?/g, "");
    
    // 删除孤立的 `-- CreateIndex` 行
    content = content.replace(/-- CreateIndex\s*\n?/g, "");
    
    console.log("✅ 外键约束及索引已删除");
    
    // 转换为同步架构
    return this.convertToSyncArchitecture(content);
  }

  /**
   * 将 SQL 转换为同步架构
   */
  private convertToSyncArchitecture(initContent: string): string {
    // 匹配完整的 SQL 块（包括注释）
    const blocks = initContent
      .split(/(?=^--|^CREATE\s|^ALTER\s|^DROP\s)/gim)
      .map((block) => block.trim())
      .filter(Boolean);

    const output: string[] = [];

    for (const block of blocks) {
      if (/^CREATE\s+TABLE/i.test(block)) {
        const parsed = this.parseCreateTable(block);
        if (!parsed) {
          output.push(`-- ⚠️ 无法解析的表定义保留如下：\n${block}`);
          continue;
        }

        const { tableName } = parsed;

        output.push(`-- ${tableName}`);

        // 跳过系统表/视图（以 public."_" 前缀的中间表除外）
        if (parsed.tableName && parsed.tableName.toLowerCase() !== 'changes') {
          output.push(this.generateSyncedTable(parsed));
          output.push(this.generateLocalTable(parsed));
          output.push(this.generateView(parsed));
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

    console.log("✅ 已转换客户端 SQL 为同步架构");
    return output.join("\n") + "\n" + changesTable;
  }

  /**
   * 从原始 CREATE TABLE 语句中提取结构信息
   */
  private parseCreateTable(sql: string): TableStructure | null {
    // 兼容诸如：
    // CREATE TABLE "public"."user" ( ... );
    // CREATE TABLE "user" ( ... );
    // CREATE TABLE public.user ( ... );
    const match = sql.match(/CREATE\s+TABLE\s+(?:"?([\w$]+)"?\.)?"?([\w$]+)"?\s*\(([\s\S]+?)\);/i);
    if (!match) return null;
    const [, _schema, rawName, body] = match;
    const tableName = rawName; // 丢弃 schema，使用原始表名
    const lines = body
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const columns: string[] = [];
    const constraints: string[] = [];

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
  private renamePrimaryKeyConstraint(constraints: string[], newName: string): string[] {
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
  private generateSyncedTable({ tableName, columns, constraints }: TableStructure): string {
    const renamedConstraints = this.renamePrimaryKeyConstraint(constraints, `${tableName}_synced_pkey`);
    const syncedCols = [...columns, `"write_id" UUID`];
    return `CREATE TABLE IF NOT EXISTS "${tableName}_synced" (\n  ${[...syncedCols, ...renamedConstraints].join(",\n  ")}\n);`;
  }

  /**
   * 生成 local 表结构
   */
  private generateLocalTable({ tableName, columns, constraints }: TableStructure): string {
    // 从约束中提取主键字段
    const pkConstraint = constraints.find(c => c.includes('PRIMARY KEY'));
    const pkCols = pkConstraint 
      ? pkConstraint.match(/PRIMARY KEY\s*\(([^)]+)\)/)?.[1]
          ?.split(',')
          .map(s => s.trim().replace(/"/g, '')) || []
      : [];
    
    const localCols = columns.map((col) => {
      const [name, type] = col.split(/\s+/, 2);
      // 动态处理主键字段，不硬编码字段名
      if (pkCols.includes(name)) return col; // 保留主键原样
      return `${name} ${type}`;
    });

    const renamedConstraints = this.renamePrimaryKeyConstraint(constraints, `${tableName}_local_pkey`);

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
  private generateView({ tableName, columns, constraints }: TableStructure): string {
    const colNames = columns.map((col) => col.split(/\s+/, 1)[0].replace(/^"|"$/g, ""));

    // 解析主键字段
    const pkConstraint = constraints.find((c) => /PRIMARY\s+KEY/i.test(c));
    const pkCols = pkConstraint
      ? pkConstraint
          .match(/\(([^)]+)\)/)?.[1]
          .split(",")
          .map((s) => s.trim().replace(/"/g, "")) || []
      : [];

    // 对于关联表，如果没有主键，使用所有列作为主键
    // 动态检测中间表（没有主键且表名以下划线开头）
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

    // 生成触发器函数和触发器
    const triggers = this.generateTriggers(tableName, colNames, pkCols);

    return view + "\n" + triggers;
  }

  /**
   * 生成触发器函数和触发器
   */
  private generateTriggers(tableName: string, colNames: string[], pkCols: string[]): string {
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
        "changed_columns",
        "is_deleted",
        "write_id"
    ) VALUES (
        ${colNames.map((name) => `NEW."${name}"`).join(", ")},
        changed_cols,
        FALSE,
        local_write_id
    );
    
    INSERT INTO changes (table_name, operation, value, write_id, transaction_id)
    VALUES (
        '${tableName}',
        'INSERT',
        json_build_object(
            ${jsonFields}
        ),
        local_write_id,
        txid_current()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;`;

    const triggerFnUpdate = `
CREATE OR REPLACE FUNCTION ${tableName}_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    synced RECORD;
BEGIN
    -- Get synced record
    SELECT * INTO synced FROM "${tableName}_synced" WHERE ${pkCols.map((pk) => `"${pk}" = NEW."${pk}"`).join(" AND ")};
    
    -- Check for changes
    ${changedColsCheck}
    
    -- If no changes, do nothing
    IF array_length(changed_cols, 1) IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Update or insert local record
    INSERT INTO "${tableName}_local" (
        ${colNames.map((name) => `"${name}"`).join(", ")},
        "changed_columns",
        "is_deleted",
        "write_id"
    ) VALUES (
        ${colNames.map((name) => `NEW."${name}"`).join(", ")},
        changed_cols,
        FALSE,
        local_write_id
    )
    ON CONFLICT (${pkCols.map((pk) => `"${pk}"`).join(", ")})
    DO UPDATE SET
        ${colNames.filter((name) => !pkCols.includes(name)).map((name) => `"${name}" = EXCLUDED."${name}"`).join(", ")},
        "changed_columns" = "${tableName}_local"."changed_columns" || EXCLUDED."changed_columns",
        "write_id" = EXCLUDED."write_id";
    
    INSERT INTO changes (table_name, operation, value, write_id, transaction_id)
    VALUES (
        '${tableName}',
        'UPDATE',
        json_build_object(
            ${updateJsonFields}
        ),
        local_write_id,
        txid_current()
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
    INSERT INTO "${tableName}_local" (
        ${colNames.map((name) => `"${name}"`).join(", ")},
        "changed_columns",
        "is_deleted",
        "write_id"
    ) VALUES (
        ${colNames.map((name) => `OLD."${name}"`).join(", ")},
        ARRAY[]::TEXT[],
        TRUE,
        local_write_id
    )
    ON CONFLICT (${pkCols.map((pk) => `"${pk}"`).join(", ")})
    DO UPDATE SET
        "is_deleted" = TRUE,
        "write_id" = EXCLUDED."write_id";
    
    INSERT INTO changes (table_name, operation, value, write_id, transaction_id)
    VALUES (
        '${tableName}',
        'DELETE',
        json_build_object(
            ${colNames.map((name) => `'${name}', OLD."${name}"`).join(",\n            ")}
        ),
        local_write_id,
        txid_current()
    );
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;`;

    const triggers = `
CREATE OR REPLACE TRIGGER ${tableName}_insert_trigger
    INSTEAD OF INSERT ON "${tableName}"
    FOR EACH ROW
    EXECUTE FUNCTION ${tableName}_insert_trigger();

CREATE OR REPLACE TRIGGER ${tableName}_update_trigger
    INSTEAD OF UPDATE ON "${tableName}"
    FOR EACH ROW
    EXECUTE FUNCTION ${tableName}_update_trigger();

CREATE OR REPLACE TRIGGER ${tableName}_delete_trigger
    INSTEAD OF DELETE ON "${tableName}"
    FOR EACH ROW
    EXECUTE FUNCTION ${tableName}_delete_trigger();`;

    return triggerFnInsert + "\n" + triggerFnUpdate + "\n" + triggerFnDelete + "\n" + triggers;
  }

  /**
   * 修复关系表名称
   */
  private fixRelationTableNames(updatedSchema: string): void {
    console.log("🔧 修复关系表名称...");
    
    // 从 schema 中提取关系表名称（以下划线开头的表）
    const relationTableMatches = updatedSchema.match(/model\s+_\w+/g);
    const relationTables = relationTableMatches 
      ? relationTableMatches.map(match => match.replace('model ', ''))
      : [];

    // 修复 SQL 中的表名引用
    const fixTableNames = (sql: string): string => {
      let fixedSql = sql;
      relationTables.forEach((tableName) => {
        // 替换表名引用，确保使用双引号包裹
        const regex = new RegExp(`\\b${tableName.toLowerCase()}\\b`, "g");
        fixedSql = fixedSql.replace(regex, `"${tableName}"`);
      });
      return fixedSql;
    };

    // 读取并修复 SQL 文件
    const serverSqlPath = path.join(this.outputDir, "server.sql");
    const clientSqlPath = path.join(this.outputDir, "client.sql");
    
    if (fs.existsSync(serverSqlPath)) {
      const serverSql = fs.readFileSync(serverSqlPath, "utf-8");
      fs.writeFileSync(serverSqlPath, fixTableNames(serverSql), "utf-8");
    }
    
    if (fs.existsSync(clientSqlPath)) {
      const clientSql = fs.readFileSync(clientSqlPath, "utf-8");
      fs.writeFileSync(clientSqlPath, fixTableNames(clientSql), "utf-8");
    }
    
    console.log("✅ 关系表名称修复完成");
  }

  /**
   * 获取默认 SQL
   */
  private getDefaultSQL(): string {
    return `-- 默认数据库初始化脚本
-- 请根据实际需要修改此脚本

-- 创建扩展（如果需要）
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建表
-- 这里应该包含所有表的创建语句
-- 请使用 prisma migrate diff 命令生成实际的 SQL
`;
  }

  /**
   * 获取默认客户端 SQL
   */
  private getDefaultClientSQL(): string {
    return `-- 默认客户端数据库初始化脚本
-- 这是服务端 SQL 的简化版本
-- 请根据实际需要修改此脚本
`;
  }
}