import { assign, type EventObject, setup } from "xstate";
import { createLogger } from "~/lib/Logger";
import type {
	MemberEventType,
	MemberStateContext,
	MemberStateMachine,
} from "../../runtime/StateMachine/types";
import type { Mob } from "./Mob";

const log = createLogger("MobSM");

/**
 * Mob特有的事件类型
 * 扩展MemberEventType，包含Mob特有的状态机事件
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
interface 使用技能 extends EventObject {
	type: "使用技能";
	data: { skillId: string };
}
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
	data: { origin: string; skillId: string };
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
interface 收到前摇结束通知 extends EventObject {
	type: "收到前摇结束通知";
}
interface 收到发动结束通知 extends EventObject {
	type: "收到发动结束通知";
}
interface 收到咏唱结束通知 extends EventObject {
	type: "收到咏唱结束通知";
}
interface 收到蓄力结束通知 extends EventObject {
	type: "收到蓄力结束通知";
}

export type MobEventType =
	| MemberEventType
	| 复活
	| 移动
	| 修改buff
	| 使用技能
	| 修改属性
	| 停止移动
	| 受到攻击
	| 受到治疗
	| 应用控制
	| 控制时间结束
	| 进行伤害计算
	| 进行命中判定
	| 进行控制判定
	| 收到buff增删事件
	| 收到前摇结束通知
	| 收到发动结束通知
	| 收到咏唱结束通知
	| 收到蓄力结束通知
	| 收到快照请求
	| 收到目标快照;

export interface MobStateContext extends MemberStateContext {}

export const createMobStateMachine = (
	mob: Mob,
): MemberStateMachine<MobEventType, MobStateContext> => {
	const machineId = mob.id;

	return setup({
		types: {
			context: {} as MobStateContext,
			events: {} as MobEventType,
			output: {} as Mob,
		},
		actions: {
			根据配置生成初始状态: ({ context, event }) => {
				// Add your action code here
				// ...
				log.debug(`👹 [${context.owner?.name}] 根据配置生成初始状态`, event);
			},
			启用站立动画: ({ context, event }) => {
				// Add your action code here
				// ...
				log.debug(`👹 [${context.owner?.name}] 启用站立动画`, event);
			},
			启用移动动画: ({ context, event }) => {
				// Add your action code here
				// ...
				log.debug(`👹 [${context.owner?.name}] 启用移动动画`, event);
			},
			启用前摇动画: ({ context, event }) => {
				// Add your action code here
				// ...
				log.debug(`👹 [${context.owner?.name}] 启用前摇动画`, event);
			},
			计算前摇时长: ({ context, event }) => {
				// Add your action code here
				// ...
				log.debug(`👹 [${context.owner?.name}] 计算前摇时长`, event);
			},
			创建前摇结束通知: ({ context, event }) => {
				// Add your action code here
				// ...
				log.debug(`👹 [${context.owner?.name}] 创建前摇结束通知`, event);
			},
			启用蓄力动画: ({ context, event }) => {
				// Add your action code here
				// ...
				log.debug(`👹 [${context.owner?.name}] 启用蓄力动画`, event);
			},
			计算蓄力时长: ({ context, event }) => {
				// Add your action code here
				// ...
				log.debug(`👹 [${context.owner?.name}] 计算蓄力时长`, event);
			},
			创建蓄力结束通知: ({ context, event }) => {
				// Add your action code here
				// ...
				log.debug(`👹 [${context.owner?.name}] 创建蓄力结束通知`, event);
			},
			启用咏唱动画: ({ context, event }) => {
				// Add your action code here
				// ...
				log.debug(`👹 [${context.owner?.name}] 启用咏唱动画`, event);
			},
			计算咏唱时长: ({ context, event }) => {
				// Add your action code here
				// ...
				log.debug(`👹 [${context.owner?.name}] 计算咏唱时长`, event);
			},
			创建咏唱结束通知: ({ context, event }) => {
				// Add your action code here
				// ...
				log.debug(`👹 [${context.owner?.name}] 创建咏唱结束通知`, event);
			},
			启用技能发动动画: ({ context, event }) => {
				// Add your action code here
				// ...
				log.debug(`👹 [${context.owner?.name}] 启用技能发动动画`, event);
			},
			计算发动时长: ({ context, event }) => {
				// Add your action code here
				// ...
				log.debug(`👹 [${context.owner?.name}] 计算发动时长`, event);
			},
			创建发动结束通知: ({ context, event }) => {
				// Add your action code here
				// ...
				log.debug(`👹 [${context.owner?.name}] 创建发动结束通知`, event);
			},
			技能效果管线: ({ context, event }) => {
				// Add your action code here
				// ...
				log.debug(`👹 [${context.owner?.name}] 技能效果管线`, event);
			},
			重置控制抵抗时间: ({ context, event }) => {
				// Add your action code here
				// ...
				log.debug(`👹 [${context.owner?.name}] 重置控制抵抗时间`, event);
			},
			中断当前行为: ({ context, event }) => {
				// Add your action code here
				// ...
				log.debug(`👹 [${context.owner?.name}] 中断当前行为`, event);
			},
			启动受控动画: ({ context, event }) => {
				// Add your action code here
				// ...
				log.debug(`👹 [${context.owner?.name}] 启动受控动画`, event);
			},
			重置到复活状态: ({ context, event }) => {
				// Add your action code here
				// ...
				log.debug(`👹 [${context.owner?.name}] 重置到复活状态`, event);
			},
			发送命中判定事件给自己: ({ context, event }) => {
				// Add your action code here
				// ...
				log.debug(
					`👹 [${context.owner?.name}] 发送命中判定事件给自己`,
					event,
				);
			},
			反馈命中结果给施法者: ({ context, event }) => {
				// Add your action code here
				// ...
				log.debug(`👹 [${context.owner?.name}] 反馈命中结果给施法者`, event);
			},
			发送控制判定事件给自己: ({ context, event }) => {
				// Add your action code here
				// ...
				log.debug(
					`👹 [${context.owner?.name}] 发送控制判定事件给自己`,
					event,
				);
			},
			命中计算管线: ({ context, event }) => {
				// Add your action code here
				// ...
				log.debug(`👹 [${context.owner?.name}] 命中计算管线`, event);
			},
			根据命中结果进行下一步: ({ context, event }) => {
				// Add your action code here
				// ...
				log.debug(
					`👹 [${context.owner?.name}] 根据命中结果进行下一步`,
					event,
				);
			},
			控制判定管线: ({ context, event }) => {
				// Add your action code here
				// ...
				log.debug(`👹 [${context.owner?.name}] 控制判定管线`, event);
			},
			反馈控制结果给施法者: ({ context, event }) => {
				// Add your action code here
				// ...
				log.debug(`👹 [${context.owner?.name}] 反馈控制结果给施法者`, event);
			},
			发送伤害计算事件给自己: ({ context, event }) => {
				// Add your action code here
				// ...
				log.debug(
					`👹 [${context.owner?.name}] 发送伤害计算事件给自己`,
					event,
				);
			},
			伤害计算管线: ({ context, event }) => {
				// Add your action code here
				// ...
				log.debug(`👹 [${context.owner?.name}] 伤害计算管线`, event);
			},
			反馈伤害结果给施法者: ({ context, event }) => {
				// Add your action code here
				// ...
				log.debug(`👹 [${context.owner?.name}] 反馈伤害结果给施法者`, event);
			},
			发送属性修改事件给自己: ({ context, event }) => {
				// Add your action code here
				// ...
				log.debug(
					`👹 [${context.owner?.name}] 发送属性修改事件给自己`,
					event,
				);
			},
			发送buff修改事件给自己: ({ context, event }) => {
				// Add your action code here
				// ...
				log.debug(
					`👹 [${context.owner?.name}] 发送buff修改事件给自己`,
					event,
				);
			},
			logEvent: ({ context, event }) => {
				// Add your action code here
				// ...
				log.debug(`👹 [${context.owner?.name}] 日志事件`, event);
			},
		},
		guards: {
			存在蓄力阶段: ({ context, event }) => {
				log.debug(`👹 [${context.owner?.name}] 存在蓄力阶段`, event);
				// Add your guard condition here
				return true;
			},
			存在咏唱阶段: ({ context, event }) => {
				log.debug(`👹 [${context.owner?.name}] 存在咏唱阶段`, event);
				// Add your guard condition here
				return true;
			},
			存在后续连击: ({ context, event }) => {
				log.debug(`👹 [${context.owner?.name}] 存在后续连击`, event);
				// Add your guard condition here
				return true;
			},
			是物理伤害: ({ context, event }) => {
				log.debug(`👹 [${context.owner?.name}] 是物理伤害`, event);
				// Add your guard condition here
				return true;
			},
			满足存活条件: ({ context, event }) => {
				log.debug(`👹 [${context.owner?.name}] 满足存活条件`, event);
				// Add your guard condition here
				return true;
			},
		},
	}).createMachine({
		id: machineId,
		context: {
			isAlive: true,
			createdAtFrame: mob.runtime.currentFrame,
			owner: mob,
		},
		initial: "存活",
		entry: {
			type: "根据配置生成初始状态",
		},
		states: {
			存活: {
				initial: "可操作状态",
				on: {
					受到攻击: [
						{
							actions: {
								type: "发送命中判定事件给自己",
							},
							guard: {
								type: "是物理伤害",
							},
						},
						{
							actions: [
								{
									type: "反馈命中结果给施法者",
								},
								{
									type: "发送控制判定事件给自己",
								},
							],
						},
					],
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
					修改属性: [
						{
							target: "存活",
							guard: {
								type: "满足存活条件",
							},
						},
						{
							target: "死亡",
						},
					],
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
								initial: "静止",
								on: {
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
							技能处理状态: {
								initial: "初始化技能",
								states: {
									初始化技能: {
										always: {
											target: "执行技能中",
										},
									},
									执行技能中: {
										initial: "前摇中",
										states: {
											前摇中: {
												on: {
													收到前摇结束通知: [
														{
															target: "蓄力中",
															guard: {
																type: "存在蓄力阶段",
															},
														},
														{
															target: "咏唱中",
															guard: {
																type: "存在咏唱阶段",
															},
														},
														{
															target: "发动中",
														},
													],
												},
												entry: [
													{
														type: "启用前摇动画",
													},
													{
														type: "计算前摇时长",
													},
													{
														type: "创建前摇结束通知",
													},
												],
											},
											蓄力中: {
												on: {
													收到蓄力结束通知: [
														{
															target: "咏唱中",
															guard: {
																type: "存在咏唱阶段",
															},
														},
														{
															target: "发动中",
														},
													],
												},
												entry: [
													{
														type: "启用蓄力动画",
													},
													{
														type: "计算蓄力时长",
													},
													{
														type: "创建蓄力结束通知",
													},
												],
											},
											咏唱中: {
												on: {
													收到咏唱结束通知: {
														target: "发动中",
													},
												},
												entry: [
													{
														type: "启用咏唱动画",
													},
													{
														type: "计算咏唱时长",
													},
													{
														type: "创建咏唱结束通知",
													},
												],
											},
											发动中: {
												on: {
													收到发动结束通知: [
														{
															target: `#${machineId}.存活.可操作状态.技能处理状态.初始化技能`,
															guard: {
																type: "存在后续连击",
															},
														},
														{
															target: `#${machineId}.存活.可操作状态.空闲状态`,
														},
													],
												},
												entry: [
													{
														type: "启用技能发动动画",
													},
													{
														type: "计算发动时长",
													},
													{
														type: "创建发动结束通知",
													},
													{
														type: "技能效果管线",
													},
												],
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
							{
								type: "启动受控动画",
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
