import { z } from "zod/v4";
import { State } from "~/lib/mistreevous/State";
import { ModifierType } from "../StatContainer/StatContainer";
import type { RuntimeContext } from "./AgentContext";
import { type ActionPool, defineAction } from "./type";
import { sendRenderCommand } from "./uitls";

export const logLv = 1; // 0: 不输出日志, 1: 输出关键日志, 2: 输出所有日志

/**
 * 通用战斗动作池（命中 / 伤害相关）
 * 约定：
 * - context 至少满足 ActionContext
 * - 受击者侧通过 context.currentDamageRequest 提供本次伤害请求
 * - 命中结果写回 context.lastHitResult，供状态机或后续动作使用
 */
export const CommonActions = {
	/** 移动到指定位置 */
	moveTo: defineAction(
		z.object({
			target: z.object({
				x: z.number().meta({ description: "目标X坐标" }),
				y: z.number().meta({ description: "目标Y坐标" }),
				z: z.number().meta({ description: "目标Z坐标" }),
			}),
		}).meta({ description: "移动到指定位置" }),
		(context, input) => {
			console.log(`👤 [${context.owner?.name}] moveTo`, input);
			return State.SUCCEEDED;
		},
	),

	/** 播放动画 */
	animation: defineAction(
		z.object({
			name: z.string().meta({ description: "动画名称" }),
		}).meta({ description: "播放动画" }),
		(context, input) => {
			console.log(`👤 [${context.owner?.name}] animation`, input);
			sendRenderCommand(context, input.name);
			return State.SUCCEEDED;
		},
	),

	/** 单体攻击 */
	singleAttack: defineAction(
		z.object({
			targetId: z.string().meta({ description: "目标ID" }),
			expApplicationType: z.enum(["physical", "magic", "normal"]).meta({ description: "惯性施加类型" }),
			expResolutionType: z.enum(["physical", "magic", "normal"]).meta({ description: "惯性结算类型" }),
			attackCount: z.number().meta({ description: "攻击次数，多次造成伤害公式对应的伤害" }),
			damageFormula: z.string().meta({ description: "伤害公式，伤害公式中可以包含self变量，self变量表示当前角色" }),
			damageCount: z.number().meta({ description: "伤害数量，将伤害公式计算出的伤害平均分配到攻击次数" }),
		}).meta({ description: "单体攻击" }),
		(context, input) => {
			console.log(`👤 [${context.owner?.name}] generateSingleAttack`, input);
			// 解析伤害表达式，将所需的self变量放入参数列表

			// 将伤害表达式和伤害区域数据移交给区域管理器处理,区域管理器将负责代替发送伤害事件
			return State.SUCCEEDED;
		},
	),

	/** 范围攻击 */
	rangeAttack: defineAction(
		z.object({
			targetId: z.string().meta({ description: "目标ID" }),
			expApplicationType: z.enum(["physical", "magic", "normal"]).meta({ description: "惯性施加类型" }),
			expResolutionType: z.enum(["physical", "magic", "normal"]).meta({ description: "惯性结算类型" }),
			attackCount: z.number().meta({ description: "攻击次数，多次造成伤害公式对应的伤害" }),
			damageFormula: z.string().meta({ description: "伤害公式，伤害公式中可以包含self变量，self变量表示当前角色" }),
			damageCount: z.number().meta({ description: "伤害数量，将伤害公式计算出的伤害平均分配到攻击次数" }),
			radius: z.number().meta({ description: "伤害范围" }),
		}).meta({ description: "范围攻击" }),
		(context, input) => {
			console.log(`👤 [${context.owner?.name}] generateRangeAttack`, input);
			// 解析伤害表达式，将所需的self变量放入参数列表

			// 将伤害表达式和伤害区域数据移交给区域管理器处理,区域管理器将负责代替发送伤害事件
			return State.SUCCEEDED;
		},
	),

	/** 周围攻击 */
	enemyAttack: defineAction(
		z.object({
			targetId: z.string().meta({ description: "目标ID" }),
			expApplicationType: z.enum(["physical", "magic", "normal"]).meta({ description: "惯性施加类型" }),
			expResolutionType: z.enum(["physical", "magic", "normal"]).meta({ description: "惯性结算类型" }),
			attackCount: z.number().meta({ description: "攻击次数，多次造成伤害公式对应的伤害" }),
			damageFormula: z.string().meta({ description: "伤害公式，伤害公式中可以包含self变量，self变量表示当前角色" }),
			damageCount: z.number().meta({ description: "伤害数量，将伤害公式计算出的伤害平均分配到攻击次数" }),
			radius: z.number().meta({ description: "伤害半径" }),
		}).meta({ description: "周围攻击" }),
		(context, input) => {
			console.log(`👤 [${context.owner?.name}] generateEnemyAttack`, input);
			// 解析伤害表达式，将所需的self变量放入参数列表

			// 将伤害表达式和伤害区域数据移交给区域管理器处理,区域管理器将负责代替发送伤害事件
			return State.SUCCEEDED;
		},
	),
    
	/** 冲撞攻击 */
	moveAttack: defineAction(
		z.object({
			targetId: z.string().meta({ description: "目标ID" }),
			expApplicationType: z.enum(["physical", "magic", "normal"]).meta({ description: "惯性施加类型" }),
			expResolutionType: z.enum(["physical", "magic", "normal"]).meta({ description: "惯性结算类型" }),
			attackCount: z.number().meta({ description: "攻击次数，多次造成伤害公式对应的伤害" }),
			damageFormula: z.string().meta({ description: "伤害公式，伤害公式中可以包含self变量，self变量表示当前角色" }),
			damageCount: z.number().meta({ description: "伤害数量，将伤害公式计算出的伤害平均分配到攻击次数" }),
			width: z.number().meta({ description: "攻击宽度" }),
			speed: z.number().meta({ description: "冲撞速度" }),
		}).meta({ description: "冲撞攻击" }),
		(context, input) => {
			console.log(`👤 [${context.owner?.name}] generateMoveAttack`, input);
			// 解析伤害表达式，将所需的self变量放入参数列表

			// 将伤害表达式和伤害区域数据移交给区域管理器处理,区域管理器将负责代替发送伤害事件
			return State.SUCCEEDED;
		},
	),

	/** 添加buff */
	addBuff: defineAction(
		z.object({
			id: z.string().meta({ description: "buffID" }),
			treeName: z.string().meta({ description: "buff树名称" }),
		}).meta({ description: "添加buff" }),
		(context, input) => {
			console.log(`👤 [${context.owner?.name}] addBuff`, input);
			// buff逻辑所需的定义应该会被加载到上下文中，找到他并注册即可
			const buff = context.currentSkillLogic?.buffs.find(
				(buff) => buff.name === input.treeName,
			);
			if (!buff) {
				console.warn(
					`⚠️ [${context.owner?.name}] 无法找到buff: ${input.treeName}`,
				);
				return State.FAILED;
			}
			// 注册buff
			context.owner?.btManager.registerBuffBt(input.id, buff.definition);
			return State.SUCCEEDED;
		},
	),

	/** 属性修改 */
	modifyAttribute: defineAction(
		z.object({
			attribute: z.string().meta({ description: "属性名称" }),
			value: z.number().meta({ description: "属性值" }),
			type: z.enum(["fixed", "percentage"]).meta({ description: "属性类型" }),
		}).meta({ description: "属性修改" }),
		(context, input) => {
			console.log(`👤 [${context.owner?.name}] modifyAttribute`, input);
			context.owner?.statContainer.addModifier(
				input.attribute,
				input.type === "fixed"
					? ModifierType.DYNAMIC_FIXED
					: ModifierType.DYNAMIC_PERCENTAGE,
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
} as const satisfies ActionPool<RuntimeContext>;

export type CommonActionPool = typeof CommonActions;
