/**
 * @file generateSQL.ts
 * @description SQL 生成器
 * 从 Prisma schema 生成 SQL 初始化脚本，支持同步架构
 *
 * ## 同步架构设计
 *
 * 本生成器实现了 Electric SQL 的 "through-the-db" 同步模式：
 * @see https://electric-sql.com/docs/guides/writes#through-the-db
 *
 * ### 核心设计
 *
 * 每个表被转换为三种数据库对象：
 *
 * 1. **synced 表**（同步的数据，不可变）
 *    - 存储从服务器同步的完整数据
 *    - 包含所有业务列 + `write_id` 用于追踪同步
 *    - 数据只能通过 Electric 复制流更新
 *
 * 2. **local 表**（本地乐观状态）
 *    - 存储本地修改的乐观状态
 *    - 包含业务列（部分可为 NULL）+ 元数据列：
 *      - `changed_columns`: 记录哪些列被修改了（用于视图合并）
 *      - `is_deleted`: 软删除标记
 *      - `write_id`: 用于 rebasing 和清理
 *
 * 3. **视图**（合并读取接口）
 *    - 使用 FULL OUTER JOIN 合并 synced 和 local
 *    - 根据 `changed_columns` 智能选择数据源：
 *      - 主键字段：COALESCE(local, synced)
 *      - 其他字段：如果在 `changed_columns` 中，使用 local，否则使用 synced
 *    - 过滤掉 `is_deleted = TRUE` 的本地删除记录
 *
 * ### 写入流程
 *
 * 通过 INSTEAD OF 触发器拦截对视图的写操作：
 *
 * - **INSERT**: 插入到 local 表，记录到 changes 表
 * - **UPDATE**:
 *   1. 查找 synced 和 local 记录
 *   2. 比较字段变化，更新 `changed_columns`
 *   3. 如果不存在则插入，存在则更新 local 表
 *   4. 记录到 changes 表
 * - **DELETE**:
 *   1. 标记 `is_deleted = TRUE` 或插入删除标记
 *   2. 记录到 changes 表
 *
 * ### 同步流程
 *
 * 当数据从服务器同步下来：
 *
 * 1. 数据插入到 synced 表
 * 2. Trigger 自动清理 local 表中对应 `write_id` 的记录（匹配成功）
 * 3. 视图自动显示新数据（local 已被清理）
 *
 * 如果是并发修改（local 仍存在其他 `write_id` 的记录）：
 * - local 记录保留，视图优先显示 local 数据
 * - 等待新的变更触发 rebasing
 *
 * ### Changes 表
 *
 * `changes` 表记录所有本地写操作：
 * - `table_name`: 表名
 * - `operation`: 操作类型（insert/update/delete）
 * - `value`: JSONB 数据
 * - `write_id`: 关联的 write ID
 * - `transaction_id`: 事务 ID
 *
 * Changes 表通过 NOTIFY 触发后台同步进程，将本地变更发送到服务器。
 *
 * ### 关键特性
 *
 * - ✅ 支持离线写操作
 * - ✅ 自动合并 synced 和 local 状态
 * - ✅ 支持 rebasing：通过 `write_id` 匹配清理已同步的本地变更
 * - ✅ 软删除：`is_deleted` 标记
 * - ✅ 变更追踪：`changed_columns` 记录修改的字段
 * - ✅ 多表支持：自动为所有表生成同步架构
 * - ✅ 多列主键支持：正确处理复合主键
 *
 * ### 参考
 *
 * - Electric SQL 文档: https://electric-sql.com/docs/guides/writes#through-the-db
 * - 示例实现: https://github.com/electric-sql/electric/tree/main/examples/write-patterns/patterns/4-through-the-db
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { PATHS } from "../config";
import { writeFileSafely } from "../utils/writeFileSafely";

export interface TableStructure {
	tableName: string;
	columns: string[];
	constraints: string[];
}

export class ClientSyncSqlFactory {
	extractTableBlock(clientSql: string, tableName: string): string {
		const marker = `-- ${tableName}`;
		const start = clientSql.startsWith(`${marker}\n`)
			? 0
			: clientSql.indexOf(`\n${marker}\n`) >= 0
				? clientSql.indexOf(`\n${marker}\n`) + 1
				: -1;
		if (start < 0) {
			throw new Error(`无法在 generated client.sql 中找到客户端表结构: ${tableName}`);
		}

		const next = clientSql.indexOf("\n-- ", start + marker.length + 1);
		return clientSql.slice(start, next < 0 ? undefined : next).trim();
	}

	extractViewAndTriggers(clientSql: string, tableName: string): string {
		const tableBlock = this.extractTableBlock(clientSql, tableName);
		const viewStart = tableBlock.indexOf(`CREATE OR REPLACE VIEW "${tableName}"`);
		if (viewStart < 0) {
			throw new Error(`无法在 generated client.sql 中找到 view/trigger 结构: ${tableName}`);
		}
		return tableBlock.slice(viewStart).trim();
	}

	generateDropViewAndTriggers(tableName: string): string {
		return [
			`DROP VIEW IF EXISTS "${tableName}" CASCADE;`,
			`DROP FUNCTION IF EXISTS ${tableName}_insert_trigger() CASCADE;`,
			`DROP FUNCTION IF EXISTS ${tableName}_update_trigger() CASCADE;`,
			`DROP FUNCTION IF EXISTS ${tableName}_delete_trigger() CASCADE;`,
		].join("\n");
	}

	generateDropClientTableObjects(tableName: string): string {
		return [
			this.generateDropViewAndTriggers(tableName),
			`DROP TABLE IF EXISTS "${tableName}_local" CASCADE;`,
			`DROP TABLE IF EXISTS "${tableName}_synced" CASCADE;`,
		].join("\n");
	}
}

/**
 * SQL 生成器
 */
