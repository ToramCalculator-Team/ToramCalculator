import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const enumsFilePath = path.join(__dirname, "enums.ts");
const baseSchemaPath = path.join(__dirname, "baseSchema.prisma");
const serverDBSchemaPath = path.join(__dirname, "serverDB/schema.prisma");
const clientDBSchemaPath = path.join(__dirname, "clientDB/schema.prisma");
const dataEnumsPath = path.join(__dirname, "dataEnums.ts");

// PascalCase 转换函数
const toPascalCase = (str) => str.toLowerCase().replace(/(?:^|_)([a-z])/g, (_, c) => c.toUpperCase());

// 解析 enums.ts
const extractedEnums = new Map();
const enumsModule = require(enumsFilePath);

for (const [key, value] of Object.entries(enumsModule)) {
  const enumName = toPascalCase(key);
  if (Array.isArray(value)) {
    extractedEnums.set(
      enumName,
      value.flatMap((v) => (v.startsWith("...") ? enumsModule[v.slice(3)] || [] : v))
    );
  }
}

// 解析 schema.prisma 并替换 // Enum ENUM_NAME
let schemaContent = fs.readFileSync(baseSchemaPath, "utf-8");
const lines = schemaContent.split("\n");

const enumModels = new Map();
let updatedSchema = "";
const enumDefinitions = new Map();
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

  // 处理 model
  const modelMatch = trimmed.match(/^model (\w+) \{$/);
  if (modelMatch) {
    currentModel = modelMatch[1];
    enumModels.set(currentModel, new Map());
    updatedSchema += line + "\n";
    continue;
  }

  if (trimmed === "}") {
    currentModel = "";
    updatedSchema += line + "\n";
    continue;
  }

  // 处理 // Enum
  let newLine = line;
  const enumMatch = line.match(/(\w+)\s+\w+\s+\/\/ Enum (\w+)/);
  if (enumMatch && currentModel) {
    const [, fieldName, originalEnumName] = enumMatch;
    const pascalCaseEnum = toPascalCase(originalEnumName);

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

// 合并最终 schema
const finalSchema = updatedSchema + "\n" + Array.from(enumDefinitions.values()).join("\n\n");
fs.mkdirSync(path.dirname(clientDBSchemaPath), { recursive: true });
fs.mkdirSync(path.dirname(serverDBSchemaPath), { recursive: true });

fs.writeFileSync(clientDBSchemaPath, clientGenerators.join("\n") + "\n" + kyselyGenerator + finalSchema, "utf-8");
fs.writeFileSync(serverDBSchemaPath, finalSchema, "utf-8");

console.log("✅ schema.prisma 生成完成！");

// 生成 DataEnums 类型
const importStatements = Array.from(new Set(
  [].concat(...Array.from(enumModels.values()).map(fieldMap => Array.from(fieldMap.values())))
)).map(enumName => `import { ${enumName} } from "./enums";`).join("\n");

const dataEnumEntries = Array.from(enumModels.entries()).map(([modelName, fields]) => {
  return `  ${modelName}: {\n` +
    Array.from(fields.entries()).map(([fieldName, enumName]) =>
      `    ${fieldName}: Record<(typeof ${enumName})[number], string>;`
    ).join("\n") +
    `\n  };`;
}).join("\n");

const dataEnumsType = `${importStatements}\n\nexport type DataEnums = {\n${dataEnumEntries}\n};`;

fs.writeFileSync(dataEnumsPath, dataEnumsType, "utf-8");

console.log("✅ dataEnums.ts 生成完成！");
