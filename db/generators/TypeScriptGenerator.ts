/**
 * TypeScript 类型生成器
 * 负责生成 Kysely 类型定义
 */

import { PrismaExecutor } from "./utils/PrismaExecutor";
import { LogUtils } from "./utils/common";

export class TypeScriptGenerator {
  /**
   * 生成所有 TypeScript 相关类型
   */
  static generate(): void {
    LogUtils.logStep("TypeScript 生成", "开始生成 TypeScript 类型...");
    
    LogUtils.logInfo("生成 Kysely 类型...");
    PrismaExecutor.generateKyselyTypes();
    
    LogUtils.logSuccess("TypeScript 生成完成");
  }
}

