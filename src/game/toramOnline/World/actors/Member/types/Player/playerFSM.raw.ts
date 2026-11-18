import { and, setup } from "xstate";

export const machine = setup({
	types: {
		context: {} as {},
		events: {} as
			| { type: "停止" }
			| { type: "复活" }
			| { type: "移动" }
			| { type: "Hp小于0" }
			| { type: "使用格挡" }
			| { type: "使用闪躲" }
			| { type: "应用控制" }
			| { type: "控制结束" }
			| { type: "结束格挡" }
			| { type: "技能执行完毕" }
			| { type: "闪躲动作结束" }
			| { type: "使用技能" }
			| { type: "警告结束" },
	},
	actions: {
		根据角色配置生成初始状态: ({ context, event }, params) => {
			// Add your action code here
			// ...
		},
		设置允许移动: ({ context, event }, params) => {
			// Add your action code here
			// ...
		},
		设置禁止移动: ({ context, event }, params) => {
			// Add your action code here
			// ...
		},
		扣除技能消耗: ({ context, event }, params) => {
			// Add your action code here
			计算技能消耗;
			扣除技能消耗;
		},
		执行技能行为: ({ context, event }, params) => {
			// Add your action code here
			// ...
		},
		渲染警告信息: ({ context, event }, params) => {
			// Add your action code here
			// ...
		},
		创建警告结束通知: ({ context, event }, params) => {
			// Add your action code here
			// ...
		},
		重置控制抵抗时间: ({ context, event }, params) => {
			// Add your action code here
			// ...
		},
		中断当前行为: ({ context, event }, params) => {
			// Add your action code here
			// ...
		},
		启动受控动画: ({ context, event }, params) => {
			// Add your action code here
			// ...
		},
		重置到复活状态: ({ context, event }, params) => {
			// Add your action code here
			// ...
		},
	},
	guards: {
		可移动: ({ context, event }) => {
			// Add your guard condition here
			return true;
		},
		"存在后续技能，且满足技能可用条件": ({ context, event }) => {
			// Add your guard condition here
			return true;
		},
		"存在后续技能，但不满足技能可用条件": ({ context, event }) => {
			// Add your guard condition here
			return true;
		},
		满足技能可用条件: and([
			({ context, event }) => {
				// Add a guard condition here
				当前MP大于技能MP需求;
				return true;
			},
			({ context, event }) => {
				// Add another guard condition here
				当前与目标的距离小于技能射程;
				return true;
			},
			({ context, event }) => {
				// Add another guard condition here
				不附带心眼效果或者目标不处在技能附带的异常状态抵抗期间;
				return true;
			},
		]),
	},
}).createMachine({
	context: {},
	id: "Player",
	initial: "存活",
	entry: {
		type: "根据角色配置生成初始状态",
	},
	states: {
		存活: {
			initial: "可操作状态",
			on: {
				Hp小于0: {
					target: "死亡",
				},
			},
			description: "玩家存活状态，此时可操作且可影响上下文",
			states: {
				可操作状态: {
					type: "parallel",
					on: {
						应用控制: {
							target: "受控状态",
						},
					},
					description: "可响应输入操作",
					states: {
						运动状态: {
							initial: "静止",
							states: {
								静止: {
									on: {
										移动: {
											target: "移动中",
											guard: {
												type: "可移动",
											},
										},
									},
								},
								移动中: {
									on: {
										停止: {
											target: "静止",
										},
									},
								},
							},
						},
						动作状态: {
							initial: "空闲状态",
							states: {
								空闲状态: {
									on: {
										使用闪躲: {
											target: "闪躲中",
										},
										使用格挡: {
											target: "格挡中",
										},
										使用技能: [
											{
												target: "使用技能中",
												guard: {
													type: "满足技能可用条件",
												},
											},
											{
												target: "警告状态",
											},
										],
									},
									entry: {
										type: "设置允许移动",
									},
								},
								闪躲中: {
									on: {
										闪躲动作结束: {
											target: "空闲状态",
										},
									},
									entry: {
										type: "设置禁止移动",
									},
								},
								格挡中: {
									on: {
										结束格挡: {
											target: "空闲状态",
										},
									},
									entry: {
										type: "设置禁止移动",
									},
								},
								使用技能中: {
									on: {
										技能执行完毕: [
											{
												target: "使用技能中",
												guard: {
													type: "存在后续技能，且满足技能可用条件",
												},
											},
											{
												target: "警告状态",
												guard: {
													type: "存在后续技能，但不满足技能可用条件",
												},
											},
											{
												target: "空闲状态",
											},
										],
									},
									entry: [
										{
											type: "扣除技能消耗",
										},
										{
											type: "执行技能行为",
										},
										{
											type: "设置禁止移动",
										},
									],
								},
								警告状态: {
									on: {
										警告结束: {
											target: "空闲状态",
										},
									},
									entry: [
										{
											type: "渲染警告信息",
										},
										{
											type: "创建警告结束通知",
										},
									],
								},
							},
						},
					},
				},
				受控状态: {
					on: {
						控制结束: {
							target: "可操作状态",
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
					target: "存活",
					actions: {
						type: "重置到复活状态",
					},
				},
			},
			description: "不可操作，中断当前行为",
		},
	},
});
