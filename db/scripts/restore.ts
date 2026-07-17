/**
 * @file restore.ts
 * @description 从 CSV 文件恢复数据库
 */

import { type ChildProcessWithoutNullStreams, execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { MODEL_METADATA } from "../generated/dmmf-utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.join(__dirname, "../../.env") });

/**
 * 配置接口
 */
interface Config {
	PG_USERNAME: string;
	PG_PASSWORD: string;
	PG_HOST: string;
	PG_PORT: string;
	PG_DBNAME: string;
	PG_CONTAINER_NAME: string;
	BACKUP_DIR: string;
}

/**
 * 环境变量处理结果
 */
interface ProcessedEnvVars {
	[key: string]: string;
}

/**
 * 表导入结果
 */
interface ImportResult {
	importedCount: number;
	skippedCount: number;
	failedTables: ImportFailure[];
}

/**
 * 单表导入失败信息
 */
interface ImportFailure {
	table: string;
	message: string;
}

type TableImportStatus = "imported" | "skipped";

type PsqlProcess = ChildProcessWithoutNullStreams;

/**
 * 格式化 psql 输出，避免长 CSV 错误把终端日志冲掉
 * @param label - 输出来源
 * @param output - 原始输出
 * @returns 可读日志片段
 */
export const formatPsqlOutput = (label: string, output: string): string => {
	const trimmedOutput = output.trim();
	if (!trimmedOutput) {
		return "";
	}

	const maxOutputLength = 4000;
	const formattedOutput =
		trimmedOutput.length > maxOutputLength
			? `${trimmedOutput.slice(0, maxOutputLength)}\n...输出已截断，原始长度 ${trimmedOutput.length} 字符`
			: trimmedOutput;

	return `${label}:\n${formattedOutput}`;
};

/**
 * 生成导入失败摘要
 * @param failedTables - 失败表列表
 * @returns 恢复流程级错误信息
 */
export const formatImportFailureSummary = (failedTables: ImportFailure[]): string => {
	const lines = failedTables.map((failure) => `- ${failure.table}:\n${failure.message}`);

	return `CSV 导入失败：${failedTables.length} 个表未成功导入\n${lines.join("\n")}`;
};

/**
 * 解析环境变量引用
 * @param value - 环境变量值
 * @returns 解析后的值
 */
export const resolveEnvReferences = (value: string): string => {
	if (!value) return value;

	let result = value;
	const maxIterations = 10; // 防止无限循环
	let iterations = 0;

	// 循环解析，直到没有更多的变量引用
	while (result.includes("${") && iterations < maxIterations) {
		result = result.replace(/\$\{([^}]+)\}/g, (match, varName) => {
			return process.env[varName] || match;
		});
		iterations++;
	}

	return result;
};

/**
 * 处理环境变量，解析引用
 * @returns 处理后的环境变量
 */
export const processEnvironmentVariables = (): ProcessedEnvVars => {
	const envVars = [
		"VITE_SERVER_HOST", // 先处理基础变量
		"PG_USERNAME",
		"PG_PASSWORD",
		"PG_HOST",
		"PG_PORT",
		"PG_DBNAME",
		"PG_URL",
		"ELECTRIC_HOST",
		"ELECTRIC_PORT", // 再处理依赖变量
	];

	const processed: ProcessedEnvVars = {};

	envVars.forEach((varName) => {
		const originalValue = process.env[varName];
		if (!originalValue) return;

		const resolvedValue = resolveEnvReferences(originalValue);
		process.env[varName] = resolvedValue;
		processed[varName] = resolvedValue;
		console.log(`环境变量 ${varName}: ${originalValue} -> ${resolvedValue}`);
	});

	return processed;
};

/**
 * 创建配置对象
 * @param processedEnvVars - 处理后的环境变量
 * @returns 配置对象
 */
