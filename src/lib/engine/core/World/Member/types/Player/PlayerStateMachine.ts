import { type EventObject, setup } from "xstate";
import type { ExpressionContext } from "~/lib/engine/core/JSProcessor/types";
import { createLogger } from "~/lib/Logger";
import type { EngineCharacterSkill } from "../../../../engineScenarioSchema";
import type { SkillRejectionReason } from "../../../../types";
import { ModifierType } from "../../runtime/StatContainer/StatContainer";
import { applyMemberTargetSelection } from "../../runtime/StateMachine/targetSelection";
import type {
	MemberControlEvent,
	MemberFSMContext,
	MemberFSMEvent,
	MemberSelectTargetEvent,
	MemberStateMachine,
	MemberStateMachineEnv,
	MemberUseSkillEvent,
} from "../../runtime/StateMachine/types";
import type { PlayerRuntime } from "../../runtime/types";
import type { PlayerAttrKey } from "./PlayerAttrSchema";
import { computePlayerSkillLifecycle, selectPlayerSkillVariant } from "./skillLifecycle";

const log = createLogger("PlayerFSM");
const NEXT_SKILL_COST_SOURCE_ID_PREFIX = "skill.nextCost";

// ─── 事件类型 ───────────────────────────────────────────────────────────────

interface 受到控制 extends EventObject {
	type: "受到控制";
}
interface 控制结束 extends EventObject {
	type: "控制结束";
}
interface 使用格挡 extends EventObject {
	id: string;
	type: "使用格挡";
	data: Record<string, never>;
}
interface 结束格挡 extends EventObject {
	id: string;
	type: "结束格挡";
	data: Record<string, never>;
}
interface 使用闪躲 extends EventObject {
	id: string;
	type: "使用闪躲";
	data: Record<string, never>;
}
interface 收到闪躲持续时间结束通知 extends EventObject {
	type: "收到闪躲持续时间结束通知";
}
interface 收到警告结束通知 extends EventObject {
	type: "收到警告结束通知";
}
interface 技能执行完成 extends EventObject {
	type: "技能执行完成";
}

export type PlayerControlEvent = MemberControlEvent | 使用格挡 | 结束格挡 | 使用闪躲;

export type PlayerSpecificEvent =
	| 受到控制
	| 控制结束
	| 使用格挡
	| 结束格挡
	| 使用闪躲
	| 收到闪躲持续时间结束通知
	| 收到警告结束通知
	| 技能执行完成;

export type PlayerFSMEvent = MemberFSMEvent<PlayerSpecificEvent>;

// ─── Context / Env ──────────────────────────────────────────────────────────

export interface PlayerFSMContext extends MemberFSMContext {
	canMove: boolean;
}

export interface PlayerFSMEnv extends MemberStateMachineEnv<PlayerAttrKey, PlayerFSMEvent, PlayerRuntime> {
	runtime: PlayerRuntime;
}

// ─── 辅助函数 ────────────────────────────────────────────────────────────────

function expressionContext(env: PlayerFSMEnv, extra?: Record<string, unknown>): ExpressionContext {
	return {
		currentTimeMs: env.runtime.currentTimeMs,
		tickIndex: env.runtime.tickIndex,
		casterId: env.id,
		targetId: env.runtime.targetId,
		skillLv: env.runtime.currentSkill?.data.lv,
		...(extra ?? {}),
	};
}

type PlayerSkillCost = { hpCost: number; mpCost: number };

/** XState action 接收完整事件联合；按 type 收窄到触发该 action 的精确事件。 */
function requireSkillUseEvent(event: PlayerFSMEvent): MemberUseSkillEvent {
	if (event.type !== "使用技能") throw new Error(`Player FSM 期望使用技能事件，实际收到 ${event.type}`);
	return event;
}

function requireSelectTargetEvent(event: PlayerFSMEvent): MemberSelectTargetEvent {
	if (event.type !== "切换目标") throw new Error(`Player FSM 期望切换目标事件，实际收到 ${event.type}`);
	return event;
}

