import type { CharacterSkillWithRelations } from "@db/generated/repositories/character_skill";
import { type EventObject, setup } from "xstate";
import type { ExpressionContext } from "~/lib/engine/core/JSProcessor/types";
import { createLogger } from "~/lib/Logger";
import type { DamageDispatchPayload } from "../../../Area/types";
import {
	createHitSession,
	type HitSession,
	resolveDamageAndApply,
	resolveHitCheck,
} from "../../runtime/DamageResolution";
import { ModifierType, type StatContainer } from "../../runtime/StatContainer/StatContainer";
import type {
	MemberFSMEvent,
	MemberFSMContext,
	MemberStateMachine,
	MemberStateMachineEnv,
} from "../../runtime/StateMachine/types";
import type { PlayerRuntime } from "../../runtime/types";
import type { Player } from "./Player";
import { computePlayerSkillLifecycleMs, selectPlayerSkillVariant } from "./skillLifecycle";
import { PlayerAttrKey } from "./PlayerAttrSchema";

const log = createLogger("PlayerSM");

/**
 * Player特有的事件类型
 * 扩展MemberFSMEvent，包含Player特有的状态机事件
 */
interface 复活 extends EventObject {
	type: "复活";
}
interface 移动 extends EventObject {
	type: "移动";
}
interface 停止移动 extends EventObject {
	type: "停止移动";
}
interface 使用格挡 extends EventObject {
	type: "使用格挡";
}
interface 结束格挡 extends EventObject {
	type: "结束格挡";
}
interface 使用闪躲 extends EventObject {
	type: "使用闪躲";
}
interface 收到闪躲持续时间结束通知 extends EventObject {
	type: "收到闪躲持续时间结束通知";
}
interface 使用技能 extends EventObject {
	type: "使用技能";
	data: { target: string; skillId: string };
}
interface 收到前摇结束通知 extends EventObject {
	type: "收到前摇结束通知";
	data: { skillId: string };
}
interface 收到蓄力结束通知 extends EventObject {
	type: "收到蓄力结束通知";
	data: { skillId: string };
}
interface 收到咏唱结束事件 extends EventObject {
	type: "收到咏唱结束事件";
	data: { skillId: string };
}
interface 收到发动结束通知 extends EventObject {
	type: "收到发动结束通知";
	data: { skillId: string };
}
interface 收到警告结束通知 extends EventObject {
	type: "收到警告结束通知";
}
interface 修改buff extends EventObject {
	type: "修改buff";
	data: { buffId: string; value: number };
}
interface 修改属性 extends EventObject {
	type: "修改属性";
	data: { attr: string; value: number };
}
interface 应用控制 extends EventObject {
	type: "应用控制";
}
interface 闪躲持续时间结束 extends EventObject {
	type: "闪躲持续时间结束";
}
interface 进行伤害计算 extends EventObject {
	type: "进行伤害计算";
}
interface 进行命中判定 extends EventObject {
	type: "进行命中判定";
}
interface 进行控制判定 extends EventObject {
	type: "进行控制判定";
}
interface 受到攻击 extends EventObject {
	type: "受到攻击";
	data: {
		/**
		 * 由 DamageAreaSystem 派发的伤害 payload。
		 * FSM 在"进行命中判定 / 进行控制判定 / 进行伤害计算"三段里依次消费。
		 */
		damageRequest: DamageDispatchPayload;
	};
}
interface 受到治疗 extends EventObject {
	type: "受到治疗";
	data: { origin: string; skillId: string };
}
interface 收到buff增删事件 extends EventObject {
	type: "收到buff增删事件";
	data: { buffId: string; value: number };
}
interface 收到快照请求 extends EventObject {
	type: "收到快照请求";
	data: { senderId: string };
}
interface 收到目标快照 extends EventObject {
	type: "收到目标快照";
	data: { senderId: string };
}
interface 切换目标 extends EventObject {
	type: "切换目标";
	data: { targetId: string };
}
interface 技能执行完成 extends EventObject {
	type: "技能执行完成";
}

