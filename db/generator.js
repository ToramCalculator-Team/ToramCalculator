/**
 * @file generator.js
 * @description 数据库 Schema 生成器
 *
 * 模块划分：
 * 1. schema-generator.js - SQL schema 生成
 * 2. enum-processor.js - 枚举处理
 * 3. type-generator.js - 类型定义生成
 * 4. zod-generator.js - Zod schema 生成
 * 5. data-enums-generator.js - DataEnums 类型生成
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
const PATHS = {
  enums: path.join(__dirname, "enums.ts"),
  baseSchema: path.join(__dirname, "baseSchema.prisma"),
  serverDB: {
    sql: path.join(__dirname, "serverDB/init.sql"),
    tempSchema: path.join(__dirname, "temp_server_schema.prisma"),
  },
  clientDB: {
    sql: path.join(__dirname, "clientDB/init.sql"),
    tempSchema: path.join(__dirname, "temp_client_schema.prisma"),
  },
  dataEnums: path.join(__dirname, "dataEnums.ts"),
  zod: {
    schemas: path.join(__dirname, "zod/index.ts"),
  },
  kysely: {
    types: path.join(__dirname, "kysely/kyesely.ts"),
    enums: path.join(__dirname, "kysely/enums.ts"),
  },
};

// 确保必要的目录存在
function ensureDirectories() {
  const dirs = [
    path.dirname(PATHS.serverDB.sql),
    path.dirname(PATHS.clientDB.sql),
    path.dirname(PATHS.zod.schemas),
  ];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// 工具函数
const utils = {
  toPascalCase: (str) => str.toLowerCase().replace(/(?:^|_)([a-z])/g, (_, c) => c.toUpperCase()),
  
  cleanupTempFiles: () => {
    if (fs.existsSync(PATHS.serverDB.tempSchema)) fs.unlinkSync(PATHS.serverDB.tempSchema);
    if (fs.existsSync(PATHS.clientDB.tempSchema)) fs.unlinkSync(PATHS.clientDB.tempSchema);
  },
};

// 枚举处理器
class EnumProcessor {
  constructor() {
    this.extractedEnums = new Map();
    this.enumModels = new Map();
    this.enumDefinitions = new Map();
  }

  processEnums() {
    const enumsModule = require(PATHS.enums);
    for (const [key, value] of Object.entries(enumsModule)) {
      const enumName = utils.toPascalCase(key);
      if (Array.isArray(value)) {
        this.extractedEnums.set(
          enumName,
          value.flatMap((v) => (v.startsWith("...") ? enumsModule[v.slice(3)] || [] : v)),
        );
      }
    }
    return this;
  }

  processSchema() {
    let schemaContent = fs.readFileSync(PATHS.baseSchema, "utf-8");
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
}

// SQL 生成器
class SQLGenerator {
  static generate(updatedSchema, kyselyGenerator, clientGenerators, enumDefinitions) {
    // 生成最终的 schema 文件
    const finalSchema = updatedSchema + "\n" + Array.from(enumDefinitions.values()).join("\n\n");

    // 创建临时 schema 文件
    fs.writeFileSync(PATHS.serverDB.tempSchema, finalSchema, "utf-8");
    fs.writeFileSync(
      PATHS.clientDB.tempSchema,
      clientGenerators.join("\n") + "\n" + kyselyGenerator + finalSchema,
      "utf-8",
    );

    // 生成 SQL 文件
    execSync(
      `npx prisma migrate diff --from-empty --to-schema-datamodel ${PATHS.serverDB.tempSchema} --script > ${PATHS.serverDB.sql}`,
    );
    execSync(
      `npx prisma migrate diff --from-empty --to-schema-datamodel ${PATHS.clientDB.tempSchema} --script > ${PATHS.clientDB.sql}`,
    );

    // 处理客户端 SQL
    const initTransformPath = path.join(__dirname, "clientDB/init_transform.js");
    require(initTransformPath);

    // 生成 Kysely 类型
    execSync("prisma generate --schema=db/temp_client_schema.prisma --generator=kysely", { stdio: "inherit" });

    // 修复关系表名称
    const relationTables = [
      '_armorTocrystal',
      '_avatarTocharacter',
      '_backRelation',
      '_campA',
      '_campB',
      '_characterToconsumable',
      '_crystalTooption',
      '_crystalToplayer_armor',
      '_crystalToplayer_option',
      '_crystalToplayer_special',
      '_crystalToplayer_weapon',
      '_crystalTospecial',
      '_crystalToweapon',
      '_frontRelation',
      '_linkZones',
      '_mobTozone',
    ];

    // 修复 SQL 中的表名引用
    const fixTableNames = (sql) => {
      let fixedSql = sql;
      relationTables.forEach(tableName => {
        // 替换表名引用，确保使用双引号包裹
        const regex = new RegExp(`\\b${tableName.toLowerCase()}\\b`, 'g');
        fixedSql = fixedSql.replace(regex, `"${tableName}"`);
      });
      return fixedSql;
    };

    // 读取并修复 SQL 文件
    const serverSql = fs.readFileSync(PATHS.serverDB.sql, 'utf-8');
    const clientSql = fs.readFileSync(PATHS.clientDB.sql, 'utf-8');

    // 写入修复后的 SQL 文件
    fs.writeFileSync(PATHS.serverDB.sql, fixTableNames(serverSql), 'utf-8');
    fs.writeFileSync(PATHS.clientDB.sql, fixTableNames(clientSql), 'utf-8');
  }
}

// Zod Schema 生成器
class ZodGenerator {
  static generate() {
    // 从 db/kysely/enums.ts 生成 zod 枚举
    let enumSchemas = "";
    const enumMap = new Map();
    if (fs.existsSync(PATHS.kysely.enums)) {
      const enumsContent = fs.readFileSync(PATHS.kysely.enums, "utf-8");
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

    // 从 Kysely 类型定义生成 Zod schemas
    const kyselyTypes = fs.readFileSync(PATHS.kysely.types, "utf-8");
    const parsedTypes = this.parseTypes(kyselyTypes);
    
    // 生成 Zod schemas
    const generatedSchemas = Object.entries(parsedTypes)
      .map(([typeName, fields]) => {
        const schemaName = `${typeName.toLowerCase()}Schema`;
        const fieldsStr = Object.entries(fields)
          .map(([fieldName, zodType]) => `  ${fieldName}: ${zodType}`)
          .join(",\n");

        return `export const ${schemaName} = z.object({\n${fieldsStr}\n});`;
      })
      .join("\n\n");

    // 生成最终的 Zod schemas 文件内容
    const zodFileContent = `// 由脚本自动生成，请勿手动修改
import { z } from "zod";

${enumSchemas}
${generatedSchemas}
`;

    // 写入 Zod schemas 文件
    fs.writeFileSync(PATHS.zod.schemas, zodFileContent, "utf-8");
  }

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

      const fields = this.parseFields(fieldsStr);
      types[typeName] = fields;
    }

    return types;
  }
}

// DataEnums 生成器
class DataEnumsGenerator {
  static generate(enumModels) {
    const importStatements = Array.from(
      new Set([].concat(...Array.from(enumModels.values()).map((fieldMap) => Array.from(fieldMap.values())))),
    )
      .map((enumName) => `import { ${enumName} } from "./enums";`)
      .join("\n");

    const dataEnumEntries = Array.from(enumModels.entries())
      .map(([modelName, fields]) => {
        return (
          `  ${modelName}: {\n` +
          Array.from(fields.entries())
            .map(([fieldName, enumName]) => `    ${fieldName}: {
      [key in (typeof ${enumName})[number]]: string;
    };\n`)
            .join("") +
          "  };\n"
        );
      })
      .join("");

    const dataEnumsFileContent = `// 由脚本自动生成，请勿手动修改

${importStatements}

export type DataEnums = {
${dataEnumEntries}
};
`;

    fs.writeFileSync(PATHS.dataEnums, dataEnumsFileContent, "utf-8");
  }
}

// 主执行流程
async function main() {
  try {
    ensureDirectories();

    // 处理枚举
    const enumProcessor = new EnumProcessor();
    enumProcessor.processEnums();
    const { updatedSchema, kyselyGenerator, clientGenerators } = enumProcessor.processSchema();

    // 生成 SQL
    SQLGenerator.generate(updatedSchema, kyselyGenerator, clientGenerators, enumProcessor.enumDefinitions);
    console.log("✅ SQL 文件生成完成！");
    console.log("✅ Kysely 类型生成完成！");

    // 生成 Zod schemas
    ZodGenerator.generate();
    console.log("✅ Zod schemas 生成完成！");

    // 生成 DataEnums
    DataEnumsGenerator.generate(enumProcessor.enumModels);
    console.log("✅ DataEnums 类型定义生成完成！");

    // 清理临时文件
    utils.cleanupTempFiles();
    console.log("✅ 临时文件清理完成！");

  } catch (error) {
    console.error("生成文件时出错:", error);
    utils.cleanupTempFiles();
    process.exit(1);
  }
}

main();
