/**
 * @file backup.ts
 * @description 数据库备份脚本的 TypeScript 版本
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.join(__dirname, "../../.env") });

/**
 * 配置接口
 */
interface Config {
  PG_USERNAME: string;
  PG_PASSWORD: string;
  PG_HOST: string;
  PG_PORT: string;
  PG_DBNAME: string;
  OUTPUT_DIR: string;
  DOCKER_COMPOSE_FILE: string;
}

/**
 * 环境变量处理结果
 */
interface ProcessedEnvVars {
  [key: string]: string;
}

/**
 * 备份结果
 */
interface BackupResult {
  successCount: number;
  errorCount: number;
}

/**
 * 解析环境变量引用
 * @param value - 环境变量值
 * @returns 解析后的值
 */
export const resolveEnvReferences = (value: string): string => {
  if (!value) return value;
  
  let result = value;
  let maxIterations = 10; // 防止无限循环
  let iterations = 0;
  
  // 循环解析，直到没有更多的变量引用
  while (result.includes('${') && iterations < maxIterations) {
    result = result.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      return process.env[varName] || match;
    });
    iterations++;
  }
  
  return result;
};

/**
 * 处理环境变量，解析引用
 * @returns 处理后的环境变量
 */
export const processEnvironmentVariables = (): ProcessedEnvVars => {
  const envVars = [
    'VITE_SERVER_HOST', // 先处理基础变量
    'PG_USERNAME', 'PG_PASSWORD', 'PG_HOST', 'PG_PORT', 'PG_DBNAME',
    'PG_URL', 'ELECTRIC_HOST', 'ELECTRIC_PORT' // 再处理依赖变量
  ];
  
  const processed: ProcessedEnvVars = {};
  
  envVars.forEach(varName => {
    if (process.env[varName]) {
      const originalValue = process.env[varName]!;
      const resolvedValue = resolveEnvReferences(originalValue);
      process.env[varName] = resolvedValue;
      processed[varName] = resolvedValue;
      console.log(`环境变量 ${varName}: ${originalValue} -> ${resolvedValue}`);
    }
  });
  
  return processed;
};

/**
 * 创建配置对象
 * @param processedEnvVars - 处理后的环境变量
 * @returns 配置对象
 */
export const createConfig = (processedEnvVars: ProcessedEnvVars): Config => ({
  PG_USERNAME: processedEnvVars.PG_USERNAME || '',
  PG_PASSWORD: processedEnvVars.PG_PASSWORD || '',
  PG_HOST: processedEnvVars.PG_HOST || '',
  PG_PORT: processedEnvVars.PG_PORT || '',
  PG_DBNAME: processedEnvVars.PG_DBNAME || '',
  OUTPUT_DIR: path.join(__dirname, "../backups"),
  DOCKER_COMPOSE_FILE: path.join(__dirname, "../../backend/docker-compose.yaml"),
});

/**
 * 执行命令并处理错误
 * @param command - 要执行的命令
 * @returns 命令输出
 */
export const execCommand = (command: string): string => {
  try {
    return execSync(command, { encoding: "utf-8" });
  } catch (error) {
    console.error(`命令执行失败: ${command}`, (error as Error).message);
    throw error;
  }
};

/**
 * 检查文件是否存在
 * @param filePath - 文件路径
 * @returns 是否存在
 */
export const fileExists = (filePath: string): boolean => {
  return fs.existsSync(filePath);
};

/**
 * 确保目录存在
 * @param dirPath - 目录路径
 */
export const ensureDirectory = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

/**
 * 写入文件
 * @param filePath - 文件路径
 * @param content - 文件内容
 */
export const writeFile = (filePath: string, content: string): void => {
  fs.writeFileSync(filePath, content, "utf-8");
};

/**
 * 验证配置
 * @param config - 配置对象
 * @throws 如果配置无效
 */
export const validateConfig = (config: Config): void => {
  const requiredEnvVars = ["PG_USERNAME", "PG_PASSWORD", "PG_HOST", "PG_PORT", "PG_DBNAME"];
  const missingVars = requiredEnvVars.filter(varName => !config[varName as keyof Config]);
  
  if (missingVars.length > 0) {
    throw new Error(`缺少必要的环境变量: ${missingVars.join(", ")}`);
  }

  // 检查 .env 文件是否存在
  const envFile = path.join(__dirname, "../../.env");
  if (!fileExists(envFile)) {
    throw new Error(".env 文件不存在！请创建并配置数据库连接信息。");
  }
};

/**
 * 打印环境变量信息
 * @param config - 配置对象
 */
export const printConfig = (config: Config): void => {
  console.log("数据库连接信息：");
  console.log(`主机: ${config.PG_HOST}`);
  console.log(`端口: ${config.PG_PORT}`);
  console.log(`用户名: ${config.PG_USERNAME}`);
  console.log(`数据库名: ${config.PG_DBNAME}`);
};

/**
 * 检查是否为本地数据库
 * @param host - 数据库主机
 * @returns 是否为本地数据库
 */
export const isLocalDatabase = (host: string): boolean => {
  return host === "localhost" || host === "127.0.0.1";
};