export type PlayerEventType =
	| MemberFSMEvent
	| 复活
	| 移动
	| 停止移动
	| 使用格挡
	| 结束格挡
	| 使用闪躲
	| 收到闪躲持续时间结束通知
	| 使用技能
	| 收到前摇结束通知
	| 收到蓄力结束通知
	| 收到咏唱结束事件
	| 收到发动结束通知
	| 收到警告结束通知
	| 修改buff
	| 修改属性
	| 应用控制
	| 闪躲持续时间结束
	| 进行伤害计算
	| 进行命中判定
	| 进行控制判定
	| 受到攻击
	| 受到治疗
	| 收到buff增删事件
	| 收到快照请求
	| 收到目标快照
	| 切换目标
	| 技能执行完成;

// 定义 PlayerFSMContext 类型（提前声明）
//
// 注意：新字段以 optional 方式加入，以保留与基础 `MemberFSMContext` 结构的双向赋值兼容性
// （XState 对 context/env 泛型参数的推断对变位敏感，必选字段会破坏 Member.btManager.env.actor 赋值链）。
export interface PlayerFSMContext extends MemberFSMContext {
	/**
	 * 当前受击事务。
	 * 生命周期：受到攻击 → 创建 → 经过 hitCheck / damageCalc / applyDamage 三段后 → 清空。
	 * 详见 `DamageResolution.ts`。
	 */
	hitSession?: HitSession | null;
}

// 状态机执行动作时需要的外部能力
export interface PlayerStateMachineEnv
	extends MemberStateMachineEnv<PlayerAttrKey, PlayerEventType, PlayerRuntime> {
	runtime: PlayerRuntime;
}

const playerMachineSetup = setup({
	types: {
		context: {} as PlayerFSMContext,
		events: {} as PlayerEventType,
		output: {} as Player,
	},
});

const playerRaiseHitCheck = playerMachineSetup.raise({ type: "进行命中判定" });
const playerRaiseControlCheck = playerMachineSetup.raise({ type: "进行控制判定" });
const playerRaiseDamageCalc = playerMachineSetup.raise({ type: "进行伤害计算" });
const playerRaiseHpAttrUpdate = (statContainer: StatContainer<PlayerAttrKey>) => {
	return playerMachineSetup.raise(({ context }) => {
		const hpAfter =
			typeof context.hitSession?.hpAfter === "number"
				? context.hitSession.hpAfter
				: (statContainer.getValue("hp.current") ?? 0);
		return {
			type: "修改属性" as const,
			data: { attr: "hp.current", value: hpAfter },
		};
	});
};
const playerAssignHitSession = (name: string) => {
	return playerMachineSetup.assign(({ context, event }) => {
		log.debug(`👤 [${name}] 记录伤害请求`, event);
		const e = event as 受到攻击;
		const damageRequest = e.data?.damageRequest;
		if (!damageRequest) {
			return {};
		}
		return {
			hitSession: createHitSession(damageRequest),
		};
	});
};
const playerClearHitSession = playerMachineSetup.assign({ hitSession: null });

function expressionContext(env: PlayerStateMachineEnv, extra?: Record<string, unknown>): ExpressionContext {
	return {
		currentTimeMs: env.runtime.currentTimeMs,
		tickIndex: env.runtime.tickIndex,
		casterId: env.id,
		targetId: env.runtime.targetId,
		skillLv: env.runtime.currentSkill?.data.lv,
		...(extra ?? {}),
	};
}

type PlayerSkillCost = {
	hpCost: number;
	mpCost: number;
};