export const createConfig = (processedEnvVars: ProcessedEnvVars): Config => ({
	PG_USERNAME: processedEnvVars.PG_USERNAME || "",
	PG_PASSWORD: processedEnvVars.PG_PASSWORD || "",
	PG_HOST: processedEnvVars.PG_HOST || "",
	PG_PORT: processedEnvVars.PG_PORT || "",
	PG_DBNAME: processedEnvVars.PG_DBNAME || "",
	PG_CONTAINER_NAME: "toram-calculator-postgres-1",
	BACKUP_DIR: path.join(__dirname, "../backups"),
});

/**
 * 检查是否为本地数据库
 * @param host - 数据库主机
 * @returns 是否为本地数据库
 */
export const isLocalDatabase = (host: string): boolean => {
	return host === "localhost" || host === "127.0.0.1";
};

/**
 * 执行 PostgreSQL 命令
 *
 * SQL 通过 stdin 传给 psql，避免 shell 拼接在错误日志中泄露连接串或重复打印整段验证 SQL。
 * ON_ERROR_STOP 保证约束验证抛出的 SQL 错误能够可靠传递给恢复流程。
 *
 * @param sql - SQL 命令
 * @param config - 配置对象
 * @returns 命令输出
 */
export const execPsql = (sql: string, config: Config): string => {
	const localDatabase = isLocalDatabase(config.PG_HOST);
	const pgUrl = localDatabase
		? `postgresql://${config.PG_USERNAME}:${config.PG_PASSWORD}@/${config.PG_DBNAME}`
		: `postgresql://${config.PG_USERNAME}:${config.PG_PASSWORD}@${config.PG_HOST}:${config.PG_PORT}/${config.PG_DBNAME}`;
	const dockerArgs = localDatabase
		? ["exec", "-i", config.PG_CONTAINER_NAME, "psql", "-v", "ON_ERROR_STOP=1", pgUrl]
		: ["run", "--rm", "-i", "postgres:16-alpine", "psql", "-v", "ON_ERROR_STOP=1", pgUrl];

	try {
		return execFileSync("docker", dockerArgs, {
			encoding: "utf-8",
			input: sql,
			stdio: ["pipe", "pipe", "pipe"],
		});
	} catch (error) {
		const stderr =
			error instanceof Error && "stderr" in error && typeof error.stderr === "string" ? error.stderr.trim() : "";
		throw new Error(stderr || "PostgreSQL 命令执行失败", { cause: error });
	}
};

/**
 * 检查文件是否存在
 * @param filePath - 文件路径
 * @returns 是否存在
 */
export const fileExists = (filePath: string): boolean => {
	return fs.existsSync(filePath);
};

/**
 * 读取 CSV 文件内容
 * @param filePath - 文件路径
 * @returns 文件内容
 */
export const readCsvFile = (filePath: string): string => {
	return fs.readFileSync(filePath, "utf-8");
};

/**
 * 清理表名（移除特殊字符和多余信息，但保留关系表的下划线）
 * @param tableName - 原始表名
 * @returns 清理后的表名
 */
export const cleanTableName = (tableName: string): string => {
	return tableName
		.replace(/^[-]+/, "") // 只移除开头的破折号，保留下划线
		.replace(/[-_]+$/, "") // 移除结尾的破折号和下划线
		.replace(/\s*\(\d+\s+rows?\)\s*$/i, "") // 移除 "(63 rows)" 这样的信息
		.trim();
};

/**
 * 验证配置
 * @param config - 配置对象
 * @throws 如果配置无效
 */
export const validateConfig = (config: Config): void => {
	const requiredEnvVars = ["PG_USERNAME", "PG_PASSWORD", "PG_PORT", "PG_DBNAME"];
	const missingVars = requiredEnvVars.filter((varName) => !config[varName as keyof Config]);

	if (missingVars.length > 0) {
		throw new Error(`缺少必要的环境变量: ${missingVars.join(", ")}`);
	}

	if (!fileExists(config.BACKUP_DIR)) {
		throw new Error(`备份目录不存在: ${config.BACKUP_DIR}`);
	}
};

/**
 * 检查远程数据库操作安全性
 * @param config - 配置对象
 * @returns Promise，如果确认则 resolve
 */