export class SQLGenerator {
	// 基础设施表：不参与任何同步改造（既不注入 write_id，也不展开三件套）。
	// 服务端与客户端两条派生路径共用此判定，避免各自维护一份跳过清单。
	//   changes            = 本地上行变更日志（客户端手动追加）
	//   _prisma_migrations = 迁移账本
	private static readonly NON_SYNC_TABLES = new Set(["changes", "_prisma_migrations"]);

	private tempSchemaPath: string;
	private outputDir: string;
	private tempPrismaConfigPath: string;
	private readonly migrateDiffDatabaseUrlFallback = "postgresql://user:pass@localhost:5432/db?schema=public";

	constructor(outputDir: string) {
		this.outputDir = outputDir;
		// 使用与主生成器相同的临时文件路径
		this.tempSchemaPath = PATHS.tempSchema;
		this.tempPrismaConfigPath = path.join(outputDir, "prisma.config.ts");
	}

	/**
	 * 生成 SQL 文件
	 */
	async generate(schemaContent: string): Promise<void> {
		try {
			console.log("生成 SQL 初始化脚本...");

			// 1. 写入临时 schema 文件
			await this.writeTempSchema(schemaContent);

			// 1.1 写入临时 Prisma config（Prisma 7+ datasource url 不再写在 schema 中）
			await this.writeTempPrismaConfig();

			// 2. 一次 diff 得到基础 SQL（纯业务 DDL，无同步改造）
			const baseSQL = this.generateServerSQL();

			// 3. 从同一份基础 SQL 派生两侧产物：
			//    - 服务端：业务表注入 write_id（收敛环的服务端半边，见 ADR 0018）
			//    - 客户端：业务表展开为 synced/local/view 三件套 + 触发器
			//    两条路径共用分块与 isSyncableTable 判定，不各自维护跳过清单。
			const serverSQL = this.buildServerSql(baseSQL);
			const clientSQL = this.buildClientSql(baseSQL);

			// 4. 写入输出文件
			const serverSQLPath = path.join(this.outputDir, "server.sql");
			const clientSQLPath = path.join(this.outputDir, "client.sql");

			await writeFileSafely(serverSQLPath, serverSQL);
			await writeFileSafely(clientSQLPath, clientSQL);

			// 5. 修复关系表名称
			this.fixRelationTableNames(schemaContent);

			console.log("SQL 初始化脚本生成完成");
		} catch (error) {
			console.error("SQL 初始化脚本生成失败:", error);
			throw error;
		} finally {
			// 清理临时 Prisma config（schema 的清理由主生成器负责）
			try {
				if (fs.existsSync(this.tempPrismaConfigPath)) {
					fs.unlinkSync(this.tempPrismaConfigPath);
				}
			} catch {
				// 忽略清理失败
			}
		}
	}

