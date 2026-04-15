/**
 * @file migrate-dish.ts
 * @description 手动迁移脚本：创建 dish 和 dish_config 表
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenvExpand.expand(dotenv.config({ path: path.join(__dirname, "../.env") }));

const PG_HOST = process.env.PG_HOST?.replace("${VITE_SERVER_HOST}", "localhost") || "localhost";
const PG_PORT = parseInt(process.env.PG_PORT || "5432");
const PG_USERNAME = process.env.PG_USERNAME || "postgres";
const PG_PASSWORD = process.env.PG_PASSWORD || "123456";
const PG_DBNAME = process.env.PG_DBNAME || "postgres";

const createTablesSQL = `
-- 创建 dish 表
CREATE TABLE IF NOT EXISTS "dish" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "playerId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "qqNumber" TEXT,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "submittedById" TEXT NOT NULL,
    CONSTRAINT "dish_pkey" PRIMARY KEY ("id")
);

-- 创建 dish_config 表
CREATE TABLE IF NOT EXISTS "dish_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,
    CONSTRAINT "dish_config_pkey" PRIMARY KEY ("id")
);

-- 创建唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS "dish_config_key_key" ON "dish_config"("key");

-- 创建索引
CREATE INDEX IF NOT EXISTS "dish_status_idx" ON "dish"("status");
CREATE INDEX IF NOT EXISTS "dish_level_idx" ON "dish"("level");
CREATE INDEX IF NOT EXISTS "dish_playerId_idx" ON "dish"("playerId");

-- 添加外键约束
ALTER TABLE "dish" ADD CONSTRAINT "dish_reviewedById_fkey" 
    FOREIGN KEY ("reviewedById") REFERENCES "account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dish" ADD CONSTRAINT "dish_submittedById_fkey" 
    FOREIGN KEY ("submittedById") REFERENCES "account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dish_config" ADD CONSTRAINT "dish_config_updatedById_fkey" 
    FOREIGN KEY ("updatedById") REFERENCES "account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
`;

// 主函数
async function main() {
    console.log("开始创建 dish 和 dish_config 表...");
    console.log(`连接到: ${PG_HOST}:${PG_PORT}/${PG_DBNAME}`);
    
    // 动态导入 pg
    const pg = await import("pg");
    const client = new pg.Client({
        host: PG_HOST,
        port: PG_PORT,
        user: PG_USERNAME,
        password: PG_PASSWORD,
        database: PG_DBNAME,
    });
    
    try {
        await client.connect();
        console.log("✅ 数据库连接成功");
        
        await client.query(createTablesSQL);
        console.log("✅ 表创建成功！");
        
    } catch (error) {
        console.error("❌ 执行失败:", (error as Error).message);
        throw error;
    } finally {
        await client.end();
    }
}

main().catch((error) => {
    console.error("迁移失败:", error);
    process.exit(1);
});