export const checkRemoteDatabaseSafety = (config: Config): Promise<void> => {
	if (!isLocalDatabase(config.PG_HOST)) {
		console.log("\n⚠️  ⚠️  ⚠️  安全警告  ⚠️  ⚠️  ⚠️");
		console.log("🚨 检测到远程数据库操作！");
		console.log(`📍 目标数据库: ${config.PG_HOST}:${config.PG_PORT}/${config.PG_DBNAME}`);
		console.log("✅ 如果确认继续，请输入 'YES' 并按回车");

		// 等待用户确认
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		return new Promise((resolve) => {
			rl.question("\n请输入确认: ", (answer) => {
				rl.close();
				if (answer.trim().toUpperCase() === "YES") {
					console.log("✅ 用户确认，继续执行...");
					resolve();
				} else {
					console.log("❌ 用户取消操作");
					process.exit(0);
				}
			});
		});
	}
	return Promise.resolve();
};

/**
 * 获取稳定的表导入顺序
 *
 * 恢复时每个 \copy 会话都会关闭外键触发器，因此外键图不需要、也不一定能够拓扑排序。
 * 直接使用生成元数据的确定顺序，循环引用统一交给导入后的完整性验证处理。
 * @returns 表名数组
 */
export const getTableOrder = (): string[] => {
	console.log("📌 获取稳定的表导入顺序...");
	const importOrder = MODEL_METADATA.map((model) => model.tableName);

	console.log(`📋 找到 ${importOrder.length} 个表`);
	console.log(`📋 导入顺序: ${importOrder.slice(0, 5).join(" -> ")}${importOrder.length > 5 ? "..." : ""}`);

	return importOrder;
};

/**
 * 创建 psql 子进程
 * @param config - 配置对象
 * @returns psql 子进程
 */
export const createPsqlProcess = (config: Config): PsqlProcess => {
	if (isLocalDatabase(config.PG_HOST)) {
		// 本地数据库：通过 Docker 容器导入
		const pgUrl = `postgresql://${config.PG_USERNAME}:${config.PG_PASSWORD}@/${config.PG_DBNAME}`;

		// ON_ERROR_STOP 让 SQL / \copy 错误转成 psql 非 0 退出码，恢复脚本才能把单表失败升级为流程失败。
		return spawn("docker", ["exec", "-i", config.PG_CONTAINER_NAME, "psql", "-v", "ON_ERROR_STOP=1", pgUrl], {
			stdio: ["pipe", "pipe", "pipe"],
		});
	} else {
		// 远程数据库：使用 Docker 容器中的 psql 连接远程数据库
		const pgUrl = `postgresql://${config.PG_USERNAME}:${config.PG_PASSWORD}@${config.PG_HOST}:${config.PG_PORT}/${config.PG_DBNAME}`;

		return spawn("docker", ["run", "--rm", "-i", "postgres:16-alpine", "psql", "-v", "ON_ERROR_STOP=1", pgUrl], {
			stdio: ["pipe", "pipe", "pipe"],
		});
	}
};

/**
 * 导入单个 CSV 文件
 * @param table - 表名
 * @param csvFile - CSV 文件路径
 * @param config - 配置对象
 * @returns Promise，返回导入状态；空 CSV 被视为跳过
 */
