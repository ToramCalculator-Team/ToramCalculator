import { z } from "zod/v4";
import { createLogger } from "~/lib/Logger";
import { State } from "~/lib/mistreevous/State";
import * as CasterSnapshot from "../../../../Expression/CasterSnapshot";
import { ExpressionTransformer } from "../../../../JSProcessor/ExpressionTransformer";
import type { DamageAreaRequest } from "../../../Area/types";
import type { MemberBtCapabilities } from "../BehaviourTree/BtManagerEnv";
import { ModifierSourceTypeSchema, ModifierType, StatModifierKindSchema } from "../StatContainer/StatContainer";
import type { MemberFSMEvent } from "../StateMachine/types";
import type { MemberSharedRuntime } from "../types";
import { type ActionPool, defineAction } from "./type";
import { sendRenderCommand } from "./uitls";

const log = createLogger("Actions");

type BtContext = MemberSharedRuntime;
type BtCapabilities = MemberBtCapabilities<string, MemberFSMEvent>;

export const logLv = 0; // 0: 不输出日志, 1: 输出关键日志, 2: 输出所有日志

/** 二维向量 */
const vec2Schema = z.object({
	x: z.number().meta({ description: "X坐标" }),
	y: z.number().meta({ description: "Y坐标" }),
});

// 通用攻击基础参数
const commonAttackBaseSchema = z.object({
	targetId: z.string().meta({ description: "目标ID" }),
	expApplicationType: z.enum(["physical", "magic", "normal", "none"]).meta({ description: "惯性施加类型" }),
	expResolutionType: z.enum(["physical", "magic", "normal"]).meta({ description: "惯性依赖类型" }),
	damageFormula: z.string().meta({ description: "伤害公式，伤害公式中可以包含self变量，self变量表示当前角色" }),
	damageCount: z.union([z.string(), z.number()]).meta({ description: "伤害拆分段数表达式；结算后按段数拆分伤害" }),
	damageTags: z
		.array(z.string())
		.default([])
		.meta({ description: "伤害归因标签，供受击 Pipeline 的 overlay / proc 订阅判定（如 fire/poison/controlEnhance）" }),
	ailments: z
		.array(z.object({ type: z.string(), chance: z.string() }))
		.default([])
		.meta({ description: "伤害附带异常列表，每项包含异常类型(AbnormalType)和概率表达式" }),
	warningZone: z
		.enum(["red", "blue", "none"])
		.default("none")
		.meta({ description: "警告区域类型（红/蓝区护盾识别依据）" }),
	lockCasterAttributes: z.boolean().default(true).meta({
		description:
			"是否脱手锁定施法者属性。true（默认）：弹道/延迟/分段伤害结算时 self.* 读施放瞬间快照，不随施法者后续变化；false：结算时 self.* 实时读施法者当前属性（持续光束、引导类技能需要）",
	}),
});

const damageIntervalSchemaShape = {
	damageInterval: z
		.union([z.string(), z.number()])
		.optional()
		.meta({ description: "可选：拆分伤害每段生效间隔毫秒表达式" }),
};

// 通用攻击参数；范围类 action 需要把自身几何参数放在 damageInterval 前，所以使用 base schema 单独组装。
const commonAttackSchema = z.object({
	...commonAttackBaseSchema.shape,
	...damageIntervalSchemaShape,
});

const rangeAttackSchema = z.object({
	...commonAttackBaseSchema.shape,
	radius: z.number().meta({ description: "伤害范围" }),
	...damageIntervalSchemaShape,
});

const moveAttackSchema = z.object({
	...commonAttackBaseSchema.shape,
	width: z.number().meta({ description: "攻击宽度" }),
	speed: z.number().meta({ description: "冲撞速度" }),
	...damageIntervalSchemaShape,
});

/**
 * 基于 expResolutionType 自动派生基础伤害类别标签。
 * 技能作者传入的 damageTags 会与此合并，重复的 tag 会被去重。
 */
