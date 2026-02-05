import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma Studio config for generated schema.
 *
 * Prisma v7 移除了 `prisma studio --schema`，改用 `--config` 指定 schema/datasource。
 * 这个配置文件专门指向 `db/generated/schema.prisma`，方便直接浏览“注入枚举后的临时 schema”。
 */
// .env 里使用了 ${VAR} 形式的变量引用；Prisma 不会自动展开，所以要显式 dotenv-expand 一下
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenvExpand.expand(dotenv.config({ path: path.join(__dirname, "../.env") }));

export default defineConfig({
	// 执行完dev:init后，会生成db/generated/schema.prisma文件
	schema: "./generated/schema.prisma",
	datasource: {
		url: env("DATABASE_URL"),
	},
});
