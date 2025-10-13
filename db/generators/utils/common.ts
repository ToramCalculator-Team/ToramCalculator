/**
 * @file common.ts
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
   * @param str - 输入字符串
   * @returns PascalCase 字符串
   * @example
   * toPascalCase("user_name") // "UserName"
   * toPascalCase("CHARACTER_PERSONALITY_TYPE") // "CharacterPersonalityType"
   */
  toPascalCase: (str: string): string => {
    if (!str) return "";
    return str.toLowerCase().replace(/(?:^|_)([a-z])/g, (_, c) => c.toUpperCase());
  },
  
  /**
   * 转换为 camelCase
   * 将下划线分隔的字符串转换为 camelCase 格式
   * @param str - 输入字符串
   * @returns camelCase 字符串
   * @example
   * toCamelCase("user_name") // "userName"
   * toCamelCase("CHARACTER_PERSONALITY_TYPE") // "characterPersonalityType"
   */
  toCamelCase: (str: string): string => {
    if (!str) return "";
    return str.toLowerCase()
      .replace(/(?:^|_)([a-z])/g, (_, c) => c.toUpperCase())
      .replace(/^[A-Z]/, c => c.toLowerCase());
  },
  
  /**
   * 生成用户友好的标签
   * 将字段名转换为用户友好的显示标签
   * @param fieldName - 字段名
   * @returns 用户友好标签
   * @example
   * generateLabel("userName") // "User Name"
   * generateLabel("createdAt") // "Created At"
   */
  generateLabel: (fieldName: string): string => {
    if (!fieldName) return "";
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  },

  /**
   * 从注释中提取字段描述
   * 移除注释符号并清理空白字符
   * @param comment - 注释内容
   * @returns 字段描述
   * @example
   * extractDescription("// 用户名称") // "用户名称"
   * extractDescription("/// @zod.string.min(2)") // "@zod.string.min(2)"
   */
  extractDescription: (comment: string): string => {
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
   * @param filePath - 文件路径
   * @param content - 文件内容
   * @param encoding - 编码格式，默认 utf-8
   * @throws 写入失败时抛出错误
   */
  safeWriteFile: (filePath: string, content: string, encoding: BufferEncoding = "utf-8"): void => {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, content, encoding);
    } catch (error) {
      console.error(`❌ 写入文件失败: ${filePath}`, error);
      throw new Error(`文件写入失败: ${filePath} - ${(error as Error).message}`);
    }
  },

  /**
   * 安全的文件读取
   * 读取文件内容，包含错误处理
   * @param filePath - 文件路径
   * @param encoding - 编码格式，默认 utf-8
   * @returns 文件内容
   * @throws 读取失败时抛出错误
   */
  safeReadFile: (filePath: string, encoding: BufferEncoding = "utf-8"): string => {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`文件不存在: ${filePath}`);
      }
      return fs.readFileSync(filePath, encoding);
    } catch (error) {
      console.error(`❌ 读取文件失败: ${filePath}`, error);
      throw new Error(`文件读取失败: ${filePath} - ${(error as Error).message}`);
    }
  },

  /**
   * 确保目录存在
   * 创建指定的目录结构
   * @param dirs - 目录路径或路径数组
   */
  ensureDirectories: (dirs: string | string[]): void => {
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
   * @param files - 文件路径或路径数组
   */
  cleanupTempFiles: (files: string | string[]): void => {
    const fileList = Array.isArray(files) ? files : [files];

    fileList.forEach((file) => {
      if (fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
          console.log(`🗑️ 已清理临时文件: ${file}`);
        } catch (error) {
          console.warn(`⚠️ 清理临时文件失败: ${file}`, (error as Error).message);
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
   * @param command - 要执行的命令
   * @param options - 执行选项
   * @throws 命令执行失败时抛出错误
   */
  execCommand: (command: string, options: any = {}): void => {
    try {
      // 检查是否包含重定向操作
      const redirectMatch = command.match(/>\s*([^\s]+)/);
      if (redirectMatch) {
        const outputPath = redirectMatch[1];
        // 确保输出目录存在
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
      }

      const defaultOptions = { 
        stdio: "inherit" as const, 
        encoding: "utf-8" as BufferEncoding,
        ...options 
      };
      
      console.log(`🔧 执行命令: ${command}`);
      execSync(command, defaultOptions);
      console.log(`✅ 命令执行成功: ${command}`);
    } catch (error) {
      console.error(`❌ 命令执行失败: ${command}`, error);
      throw new Error(`命令执行失败: ${command} - ${(error as Error).message}`);
    }
  },
};

/**
 * 日志工具
 */
export const LogUtils = {
  /**
   * 格式化统计信息
   * @param stats - 统计对象
   * @returns 格式化的统计信息
   */
  formatStats: (stats: Record<string, any>): string => {
    const lines: string[] = [];
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
   * @param step - 当前步骤
   * @param description - 步骤描述
   */
  logStep: (step: string, description: string): void => {
    console.log(`\n🔄 ${step}: ${description}`);
  },

  /**
   * 打印信息
   * @param message - 信息消息
   */
  logInfo: (message: string): void => {
    console.log(`ℹ️  ${message}`);
  },

  /**
   * 打印成功信息
   * @param message - 成功消息
   */
  logSuccess: (message: string): void => {
    console.log(`✅ ${message}`);
  },

  /**
   * 打印警告信息
   * @param message - 警告消息
   */
  logWarning: (message: string): void => {
    console.warn(`⚠️  ${message}`);
  },

  /**
   * 打印错误信息
   * @param message - 错误消息
   * @param error - 错误对象
   */
  logError: (message: string, error: Error): void => {
    console.error(`❌ ${message}`, error);
  },
};
