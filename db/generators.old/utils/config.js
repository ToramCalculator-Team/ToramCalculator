/**
 * @file config.js
 * @description 生成器配置文件
 * @version 1.0.0
 */

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 文件路径配置
 * 集中管理所有输入和输出文件的路径
 */
export const PATHS = {
  // 输入文件
  enums: path.join(__dirname, "../../schema/enums.ts"),
  baseSchema: path.join(__dirname, "../../schema/baseSchema.prisma"),

  // 生成的文件
  serverDB: {
    sql: path.join(__dirname, "../../generated/serverDB/init.sql"),
    tempSchema: path.join(__dirname, "../../temp_server_schema.prisma"),
  },
  clientDB: {
    sql: path.join(__dirname, "../../generated/clientDB/init.sql"),
    tempSchema: path.join(__dirname, "../../temp_client_schema.prisma"),
  },
  zod: {
    schemas: path.join(__dirname, "../../generated/zod/index.ts"),
  },
  kysely: {
    types: path.join(__dirname, "../../generated/kysely/kysely.ts"),
    enums: path.join(__dirname, "../../generated/kysely/enums.ts"),
  },
  queryBuilder: {
    rules: path.join(__dirname, "../../generated/queryBuilderRules.ts"),
  },
};

/**
 * 生成器配置
 */
export const GENERATOR_CONFIG = {
  // 临时文件清理
  tempFiles: [
    PATHS.serverDB.tempSchema,
    PATHS.clientDB.tempSchema,
  ],
  
  // 需要创建的目录
  directories: [
    path.dirname(PATHS.serverDB.sql),
    path.dirname(PATHS.clientDB.sql),
    path.dirname(PATHS.zod.schemas),
    path.dirname(PATHS.queryBuilder.rules),
  ],
}; 