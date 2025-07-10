/**
 * logger.ts - 统一日志工具
 *
 * 用途：
 *   - 提供主线程与Service Worker通用的多级别日志接口
 *   - 支持 info/warn/error/debug 四级别
 *   - 自动适配主线程与SW环境（可扩展远程上报等）
 *   - 便于全局替换、统一格式、后续扩展
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

export const Logger = {
  setLevel(level: LogLevel) {
    globalLogLevel = level;
  },
  getLevel(): LogLevel {
    return globalLogLevel;
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
    const prefix = '[LOG]';
    const env = typeof window === 'undefined' ? '[SW]' : '[MAIN]';
    const time = new Date().toISOString();
    const fullMsg = `${prefix}${env}[${level.toUpperCase()}][${time}] ${msg}`;
    switch (level) {
      case 'info':
        console.log(fullMsg, ...args); break;
      case 'warn':
        console.warn(fullMsg, ...args); break;
      case 'error':
        console.error(fullMsg, ...args); break;
      case 'debug':
        console.debug(fullMsg, ...args); break;
    }
  }
}; 