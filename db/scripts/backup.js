/**
 * @file backup.js
 * @description 数据库备份脚本的 JavaScript 版本
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.join(__dirname, "../../.env") });

/**
 * 解析环境变量引用
 * @param {string} value - 环境变量值
 * @returns {string} 解析后的值
 */
function resolveEnvReferences(value) {
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
}

/**
 * 处理环境变量，解析引用
 */
function processEnvironmentVariables() {
  const envVars = [
    'VITE_SERVER_HOST', // 先处理基础变量
    'PG_USERNAME', 'PG_PASSWORD', 'PG_HOST', 'PG_PORT', 'PG_DBNAME',
    'PG_URL', 'ELECTRIC_HOST', 'ELECTRIC_PORT' // 再处理依赖变量
  ];
  
  envVars.forEach(varName => {
    if (process.env[varName]) {
      const originalValue = process.env[varName];
      process.env[varName] = resolveEnvReferences(process.env[varName]);
      console.log(`环境变量 ${varName}: ${originalValue} -> ${process.env[varName]}`);
    }
  });
}

// 处理环境变量引用
processEnvironmentVariables();

/**
 * 配置
 */
const CONFIG = {
  // PostgreSQL 配置
  PG_USERNAME: process.env.PG_USERNAME,
  PG_PASSWORD: process.env.PG_PASSWORD,
  PG_HOST: process.env.PG_HOST,
  PG_PORT: process.env.PG_PORT,
  PG_DBNAME: process.env.PG_DBNAME,
  
  // 备份目录
  OUTPUT_DIR: path.join(__dirname, "../backups"),
  
  // Docker Compose 配置
  DOCKER_COMPOSE_FILE: path.join(__dirname, "../../backend/docker-compose.yaml"),
};

/**
 * 工具函数
 */
const utils = {
  /**
   * 执行命令并处理错误
   * @param {string} command - 要执行的命令
   * @returns {string} 命令输出
   */
  execCommand: (command) => {
    try {
      return execSync(command, { encoding: "utf-8" });
    } catch (error) {
      console.error(`命令执行失败: ${command}`, error.message);
      throw error;
    }
  },

  /**
   * 检查文件是否存在
   * @param {string} filePath - 文件路径
   * @returns {boolean} 是否存在
   */
  fileExists: (filePath) => {
    return fs.existsSync(filePath);
  },

  /**
   * 确保目录存在
   * @param {string} dirPath - 目录路径
   */
  ensureDirectory: (dirPath) => {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  },

  /**
   * 写入文件
   * @param {string} filePath - 文件路径
   * @param {string} content - 文件内容
   */
  writeFile: (filePath, content) => {
    fs.writeFileSync(filePath, content, "utf-8");
  },
};

/**
 * 数据库备份器
 */
class DatabaseBackup {
  constructor() {
    this.validateConfig();
  }

