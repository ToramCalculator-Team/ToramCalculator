import { z } from "zod/v4";
import { createLogger } from "~/lib/Logger";
import { State } from "~/lib/mistreevous/State";
import { ExpressionTransformer } from "../../../../JSProcessor/ExpressionTransformer";
import type { DamageAreaRequest } from "../../../Area/types";
import { ModifierType } from "../StatContainer/StatContainer";
import type { BtContext } from "./BtContext";
import { type ActionPool, defineAction } from "./type";
import { sendRenderCommand } from "./uitls"; 

const log = createLogger("Actions");

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
	expResolutionType: z.enum(["physical", "magic", "normal"]).meta({ description: "惯性结算类型" }),
	attackCount: z.number().meta({ description: "攻击次数，多次造成伤害公式对应的伤害" }),
	damageFormula: z.string().meta({ description: "伤害公式，伤害公式中可以包含self变量，self变量表示当前角色" }),
	damageCount: z.number().meta({ description: "伤害数量，将伤害公式计算出的伤害平均分配到攻击次数" }),
	damageTags: z
		.array(z.string())
		.default([])
		.meta({ description: "伤害归因标签，供受击 Pipeline 的 overlay / proc 订阅判定（如 fire/poison/controlEnhance）" }),
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
			logLv > 0 && log.debug(`👤 [${context.owner?.name}] log`, input.message);
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
			log.debug(`👤 [${context.owner?.name}] moveTo`, input);
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
		(context, input) => {
			log.debug(`👤 [${context.owner?.name}] animation`, input);
			sendRenderCommand(context, input.name, { duration: input.duration });
			return State.SUCCEEDED;
		},
	),

	/** 单体攻击 */
	singleAttack: defineAction(commonAttackSchema.meta({ description: "单体攻击" }), (context, input) => {
		log.debug(`👤 [${context.owner?.name}] generateSingleAttack`, input);
		// 解析伤害表达式，将所需的self变量放入参数列表

		// 将伤害表达式和伤害区域数据移交给区域管理器处理,区域管理器将负责代替发送伤害事件
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
		(context, input) => {
			log.debug(`👤 [${context.owner?.name}] 范围攻击`, input);
			const owner = context.owner;
			if (!owner) {
				log.warn(`⚠️ [${context.owner?.name}] 无法找到owner`);
				return State.FAILED;
			}

			// 分析表达式依赖
			const dependencies = ExpressionTransformer.analyzeDependencies(input.damageFormula);
			log.debug(`👤 [${owner.name}] 表达式依赖分析:`, dependencies);

			// 创建施法者属性快照（只快照用到的属性）
			const casterSnapshot: Record<string, number> = {};
			for (const key of dependencies.selfDependencies) {
				casterSnapshot[key] = owner.statContainer.getValue(key);
			}

			// 获取技能等级
			const skillLv = context.currentSkill?.lv ?? 0;

			log.debug(`👤 [${owner.name}] 施法者快照:`, casterSnapshot, `技能等级: ${skillLv}`);

			// 将伤害表达式和伤害区域数据移交给区域管理器处理,区域管理器将负责代替发送伤害事件
			const startFrame = owner.services.getCurrentFrame();
			const damageRequest: DamageAreaRequest = {
				identity: {
					sourceId: owner.id,
					sourceCampId: owner.campId,
				},
				lifetime: {
					startFrame,
					durationFrames: 1,
				},
				hitPolicy: {
					hitIntervalFrames: 1,
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
				casterId: owner.id,
				targetId: input.targetId,
			};
			owner.services.damageRequestHandler?.(damageRequest);

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
		(context, input) => {
			log.debug(`👤 [${context.owner?.name}] generateEnemyAttack`, input);
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
			log.debug(`👤 [${context.owner?.name}] generateMoveAttack`, input);
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
			log.debug(`👤 [${context.owner?.name}] generateVerticalAttack`, input);
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
			log.debug(`👤 [${context.owner?.name}] generateGroundAttack`, input);
			// 解析伤害表达式，将所需的self变量放入参数列表

			// 将伤害表达式和伤害区域数据移交给区域管理器处理,区域管理器将负责代替发送伤害事件
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
		(context, input) => {
			log.debug(`👤 [${context.owner?.name}] addBuff`, input);
			// buff逻辑所需的定义应该会被加载到上下文中，找到他并注册即可
			const buff = context.currentSkillVariant?.buffs.find((buff) => buff.name === input.treeName);
			if (!buff) {
				log.warn(`⚠️ [${context.owner?.name}] 无法找到buff: ${input.treeName}`);
				return State.FAILED;
			}
			// 注册buff
			context.owner?.btManager.registerParallelBt(buff.name, buff.definition, buff.agent);
			return State.SUCCEEDED;
		},
	),

	/** 移除buff */
	removeBuff: defineAction(
		z.object({
			treeName: z.string().meta({ description: "buff树名称" }),
		}).meta({ description: "移除buff" }),
		(context, input) => {
			context.owner?.btManager.unregisterParallelBt(input.treeName);
			return State.SUCCEEDED;
		},
	),

	/** 属性修改 */
	modifyAttribute: defineAction(
		z
			.object({
				attribute: z.string().meta({ description: "属性名称" }),
				value: z.number().meta({ description: "属性值" }),
				type: z.enum(["fixed", "percentage"]).meta({ description: "属性类型" }),
			})
			.meta({ description: "属性修改" }),
		(context, input) => {
			log.debug(`👤 [${context.owner?.name}] modifyAttribute`, input);
			context.owner?.statContainer.addModifier(
				input.attribute,
				input.type === "fixed" ? ModifierType.DYNAMIC_FIXED : ModifierType.DYNAMIC_PERCENTAGE,
				input.value,
				{
					id: context.currentSkill?.id ?? "",
					name: context.currentSkill?.template.name ?? "",
					type: "skill",
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
				sourceId: z.string().meta({ description: "订阅来源 id（registlet/buff/passive skill 的 id，用于卸载时按来源清理）" }),
				direction: z.enum(["entered", "exited", "both"]).meta({ description: "关心状态进入/离开哪个方向" }),
				types: z.array(z.string()).meta({ description: "感兴趣的状态 type 列表（StatusInstance.type）；空数组 = 全部" }),
				counterSlot: z
					.string()
					.optional()
					.meta({ description: "可选：StatContainer 属性槽路径，触发时 +1（供后续 BT 节点读取）" }),
			})
			.meta({ description: "订阅状态进入/离开事件" }),
		(context, input) => {
			const owner = context.owner;
			if (!owner || !owner.procBus) {
				log.warn(`👤 [${owner?.name}] subscribeStatus：ProcBus 未就绪，跳过`);
				return State.FAILED;
			}

			const eventNames: string[] = [];
			if (input.direction === "entered" || input.direction === "both") eventNames.push("status.entered");
			if (input.direction === "exited" || input.direction === "both") eventNames.push("status.exited");

			const typesFilter = new Set(input.types);
			const predicate = typesFilter.size === 0
				? null
				: (event: { payload: unknown }) => {
					const payload = event.payload as { type?: string };
					return !!payload?.type && typesFilter.has(payload.type);
				};

			owner.procBus.subscribeByName(input.sourceId, eventNames, predicate, (event) => {
				if (!input.counterSlot) return;
				owner.statContainer.addModifier(
					input.counterSlot,
					ModifierType.DYNAMIC_FIXED,
					1,
					{
						id: `${input.sourceId}.counter.${event.frame}`,
						name: "subscribeStatus.counter",
						type: "system",
					},
				);
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
		(context, input) => {
			const owner = context.owner;
			if (!owner || !owner.procBus) {
				log.warn(`👤 [${owner?.name}] subscribeProc：ProcBus 未就绪，跳过`);
				return State.FAILED;
			}

			const tagFilter = new Set(input.requiredTags);
			const predicate = tagFilter.size === 0
				? null
				: (event: { payload: unknown }) => {
					const payload = event.payload as { damageTags?: string[] };
					if (!Array.isArray(payload?.damageTags)) return false;
					for (const tag of payload.damageTags) {
						if (tagFilter.has(tag)) return true;
					}
					return false;
				};

			owner.procBus.subscribeByName(input.sourceId, input.eventNames, predicate, (event) => {
				if (!input.counterSlot) return;
				owner.statContainer.addModifier(
					input.counterSlot,
					ModifierType.DYNAMIC_FIXED,
					1,
					{
						id: `${input.sourceId}.counter.${event.frame}`,
						name: "subscribeProc.counter",
						type: "system",
					},
				);
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
		(context, input) => {
			const owner = context.owner;
			if (!owner) return State.FAILED;

			owner.attributeWatchers.watch(
				input.sourceId,
				input.path,
				input.threshold,
				input.direction,
				(ctx) => {
					if (!input.counterSlot) return;
					owner.statContainer.addModifier(
						input.counterSlot,
						ModifierType.DYNAMIC_FIXED,
						1,
						{
							id: `${input.sourceId}.counter.${ctx.newValue}`,
							name: "watchThreshold.counter",
							type: "system",
						},
					);
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
		(context, input) => {
			const owner = context.owner;
			if (!owner) return State.FAILED;
			owner.procBus?.unsubscribeBySource(input.sourceId);
			owner.attributeWatchers.unwatchBySource(input.sourceId);
			return State.SUCCEEDED;
		},
	),
} as const satisfies ActionPool<BtContext>;

export type CommonActionPool = typeof CommonActionPool;
