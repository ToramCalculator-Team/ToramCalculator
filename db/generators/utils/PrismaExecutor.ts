/**
 * @file PrismaExecutor.ts
 * @description Prisma 命令执行器
 * 统一管理 Prisma 相关命令的执行
 * @version 1.0.0
 */

import { CommandUtils, LogUtils } from "./common";
import { PATHS } from "./config";

/**
 * Prisma 命令执行器
 * 提供常用的 Prisma 命令执行方法
 */
export class PrismaExecutor {
  /**
   * 生成 Kysely 类型
   */
  static generateKyselyTypes(): void {
    LogUtils.logStep("TypeScript生成", "生成 TypeScript 类型");
    CommandUtils.execCommand(`prisma generate --schema=${PATHS.clientDB.tempSchema} --generator=kysely`);
    LogUtils.logSuccess("Kysely 类型生成完成！");
  }

  /**
   * 生成 Zod 类型
   */
  static generateZodTypes(): void {
    CommandUtils.execCommand(`prisma generate --schema=${PATHS.clientDB.tempSchema} --generator=zod`);
  }

  /**
   * 生成 SQL 迁移脚本
   */
  static generateMigrationScript(fromSchema: string, toSchema: string, outputPath: string): void {
    CommandUtils.execCommand(
      `npx prisma migrate diff --from-empty --to-schema-datamodel ${toSchema} --script > ${outputPath}`
    );
  }

  /**
   * 生成服务器端 SQL
   */
  static generateServerSQL(tempSchema: string): void {
    this.generateMigrationScript("", tempSchema, PATHS.serverDB.sql);
  }

  /**
   * 生成客户端 SQL
   */
  static generateClientSQL(tempSchema: string): void {
    this.generateMigrationScript("", tempSchema, PATHS.clientDB.sql);
  }
}
