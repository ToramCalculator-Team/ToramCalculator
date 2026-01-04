import { ExpressionTransformer } from "./ExpressionTransformer";
import type {
	EvaluateExpressionOptions,
	EvaluateExpressionResult,
	ExpressionContext,
	TransformExpressionOptions,
	TransformExpressionResult,
} from "./types";

/**
 * JS 表达式处理器（单行表达式）
 *
 * 设计目标：
 * - 下放“是否需要编译/替换”的判断：调用方只管给表达式与运行时上下文
 * - 彻底移除正则解析（SchemaPathResolver），统一使用 AST（acorn）驱动转换
 * - 清晰分层：transform（字面量替换） 与 evaluate（编译/执行）两类 API
 */
export class JSProcessor {
	/** Runner 缓存最大容量（FIFO 淘汰） */
	private static readonly RUNNER_CACHE_MAX_SIZE = 6000;
	/** 缓存键版本号（规则变更时自动失效） */
	private static readonly CACHE_KEY_VERSION = 1;

	/**
	 * Runner 缓存
	 *
	 * 说明：
	 * - key: 由表达式内容 + scope 生成的缓存键
	 * - value: 编译后的可执行函数（runner）
	 * - 使用 Map 维持插入顺序，便于 FIFO 淘汰
	 */
	private readonly runnerCache: Map<
		string,
		{
			runner: (ctx: ExpressionContext) => unknown;
		}
	> = new Map();

	/**
	 * 缓存统计信息
	 *
	 * 说明：用于监控缓存命中率，便于性能调优
	 */
	private readonly cacheStats = {
		hits: 0,
		misses: 0,
	};

	/**
	 * 通用替换（不执行）：
	 * - 分布式伤害计算中使用：施法者替换 self，受击者替换 target
	 */
	transformExpression(
		expression: string,
		options: TransformExpressionOptions,
	): TransformExpressionResult {
		return ExpressionTransformer.transform(expression, options);
	}

	/**
	 * 计算表达式（编译 + 执行）：
	 * - 如果表达式包含 self./target. 访问，则先 AST 重写为 getValue 调用
	 * - 对“纯表达式”直接执行
	 *
	 * 约定：
	 * - 调用方需保证 ctx 中存在 self/target（通过 with(ctx) 暴露）：
	 *   - ctx.self: Member
	 *   - ctx.target: Member（可选）
	 */
	evaluateNumberOrBoolean(
		expression: string,
		ctx: ExpressionContext,
		options?: EvaluateExpressionOptions,
	): EvaluateExpressionResult {
		try {
			const hasAccessor = /(self|target)\./.test(expression);
			const cacheScope = options?.cacheScope ?? "-";

			let expressionToRun = expression;
			if (hasAccessor) {
				const compiled = ExpressionTransformer.transformToGetValue(expression, {
					schemas: options?.schemas,
				});
				if (!compiled.success) {
					return {
						success: false,
						error: compiled.error ?? "表达式编译失败",
					};
				}
				expressionToRun = compiled.compiledExpression;
			}

			const cacheKey = this.generateRunnerCacheKey(
				expressionToRun,
				hasAccessor ? cacheScope : "global",
			);

			let runner = this.runnerCache.get(cacheKey)?.runner;
			if (!runner) {
				this.cacheStats.misses += 1;
				runner = this.createRunner(expressionToRun);
				this.runnerCache.set(cacheKey, { runner });
				this.evictRunnerCacheIfNeeded();
			} else {
				this.cacheStats.hits += 1;
			}

			const result = runner(ctx);
			if (typeof result === "number" || typeof result === "boolean") {
				return { success: true, result };
			}

			// 类型转换：允许字符串形式的数字/布尔值（兼容旧数据源或某些边界情况）
			if (typeof result === "string") {
				const num = Number(result);
				if (!Number.isNaN(num)) {
					return { success: true, result: num };
				}
				if (result === "true" || result === "false") {
					return { success: true, result: result === "true" };
				}
			}

			return {
				success: false,
				error: `表达式执行结果不是数字或布尔值: ${typeof result}`,
			};
		} catch (error) {
			return {
				success: false,
				error: `表达式求值失败: ${error instanceof Error ? error.message : "Unknown error"}`,
			};
		}
	}

	/**
	 * 获取缓存统计信息
	 *
	 * @returns 缓存大小、命中次数、未命中次数
	 */
	getCacheStats(): { cacheSize: number; hits: number; misses: number } {
		return {
			cacheSize: this.runnerCache.size,
			hits: this.cacheStats.hits,
			misses: this.cacheStats.misses,
		};
	}

	/**
	 * 清空所有缓存
	 *
	 * 说明：清空 runner 缓存并重置统计信息，用于调试或内存管理
	 */
	clearCache(): void {
		this.runnerCache.clear();
		this.cacheStats.hits = 0;
		this.cacheStats.misses = 0;
	}

	/**
	 * 创建表达式执行函数（runner）
	 *
	 * @param expression 已编译的表达式字符串（可以是纯表达式或包含 getValue 调用）
	 * @returns 可执行的 runner 函数
	 *
	 * 说明：
	 * - 使用 `with (ctx)` 将上下文字段暴露为局部变量
	 * - 表达式要求为单行，并能在 with 作用域下运行
	 * - 通过 `new Function` 在 Worker 沙盒中安全执行
	 */
	private createRunner(
		expression: string,
	): (ctx: ExpressionContext) => unknown {
		const wrappedCode = `with (ctx) { return ${expression}; }`;
		return new Function("ctx", wrappedCode) as (
			ctx: ExpressionContext,
		) => unknown;
	}

	/**
	 * 生成 runner 缓存键
	 *
	 * @param expression 表达式字符串
	 * @param scope 缓存作用域（用于区分不同 memberId/targetId 组合）
	 * @returns 缓存键字符串
	 *
	 * 说明：
	 * - 包含版本号，规则变更时自动失效
	 * - scope 用于隔离不同上下文（避免 self/target 混淆）
	 */
	private generateRunnerCacheKey(expression: string, scope: string): string {
		return `runner_${JSProcessor.CACHE_KEY_VERSION}_${scope}_${this.simpleHash(expression)}`;
	}

	/**
	 * 按需淘汰 runner 缓存（FIFO 策略）
	 *
	 * 说明：
	 * - 当缓存大小超过阈值时，删除最早插入的条目
	 * - Map 维持插入顺序，简单高效
	 */
	private evictRunnerCacheIfNeeded(): void {
		if (this.runnerCache.size <= JSProcessor.RUNNER_CACHE_MAX_SIZE) {
			return;
		}
		const firstKey = this.runnerCache.keys().next().value as string | undefined;
		if (firstKey) {
			this.runnerCache.delete(firstKey);
		}
	}

	/**
	 * 简单哈希函数（用于生成缓存键）
	 *
	 * @param str 输入字符串
	 * @returns 36 进制哈希值
	 *
	 * 说明：
	 * - 使用简单的字符串哈希算法（djb2 变种）
	 * - 转换为 36 进制以缩短键长度
	 */
	private simpleHash(str: string): string {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32bit integer
		}
		return Math.abs(hash).toString(36);
	}
}