export const importSingleCsvFile = (table: string, csvFile: string, config: Config): Promise<TableImportStatus> => {
	return new Promise((resolve, reject) => {
		console.log(`⬆️ 正在导入表: ${table}...`);

		try {
			const csvContent = readCsvFile(csvFile);

			// 检查 CSV 文件是否只有表头（空数据）
			const lines = csvContent.trim().split("\n");
			if (lines.length <= 1) {
				console.log(`⬆️ 跳过: ${table} (CSV 文件为空)`);
				resolve("skipped");
				return;
			}

			const child = createPsqlProcess(config);
			if (!child.stdin) {
				reject(new Error("无法写入 psql 标准输入"));
				return;
			}

			let stdout = "";
			let stderr = "";
			let stdinError: Error | undefined;

			// 保留 psql 原始输出，导入失败时能定位到具体约束、列或 CSV 行。
			child.stdout.on("data", (chunk) => {
				stdout += chunk.toString();
			});
			child.stderr.on("data", (chunk) => {
				stderr += chunk.toString();
			});
			child.stdin.on("error", (error) => {
				stdinError = error;
			});

			// 发送 SQL 命令和 CSV 数据
			child.stdin.write("SET session_replication_role = 'replica';\n");
			child.stdin.write(`\\copy "${table}" FROM STDIN CSV HEADER;\n`);
			child.stdin.write(csvContent);
			child.stdin.end();

			child.on("close", (code) => {
				if (code === 0 && !stdinError) {
					resolve("imported");
				} else {
					const details = [
						`导入失败，psql 退出码: ${code ?? "unknown"}`,
						stdinError ? `stdin 写入失败: ${stdinError.message}` : "",
						formatPsqlOutput("psql stderr", stderr),
						formatPsqlOutput("psql stdout", stdout),
					].filter(Boolean);

					reject(new Error(details.join("\n")));
				}
			});

			child.on("error", reject);
		} catch (error) {
			reject(error);
		}
	});
};

/**
 * 导入 CSV 文件
 * @param tables - 表名数组
 * @param config - 配置对象
 * @returns Promise<ImportResult> 导入结果
 */
export const importCsvFiles = async (tables: string[], config: Config): Promise<ImportResult> => {
	console.log("📥 按稳定顺序导入 CSV 文件...");

	let importedCount = 0;
	let skippedCount = 0;
	const failedTables: ImportFailure[] = [];

	for (const table of tables) {
		const csvFile = path.join(config.BACKUP_DIR, `${table}.csv`);

		if (fileExists(csvFile)) {
			try {
				const importStatus = await importSingleCsvFile(table, csvFile, config);
				if (importStatus === "imported") {
					importedCount++;
				} else {
					skippedCount++;
				}
			} catch (error) {
				console.error(`❌ 导入表 ${table} 失败:`, (error as Error).message);
				failedTables.push({
					table,
					message: (error as Error).message,
				});
			}
		} else {
			console.log(`⚠️ 跳过: ${table} (未找到 ${csvFile})`);
			skippedCount++;
		}
	}

	console.log(`📊 导入完成: ${importedCount} 个表成功导入, ${skippedCount} 个表跳过, ${failedTables.length} 个表失败`);
	return { importedCount, skippedCount, failedTables };
};

/**
 * 验证恢复后的全部外键引用
 *
 * \copy 会话通过 session_replication_role 跳过了外键触发器，PostgreSQL 不会在会话结束后追溯检查。
 * 因此这里从系统目录读取实际约束并逐一反查悬空引用，同时覆盖普通关系和 Prisma 隐式中间表。
 *
 * @param config - 配置对象
 */