function deriveBaseDamageTags(expResolutionType: "physical" | "magic" | "normal"): string[] {
	if (expResolutionType === "physical") return ["physical"];
	if (expResolutionType === "magic") return ["magical"];
	return [];
}

function evaluateActionNumberExpression(
	context: BtContext,
	capabilities: BtCapabilities,
	raw: string | number | undefined,
	fallback: number,
	label: string,
	targetId?: string,
): number {
	if (raw == null || raw === "") return fallback;
	if (typeof raw === "number") return Number.isFinite(raw) ? raw : fallback;
	const expression = raw.trim();
	if (!expression) return fallback;
	const skill = context.skill;
	const currentSkillData = context.currentSkill?.data;
	const skillLv = skill?.lv ?? currentSkillData?.lv ?? 0;
	const evaluated = capabilities.services.expressionEvaluator?.(expression, {
		currentTimeMs: context.currentTimeMs,
		tickIndex: context.tickIndex,
		casterId: context.memberId,
		targetId: targetId ?? context.targetId,
		skillLv,
	});
	if (typeof evaluated === "number" && Number.isFinite(evaluated)) return evaluated;
	if (typeof evaluated === "boolean") return evaluated ? 1 : 0;
	log.warn(`⚠️ [${context.name}] ${label}表达式未返回数值`, expression, evaluated);
	return fallback;
}

function buildDamageRequest(
	context: BtContext,
	input: z.output<typeof commonAttackSchema>,
	capabilities: BtCapabilities,
	rangeKind: DamageAreaRequest["range"]["rangeKind"],
	rangeParams: DamageAreaRequest["range"]["rangeParams"],
	targetId?: string,
): DamageAreaRequest {
	// 施法者属性在生成伤害区域时快照（施放瞬间值）。结算侧是否采用该快照由 lockCasterAttributes 决定：
	// 锁定时 self.* 读此快照（脱手不回溯），实时时 self.* 读结算瞬间的施法者。
	// 快照始终构造：命中判定（hitCheck）也依赖其中的 hit / skill.mpCost。
	const dependencies = ExpressionTransformer.analyzeDependencies(input.damageFormula);
	log.debug(`👤 [${context.name}] 表达式依赖分析:`, dependencies);

	// 公式里的 hasBuff('X') 是裸调用（求值时由注入的 ctx.hasBuff 解析），不走属性数值通道，
	// 故不会出现在 selfDependencies 中，需单独静态提取并在施放瞬间锁存命中标志。
	const hasBuffArgs = ExpressionTransformer.analyzeBareHasBuffArgs(input.damageFormula);

	const casterSnapshot: CasterSnapshot.CasterSnapshot = {};
	for (const key of dependencies.selfDependencies) {
		CasterSnapshot.setStat(casterSnapshot, key, capabilities.statContainer.getValue(key));
	}
	for (const key of dependencies.selfBaseValueDependencies) {
		CasterSnapshot.setBaseValue(casterSnapshot, key, capabilities.statContainer.getBaseValue(key));
	}
	// capabilities.hasParallelBt 即 self.btManager.hasBuff（见 Member.ts capabilities 装配），
	// 与求值器实时路径同源，保证锁存值与实时语义一致。
	for (const buffId of hasBuffArgs) {
		CasterSnapshot.setHasBuff(casterSnapshot, buffId, capabilities.hasParallelBt(buffId));
	}

	const skillLv = context.skill?.lv ?? context.currentSkill?.data.lv ?? 0;
	const tickDurationMs = Math.max(1, Math.floor(context.deltaTimeMs || 1));
	const damageCount = Math.max(
		1,
		Math.floor(evaluateActionNumberExpression(context, capabilities, input.damageCount, 1, "damageCount", targetId)),
	);
	const damageIntervalMs = Math.max(
		0,
		Math.floor(
			evaluateActionNumberExpression(context, capabilities, input.damageInterval, 0, "damageInterval", targetId),
		),
	);
	const durationMs =
		damageCount <= 1 ? tickDurationMs : Math.max(tickDurationMs, (damageCount - 1) * damageIntervalMs + tickDurationMs);

	log.debug(`👤 [${context.name}] 施法者快照:`, casterSnapshot, `技能等级: ${skillLv}`);

	return {
		identity: {
			sourceId: context.memberId,
			sourceCampId: context.campId,
		},
		lifetime: {
			startTimeMs: capabilities.services.getCurrentTimeMs(),
			durationMs,
		},
		hitPolicy: {
			hitIntervalMs: damageIntervalMs,
		},
		attackSemantics: {
			damageCount,
		},
		range: {
			rangeKind,
			rangeParams,
		},
		payload: {
			damageFormula: input.damageFormula,
			casterSnapshot,
			skillLv,
			damageTags: Array.from(new Set([...deriveBaseDamageTags(input.expResolutionType), ...(input.damageTags ?? [])])),
			warningZone: input.warningZone ?? "none",
			lockCasterAttributes: input.lockCasterAttributes ?? true,
		},
		casterId: context.memberId,
		targetId,
	};
}