	/**
	 * 写入临时 schema 文件
	 */
	private async writeTempSchema(schemaContent: string): Promise<void> {
		await writeFileSafely(this.tempSchemaPath, schemaContent);
	}

	/**
	 * 写入临时 Prisma config（用于 Prisma 7+ 的 Migrate/Diff）
	 */
	private async writeTempPrismaConfig(): Promise<void> {
		const content = `import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: ${JSON.stringify(this.tempSchemaPath)},
  datasource: {
    url: env("DATABASE_URL"),
  },
});
`;
		await writeFileSafely(this.tempPrismaConfigPath, content);
	}

	/**
	 * 生成服务端 SQL
	 */
	private generateServerSQL(): string {
		console.log("生成服务端 SQL...");
		try {
			// 确保临时 schema 文件存在
			if (!fs.existsSync(this.tempSchemaPath)) {
				throw new Error(`临时 schema 文件不存在: ${this.tempSchemaPath}`);
			}

			// 用本地已安装的 prisma bin，而非 `npx --yes prisma`：
			// npx --yes 每次会向 npm registry 联网校验/可能拉包，网络不稳时会长时间挂起
			// （见排障记录：D 状态卡在 registry/checkpoint 请求）。本地 bin 离线可用、更快更稳。
			const prismaBin = this.resolvePrismaBin();
			const command = `${prismaBin} migrate diff --from-empty --to-schema ${this.tempSchemaPath} --script --config ${this.tempPrismaConfigPath}`;
			console.log(`执行命令: ${command}`);

			const sql = execSync(command, {
				encoding: "utf-8",
				cwd: process.cwd(),
				env: {
					...process.env,
					// Prisma 7 的 Migrate/Diff 会校验 URL 格式（即使不连接 DB）
					// 这里提供一个兜底值，避免因未配置/格式不正确导致生成空 SQL
					DATABASE_URL: process.env.DATABASE_URL || this.migrateDiffDatabaseUrlFallback,
					// 禁用 Prisma 遥测（checkpoint.prisma.io）：该端点在网络不稳时会拖慢/挂起 CLI 启动。
					CHECKPOINT_DISABLE: "1",
				},
				stdio: "pipe",
			});

			if (sql.trim().length === 0) {
				throw new Error("Prisma migrate diff 输出为空（请检查 DATABASE_URL 是否配置正确）");
			}

			console.log("服务端 SQL 生成成功");
			return sql;
		} catch (error) {
			console.warn("⚠️  服务端 SQL 生成失败，使用默认 SQL:", error);
			return this.getDefaultSQL();
		}
	}

	/**
	 * 解析本地 prisma 可执行文件路径（node_modules/.bin/prisma）。
	 * 用引号包裹以兼容路径中的空格；找不到时回退到 PATH 上的 `prisma`（仍不走 npx）。
	 */
	private resolvePrismaBin(): string {
		const binName = process.platform === "win32" ? "prisma.cmd" : "prisma";
		const localBin = path.join(process.cwd(), "node_modules", ".bin", binName);
		return fs.existsSync(localBin) ? JSON.stringify(localBin) : "prisma";
	}

	/**
	 * 是否为需要同步改造的业务表。
	 * 服务端（注入 write_id）与客户端（展开三件套）两条派生路径共用此判定，
	 * 保证「哪些表参与同步」只有一处真相。
	 */
	private isSyncableTable(tableName: string): boolean {
		return !SQLGenerator.NON_SYNC_TABLES.has(tableName.toLowerCase());
	}

