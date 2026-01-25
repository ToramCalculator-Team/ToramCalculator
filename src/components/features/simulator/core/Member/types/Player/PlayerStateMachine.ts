import { assign, type EventObject, setup } from "xstate";
import { skillLogicExample } from "~/components/features/BtEditor/data/SkillExamples";
import type { Member } from "../../Member";
import type { MemberEventType, MemberStateContext, MemberStateMachine } from "../../runtime/StateMachine/types";
import type { PlayerRuntimeContext } from "./Agents/RuntimeContext";
import type { Player, PlayerAttrType } from "./Player";
import { MemberDomainEvent } from "../../../types";

/**
 * Player特有的事件类型
 * 扩展MemberEventType，包含Player特有的状态机事件
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
		origin: string;
		skillId: string;
		damageRequest?: {
			sourceId: string;
			targetId: string;
			skillId: string;
			damageType: "physical" | "magic";
			canBeDodged: boolean;
			canBeGuarded: boolean;
			damageFormula: string;
			extraVars?: Record<string, unknown>;
			sourceSnapshot?: Record<string, unknown>;
		};
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
interface 更新 extends EventObject {
	type: "更新";
	timestamp?: number;
}

export type PlayerEventType =
	| MemberEventType
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
	| 更新;

// 定义 PlayerStateContext 类型（提前声明）
export interface PlayerStateContext extends MemberStateContext {}

export const playerStateMachine = (
	member: Member<PlayerAttrType, PlayerEventType, PlayerStateContext, PlayerRuntimeContext>,
): MemberStateMachine<PlayerEventType, PlayerStateContext> => {
	// 类型断言：playerStateMachine 内部需要访问 Player 特有属性
	const player = member as Player;
	const machineId = player.id;
	const runtimeContext = player.runtimeContext;

	const machine = setup({
		types: {
			context: {} as PlayerStateContext,
			events: {} as PlayerEventType,
			output: {} as Player,
		},
		actions: {
			根据角色配置生成初始状态: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 根据角色配置生成初始状态`, event);
			},
			更新玩家状态: assign({
				currentFrame: ({ context }) => context.currentFrame + 1,
			}),
			启用站立动画: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 启用站立动画`, event);
			},
			启用移动动画: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 启用移动动画`, event);
			},
			显示警告: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 显示警告`, event);
				// 发出技能施放被拒绝事件
				const owner = context.owner;
				if (owner && (owner.runtimeContext as Record<string, unknown>).emitDomainEvent) {
					const emitDomainEvent = (owner.runtimeContext as Record<string, unknown>).emitDomainEvent as (event: import("../../../types").MemberDomainEvent) => void;
					// 从事件中获取技能ID（如果有）
					const skillId = (event as { data?: { skillId?: string } }).data?.skillId ?? "";
					emitDomainEvent({
						type: "skill_cast_denied",
						memberId: owner.id,
						skillId,
						reason: "技能可用性检查失败",
					});
				}
			},
			创建警告结束通知: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 创建警告结束通知`, event);
			},
			添加待处理技能: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 添加待处理技能`, event);
				const e = event as 使用技能;
				const skillId = e.data.skillId;
				const skill = player.activeCharacter.skills?.find((s) => s.id === skillId);
				if (!skill) {
					console.error(`🎮 [${context.owner?.name}] 的当前技能不存在`);
				}
				runtimeContext.currentSkill = skill ?? null;
			},
			清空待处理技能: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 清空待处理技能`, event);
				runtimeContext.previousSkill = runtimeContext.currentSkill;
				runtimeContext.currentSkill = null;
				runtimeContext.currentSkillEffect = null;
				runtimeContext.currentSkillLogic = null;
				if (runtimeContext.currentSkillTreeId) {
					player.btManager.unregisterSkillBt();
					runtimeContext.currentSkillTreeId = "unknown_skill";
				}
			},
			清理行为树: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 清理行为树`, event);
				player.btManager.clear();
			},
			添加待处理技能效果: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 添加待处理技能效果`, event);
				const skillEffect = runtimeContext.currentSkill?.template?.effects.find((e) =>
					runtimeContext.expressionEvaluator?.(e.condition, {
						currentFrame: runtimeContext.currentFrame,
						casterId: player.id,
						skillLv: runtimeContext.currentSkill?.lv ?? 0,
					}),
				);
				console.log(`技能效果`, skillEffect);
				runtimeContext.currentSkillEffect = skillEffect ?? null;
			},
			执行技能: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 执行技能`, event);
				console.log(`技能名称`, runtimeContext.currentSkill?.template?.name);

				const skillEffect = runtimeContext.currentSkillEffect;
				if (!skillEffect) {
					console.error(`🎮 [${context.owner?.name}] 当前技能效果不存在`);
					player.actor.send({ type: "技能执行完成" });
					return;
				}

				// 提取行为树定义
				// const treeDefinition = skillLogicExample.default.definition;
				// const agentCode = skillLogicExample.default.agent;

				const treeDefinition = skillEffect.logic.activeEffect.definition;
				const agentCode = skillEffect.logic.activeEffect.agent;

				const treeData = player.btManager.registerSkillBt(treeDefinition, agentCode);
				if (!treeData) {
					console.error(`🎮 [${context.owner?.name}] 技能逻辑不是有效的行为树 TreeData，已跳过执行`, treeDefinition);
					player.actor.send({ type: "技能执行完成" });
					return;
				}
			},
			重置控制抵抗时间: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 重置控制抵抗时间`, event);
			},
			中断当前行为: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 中断当前行为`, event);
			},
			启动受控动画: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 启动受控动画`, event);
			},
			重置到复活状态: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 重置到复活状态`, event);
			},
			发送命中判定事件给自己: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 发送命中判定事件给自己`, event);
				// 不使用 raise(...)，直接向自身发送事件（命令式），避免 XState dev build 警告
				player.actor.send({ type: "进行命中判定" });
			},
			反馈命中结果给施法者: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 反馈命中结果给施法者`, event);
			},
			发送控制判定事件给自己: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 发送控制判定事件给自己`, event);
				// 不要在自定义 action 中调用 raise(...)（非命令式），这里直接向自身发送事件即可
				player.actor.send({ type: "进行控制判定" });
			},
			命中计算管线: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 命中计算管线`, event);
			},
			根据命中结果进行下一步: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 根据命中结果进行下一步`, event);
				// 命中后再进入控制判定
				player.actor.send({ type: "进行控制判定" });
			},
			控制判定管线: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 控制判定管线`, event);
			},
			反馈控制结果给施法者: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 反馈控制结果给施法者`, event);
			},
			发送伤害计算事件给自己: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 发送伤害计算事件给自己`, event);
				player.actor.send({ type: "进行伤害计算" });
			},
			伤害计算管线: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 伤害计算管线`, event);
			},
			反馈伤害结果给施法者: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 反馈伤害结果给施法者`, event);
			},
			发送属性修改事件给自己: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 发送属性修改事件给自己`, event);
				const currentHp = player.statContainer.getValue("hp.current");
				player.actor.send({
					type: "修改属性",
					data: { attr: "hp.current", value: currentHp },
				});
			},
			发出属性变化域事件: ({ context, event }) => {
				const owner = context.owner;
				if (!owner) return;
				
				const emitDomainEvent = (owner.runtimeContext as Record<string, unknown>).emitDomainEvent as ((event: import("../../../types").MemberDomainEvent) => void) | undefined;
				if (!emitDomainEvent) return;
				
				const e = event as 修改属性;
				const attr = e.data?.attr;
				const newValue = e.data?.value ?? 0;
				
				// 获取当前属性值
				const hp = owner.statContainer.getValue("hp.current");
				const mp = owner.statContainer.getValue("mp.current");
				const position = owner.position;
				
				// 发出 state_changed 事件
				emitDomainEvent({
					type: "state_changed",
					memberId: owner.id,
					hp: attr === "hp.current" ? newValue : hp,
					mp: attr === "mp.current" ? newValue : mp,
					position,
				});
				
				// 如果是 HP 变化，检查是否受击/死亡
				// 注意：这里无法准确判断受击，因为不知道修改前的值
				// 受击/死亡事件应该由伤害系统直接发出
				if (attr === "hp.current" && newValue <= 0 && hp > 0) {
					// 死亡事件
					emitDomainEvent({
						type: "death",
						memberId: owner.id,
					});
				}
			},
			发出移动开始域事件: ({ context, event: _event }) => {
				const owner = context.owner;
				if (!owner) return;
				
				const emitDomainEvent = (owner.runtimeContext as Record<string, unknown>).emitDomainEvent as ((event: import("../../../types").MemberDomainEvent) => void) | undefined;
				if (!emitDomainEvent) return;
				
				emitDomainEvent({
					type: "move_started",
					memberId: owner.id,
					position: owner.position,
				});
			},
			发出移动停止域事件: ({ context, event: _event }) => {
				const owner = context.owner;
				if (!owner) return;
				
				const emitDomainEvent = (owner.runtimeContext as Record<string, unknown>).emitDomainEvent as ((event: import("../../../types").MemberDomainEvent) => void) | undefined;
				if (!emitDomainEvent) return;
				
				emitDomainEvent({
					type: "move_stopped",
					memberId: owner.id,
					position: owner.position,
				});
			},
			发出施法进度开始事件: ({ context, event: _event }) => {
				const owner = context.owner;
				if (!owner) return;

				const emitDomainEvent = (owner.runtimeContext as Record<string, unknown>).emitDomainEvent as
					| ((event: MemberDomainEvent) => void)
					| undefined;
				if (!emitDomainEvent) return;

				const skillId = runtimeContext.currentSkill?.id ?? "";
				if (!skillId) return;

				emitDomainEvent({
					type: "cast_progress",
					memberId: owner.id,
					skillId,
					progress: 0,
				});
			},
			发出施法进度结束事件: ({ context, event: _event }) => {
				const owner = context.owner;
				if (!owner) return;

				const emitDomainEvent = (owner.runtimeContext as Record<string, unknown>).emitDomainEvent as
					| ((event: MemberDomainEvent) => void)
					| undefined;
				if (!emitDomainEvent) return;

				const skillId = runtimeContext.currentSkill?.id ?? "";
				if (!skillId) return;

				emitDomainEvent({
					type: "cast_progress",
					memberId: owner.id,
					skillId,
					progress: 1,
				});
			},
			发送buff修改事件给自己: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 发送buff修改事件给自己`, event);
			},
			记录伤害请求: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 记录伤害请求`, event);
				const e = event as 受到攻击;
				const damageRequest = e.data?.damageRequest;
				if (damageRequest) {
					runtimeContext.currentDamageRequest = damageRequest;
				} else {
					runtimeContext.currentDamageRequest = undefined;
				}
			},
			修改目标Id: ({ context, event }, params: { targetId: string }) => {
				console.log(`👤 [${context.owner?.name}] 修改目标Id`, event);
				context.targetId = params.targetId;
			},
			logEvent: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 日志事件`, event);
			},
		},
		guards: {
			存在蓄力阶段: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 判断技能是否有蓄力阶段`, event);

				const effect = runtimeContext.currentSkillEffect;
				if (!effect) {
					console.error(`👤 [${context.owner?.name}] 技能效果不存在`);
					return false;
				}

				// 蓄力阶段相关属性（假设使用chargeFixed和chargeModified）
				const reservoirFixed = runtimeContext.expressionEvaluator?.(effect.reservoirFixed ?? "0", {
					currentFrame: context.currentFrame,
					casterId: player.id,
				});
				if (typeof reservoirFixed !== "number") {
					console.error(`👤 [${context.owner?.name}] 蓄力阶段固定值不是数字`);
					return false;
				}
				const reservoirModified = runtimeContext.expressionEvaluator?.(effect.reservoirModified ?? "0", {
					currentFrame: context.currentFrame,
					casterId: player.id,
				});
				if (typeof reservoirModified !== "number") {
					console.error(`👤 [${context.owner?.name}] 蓄力阶段可加速值不是数字`);
					return false;
				}
				console.log(reservoirFixed + reservoirModified > 0 ? "有蓄力阶段" : "没有蓄力阶段");
				return reservoirFixed + reservoirModified > 0;
			},
			存在咏唱阶段: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 判断技能是否有咏唱阶段`, event);
				const effect = runtimeContext.currentSkillEffect;
				if (!effect) {
					console.error(`👤 [${context.owner?.name}] 技能效果不存在`);
					return false;
				}
				const chantingFixed = runtimeContext.expressionEvaluator?.(effect.chantingFixed ?? "0", {
					currentFrame: context.currentFrame,
					casterId: player.id,
				});
				if (typeof chantingFixed !== "number") {
					console.error(`👤 [${context.owner?.name}] 咏唱阶段固定值不是数字`);
					return false;
				}
				const chantingModified = runtimeContext.expressionEvaluator?.(effect.chantingModified ?? "0", {
					currentFrame: context.currentFrame,
					casterId: player.id,
				});
				if (typeof chantingModified !== "number") {
					console.error(`👤 [${context.owner?.name}] 咏唱阶段可加速值不是数字`);
					return false;
				}
				console.log(chantingFixed + chantingModified > 0 ? "有咏唱阶段" : "没有咏唱阶段");
				return chantingFixed + chantingModified > 0;
			},
			存在后续连击: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 判断技能是否有后续连击`, event);
				// Add your guard condition here
				return false;
			},
			没有可用技能效果: ({ context, event }) => {
				// Add your guard condition here
				console.log(`👤 [${context.owner?.name}] 判断技能是否有可用效果`, event);
				const e = event as 使用技能;
				const skillId = e.data.skillId;
				const skill = runtimeContext.currentSkill;
				if (!skill) {
					console.error(`🎮 [${context.owner?.name}] 技能不存在: ${skillId}`);
					return true;
				}
				const effect = skill.template?.effects.find((e) => {
					const result = runtimeContext.expressionEvaluator?.(e.condition, {
						currentFrame: context.currentFrame,
						casterId: player.id,
						skillLv: skill?.lv ?? 0,
					});
					console.log(`🔍 技能效果条件检查: ${e.condition} = ${result} (类型: ${typeof result})`);
					return !!result; // 明确返回布尔值进行比较
				});
				if (!effect) {
					console.error(`🎮 [${context.owner?.name}] 技能效果不存在: ${skillId}`);
					return true;
				}
				console.log(`🎮 [${context.owner?.name}] 的技能 ${skill.template?.name} 可用`);
				return false;
			},
			还未冷却: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 判断技能是否还未冷却`, event);
				const res = runtimeContext.skillCooldowns?.[runtimeContext.currentSkillIndex ?? 0];
				if (res === undefined) {
					console.log(`- 该技能不存在冷却时间`);
					return false;
				}
				if (res <= 0) {
					console.log(`- 该技能处于冷却状态`);
					return false;
				}
				console.log(`- 该技能未冷却，剩余冷却时间：${res}`);
				return true;
			},
			施法条件不满足: ({ context, event }) => {
				// 此守卫通过后说明技能可发动，则更新当前技能数据
				const e = event as 使用技能;
				const skillId = e.data.skillId;

				const skill = runtimeContext.currentSkill;
				if (!skill) {
					console.error(`🎮 [${context.owner?.name}] 技能不存在: ${skillId}`);
					return true;
				}
				const effect = skill.template?.effects.find((e) => {
					const result = runtimeContext.expressionEvaluator?.(e.condition, {
						currentFrame: context.currentFrame,
						casterId: player.id,
						skillLv: skill?.lv ?? 0,
					});
					console.log(`🔍 技能效果条件检查: ${e.condition} = ${result} (类型: ${typeof result})`);
					return !!result; // 明确返回布尔值进行比较
				});
				if (!effect) {
					console.error(`🎮 [${context.owner?.name}] 技能效果不存在: ${skillId}`);
					return true;
				}
				if (effect.hpCost && effect.mpCost) {
					const hpCost = runtimeContext.expressionEvaluator?.(effect.hpCost, {
						currentFrame: context.currentFrame,
						casterId: player.id,
						skillLv: skill?.lv ?? 0,
					});
					if (typeof hpCost !== "number") {
						console.error(`👤 [${context.owner?.name}] 技能HP消耗不是数字`);
						return true;
					}
					const mpCost = runtimeContext.expressionEvaluator?.(effect.mpCost, {
						currentFrame: context.currentFrame,
						casterId: player.id,
						skillLv: skill?.lv ?? 0,
					});
					if (typeof mpCost !== "number") {
						console.error(`👤 [${context.owner?.name}] 技能MP消耗不是数字`);
						return true;
					}
					if (
						hpCost > player.statContainer.getValue("hp.current") ||
						mpCost > player.statContainer.getValue("mp.current")
					) {
						console.log(`- 该技能不满足施法消耗，HP:${hpCost} MP:${mpCost}`);
						// 这里需要撤回RS的修改
						return true;
					}
					console.log(`- 该技能满足施法消耗，HP:${hpCost} MP:${mpCost}`);
				} else {
					console.error(`🎮 [${context.owner?.name}] 技能消耗表达式不存在`);
					return true; // 视为不满足施法条件
				}
				return false;
			},
			技能带有心眼: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 判断技能是否有心眼`, event);
				return true;
			},
			目标不抵抗此技能的控制效果: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 判断目标是否不抵抗此技能的控制效果`, event);
				return true;
			},
			目标抵抗此技能的控制效果: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 判断目标是否抵抗此技能的控制效果`, event);
				return true;
			},
			是物理伤害: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 判断技能是否是物理伤害`, event);
				return true;
			},
			满足存活条件: ({ context, event }) => {
				console.log(`👤 [${context.owner?.name}] 判断玩家是否满足存活条件`, event);
				const hp = player.statContainer.getValue("hp.current");
				const isAlive = hp > 0;
				context.isAlive = isAlive;
				return isAlive;
			},
		},
	}).createMachine({
		context: {
			targetId: player.id,
			isAlive: true,
			position: player.position,
			createdAtFrame: 0,
			currentFrame: 0,
			statusTags: [],
			owner: player,
		},
		id: machineId,
		initial: "存活",
		on: {
			更新: {
				actions: [
					{
						type: "更新玩家状态",
					},
				],
			},
		},
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
							target: "存活",
							guard: {
								type: "满足存活条件",
							},
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
											{ type: "发出施法进度开始事件" },
											{ type: "添加待处理技能效果" },
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
