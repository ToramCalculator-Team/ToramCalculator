/**
 * TypeScript 类型生成器
 * 负责生成 Kysely 类型定义
 */

import { PrismaExecutor } from "./utils/PrismaExecutor";

export class TypeScriptGenerator {
  /**
   * 生成所有 TypeScript 相关类型
   */
  static generate(): void {
    PrismaExecutor.generateKyselyTypes();
  }
}

