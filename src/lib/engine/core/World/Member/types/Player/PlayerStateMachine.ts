import type { CharacterSkillWithRelations } from "@db/generated/repositories/character_skill";
import { type EventObject, fromPromise, setup } from "xstate";
import type { ExpressionContext } from "~/lib/engine/core/JSProcessor/types";
import { createLogger } from "~/lib/Logger";
import { ModifierType } from "../../runtime/StatContainer/StatContainer";
import type {
	MemberFSMEvent,
	MemberFSMContext,
	MemberStateMachine,
	MemberStateMachineEnv,
} from "../../runtime/StateMachine/types";
import type { PlayerRuntime } from "../../runtime/types";
import { selectPlayerSkillVariant, computePlayerSkillLifecycleMs } from "./skillLifecycle";
import { PlayerAttrKey } from "./PlayerAttrSchema";

const log = createLogger("PlayerFSM");

// ─── 事件类型 ───────────────────────────────────────────────────────────────

interface Hp小于0 extends EventObject { type: "Hp小于0" }
interface 受到控制 extends EventObject { type: "受到控制" }
interface 控制结束 extends EventObject { type: "控制结束" }
interface 复活 extends EventObject { type: "复活" }
interface 使用格挡 extends EventObject { type: "使用格挡" }
interface 结束格挡 extends EventObject { type: "结束格挡" }
interface 使用闪躲 extends EventObject { type: "使用闪躲" }
interface 收到闪躲持续时间结束通知 extends EventObject { type: "收到闪躲持续时间结束通知" }
interface 使用技能 extends EventObject {
	type: "使用技能";
	data: { target: string; skillId: string };
}
interface 收到警告结束通知 extends EventObject { type: "收到警告结束通知" }
interface 移动 extends EventObject { type: "移动" }
interface 停止 extends EventObject { type: "停止" }

export type PlayerFSMEvent =
	| MemberFSMEvent
	| Hp小于0
	| 受到控制
	| 控制结束
	| 复活
	| 使用格挡
	| 结束格挡
	| 使用闪躲
	| 收到闪躲持续时间结束通知
	| 使用技能
	| 收到警告结束通知
	| 移动
	| 停止;

// ─── Context / Env ──────────────────────────────────────────────────────────

export interface PlayerFSMContext extends MemberFSMContext {
	canMove: boolean;
}

export interface PlayerFSMEnv
	extends MemberStateMachineEnv<PlayerAttrKey, PlayerFSMEvent, PlayerRuntime> {
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

// ─── 工厂函数 ────────────────────────────────────────────────────────────────

export const playerFSM = (
	env: PlayerFSMEnv,
): MemberStateMachine<PlayerFSMEvent, PlayerFSMContext> => {
	const machineId = `${env.id}-FSM`;

	const machineSetup = setup({
		types: {
			context: {} as PlayerFSMContext,
			events: {} as PlayerFSMEvent,
		},
		actors: {
			启动行为树: fromPromise<void, void>(() => {
				if (!env.btManager.hasActiveEffectBt()) {
					log.warn(`[${env.name}] 技能没有注册行为树，立即完成执行`);
					return Promise.resolve();
				}
				return new Promise<void>((resolve) => {
					env.btManager.onActiveEffectDone(resolve);
				});
			}),
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
				添加待处理技能: ({ event }) => {
					const e = event as 使用技能;
					const skillId = e.data.skillId;
					const skill = env.runtime.data?.skills?.find(
						(s: CharacterSkillWithRelations) => s.id === skillId,
					);
					if (!skill) {
						log.error(`[${env.name}] 技能不存在: ${skillId}`);
						throw new Error(`技能不存在: ${skillId}`);
					}
					const skillVariant = selectPlayerSkillVariant(skill, env.runtime.data);
					if (!skillVariant) {
						log.error(`[${env.name}] 技能变体不存在: ${skillId}`);
						throw new Error(`技能变体不存在: ${skillId}`);
					}
					env.runtime.currentSkill = {
						data: skill,
						activeVariant: skillVariant,
						lifecycle: computePlayerSkillLifecycleMs({
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
					const resolvedTargetId =
						env.services.targetResolver?.(env.id, e.data.target) ?? e.data.target;
					env.runtime.targetId = resolvedTargetId || env.id;
					log.info(`[${env.name}] 已添加技能`, env.runtime.currentSkill);
				},
				清空待处理技能: () => {
					log.debug(`[${env.name}] 清空待处理技能`);
					env.runtime.previousSkill = env.runtime.currentSkill?.data || null;
					env.runtime.currentSkill = null;
					env.btManager.unregisterActiveEffectBt();
				},
				渲染警告信息: ({ event }) => {
					const skillId = (event as { data?: { skillId?: string } }).data?.skillId ?? "";
					env.notifyDomainEvent({
						type: "skill_cast_denied",
						memberId: env.id,
						skillId,
						reason: "技能可用性检查失败",
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
					log.info(`[${env.name}] 已添加待处理技能效果`, activeTree)
				},
				技能消耗扣除: () => {
					const cost = resolveCurrentSkillCost(env);
					if (!cost) return;
					const skill = env.runtime.currentSkill?.data;
					const sourceName = skill?.template?.name ?? "skill-cost";
					const sourceSkillId = skill?.id ?? "unknown";
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
					const e = event as 使用技能;
					const skillId = e.data.skillId;
					const skill = env.runtime.currentSkill?.data;
					if (!skill) {
						log.error(`[${env.name}] 技能不存在: ${skillId}`);
						return true;
					}
					const variant = selectPlayerSkillVariant(skill, env.runtime.data);
					if (!variant) {
						log.error(`[${env.name}] 技能变体不存在: ${skillId}`);
						return true;
					}
					const skillIndex = env.runtime.skillList.findIndex((s) => s.id === skillId);
					const cooldown = skillIndex >= 0 ? env.runtime.skillCooldowns[skillIndex] : undefined;
					if (cooldown !== undefined && cooldown > 0) {
						log.debug(`[${env.name}] 技能未冷却，剩余: ${cooldown}`);
						return true;
					}
					const cost = resolveCurrentSkillCost(env);
					if (!cost) return true;
					if (
						cost.hpCost > env.statContainer.getValue("hp.current") ||
						cost.mpCost > env.statContainer.getValue("mp.current")
					) {
						log.debug(`[${env.name}] 不满足施法消耗`);
						return true;
					}
					return false;
				},
				存在后续连击: () => {
					return false;
				},
				可移动: ({ context }) => {
					return context.canMove;
				},
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
			states: {
				存活: {
					initial: "可操作状态",
					on: {
						Hp小于0: { target: "死亡" },
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
											entry: [
												{ type: "添加待处理技能" },
												{ type: "更新可移动性" },
											],
											exit: { type: "清空待处理技能" },
											states: {
												初始化技能: {
													always: [
														{
															target: "警告状态",
															guard: { type: "施法条件不满足" },
														},
														{ target: "技能执行过程" },
													],
												},
												警告状态: {
													on: {
														收到警告结束通知: {
															target: `#${machineId}.存活.可操作状态.动作状态.空闲状态`,
														},
													},
													entry: [
														{ type: "渲染警告信息" },
														{ type: "创建警告结束通知" },
													],
												},
												技能执行过程: {
													entry: [
														{ type: "添加待处理技能效果" },
														{ type: "技能消耗扣除" },
													],
													invoke: {
														src: "启动行为树",
														onDone: [
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
												停止: { target: "静止" },
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
							entry: [
								{ type: "重置控制抵抗时间" },
								{ type: "中断当前行为" },
								{ type: "启动受控动画" },
							],
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