/**
 * 通用动作池
 * Lookup.getFuncInvoker 会用 apply(agent, args) 调用
 */
export const CommonActionPool = {
	/** 日志 */
	log: defineAction(
		z
			.object({
				message: z.string().meta({ description: "日志消息" }),
			})
			.meta({ description: "日志" }),
		(context, input) => {
			logLv > 0 && log.debug(`👤 [${context.name}] log`, input.message);
			return State.SUCCEEDED;
		},
	),
	/** 移动到指定位置 */
	moveTo: defineAction(
		z
			.object({
				target: vec2Schema,
			})
			.meta({ description: "移动到指定位置" }),
		(context, input) => {
			log.debug(`👤 [${context.name}] moveTo`, input);
			return State.SUCCEEDED;
		},
	),

	/** 播放动画 */
	animation: defineAction(
		z
			.object({
				name: z.string().meta({ description: "动画名称" }),
				duration: z.number().meta({ description: "动画时长" }),
			})
			.meta({ description: "播放动画" }),
		(context, input, capabilities) => {
			log.debug(`👤 [${context.name}] animation`, input);
			sendRenderCommand(context, capabilities, input.name, { duration: input.duration });
			return State.SUCCEEDED;
		},
	),

	/** 单体攻击 */
	singleAttack: defineAction(commonAttackSchema.meta({ description: "单体攻击" }), (context, input, capabilities) => {
		log.debug(`👤 [${context.name}] generateSingleAttack`, input);
		const targetId = capabilities.services.targetResolver?.(context.memberId, input.targetId) ?? input.targetId;
		if (!targetId || targetId === context.memberId) {
			log.warn(`⚠️ [${context.name}] 单体攻击缺少有效敌对目标`, input);
			return State.FAILED;
		}

		// 将伤害表达式和伤害区域数据移交给区域管理器处理，区域管理器负责派发受击事件。
		const damageRequest = buildDamageRequest(context, input, capabilities, "Single", {}, targetId);
		capabilities.services.damageRequestHandler?.(damageRequest);

		return State.SUCCEEDED;
	}),

	/** 范围攻击 */
	rangeAttack: defineAction(rangeAttackSchema.meta({ description: "范围攻击" }), (context, input, capabilities) => {
		log.debug(`👤 [${context.name}] 范围攻击`, input);

		const targetId = capabilities.services.targetResolver?.(context.memberId, input.targetId) ?? input.targetId;
		if (!targetId || targetId === context.memberId) {
			log.warn(`⚠️ [${context.name}] 范围攻击缺少有效敌对目标`, input);
			return State.FAILED;
		}

		// 将伤害表达式和伤害区域数据移交给区域管理器处理，区域管理器负责派发受击事件。
		const damageRequest = buildDamageRequest(context, input, capabilities, "Range", { radius: input.radius }, targetId);
		capabilities.services.damageRequestHandler?.(damageRequest);

		return State.SUCCEEDED;
	}),

	/** 周围攻击 */
	surroundingsAttack: defineAction(
		rangeAttackSchema.meta({ description: "周围攻击" }),
		(context, input, capabilities) => {
			log.debug(`👤 [${context.name}] generateEnemyAttack`, input);

			// 周围攻击以施法者为圆心，targetId 只保留给表达式求值上下文，不参与范围中心选择。
			const expressionTargetId =
				capabilities.services.targetResolver?.(context.memberId, input.targetId) ?? input.targetId;
			const damageRequest = buildDamageRequest(
				context,
				input,
				capabilities,
				"Enemy",
				{ radius: input.radius },
				expressionTargetId,
			);
			capabilities.services.damageRequestHandler?.(damageRequest);
			return State.SUCCEEDED;
		},
	),

	/** 冲撞攻击 */
	moveAttack: defineAction(moveAttackSchema.meta({ description: "冲撞攻击" }), (context, input) => {
		log.debug(`👤 [${context.name}] generateMoveAttack`, input);
		// 解析伤害表达式，将所需的self变量放入参数列表

		// 将伤害表达式和伤害区域数据移交给区域管理器处理,区域管理器将负责代替发送伤害事件
		return State.SUCCEEDED;
	}),

	/** 陨石伤害 */
	verticalAttack: defineAction(
		z
			.object({
				radius: z.number().meta({ description: "伤害半径" }),
			})
			.meta({ description: "陨石伤害" }),
		(context, input) => {
			log.debug(`👤 [${context.name}] generateVerticalAttack`, input);
			// 解析伤害表达式，将所需的self变量放入参数列表

			// 将伤害表达式和伤害区域数据移交给区域管理器处理,区域管理器将负责代替发送伤害事件
			return State.SUCCEEDED;
		},
	),

	/** 贴地伤害 */

	/** 地面伤害 */
	groundAttack: defineAction(
		z
			.object({
				...commonAttackSchema.shape,
			})
			.meta({ description: "地面伤害" }),
		(context, input) => {
			log.debug(`👤 [${context.name}] generateGroundAttack`, input);
			// 解析伤害表达式，将所需的self变量放入参数列表

			// 将伤害表达式和伤害区域数据移交给区域管理器处理,区域管理器将负责代替发送伤害事件
			return State.SUCCEEDED;
		},
	),

	/** 回复 HP */
	healHp: defineAction(
		z
			.object({
				expression: z.string().meta({ description: "回复量表达式（可含 skillLv、self.xxx）" }),
				sourceId: z.string().optional().meta({ description: "可选：回复来源 id；未提供时按当前技能聚合" }),
				sourceName: z.string().optional().meta({ description: "可选：回复来源名称；未提供时使用当前技能名" }),
				sourceType: ModifierSourceTypeSchema.optional().meta({ description: "可选：来源类别；未提供时按技能处理" }),
			})
			.meta({ description: "回复 HP" }),
		(context, input, capabilities) => {
			log.debug(`👤 [${context.name}] healHp`, input);

			const skill = context.skill;
			const currentSkillData = context.currentSkill?.data;
			const skillLv = skill?.lv ?? currentSkillData?.lv ?? 0;

			const evaluated = capabilities.services.expressionEvaluator?.(input.expression, {
				currentTimeMs: context.currentTimeMs,
				tickIndex: context.tickIndex,
				casterId: context.memberId,
				targetId: context.targetId,
				skillLv,
			});
			if (typeof evaluated !== "number") {
				log.warn(`⚠️ [${context.name}] HP回复表达式未返回数值`, input.expression, evaluated);
				return State.FAILED;
			}

			const requested = Math.floor(evaluated);
			if (requested <= 0) return State.SUCCEEDED;

			const currentAttr = `hp.current`;
			const maxAttr = `hp.max`;
			const current = capabilities.statContainer.getValue(currentAttr);
			const max = capabilities.statContainer.getValue(maxAttr);
			const capped = max > 0 ? Math.min(requested, Math.max(0, max - current)) : requested;
			if (capped <= 0) return State.SUCCEEDED;
			const sourceName = input.sourceName ?? skill?.name ?? currentSkillData?.template?.name ?? `hp-heal`;
			capabilities.statContainer.addModifier(currentAttr, ModifierType.DYNAMIC_FIXED, capped, {
				id: input.sourceId ?? `skill.heal.hp.${skill?.id ?? currentSkillData?.id ?? "unknown"}`,
				name: sourceName,
				type: input.sourceType ?? "skill",
			});

			const hp = current + capped;
			const mp = capabilities.statContainer.getValue("mp.current");

			capabilities.notifyDomainEvent({
				type: "state_changed",
				memberId: context.memberId,
				hp,
				mp,
			});

			return State.SUCCEEDED;
		},
	),

	/** 回复 MP */
	healMp: defineAction(
		z
			.object({
				expression: z.string().meta({ description: "回复量表达式（可含 skillLv、self.xxx）" }),
				sourceId: z.string().optional().meta({ description: "可选：回复来源 id；未提供时按当前技能聚合" }),
				sourceName: z.string().optional().meta({ description: "可选：回复来源名称；未提供时使用当前技能名" }),
				sourceType: ModifierSourceTypeSchema.optional().meta({ description: "可选：来源类别；未提供时按技能处理" }),
			})
			.meta({ description: "回复 MP" }),
		(context, input, capabilities) => {
			log.debug(`👤 [${context.name}] healMp`, input);

			const skill = context.skill;
			const currentSkillData = context.currentSkill?.data;
			const skillLv = skill?.lv ?? currentSkillData?.lv ?? 0;

			const evaluated = capabilities.services.expressionEvaluator?.(input.expression, {
				currentTimeMs: context.currentTimeMs,
				tickIndex: context.tickIndex,
				casterId: context.memberId,
				targetId: context.targetId,
				skillLv,
			});
			if (typeof evaluated !== "number") {
				log.warn(`⚠️ [${context.name}] MP回复表达式未返回数值`, input.expression, evaluated);
				return State.FAILED;
			}

			const requested = Math.floor(evaluated);
			if (requested <= 0) return State.SUCCEEDED;

			const currentAttr = `mp.current`;
			const maxAttr = `mp.max`;
			const current = capabilities.statContainer.getValue(currentAttr);
			const max = capabilities.statContainer.getValue(maxAttr);
			const capped = max > 0 ? Math.min(requested, Math.max(0, max - current)) : requested;
			if (capped <= 0) return State.SUCCEEDED;
			const sourceName = input.sourceName ?? skill?.name ?? currentSkillData?.template?.name ?? `mp-heal`;
			capabilities.statContainer.addModifier(currentAttr, ModifierType.DYNAMIC_FIXED, capped, {
				id: input.sourceId ?? `skill.heal.mp.${skill?.id ?? currentSkillData?.id ?? "unknown"}`,
				name: sourceName,
				type: input.sourceType ?? "skill",
			});

			const hp = capabilities.statContainer.getValue("hp.current");
			const mp = current + capped;

			capabilities.notifyDomainEvent({
				type: "state_changed",
				memberId: context.memberId,
				hp,
				mp,
			});

			return State.SUCCEEDED;
		},
	),

	/** 添加buff */
	addBuff: defineAction(
		z
			.object({
				treeName: z.string().meta({ description: "buff树名称" }),
			})
			.meta({ description: "添加buff" }),
		(context, input, capabilities) => {
			log.debug(`👤 [${context.name}] addBuff`, input);
			// buff逻辑所需的定义应该会被加载到上下文中，找到他并注册即可
			const buff = context.currentSkill?.activeVariant.registeredBehaviorTrees?.find(
				(tree) => tree.name === input.treeName,
			);
			if (!buff) {
				log.warn(`⚠️ [${context.name}] 无法找到buff: ${input.treeName}`);
				return State.FAILED;
			}
			// 注册buff
			capabilities.registerParallelBt(buff.name, buff.definition, buff.agent);
			return State.SUCCEEDED;
		},
	),

	/** 移除buff */
	removeBuff: defineAction(
		z
			.object({
				treeName: z.string().meta({ description: "buff树名称" }),
			})
			.meta({ description: "移除buff" }),
		(_context, input, capabilities) => {
			capabilities.unregisterParallelBt(input.treeName);
			return State.SUCCEEDED;
		},
	),

	/** 属性修改 */
	modifyAttribute: defineAction(
		z
			.object({
				attribute: z.string().meta({ description: "属性名称" }),
				expression: z.string().meta({ description: "属性值表达式" }),
				type: StatModifierKindSchema.meta({ description: "属性修改通道" }),
				sourceId: z.string().optional().meta({ description: "可选：稳定来源 id；未提供时使用当前技能 id" }),
				sourceName: z.string().optional().meta({ description: "可选：来源名称；未提供时使用当前技能名" }),
				sourceType: ModifierSourceTypeSchema.optional().meta({ description: "可选：来源类别；未提供时按技能处理" }),
				skillLv: z.number().optional().meta({ description: "可选：技能等级；未提供时从 context.skill 读取" }),
			})
			.meta({ description: "属性修改" }),
		(context, input, capabilities) => {
			log.debug(`👤 [${context.name}] modifyAttribute`, input);
			// 优先从 per-tree 注入的 skill 上下文读取，fallback 到 currentSkill
			const skill = context.skill;
			const currentSkillData = context.currentSkill?.data;

			const skillLv = input.skillLv ?? skill?.lv ?? currentSkillData?.lv ?? 0;

			const evaluated = capabilities.services.expressionEvaluator?.(input.expression, {
				currentTimeMs: context.currentTimeMs,
				tickIndex: context.tickIndex,
				casterId: context.memberId,
				targetId: context.targetId,
				skillLv,
			});
			if (typeof evaluated !== "number") {
				log.warn(`⚠️ [${context.name}] 属性修改表达式未返回数值`, input.expression, evaluated);
				return State.FAILED;
			}
			capabilities.statContainer.addModifier(
				input.attribute,
				{
					baseValue: ModifierType.BASE_VALUE,
					staticFixed: ModifierType.STATIC_FIXED,
					staticPercentage: ModifierType.STATIC_PERCENTAGE,
					dynamicFixed: ModifierType.DYNAMIC_FIXED,
					dynamicPercentage: ModifierType.DYNAMIC_PERCENTAGE,
				}[input.type],
				evaluated,
				{
					id: input.sourceId ?? skill?.id ?? currentSkillData?.id ?? input.attribute,
					name: input.sourceName ?? skill?.name ?? currentSkillData?.template.name ?? "",
					type: input.sourceType ?? "skill",
				},
			);
			return State.SUCCEEDED;
		},
	),

	/**
	 * 按 sourceId 覆盖设置属性 modifier。
	 *
	 * 设计说明：
	 * - `modifyAttribute` 是累加语义，适合“增加一层/加一段值”。
	 * - 刷新型一次性效果需要同一 sourceId 重复施加时保持幂等，例如冲击波刷新下一技能半耗。
	 * - 这里直接对齐 StatContainer 的 sourceId 覆盖更新能力，避免用当前总属性值反推 delta。
	 */
	setAttributeModifier: defineAction(
		z
			.object({
				attribute: z.string().meta({ description: "属性名称" }),
				expression: z.string().meta({ description: "属性值表达式" }),
				type: StatModifierKindSchema.meta({ description: "属性修改通道" }),
				sourceId: z.string().meta({ description: "稳定来源 id；重复设置会覆盖该 sourceId 的旧 modifier" }),
				skillLv: z.number().optional().meta({ description: "可选：技能等级；未提供时从 context.skill 读取" }),
			})
			.meta({ description: "按来源覆盖设置属性修改" }),
		(context, input, capabilities) => {
			log.debug(`👤 [${context.name}] setAttributeModifier`, input);
			const skill = context.skill;
			const currentSkillData = context.currentSkill?.data;

			const skillLv = input.skillLv ?? skill?.lv ?? currentSkillData?.lv ?? 0;

			const evaluated = capabilities.services.expressionEvaluator?.(input.expression, {
				currentTimeMs: context.currentTimeMs,
				tickIndex: context.tickIndex,
				casterId: context.memberId,
				targetId: context.targetId,
				skillLv,
			});
			if (typeof evaluated !== "number" || !Number.isFinite(evaluated)) {
				log.warn(`⚠️ [${context.name}] 覆盖属性修改表达式未返回有限数值`, input.expression, evaluated);
				return State.FAILED;
			}
			capabilities.statContainer.updateModifiersBySourceId(input.sourceId, [
				{
					attr: input.attribute,
					targetType: {
						baseValue: ModifierType.BASE_VALUE,
						staticFixed: ModifierType.STATIC_FIXED,
						staticPercentage: ModifierType.STATIC_PERCENTAGE,
						dynamicFixed: ModifierType.DYNAMIC_FIXED,
						dynamicPercentage: ModifierType.DYNAMIC_PERCENTAGE,
					}[input.type],
					value: evaluated,
				},
			]);
			return State.SUCCEEDED;
		},
	),

	// ==================== 编排层订阅类动作 ====================
	//
	// 设计要点：
	// - 这三个动作是 buff / registlet / passive skill BT 声明自己感兴趣的事件/阈值的入口。
	// - 所有注册都使用 `sourceId`（默认取当前技能/buff 名），卸载时按 sourceId 一并清理。
	// - handler 侧采用"事件数组累加到 runtime 槽"的最低成本实现，让 BT 其他节点通过属性读取
	//   感知到触发。真正的复杂逻辑（回血 / 加 modifier / 移除状态 …）由 BT 后续节点接力。

	/**
	 * 订阅状态进入/离开事件。
	 *
	 * 典型用例：减轻追击（进入胆怯/翻覆/昏厥）、神经控制（进入麻痹）、钉鞋（进入迟缓）。
	 */
	subscribeStatus: defineAction(
		z
			.object({
				sourceId: z
					.string()
					.meta({ description: "订阅来源 id（registlet/buff/passive skill 的 id，用于卸载时按来源清理）" }),
				direction: z.enum(["entered", "exited", "both"]).meta({ description: "关心状态进入/离开哪个方向" }),
				types: z
					.array(z.string())
					.meta({ description: "感兴趣的状态 type 列表（StatusInstance.type）；空数组 = 全部" }),
				counterSlot: z
					.string()
					.optional()
					.meta({ description: "可选：StatContainer 属性槽路径，触发时 +1（供后续 BT 节点读取）" }),
			})
			.meta({ description: "订阅状态进入/离开事件" }),
		(_context, input, capabilities) => {
			const eventNames: string[] = [];
			if (input.direction === "entered" || input.direction === "both") eventNames.push("status.entered");
			if (input.direction === "exited" || input.direction === "both") eventNames.push("status.exited");

			const typesFilter = new Set(input.types);
			const predicate =
				typesFilter.size === 0
					? null
					: (event: { payload: unknown }) => {
							const payload = event.payload as { type?: string };
							return !!payload?.type && typesFilter.has(payload.type);
						};

			capabilities.subscribeByName(input.sourceId, eventNames, predicate, (event) => {
				if (!input.counterSlot) return;
				capabilities.statContainer.addModifier(input.counterSlot, ModifierType.DYNAMIC_FIXED, 1, {
					id: `${input.sourceId}.counter.${event.timeMs}`,
					name: "subscribeStatus.counter",
					type: "system",
				});
			});
			return State.SUCCEEDED;
		},
	),

	/**
	 * 按 ProcBus 事件名订阅通用事件（非 status 专用）。
	 *
	 * 典型用例：燃烧的斗志（按 damageTags 过滤 damage.received）、爆能咏咒（订阅 skill.cast.completed）。
	 * handler 行为限定为 counterSlot +1；更复杂动作后续扩展。
	 */
	subscribeProc: defineAction(
		z
			.object({
				sourceId: z.string(),
				eventNames: z.array(z.string()).meta({ description: "感兴趣的事件名（EventCatalog 中已注册）" }),
				requiredTags: z
					.array(z.string())
					.default([])
					.meta({ description: "（可选）payload.damageTags 中需包含的伤害 tag；未命中则跳过" }),
				counterSlot: z.string().optional(),
			})
			.meta({ description: "按事件名 + tag 过滤订阅通用 proc 事件" }),
		(_context, input, capabilities) => {
			const tagFilter = new Set(input.requiredTags);
			const predicate =
				tagFilter.size === 0
					? null
					: (event: { payload: unknown }) => {
							const payload = event.payload as { damageTags?: string[] };
							if (!Array.isArray(payload?.damageTags)) return false;
							for (const tag of payload.damageTags) {
								if (tagFilter.has(tag)) return true;
							}
							return false;
						};

			capabilities.subscribeByName(input.sourceId, input.eventNames, predicate, (event) => {
				if (!input.counterSlot) return;
				capabilities.statContainer.addModifier(input.counterSlot, ModifierType.DYNAMIC_FIXED, 1, {
					id: `${input.sourceId}.counter.${event.timeMs}`,
					name: "subscribeProc.counter",
					type: "system",
				});
			});
			return State.SUCCEEDED;
		},
	),

	/**
	 * 注册一个属性阈值 watcher。
	 *
	 * 典型用例：HP 紧急回复（hp.current 下穿 maxHP*25%）。
	 * handler 行为：counterSlot +1 或 handlerExpr 求值后应用（当前只支持前者）。
	 */
	watchThreshold: defineAction(
		z
			.object({
				sourceId: z.string(),
				path: z.string().meta({ description: "属性路径（如 'hp.current'）" }),
				threshold: z.number(),
				direction: z.enum(["rising", "falling", "both"]).default("falling"),
				counterSlot: z.string().optional(),
				fireOnRegister: z.boolean().default(false),
			})
			.meta({ description: "注册属性阈值 watcher" }),
		(_context, input, capabilities) => {
			// 阈值穿越降格为 ProcBus 事件源（ADR 0010）：注册被监控点 + 订阅 attr.crossed。
			// predicate 按 register 返回的 registrationId 精确匹配自己那一条注册，避免同
			// (path, threshold) 多源订阅时被彼此的跨越事件重复 / 错向唤醒（ADR 0010 问题 A）。
			const registrationId = capabilities.registerThreshold(
				input.sourceId,
				input.path,
				input.threshold,
				input.direction,
				{ fireOnRegister: input.fireOnRegister },
			);
			capabilities.subscribeByName(
				input.sourceId,
				["attr.crossed"],
				(event) => (event.payload as { registrationId?: number }).registrationId === registrationId,
				(event) => {
					if (!input.counterSlot) return;
					const newValue = (event.payload as { newValue?: number }).newValue ?? 0;
					capabilities.statContainer.addModifier(input.counterSlot, ModifierType.DYNAMIC_FIXED, 1, {
						id: `${input.sourceId}.counter.${newValue}`,
						name: "watchThreshold.counter",
						type: "system",
					});
				},
			);
			return State.SUCCEEDED;
		},
	),

	/**
	 * 按 sourceId 解绑所有订阅（ProcBus + AttributeWatcher）。
	 * buff / registlet / passive skill 卸载时调用。
	 */
	unsubscribeBySource: defineAction(
		z.object({ sourceId: z.string() }).meta({ description: "按 sourceId 解绑该来源的所有订阅" }),
		(_context, input, capabilities) => {
			capabilities.unsubscribeBySource(input.sourceId);
			capabilities.unregisterThresholdBySource(input.sourceId);
			capabilities.statContainer.removeModifiersBySourceIdPrefix(input.sourceId);
			return State.SUCCEEDED;
		},
	),
} as const satisfies ActionPool<BtContext, string, MemberFSMEvent, BtCapabilities>;

export type CommonActionPool = typeof CommonActionPool;