function resolveCurrentSkillCost(env: PlayerFSMEnv): PlayerSkillCost | null {
	const skill = env.runtime.currentSkill?.data;
	const variant = env.runtime.currentSkill?.activeVariant;
	if (!skill || !variant) {
		log.error(`[${env.name}] 缺少技能或变体，无法计算技能消耗`);
		return null;
	}

	const evalCost = (expr: string | null | undefined, label: string): number | null => {
		const normalizedExpr = expr?.trim();
		if (!normalizedExpr) return 0;
		const cost = env.services.expressionEvaluator?.(normalizedExpr, {
			...expressionContext(env),
		});
		if (typeof cost === "number" && Number.isFinite(cost)) return cost;
		log.error(`[${env.name}] 技能${label}消耗不是有限数字`);
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
		log.error(`[${env.name}] skill.cost 管线输出不是有限数字`);
		return null;
	} catch (error) {
		log.error(`[${env.name}] skill.cost 管线执行失败`, error);
		return null;
	}
}

/**
 * 技能接纳条件的唯一计算入口。
 *
 * 这里与实际扣费共享 `resolveCurrentSkillCost`，因此 Buff、passive 和一次性消耗修正均通过
 * `skill.cost` Pipeline 生效；外部读面只能消费这里产生的拒绝事实，不能复制条件。
 */
function getSkillRejectionReason(env: PlayerFSMEnv, event: MemberUseSkillEvent): SkillRejectionReason | null {
	const skillId = event.data.skillId;
	const skill = env.runtime.data?.skills.find((candidate) => candidate.id === skillId);
	if (!skill) return "skill_not_found";

	const variant = selectPlayerSkillVariant(skill, env.runtime.data);
	if (!variant) return "variant_not_found";
	if (!variant.activeBehaviorTree && !variant.activeBehavior) return "no_active_behavior";

	const skillIndex = env.runtime.skillList.findIndex((candidate) => candidate.id === skillId);
	if (skillIndex < 0) return "skill_not_found";
	if ((env.runtime.skillCooldowns[skillIndex] ?? 0) > 0) return "cooldown_active";

	const cost = resolveCurrentSkillCost(env);
	if (!cost) return "cost_resolution_failed";
	if (cost.hpCost > env.statContainer.getValue("hp.current")) return "insufficient_hp";
	if (cost.mpCost > env.statContainer.getValue("mp.current")) return "insufficient_mp";
	return null;
}

// ─── 工厂函数 ────────────────────────────────────────────────────────────────

