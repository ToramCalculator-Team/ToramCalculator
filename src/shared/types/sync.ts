/**
 * @file sync.ts
 * @description 数据同步相关的共享类型定义
 * 用于客户端和服务端之间的数据同步通信
 */

import type { DB } from "@db/generated/zod/index";

/**
 * 变更操作类型
 */
export type ChangeOperation = "insert" | "update" | "delete";

/**
 * 变更记录类型（数据库存储格式）
 * 从 changes 表读取的原始记录
 */
export type ChangeRecord = {
  /** 变更ID（自增） */
  id: number;
  /** 表名 */
  table_name: string;
  /** 操作类型 */
  operation: ChangeOperation;
  /** 变更的数据（JSONB） */
  value: Record<string, any>;
  /** 写入ID（用于 rebasing） */
  write_id: string;
  /** 事务ID */
  transaction_id: string;
};

/**
 * 类型安全的变更记录（客户端类型）
 * 在客户端使用，确保表名类型安全
 */
export type TypedChangeRecord<T extends keyof DB = keyof DB> = {
  /** 变更ID（自增） */
  id: number;
  /** 表名（类型安全） */
  table_name: T;
  /** 操作类型 */
  operation: ChangeOperation;
  /** 变更的数据 */
  value: Record<string, any>;
  /** 写入ID（用于 rebasing） */
  write_id: string;
  /** 事务ID */
  transaction_id: string;
};

/**
 * 事务记录类型
 * 将多个变更按事务分组
 */
export type TransactionRecord = {
  /** 事务ID（可选，用于分组） */
  id?: string;
  /** 变更列表 */
  changes: ChangeRecord[];
};

/**
 * 同步请求体类型
 * 客户端发送到服务端的数据格式
 */
export type SyncRequestBody = TransactionRecord[];

/**
 * 同步结果类型
 */
export type SyncResult = "accepted" | "rejected" | "retry";

/**
 * 类型守卫：检查表名是否有效
 */
export function isValidTableName(tableName: string, validTables: readonly string[]): tableName is keyof DB {
  return validTables.includes(tableName);
}