export const validateForeignKeys = (config: Config): void => {
	console.log("🔍 验证外键完整性...");

	const validationSql = `
CREATE TEMP TABLE foreign_key_validation_errors (
	source_schema text NOT NULL,
	source_table text NOT NULL,
	constraint_name text NOT NULL,
	source_columns text NOT NULL,
	target_schema text NOT NULL,
	target_table text NOT NULL,
	target_columns text NOT NULL,
	violation_count bigint NOT NULL
);

DO $validate_foreign_keys$
DECLARE
	foreign_key record;
	all_source_columns_non_null text;
	all_source_columns_null text;
	referencing_row_condition text;
	target_match_condition text;
	source_columns text;
	target_columns text;
	violation_count bigint;
BEGIN
	FOR foreign_key IN
		SELECT
			constraint_entry.conname,
			constraint_entry.conkey,
			constraint_entry.confkey,
			constraint_entry.confmatchtype,
			constraint_entry.conrelid,
			constraint_entry.confrelid,
			source_namespace.nspname AS source_schema,
			source_relation.relname AS source_table,
			target_namespace.nspname AS target_schema,
			target_relation.relname AS target_table
		FROM pg_constraint AS constraint_entry
		JOIN pg_class AS source_relation ON source_relation.oid = constraint_entry.conrelid
		JOIN pg_namespace AS source_namespace ON source_namespace.oid = source_relation.relnamespace
		JOIN pg_class AS target_relation ON target_relation.oid = constraint_entry.confrelid
		JOIN pg_namespace AS target_namespace ON target_namespace.oid = target_relation.relnamespace
		WHERE constraint_entry.contype = 'f'
			AND source_namespace.nspname = current_schema()
		ORDER BY source_relation.relname, constraint_entry.conname
	LOOP
		SELECT
			string_agg(format('source.%I IS NOT NULL', source_column.attname), ' AND ' ORDER BY key_column.position),
			string_agg(format('source.%I IS NULL', source_column.attname), ' AND ' ORDER BY key_column.position),
			string_agg(format('source.%I = target.%I', source_column.attname, target_column.attname), ' AND ' ORDER BY key_column.position),
			string_agg(format('source.%I IS NULL OR source.%I = target.%I', source_column.attname, source_column.attname, target_column.attname), ' AND ' ORDER BY key_column.position),
			string_agg(format('%I', source_column.attname), ', ' ORDER BY key_column.position),
			string_agg(format('%I', target_column.attname), ', ' ORDER BY key_column.position)
		INTO
			all_source_columns_non_null,
			all_source_columns_null,
			target_match_condition,
			referencing_row_condition,
			source_columns,
			target_columns
		FROM unnest(foreign_key.conkey, foreign_key.confkey) WITH ORDINALITY
			AS key_column(source_attribute_number, target_attribute_number, position)
		JOIN pg_attribute AS source_column
			ON source_column.attrelid = foreign_key.conrelid
			AND source_column.attnum = key_column.source_attribute_number
		JOIN pg_attribute AS target_column
			ON target_column.attrelid = foreign_key.confrelid
			AND target_column.attnum = key_column.target_attribute_number;

		IF foreign_key.confmatchtype = 'f' THEN
			referencing_row_condition := format('NOT (%s)', all_source_columns_null);
		ELSIF foreign_key.confmatchtype = 'p' THEN
			target_match_condition := referencing_row_condition;
			referencing_row_condition := format('NOT (%s)', all_source_columns_null);
		ELSE
			referencing_row_condition := all_source_columns_non_null;
		END IF;

		EXECUTE format(
			'SELECT count(*) FROM %I.%I AS source WHERE %s AND NOT EXISTS (SELECT 1 FROM %I.%I AS target WHERE %s)',
			foreign_key.source_schema,
			foreign_key.source_table,
			referencing_row_condition,
			foreign_key.target_schema,
			foreign_key.target_table,
			target_match_condition
		)
		INTO violation_count;

		IF violation_count > 0 THEN
			INSERT INTO foreign_key_validation_errors VALUES (
				foreign_key.source_schema,
				foreign_key.source_table,
				foreign_key.conname,
				source_columns,
				foreign_key.target_schema,
				foreign_key.target_table,
				target_columns,
				violation_count
			);
		END IF;
	END LOOP;
END
$validate_foreign_keys$;

DO $report_foreign_key_errors$
DECLARE
	failed_constraint_count integer;
	error_summary text;
BEGIN
	SELECT
		count(*),
		string_agg(
			format(
				'- %I.%I.%I (%s) -> %I.%I (%s): %s 行悬空引用',
				source_schema,
				source_table,
				constraint_name,
				source_columns,
				target_schema,
				target_table,
				target_columns,
				violation_count
			),
			E'\n'
			ORDER BY source_schema, source_table, constraint_name
		)
	INTO failed_constraint_count, error_summary
	FROM foreign_key_validation_errors;

	IF failed_constraint_count > 0 THEN
		RAISE EXCEPTION USING
			ERRCODE = 'foreign_key_violation',
			MESSAGE = format(E'外键完整性验证失败：%s 个约束存在违规数据\n%s', failed_constraint_count, error_summary);
	END IF;
END
$report_foreign_key_errors$;
`;

	execPsql(validationSql, config);
	console.log("✅ 外键完整性验证通过");
};

