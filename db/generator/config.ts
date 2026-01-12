/**
 * @file config.ts
 * @description 生成器配置文件
 * @version 1.0.0
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const generatedFolder = path.join(__dirname, "../generated");

/**
 * 文件路径配置
 * 集中管理所有输入和输出文件的路径
 */
export const PATHS = {
	// 输入文件
	enums: path.join(__dirname, "../schema/enums.ts"),
	schemaFolder: path.join(__dirname, "../schema"),
	mainSchema: path.join(__dirname, "../schema/main.prisma"),
	// 输出目录
	generatedFolder,
	tempSchema: path.join(generatedFolder, "schema.prisma"),
	serverDBSQL: path.join(generatedFolder, "server.sql"),
	clientDBSQL: path.join(generatedFolder, "client.sql"),
	zodSchema: path.join(generatedFolder, "zod/index.ts"),
	dmmfUtils: path.join(generatedFolder, "dmmf-utils.ts"),
	queryBuilderRules: path.join(generatedFolder, "queryBuilderRules.ts"),
	repositoriesOutput: path.join(generatedFolder, "repositories"),
};