export const playerFSM = (env: PlayerFSMEnv): MemberStateMachine<PlayerFSMEvent, PlayerFSMContext> => {
	const machineId = `${env.id}-FSM`;

	const machineSetup = setup({
		types: {
			context: {} as PlayerFSMContext,
			events: {} as PlayerFSMEvent,
		},
	});

	const machine = machineSetup
		.extend({
			actions: {
				根据角色配置生成初始状态: () => {
					log.debug(`[${env.name}] 根据角色配置生成初始状态`);
				},
				设置允许移动: machineSetup.assign({ canMove: true }),
				设置禁止移动: machineSetup.assign({ canMove: false }),
				更新可移动性: machineSetup.assign(() => {
					return { canMove: false };
				}),
				切换当前目标: ({ event }) => {
					applyMemberTargetSelection(env, requireSelectTargetEvent(event));
				},
				添加待处理技能: ({ event }) => {
					const e = requireSkillUseEvent(event);
					const skillId = e.data.skillId;
					const skill = env.runtime.data?.skills?.find((s: EngineCharacterSkill) => s.id === skillId);
					if (!skill) {
						log.error(`[${env.name}] 技能不存在: ${skillId}`);
						return;
					}
					const skillVariant = selectPlayerSkillVariant(skill, env.runtime.data);
					if (!skillVariant) {
						log.error(`[${env.name}] 技能变体不存在: ${skillId}`);
						return;
					}
					env.runtime.currentSkill = {
						data: skill,
						activeVariant: skillVariant,
						lifecycle: computePlayerSkillLifecycle({
							variant: skillVariant,
							skillLv: skill.lv,
							expressionContext: expressionContext(env),
							evaluateExpression: (expr, ctx) => {
								const result = env.services.expressionEvaluator?.(expr, ctx);
								if (typeof result === "number" || typeof result === "boolean") return result;
								return 0;
							},
							runPipeline: (name, params) => env.runPipeline(name, params),
						}),
					};
					log.info(`[${env.name}] 已添加技能`, env.runtime.currentSkill);
				},
				清空待处理技能: () => {
					log.debug(`[${env.name}] 清空待处理技能`);
					env.runtime.previousSkill = env.runtime.currentSkill?.data || null;
					env.runtime.currentSkill = null;
					env.btManager.unregisterActiveEffectBt();
				},
				发布技能拒绝事实: ({ event }) => {
					const skillEvent = requireSkillUseEvent(event);
					const { skillId } = skillEvent.data;
					const reason = getSkillRejectionReason(env, skillEvent) ?? "cost_resolution_failed";
					env.notifyDomainEvent({
						type: "skill_input_rejected",
						memberId: env.id,
						skillId,
						inputId: skillEvent.id,
						reason,
					});
				},
				渲染警告信息: ({ event }) => {
					const skillEvent = requireSkillUseEvent(event);
					const skillId = skillEvent.data.skillId;
					env.notifyDomainEvent({
						type: "skill_cast_denied",
						memberId: env.id,
						skillId,
						reason: getSkillRejectionReason(env, skillEvent) ?? "cost_resolution_failed",
					});
				},
				发布技能接纳事实: ({ event }) => {
					// 这里只标记 FSM 已越过接纳边界，不参与技能排队、消耗或效果执行。
					const skillEvent = requireSkillUseEvent(event);
					const targetId = env.runtime.targetId;
					if (!targetId) throw new Error(`[${env.name}] 技能已接纳但缺少解析后的目标`);
					env.notifyDomainEvent({
						type: "skill_cast_accepted",
						memberId: env.id,
						skillId: skillEvent.data.skillId,
						targetId,
						inputId: skillEvent.id,
					});
				},
				发布忙碌技能拒绝事实: ({ event }) => {
					const skillEvent = requireSkillUseEvent(event);
					env.notifyDomainEvent({
						type: "skill_input_rejected",
						memberId: env.id,
						skillId: skillEvent.data.skillId,
						inputId: skillEvent.id,
						reason: "member_busy",
					});
					env.notifyDomainEvent({
						type: "skill_cast_denied",
						memberId: env.id,
						skillId: skillEvent.data.skillId,
						reason: "member_busy",
					});
				},
				创建警告结束通知: () => {
					log.debug(`[${env.name}] 创建警告结束通知`);
				},
				添加待处理技能效果: () => {
					const skillVariant = env.runtime.currentSkill?.activeVariant;
					if (!skillVariant) {
						log.error(`[${env.name}] 当前技能效果不存在`);
						return;
					}
					const activeTree = skillVariant.activeBehaviorTree;
					if (!activeTree) {
						const activeBehavior = skillVariant.activeBehavior;
						if (activeBehavior) {
							env.btManager.registerActiveEffectBt();
							return;
						}
						log.warn(`[${env.name}] 技能变体既没有 activeBehaviorTree 也没有 activeBehavior`);
						return;
					}
					const treeDefinition = activeTree.definition;
					const agentCode = activeTree.agent;
					const treeData = env.btManager.registerActiveEffectBt(treeDefinition, agentCode);
					if (!treeData) {
						log.error(`[${env.name}] 技能逻辑不是有效的行为树`, treeDefinition);
					}
					log.info(`[${env.name}] 已添加待处理技能效果`, activeTree);
				},
				技能消耗扣除: () => {
					const cost = resolveCurrentSkillCost(env);
					if (!cost) return;
					const skill = env.runtime.currentSkill?.data;
					const sourceName = skill?.template?.name ?? "skill-cost";
					const sourceSkillId = skill?.id ?? "unknown";
					if (cost.hpCost !== 0) {
						env.statContainer.addModifier("hp.current", ModifierType.DYNAMIC_FIXED, -cost.hpCost, {
							key: `skill.cost.hp.${sourceSkillId}`,
							name: `${sourceName}.hpCost`,
							type: "skill",
							chain: [
								{ kind: "member", id: env.id },
								{ kind: "skill", id: sourceSkillId },
								{ kind: "effect", id: "cost.hp" },
							],
						});
					}
					if (cost.mpCost !== 0) {
						env.statContainer.addModifier("mp.current", ModifierType.DYNAMIC_FIXED, -cost.mpCost, {
							key: `skill.cost.mp.${sourceSkillId}`,
							name: `${sourceName}.mpCost`,
							type: "skill",
							chain: [
								{ kind: "member", id: env.id },
								{ kind: "skill", id: sourceSkillId },
								{ kind: "effect", id: "cost.mp" },
							],
						});
					}
					// 下一技能消耗修正在扣费成功后消费；施法检查阶段也会运行 skill.cost，不能在管线内清理。
					env.statContainer.removeModifiersBySourceKeyPrefix(NEXT_SKILL_COST_SOURCE_ID_PREFIX);
					log.info(`[${env.name}] 已扣除技能消耗：Hp-${cost.hpCost}, Mp-${cost.mpCost}`);
				},
				重置控制抵抗时间: () => {
					log.debug(`[${env.name}] 重置控制抵抗时间`);
				},
				中断当前行为: () => {
					log.debug(`[${env.name}] 中断当前行为`);
				},
				启动受控动画: () => {
					log.debug(`[${env.name}] 启动受控动画`);
				},
			},
			guards: {
				施法条件不满足: ({ event }) => {
					return getSkillRejectionReason(env, requireSkillUseEvent(event)) !== null;
				},
				存在后续连击: () => {
					return false;
				},
				可移动: ({ context }) => {
					return context.canMove;
				},
				没有活动技能行为: () => !env.btManager.hasActiveEffectBt(),
			},
		})
		.createMachine({
			context: {
				isAlive: true,
				createdAtTimeMs: env.runtime.currentTimeMs,
				canMove: true,
			},
			id: machineId,
			initial: "存活",
			entry: { type: "根据角色配置生成初始状态" },
			on: {
				切换目标: { actions: { type: "切换当前目标" } },
			},
			states: {
				存活: {
					initial: "可操作状态",
					on: {
						死亡通知: { target: "死亡" },
					},
					states: {
						可操作状态: {
							type: "parallel",
							on: {
								受到控制: { target: "受控状态" },
							},
							states: {
								动作状态: {
									initial: "空闲状态",
									on: {
										使用技能: { actions: { type: "发布忙碌技能拒绝事实" } },
									},
									states: {
										空闲状态: {
											on: {
												使用格挡: { target: "格挡中" },
												使用闪躲: { target: "闪躲中" },
												使用技能: { target: "使用技能中" },
											},
											entry: { type: "设置允许移动" },
										},
										格挡中: {
											on: {
												结束格挡: { target: "空闲状态" },
											},
											entry: { type: "设置禁止移动" },
										},
										闪躲中: {
											on: {
												收到闪躲持续时间结束通知: { target: "空闲状态" },
											},
											entry: { type: "设置禁止移动" },
										},
										使用技能中: {
											initial: "初始化技能",
											entry: [{ type: "添加待处理技能" }, { type: "更新可移动性" }],
											exit: { type: "清空待处理技能" },
											states: {
												初始化技能: {
													always: [
														{
															target: "警告状态",
															guard: { type: "施法条件不满足" },
															actions: { type: "发布技能拒绝事实" },
														},
														{
															target: "技能执行过程",
															actions: { type: "发布技能接纳事实" },
														},
													],
												},
												警告状态: {
													entry: [{ type: "渲染警告信息" }, { type: "创建警告结束通知" }],
													always: {
														target: `#${machineId}.存活.可操作状态.动作状态.空闲状态`,
													},
												},
												技能执行过程: {
													entry: [{ type: "添加待处理技能效果" }, { type: "技能消耗扣除" }],
													always: {
														target: `#${machineId}.存活.可操作状态.动作状态.空闲状态`,
														guard: { type: "没有活动技能行为" },
													},
													on: {
														技能执行完成: [
															{
																target: `#${machineId}.存活.可操作状态.动作状态.使用技能中`,
																guard: { type: "存在后续连击" },
															},
															{
																target: `#${machineId}.存活.可操作状态.动作状态.空闲状态`,
															},
														],
													},
												},
											},
										},
									},
								},
								移动状态: {
									initial: "静止",
									states: {
										静止: {
											on: {
												移动: {
													target: "移动中",
													guard: { type: "可移动" },
												},
											},
										},
										移动中: {
											on: {
												停止移动: { target: "静止" },
											},
										},
									},
								},
							},
						},
						受控状态: {
							on: {
								控制结束: { target: "可操作状态" },
							},
							entry: [{ type: "重置控制抵抗时间" }, { type: "中断当前行为" }, { type: "启动受控动画" }],
						},
					},
				},
				死亡: {
					on: {
						复活: { target: "存活" },
					},
				},
			},
		});

	return machine;
};