function resolveCurrentSkillCost(env: PlayerStateMachineEnv): PlayerSkillCost | null {
	const skill = env.runtime.currentSkill?.data;
	const variant =
		env.runtime.currentSkill?.activeVariant;
	if (!skill || !variant) {
		log.error(`🎮 [${env.name}] 缺少技能或变体，无法计算技能消耗`);
		return null;
	}

	const evalCost = (expr: string | null | undefined, label: string): number | null => {
		// 设计说明：消耗字段在数据库中允许为空；空值代表无消耗，非空公式必须得到有限数字。
		const normalizedExpr = expr?.trim();
		if (!normalizedExpr) return 0;
		const cost = env.services.expressionEvaluator?.(normalizedExpr, {
			...expressionContext(env),
		});
		if (typeof cost === "number" && Number.isFinite(cost)) {
			return cost;
		}
		log.error(`👤 [${env.name}] 技能${label}消耗不是有限数字`);
		return null;
	};

	const hpCost = evalCost(variant.hpCost, "HP");
	if (hpCost === null) return null;
	const mpCost = evalCost(variant.mpCost, "MP");
	if (mpCost === null) return null;

	try {
		const resolved = env.runPipeline("skill.cost", {
			baseHpCost: hpCost,
			baseMpCost: mpCost,
			skillLevel: skill.lv ?? 0,
			skillId: skill.id,
			skillTreeType: skill.template?.treeType ?? "",
		});
		const resolvedHpCost = Number(resolved.hpCost);
		const resolvedMpCost = Number(resolved.mpCost);
		if (Number.isFinite(resolvedHpCost) && Number.isFinite(resolvedMpCost)) {
			return { hpCost: resolvedHpCost, mpCost: resolvedMpCost };
		}
		log.error(`👤 [${env.name}] skill.cost 管线输出不是有限数字`);
		return null;
	} catch (error) {
		log.error(`👤 [${env.name}] skill.cost 管线执行失败`, error);
		return null;
	}
}