  /**
   * 验证配置
   */
  validateConfig() {
    const requiredEnvVars = ["PG_USERNAME", "PG_PASSWORD", "PG_HOST", "PG_PORT", "PG_DBNAME"];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`缺少必要的环境变量: ${missingVars.join(", ")}`);
    }

    // 检查 .env 文件是否存在
    const envFile = path.join(__dirname, "../../.env");
    if (!utils.fileExists(envFile)) {
      throw new Error(".env 文件不存在！请创建并配置数据库连接信息。");
    }
  }

  /**
   * 打印环境变量信息
   */
  printConfig() {
    console.log("数据库连接信息：");
    console.log(`主机: ${CONFIG.PG_HOST}`);
    console.log(`端口: ${CONFIG.PG_PORT}`);
    console.log(`用户名: ${CONFIG.PG_USERNAME}`);
    console.log(`数据库名: ${CONFIG.PG_DBNAME}`);
  }

  /**
   * 检查是否为本地数据库
   * @returns {boolean} 是否为本地数据库
   */
  isLocalDatabase() {
    return CONFIG.PG_HOST === "localhost" || CONFIG.PG_HOST === "127.0.0.1";
  }

  /**
   * 获取所有表名（本地数据库）
   * @returns {string[]} 表名数组
   */
  getTablesLocal() {
    console.log("检测到本地数据库，使用 Docker Compose 执行备份...");
    
    const command = `docker compose -f ${CONFIG.DOCKER_COMPOSE_FILE} exec -T postgres psql -U ${CONFIG.PG_USERNAME} -d ${CONFIG.PG_DBNAME} -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"`;
    
    const result = utils.execCommand(command);
    return this.parseTableNames(result);
  }

  /**
   * 获取所有表名（远程数据库）
   * @returns {string[]} 表名数组
   */
  getTablesRemote() {
    console.log("检测到远程数据库，使用直接连接执行备份...");
    
    const pgUrl = `postgresql://${CONFIG.PG_USERNAME}:${CONFIG.PG_PASSWORD}@${CONFIG.PG_HOST}:${CONFIG.PG_PORT}/${CONFIG.PG_DBNAME}`;
    const command = `docker run --rm postgres:16-alpine psql "${pgUrl}" -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"`;
    
    const result = utils.execCommand(command);
    return this.parseTableNames(result);
  }

  /**
   * 解析表名列表
   * @param {string} result - 命令输出结果
   * @returns {string[]} 表名数组
   */
  parseTableNames(result) {
    return result
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.includes('tablename'))
      .map(line => line.replace(/"/g, '')); // 移除引号
  }

  /**
   * 备份单个表（本地数据库）
   * @param {string} tableName - 表名
   */
  backupTableLocal(tableName) {
    console.log(`正在导出表: ${tableName}...`);
    
    const command = `docker compose -f ${CONFIG.DOCKER_COMPOSE_FILE} exec -T postgres psql -U ${CONFIG.PG_USERNAME} -d ${CONFIG.PG_DBNAME} -c "COPY (SELECT * FROM \\"${tableName}\\") TO STDOUT WITH CSV HEADER;"`;
    
    try {
      const result = utils.execCommand(command);
      const csvFile = path.join(CONFIG.OUTPUT_DIR, `${tableName}.csv`);
      utils.writeFile(csvFile, result);
    } catch (error) {
      throw error;
    }
  }

  /**
   * 备份单个表（远程数据库）
   * @param {string} tableName - 表名
   */
  backupTableRemote(tableName) {
    console.log(`正在导出表: ${tableName}...`);
    
    const pgUrl = `postgresql://${CONFIG.PG_USERNAME}:${CONFIG.PG_PASSWORD}@${CONFIG.PG_HOST}:${CONFIG.PG_PORT}/${CONFIG.PG_DBNAME}`;
    const command = `docker run --rm postgres:16-alpine psql "${pgUrl}" -c "COPY (SELECT * FROM \\"${tableName}\\") TO STDOUT WITH CSV HEADER;"`;
    
    try {
      const result = utils.execCommand(command);
      const csvFile = path.join(CONFIG.OUTPUT_DIR, `${tableName}.csv`);
      utils.writeFile(csvFile, result);
    } catch (error) {
      throw error;
    }
  }

  /**
   * 执行完整的备份流程
   */
  async backup() {
    try {
      console.log("🔄 开始数据库备份...");
      
      // 打印配置信息
      this.printConfig();
      
      // 确保备份目录存在
      utils.ensureDirectory(CONFIG.OUTPUT_DIR);
      
      // 根据数据库类型获取表名
      const tables = this.isLocalDatabase() 
        ? this.getTablesLocal() 
        : this.getTablesRemote();
      
      console.log(`📋 找到 ${tables.length} 个表`);
      
      // 备份每个表
      let successCount = 0;
      let errorCount = 0;
      
      for (const table of tables) {
        try {
          if (this.isLocalDatabase()) {
            this.backupTableLocal(table);
          } else {
            this.backupTableRemote(table);
          }
          successCount++;
        } catch (error) {
          console.error(`❌ 备份表 ${table} 失败:`, error.message);
          errorCount++;
        }
      }
      
      console.log(`📊 备份完成: ${successCount} 个表成功备份, ${errorCount} 个表失败`);
      console.log(`📁 备份文件保存在: ${CONFIG.OUTPUT_DIR}`);
      
    } catch (error) {
      console.error("❌ 数据库备份失败:", error);
      process.exit(1);
    }
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    const backup = new DatabaseBackup();
    await backup.backup();
  } catch (error) {
    console.error("❌ 初始化失败:", error);
    process.exit(1);
  }
}

// 如果直接运行此文件，则执行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { DatabaseBackup };