/**
 * 验证备份恢复后的机体配置满足当前产品规则。
 *
 * 机体数值范围不是 Prisma schema 能表达的结构约束，因此在权威备份进入开发数据库时集中拒绝非法数据，
 * 避免把数据治理责任分散到每个客户端的升级流程。
 *
 * @param config - 配置对象
 */
export const validateCharacterConfigurations = (config: Config): void => {
	console.log("🔍 验证机体配置...");

	const validationSql = `
DO $validate_character_configurations$
DECLARE
	violation_count bigint;
BEGIN
	SELECT count(*)
	INTO violation_count
	FROM "character"
	WHERE
		"lv" < 1 OR "lv" > 300 OR
		"str" < 1 OR "int" < 1 OR "vit" < 1 OR "agi" < 1 OR "dex" < 1 OR
		("personalityType" = 'None' AND "personalityValue" <> 0) OR
		("personalityType" <> 'None' AND ("personalityValue" < 1 OR "personalityValue" > 255));

	IF violation_count > 0 THEN
		RAISE EXCEPTION USING
			ERRCODE = 'check_violation',
			MESSAGE = format('机体配置验证失败：%s 条非法数据，请修复 db/backups/character.csv', violation_count);
	END IF;
END
$validate_character_configurations$;
`;

	execPsql(validationSql, config);
	console.log("✅ 机体配置验证通过");
};

/**
 * 执行完整的恢复流程
 * @param config - 配置对象
 */
export const restore = async (config: Config): Promise<void> => {
	try {
		console.log("🔄 开始从 CSV 文件恢复数据库...");

		// 0. 安全检查（如果是远程数据库）
		await checkRemoteDatabaseSafety(config);

		// 1. 获取稳定的导入顺序。每个导入会话自行关闭外键触发器，不要求关系图无环。
		const tables = getTableOrder();

		// 2. 按顺序导入 CSV 文件
		const importResult = await importCsvFiles(tables, config);

		if (importResult.failedTables.length > 0) {
			throw new Error(formatImportFailureSummary(importResult.failedTables));
		}

		// 3. 外键触发器不会追溯验证 replica 会话写入的数据，导入完成后必须主动检查。
		validateForeignKeys(config);

		// 4. 产品规则不属于 schema diff，权威备份必须在恢复边界显式验证。
		validateCharacterConfigurations(config);

		console.log("✅ 数据库恢复完成！");
	} catch (error) {
		// 恢复脚本的主要使用场景是定位数据问题；打印 message 可以保留 psql 的多行诊断，避免 stack 把根因挤出视线。
		const message = error instanceof Error ? error.message : String(error);
		console.error(`❌ 数据库恢复失败:\n${message}`);
		process.exit(1);
	}
};

/**
 * 主函数
 */
export const main = async (): Promise<void> => {
	try {
		// 处理环境变量
		const processedEnvVars = processEnvironmentVariables();

		// 创建配置
		const config = createConfig(processedEnvVars);

		// 验证配置
		validateConfig(config);

		// 执行恢复
		await restore(config);
	} catch (error) {
		console.error("❌ 初始化失败:", error);
		process.exit(1);
	}
};

// 如果直接运行此文件，则执行主函数
// NOTE: ESM + tsx 在不同 OS 下对 process.argv[1] / import.meta.url 的格式可能不一致，
// 这里统一转成“规范化后的绝对文件路径”再比较，避免 Windows 上 main() 不触发。
const argv1 = process.argv[1];
let argv1Path = argv1 ?? "";

// process.argv[1] 可能是 file:// URL（或普通路径）。统一都转成本地文件路径。
if (argv1Path.startsWith("file://")) {
	argv1Path = fileURLToPath(argv1Path);
}

const selfPath = path.resolve(__filename);
const normalizedArgv1Path = argv1Path ? path.resolve(argv1Path) : "";

if (normalizedArgv1Path && normalizedArgv1Path === selfPath) {
	main();
}