/**
 * 解析表名列表
 * @param result - 命令输出结果
 * @returns 表名数组
 */
export const parseTableNames = (result: string): string[] => {
  return result
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.includes('tablename'))
    .map(line => line.replace(/"/g, '')); // 移除引号
};

/**
 * 获取所有表名（本地数据库）
 * @param config - 配置对象
 * @returns 表名数组
 */
export const getTablesLocal = (config: Config): string[] => {
  console.log("检测到本地数据库，使用 Docker Compose 执行备份...");
  
  const command = `docker compose -f ${config.DOCKER_COMPOSE_FILE} exec -T postgres psql -U ${config.PG_USERNAME} -d ${config.PG_DBNAME} -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"`;
  
  const result = execCommand(command);
  return parseTableNames(result);
};

/**
 * 获取所有表名（远程数据库）
 * @param config - 配置对象
 * @returns 表名数组
 */
export const getTablesRemote = (config: Config): string[] => {
  console.log("检测到远程数据库，使用直接连接执行备份...");
  
  const pgUrl = `postgresql://${config.PG_USERNAME}:${config.PG_PASSWORD}@${config.PG_HOST}:${config.PG_PORT}/${config.PG_DBNAME}`;
  const command = `docker run --rm postgres:16-alpine psql "${pgUrl}" -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"`;
  
  const result = execCommand(command);
  return parseTableNames(result);
};

/**
 * 备份单个表（本地数据库）
 * @param tableName - 表名
 * @param config - 配置对象
 */
export const backupTableLocal = (tableName: string, config: Config): void => {
  console.log(`正在导出表: ${tableName}...`);
  
  const command = `docker compose -f ${config.DOCKER_COMPOSE_FILE} exec -T postgres psql -U ${config.PG_USERNAME} -d ${config.PG_DBNAME} -c "COPY (SELECT * FROM \\"${tableName}\\") TO STDOUT WITH CSV HEADER;"`;
  
  try {
    const result = execCommand(command);
    const csvFile = path.join(config.OUTPUT_DIR, `${tableName}.csv`);
    writeFile(csvFile, result);
  } catch (error) {
    throw error;
  }
};

/**
 * 备份单个表（远程数据库）
 * @param tableName - 表名
 * @param config - 配置对象
 */
export const backupTableRemote = (tableName: string, config: Config): void => {
  console.log(`正在导出表: ${tableName}...`);
  
  const pgUrl = `postgresql://${config.PG_USERNAME}:${config.PG_PASSWORD}@${config.PG_HOST}:${config.PG_PORT}/${config.PG_DBNAME}`;
  const command = `docker run --rm postgres:16-alpine psql "${pgUrl}" -c "COPY (SELECT * FROM \\"${tableName}\\") TO STDOUT WITH CSV HEADER;"`;
  
  try {
    const result = execCommand(command);
    const csvFile = path.join(config.OUTPUT_DIR, `${tableName}.csv`);
    writeFile(csvFile, result);
  } catch (error) {
    throw error;
  }
};

/**
 * 备份所有表
 * @param tables - 表名数组
 * @param config - 配置对象
 * @returns 备份结果
 */
export const backupAllTables = async (tables: string[], config: Config): Promise<BackupResult> => {
  let successCount = 0;
  let errorCount = 0;
  
  for (const table of tables) {
    try {
      if (isLocalDatabase(config.PG_HOST)) {
        backupTableLocal(table, config);
      } else {
        backupTableRemote(table, config);
      }
      successCount++;
    } catch (error) {
      console.error(`❌ 备份表 ${table} 失败:`, (error as Error).message);
      errorCount++;
    }
  }
  
  return { successCount, errorCount };
};

/**
 * 执行完整的备份流程
 * @param config - 配置对象
 */
export const backup = async (config: Config): Promise<void> => {
  try {
    console.log("🔄 开始数据库备份...");
    
    // 打印配置信息
    printConfig(config);
    
    // 确保备份目录存在
    ensureDirectory(config.OUTPUT_DIR);
    
    // 根据数据库类型获取表名
    const tables = isLocalDatabase(config.PG_HOST) 
      ? getTablesLocal(config) 
      : getTablesRemote(config);
    
    console.log(`📋 找到 ${tables.length} 个表`);
    
    // 备份每个表
    const result = await backupAllTables(tables, config);
    
    console.log(`📊 备份完成: ${result.successCount} 个表成功备份, ${result.errorCount} 个表失败`);
    console.log(`📁 备份文件保存在: ${config.OUTPUT_DIR}`);
    
  } catch (error) {
    console.error("❌ 数据库备份失败:", error);
    process.exit(1);
  }
};

/**
 * 主函数
 */
export const main = async (): Promise<void> => {
  try {
    // 处理环境变量
    const processedEnvVars = processEnvironmentVariables();
    
    // 创建配置
    const config = createConfig(processedEnvVars);
    
    // 验证配置
    validateConfig(config);
    
    // 执行备份
    await backup(config);
  } catch (error) {
    console.error("❌ 初始化失败:", error);
    process.exit(1);
  }
};

// 如果直接运行此文件，则执行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