	/**
	 * 通用分块映射：把一段 SQL 拆成块，对每个 CREATE TABLE 块调用 transformTable，
	 * 其余块原样保留。server/client 两侧共用同一套分块与业务表识别逻辑。
	 *
	 * @param transformTable 对可同步业务表的结构做转换；返回替换该块的 SQL。
	 *   基础设施表（!isSyncableTable）不会进入此回调，由调用方决定如何原样保留。
	 */
	private mapTableBlocks(
		sql: string,
		transformTable: (parsed: TableStructure, originalBlock: string) => string,
	): string {
		// 匹配完整的 SQL 块（包括注释）
		const blocks = sql
			.split(/(?=^--|^CREATE\s|^ALTER\s|^DROP\s)/gim)
			.map((block) => block.trim())
			.filter(Boolean);

		const output: string[] = [];

		for (const block of blocks) {
			if (!/^CREATE\s+TABLE/i.test(block)) {
				output.push(block);
				continue;
			}

			const parsed = this.parseCreateTable(block);
			if (!parsed) {
				output.push(`-- ⚠️ 无法解析的表定义保留如下：\n${block}`);
				continue;
			}

			// 基础设施表（changes / 迁移账本）不做任何同步改造，原样保留。
			if (!this.isSyncableTable(parsed.tableName)) {
				output.push(block);
				continue;
			}

			output.push(transformTable(parsed, block));
		}

		return output.join("\n");
	}

	/**
	 * 构建服务端 SQL：基础 DDL + 每张业务表注入 write_id 列（收敛环服务端半边）。
	 *
	 * write_id 由 Electric 逻辑复制回灌到客户端 <t>_synced，客户端清理触发器
	 * 按 write_id 匹配删除本地乐观覆盖行，完成 rebasing 收敛。见 ADR 0018。
	 */
	private buildServerSql(baseSQL: string): string {
		console.log("生成服务端 SQL（注入 write_id）...");
		try {
			return this.mapTableBlocks(baseSQL, (parsed, originalBlock) => this.injectWriteIdColumn(parsed, originalBlock));
		} catch (error) {
			console.warn("⚠️  服务端 SQL 注入 write_id 失败，回退基础 SQL:", error);
			return baseSQL;
		}
	}

	/**
	 * 在服务端 CREATE TABLE 块的最后一个业务列后插入 "write_id" UUID（可空）。
	 * 只改动列区，保留原始约束/主键/格式，避免重写整块引入格式漂移。
	 */
	private injectWriteIdColumn(parsed: TableStructure, originalBlock: string): string {
		// 已存在则幂等跳过（防止重复运行注入两次）
		if (/"write_id"\s+UUID/i.test(originalBlock)) {
			return originalBlock;
		}

		// 在最后一个业务列定义后追加 write_id。业务列与约束之间通常有空行，
		// 定位到最后一个业务列所在行，在其后插入。
		const lastColumn = parsed.columns.at(-1);
		if (!lastColumn) {
			return originalBlock;
		}

		// 定位最后一个业务列所在行，在其后插入 write_id。
		// 该列行尾可能带逗号（后有约束/其它列）或不带（无约束表的末列），两种都要处理：
		//   带逗号  → 在逗号后追加新列行（新列自带逗号，若其后无约束则下方 pkless 分支不适用）
		//   不带逗号 → 需给原末列补逗号，再追加 write_id（且 write_id 成为新的无逗号末列）
		const columnName = lastColumn.split(/\s+/, 1)[0].replace(/^"|"$/g, "");
		const withComma = new RegExp(`("${columnName}"[^\\n]*,)`);
		if (withComma.test(originalBlock)) {
			return originalBlock.replace(withComma, `$1\n    "write_id" UUID,`);
		}
		// 无逗号末列（无约束表）：给原列补逗号并把 write_id 作为新末列（不带逗号）。
		const noComma = new RegExp(`("${columnName}"[^\\n]*?)(\\s*)$`, "m");
		if (noComma.test(originalBlock)) {
			return originalBlock.replace(noComma, `$1,\n    "write_id" UUID$2`);
		}
		// 兜底：无法定位则不注入，保留原块并告警（不静默吞掉表）。
		console.warn(`⚠️  无法在表 ${parsed.tableName} 定位列 ${columnName} 以注入 write_id，跳过该表`);
		return originalBlock;
	}

