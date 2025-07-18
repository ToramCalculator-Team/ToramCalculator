/**
 * logger.ts - 统一日志工具
 *
 * 用途：
 *   - 提供主线程与Service Worker通用的多级别日志接口
 *   - 支持 info/warn/error/debug 四级别
 *   - 自动适配主线程与SW环境（可扩展远程上报等）
 *   - 便于全局替换、统一格式、后续扩展
 *   - 优化可读性：颜色标识、简化前缀、调用源追踪
 *
 * 用法：
 *   import { Logger } from '@/utils/logger';
 *   Logger.info('xxx'); Logger.warn('yyy'); Logger.error('zzz'); Logger.debug('...');
 *
 * 依赖：无
 *
 * 维护：架构师/全栈/工具开发
 */

export type LogLevel = 'none' | 'error' | 'warn' | 'info' | 'debug';

let globalLogLevel: LogLevel = 'info';

// 颜色常量 - 仅在浏览器环境使用
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  // 前景色
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  
  // 背景色
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

// 浏览器CSS样式
const browserStyles = {
  info: 'color: #2196F3; font-weight: bold;',
  warn: 'color: #FF9800; font-weight: bold;',
  error: 'color: #F44336; font-weight: bold;',
  debug: 'color: #9C27B0; font-weight: bold;',
  time: 'color: #666; font-size: 0.9em;',
  env: 'color: #4CAF50; font-weight: bold;',
  module: 'color: #607D8B; font-weight: normal;',
};

interface LoggerConfig {
  showTime: boolean;
  showEnv: boolean;
  showCaller: boolean;
  useBrowserStyles: boolean;
  timeFormat: 'full' | 'time' | 'short';
}

let loggerConfig: LoggerConfig = {
  showTime: true,
  showEnv: true,
  showCaller: true,
  useBrowserStyles: typeof window !== 'undefined',
  timeFormat: 'short',
};

export const Logger = {
  setLevel(level: LogLevel) {
    globalLogLevel = level;
  },
  
  getLevel(): LogLevel {
    return globalLogLevel;
  },
  
  configure(config: Partial<LoggerConfig>) {
    loggerConfig = { ...loggerConfig, ...config };
  },
  
  info(msg: string, ...args: any[]) {
    if (['info', 'debug'].includes(globalLogLevel)) {
      this._log('info', msg, ...args);
    }
  },
  
  warn(msg: string, ...args: any[]) {
    if (['warn', 'info', 'debug'].includes(globalLogLevel)) {
      this._log('warn', msg, ...args);
    }
  },
  
  error(msg: string, ...args: any[]) {
    if (['error', 'warn', 'info', 'debug'].includes(globalLogLevel)) {
      this._log('error', msg, ...args);
    }
  },
  
  debug(msg: string, ...args: any[]) {
    if (globalLogLevel === 'debug') {
      this._log('debug', msg, ...args);
    }
  },
  
  _log(level: LogLevel, msg: string, ...args: any[]) {
    const isBrowser = typeof window !== 'undefined';
    const parts: string[] = [];
    const styles: string[] = [];
    
    // 时间戳
    if (loggerConfig.showTime) {
      const now = new Date();
      let timeStr = '';
      
      switch (loggerConfig.timeFormat) {
        case 'full':
          timeStr = now.toISOString();
          break;
        case 'time':
          timeStr = now.toTimeString().split(' ')[0];
          break;
        case 'short':
          timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
          break;
      }
      
      if (isBrowser && loggerConfig.useBrowserStyles) {
        parts.push(`%c${timeStr}`);
        styles.push(browserStyles.time);
      } else {
        parts.push(`${colors.gray}${timeStr}${colors.reset}`);
      }
    }
    
    // 环境标识
    if (loggerConfig.showEnv) {
      const env = isBrowser ? 'MAIN' : 'SW';
      if (isBrowser && loggerConfig.useBrowserStyles) {
        parts.push(`%c[${env}]`);
        styles.push(browserStyles.env);
      } else {
        parts.push(`${colors.green}[${env}]${colors.reset}`);
      }
    }
    
    // 级别标识
    const levelIcon = {
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      debug: '🔍'
    }[level];
    
    if (isBrowser && loggerConfig.useBrowserStyles) {
      parts.push(`%c${levelIcon}`);
      styles.push(browserStyles[level]);
    } else {
      const levelColor = {
        info: colors.blue,
        warn: colors.yellow,
        error: colors.red,
        debug: colors.magenta
      }[level];
      parts.push(`${levelColor}${levelIcon}${colors.reset}`);
    }
    
    // 调用者信息（模块名）
    if (loggerConfig.showCaller) {
      const caller = this._getCaller();
      if (caller) {
        if (isBrowser && loggerConfig.useBrowserStyles) {
          parts.push(`%c[${caller}]`);
          styles.push(browserStyles.module);
        } else {
          parts.push(`${colors.cyan}[${caller}]${colors.reset}`);
        }
      }
    }
    
    // 消息内容
    parts.push(msg);
    
    const fullMsg = parts.join(' ');
    
    // 根据级别调用相应的console方法
    switch (level) {
      case 'info':
        if (isBrowser && loggerConfig.useBrowserStyles && styles.length > 0) {
          console.log(fullMsg, ...styles, ...args);
        } else {
          console.log(fullMsg, ...args);
        }
        break;
      case 'warn':
        if (isBrowser && loggerConfig.useBrowserStyles && styles.length > 0) {
          console.warn(fullMsg, ...styles, ...args);
        } else {
          console.warn(fullMsg, ...args);
        }
        break;
      case 'error':
        if (isBrowser && loggerConfig.useBrowserStyles && styles.length > 0) {
          console.error(fullMsg, ...styles, ...args);
        } else {
          console.error(fullMsg, ...args);
        }
        break;
      case 'debug':
        if (isBrowser && loggerConfig.useBrowserStyles && styles.length > 0) {
          console.debug(fullMsg, ...styles, ...args);
        } else {
          console.debug(fullMsg, ...args);
        }
        break;
    }
  },
  
  _getCaller(): string | null {
    try {
      const stack = new Error().stack;
      if (!stack) return null;
      
      const lines = stack.split('\n');
      // 查找第一个不是logger内部的调用
      for (let i = 3; i < lines.length; i++) {
        const line = lines[i];
        if (!line.includes('logger.ts') && !line.includes('Logger._log')) {
          // 提取模块名
          const match = line.match(/\/([^\/]+)\.(ts|js|tsx|jsx)/);
          if (match) {
            return match[1];
          }
          
          // 备用方案：从路径中提取
          const pathMatch = line.match(/([^\/\\]+)\.(ts|js|tsx|jsx):\d+:\d+/);
          if (pathMatch) {
            return pathMatch[1];
          }
          
          // 最后方案：从函数名提取
          const funcMatch = line.match(/at\s+(\w+)/);
          if (funcMatch && funcMatch[1] !== 'Object') {
            return funcMatch[1];
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  }
}; 