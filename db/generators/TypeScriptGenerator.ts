/**
 * TypeScript 类型生成器
 * 负责生成 Kysely 类型定义
 */

import { PATHS } from "./utils/config";
import { CommandUtils, LogUtils } from "./utils/common";

export class TypeScriptGenerator {
  /**
   * 生成 Kysely 类型
   */
  static generateKyselyTypes(): void {
    CommandUtils.execCommand(`prisma generate --schema=${PATHS.clientDB.tempSchema} --generator=kysely`);
  }

  /**
   * 生成所有 TypeScript 相关类型
   */
  static generate(): void {
    LogUtils.logStep("TypeScript生成", "生成 TypeScript 类型");
    this.generateKyselyTypes();
    LogUtils.logSuccess("Kysely 类型生成完成！");
  }
}

