import { type EventObject, setup } from "xstate";
import { createLogger } from "~/lib/logger";
import { type DamageDispatchPayload, damageSourceKey } from "../../../Damage/types";
import { ModifierType } from "../../runtime/AttributeContainer/AttributeContainer";
import {
	createHitSession,
	type HitSession,
	resolveDamageAndApply,
	resolveHitCheck,
} from "../../runtime/StateMachine/DamageResolution";
import { applyMemberTargetSelection } from "../../runtime/StateMachine/targetSelection";
import type {
	MemberFSMContext,
	MemberFSMEvent,
	MemberSelectTargetEvent,
	MemberStateMachine,
	MemberStateMachineEnv,
} from "../../runtime/StateMachine/types";
import type { MobRuntime } from "../../runtime/types";
import type { Mob, MobAttrKey } from "./Mob";

const log = createLogger("MobSM");

/**
 * Mob特有的事件类型
 * 扩展MemberFSMEvent，包含Mob特有的状态机事件
 */
interface 修改属性 extends EventObject {
	type: "修改属性";
	data: { attr: string; value: number };
}
interface 修改buff extends EventObject {
	type: "修改buff";
	data: { buffId: string; value: number };
}
interface 受到攻击 extends EventObject {
	type: "受到攻击";
	data: {
		damageRequest: DamageDispatchPayload;
	};
}
interface 受到治疗 extends EventObject {
	type: "受到治疗";
	data: { origin: string; skillId: string };
}
interface 应用控制 extends EventObject {
	type: "应用控制";
}
interface 控制时间结束 extends EventObject {
	type: "控制时间结束";
}
interface 收到快照请求 extends EventObject {
	type: "收到快照请求";
	data: { senderId: string };
}
interface 收到目标快照 extends EventObject {
	type: "收到目标快照";
	data: { senderId: string };
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
interface 进行伤害计算 extends EventObject {
	type: "进行伤害计算";
}
interface 进行命中判定 extends EventObject {
	type: "进行命中判定";
}
interface 进行控制判定 extends EventObject {
	type: "进行控制判定";
}
interface 收到buff增删事件 extends EventObject {
	type: "收到buff增删事件";
	data: { buffId: string; value: number };
}

export type MobSpecificEvent =
	| 修改buff
	| 修改属性
	| 受到攻击
	| 受到治疗
	| 应用控制
	| 控制时间结束
	| 进行伤害计算
	| 进行命中判定
	| 进行控制判定
	| 收到buff增删事件
	| 收到快照请求
	| 收到目标快照;

export type MobFSMEvent = MemberFSMEvent<MobSpecificEvent>;

function requireSelectTargetEvent(event: MobFSMEvent): MemberSelectTargetEvent {
	if (event.type !== "切换目标") throw new Error(`Mob FSM 期望切换目标事件，实际收到 ${event.type}`);
	return event;
}

/** hitCheck → damageCalc → applyDamage 三管线之间的中间结果缓存。 */
export interface MobPendingHitResult {
	damageRequest: DamageDispatchPayload;
	hitRate: number;
	hit: boolean;
}

export interface MobPendingDamageResult {
	baseDamage: number;
	finalDamage: number;
	isFatal: boolean;
	crit: boolean;
}

// 新字段以 optional 方式加入，保留与 MemberFSMContext 的双向赋值兼容性（Member 泛型对 context 为不变）。
export interface MobFSMContext extends MemberFSMContext {
	hitSession?: HitSession | null;
}

export interface MobStateMachineEnv extends MemberStateMachineEnv<MobAttrKey, MobFSMEvent, MobRuntime> {
	runtime: MobRuntime;
}

const mobMachineSetup = setup({
	types: {
		context: {} as MobFSMContext,
		events: {} as MobFSMEvent,
		output: {} as Mob,
	},
});

const mobRaiseHitCheck = mobMachineSetup.raise({ type: "进行命中判定" });
const mobRaiseControlCheck = mobMachineSetup.raise({ type: "进行控制判定" });
const mobRaiseDamageCalc = mobMachineSetup.raise({ type: "进行伤害计算" });
const mobAssignHitSession = (name: string) => {
	return mobMachineSetup.assign(({ context, event }) => {
		log.debug(`👹 [${name}] 记录伤害请求`, event);
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
const mobClearHitSession = mobMachineSetup.assign({ hitSession: null });

export const createMobStateMachine = (env: MobStateMachineEnv): MemberStateMachine<MobFSMEvent, MobFSMContext> => {
	const machineId = env.id;

	return mobMachineSetup
		.extend({
			actions: {
				切换当前目标: ({ event }) => {
					applyMemberTargetSelection(env, requireSelectTargetEvent(event));
				},
				根据配置生成初始状态: ({ context, event }) => {
					// Add your action code here
					// ...
					log.debug(`👹 [${env.name}] 根据配置生成初始状态`, event);
				},
				重置控制抵抗时间: ({ context, event }) => {
					// Add your action code here
					// ...
					log.debug(`👹 [${env.name}] 重置控制抵抗时间`, event);
				},
				中断当前行为: ({ context, event }) => {
					// Add your action code here
					// ...
					log.debug(`👹 [${env.name}] 中断当前行为`, event);
					env.btManager.clearStateDeclarations();
				},
				重置到复活状态: ({ context, event }) => {
					// Add your action code here
					// ...
					log.debug(`👹 [${env.name}] 重置到复活状态`, event);
				},
				发送命中判定事件给自己: mobRaiseHitCheck,
				记录伤害请求: mobAssignHitSession(env.name),
				清空受击缓存: mobClearHitSession,
				反馈命中结果给施法者: ({ context, event }) => {
					// Add your action code here
					// ...
					log.debug(`👹 [${env.name}] 反馈命中结果给施法者`, event);
				},
				发送控制判定事件给自己: mobRaiseControlCheck,
				命中计算管线: ({ context, event }) => {
					log.debug(`👹 [${env.name}] 命中计算管线`, event);
					const session = context.hitSession;
					if (!session) {
						log.warn(`👹 [${env.name}] 命中计算管线：hitSession 为空，跳过`);
						return;
					}
					resolveHitCheck(env.runPipeline, session, env.services.random);
				},
				根据命中结果进行下一步: mobRaiseControlCheck,
				控制判定管线: ({ context, event }) => {
					// Add your action code here
					// ...
					log.debug(`👹 [${env.name}] 控制判定管线`, event);
				},
				反馈控制结果给施法者: ({ context, event }) => {
					// Add your action code here
					// ...
					log.debug(`👹 [${env.name}] 反馈控制结果给施法者`, event);
				},
				发送伤害计算事件给自己: mobRaiseDamageCalc,
				伤害计算管线: ({ context, event }) => {
					log.debug(`👹 [${env.name}] 伤害计算管线`, event);
					const session = context.hitSession;
					if (!session) {
						log.warn(`👹 [${env.name}] 伤害计算管线：hitSession 为空，跳过`);
						return;
					}
					resolveDamageAndApply(
						env.id,
						env.services.getCurrentTimeMs(),
						env.services.getTickIndex(),
						() => env.attributeContainer.getValue("hp.current"),
						() => env.attributeContainer.getValue("mp.current"),
						(value) =>
							env.attributeContainer.addModifier("hp.current", ModifierType.DYNAMIC_FIXED, value, {
								key: `damage.hp.${damageSourceKey(session.damageRequest)}`,
								name: "damage-hp",
								type: session.damageRequest.sourceSkillId ? "skill" : "system",
								chain: [
									{ kind: "member", id: session.damageRequest.sourceId },
									...(session.damageRequest.sourceSkillId
										? [{ kind: "skill" as const, id: session.damageRequest.sourceSkillId }]
										: []),
								],
							}),
						(value) =>
							env.attributeContainer.addModifier("mp.current", ModifierType.DYNAMIC_FIXED, value, {
								key: `damage.mp.${damageSourceKey(session.damageRequest)}`,
								name: "damage-mp",
								type: session.damageRequest.sourceSkillId ? "skill" : "system",
								chain: [
									{ kind: "member", id: session.damageRequest.sourceId },
									...(session.damageRequest.sourceSkillId
										? [{ kind: "skill" as const, id: session.damageRequest.sourceSkillId }]
										: []),
								],
							}),
						env.notifyDomainEvent,
						env.emitProc,
						env.runPipeline,
						env.services.expressionEvaluator,
						session,
					);
				},
				反馈伤害结果给施法者: ({ context, event }) => {
					// Add your action code here
					// ...
					log.debug(`👹 [${env.name}] 反馈伤害结果给施法者`, event);
				},
				发送属性修改事件给自己: ({ context, event }) => {
					// Add your action code here
					// ...
					log.debug(`👹 [${env.name}] 发送属性修改事件给自己`, event);
				},
				发送buff修改事件给自己: ({ context, event }) => {
					// Add your action code here
					// ...
					log.debug(`👹 [${env.name}] 发送buff修改事件给自己`, event);
				},
				logEvent: ({ context, event }) => {
					// Add your action code here
					// ...
					log.debug(`👹 [${env.name}] 日志事件`, event);
				},
			},
			guards: {
				是物理伤害: ({ context, event }) => {
					const damageRequest = (event as 受到攻击).data?.damageRequest ?? context.hitSession?.damageRequest;
					const res = damageRequest?.damageTags.includes("physical") ?? false;
					log.debug(`👹 [${env.name}] 判断是否是是物理伤害`, res);
					return res;
				},
			},
		})
		.createMachine({
			id: machineId,
			context: {
				isAlive: true,
				createdAtTimeMs: env.runtime.currentTimeMs,
				hitSession: null,
			},
			initial: "存活",
			entry: {
				type: "根据配置生成初始状态",
			},
			on: {
				切换目标: { actions: { type: "切换当前目标" } },
			},
			states: {
				存活: {
					initial: "可操作状态",
					on: {
						死亡通知: {
							target: "死亡",
						},
						受到攻击: {
							actions: [{ type: "记录伤害请求" }, { type: "发送命中判定事件给自己" }],
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
							actions: {
								type: "发送buff修改事件给自己",
							},
						},
						受到治疗: {
							target: "存活",
							actions: {
								type: "发送属性修改事件给自己",
							},
						},
						修改属性: {},
						修改buff: {},
					},
					description: "怪物存活状态，此时可操作且可影响上下文",
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
									tags: "movement-input-enabled",
									initial: "静止",
									states: {
										静止: {
											on: {
												移动: {
													target: "移动中",
												},
											},
										},
										移动中: {
											on: {
												停止移动: {
													target: "静止",
												},
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
							],
						},
					},
				},
				死亡: {
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
};
