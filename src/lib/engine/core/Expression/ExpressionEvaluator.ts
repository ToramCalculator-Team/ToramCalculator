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
 * 施法者快照 facade。
 *
 * 切片3 脱手锁定：受击结算时 `self.*` 不应读施法者实时属性，而应读“施放瞬间”锁定的快照。
 * 本 facade 模拟 transformToGetValue 改写后的访问形态：
 * - `self.statContainer.getValue(k)`     → casterSnapshot[k]
 * - `self.statContainer.getBaseValue(k)` → casterSnapshot['_'+k]
 * - `self.hasBuff(x)`                    → casterSnapshot['hasBuff:'+x] === 1
 * 缺键回退 0 并告警（依赖分析应已覆盖所有键，缺键即 bug 信号）。
 */
function createSnapshotSelfFacade(snapshot: Record<string, number>): {
	statContainer: { getValue(k: string): number; getBaseValue(k: string): number };
	hasBuff(x: string): boolean;
} {
	const read = (key: string): number => {
		if (key in snapshot) return snapshot[key];
		log.warn(`⚠️ casterSnapshot 缺少键: ${key}（依赖分析未覆盖，按 0 处理）`);
		return 0;
	};
	return {
		statContainer: {
			getValue: (k: string) => read(k),
			getBaseValue: (k: string) => read(`_${k}`),
		},
		hasBuff: (x: string) => snapshot[`hasBuff:${x}`] === 1,
	};
}

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

			// 切片3 脱手锁定：当 context 携带 casterSnapshot 时（伤害结算路径），
			// self 走施放瞬间锁定的快照 facade，不读施法者实时属性；target 仍读实时受击者。
			const casterSnapshot = context.casterSnapshot as Record<string, number> | undefined;
			const useSnapshotSelf = !!casterSnapshot;

			// self 实例仅在非快照路径下才需要（快照路径用 facade 取代）。
			const self = useSnapshotSelf ? undefined : this.deps.getMemberById(memberId);
			if (!useSnapshotSelf && !self) {
				throw new Error(`成员不存在: ${memberId}`);
			}

			const target = context.targetId ? this.deps.getMemberById(context.targetId) : undefined;

			// self facade：
			// - 快照路径：用 casterSnapshot 构造只读 facade（脱手锁定）。
			// - 实时路径：包装 Member 实例，注入 hasBuff，保留原型链/方法。
			let selfExpr: unknown;
			if (useSnapshotSelf && casterSnapshot) {
				selfExpr = createSnapshotSelfFacade(casterSnapshot);
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

			// 确保 context 包含 self/target 引用（表达式里可直接使用 self/target）
			const executionContext: ExpressionContext = {
				...context,
				self: selfExpr,
				target: targetExpr,
				/**
				 * 表达式运行时 API：查询 Buff 状态
				 *
				 * 约定：
				 * - `hasBuff('id')` 默认查询 self（施法者/当前计算主体）
				 * - 快照路径下读 casterSnapshot；实时路径下读施法者 btManager。
				 */
				hasBuff: (id: string): boolean =>
					useSnapshotSelf && casterSnapshot
						? casterSnapshot[`hasBuff:${id}`] === 1
						: !!self && self.btManager.hasBuff(id),
			};

			log.debug(`🔍 表达式求值: ${expression}`, executionContext);
			const evalResult = this.deps.jsProcessor.evaluateNumberOrBoolean(expression, executionContext, {
				cacheScope: `${memberId}_${context.targetId ?? "-"}`,
				schemas: {
					// 快照路径下 self 不传 schema：facade 已是数值现成，transformToGetValue 的 schema 校验可选（跳过）。
					self: useSnapshotSelf ? undefined : self?.dataSchema,
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
