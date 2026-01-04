/**
 * 表达式转换器 - 基于 AST 的精确替换
 *
 * 核心功能：
 * 1. 使用 acorn 解析单行表达式为 AST
 * 2. 识别 self.xxx / target.xxx 属性访问
 * 3. 将指定访问器替换为数值字面量（用于分布式伤害计算）
 *
 * 设计理念：
 * - AST 驱动：避免正则误判，精确识别属性访问
 * - 字符串切片替换：基于 node.start/end 精确替换，避免误替换
 * - 只做替换，不执行：取值由调用方提供，求值由下游完成
 */

import { type Identifier, type MemberExpression, type Node, parse } from "acorn";
import type { NestedSchema, SchemaAttribute } from "../Member/runtime/StatContainer/SchemaTypes";

export interface TransformOptions {
	/** 要替换的访问器类型：self 或 target */
	replaceAccessor: "self" | "target";
	/** 值提供函数：根据路径 key（如 "mainWeapon.range"）返回数值 */
	valueProvider: (key: string) => number | boolean;
	/** Schema 定义（可选，用于验证路径存在） */
	schema?: NestedSchema;
}

export interface TransformResult {
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

export interface TransformToGetValueOptions {
	/**
	 * Schema 定义（可选，用于验证路径存在）
	 * - self.xxx 使用 selfSchema 校验
	 * - target.xxx 使用 targetSchema 校验
	 */
	schemas?: {
		self?: NestedSchema;
		target?: NestedSchema;
	};
}

/**
 * 表达式转换器
 */
export const ExpressionTransformer = {
	/**
	 * 转换表达式：将指定访问器的属性访问替换为数值字面量
	 *
	 * @param expression 原始表达式字符串
	 * @param options 转换选项
	 * @returns 转换结果
	 */
	transform(expression: string, options: TransformOptions): TransformResult {
		const result: TransformResult = {
			success: false,
			compiledExpression: expression,
			dependencies: [],
			warnings: [],
		};

		try {
			const { ast, sourceOffset } = this.parseExpressionToAst(expression);

			const memberAccesses = this.collectMemberAccesses(ast, expression, sourceOffset);
			const normalized = this.normalizeMemberAccesses(memberAccesses);

			const replacements: Array<{ start: number; end: number; replacement: string }> =
				[];
			const dependencies = new Set<string>();
			const invalidPaths: string[] = [];

			for (const access of normalized) {
				if (access.root !== options.replaceAccessor) {
					continue;
				}
				if (options.schema && !this.pathExistsInSchema(access.key, options.schema)) {
					invalidPaths.push(`${access.root}.${access.key}`);
					continue;
				}

				const value = options.valueProvider(access.key);
				replacements.push({
					start: access.start,
					end: access.end,
					replacement: this.formatValue(value),
				});
				dependencies.add(access.key);
			}

			if (invalidPaths.length > 0) {
				result.error = `无效的属性路径: ${invalidPaths.join(", ")}`;
				return result;
			}

			const compiledExpression = this.applyReplacements(
				expression,
				replacements,
			);

			result.success = true;
			result.compiledExpression = compiledExpression;
			result.dependencies = [...dependencies];
		} catch (error) {
			result.error = `转换失败: ${error instanceof Error ? error.message : "Unknown error"}`;
		}

		return result;
	},

	/**
	 * 转换表达式：将 self.xxx / target.xxx 改写为 *.statContainer.getValue('xxx')
	 *
	 * 说明：
	 * - 不注入 self/target 变量；要求运行时通过 ctx.self/ctx.target 提供变量
	 * - 仅支持静态属性链（不支持 self[a] 这类动态访问）
	 */
	transformToGetValue(
		expression: string,
		options?: TransformToGetValueOptions,
	): TransformResult {
		const result: TransformResult = {
			success: false,
			compiledExpression: expression,
			dependencies: [],
			warnings: [],
		};

		try {
			const { ast, sourceOffset } = this.parseExpressionToAst(expression);
			const memberAccesses = this.collectMemberAccesses(ast, expression, sourceOffset);
			const normalized = this.normalizeMemberAccesses(memberAccesses);

			const replacements: Array<{ start: number; end: number; replacement: string }> =
				[];
			const dependencies = new Set<string>();
			const invalidPaths: string[] = [];

			for (const access of normalized) {
				const schema = options?.schemas?.[access.root];
				if (schema && !this.pathExistsInSchema(access.key, schema)) {
					invalidPaths.push(`${access.root}.${access.key}`);
					continue;
				}

				replacements.push({
					start: access.start,
					end: access.end,
					replacement: `${access.root}.statContainer.getValue('${access.key}')`,
				});
				dependencies.add(access.key);
			}

			if (invalidPaths.length > 0) {
				result.error = `无效的属性路径: ${invalidPaths.join(", ")}`;
				return result;
			}

			const compiledExpression = this.applyReplacements(
				expression,
				replacements,
			);

			result.success = true;
			result.compiledExpression = compiledExpression;
			result.dependencies = [...dependencies];
		} catch (error) {
			result.error = `转换失败: ${error instanceof Error ? error.message : "Unknown error"}`;
		}

		return result;
	},

	/**
	 * 解析表达式为 AST
	 *
	 * @param expression 原始表达式字符串
	 * @returns AST 节点和源字符串偏移量
	 *
	 * 说明：
	 * - 首先尝试直接解析为脚本
	 * - 如果失败，包装为 `(expression)` 后解析（常见于纯表达式）
	 * - sourceOffset 用于修正包装后的 node.start/end，使其对应原字符串位置
	 */
	parseExpressionToAst(expression: string): { ast: Node; sourceOffset: number } {
		try {
			return {
				ast: parse(expression, {
					ecmaVersion: 2020,
					sourceType: "script",
				}),
				sourceOffset: 0,
			};
		} catch {
			// 作为表达式包装后解析，node.start/end 需要减去 1 才能对应原字符串
			const wrapped = `(${expression})`;
			return {
				ast: parse(wrapped, {
					ecmaVersion: 2020,
					sourceType: "script",
				}),
				sourceOffset: 1,
			};
		}
	},

	/**
	 * 收集所有 self.xxx / target.xxx 属性访问
	 *
	 * @param ast AST 根节点
	 * @param source 原始表达式字符串
	 * @param sourceOffset 源字符串偏移量（用于修正包装后的位置）
	 * @returns 属性访问列表（包含位置、根访问器、属性键）
	 *
	 * 说明：
	 * - 遍历 AST 查找所有 MemberExpression
	 * - 提取 self/target 开头的属性链
	 * - 返回位置信息用于后续精确替换
	 */
	collectMemberAccesses(
		ast: Node,
		source: string,
		sourceOffset: number,
	): Array<{ start: number; end: number; root: "self" | "target"; key: string }> {
		const accesses: Array<{
			start: number;
			end: number;
			root: "self" | "target";
			key: string;
		}> = [];

		this.walkAST(ast, (node: Node) => {
			if (node.type !== "MemberExpression") {
				return;
			}
			const nodeStart = node.start - sourceOffset;
			const nodeEnd = node.end - sourceOffset;
			const accessor = this.extractAccessor(node, source);
			const key = this.extractPropertyKey(node, source);
			if (!accessor || !key) {
				return;
			}
			accesses.push({
				start: nodeStart,
				end: nodeEnd,
				root: accessor.type,
				key,
			});
		});

		return accesses;
	},

	/**
	 * 规范化成员访问列表：去除重叠的内层访问
	 *
	 * @param accesses 原始访问列表
	 * @returns 规范化后的访问列表（只保留最外层）
	 *
	 * 说明：
	 * - 同一条属性链（如 `self.mainWeapon.range`）会产生多个 MemberExpression：
	 *   - `self.mainWeapon`（内层）
	 *   - `self.mainWeapon.range`（外层）
	 * - 只保留最外层（最大范围），避免重复替换导致错误
	 * - 按 start 排序，同 start 时优先更长的（外层）
	 */
	normalizeMemberAccesses(
		accesses: Array<{ start: number; end: number; root: "self" | "target"; key: string }>,
	): Array<{ start: number; end: number; root: "self" | "target"; key: string }> {
		const sorted = [...accesses].sort((a, b) => {
			if (a.start !== b.start) {
				return a.start - b.start;
			}
			return b.end - a.end; // 同 start 时优先更长的（外层）
		});

		const normalized: Array<{
			start: number;
			end: number;
			root: "self" | "target";
			key: string;
		}> = [];

		for (const access of sorted) {
			const last = normalized[normalized.length - 1];
			if (last && access.start >= last.start && access.end <= last.end) {
				continue;
			}
			normalized.push(access);
		}

		return normalized;
	},

	/**
	 * 应用替换列表到源字符串
	 *
	 * @param source 原始字符串
	 * @param replacements 替换列表（包含位置和替换内容）
	 * @returns 替换后的字符串
	 *
	 * 说明：
	 * - 按 start 倒序排序（从后往前替换），避免 offset 变化影响后续替换
	 * - 使用字符串切片精确替换，保证位置准确
	 */
	applyReplacements(
		source: string,
		replacements: Array<{ start: number; end: number; replacement: string }>,
	): string {
		const sorted = [...replacements].sort((a, b) => b.start - a.start);
		let out = source;
		for (const r of sorted) {
			const before = out.substring(0, r.start);
			const after = out.substring(r.end);
			out = before + r.replacement + after;
		}
		return out;
	},

	/**
	 * 提取访问器类型（self 或 target）
	 */
	extractAccessor(node: Node, source: string): { type: "self" | "target"; fullText: string } | null {
		if (node.type !== "MemberExpression") {
			return null;
		}

		// 递归查找最左侧的标识符
		let current: Node = node;
		while (current.type === "MemberExpression") {
			const memberExpr = current as MemberExpression;
			current = memberExpr.object;
		}

		if (current.type === "Identifier") {
			const identifier = current as Identifier;
			const name = source.substring(identifier.start, identifier.end);
			if (name === "self" || name === "target") {
				return { type: name, fullText: source.substring(node.start, node.end) };
			}
		}

		return null;
	},

	/**
	 * 提取属性键（如 "mainWeapon.range"）
	 */
	extractPropertyKey(node: Node, source: string): string | null {
		if (node.type !== "MemberExpression") {
			return null;
		}

		const parts: string[] = [];
		let current: Node = node;

		// 从右到左收集属性名
		while (current.type === "MemberExpression") {
			const memberExpr = current as MemberExpression;
			if (memberExpr.property.type === "Identifier") {
				const propName = source.substring(memberExpr.property.start, memberExpr.property.end);
				parts.unshift(propName);
			} else {
				return null; // 不支持动态属性访问
			}
			current = memberExpr.object;
		}

		// 跳过最左侧的 self/target
		if (current.type === "Identifier") {
			const identifier = current as Identifier;
			const rootName = source.substring(identifier.start, identifier.end);
			if (rootName === "self" || rootName === "target") {
				return parts.join(".");
			}
		}

		return null;
	},

	/**
	 * 格式化值为字符串字面量
	 */
	formatValue(value: number | boolean): string {
		if (typeof value === "boolean") {
			return value ? "true" : "false";
		}
		// 数字：保持精度，避免科学计数法
		if (Number.isInteger(value)) {
			return value.toString();
		}
		return value.toString();
	},

	/**
	 * 检查路径是否存在于 Schema
	 */
	pathExistsInSchema(path: string, schema: NestedSchema): boolean {
		const parts = path.split(".");
		let current: NestedSchema | SchemaAttribute = schema;

		for (const part of parts) {
			if (!current || typeof current !== "object") {
				return false;
			}

			const next = current[part];
			if (!next) {
				return false;
			}

			// 检查是否为 SchemaAttribute（叶子节点）
			if (this.isSchemaAttribute(next)) {
				// 如果还有更多部分，说明路径不完整
				return parts.indexOf(part) === parts.length - 1;
			}

			// 继续向下查找
			current = next as NestedSchema;
		}

		// 最后检查是否为 SchemaAttribute
		return this.isSchemaAttribute(current);
	},

	/**
	 * 检查对象是否为 SchemaAttribute
	 */
	isSchemaAttribute(obj: unknown): obj is SchemaAttribute {
		return (
			!!obj &&
			typeof obj === "object" &&
			"displayName" in obj &&
			"expression" in obj &&
			typeof (obj as { displayName?: unknown }).displayName === "string" &&
			typeof (obj as { expression?: unknown }).expression === "string"
		);
	},

	/**
	 * 遍历 AST
	 */
	walkAST(node: Node, callback: (node: Node) => void): void {
		callback(node);

		for (const key of Object.keys(node)) {
			const value = node[key as keyof Node];

			if (Array.isArray(value)) {
				for (const item of value) {
					if (item && typeof item === "object" && "type" in item) {
						this.walkAST(item as Node, callback);
					}
				}
			} else if (this.isNode(value)) {
				this.walkAST(value, callback);
			}
		}
	},

	/**
	 * 检查值是否为 AST 节点
	 */
	isNode(value: unknown): value is Node {
		return (
			!!value && typeof value === "object" && "type" in value && typeof (value as { type?: unknown }).type === "string"
		);
	},
};