	/**
	 * 构建客户端 SQL：删除外键/索引 → 每张业务表展开为 synced/local/view 三件套 + 触发器，
	 * 末尾追加 changes 变更日志表。
	 */
	private buildClientSql(baseSQL: string): string {
		console.log("生成客户端 SQL（展开同步三件套）...");
		try {
			// 删除外键约束和索引（客户端 synced/local 不需要）
			let content = baseSQL;
			content = content.replace(/ALTER TABLE .* FOREIGN KEY.*;\n?/g, "");
			content = content.replace(/-- AddForeignKey\s*\n?/g, "");
			content = content.replace(/CREATE INDEX.*;\n?/g, "");
			content = content.replace(/CREATE UNIQUE INDEX.*;\n?/g, "");
			content = content.replace(/-- CreateIndex\s*\n?/g, "");

			const transformed = this.mapTableBlocks(content, (parsed) =>
				[
					`-- ${parsed.tableName}`,
					this.generateSyncedTable(parsed),
					this.generateLocalTable(parsed),
					this.generateView(parsed),
				].join("\n"),
			);

			console.log("客户端 SQL 生成成功");
			return `${transformed}\n${this.buildChangesTable()}`;
		} catch (error) {
			console.warn("⚠️  客户端 SQL 生成失败，使用默认 SQL:", error);
			return this.getDefaultClientSQL();
		}
	}

	/**
	 * 客户端本地上行变更日志表 + NOTIFY 触发器（驱动 ChangeLogSynchronizer）。
	 */
	private buildChangesTable(): string {
		return `CREATE TABLE IF NOT EXISTS changes (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  value JSONB NOT NULL,
  write_id UUID NOT NULL,
  transaction_id XID8 NOT NULL
);

CREATE OR REPLACE FUNCTION changes_notify_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NOTIFY changes;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER changes_notify
AFTER INSERT ON changes
FOR EACH ROW
EXECUTE FUNCTION changes_notify_trigger();
`;
	}

	/**
	 * 从原始 CREATE TABLE 语句中提取结构信息
	 */
	private parseCreateTable(sql: string): TableStructure | null {
		// 兼容诸如：
		// CREATE TABLE "public"."user" ( ... );
		// CREATE TABLE "user" ( ... );
		// CREATE TABLE public.user ( ... );
		const match = sql.match(/CREATE\s+TABLE\s+(?:"?([\w$]+)"?\.)?"?([\w$]+)"?\s*\(([\s\S]+?)\);/i);
		if (!match) return null;
		const [, _schema, rawName, body] = match;
		const tableName = rawName; // 丢弃 schema，使用原始表名
		const lines = body
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter(Boolean);

		const columns: string[] = [];
		const constraints: string[] = [];

		for (const line of lines) {
			if (line.startsWith("CONSTRAINT") || line.startsWith("PRIMARY KEY") || line.startsWith("UNIQUE")) {
				constraints.push(line.replace(/,+$/, ""));
			} else {
				columns.push(line.replace(/,+$/, ""));
			}
		}

		return { tableName, columns, constraints };
	}

