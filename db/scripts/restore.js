/**
 * @file restore.js
 * @description 从 CSV 文件恢复数据库的 JavaScript 版本
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync, spawn } from "child_process";
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
  // PostgreSQL 容器配置
  PG_CONTAINER_NAME: "toram-calculator-postgres-1",
  PG_USERNAME: process.env.PG_USERNAME,
  PG_PASSWORD: process.env.PG_PASSWORD,
  PG_PORT: process.env.PG_PORT,
  PG_DBNAME: process.env.PG_DBNAME,
  
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
   * 执行 PostgreSQL 命令
   * @param {string} sql - SQL 命令
   * @returns {string} 命令输出
   */
  execPsql: (sql) => {
    const pgUrl = `postgresql://${CONFIG.PG_USERNAME}:${CONFIG.PG_PASSWORD}@${CONFIG.PG_CONTAINER_NAME}:${CONFIG.PG_PORT}/${CONFIG.PG_DBNAME}`;
    
    // 使用 echo 和管道来避免引号问题
    const escapedSql = sql.replace(/'/g, "'\"'\"'");
    const command = `echo '${escapedSql}' | docker exec -i ${CONFIG.PG_CONTAINER_NAME} psql "${pgUrl}"`;
    
    return utils.execDockerCommand(command);
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
    
    const sql = `
      WITH RECURSIVE full_deps AS (
          -- 捕捉所有外键依赖关系（包括关联表）
          SELECT 
              c.oid::regclass AS child_table,
              p.oid::regclass AS parent_table
          FROM pg_constraint con
          JOIN pg_class c ON con.conrelid = c.oid  -- 子表（含外键的表）
          JOIN pg_class p ON con.confrelid = p.oid -- 父表（被引用的表）
          WHERE con.contype = 'f'
      ),
      all_tables AS (
          SELECT oid::regclass AS table_name
          FROM pg_class 
          WHERE relkind = 'r' 
            AND relnamespace = 'public'::regnamespace
      ),
      sorted AS (
          -- 初始节点：没有父表的表（根节点）
          SELECT 
              table_name,
              ARRAY[table_name] AS path,
              0 AS depth
          FROM all_tables
          WHERE table_name NOT IN (SELECT child_table FROM full_deps)
          
          UNION ALL
          
          -- 递归添加依赖项：确保父表先于子表
          SELECT 
              d.child_table,
              s.path || d.child_table,
              s.depth + 1
          FROM full_deps d
          JOIN sorted s ON d.parent_table = s.table_name
          WHERE NOT d.child_table = ANY(s.path)  -- 防止循环
      ),
      final_order AS (
          SELECT 
              table_name,
              depth,
              MAX(depth) OVER (PARTITION BY table_name) AS max_depth  -- ✅ 计算最大深度
          FROM sorted
      ),
      distinct_tables AS (
          SELECT DISTINCT ON (table_name) table_name, depth  -- ✅ 显式去重
          FROM final_order
          WHERE depth = max_depth
          ORDER BY table_name, depth
      )
      SELECT regexp_replace(table_name::text, '"', '', 'g') AS table_name
      FROM distinct_tables
      ORDER BY depth, table_name;
    `;

    try {
      const result = utils.execPsql(sql);
      // 解析结果，提取表名并清理
      const lines = result.split('\n')
        .filter(line => line.trim() && !line.includes('table_name'))
        .map(line => utils.cleanTableName(line.trim()))
        .filter(tableName => tableName && tableName.length > 0); // 过滤空表名
      
      console.log(`📋 找到 ${lines.length} 个表`);
      return lines;
    } catch (error) {
      console.error("获取表顺序失败:", error);
      throw error;
    }
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
          const pgUrl = `postgresql://${CONFIG.PG_USERNAME}:${CONFIG.PG_PASSWORD}@${CONFIG.PG_CONTAINER_NAME}:${CONFIG.PG_PORT}/${CONFIG.PG_DBNAME}`;
          
          // 使用子进程执行命令并传递 CSV 内容
          const child = spawn('docker', [
            'exec', '-i', CONFIG.PG_CONTAINER_NAME,
            'psql', pgUrl, '-c', `\\copy "${table}" FROM STDIN CSV HEADER;`
          ], { stdio: ['pipe', 'pipe', 'pipe'] });
      
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
   * 修复自增主键（序列）
   * @param {string[]} tables - 表名数组
   */
  fixSequences(tables) {
    console.log("🔧 修复自增序列...");
    
    let fixedCount = 0;
    let skippedCount = 0;
    
    for (const table of tables) {
      console.log(`  - 处理表: ${table}`);
      
      const sql = `
        DO $$ 
        DECLARE 
            seq_name TEXT;
            pk_column TEXT;
            table_exists BOOLEAN;
        BEGIN
            -- 检查表是否存在
            SELECT EXISTS (
                SELECT 1
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE c.relname = '${table}'
                  AND n.nspname = 'public'
            ) INTO table_exists;

            IF table_exists THEN
                -- 获取主键列名
                SELECT a.attname INTO pk_column
                FROM pg_index i
                JOIN pg_attribute a ON a.attnum = ANY(i.indkey) AND a.attrelid = i.indrelid
                WHERE i.indrelid = '"${table}"'::regclass  -- ✅ 处理大小写敏感
                  AND i.indisprimary;

                -- 如果存在单列主键，则获取序列并重置
                IF pk_column IS NOT NULL THEN
                    SELECT pg_get_serial_sequence('"${table}"', pk_column) INTO seq_name;
                    IF seq_name IS NOT NULL THEN
                        EXECUTE 'SELECT setval(' || quote_literal(seq_name) || ', COALESCE((SELECT MAX(' || quote_ident(pk_column) || ') FROM "${table}"), 1), false)';
                        RAISE NOTICE '表 % 的序列已修复', '${table}';
                    END IF;
                ELSE
                    RAISE NOTICE '表 % 没有单列主键，跳过序列修复', '${table}';
                END IF;
            ELSE
                RAISE NOTICE '表 % 不存在，跳过序列修复', '${table}';
            END IF;
        END
        $$;
      `;
      
      try {
        utils.execPsql(sql);
        fixedCount++;
      } catch (error) {
        throw error;
        skippedCount++;
      }
    }
    
    console.log(`🔧 序列修复完成: ${fixedCount} 个表成功修复, ${skippedCount} 个表跳过`);
  }

  /**
   * 执行完整的恢复流程
   */
  async restore() {
    try {
      console.log("🔄 开始从 CSV 文件恢复数据库...");
      
      // 1. 禁用外键约束
      this.disableForeignKeys();
      
      // 2. 获取表的正确导入顺序
      const tables = await this.getTableOrder();
      
      // 3. 按顺序导入 CSV 文件
      await this.importCsvFiles(tables);
      
      // 4. 恢复外键约束
      this.restoreForeignKeys();
      
      // 5. 修复自增主键（序列）
      this.fixSequences(tables);
      
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
