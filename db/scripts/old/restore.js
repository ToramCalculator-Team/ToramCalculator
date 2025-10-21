/**
 * @file restore.js
 * @description 从 CSV 文件恢复数据库的 JavaScript 版本
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync, spawn } from "child_process";
import dotenv from "dotenv";
import readline from "readline";
import { DATABASE_SCHEMA } from "../generated/database-schema.js";

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
  
  // PostgreSQL 容器配置（仅用于本地数据库）
  PG_CONTAINER_NAME: "toram-calculator-postgres-1",
  
  // 备份目录
  BACKUP_DIR: path.join(__dirname, "../backups"),
};

/**
 * 工具函数
 */
const utils = {
  /**
   * 执行 Docker 命令
   * @param {string} command - 要执行的命令
   * @returns {string} 命令输出
   */
  execDockerCommand: (command) => {
    try {
      return execSync(command, { encoding: "utf-8" });
    } catch (error) {
      console.error(`命令执行失败: ${command}`, error.message);
      throw error;
    }
  },

  /**
   * 检查是否为本地数据库
   * @returns {boolean} 是否为本地数据库
   */
  isLocalDatabase: () => {
    return CONFIG.PG_HOST === "localhost" || CONFIG.PG_HOST === "127.0.0.1";
  },

  /**
   * 执行 PostgreSQL 命令
   * @param {string} sql - SQL 命令
   * @returns {string} 命令输出
   */
  execPsql: (sql) => {
    const escapedSql = sql.replace(/'/g, "'\"'\"'");
    
    if (utils.isLocalDatabase()) {
      // 本地数据库：通过 Docker 容器连接
      const pgUrl = `postgresql://${CONFIG.PG_USERNAME}:${CONFIG.PG_PASSWORD}@/${CONFIG.PG_DBNAME}`;
      const command = `echo '${escapedSql}' | docker exec -i ${CONFIG.PG_CONTAINER_NAME} psql "${pgUrl}"`;
      return utils.execDockerCommand(command);
    } else {
      // 远程数据库：使用 Docker 容器中的 psql 连接远程数据库
      const pgUrl = `postgresql://${CONFIG.PG_USERNAME}:${CONFIG.PG_PASSWORD}@${CONFIG.PG_HOST}:${CONFIG.PG_PORT}/${CONFIG.PG_DBNAME}`;
      const command = `echo '${escapedSql}' | docker run --rm -i postgres:16-alpine psql "${pgUrl}"`;
      return utils.execDockerCommand(command);
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
   * 读取 CSV 文件内容
   * @param {string} filePath - 文件路径
   * @returns {string} 文件内容
   */
  readCsvFile: (filePath) => {
    return fs.readFileSync(filePath, "utf-8");
  },

  /**
   * 清理表名（移除特殊字符和多余信息，但保留关系表的下划线）
   * @param {string} tableName - 原始表名
   * @returns {string} 清理后的表名
   */
  cleanTableName: (tableName) => {
    return tableName
      .replace(/^[-]+/, '') // 只移除开头的破折号，保留下划线
      .replace(/[-_]+$/, '') // 移除结尾的破折号和下划线
      .replace(/\s*\(\d+\s+rows?\)\s*$/i, '') // 移除 "(63 rows)" 这样的信息
      .trim();
  },
};

/**
 * 数据库恢复器
 */
class DatabaseRestorer {
  constructor() {
    this.validateConfig();
  }

  /**
   * 初始化（异步安全检查）
   */
  async initialize() {
    await this.checkRemoteDatabaseSafety();
  }

  /**
   * 验证配置
   */
  validateConfig() {
    const requiredEnvVars = ["PG_USERNAME", "PG_PASSWORD", "PG_PORT", "PG_DBNAME"];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`缺少必要的环境变量: ${missingVars.join(", ")}`);
    }

    if (!utils.fileExists(CONFIG.BACKUP_DIR)) {
      throw new Error(`备份目录不存在: ${CONFIG.BACKUP_DIR}`);
    }
  }

  /**
   * 检查远程数据库操作安全性
   */
  checkRemoteDatabaseSafety() {
    if (!utils.isLocalDatabase()) {
      console.log("\n⚠️  ⚠️  ⚠️  安全警告  ⚠️  ⚠️  ⚠️");
      console.log("🚨 检测到远程数据库操作！");
      console.log(`📍 目标数据库: ${CONFIG.PG_HOST}:${CONFIG.PG_PORT}/${CONFIG.PG_DBNAME}`);
      console.log("✅ 如果确认继续，请输入 'YES' 并按回车");
      
      // 等待用户确认
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      return new Promise((resolve, reject) => {
        rl.question('\n请输入确认: ', (answer) => {
          rl.close();
          if (answer.trim().toUpperCase() === 'YES') {
            console.log("✅ 用户确认，继续执行...");
            resolve();
          } else {
            console.log("❌ 用户取消操作");
            process.exit(0);
          }
        });
      });
    }
  }

  /**
   * 禁用外键约束
   */
  disableForeignKeys() {
    console.log("🚫 禁用外键约束...");
    try {
      utils.execPsql("SET session_replication_role = 'replica';");
    } catch (error) {
      throw error;
    }
  }

  /**
   * 获取表的正确导入顺序
   * @returns {Promise<string[]>} 表名数组
   */
  async getTableOrder() {
    console.log("📌 获取表的正确导入顺序...");
    
    try {
      // 使用架构信息中的依赖关系进行拓扑排序
      const importOrder = this.getTopologicalOrder();
      
      console.log(`📋 找到 ${importOrder.length} 个表`);
      console.log(`📋 导入顺序: ${importOrder.slice(0, 5).join(' -> ')}${importOrder.length > 5 ? '...' : ''}`);
      
      return importOrder;
    } catch (error) {
      console.error("获取表顺序失败:", error);
      throw error;
    }
  }

  /**
   * 使用拓扑排序获取表的导入顺序
   * @returns {string[]} 表名数组
   */
  getTopologicalOrder() {
    const visited = new Set();
    const visiting = new Set();
    const result = [];
    
    const visit = (tableName) => {
      if (visiting.has(tableName)) {
        throw new Error(`循环依赖检测到: ${tableName}`);
      }
      if (visited.has(tableName)) {
        return;
      }
      
      visiting.add(tableName);
      
      // 获取此表的依赖
      const dependency = DATABASE_SCHEMA.dependencies.find(dep => dep.table === tableName);
      if (dependency) {
        for (const depTable of dependency.dependsOn) {
          visit(depTable);
        }
      }
      
      visiting.delete(tableName);
      visited.add(tableName);
      result.push(tableName);
    };
    
    // 遍历所有表
    for (const table of DATABASE_SCHEMA.tables) {
      visit(table.name);
    }
    
    return result;
  }

  /**
   * 导入 CSV 文件
   * @param {string[]} tables - 表名数组
   */
  async importCsvFiles(tables) {
    console.log("📥 按依赖顺序导入 CSV 文件...");
    
    let importedCount = 0;
    let skippedCount = 0;
    
    for (const table of tables) {
      const csvFile = path.join(CONFIG.BACKUP_DIR, `${table}.csv`);
      
      if (utils.fileExists(csvFile)) {
        console.log(`⬆️ 正在导入表: ${table}...`);
        try {
          const csvContent = utils.readCsvFile(csvFile);
          
          let child;
          if (utils.isLocalDatabase()) {
            // 本地数据库：通过 Docker 容器导入
            const pgUrl = `postgresql://${CONFIG.PG_USERNAME}:${CONFIG.PG_PASSWORD}@/${CONFIG.PG_DBNAME}`;
            
            child = spawn('docker', [
              'exec', '-i', CONFIG.PG_CONTAINER_NAME,
              'psql', pgUrl
            ], { stdio: ['pipe', 'pipe', 'pipe'] });
          } else {
            // 远程数据库：使用 Docker 容器中的 psql 连接远程数据库
            const pgUrl = `postgresql://${CONFIG.PG_USERNAME}:${CONFIG.PG_PASSWORD}@${CONFIG.PG_HOST}:${CONFIG.PG_PORT}/${CONFIG.PG_DBNAME}`;
            
            child = spawn('docker', [
              'run', '--rm', '-i', 'postgres:16-alpine',
              'psql', pgUrl
            ], { stdio: ['pipe', 'pipe', 'pipe'] });
          }
          
          // 发送 SQL 命令和 CSV 数据
          child.stdin.write(`SET session_replication_role = 'replica';\\copy "${table}" FROM STDIN CSV HEADER;\n`);
          child.stdin.write(csvContent);
          child.stdin.end();
      
          await new Promise((resolve, reject) => {
            child.on('close', (code) => {
              if (code === 0) {
                importedCount++;
                resolve();
              } else {
                reject(new Error(`导入失败，退出码: ${code}`));
              }
            });
            child.on('error', reject);
          });
        } catch (error) {
          throw error;
          skippedCount++;
        }
      } else {
        console.log(`⚠️ 跳过: ${table} (未找到 ${csvFile})`);
        skippedCount++;
      }
    }
    
    console.log(`📊 导入完成: ${importedCount} 个表成功导入, ${skippedCount} 个表跳过`);
  }

  /**
   * 恢复外键约束
   */
  restoreForeignKeys() {
    console.log("🔄 恢复外键约束...");
    try {
      utils.execPsql("SET session_replication_role = 'origin';");
    } catch (error) {
      throw error;
    }
  }


  /**
   * 执行完整的恢复流程
   */
  async restore() {
    try {
      console.log("🔄 开始从 CSV 文件恢复数据库...");
      
      // 0. 安全检查（如果是远程数据库）
      await this.initialize();
      
      // 1. 禁用外键约束
      this.disableForeignKeys();
      
      // 2. 获取表的正确导入顺序
      const tables = await this.getTableOrder();
      
      // 3. 按顺序导入 CSV 文件
      await this.importCsvFiles(tables);
      
      // 4. 恢复外键约束
      this.restoreForeignKeys();
      
      
      console.log("✅ 数据库恢复完成！");
    } catch (error) {
      console.error("❌ 数据库恢复失败:", error);
      process.exit(1);
    }
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    const restorer = new DatabaseRestorer();
    await restorer.restore();
  } catch (error) {
    console.error("❌ 初始化失败:", error);
    process.exit(1);
  }
}

// 如果直接运行此文件，则执行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { DatabaseRestorer };
