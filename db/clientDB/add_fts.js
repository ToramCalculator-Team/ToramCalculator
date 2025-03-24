import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseSchemaPath = path.join(__dirname, "../baseSchema.prisma");
const ddlPath = path.join(__dirname, "ddl.sql");

// 读取 baseSchema.prisma，找出带 `// FTS` 标记的表
const prismaSchema = fs.readFileSync(baseSchemaPath, 'utf-8');
const ftsTables = new Map(); // 存储表名和对应字段

// 提取所有模型名称
const modelNames = [];
const modelRegex = /model (\w+) {/g;
let match;

while ((match = modelRegex.exec(prismaSchema)) !== null) {
    modelNames.push(match[1]); // 将模型名称存入数组
}

// 重新遍历模型，提取 FTS 字段
const modelContentRegex = /model (\w+) {([\s\S]*?)}/g;
while ((match = modelContentRegex.exec(prismaSchema)) !== null) {
    const [_, tableName, content] = match;
    if (content.includes('// FTS')) {
        // 提取字段
        const fields = [];
        const lines = content.split('\n').map(line => line.trim());

        for (const line of lines) {
            if (line.startsWith('//') || !line.includes(' ')) continue; // 跳过注释和无效行

            // 提取字段名
            const fieldName = line.split(' ')[0].replace(/"/g, '');

            // 提取字段类型
            const fieldTypeMatch = line.match(/^\s*\w+\s+(\w+)/);
            const fieldType = fieldTypeMatch ? fieldTypeMatch[1] : '';
            // console.log( fieldName + ":" +  fieldType + "\n");

            // 判断是否为关系字段
            const isRelationField =
                line.includes('@relation') || // 包含 @relation 注解
                modelNames.includes(fieldType); // 字段类型是模型名称

            // 排除特定字段（如 id）和关系字段
            const excludedFields = ['id'];
            if (!excludedFields.includes(fieldName) && !isRelationField) {
                fields.push(fieldName);
            }
        }

        if (fields.length > 0) {
            ftsTables.set(tableName, fields);
        }
    }
}

// 打印结果
// console.log(ftsTables);

// 生成 FTS 相关 SQL
let ftsSql = '-- Added Full-Text Search Configuration\n';

for (const [table, columns] of ftsTables.entries()) {
    const ftsTable = `${table}_fts`;
    const ftsIndex = `${table}_fts_idx`;
    const ftsTrigger = `${table}_fts_trigger`;
    const ftsFunction = `${table}_fts_update`;

    const columnList = columns.map(col => `NEW."${col}"`).join(" || ' ' || ");

    ftsSql += `-- Full-Text Search setup for ${table}\n`;
    ftsSql += `CREATE TABLE IF NOT EXISTS ${ftsTable} (id SERIAL PRIMARY KEY, ${table}_id TEXT, data TSVECTOR);\n`;
    ftsSql += `CREATE INDEX IF NOT EXISTS ${ftsIndex} ON ${ftsTable} USING GIN(data);\n`;
    ftsSql += `CREATE OR REPLACE FUNCTION ${ftsFunction}() RETURNS TRIGGER AS $$\n`;
    ftsSql += `    BEGIN\n`;
    ftsSql += `        DELETE FROM ${ftsTable} WHERE ${table}_id = NEW.id;\n`;
    ftsSql += `        INSERT INTO ${ftsTable} (${table}_id, data)\n`;
    ftsSql += `        VALUES (NEW.id, to_tsvector('english', ${columnList}));\n`;
    ftsSql += `        RETURN NEW;\n`;
    ftsSql += `    END;\n`;
    ftsSql += `$$ LANGUAGE plpgsql;\n`;
    ftsSql += `DROP TRIGGER IF EXISTS ${ftsTrigger} ON ${table};\n`;
    ftsSql += `CREATE TRIGGER ${ftsTrigger}\n`;
    ftsSql += `    AFTER INSERT OR UPDATE ON ${table}\n`;
    ftsSql += `    FOR EACH ROW EXECUTE FUNCTION ${ftsFunction}();\n\n`;
}

// 追加到 ddl.sql 末尾
const ddlContent = fs.readFileSync(ddlPath, 'utf-8');
fs.writeFileSync(ddlPath, ddlContent + '\n' + ftsSql);

console.log(`✅ 已生成包含 FTS 的 SQL 文件: ${ddlPath}`);
