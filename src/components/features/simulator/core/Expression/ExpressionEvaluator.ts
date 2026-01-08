import type { NestedSchema } from "../Member/runtime/StatContainer/SchemaTypes";
import type { JSProcessor } from "../JSProcessor/JSProcessor";
import type { ExpressionContext } from "../JSProcessor/types";

type ExpressionMember = {
	id: string;
	btManager: {
		hasBuff(id: string): boolean;
	};
	dataSchema: NestedSchema;
};

export type GetMemberById = (memberId: string) => ExpressionMember | null | undefined;

/**
 * ExpressionEvaluator
 *
 * 职责：
 * - 负责“表达式求值”的世界绑定：self/target 获取、hasBuff 注入、schema 注入、cacheScope 策略
 * - 不负责帧推进/事件/渲染等引擎职责
 */
export class ExpressionEvaluator {
	constructor(
		private deps: {
			jsProcessor: JSProcessor;
			getMemberById: GetMemberById;
			/**
			 * 透传到 expression context 的 engine 引用（可选，保留向后兼容）
			 * 注意：表达式层不应依赖复杂引擎对象；后续可替换为更小的 EngineApi。
			 */
			engine?: unknown;
		},
	) {}

	/**
	 * 计算表达式
	 *
	 * @param expression 表达式字符串（可以是 transform 后的，也可以包含 self/target 访问）
	 * @param context 计算上下文
	 * @returns 计算结果
	 */
	evaluateNumberOrBoolean(expression: string, context: ExpressionContext): number | boolean {
		try {
			const memberId = context.casterId;
			if (!memberId) {
				throw new Error("缺少成员ID");
			}

			const self = this.deps.getMemberById(memberId);
			if (!self) {
				throw new Error(`成员不存在: ${memberId}`);
			}

			const target = context.targetId ? this.deps.getMemberById(context.targetId) : undefined;

			// 表达式用的对象包装：避免直接污染 Member 实例，同时保留原型链/方法
			const selfExpr = Object.create(self) as typeof self & {
				hasBuff?: (id: string) => boolean;
				hasDebuff?: (id: string) => boolean;
			};
			selfExpr.hasBuff = (id: string) => self.btManager.hasBuff(id);
			selfExpr.hasDebuff = (_id: string) => false;

			const targetExpr = target
				? (Object.create(target) as typeof target & {
						hasBuff?: (id: string) => boolean;
						hasDebuff?: (id: string) => boolean;
					})
				: undefined;
			if (targetExpr && target) {
				targetExpr.hasBuff = (id: string) => target.btManager.hasBuff(id);
				targetExpr.hasDebuff = (_id: string) => false;
			}

			// 确保 context 包含 engine/self/target 引用（表达式里可直接使用 self/target）
			const executionContext: ExpressionContext = {
				...context,
				engine: this.deps.engine,
				self: selfExpr,
				target: targetExpr,
				/**
				 * 表达式运行时 API：查询 Buff 状态
				 *
				 * 约定：
				 * - `hasBuff('id')` 默认查询 self（施法者/当前计算主体）
				 * - `self.hasBuff('id')` / `target.hasBuff('id')` 也可用（向后兼容写法）
				 */
				hasBuff: (id: string): boolean => self.btManager.hasBuff(id),
				hasDebuff: (_id: string): boolean => false,
			};

			console.log(`🔍 表达式求值: ${expression}`, executionContext);
			const evalResult = this.deps.jsProcessor.evaluateNumberOrBoolean(expression, executionContext, {
				cacheScope: `${memberId}_${context.targetId ?? "-"}`,
				schemas: {
					self: self.dataSchema,
					target: target?.dataSchema,
				},
			});
			if (!evalResult.success) {
				throw new Error(evalResult.error ?? "表达式求值失败");
			}
			return evalResult.result ?? 0;
		} catch (error) {
			console.error(`表达式计算失败: ${expression}`, error);
			return 0;
		}
	}
}