	/**
	 * 重命名主键约束
	 */
	private renamePrimaryKeyConstraint(constraints: string[], newName: string): string[] {
		return constraints.map((constraint) => {
			// 兼容无 CONSTRAINT 名称的 PRIMARY KEY 定义
			if (/CONSTRAINT\s+"[^"]*"\s+PRIMARY KEY/i.test(constraint)) {
				return constraint.replace(/CONSTRAINT\s+"[^"]*"\s+PRIMARY KEY/i, `CONSTRAINT "${newName}" PRIMARY KEY`);
			}
			if (/PRIMARY\s+KEY/i.test(constraint)) {
				return constraint.replace(/PRIMARY\s+KEY/i, `CONSTRAINT "${newName}" PRIMARY KEY`);
			}
			return constraint;
		});
	}

	/**
	 * 生成 synced 表结构
	 */
	private generateSyncedTable({ tableName, columns, constraints }: TableStructure): string {
		const renamedConstraints = this.renamePrimaryKeyConstraint(constraints, `${tableName}_synced_pkey`);
		const syncedCols = [...columns, `"write_id" UUID`];
		return `CREATE TABLE IF NOT EXISTS "${tableName}_synced" (\n  ${[...syncedCols, ...renamedConstraints].join(",\n  ")}\n);`;
	}

	/**
	 * 生成 local 表结构
	 */
	private generateLocalTable({ tableName, columns, constraints }: TableStructure): string {
		// 从约束中提取主键字段
		const pkConstraint = constraints.find((c) => c.includes("PRIMARY KEY"));
		const pkCols = pkConstraint
			? pkConstraint
					.match(/PRIMARY KEY\s*\(([^)]+)\)/)?.[1]
					?.split(",")
					.map((s) => s.trim().replace(/"/g, "")) || []
			: [];

		const localCols = columns.map((col) => {
			const [name, type] = col.split(/\s+/, 2);
			// 动态处理主键字段，不硬编码字段名
			if (pkCols.includes(name)) return col; // 保留主键原样
			return `${name} ${type}`;
		});

		const renamedConstraints = this.renamePrimaryKeyConstraint(constraints, `${tableName}_local_pkey`);

		return `CREATE TABLE IF NOT EXISTS "${tableName}_local" (\n  ${[
			...localCols,
			`"changed_columns" TEXT[]`,
			`"is_deleted" BOOLEAN NOT NULL DEFAULT FALSE`,
			`"write_id" UUID NOT NULL`,
			...renamedConstraints,
		].join(",\n  ")}
);`;
	}

	/**
	 * 生成视图
	 */
	private generateView({ tableName, columns, constraints }: TableStructure): string {
		const colNames = columns.map((col) => col.split(/\s+/, 1)[0].replace(/^"|"$/g, ""));

		// 解析主键字段
		const pkConstraint = constraints.find((c) => /PRIMARY\s+KEY/i.test(c));
		const pkCols = pkConstraint
			? pkConstraint
					.match(/\(([^)]+)\)/)?.[1]
					.split(",")
					.map((s) => s.trim().replace(/"/g, "")) || []
			: [];

		// 对于关联表，如果没有主键，使用所有列作为主键
		// 动态检测中间表（没有主键且表名以下划线开头）
		if (pkCols.length === 0 && tableName.startsWith("_")) {
			pkCols.push(...colNames);
		}

		// 如果仍然没有主键，使用 UNION ALL 方式
		if (pkCols.length === 0) {
			return `
CREATE OR REPLACE VIEW "${tableName}" AS
  SELECT
  ${colNames.map((name) => `   synced."${name}" AS "${name}"`).join(",\n")}
  FROM "${tableName}_synced" AS synced
  UNION ALL
  SELECT
  ${colNames.map((name) => `   local."${name}" AS "${name}"`).join(",\n")}
  FROM "${tableName}_local" AS local
  WHERE local."is_deleted" = FALSE;`;
		}

		const selectLines = colNames.map((name) =>
			pkCols.includes(name)
				? `   COALESCE(local."${name}", synced."${name}") AS "${name}"`
				: `   CASE
    WHEN '${name}' = ANY(local.changed_columns)
      THEN local."${name}"
      ELSE synced."${name}"
    END AS "${name}"`,
		);

		const joinCondition = pkCols.length
			? pkCols.map((pk) => `synced."${pk}" = local."${pk}"`).join(" AND ")
			: colNames.map((c) => `synced."${c}" = local."${c}"`).join(" AND ");

		// WHERE 条件：显示纯 synced 记录（local 的列全为 NULL）或未删除的 local 记录
		const pkCol = pkCols.length > 0 ? pkCols[0] : colNames[0];
		const whereCondition = `(local."${pkCol}" IS NULL OR local."is_deleted" = FALSE)`;

		const view = `
CREATE OR REPLACE VIEW "${tableName}" AS
  SELECT
  ${selectLines.join(",\n")}
  FROM "${tableName}_synced" AS synced
  FULL OUTER JOIN "${tableName}_local" AS local
  ON ${joinCondition}
  WHERE ${whereCondition};`;

		// 生成触发器函数和触发器
		const triggers = this.generateTriggers(tableName, colNames, pkCols);

		return `${view}\n${triggers}`;
	}

	/**
	 * 生成触发器函数和触发器
	 */
	private generateTriggers(tableName: string, colNames: string[], pkCols: string[]): string {
		const jsonFields = colNames.map((name) => `'${name}', NEW."${name}"`).join(",\n      ");
		// UPDATE 记录发送的是视图合并后的完整快照。
		// 这里必须保留显式 NULL：NULL 表示清空可空字段，缺少字段才表示不参与本次变更。
		const updateJsonFields = colNames.map((name) => `'${name}', NEW."${name}"`).join(",\n      ");

		const changedColsCheck = colNames
			.filter((c) => !pkCols.includes(c))
			.map(
				(name) => `
    IF NEW."${name}" IS DISTINCT FROM synced."${name}" THEN
      changed_cols := array_append(changed_cols, '${name}');
    END IF;`,
			)
			.join("");

		const triggerFnInsert = `
CREATE OR REPLACE FUNCTION ${tableName}_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "${tableName}_synced" WHERE ${pkCols.map((pk) => `"${pk}" = NEW."${pk}"`).join(" AND ")}) THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "${tableName}_local" WHERE ${pkCols.map((pk) => `"${pk}" = NEW."${pk}"`).join(" AND ")}) THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    ${colNames
			.filter((name) => !pkCols.includes(name))
			.map((name) => `changed_cols := array_append(changed_cols, '${name}');`)
			.join("\n    ")}

    INSERT INTO "${tableName}_local" (
    ${colNames.map((name) => `"${name}"`).join(", ")},
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    ${colNames.map((name) => `NEW."${name}"`).join(", ")},
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '${tableName}',
    'insert',
    jsonb_build_object(
        ${jsonFields}
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;`;

		const updateSetLines =
			colNames
				.filter((c) => !pkCols.includes(c))
				.map(
					(name) =>
						`
    "${name}" = NEW."${name}"`,
				)
				.join(",") || "-- no non-pk fields";

		const triggerFnUpdate = `
CREATE OR REPLACE FUNCTION ${tableName}_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "${tableName}_synced"%ROWTYPE;
    local "${tableName}_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "${tableName}_synced" WHERE ${pkCols.map((pk) => `"${pk}" = NEW."${pk}"`).join(" AND ")};
    SELECT * INTO local FROM "${tableName}_local" WHERE ${pkCols.map((pk) => `"${pk}" = NEW."${pk}"`).join(" AND ")};
    ${changedColsCheck || "-- no non-pk fields to track"}
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "${tableName}_local" (
        ${colNames.map((name) => `"${name}"`).join(", ")},
        changed_columns,
        write_id
    )
    VALUES (
        ${colNames.map((name) => `NEW."${name}"`).join(", ")},
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "${tableName}_local"
    SET
        ${updateSetLines},
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE ${pkCols.map((pk) => `"${pk}" = NEW."${pk}"`).join(" AND ")};
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '${tableName}',
    'update',
    jsonb_build_object(
        ${updateJsonFields}
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;`;

		const triggerFnDelete = `
CREATE OR REPLACE FUNCTION ${tableName}_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "${tableName}_local" WHERE ${pkCols.map((pk) => `"${pk}" = OLD."${pk}"`).join(" AND ")}) THEN
    UPDATE "${tableName}_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE ${pkCols.map((pk) => `"${pk}" = OLD."${pk}"`).join(" AND ")};
    ELSE
    INSERT INTO "${tableName}_local" (
        ${pkCols.map((pk) => `"${pk}"`).join(", ")},
        "is_deleted",
        "write_id"
    )
    VALUES (
        ${pkCols.map((pk) => `OLD."${pk}"`).join(", ")},
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '${tableName}',
    'delete',
    jsonb_build_object(${pkCols.map((pk) => `'${pk}', OLD."${pk}"`).join(", ")}),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;`;

		const triggers = `
CREATE OR REPLACE TRIGGER ${tableName}_insert
INSTEAD OF INSERT ON "${tableName}"
FOR EACH ROW EXECUTE FUNCTION ${tableName}_insert_trigger();

CREATE OR REPLACE TRIGGER ${tableName}_update
INSTEAD OF UPDATE ON "${tableName}"
FOR EACH ROW EXECUTE FUNCTION ${tableName}_update_trigger();

CREATE OR REPLACE TRIGGER ${tableName}_delete
INSTEAD OF DELETE ON "${tableName}"
FOR EACH ROW EXECUTE FUNCTION ${tableName}_delete_trigger();
`;

		const syncedInsertUpdateCleanupFn = `
CREATE OR REPLACE FUNCTION ${tableName}_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "${tableName}_local"
  WHERE ${pkCols.map((pk) => `"${pk}" = NEW."${pk}"`).join(" AND ")}
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`;

		const syncedDeleteCleanupFn = `
CREATE OR REPLACE FUNCTION ${tableName}_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "${tableName}_local"
  WHERE ${pkCols.map((pk) => `"${pk}" = OLD."${pk}"`).join(" AND ")};
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
`;

		const syncedTriggers = `
CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "${tableName}_synced"
FOR EACH ROW EXECUTE FUNCTION ${tableName}_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "${tableName}_synced"
FOR EACH ROW EXECUTE FUNCTION ${tableName}_delete_local_on_synced_delete_trigger();
`;

		return [
			triggerFnInsert,
			triggerFnUpdate,
			triggerFnDelete,
			triggers,
			syncedInsertUpdateCleanupFn,
			syncedDeleteCleanupFn,
			syncedTriggers,
		].join("\n");
	}

	/**
	 * 修复关系表名称
	 */
	private fixRelationTableNames(updatedSchema: string): void {
		console.log("修复关系表名称...");

		// 从 schema 中提取关系表名称（以下划线开头的表）
		const relationTableMatches = updatedSchema.match(/model\s+_\w+/g);
		const relationTables = relationTableMatches ? relationTableMatches.map((match) => match.replace("model ", "")) : [];

		// 修复 SQL 中的表名引用
		const fixTableNames = (sql: string): string => {
			let fixedSql = sql;
			relationTables.forEach((tableName) => {
				// 替换表名引用，确保使用双引号包裹
				const regex = new RegExp(`\\b${tableName.toLowerCase()}\\b`, "g");
				fixedSql = fixedSql.replace(regex, `"${tableName}"`);
			});
			return fixedSql;
		};

		// 读取并修复 SQL 文件
		const serverSqlPath = path.join(this.outputDir, "server.sql");
		const clientSqlPath = path.join(this.outputDir, "client.sql");

		if (fs.existsSync(serverSqlPath)) {
			const serverSql = fs.readFileSync(serverSqlPath, "utf-8");
			fs.writeFileSync(serverSqlPath, fixTableNames(serverSql), "utf-8");
		}

		if (fs.existsSync(clientSqlPath)) {
			const clientSql = fs.readFileSync(clientSqlPath, "utf-8");
			fs.writeFileSync(clientSqlPath, fixTableNames(clientSql), "utf-8");
		}

		console.log("关系表名称修复完成");
	}

	/**
	 * 获取默认 SQL
	 */
	private getDefaultSQL(): string {
		return `-- 默认数据库初始化脚本
-- 请根据实际需要修改此脚本

-- 创建扩展（如果需要）
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建表
-- 这里应该包含所有表的创建语句
-- 请使用 prisma migrate diff 命令生成实际的 SQL
`;
	}

	/**
	 * 获取默认客户端 SQL
	 */
	private getDefaultClientSQL(): string {
		return `-- 默认客户端数据库初始化脚本
-- 这是服务端 SQL 的简化版本
-- 请根据实际需要修改此脚本
`;
	}
}
