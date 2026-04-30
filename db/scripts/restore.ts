/**
 * @file restore.ts
 * @description 从 CSV 文件恢复数据库
 */

import { type ChildProcessByStdio, execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import type { Readable, Writable } from "node:stream";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { MODEL_METADATA, RELATION_METADATA } from "../generated/dmmf-utils.js";

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
}

type PsqlProcess = ChildProcessByStdio<Writable, Readable, Readable>;

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
 * 执行 Docker 命令
 * @param command - 要执行的命令
 * @returns 命令输出
 */
export const execDockerCommand = (command: string): string => {
	try {
		return execSync(command, { encoding: "utf-8" });
	} catch (error) {
		console.error(`命令执行失败: ${command}`, (error as Error).message);
		throw error;
	}
};

/**
 * 执行 PostgreSQL 命令
 * @param sql - SQL 命令
 * @param config - 配置对象
 * @returns 命令输出
 */
export const execPsql = (sql: string, config: Config): string => {
	const escapedSql = sql.replace(/'/g, "'\"'\"'");

	if (isLocalDatabase(config.PG_HOST)) {
		// 本地数据库：通过 Docker 容器连接
		const pgUrl = `postgresql://${config.PG_USERNAME}:${config.PG_PASSWORD}@/${config.PG_DBNAME}`;
		const command = `echo '${escapedSql}' | docker exec -i ${config.PG_CONTAINER_NAME} psql "${pgUrl}"`;
		return execDockerCommand(command);
	} else {
		// 远程数据库：使用 Docker 容器中的 psql 连接远程数据库
		const pgUrl = `postgresql://${config.PG_USERNAME}:${config.PG_PASSWORD}@${config.PG_HOST}:${config.PG_PORT}/${config.PG_DBNAME}`;
		const command = `echo '${escapedSql}' | docker run --rm -i postgres:16-alpine psql "${pgUrl}"`;
		return execDockerCommand(command);
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
 * 禁用外键约束
 * @param config - 配置对象
 */
export const disableForeignKeys = (config: Config): void => {
	console.log("🚫 禁用外键约束...");
	execPsql("SET session_replication_role = 'replica';", config);
};

/**
 * 使用拓扑排序获取表的导入顺序
 * @returns 表名数组
 */
export const getTopologicalOrder = (): string[] => {
	const visited = new Set<string>();
	const visiting = new Set<string>();
	const result: string[] = [];

	// 构建依赖关系映射
	// 只有拥有外键的表才依赖被引用的表
	const dependencyMap = new Map<string, Set<string>>();

	for (const relation of RELATION_METADATA) {
		// 自关联没有表级导入顺序；恢复阶段已禁用外键，行级引用交给数据完整性校验处理。
		if (relation.from === relation.to) {
			continue;
		}
		// ManyToMany 关系不产生直接依赖（通过中间表）
		if (relation.type === "ManyToMany") {
			continue;
		}

		// 只有 from 表有外键时，from 表才依赖 to 表
		// 对于 OneToMany，外键在 to 表中（从 to 的角度看是 ManyToOne），所以这里不处理
		if (relation.fromHasForeignKey && (relation.type === "ManyToOne" || relation.type === "OneToOne")) {
			// from 表有外键，依赖 to 表
			let dependencies = dependencyMap.get(relation.from);
			if (!dependencies) {
				dependencies = new Set();
				dependencyMap.set(relation.from, dependencies);
			}
			dependencies.add(relation.to);
		}
	}

	const visit = (tableName: string): void => {
		if (visiting.has(tableName)) {
			// 提供更详细的错误信息
			const visitingList = Array.from(visiting);
			const dependencies = dependencyMap.get(tableName);
			throw new Error(
				`循环依赖检测到: ${tableName}\n` +
					`当前访问链: ${[...visitingList, tableName].join(" -> ")}\n` +
					`表 ${tableName} 的依赖: ${dependencies ? Array.from(dependencies).join(", ") : "无"}`,
			);
		}
		if (visited.has(tableName)) {
			return;
		}

		visiting.add(tableName);

		// 获取此表的依赖
		const dependencies = dependencyMap.get(tableName);
		if (dependencies) {
			for (const depTable of dependencies) {
				visit(depTable);
			}
		}

		visiting.delete(tableName);
		visited.add(tableName);
		result.push(tableName);
	};

	// 遍历所有表
	for (const model of MODEL_METADATA) {
		visit(model.tableName);
	}

	return result;
};

/**
 * 获取表的正确导入顺序
 * @returns 表名数组
 */
export const getTableOrder = (): string[] => {
	console.log("📌 获取表的正确导入顺序...");

	try {
		// 使用关系元数据中的依赖关系进行拓扑排序
		const importOrder = getTopologicalOrder();

		console.log(`📋 找到 ${importOrder.length} 个表`);
		console.log(`📋 导入顺序: ${importOrder.slice(0, 5).join(" -> ")}${importOrder.length > 5 ? "..." : ""}`);

		return importOrder;
	} catch (error) {
		console.error("获取表顺序失败:", error);
		throw error;
	}
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

		return spawn("docker", ["exec", "-i", config.PG_CONTAINER_NAME, "psql", pgUrl], {
			stdio: ["pipe", "pipe", "pipe"],
		});
	} else {
		// 远程数据库：使用 Docker 容器中的 psql 连接远程数据库
		const pgUrl = `postgresql://${config.PG_USERNAME}:${config.PG_PASSWORD}@${config.PG_HOST}:${config.PG_PORT}/${config.PG_DBNAME}`;

		return spawn("docker", ["run", "--rm", "-i", "postgres:16-alpine", "psql", pgUrl], {
			stdio: ["pipe", "pipe", "pipe"],
		});
	}
};

/**
 * 导入单个 CSV 文件
 * @param table - 表名
 * @param csvFile - CSV 文件路径
 * @param config - 配置对象
 * @returns Promise，导入成功则 resolve
 */
export const importSingleCsvFile = (table: string, csvFile: string, config: Config): Promise<void> => {
	return new Promise((resolve, reject) => {
		console.log(`⬆️ 正在导入表: ${table}...`);

		try {
			const csvContent = readCsvFile(csvFile);

			// 检查 CSV 文件是否只有表头（空数据）
			const lines = csvContent.trim().split("\n");
			if (lines.length <= 1) {
				console.log(`⚠️ 跳过: ${table} (CSV 文件为空)`);
				resolve();
				return;
			}

			const child = createPsqlProcess(config);
			if (!child.stdin) {
				reject(new Error("无法写入 psql 标准输入"));
				return;
			}

			// 发送 SQL 命令和 CSV 数据
			child.stdin.write(`SET session_replication_role = 'replica';\\copy "${table}" FROM STDIN CSV HEADER;\n`);
			child.stdin.write(csvContent);
			child.stdin.end();

			child.on("close", (code) => {
				if (code === 0) {
					resolve();
				} else {
					reject(new Error(`导入失败，退出码: ${code}`));
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
	console.log("📥 按依赖顺序导入 CSV 文件...");

	let importedCount = 0;
	let skippedCount = 0;

	for (const table of tables) {
		const csvFile = path.join(config.BACKUP_DIR, `${table}.csv`);

		if (fileExists(csvFile)) {
			try {
				await importSingleCsvFile(table, csvFile, config);
				importedCount++;
			} catch (error) {
				console.error(`❌ 导入表 ${table} 失败:`, (error as Error).message);
				skippedCount++;
			}
		} else {
			console.log(`⚠️ 跳过: ${table} (未找到 ${csvFile})`);
			skippedCount++;
		}
	}

	console.log(`📊 导入完成: ${importedCount} 个表成功导入, ${skippedCount} 个表跳过`);
	return { importedCount, skippedCount };
};

/**
 * 恢复外键约束
 * @param config - 配置对象
 */
export const restoreForeignKeys = (config: Config): void => {
	console.log("🔄 恢复外键约束...");
	try {
		execPsql("SET session_replication_role = 'origin';", config);
	} catch (error) {
		console.error("⚠️ 恢复外键约束失败，但继续执行:", (error as Error).message);
		// 不抛出错误，让流程继续
	}
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

		// 1. 禁用外键约束
		disableForeignKeys(config);

		// 2. 获取表的正确导入顺序
		const tables = getTableOrder();

		// 3. 按顺序导入 CSV 文件
		await importCsvFiles(tables, config);

		// 4. 恢复外键约束
		restoreForeignKeys(config);

		console.log("✅ 数据库恢复完成！");
	} catch (error) {
		console.error("❌ 数据库恢复失败:", error);
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
