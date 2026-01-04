import type { NestedSchema } from "../Member/runtime/StatContainer/SchemaTypes";

/**
 * 表达式/脚本执行基础上下文
 *
 * 说明：
 * - JSProcessor 只负责“编译”，但引擎与行为树需要一个统一的运行时上下文类型
 * - 该类型不做强约束（允许扩展字段），仅提供最小公共字段集合
 */
export interface ExpressionContext {
	/** 当前帧号（必填，用于基于帧的逻辑判断） */
	currentFrame: number;
	/** 施法者成员ID（通常等于 self.id） */
	casterId: string;
	/** 目标成员ID（可选） */
	targetId?: string;
	/** 技能等级（可选，用于技能表达式） */
	skillLv?: number;
	/** 环境变量（如天气、地形等） */
	environment?: unknown;
	/** 其他自定义变量 */
	[key: string]: unknown;
}

/**
 * 表达式转换选项
 */
export interface TransformExpressionOptions {
	/** 要替换的访问器类型：self 或 target */
	replaceAccessor: "self" | "target";
	/** 值提供函数：根据路径 key（如 "mainWeapon.range"）返回数值 */
	valueProvider: (key: string) => number | boolean;
	/** Schema 定义（可选，用于验证路径存在） */
	schema?: NestedSchema;
}

/**
 * 表达式求值选项
 */
export interface EvaluateExpressionOptions {
	/**
	 * 缓存作用域 key
	 *
	 * 说明：
	 * - 带 self/target 的表达式会使用 schema 校验，因此建议传入 memberId/targetId 等作用域信息
	 * - 用于区分不同上下文，避免缓存混淆（例如：不同成员的 self.xxx 不应共享缓存）
	 * - 纯表达式（无 self/target）使用 "global" 作用域
	 */
	cacheScope?: string;
	/**
	 * Schema 定义（可选，用于验证路径存在）
	 *
	 * 说明：
	 * - self.xxx 使用 selfSchema 校验
	 * - target.xxx 使用 targetSchema 校验
	 * - 如果路径不存在于对应 schema，编译会失败并返回错误
	 */
	schemas?: {
		self?: NestedSchema;
		target?: NestedSchema;
	};
}

/**
 * 表达式转换结果
 */
export interface TransformExpressionResult {
	/** 是否成功 */
	success: boolean;
	/** 替换后的表达式字符串 */
	compiledExpression: string;
	/** 被识别到的依赖路径列表 */
	dependencies: string[];
	/** 错误信息 */
	error?: string;
	/** 警告信息 */
	warnings?: string[];
}

/**
 * 表达式求值结果
 */
export interface EvaluateExpressionResult {
	/** 是否成功 */
	success: boolean;
	/** 计算结果（number 或 boolean） */
	result?: number | boolean;
	/** 错误信息 */
	error?: string;
}
