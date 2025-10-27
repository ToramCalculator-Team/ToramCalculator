/**
 * @file DMMFProvider.ts
 * @description DMMF 提供器
 * 负责提供 DMMF 对象
 * @version 1.0.0
 */

import { LogUtils } from "../utils/common.js";

/**
 * DMMF 提供器类
 * 负责从完整的 Prisma schema 生成 DMMF 对象
 */
export class DMMFProvider {
  private schema: string;
  private dmmf: any | null = null;

  constructor(schema: string) {
    this.schema = schema;
  }

  /**
   * 获取 DMMF 对象
   * @returns DMMF 对象
   */
  async getDMMF(): Promise<any> {
    if (this.dmmf) {
      return this.dmmf;
    }

    try {
      // 动态导入 CommonJS 模块
      const { getDMMF } = await import('@prisma/internals');
      this.dmmf = await getDMMF({ datamodel: this.schema });
      LogUtils.logSuccess("DMMF 生成完成");
      return this.dmmf;
    } catch (error) {
      LogUtils.logError("DMMF 生成失败", error as Error);
      throw error;
    }
  }
}
