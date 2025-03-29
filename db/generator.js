/**
 * 此脚本用于根据ts枚举和基本数据模式生成客户端和服务端prisma架构
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const enumsFilePath = path.join(__dirname, "enums.ts");
const baseSchemaPath = path.join(__dirname, "baseSchema.prisma");
const serverDBSchemaPath = path.join(__dirname, "serverDB/schema.prisma");
const clientDBSchemaPath = path.join(__dirname, "clientDB/schema.prisma");
const dataEnumsPath = path.join(__dirname, "dataEnums.ts");

// **预处理 enums.ts，去除所有注释**
let enumsContent = fs.readFileSync(enumsFilePath, "utf-8");
enumsContent = enumsContent.replace(/\/\*[\s\S]*?\*\//g, ""); // 删除 /* */ 块注释
enumsContent = enumsContent.replace(/\/\/[^\n]*/g, ""); // 删除 // 单行注释

// **第一步：解析数组**
const arrayRegex = /export const (\w+)\s*=\s*\[\s*([^]+?)\s*\]\s*as const;/g;
const extractedArrays = new Map();

let match;
while ((match = arrayRegex.exec(enumsContent)) !== null) {
  const arrayName = match[1];
  const values = match[2]
    .split(",")
    .map((v) => v.split("//")[0].trim().replace(/["']/g, "")) // 去掉单行注释
    .filter((v) => v.length > 0);

  extractedArrays.set(arrayName, values);
  // console.log(`✅ 解析数组: ${arrayName} -> ${values.join(", ")}`);
}

// **第二步：解析对象**
const objectRegex = /export const (\w+)\s*=\s*\{([^}]+)\}\s*as const;/g;
const fieldRegex = /(\w+):\s*\[\s*([^]+?)\s*\]/g;
const enumsMap = new Map();

while ((match = objectRegex.exec(enumsContent)) !== null) {
  const modelName = match[1];
  const objectBody = match[2];

  const fieldMap = new Map();

  let fieldMatch;
  while ((fieldMatch = fieldRegex.exec(objectBody)) !== null) {
    const fieldName = fieldMatch[1];
    const rawValues = fieldMatch[2]
      .split(",")
      .map((v) => v.split("//")[0].trim().replace(/["']/g, "")) // 去掉单行注释
      .filter((v) => v.length > 0);

    const values = [];
    for (const value of rawValues) {
      if (value.startsWith("...")) {
        const referencedArray = value.slice(3);
        if (extractedArrays.has(referencedArray)) {
          values.push(...extractedArrays.get(referencedArray));
          // console.log(`🔄 展开 ${referencedArray} -> ${extractedArrays.get(referencedArray).join(", ")}`);
        } else {
          console.warn(`⚠️ 警告: 找不到 ${referencedArray}，无法展开`);
        }
      } else {
        values.push(value);
      }
    }

    fieldMap.set(fieldName, values);
  }

  if (fieldMap.size > 0) {
    enumsMap.set(modelName, fieldMap);
    console.log(`✅ 解析对象: ${modelName}`);
  }
}

// **第三步：读取 baseSchema.prisma 并替换枚举**
const schemaContent = fs.readFileSync(baseSchemaPath, "utf-8");
const lines = schemaContent.split("\n");

let newSchema = "";
const enumDefinitions = [];

let currentModel = "";
let skipGenerators = false;
let kyselyGenerator = "";
let inKyselyGenerator = false;
let clientGenerators = ""; // ✅ 记录 clientDB 的 generator

for (const line of lines) {
  // 处理 generator 块
  if (line.trim().startsWith("generator ")) {
    if (line.includes("kysely")) {
      inKyselyGenerator = true;
      kyselyGenerator += line + "\n";
      clientGenerators += line + "\n";
    } else {
      skipGenerators = true;
      clientGenerators += line + "\n";
    }
    continue;
  }

  if (skipGenerators && line.trim() === "") {
    skipGenerators = false;
    clientGenerators += "\n"; // ✅ 保持换行
    continue;
  }

  if (inKyselyGenerator) {
    kyselyGenerator += line + "\n";
    clientGenerators += line + "\n";
    if (line.trim() === "}") {
      inKyselyGenerator = false;
    }
    continue;
  }

  if (skipGenerators) {
    clientGenerators += line + "\n"; // ✅ 继续记录 client 的 generator
    continue;
  }

  // 处理模型和枚举替换逻辑
  const modelMatch = line.match(/model (\w+) {/);
  if (modelMatch) {
    currentModel = modelMatch[1];
  } else if (line.trim() === "}") {
    currentModel = "";
  }

  let newLine = line;

  if (currentModel && enumsMap.has(currentModel)) {
    const fieldMatch = line.match(/\s*(\w+)\s+String/);
    if (fieldMatch) {
      const fieldName = fieldMatch[1];
      const enumValues = enumsMap.get(currentModel)?.get(fieldName);

      if (enumValues) {
        const enumName = `${currentModel}_${fieldName}`;
        newLine = newLine.replace("String", enumName);

        if (!enumDefinitions.some((e) => e.includes(`enum ${enumName}`))) {
          enumDefinitions.push(`enum ${enumName} {\n  ${enumValues.join("\n  ")}\n}`);
          console.log(`✅ 生成枚举: ${enumName} -> ${enumValues.join(", ")}`);
        }
      }
    }
  }

  newSchema += newLine + "\n";
}

// 添加枚举定义
const finalSchema = newSchema + "\n" + enumDefinitions.join("\n\n");

// 创建目录并写入文件
fs.mkdirSync(path.dirname(clientDBSchemaPath), { recursive: true });
fs.mkdirSync(path.dirname(serverDBSchemaPath), { recursive: true });

// ✅ clientDB/schema.prisma（保留原有 generator）
fs.writeFileSync(clientDBSchemaPath, clientGenerators + "\n" + finalSchema, "utf-8");

// ✅ serverDB/schema.prisma（仅保留 kysely 相关的 generator）
fs.writeFileSync(serverDBSchemaPath, kyselyGenerator + "\n" + finalSchema, "utf-8");

console.log("✅ schema.prisma 生成完成！");

// **第四步：生成 dataEnums.ts**
const dataEnums = {};
for (const [modelName, fields] of enumsMap.entries()) {
  dataEnums[modelName] = {};
  for (const [fieldName, values] of fields.entries()) {
    dataEnums[modelName][fieldName] = Object.fromEntries(values.map((v) => [v, ""]));
  }
}

const dataEnumsContent = `/* ⚠️ 本文件由 Node.js 生成，请勿手动修改！ */

export const dataEnums = ${JSON.stringify(dataEnums, null, 2)} as const;

export type DataEnums = {
${Object.entries(dataEnums)
  .map(([modelName, fields]) => {
    return `  ${modelName}: {\n${Object.entries(fields)
      .map(
        ([fieldName, values]) =>
          `    ${fieldName}: { ${Object.keys(values)
            .map((v) => `${v}: string`)
            .join("; ")} };`,
      )
      .join("\n")}\n  };`;
  })
  .join("\n")}
};`;

fs.writeFileSync(dataEnumsPath, dataEnumsContent, "utf-8");
console.log("✅ dataEnums.ts 生成完成！");
