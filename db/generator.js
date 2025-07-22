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
import { SchemaAnalyzer } from "./utils/SchemaAnalyzer.js";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 文件路径配置
 */
const PATHS = {
  // 输入文件
  enums: path.join(__dirname, "enums.ts"),
  baseSchema: path.join(__dirname, "baseSchema.prisma"),

  // 生成的文件
  serverDB: {
    sql: path.join(__dirname, "generated/serverDB/init.sql"),
    tempSchema: path.join(__dirname, "temp_server_schema.prisma"),
  },
  clientDB: {
    sql: path.join(__dirname, "generated/clientDB/init.sql"),
    tempSchema: path.join(__dirname, "temp_client_schema.prisma"),
  },
  zod: {
    schemas: path.join(__dirname, "generated/zod/index.ts"),
  },
  kysely: {
    types: path.join(__dirname, "generated/kysely/kyesely.ts"),
    enums: path.join(__dirname, "generated/kysely/enums.ts"),
  },
  queryBuilder: {
    rules: path.join(__dirname, "generated/queryBuilderRules.ts"),
  },
};

/**
 * 通用工具函数
 */
const utils = {
  /**
   * 转换为 PascalCase
   * @param {string} str - 输入字符串
   * @returns {string} PascalCase 字符串
   */
  toPascalCase: (str) => str.toLowerCase().replace(/(?:^|_)([a-z])/g, (_, c) => c.toUpperCase()),
  
  /**
   * 转换为 camelCase
   * @param {string} str - 输入字符串
   * @returns {string} camelCase 字符串
   */
  toCamelCase: (str) => str.toLowerCase().replace(/(?:^|_)([a-z])/g, (_, c) => c.toUpperCase()).replace(/^[A-Z]/, c => c.toLowerCase()),
  
  /**
   * 生成用户友好的标签
   * @param {string} fieldName - 字段名
   * @returns {string} 用户友好标签
   */
  generateLabel: (fieldName) => {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  },

  /**
   * 从注释中提取字段描述
   * @param {string} comment - 注释内容
   * @returns {string} 字段描述
   */
  extractDescription: (comment) => {
    if (!comment) return '';
    return comment.replace(/\/\/\s*/, '').trim();
  },

  /**
   * 执行命令并处理错误
   * @param {string} command - 要执行的命令
   * @param {Object} options - 执行选项
   */
  execCommand: (command, options = {}) => {
    try {
      execSync(command, { stdio: "inherit", ...options });
    } catch (error) {
      console.error(`命令执行失败: ${command}`, error);
      throw error;
    }
  },

  /**
   * 安全的文件写入
   * @param {string} filePath - 文件路径
   * @param {string} content - 文件内容
   * @param {string} encoding - 编码格式
   */
  safeWriteFile: (filePath, content, encoding = "utf-8") => {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, content, encoding);
    } catch (error) {
      console.error(`写入文件失败: ${filePath}`, error);
      throw error;
    }
  },

  /**
   * 安全的文件读取
   * @param {string} filePath - 文件路径
   * @param {string} encoding - 编码格式
   * @returns {string} 文件内容
   */
  safeReadFile: (filePath, encoding = "utf-8") => {
    try {
      return fs.readFileSync(filePath, encoding);
    } catch (error) {
      console.error(`读取文件失败: ${filePath}`, error);
      throw error;
    }
  },

  /**
   * 确保目录存在
   */
  ensureDirectories: () => {
    const dirs = [
      path.dirname(PATHS.serverDB.sql), 
      path.dirname(PATHS.clientDB.sql), 
      path.dirname(PATHS.zod.schemas),
      path.dirname(PATHS.queryBuilder.rules)
    ];

    dirs.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  },

  /**
   * 清理临时文件
   */
  cleanupTempFiles: () => {
    const tempFiles = [PATHS.serverDB.tempSchema, PATHS.clientDB.tempSchema];

    tempFiles.forEach((file) => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
  },
};

