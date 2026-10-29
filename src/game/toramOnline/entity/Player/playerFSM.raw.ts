import { setup } from "xstate";

export const machine = setup({
	types: {
		context: {} as {},
		events: {} as
			| { type: "停止" }
			| { type: "复活" }
			| { type: "移动" }
			| { type: "Hp小于0" }
			| { type: "使用技能" }
			| { type: "使用格挡" }
			| { type: "使用闪躲" }
			| { type: "应用控制" }
			| { type: "执行结束" }
			| { type: "控制结束" }
			| { type: "结束格挡" }
			| { type: "收到警告结束通知" }
			| { type: "收到闪躲持续时间结束通知" },
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
		添加待处理技能: ({ context, event }, params) => {
			// Add your action code here
			// ...
		},
		更新可移动性: ({ context, event }, params) => {
			// Add your action code here
			// ...
		},
		清空待处理技能: ({ context, event }, params) => {
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
		添加待处理技能效果: ({ context, event }, params) => {
			// Add your action code here
			// ...
		},
		技能消耗扣除: ({ context, event }, params) => {
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
	actors: {
		启动行为树: createMachine({
			/* ... */
		}),
	},
	guards: {
		可移动: ({ context, event }) => {
			// Add your guard condition here
			return true;
		},
		存在后续连击: ({ context, event }) => {
			// Add your guard condition here
			return true;
		},
		不存在后续连击: ({ context, event }) => {
			// Add your guard condition here
			return true;
		},
		不满足施法条件: ({ context, event }) => {
			// Add your guard condition here
			return true;
		},
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
							actions: {
								type: "中断当前行为",
							},
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
										使用技能: {
											target: "使用技能中",
										},
									},
									entry: {
										type: "设置允许移动",
									},
								},
								闪躲中: {
									on: {
										收到闪躲持续时间结束通知: {
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
									initial: "初始化技能",
									entry: [
										{
											type: "添加待处理技能",
										},
										{
											type: "更新可移动性",
										},
									],
									exit: {
										type: "清空待处理技能",
									},
									states: {
										初始化技能: {
											always: [
												{
													target: "警告状态",
													guard: {
														type: "不满足施法条件",
													},
												},
												{
													target: "技能执行过程",
												},
											],
										},
										警告状态: {
											on: {
												收到警告结束通知: {
													target: "#Player.存活.可操作状态.动作状态.空闲状态",
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
										技能执行过程: {
											on: {
												执行结束: [
													{
														target: "#Player.存活.可操作状态.动作状态.使用技能中",
														guard: {
															type: "存在后续连击",
														},
													},
													{
														target: "#Player.存活.可操作状态.动作状态.空闲状态",
														guard: {
															type: "不存在后续连击",
														},
													},
												],
											},
											entry: [
												{
													type: "添加待处理技能效果",
												},
												{
													type: "技能消耗扣除",
												},
											],
											invoke: {
												input: {},
												src: "启动行为树",
											},
										},
									},
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
