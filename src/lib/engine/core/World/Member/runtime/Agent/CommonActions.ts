import { z } from "zod/v4";
import { createLogger } from "~/lib/Logger";
import { State } from "~/lib/mistreevous/State";
import { ExpressionTransformer } from "../../../../JSProcessor/ExpressionTransformer";
import type { DamageAreaRequest } from "../../../Area/types";
import type { MemberBtCapabilities } from "../BehaviourTree/BtManagerEnv";
import { ModifierSourceTypeSchema, ModifierType, StatModifierKindSchema } from "../StatContainer/StatContainer";
import type { MemberEventType } from "../StateMachine/types";
import type { MemberSharedRuntime } from "../types";
import { type ActionPool, defineAction } from "./type";
import { sendRenderCommand } from "./uitls";

const log = createLogger("Actions");

type BtContext = MemberSharedRuntime;
type BtCapabilities = MemberBtCapabilities<string, MemberEventType>;

export const logLv = 0; // 0: 不输出日志, 1: 输出关键日志, 2: 输出所有日志

/** 二维向量 */
const vec2Schema = z.object({
	x: z.number().meta({ description: "X坐标" }),
	y: z.number().meta({ description: "Y坐标" }),
});

// 通用攻击参数
const commonAttackSchema = z.object({
	targetId: z.string().meta({ description: "目标ID" }),
	expApplicationType: z.enum(["physical", "magic", "normal", "none"]).meta({ description: "惯性施加类型" }),
	expResolutionType: z.enum(["physical", "magic", "normal"]).meta({ description: "惯性依赖类型" }),
	attackCount: z.number().meta({ description: "攻击次数，多次造成伤害公式对应的伤害" }),
	damageFormula: z.string().meta({ description: "伤害公式，伤害公式中可以包含self变量，self变量表示当前角色" }),
	damageCount: z.number().meta({ description: "伤害数量，将伤害公式计算出的伤害平均分配到攻击次数" }),
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

	/** 计算技能生命周期数据 */
	prepareSkillLifecycle: defineAction(z.object({}).meta({ description: "计算技能生命周期数据" }), (context, _input) => {
		log.debug(`👤 [${context.name}] 计算技能生命周期数据`);
		return State.SUCCEEDED;
	}),

	/** 单体攻击 */
	singleAttack: defineAction(commonAttackSchema.meta({ description: "单体攻击" }), (context, input, capabilities) => {
		log.debug(`👤 [${context.name}] generateSingleAttack`, input);
		const targetId = capabilities.services.targetResolver?.(context.memberId, input.targetId) ?? input.targetId;
		if (!targetId || targetId === context.memberId) {
			log.warn(`⚠️ [${context.name}] 单体攻击缺少有效敌对目标`, input);
			return State.FAILED;
		}

		// 分析表达式依赖
		const dependencies = ExpressionTransformer.analyzeDependencies(input.damageFormula);
		log.debug(`👤 [${context.name}] 表达式依赖分析:`, dependencies);

		// 创建施法者属性快照（只快照用到的属性）
		const casterSnapshot: Record<string, number> = {};
		for (const key of dependencies.selfDependencies) {
			casterSnapshot[key] = capabilities.statContainer.getValue(key);
		}
		for (const key of dependencies.selfBaseValueDependencies) {
			casterSnapshot[`_${key}`] = capabilities.statContainer.getBaseValue(key);
		}

		// 获取技能等级
		const skillLv = context.currentSkill?.data.lv ?? 0;

		log.debug(`👤 [${context.name}] 施法者快照:`, casterSnapshot, `技能等级: ${skillLv}`);

		// 将伤害表达式和伤害区域数据移交给区域管理器处理,区域管理器将负责代替发送伤害事件
		const startTimeMs = capabilities.services.getCurrentTimeMs();
		const damageRequest: DamageAreaRequest = {
			identity: {
				sourceId: context.memberId,
				sourceCampId: context.campId,
			},
			lifetime: {
				startTimeMs,
				durationMs: context.deltaTimeMs,
			},
			hitPolicy: {
				hitIntervalMs: context.deltaTimeMs,
			},
			attackSemantics: {
				attackCount: input.attackCount,
				damageCount: input.damageCount,
			},
			range: {
				rangeKind: "Single",
				rangeParams: {},
			},
			payload: {
				damageFormula: input.damageFormula,
				casterSnapshot,
				skillLv,
				damageTags: Array.from(new Set([...deriveBaseDamageTags(input.expResolutionType), ...input.damageTags])),
				warningZone: input.warningZone,
			},
			casterId: context.memberId,
			targetId,
		};
		capabilities.services.damageRequestHandler?.(damageRequest);

		return State.SUCCEEDED;
	}),

	/** 范围攻击 */
	rangeAttack: defineAction(
		z
			.object({
				...commonAttackSchema.shape,
				radius: z.number().meta({ description: "伤害范围" }),
			})
			.meta({ description: "范围攻击" }),
		(context, input, capabilities) => {
			log.debug(`👤 [${context.name}] 范围攻击`, input);

			// 分析表达式依赖
			const dependencies = ExpressionTransformer.analyzeDependencies(input.damageFormula);
			log.debug(`👤 [${context.name}] 表达式依赖分析:`, dependencies);

			// 创建施法者属性快照（只快照用到的属性）
			const casterSnapshot: Record<string, number> = {};
			for (const key of dependencies.selfDependencies) {
				casterSnapshot[key] = capabilities.statContainer.getValue(key);
			}
			for (const key of dependencies.selfBaseValueDependencies) {
				casterSnapshot[`_${key}`] = capabilities.statContainer.getBaseValue(key);
			}

			// 获取技能等级
			const skillLv = context.currentSkill?.data.lv ?? 0;

			log.debug(`👤 [${context.name}] 施法者快照:`, casterSnapshot, `技能等级: ${skillLv}`);

			// 将伤害表达式和伤害区域数据移交给区域管理器处理,区域管理器将负责代替发送伤害事件
			const startTimeMs = capabilities.services.getCurrentTimeMs();
			const damageRequest: DamageAreaRequest = {
				identity: {
					sourceId: context.memberId,
					sourceCampId: context.campId,
				},
				lifetime: {
					startTimeMs,
					durationMs: context.deltaTimeMs,
				},
				hitPolicy: {
					hitIntervalMs: context.deltaTimeMs,
				},
				attackSemantics: {
					attackCount: input.attackCount,
					damageCount: input.damageCount,
				},
				range: {
					rangeKind: "Range",
					rangeParams: {
						radius: input.radius,
					},
				},
				payload: {
					damageFormula: input.damageFormula,
					casterSnapshot,
					skillLv,
					damageTags: Array.from(new Set([...deriveBaseDamageTags(input.expResolutionType), ...input.damageTags])),
					warningZone: input.warningZone,
				},
				casterId: context.memberId,
				targetId: input.targetId,
			};
			capabilities.services.damageRequestHandler?.(damageRequest);

			return State.SUCCEEDED;
		},
	),

	/** 周围攻击 */
	surroundingsAttack: defineAction(
		z
			.object({
				...commonAttackSchema.shape,
				radius: z.number().meta({ description: "伤害半径" }),
			})
			.meta({ description: "周围攻击" }),
		(context, input, _capabilities) => {
			log.debug(`👤 [${context.name}] generateEnemyAttack`, input);
			// 解析伤害表达式，将所需的self变量放入参数列表

			// 将伤害表达式和伤害区域数据移交给区域管理器处理,区域管理器将负责代替发送伤害事件
			return State.SUCCEEDED;
		},
	),

	/** 冲撞攻击 */
	moveAttack: defineAction(
		z
			.object({
				...commonAttackSchema.shape,
				width: z.number().meta({ description: "攻击宽度" }),
				speed: z.number().meta({ description: "冲撞速度" }),
			})
			.meta({ description: "冲撞攻击" }),
		(context, input) => {
			log.debug(`👤 [${context.name}] generateMoveAttack`, input);
			// 解析伤害表达式，将所需的self变量放入参数列表

			// 将伤害表达式和伤害区域数据移交给区域管理器处理,区域管理器将负责代替发送伤害事件
			return State.SUCCEEDED;
		},
	),

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
			capabilities.registerParallelBt(buff.name, buff.definition);
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
					id: input.sourceId ?? skill?.id ?? currentSkillData?.id ?? "",
					name: input.sourceName ?? skill?.name ?? currentSkillData?.template.name ?? "",
					type: input.sourceType ?? "skill",
				},
			);
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
			capabilities.watch(
				input.sourceId,
				input.path,
				input.threshold,
				input.direction,
				(ctx) => {
					if (!input.counterSlot) return;
					capabilities.statContainer.addModifier(input.counterSlot, ModifierType.DYNAMIC_FIXED, 1, {
						id: `${input.sourceId}.counter.${ctx.newValue}`,
						name: "watchThreshold.counter",
						type: "system",
					});
				},
				{ fireOnRegister: input.fireOnRegister },
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
			capabilities.unwatchBySource(input.sourceId);
			capabilities.statContainer.removeModifiersBySourceIdPrefix(input.sourceId);
			return State.SUCCEEDED;
		},
	),
} as const satisfies ActionPool<BtContext, string, MemberEventType, BtCapabilities>;

export type CommonActionPool = typeof CommonActionPool;
