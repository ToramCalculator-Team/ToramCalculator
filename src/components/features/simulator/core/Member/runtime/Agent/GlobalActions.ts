import { z } from "zod/v4";
import { State } from "~/lib/mistreevous/State";
import { ModifierType } from "../StatContainer/StatContainer";
import type { RuntimeContext } from "./AgentContext";
import { type ActionPool, defineAction } from "./type";

export const logLv = 1; // 0: 不输出日志, 1: 输出关键日志, 2: 输出所有日志

const sendRenderCommand = (
	context: RuntimeContext,
	actionName: string,
	params?: Record<string, unknown>,
) => {
	if (!context.owner?.engine.postRenderMessage) {
		console.warn(
			`⚠️ [${context.owner?.name}] 无法获取渲染消息接口，无法发送渲染指令: ${actionName}`,
		);
		return;
	}
	const now = Date.now();
	const renderCmd = {
		type: "render:cmd" as const,
		cmd: {
			type: "action" as const,
			entityId: context.owner?.id,
			name: actionName,
			seq: now,
			ts: now,
			params,
		},
	};
	context.owner?.engine.postRenderMessage(renderCmd);
};

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
				x: z.number(),
				y: z.number(),
				z: z.number(),
			}),
		}),
		(context, input) => {
			console.log(`👤 [${context.owner?.name}] moveTo`, input);
			return State.SUCCEEDED;
		},
	),

	/** 播放动画 */
	animation: defineAction(
		z.object({
			name: z.string(),
		}),
		(context, input) => {
			console.log(`👤 [${context.owner?.name}] animation`, input);
			sendRenderCommand(context, input.name);
			return State.SUCCEEDED;
		},
	),

	/** 单体攻击 */
	singleAttack: defineAction(
		z.object({
			targetId: z.string(),
			damageType: z.enum(["physical", "magic"]),
			defExpType: z.enum(["physical", "magic", "normal"]),
			attackCount: z.number(),
			damageFormula: z.string(),
			damageCount: z.number(),
		}),
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
			targetId: z.string(),
			damageType: z.enum(["physical", "magic"]),
			defExpType: z.enum(["physical", "magic", "normal"]),
			attackCount: z.number(),
			damageFormula: z.string(),
			damageCount: z.number(),
			radius: z.number(),
		}),
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
			damageType: z.enum(["physical", "magic"]),
			defExpType: z.enum(["physical", "magic", "normal"]),
			attackCount: z.number(),
			damageFormula: z.string(),
			damageCount: z.number(),
			radius: z.number(),
		}),
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
			damageType: z.enum(["physical", "magic"]),
			defExpType: z.enum(["physical", "magic", "normal"]),
			damageFormula: z.string(),
			width: z.number(),
			speed: z.number(),
		}),
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
			id: z.string(),
			treeName: z.string(),
		}),
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
			attribute: z.string(),
			value: z.number(),
			type: z.enum(["fixed", "percentage"]),
		}),
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
