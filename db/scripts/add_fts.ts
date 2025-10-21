/**
 * @file add_fts.ts
 * @description 用于向本地数据库添加 FTS，在nodejs环境下运行后，将会对ddl文件进行修改
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * FTS 表信息接口
 */
interface FtsTableInfo {
  tableName: string;
  fields: string[];
}

/**
 * FTS 配置接口
 */
interface FtsConfig {
  baseSchemaPath: string;
  ddlPath: string;
}

/**
 * 创建 FTS 配置
 * @returns FTS 配置对象
 */
export const createFtsConfig = (): FtsConfig => ({
  baseSchemaPath: path.join(__dirname, "../schema/baseSchema.prisma"),
  ddlPath: path.join(__dirname, "../generated/clientDB/init.sql"),
});

/**
 * 读取文件内容
 * @param filePath - 文件路径
 * @returns 文件内容
 */
export const readFile = (filePath: string): string => {
  return fs.readFileSync(filePath, 'utf-8');
};

/**
 * 写入文件内容
 * @param filePath - 文件路径
 * @param content - 文件内容
 */
export const writeFile = (filePath: string, content: string): void => {
  fs.writeFileSync(filePath, content);
};

/**
 * 提取所有模型名称
 * @param prismaSchema - Prisma 架构内容
 * @returns 模型名称数组
 */
export const extractModelNames = (prismaSchema: string): string[] => {
  const modelNames: string[] = [];
  const modelRegex = /model (\w+) {/g;
  let match;

  while ((match = modelRegex.exec(prismaSchema)) !== null) {
    modelNames.push(match[1]); // 将模型名称存入数组
  }

  return modelNames;
};

/**
 * 提取字段名
 * @param line - 行内容
 * @returns 字段名
 */
export const extractFieldName = (line: string): string => {
  return line.split(' ')[0].replace(/"/g, '');
};

/**
 * 提取字段类型
 * @param line - 行内容
 * @returns 字段类型
 */
export const extractFieldType = (line: string): string => {
  const fieldTypeMatch = line.match(/^\s*\w+\s+(\w+)/);
  return fieldTypeMatch ? fieldTypeMatch[1] : '';
};

/**
 * 判断是否为关系字段
 * @param line - 行内容
 * @param modelNames - 模型名称数组
 * @returns 是否为关系字段
 */
export const isRelationField = (line: string, modelNames: string[]): boolean => {
  const fieldType = extractFieldType(line);
  return line.includes('@relation') || modelNames.includes(fieldType);
};

/**
 * 提取 FTS 字段
 * @param content - 模型内容
 * @param modelNames - 模型名称数组
 * @returns 字段名数组
 */
export const extractFtsFields = (content: string, modelNames: string[]): string[] => {
  const fields: string[] = [];
  const lines = content.split('\n').map(line => line.trim());

  for (const line of lines) {
    if (line.startsWith('//') || !line.includes(' ')) continue; // 跳过注释和无效行

    const fieldName = extractFieldName(line);
    const excludedFields = ['id'];
    
    if (!excludedFields.includes(fieldName) && !isRelationField(line, modelNames)) {
      fields.push(fieldName);
    }
  }

  return fields;
};

/**
 * 提取 FTS 表信息
 * @param prismaSchema - Prisma 架构内容
 * @returns FTS 表信息映射
 */
export const extractFtsTables = (prismaSchema: string): Map<string, string[]> => {
  const ftsTables = new Map<string, string[]>();
  const modelNames = extractModelNames(prismaSchema);

  // 重新遍历模型，提取 FTS 字段
  const modelContentRegex = /model (\w+) {([\s\S]*?)}/g;
  let match;

  while ((match = modelContentRegex.exec(prismaSchema)) !== null) {
    const [_, tableName, content] = match;
    if (content.includes('// FTS')) {
      const fields = extractFtsFields(content, modelNames);
      if (fields.length > 0) {
        ftsTables.set(tableName, fields);
      }
    }
  }

  return ftsTables;
};

/**
 * 生成单个表的 FTS SQL
 * @param tableName - 表名
 * @param fields - 字段数组
 * @returns FTS SQL 字符串
 */
export const generateTableFtsSql = (tableName: string, fields: string[]): string => {
  const ftsTable = `${tableName}_fts`;
  const ftsIndex = `${tableName}_fts_idx`;
  const ftsTrigger = `${tableName}_fts_trigger`;
  const ftsFunction = `${tableName}_fts_update`;

  const columnList = fields.map(col => `NEW."${col}"`).join(" || ' ' || ");

  let sql = `-- Full-Text Search setup for ${tableName}\n`;
  sql += `CREATE TABLE IF NOT EXISTS ${ftsTable} (id SERIAL PRIMARY KEY, ${tableName}_id TEXT, data TSVECTOR);\n`;
  sql += `CREATE INDEX IF NOT EXISTS ${ftsIndex} ON ${ftsTable} USING GIN(data);\n`;
  sql += `CREATE OR REPLACE FUNCTION ${ftsFunction}() RETURNS TRIGGER AS $$\n`;
  sql += `    BEGIN\n`;
  sql += `        DELETE FROM ${ftsTable} WHERE ${tableName}_id = NEW.id;\n`;
  sql += `        INSERT INTO ${ftsTable} (${tableName}_id, data)\n`;
  sql += `        VALUES (NEW.id, to_tsvector('english', ${columnList}));\n`;
  sql += `        RETURN NEW;\n`;
  sql += `    END;\n`;
  sql += `$$ LANGUAGE plpgsql;\n`;
  sql += `DROP TRIGGER IF EXISTS ${ftsTrigger} ON ${tableName};\n`;
  sql += `CREATE TRIGGER ${ftsTrigger}\n`;
  sql += `    AFTER INSERT OR UPDATE ON ${tableName}\n`;
  sql += `    FOR EACH ROW EXECUTE FUNCTION ${ftsFunction}();\n\n`;

  return sql;
};

/**
 * 生成所有 FTS 相关 SQL
 * @param ftsTables - FTS 表信息映射
 * @returns FTS SQL 字符串
 */
export const generateFtsSql = (ftsTables: Map<string, string[]>): string => {
  let ftsSql = '-- Added Full-Text Search Configuration\n';

  for (const [tableName, fields] of ftsTables.entries()) {
    ftsSql += generateTableFtsSql(tableName, fields);
  }

  return ftsSql;
};

/**
 * 处理 FTS 添加
 * @param config - FTS 配置
 */
export const addFts = (config: FtsConfig): void => {
  // 读取 baseSchema.prisma，找出带 `// FTS` 标记的表
  const prismaSchema = readFile(config.baseSchemaPath);
  const ftsTables = extractFtsTables(prismaSchema);

  // 生成 FTS 相关 SQL
  const ftsSql = generateFtsSql(ftsTables);

  // 追加到 ddl.sql 末尾
  const initContent = readFile(config.ddlPath);
  writeFile(config.ddlPath, initContent + '\n' + ftsSql);

  console.log(`✅ 已生成包含 FTS 的 SQL 文件: ${config.ddlPath}`);
};

/**
 * 主函数
 */
export const main = (): void => {
  try {
    const config = createFtsConfig();
    addFts(config);
  } catch (error) {
    console.error("❌ FTS 添加失败:", error);
    process.exit(1);
  }
};

// 如果直接运行此文件，则执行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