// 通用操作符配置
const COMMON_OPERATORS = {
  // 字符串操作符
  string: [
    { name: "equals", value: "equals", label: "Equals" },
    { name: "!=", value: "!=", label: "Not Equals" },
    { name: "contains", value: "contains", label: "Contains" },
    { name: "beginsWith", value: "beginsWith", label: "Begins With" },
    { name: "endsWith", value: "endsWith", label: "Ends With" },
  ],
  // 数字操作符
  number: [
    { name: "equals", value: "equals", label: "Equals" },
    { name: "!=", value: "!=", label: "Not Equals" },
    { name: "greater_than", value: "greater_than", label: "Greater Than" },
    { name: "less_than", value: "less_than", label: "Less Than" },
    { name: "between", value: "between", label: "Between" },
  ],
  // 日期操作符
  date: [
    { name: "equals", value: "equals", label: "Equals" },
    { name: "!=", value: "!=", label: "Not Equals" },
    { name: "greater_than", value: "greater_than", label: "Greater Than" },
    { name: "less_than", value: "less_than", label: "Less Than" },
    { name: "between", value: "between", label: "Between" },
  ],
  // 布尔操作符
  boolean: [
    { name: "equals", value: "equals", label: "Equals" },
    { name: "!=", value: "!=", label: "Not Equals" },
  ],
  // 枚举操作符
  enum: [
    { name: "equals", value: "equals", label: "Equals" },
    { name: "!=", value: "!=", label: "Not Equals" },
    { name: "in", value: "in", label: "In" },
    { name: "not_in", value: "not_in", label: "Not In" },
  ],
};

// 类型转换器优化
const typeConverter = {
  prismaToQueryBuilder: (prismaType, isOptional = false) => {
    const baseType = typeConverter.extractBaseType(prismaType);
    
    if (typeConverter.isEnumType(prismaType)) {
      return {
        valueEditorType: "select",
        inputType: "text",
        comparator: "enum",
        operators: COMMON_OPERATORS.enum,
      };
    }
    
    if (typeConverter.isRelationType(prismaType)) {
      return {
        valueEditorType: "text",
        inputType: "text",
        comparator: "string",
        operators: COMMON_OPERATORS.string,
      };
    }
    
    if (typeConverter.isArrayType(prismaType)) {
      return {
        valueEditorType: "text",
        inputType: "text",
        comparator: "string",
        operators: COMMON_OPERATORS.string,
      };
    }
    
    switch (baseType) {
      case "String":
        return {
          valueEditorType: "text",
          inputType: "text",
          comparator: "string",
          operators: COMMON_OPERATORS.string,
        };
      case "Int":
      case "Float":
      case "Decimal":
        return {
          valueEditorType: "text",
          inputType: "number",
          comparator: "number",
          operators: COMMON_OPERATORS.number,
        };
      case "Boolean":
        return {
          valueEditorType: "checkbox",
          inputType: "checkbox",
          comparator: "boolean",
          operators: COMMON_OPERATORS.boolean,
        };
      case "DateTime":
        return {
          valueEditorType: "text",
          inputType: "datetime-local",
          comparator: "date",
          operators: COMMON_OPERATORS.date,
        };
      case "Json":
        return {
          valueEditorType: "text",
          inputType: "text",
          comparator: "string",
          operators: COMMON_OPERATORS.string,
        };
      default:
        return {
          valueEditorType: "text",
          inputType: "text",
          comparator: "string",
          operators: COMMON_OPERATORS.string,
        };
    }
  },
  
  isEnumType: (type) => {
    return type.includes("Enum") || type.includes("enum");
  },
  
  isRelationType: (type) => {
    return type.includes("Relation") || type.includes("relation");
  },
  
  isArrayType: (type) => {
    return type.includes("[]") || type.includes("Array");
  },
  
  extractBaseType: (type) => {
    // 移除可选标记和数组标记
    let baseType = type.replace(/\?$/, "").replace(/\[\]$/, "");
    
    // 如果是枚举类型，提取基础类型
    if (baseType.includes("Enum")) {
      return "Enum";
    }
    
    // 如果是关系类型，返回 String
    if (baseType.includes("Relation")) {
      return "String";
    }
    
    return baseType;
  },
};

/**
 * Schema 解析工具
 */