export const playerStateMachine = (
	env: PlayerStateMachineEnv,
): MemberStateMachine<PlayerEventType, PlayerFSMContext> => {
	const machineId = `${env.id}-FSM`;

	const machine = playerMachineSetup
		.extend({
			actions: {
				根据角色配置生成初始状态: ({ context, event }) => {
					log.debug(`👤 [${env.name}] 根据角色配置生成初始状态`, event);
				},
				启用站立动画: ({ context, event }) => {
					log.debug(`👤 [${env.name}] 启用站立动画`, event);
				},
				启用移动动画: ({ context, event }) => {
					log.debug(`👤 [${env.name}] 启用移动动画`, event);
				},
				显示警告: ({ context, event }) => {
					log.debug(`👤 [${env.name}] 显示警告`, event);
					const skillId = (event as { data?: { skillId?: string } }).data?.skillId ?? "";
					env.notifyDomainEvent({
						type: "skill_cast_denied",
						memberId: env.id,
						skillId,
						reason: "技能可用性检查失败",
					});
				},
				创建警告结束通知: ({ context, event }) => {
					log.debug(`👤 [${env.name}] 创建警告结束通知`, event);
				},
				添加待处理技能: ({ context, event }) => {
					log.debug(`👤 [${env.name}] 添加待处理技能`, event);
					const e = event as 使用技能;
					const skillId = e.data.skillId;
					const skill = env.runtime.data?.skills?.find((s: CharacterSkillWithRelations) => s.id === skillId);
					if (!skill) {
						log.error(`🎮 [${env.name}] 的当前技能不存在`);
						throw new Error(`技能不存在: ${skillId}`);
					}
					const skillVariant = selectPlayerSkillVariant(skill, env.runtime.data);
					if(!skillVariant) {
						log.error(`🎮 [${env.name}] 的当前技能变体不存在`);
						throw new Error(`技能变体不存在: ${skillId}`);
					}
					env.runtime.currentSkill = {
						data: skill,
						activeVariant: skillVariant,
						lifecycle: {
							startupMs: 0,
							chargingMs: 0,
							chantingMs: 0,
							actionMs: 0,
						},
					};
					const resolvedTargetId = env.services.targetResolver?.(env.id, e.data.target) ?? e.data.target;
					// 技能 BT 通过 `$targetId` 读取 runtime.targetId；进入 BT 前写入解析结果，避免动作层收到 self/空目标。
					env.runtime.targetId = resolvedTargetId || env.id;
				},
				清空待处理技能: ({ context, event }) => {
					log.debug(`👤 [${env.name}] 清空待处理技能`, event);
					env.runtime.previousSkill = env.runtime.currentSkill?.data || null;
					env.runtime.currentSkill = null;
					env.btManager.unregisterActiveEffectBt();
				},
				清理行为树: ({ context, event }) => {
					log.debug(`👤 [${env.name}] 清理行为树`, event);
					env.btManager.clear();
				},
				扣除技能消耗: ({ event }) => {
					log.debug(`👤 [${env.name}] 扣除技能消耗`, event);
					const cost = resolveCurrentSkillCost(env);
					if (!cost) return;

					const skill = env.runtime.currentSkill?.data;
					const sourceName = skill?.template?.name ?? "skill-cost";
					const sourceSkillId = skill?.id ?? "unknown";

					// 设计说明：技能释放被 FSM 接受后立即写入 StatContainer，BT 只消费技能上下文，不承担基础扣费职责。
					if (cost.hpCost !== 0) {
						env.statContainer.addModifier("hp.current", ModifierType.DYNAMIC_FIXED, -cost.hpCost, {
							id: `skill.cost.hp.${sourceSkillId}`,
							name: `${sourceName}.hpCost`,
							type: "skill",
						});
					}
					if (cost.mpCost !== 0) {
						env.statContainer.addModifier("mp.current", ModifierType.DYNAMIC_FIXED, -cost.mpCost, {
							id: `skill.cost.mp.${sourceSkillId}`,
							name: `${sourceName}.mpCost`,
							type: "skill",
						});
					}
				},
				执行技能: ({ context, event }) => {
					log.debug(`👤 [${env.name}] 执行技能`, event);
					log.debug(`技能名称`, env.runtime.currentSkill?.data?.template?.name);

					const skillVariant = env.runtime.currentSkill?.activeVariant;
					if (!skillVariant) {
						log.error(`🎮 [${env.name}] 当前技能效果不存在`);
						// env.actor.send({ type: "技能执行完成" });
						return;
					}

					const activeTree = skillVariant.activeBehaviorTree;
					if (!activeTree) {
						const activeBehavior = skillVariant.activeBehavior;
						if (activeBehavior) {
							const treeData = env.btManager.registerActiveEffectBt();
							if (!treeData) {
								log.error(
									`🎮 [${env.name}] 默认技能 SkillProgram 模板不是有效的行为树，已跳过执行`,
								);
								env.send({ type: "技能执行完成" });
							}
							return;
						}
						env.send({ type: "技能执行完成" });
						return;
					}

					const treeDefinition = activeTree.definition;
					const agentCode = activeTree.agent;

					const treeData = env.btManager.registerActiveEffectBt(treeDefinition, agentCode);
					if (!treeData) {
						log.error(`🎮 [${env.name}] 技能逻辑不是有效的行为树 TreeData，已跳过执行`, treeDefinition);
						// env.actor.send({ type: "技能执行完成" });
						return;
					}
				},
				重置控制抵抗时间: ({ context, event }) => {
					log.debug(`👤 [${env.name}] 重置控制抵抗时间`, event);
				},
				中断当前行为: ({ context, event }) => {
					log.debug(`👤 [${env.name}] 中断当前行为`, event);
				},
				启动受控动画: ({ context, event }) => {
					log.debug(`👤 [${env.name}] 启动受控动画`, event);
				},
				重置到复活状态: ({ context, event }) => {
					log.debug(`👤 [${env.name}] 重置到复活状态`, event);
				},
				发送命中判定事件给自己: playerRaiseHitCheck,
				反馈命中结果给施法者: ({ context, event }) => {
					log.debug(`👤 [${env.name}] 反馈命中结果给施法者`, event);
				},
				发送控制判定事件给自己: playerRaiseControlCheck,
				命中计算管线: ({ context, event }) => {
					log.debug(`👤 [${env.name}] 命中计算管线`, event);
					const session = context.hitSession;
					if (!session) {
						log.warn(`👤 [${env.name}] 命中计算管线：hitSession 为空，跳过`);
						return;
					}
					resolveHitCheck(env.runPipeline, session, env.services.random);
				},
				根据命中结果进行下一步: playerRaiseControlCheck,
				控制判定管线: ({ context, event }) => {
					log.debug(`👤 [${env.name}] 控制判定管线`, event);
					// 骨架版：statusResist 管线调用将在异常施加需求出现时迭代加入。
					// 当前保持空实现，确保 "进行伤害计算" 能正常触发。
				},
				反馈控制结果给施法者: ({ context, event }) => {
					log.debug(`👤 [${env.name}] 反馈控制结果给施法者`, event);
				},
				发送伤害计算事件给自己: playerRaiseDamageCalc,
				伤害计算管线: ({ context, event }) => {
					log.debug(`👤 [${env.name}] 伤害计算管线`, event);
					const session = context.hitSession;
					if (!session) {
						log.warn(`👤 [${env.name}] 伤害计算管线：hitSession 为空，跳过`);
						return;
					}
					resolveDamageAndApply(
						env.id,
						env.services.getCurrentTimeMs(),
						env.services.getTickIndex(),
						() => env.statContainer.getValue("hp.current"),
						() => env.statContainer.getValue("mp.current"),
						(value) =>
							env.statContainer.addModifier("hp.current", ModifierType.DYNAMIC_FIXED, value, {
								id: `damage.hp.${session.damageRequest.areaId}`,
								name: "damage-hp",
								type: "system",
							}),
						(value) =>
							env.statContainer.addModifier("mp.current", ModifierType.DYNAMIC_FIXED, value, {
								id: `damage.mp.${session.damageRequest.areaId}`,
								name: "damage-mp",
								type: "system",
							}),
						env.notifyDomainEvent,
						env.runPipeline,
						env.services.expressionEvaluator,
						session,
					);
				},
				反馈伤害结果给施法者: ({ context, event }) => {
					log.debug(`👤 [${env.name}] 反馈伤害结果给施法者`, event);
				},
				发送属性修改事件给自己: playerRaiseHpAttrUpdate(env.statContainer),
				发出属性变化域事件: ({ context, event }) => {
					const e = event as 修改属性;
					const attr = e.data?.attr;
					const newValue = e.data?.value ?? 0;

					// 获取当前属性值
					const hp = env.statContainer.getValue("hp.current");
					const mp = env.statContainer.getValue("mp.current");
					const position = env.position;

					// 发出 state_changed 事件
					env.notifyDomainEvent({
						type: "state_changed",
						memberId: env.id,
						hp: attr === "hp.current" ? newValue : hp,
						mp: attr === "mp.current" ? newValue : mp,
						position,
					});

					// 如果是 HP 变化，检查是否受击/死亡
					// 注意：这里无法准确判断受击，因为不知道修改前的值
					// 受击/死亡事件应该由伤害系统直接发出
					if (attr === "hp.current" && newValue <= 0 && hp > 0) {
						// 死亡事件
						env.notifyDomainEvent({
							type: "death",
							memberId: env.id,
						});
					}
				},
				发出移动开始域事件: ({ context, event: _event }) => {
					env.notifyDomainEvent({
						type: "move_started",
						memberId: env.id,
						position: env.position,
					});
				},
				发出移动停止域事件: ({ context, event: _event }) => {
					env.notifyDomainEvent({
						type: "move_stopped",
						memberId: env.id,
						position: env.position,
					});
				},
				发出施法进度开始事件: ({ context, event: _event }) => {
					const skillId = env.runtime.currentSkill?.data.id ?? "";
					if (!skillId) return;

					env.notifyDomainEvent({
						type: "cast_progress",
						memberId: env.id,
						skillId,
						progress: 0,
					});
				},
				发出施法进度结束事件: ({ context, event: _event }) => {
					const skillId = env.runtime.currentSkill?.data.id ?? "";
					if (!skillId) return;

					env.notifyDomainEvent({
						type: "cast_progress",
						memberId: env.id,
						skillId,
						progress: 1,
					});
				},
				发送buff修改事件给自己: ({ context, event }) => {
					log.debug(`👤 [${env.name}] 发送buff修改事件给自己`, event);
				},
				记录伤害请求: playerAssignHitSession(env.id),
				清空受击缓存: playerClearHitSession,
				修改目标Id: ({ context, event }, params: { targetId: string }) => {
					log.debug(`👤 [${env.name}] 修改目标Id`, event);
					// 统一 targetId：runtime 是跨系统共享读面
					env.runtime.targetId = params.targetId;
				},
				logEvent: ({ context, event }) => {
					log.debug(`👤 [${env.name}] 日志事件`, event);
				},
			},
			guards: {
				存在蓄力阶段: ({ context, event }) => {
					log.debug(`👤 [${env.name}] 判断技能是否有蓄力阶段`, event);

					const variant = env.runtime.currentSkillVariant;
					if (!variant) {
						log.error(`👤 [${env.name}] 技能效果不存在`);
						return false;
					}

						const timing = variant as Record<string, string>;
					const chargingFixed = env.services.expressionEvaluator?.(
						timing.chargingFixedMs ?? "0",
						expressionContext(env),
					);
					if (typeof chargingFixed !== "number") {
						log.error(`👤 [${env.name}] 蓄力阶段固定值不是数字`);
						return false;
					}
					const chargingModified = env.services.expressionEvaluator?.(
						timing.chargingModifiedMs ?? "0",
						expressionContext(env),
					);
					if (typeof chargingModified !== "number") {
						log.error(`👤 [${env.name}] 蓄力阶段可加速值不是数字`);
						return false;
					}
					log.debug(chargingFixed + chargingModified > 0 ? "有蓄力阶段" : "没有蓄力阶段");
					return chargingFixed + chargingModified > 0;
				},
				存在咏唱阶段: ({ context, event }) => {
					log.debug(`👤 [${env.name}] 判断技能是否有咏唱阶段`, event);
					const variant = env.runtime.currentSkillVariant;
					if (!variant) {
						log.error(`👤 [${env.name}] 技能效果不存在`);
						return false;
					}
						const timing = variant as Record<string, string>;
					const chantingFixed = env.services.expressionEvaluator?.(
						timing.chantingFixedMs ?? "0",
						expressionContext(env),
					);
					if (typeof chantingFixed !== "number") {
						log.error(`👤 [${env.name}] 咏唱阶段固定值不是数字`);
						return false;
					}
					const chantingModified = env.services.expressionEvaluator?.(
						timing.chantingModifiedMs ?? "0",
						expressionContext(env),
					);
					if (typeof chantingModified !== "number") {
						log.error(`👤 [${env.name}] 咏唱阶段可加速值不是数字`);
						return false;
					}
					log.debug(chantingFixed + chantingModified > 0 ? "有咏唱阶段" : "没有咏唱阶段");
					return chantingFixed + chantingModified > 0;
				},
				存在后续连击: ({ context, event }) => {
					log.debug(`👤 [${env.name}] 判断技能是否有后续连击`, event);
					// Add your guard condition here
					return false;
				},
				没有可用技能效果: ({ context, event }) => {
					// Add your guard condition here
					log.debug(`👤 [${env.name}] 判断技能是否有可用效果`, event);
					const e = event as 使用技能;
					const skillId = e.data.skillId;
					const skill = env.runtime.currentSkill?.data;
					if (!skill) {
						log.error(`🎮 [${env.name}] 技能不存在: ${skillId}`);
						return true;
					}
					const variant = selectPlayerSkillVariant(skill, env.runtime.data);
					if (!variant) {
						log.error(`🎮 [${env.name}] 技能变体不存在: ${skillId}`);
						return true;
					}
					log.debug(`🎮 [${env.name}] 的技能 ${skill.template?.name} 可用`);
					return false;
				},
				还未冷却: ({ context, event }) => {
					log.debug(`👤 [${env.name}] 判断技能是否还未冷却`, event);
					const e = event as 使用技能;
					const skillId = e.data.skillId;
					const skillIndex = env.runtime.skillList.findIndex((s) => s.id === skillId);
					const res = skillIndex >= 0 ? env.runtime.skillCooldowns[skillIndex] : undefined;
					if (res === undefined) {
						log.debug(`- 该技能不存在冷却时间`);
						return false;
					}
					if (res <= 0) {
						log.debug(`- 该技能处于冷却状态`);
						return false;
					}
					log.debug(`- 该技能未冷却，剩余冷却时间：${res}`);
					return true;
				},
				施法条件不满足: ({ context, event }) => {
					// 此守卫通过后说明技能可发动，则更新当前技能数据
					const e = event as 使用技能;
					const skillId = e.data.skillId;

					const skill = env.runtime.currentSkill?.data;
					if (!skill) {
						log.error(`🎮 [${env.name}] 技能不存在: ${skillId}`);
						return true;
					}
					const variant = selectPlayerSkillVariant(skill, env.runtime.data);
					if (!variant) {
						log.error(`🎮 [${env.name}] 技能效果不存在: ${skillId}`);
						return true;
					}
					const cost = resolveCurrentSkillCost(env);
					if (!cost) return true;
					const { hpCost, mpCost } = cost;

					if (hpCost > env.statContainer.getValue("hp.current") || mpCost > env.statContainer.getValue("mp.current")) {
						log.debug(`- 该技能不满足施法消耗，HP:${hpCost} MP:${mpCost}`);
						// 这里需要撤回RS的修改
						return true;
					}
					log.debug(`- 该技能满足施法消耗，HP:${hpCost} MP:${mpCost}`);
					return false;
				},
				技能带有心眼: ({ context, event }) => {
					log.debug(`👤 [${env.name}] 判断技能是否有心眼`, event);
					return true;
				},
				目标不抵抗此技能的控制效果: ({ context, event }) => {
					log.debug(`👤 [${env.name}] 判断目标是否不抵抗此技能的控制效果`, event);
					return true;
				},
				目标抵抗此技能的控制效果: ({ context, event }) => {
					log.debug(`👤 [${env.name}] 判断目标是否抵抗此技能的控制效果`, event);
					return true;
				},
				是物理伤害: ({ context, event }) => {
					log.debug(`👤 [${env.name}] 判断技能是否是物理伤害`, event);
					return true;
				},
				满足存活条件: ({ context, event }) => {
					log.debug(`👤 [${env.name}] 判断玩家是否满足存活条件`, event);
					const hp = env.statContainer.getValue("hp.current");
					const isAlive = hp > 0;
					context.isAlive = isAlive;
					return isAlive;
				},
			},
		})
		.createMachine({
			context: {
				isAlive: true,
				createdAtTimeMs: env.runtime.currentTimeMs,
				hitSession: null,
			},
			id: machineId,
			initial: "存活",
			entry: {
				type: "根据角色配置生成初始状态",
			},
			states: {
				存活: {
					initial: "可操作状态",
					on: {
						受到攻击: {
							actions: [
								{
									type: "记录伤害请求",
								},
								{
									type: "发送命中判定事件给自己",
								},
							],
						},
						进行命中判定: {
							actions: [
								{
									type: "命中计算管线",
								},
								{
									type: "反馈命中结果给施法者",
								},
								{
									type: "根据命中结果进行下一步",
								},
							],
						},
						进行控制判定: {
							actions: [
								{
									type: "控制判定管线",
								},
								{
									type: "反馈控制结果给施法者",
								},
								{
									type: "发送伤害计算事件给自己",
								},
							],
						},
						进行伤害计算: {
							actions: [
								{
									type: "伤害计算管线",
								},
								{
									type: "反馈伤害结果给施法者",
								},
								{
									type: "发送属性修改事件给自己",
								},
								{
									type: "清空受击缓存",
								},
							],
						},
						收到buff增删事件: {
							actions: [
								{
									type: "发送buff修改事件给自己",
								},
							],
						},
						受到治疗: {
							target: "存活",
							actions: {
								type: "发送属性修改事件给自己",
							},
						},
						修改属性: [
							{
								guard: {
									type: "满足存活条件",
								},
								// 设计说明：非致死属性变化只同步领域事件，避免扣蓝/受击等普通变化重进存活状态并打断当前行为。
								actions: {
									type: "发出属性变化域事件",
								},
							},
							{
								target: "死亡",
								actions: {
									type: "发出属性变化域事件",
								},
							},
						],
						修改buff: {},
						切换目标: {
							actions: {
								type: "修改目标Id",
								params: ({ event }) => {
									const e = event as 切换目标;
									return { targetId: e.data.targetId };
								},
							},
						},
					},
					description: "玩家存活状态，此时可操作且可影响上下文",
					states: {
						可操作状态: {
							initial: "空闲状态",
							on: {
								应用控制: {
									target: "控制状态",
								},
							},
							description: "可响应输入操作",
							states: {
								空闲状态: {
									initial: "静止",
									on: {
										使用格挡: {
											target: "格挡状态",
										},
										使用闪躲: {
											target: "闪躲中",
										},
										使用技能: {
											target: "技能处理状态",
										},
									},
									states: {
										静止: {
											on: {
												移动: {
													target: "移动中",
												},
											},
											entry: {
												type: "启用站立动画",
											},
										},
										移动中: {
											on: {
												停止移动: {
													target: "静止",
												},
											},
											entry: {
												type: "启用移动动画",
											},
										},
									},
								},
								格挡状态: {
									on: {
										结束格挡: {
											target: "空闲状态",
										},
									},
								},
								闪躲中: {
									on: {
										收到闪躲持续时间结束通知: {
											target: "空闲状态",
										},
									},
								},
								技能处理状态: {
									initial: "初始化技能",
									entry: {
										type: "添加待处理技能",
									},
									exit: {
										type: "清空待处理技能",
									},
									states: {
										初始化技能: {
											always: [
												{
													target: "警告状态",
													guard: "没有可用技能效果",
												},
												{
													target: "警告状态",
													guard: "还未冷却",
												},
												{
													target: "警告状态",
													guard: "施法条件不满足",
												},
												{
													target: "执行技能中",
												},
											],
										},
										警告状态: {
											on: {
												收到警告结束通知: {
													target: `#${machineId}.存活.可操作状态.空闲状态`,
												},
											},
											entry: [
												{
													type: "显示警告",
												},
												{
													type: "创建警告结束通知",
												},
											],
										},
										执行技能中: {
											entry: [
												{ type: "扣除技能消耗" },
												{ type: "发送属性修改事件给自己" },
												{ type: "发出施法进度开始事件" },
												{ type: "执行技能" },
											],
											on: {
												技能执行完成: [
													{
														target: `#${machineId}.存活.可操作状态.技能处理状态`,
														guard: "存在后续连击",
														actions: [{ type: "发出施法进度结束事件" }],
													},
													{
														target: `#${machineId}.存活.可操作状态.空闲状态`,
														actions: [{ type: "发出施法进度结束事件" }],
													},
												],
											},
										},
									},
								},
							},
						},
						控制状态: {
							on: {
								控制时间结束: {
									target: `#${machineId}.存活.可操作状态.空闲状态`,
								},
							},
							entry: [
								{
									type: "重置控制抵抗时间",
								},
								{
									type: "中断当前行为",
								},
								{
									type: "启动受控动画",
								},
							],
						},
					},
				},
				死亡: {
					entry: {
						type: "清理行为树",
					},
					on: {
						复活: {
							target: `#${machineId}.存活.可操作状态`,
							actions: {
								type: "重置到复活状态",
							},
						},
					},
					description: "不可操作，中断当前行为",
				},
			},
		});

	return machine;
};
