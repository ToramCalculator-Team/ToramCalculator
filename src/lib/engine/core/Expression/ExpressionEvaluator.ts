import { createLogger } from "~/lib/Logger";
import type { JSProcessor } from "../JSProcessor/JSProcessor";
import type { ExpressionContext } from "../JSProcessor/types";
import type { NestedSchema } from "../World/Member/runtime/StatContainer/SchemaTypes";

const log = createLogger("ExprEval");
log.setLevel(0);

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
 *
 * self 取值来源：
 * - 默认按 casterId 取实时施法者（包装成只读视图）。
 * - 若 context 携带 selfOverride（如脱手技能传入的施放瞬间快照视图），则直接采用，
 *   不再读实时施法者。求值器只认“是否被覆盖”，不关心覆盖视图从何而来。
 */
export class ExpressionEvaluator {
	constructor(
		private deps: {
			jsProcessor: JSProcessor;
			getMemberById: GetMemberById;
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

			// self 被覆盖时不读实时施法者；否则按 casterId 取实时施法者。
			const hasSelfOverride = context.selfOverride !== undefined;
			const self = hasSelfOverride ? undefined : this.deps.getMemberById(memberId);
			if (!hasSelfOverride && !self) {
				throw new Error(`成员不存在: ${memberId}`);
			}

			const target = context.targetId ? this.deps.getMemberById(context.targetId) : undefined;

			// self 视图：覆盖优先；否则包装实时 Member 实例（注入 hasBuff，保留原型链/方法）。
			let selfExpr: unknown;
			if (hasSelfOverride) {
				selfExpr = context.selfOverride;
			} else if (self) {
				const wrapped = Object.create(self) as typeof self & {
					hasBuff?: (id: string) => boolean;
					hasDebuff?: (id: string) => boolean;
				};
				wrapped.hasBuff = (id: string) => self.btManager.hasBuff(id);
				wrapped.hasDebuff = (_id: string) => false;
				selfExpr = wrapped;
			}

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

			// hasBuff 运行时 API：裸 hasBuff('id') 默认查询 self。
			// self 视图自带 hasBuff（覆盖视图或实时包装），统一委托过去，避免重复一份语义。
			const selfHasBuff = (selfExpr as { hasBuff?: (id: string) => boolean } | undefined)?.hasBuff;

			// 确保 context 包含 self/target 引用（表达式里可直接使用 self/target）
			const executionContext: ExpressionContext = {
				...context,
				self: selfExpr,
				target: targetExpr,
				hasBuff: (id: string): boolean => (selfHasBuff ? selfHasBuff(id) : false),
			};

			log.debug(`🔍 表达式求值: ${expression}`, executionContext);
			const evalResult = this.deps.jsProcessor.evaluateNumberOrBoolean(expression, executionContext, {
				cacheScope: `${memberId}_${context.targetId ?? "-"}`,
				schemas: {
					// self 被覆盖时不传 schema：覆盖视图已是现成取值面，无需 transformToGetValue 的路径校验。
					self: hasSelfOverride ? undefined : self?.dataSchema,
					target: target?.dataSchema,
				},
			});
			if (!evalResult.success) {
				throw new Error(evalResult.error ?? "表达式求值失败");
			}
			return evalResult.result ?? 0;
		} catch (error) {
			log.error(`表达式计算失败: ${expression}`, error);
			return 0;
		}
	}
}