const schemaParser = {
  /**
   * 解析模型定义
   * @param {string} schemaContent - Schema 内容
   * @returns {Array} 模型定义数组
   */
  parseModels: (schemaContent) => {
    const models = [];
    const lines = schemaContent.split('\n');
    let currentModel = null;
    let inModel = false;

    for (const line of lines) {
      const trimmed = line.trim();
      
      // 检测模型开始
      const modelMatch = trimmed.match(/^model (\w+) \{$/);
      if (modelMatch) {
        currentModel = {
          name: modelMatch[1],
          fields: [],
          comments: []
        };
        inModel = true;
        continue;
      }

      // 检测模型结束
      if (trimmed === '}' && inModel) {
        if (currentModel) {
          models.push(currentModel);
        }
        currentModel = null;
        inModel = false;
        continue;
      }

      // 收集模型内容
      if (inModel && currentModel) {
        // 检测字段定义
        const fieldMatch = trimmed.match(/^(\w+)\s+(\w+(?:\?|\[\])?)(?:\s+\/\/\s*Enum\s+(\w+))?(?:\s+@relation.*)?$/);
        if (fieldMatch) {
          const [, fieldName, fieldType, enumType] = fieldMatch;
          
          // 跳过关系字段
          if (!typeConverter.isRelationType(trimmed)) {
            currentModel.fields.push({
              name: fieldName,
              type: fieldType,
              enumType: enumType,
              isOptional: fieldType.includes('?'),
              isArray: typeConverter.isArrayType(fieldType),
              comments: currentModel.comments.slice()
            });
          }
          currentModel.comments = [];
        } else if (trimmed.startsWith('//') && inModel) {
          currentModel.comments.push(trimmed);
        }
      }
    }

    return models;
  },

  /**
   * 解析枚举定义
   * @param {string} schemaContent - Schema 内容
   * @returns {Object} 枚举定义映射
   */
  parseEnums: (schemaContent) => {
    const enums = {};
    const enumRegex = /enum\s+(\w+)\s*\{([\s\S]*?)\}/g;
    let match;

    while ((match = enumRegex.exec(schemaContent)) !== null) {
      const [, enumName, enumBody] = match;
      const values = enumBody
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('//'))
        .map(line => line.replace(',', '').replace(/"/g, ''));

      enums[enumName] = values;
    }

    return enums;
  }
};

// 枚举处理器优化
class EnumProcessor {
  constructor() {
    this.extractedEnums = new Map();
    this.enumModels = new Map();
    this.enumDefinitions = new Map();
    this.enumTypeToNameMap = new Map(); // 存储枚举类型名到枚举名的映射
  }

  /**
   * 处理枚举定义
   * @returns {EnumProcessor} 当前实例，支持链式调用
   */
  processEnums() {
    try {
      // 直接导入 enums.ts 模块，让 JS 引擎处理所有展开操作符
    const enumsModule = require(PATHS.enums);
      
      // 处理所有导出的枚举
    for (const [key, value] of Object.entries(enumsModule)) {
        // 跳过类型定义（以 Type 结尾的）
        if (key.endsWith('Type')) continue;
        
      const enumName = utils.toPascalCase(key);
      if (Array.isArray(value)) {
          // 直接使用数组值，JS 引擎已经处理了所有展开操作符
          this.extractedEnums.set(enumName, value);
        }
      }
      console.log(`📊 成功解析 ${this.extractedEnums.size} 个枚举（使用模块导入方式）`);
      
    } catch (error) {
      console.error("❌ 无法导入 enums.ts 模块:", error.message);
      throw error;
    }
    
    return this;
  }

  /**
   * 处理 schema 文件
   * @returns {Object} 处理结果
   */
  processSchema() {
    let schemaContent = utils.safeReadFile(PATHS.baseSchema);
    const lines = schemaContent.split("\n");
    let updatedSchema = "";
    let currentModel = "";
    let skipGenerators = false;
    let inKyselyGenerator = false;
    let kyselyGenerator = "";
    let clientGenerators = [];
    let tempGenerator = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // 处理 generator 块
      if (trimmed.startsWith("generator ")) {
        if (trimmed.includes("kysely")) {
          inKyselyGenerator = true;
          tempGenerator = [line];
        } else {
          skipGenerators = true;
          tempGenerator = [line];
        }
        continue;
      }

      // 收集 generator 块内容
      if (inKyselyGenerator || skipGenerators) {
        tempGenerator.push(line);
        if (trimmed === "}") {
          if (inKyselyGenerator) {
            kyselyGenerator += tempGenerator.join("\n") + "\n";
            inKyselyGenerator = false;
          } else {
            clientGenerators.push(tempGenerator.join("\n"));
            skipGenerators = false;
          }
        }
        continue;
      }

      // 处理模型定义
      const modelMatch = trimmed.match(/^model (\w+) \{$/);
      if (modelMatch) {
        currentModel = modelMatch[1];
        this.enumModels.set(currentModel, new Map());
        updatedSchema += line + "\n";
        continue;
      }

      // 处理模型结束
      if (trimmed === "}") {
        currentModel = "";
        updatedSchema += line + "\n";
        continue;
      }

      // 处理枚举字段
      let newLine = line;
      const enumMatch = line.match(/(\w+)\s+\w+\s+\/\/ Enum (\w+)/);
      if (enumMatch && currentModel) {
        const [, fieldName, originalEnumName] = enumMatch;
        const pascalCaseEnum = utils.toPascalCase(originalEnumName);

        if (this.extractedEnums.has(pascalCaseEnum)) {
          newLine = line.replace("String", pascalCaseEnum);
          if (!this.enumDefinitions.has(pascalCaseEnum)) {
            this.enumDefinitions.set(
              pascalCaseEnum,
              `enum ${pascalCaseEnum} {\n  ${this.extractedEnums.get(pascalCaseEnum).join("\n  ")}\n}`,
            );
          }
          this.enumModels.get(currentModel).set(fieldName, originalEnumName);
          
          // 建立枚举类型名到枚举名的映射
          this.enumTypeToNameMap.set(originalEnumName, pascalCaseEnum);
        }
      }

      updatedSchema += newLine + "\n";
    }

    return {
      updatedSchema,
      kyselyGenerator,
      clientGenerators,
    };
  }

  /**
   * 根据枚举类型名查找对应的枚举名
   * @param {string} enumType - 枚举类型名（如 "CHARACTER_PERSONALITY_TYPE"）
   * @returns {string|null} 对应的枚举名（如 "Characterpersonalitytype"）
   */
  findEnumName(enumType) {
    // 建立枚举类型名到枚举名的映射
    const enumTypeToNameMap = new Map();
    
    // 遍历所有提取的枚举，建立映射关系
    for (const [enumName, values] of this.extractedEnums) {
      // 将枚举名转换为可能的枚举类型名
      const possibleEnumTypes = [
        enumName.toUpperCase(), // 直接转大写
        enumName.toUpperCase().replace(/TYPE$/, '_TYPE'), // 添加 _TYPE 后缀
        enumName.toUpperCase().replace(/TYPE$/, '') + '_TYPE', // 替换 TYPE 为 _TYPE
      ];
      
      for (const possibleEnumType of possibleEnumTypes) {
        enumTypeToNameMap.set(possibleEnumType, enumName);
      }
    }
    
    return enumTypeToNameMap.get(enumType) || null;
  }
}

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
    utils.safeWriteFile(PATHS.serverDB.tempSchema, finalSchema);
    utils.safeWriteFile(
      PATHS.clientDB.tempSchema,
      clientGenerators.join("\n") + "\n" + kyselyGenerator + finalSchema,
    );

    // 生成 SQL 文件
    utils.execCommand(
      `npx prisma migrate diff --from-empty --to-schema-datamodel ${PATHS.serverDB.tempSchema} --script > ${PATHS.serverDB.sql}`,
    );
    utils.execCommand(
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

    console.log("✅ 外键约束及索引已删除！");

    ///////////////// 将sql转换成  *_synced 表（只读副本）；*_local 表（本地状态 + 乐观更新）；VIEW（合并读取视图）； ////////////////////

    /**
     * 从原始 CREATE TABLE 语句中提取结构信息
     */
    function parseCreateTable(sql) {
      const match = sql.match(/CREATE TABLE "?(\w+)"?\s*\(([\s\S]+?)\);/i);
      if (!match) return null;
      const [, tableName, body] = match;
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
        return constraint.replace(/CONSTRAINT\s+"[^"]*"\s+PRIMARY KEY/i, `CONSTRAINT "${newName}" PRIMARY KEY`);
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
      const pkConstraint = constraints.find((c) => c.includes("PRIMARY KEY"));
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

      const joinCondition = pkCols.map((pk) => `synced."${pk}" = local."${pk}"`).join(" AND ");
      const whereCondition = `(${pkCols.map((pk) => `local."${pk}" IS NULL`).join(" OR ")} OR local."is_deleted" = FALSE)`;

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

        output.push(generateSyncedTable(parsed));

        output.push(generateLocalTable(parsed));

        output.push(generateView(parsed));
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

    fs.writeFileSync(initSQLFilePath, output.join("\n") + changesTable, "utf-8");
    console.log(`✅ 已转换initSQL ${initSQLFilePath}`);
  }

  /**
   * 生成 Kysely 类型
   */
  static generateKyselyTypes() {
    utils.execCommand("prisma generate --schema=db/temp_client_schema.prisma --generator=kysely");
  }

  /**
   * 修复关系表名称
   * @param {string} updatedSchema - 更新后的 schema 内容
   */
  static fixRelationTableNames(updatedSchema) {
    // 使用 SchemaAnalyzer 自动检测需要修复的关系表名称
    const schemaAnalysis = SchemaAnalyzer.analyzeSchema(updatedSchema);
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
    const serverSql = utils.safeReadFile(PATHS.serverDB.sql);
    const clientSql = utils.safeReadFile(PATHS.clientDB.sql);

    // 写入修复后的 SQL 文件
    utils.safeWriteFile(PATHS.serverDB.sql, fixTableNames(serverSql));
    utils.safeWriteFile(PATHS.clientDB.sql, fixTableNames(clientSql));
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
    utils.safeWriteFile(PATHS.zod.schemas, zodFileContent);
  }

  /**
   * 生成枚举 schemas
   * @returns {string} 枚举 schemas 内容
   */
  static generateEnumSchemas() {
    let enumSchemas = "";
    const enumMap = new Map();

    if (fs.existsSync(PATHS.kysely.enums)) {
      const enumsContent = utils.safeReadFile(PATHS.kysely.enums);
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
    const kyselyTypes = utils.safeReadFile(PATHS.kysely.types);
    const parsedTypes = this.parseTypes(kyselyTypes);
    
    // 生成 Zod schemas
    return Object.entries(parsedTypes)
      .map(([typeName, fields]) => {
        const schemaName = `${typeName.toLowerCase()}Schema`;
        const fieldsStr = Object.entries(fields)
          .map(([fieldName, zodType]) => `  ${fieldName}: ${zodType}`)
          .join(",\n");

        return `export const ${schemaName} = z.object({\n${fieldsStr}\n});`;
      })
      .join("\n\n");
  }

  /**
   * 转换类型到 Zod 类型
   * @param {string} type - TypeScript 类型
   * @returns {string} Zod 类型
   */
  static convertTypeToZod(type) {
    // 处理联合类型
    if (type.includes("|")) {
      const types = type.split("|").map((t) => t.trim());
      // 如果包含 null，使用 nullable()
      if (types.includes("null")) {
        const nonNullTypes = types.filter((t) => t !== "null");
        if (nonNullTypes.length === 1) {
          return `${this.convertTypeToZod(nonNullTypes[0])}.nullable()`;
        }
        return `z.union([${nonNullTypes.map((t) => this.convertTypeToZod(t)).join(", ")}]).nullable()`;
      }
      return `z.union([${types.map((t) => this.convertTypeToZod(t)).join(", ")}])`;
    }

    // 处理数组类型
    if (type.endsWith("[]")) {
      const baseType = type.slice(0, -2);
      return `z.array(${this.convertTypeToZod(baseType)})`;
    }

    // 处理基本类型
    switch (type) {
      case "string":
        return "z.string()";
      case "number":
        return "z.number()";
      case "boolean":
        return "z.boolean()";
      case "Date":
      case "Timestamp":
        return "z.date()";
      case "JsonValue":
      case "InputJsonValue":
      case "unknown":
        return `z.lazy(() => z.union([
          z.string(),
          z.number(),
          z.boolean(),
          z.literal(null),
          z.record(z.lazy(() => z.union([z.any(), z.literal(null)]))),
          z.array(z.lazy(() => z.union([z.any(), z.literal(null)])))
        ]))`;
      default:
        // 检查是否是枚举类型
        if (type.endsWith("Type")) {
          const enumName = type.replace("Type", "");
          // 确保枚举名称首字母大写
          const pascalCaseEnum = enumName.charAt(0).toUpperCase() + enumName.slice(1);
          return `${pascalCaseEnum}TypeSchema`;
        }
        // 检查是否是字面量类型
        if (type.startsWith('"') && type.endsWith('"')) {
          return `z.literal(${type})`;
        }
        // 对于未知类型，使用更安全的 JSON 类型
        return `z.lazy(() => z.union([
          z.string(),
          z.number(),
          z.boolean(),
          z.literal(null),
          z.record(z.lazy(() => z.union([z.any(), z.literal(null)]))),
          z.array(z.lazy(() => z.union([z.any(), z.literal(null)])))
        ]))`;
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
        typeName.includes("Relation") ||
        typeName.includes("To") ||
        typeName.includes("_create_data") ||
        typeName.includes("_update_data")
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
    console.log("🔄 开始生成 QueryBuilder 规则...");
    
    // 使用完整的 EnumProcessor
    const enumProcessor = new EnumProcessor();
    const { updatedSchema } = enumProcessor.processEnums().processSchema();
    
    // 解析 schema
    const models = schemaParser.parseModels(updatedSchema);
    const schemaEnums = schemaParser.parseEnums(updatedSchema);
    
    // 合并枚举定义（从 EnumProcessor 获取）
    const allEnums = {};
    for (const [enumName, values] of enumProcessor.extractedEnums) {
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
      const pascalEnumName = utils.toPascalCase(enumName);
      rulesContent += `export const ${pascalEnumName}Enum = [
  ${values.map(v => `{ value: "${v}", label: "${v}" }`).join(",\n  ")}
];

`;
    }

    // 生成字段配置
    for (const model of models) {
      const modelName = utils.toPascalCase(model.name);
      rulesContent += `export const ${modelName}Fields: Fields[] = [
  ${model.fields.map(field => {
    const fieldName = utils.toPascalCase(field.name);
    const label = utils.generateLabel(field.name);
    const typeConfig = typeConverter.prismaToQueryBuilder(field.type, field.isOptional);
    
    // 检查是否是枚举字段
    let enumConfig = "";
    let valueEditorType = typeConfig.valueEditorType;
    let inputType = typeConfig.inputType;
    
    if (field.enumType) {
      // 使用已建立的枚举映射
      const enumName = enumTypeToNameMap.get(field.enumType);
      
      if (enumName && allEnums[enumName]) {
        enumConfig = `,\n    values: ${utils.toPascalCase(enumName)}Enum`;
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

    utils.safeWriteFile(PATHS.queryBuilder.rules, rulesContent);
    console.log("✅ QueryBuilder 规则生成完成！");
    console.log(`📊 统计信息:`);
    console.log(`   - 模型数量: ${models.length}`);
    console.log(`   - 字段总数: ${models.reduce((sum, model) => sum + model.fields.length, 0)}`);
    console.log(`   - 枚举数量: ${Object.keys(allEnums).length}`);
    console.log(`   - 文件大小: ${Math.round(rulesContent.length / 1024)}KB`);
  }
}

/**
 * 主函数
 * 协调所有生成器的执行
 */
async function main() {
  try {
    console.log("🚀 开始生成...");

    // 确保目录存在
    utils.ensureDirectories();

    // 1. 处理枚举和 Schema
    console.log("📝 处理枚举和 Schema...");
    const enumProcessor = new EnumProcessor();
    const { updatedSchema, kyselyGenerator, clientGenerators } = enumProcessor.processEnums().processSchema();

    // 2. 生成 SQL
    console.log("🗄️ 生成 SQL...");
    SQLGenerator.generate(updatedSchema, kyselyGenerator, clientGenerators, enumProcessor.enumDefinitions);

    // 3. 生成 Zod schemas
    console.log("🔍 生成 Zod schemas...");
    ZodGenerator.generate();

    // 4. 生成 Kysely 类型
    console.log("📊 生成 Kysely 类型...");
    SQLGenerator.generateKyselyTypes();

    // 5. 生成 QueryBuilder 规则
    console.log("🔧 生成 QueryBuilder 规则...");
    QueryBuilderGenerator.generate(enumProcessor.enumTypeToNameMap);

    // 清理临时文件
    utils.cleanupTempFiles();

    console.log("✅ 所有生成完成！");
  } catch (error) {
    console.error("❌ 生成失败:", error);
    process.exit(1);
  }
}

// 如果直接运行此文件，则执行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
main();
}
