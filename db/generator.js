/**
 * @file generator.js
 * @description 数据库 Schema 生成器
 * 
 * 这个脚本的主要功能：
 * 1. 从 baseSchema.prisma 生成客户端和服务端使用的 SQL 文件
 * 2. 处理枚举类型的转换和注入
 * 3. 生成 DataEnums 类型定义
 * 
 * 生成流程：
 * 1. 读取 enums.ts 中的枚举定义
 * 2. 解析 baseSchema.prisma 中的模型定义
 * 3. 将枚举类型注入到相应的模型字段中
 * 4. 生成客户端和服务端各自的 SQL 文件
 * 5. 生成 DataEnums 类型定义文件
 * 
 * 输出文件：
 * - serverDB/init.sql: 服务端数据库初始化 SQL
 * - clientDB/init.sql: 客户端数据库初始化 SQL
 * - dataEnums.ts: 包含所有模型枚举字段的类型定义
 * 
 * 使用方式：
 * 1. 确保 enums.ts 和 baseSchema.prisma 文件存在
 * 2. 运行 tsx generator.js
 * 3. 检查生成的 SQL 文件是否符合预期
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { execSync } from "child_process";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 定义文件路径
const enumsFilePath = path.join(__dirname, "enums.ts");
const baseSchemaPath = path.join(__dirname, "baseSchema.prisma");
const serverDBSqlPath = path.join(__dirname, "serverDB/init.sql");
const clientDBSqlPath = path.join(__dirname, "clientDB/init.sql");
const dataEnumsPath = path.join(__dirname, "dataEnums.ts");

// 确保必要的目录存在
const serverDBDir = path.dirname(serverDBSqlPath);
const clientDBDir = path.dirname(clientDBSqlPath);
if (!fs.existsSync(serverDBDir)) {
  fs.mkdirSync(serverDBDir, { recursive: true });
}
if (!fs.existsSync(clientDBDir)) {
  fs.mkdirSync(clientDBDir, { recursive: true });
}

/**
 * 将下划线命名转换为 PascalCase
 * @param {string} str - 需要转换的字符串
 * @returns {string} PascalCase 格式的字符串
 */
const toPascalCase = (str) => str.toLowerCase().replace(/(?:^|_)([a-z])/g, (_, c) => c.toUpperCase());

// 解析 enums.ts 文件，提取所有枚举定义
const extractedEnums = new Map();
const enumsModule = require(enumsFilePath);

// 处理枚举定义，支持展开操作符 (...)
for (const [key, value] of Object.entries(enumsModule)) {
  const enumName = toPascalCase(key);
  if (Array.isArray(value)) {
    extractedEnums.set(
      enumName,
      value.flatMap((v) => (v.startsWith("...") ? enumsModule[v.slice(3)] || [] : v))
    );
  }
}

// 解析 baseSchema.prisma 并处理枚举注入
let schemaContent = fs.readFileSync(baseSchemaPath, "utf-8");
const lines = schemaContent.split("\n");

// 存储模型和枚举的映射关系
const enumModels = new Map();
let updatedSchema = "";
const enumDefinitions = new Map();
let currentModel = "";
let skipGenerators = false;
let inKyselyGenerator = false;
let kyselyGenerator = "";
let clientGenerators = [];
let tempGenerator = [];

// 逐行处理 schema 内容
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
    enumModels.set(currentModel, new Map());
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
    const pascalCaseEnum = toPascalCase(originalEnumName);

    // 如果找到对应的枚举定义，替换字段类型
    if (extractedEnums.has(pascalCaseEnum)) {
      newLine = line.replace("String", pascalCaseEnum);
      if (!enumDefinitions.has(pascalCaseEnum)) {
        enumDefinitions.set(
          pascalCaseEnum,
          `enum ${pascalCaseEnum} {\n  ${extractedEnums.get(pascalCaseEnum).join("\n  ")}\n}`
        );
      }
      enumModels.get(currentModel).set(fieldName, originalEnumName);
    }
  }

  updatedSchema += newLine + "\n";
}

// 生成最终的 schema 文件
const finalSchema = updatedSchema + "\n" + Array.from(enumDefinitions.values()).join("\n\n");

// 创建临时 schema 文件用于生成 SQL
const tempServerSchemaPath = path.join(__dirname, "temp_server_schema.prisma");
const tempClientSchemaPath = path.join(__dirname, "temp_client_schema.prisma");

fs.writeFileSync(tempServerSchemaPath, finalSchema, "utf-8");
fs.writeFileSync(tempClientSchemaPath, clientGenerators.join("\n") + "\n" + kyselyGenerator + finalSchema, "utf-8");

// 使用 prisma migrate 生成 SQL
try {
  // 生成服务端 SQL
  execSync(`npx prisma migrate diff --from-empty --to-schema-datamodel ${tempServerSchemaPath} --script > ${serverDBSqlPath}`);
  
  // 生成客户端 SQL
  execSync(`npx prisma migrate diff --from-empty --to-schema-datamodel ${tempClientSchemaPath} --script > ${clientDBSqlPath}`);
  
  // 处理客户端 SQL
  const initTransformPath = path.join(__dirname, "clientDB/init_transform.js");
  require(initTransformPath);
  
  // 生成类型
  execSync('prisma generate --schema=db/temp_client_schema.prisma', { stdio: 'inherit' });
  
  console.log("✅ SQL 文件生成完成！");
  console.log("✅ 类型生成完成！");
} catch (error) {
  console.error("生成文件时出错:", error);
  // 清理临时文件
  if (fs.existsSync(tempServerSchemaPath)) fs.unlinkSync(tempServerSchemaPath);
  if (fs.existsSync(tempClientSchemaPath)) fs.unlinkSync(tempClientSchemaPath);
  process.exit(1);
}

// 生成 DataEnums 类型定义
const importStatements = Array.from(new Set(
  [].concat(...Array.from(enumModels.values()).map(fieldMap => Array.from(fieldMap.values())))
)).map(enumName => `import { ${enumName} } from "./enums";`).join("\n");

// 生成每个模型的枚举字段类型定义
const dataEnumEntries = Array.from(enumModels.entries()).map(([modelName, fields]) => {
  return `  ${modelName}: {\n` +
    Array.from(fields.entries()).map(([fieldName, enumName]) =>
      `    ${fieldName}: Record<(typeof ${enumName})[number], string>;`
    ).join("\n") +
    `\n  };`;
}).join("\n");

// 写入 DataEnums 类型定义文件
const dataEnumsType = `${importStatements}\n\nexport type DataEnums = {\n${dataEnumEntries}\n};`;
fs.writeFileSync(dataEnumsPath, dataEnumsType, "utf-8");

console.log("✅ dataEnums.ts 生成完成！");

// 清理临时文件
if (fs.existsSync(tempServerSchemaPath)) fs.unlinkSync(tempServerSchemaPath);
if (fs.existsSync(tempClientSchemaPath)) fs.unlinkSync(tempClientSchemaPath);
console.log("✅ 临时文件清理完成！");
