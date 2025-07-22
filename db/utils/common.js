/**
 * @file common.js
 * @description 通用工具函数
 * @version 1.0.0
 */

import fs from "fs";
import { execSync } from "child_process";
import path from "path";

/**
 * 字符串处理工具
 */
export const StringUtils = {
  /**
   * 转换为 PascalCase
   * 将下划线分隔的字符串转换为 PascalCase 格式
   * @param {string} str - 输入字符串
   * @returns {string} PascalCase 字符串
   * @example
   * toPascalCase("user_name") // "UserName"
   * toPascalCase("CHARACTER_PERSONALITY_TYPE") // "CharacterPersonalityType"
   */
  toPascalCase: (str) => {
    if (!str) return "";
    return str.toLowerCase().replace(/(?:^|_)([a-z])/g, (_, c) => c.toUpperCase());
  },
  
  /**
   * 转换为 camelCase
   * 将下划线分隔的字符串转换为 camelCase 格式
   * @param {string} str - 输入字符串
   * @returns {string} camelCase 字符串
   * @example
   * toCamelCase("user_name") // "userName"
   * toCamelCase("CHARACTER_PERSONALITY_TYPE") // "characterPersonalityType"
   */
  toCamelCase: (str) => {
    if (!str) return "";
    return str.toLowerCase()
      .replace(/(?:^|_)([a-z])/g, (_, c) => c.toUpperCase())
      .replace(/^[A-Z]/, c => c.toLowerCase());
  },
  
  /**
   * 生成用户友好的标签
   * 将字段名转换为用户友好的显示标签
   * @param {string} fieldName - 字段名
   * @returns {string} 用户友好标签
   * @example
   * generateLabel("userName") // "User Name"
   * generateLabel("createdAt") // "Created At"
   */
  generateLabel: (fieldName) => {
    if (!fieldName) return "";
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  },

  /**
   * 从注释中提取字段描述
   * 移除注释符号并清理空白字符
   * @param {string} comment - 注释内容
   * @returns {string} 字段描述
   * @example
   * extractDescription("// 用户名称") // "用户名称"
   * extractDescription("/// @zod.string.min(2)") // "@zod.string.min(2)"
   */
  extractDescription: (comment) => {
    if (!comment) return '';
    return comment.replace(/\/\/\s*/, '').trim();
  },
};

/**
 * 文件操作工具
 */
export const FileUtils = {
  /**
   * 安全的文件写入
   * 自动创建目录并写入文件，包含错误处理
   * @param {string} filePath - 文件路径
   * @param {string} content - 文件内容
   * @param {string} encoding - 编码格式，默认 utf-8
   * @throws {Error} 写入失败时抛出错误
   */
  safeWriteFile: (filePath, content, encoding = "utf-8") => {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, content, encoding);
    } catch (error) {
      console.error(`❌ 写入文件失败: ${filePath}`, error);
      throw new Error(`文件写入失败: ${filePath} - ${error.message}`);
    }
  },

  /**
   * 安全的文件读取
   * 读取文件内容，包含错误处理
   * @param {string} filePath - 文件路径
   * @param {string} encoding - 编码格式，默认 utf-8
   * @returns {string} 文件内容
   * @throws {Error} 读取失败时抛出错误
   */
  safeReadFile: (filePath, encoding = "utf-8") => {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`文件不存在: ${filePath}`);
      }
      return fs.readFileSync(filePath, encoding);
    } catch (error) {
      console.error(`❌ 读取文件失败: ${filePath}`, error);
      throw new Error(`文件读取失败: ${filePath} - ${error.message}`);
    }
  },

  /**
   * 确保目录存在
   * 创建指定的目录结构
   * @param {string|string[]} dirs - 目录路径或路径数组
   */
  ensureDirectories: (dirs) => {
    const directoryList = Array.isArray(dirs) ? dirs : [dirs];
    
    directoryList.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  },

  /**
   * 清理临时文件
   * 删除指定的临时文件
   * @param {string|string[]} files - 文件路径或路径数组
   */
  cleanupTempFiles: (files) => {
    const fileList = Array.isArray(files) ? files : [files];

    fileList.forEach((file) => {
      if (fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
          console.log(`🗑️ 已清理临时文件: ${file}`);
        } catch (error) {
          console.warn(`⚠️ 清理临时文件失败: ${file}`, error.message);
        }
      }
    });
  },
};

/**
 * 命令执行工具
 */
export const CommandUtils = {
  /**
   * 执行命令并处理错误
   * 执行系统命令并提供详细的错误信息
   * @param {string} command - 要执行的命令
   * @param {Object} options - 执行选项
   * @throws {Error} 命令执行失败时抛出错误
   */
  execCommand: (command, options = {}) => {
    try {
      const defaultOptions = { 
        stdio: "inherit", 
        encoding: "utf-8",
        ...options 
      };
      
      console.log(`🔧 执行命令: ${command}`);
      execSync(command, defaultOptions);
      console.log(`✅ 命令执行成功: ${command}`);
    } catch (error) {
      console.error(`❌ 命令执行失败: ${command}`, error);
      throw new Error(`命令执行失败: ${command} - ${error.message}`);
    }
  },
};

/**
 * 日志工具
 */
export const LogUtils = {
  /**
   * 格式化统计信息
   * @param {Object} stats - 统计对象
   * @returns {string} 格式化的统计信息
   */
  formatStats: (stats) => {
    const lines = [];
    lines.push("📊 统计信息:");
    
    Object.entries(stats).forEach(([key, value]) => {
      const icon = key.includes('数量') ? '📈' : 
                   key.includes('大小') ? '💾' : 
                   key.includes('文件') ? '📁' : '📋';
      lines.push(`   ${icon} ${key}: ${value}`);
    });
    
    return lines.join('\n');
  },

  /**
   * 打印生成进度
   * @param {string} step - 当前步骤
   * @param {string} description - 步骤描述
   */
  logStep: (step, description) => {
    console.log(`\n🔄 ${step}: ${description}`);
  },

  /**
   * 打印成功信息
   * @param {string} message - 成功消息
   */
  logSuccess: (message) => {
    console.log(`✅ ${message}`);
  },

  /**
   * 打印错误信息
   * @param {string} message - 错误消息
   * @param {Error} error - 错误对象
   */
  logError: (message, error) => {
    console.error(`❌ ${message}`, error);
  },
}; 