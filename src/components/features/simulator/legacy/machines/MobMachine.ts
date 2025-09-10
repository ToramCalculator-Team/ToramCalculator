import { setup } from "xstate";

export const machine = setup({
  types: {
    context: {} as {},
    events: {} as
      | { type: "复活" }
      | { type: "移动" }
      | { type: "修改buff" }
      | { type: "使用技能" }
      | { type: "修改属性" }
      | { type: "停止移动" }
      | { type: "受到攻击" }
      | { type: "受到治疗" }
      | { type: "应用控制" }
      | { type: "控制时间结束" }
      | { type: "收到快照请求" }
      | { type: "进行伤害计算" }
      | { type: "进行命中判定" }
      | { type: "进行控制判定" }
      | { type: "收到buff增删事件" }
      | { type: "收到前摇结束通知" }
      | { type: "收到发动结束通知" }
      | { type: "收到咏唱结束通知" }
      | { type: "收到蓄力结束通知" },
  },
  actions: {
    根据角色配置生成初始状态: function ({ context, event }) {
      // Add your action code here
      // ...
    },
    启用站立动画: function ({ context, event }) {
      // Add your action code here
      // ...
    },
    启用移动动画: function ({ context, event }) {
      // Add your action code here
      // ...
    },
    启用前摇动画: function ({ context, event }) {
      // Add your action code here
      // ...
    },
    计算前摇时长: function ({ context, event }) {
      // Add your action code here
      // ...
    },
    创建前摇结束通知: function ({ context, event }) {
      // Add your action code here
      // ...
    },
    启用蓄力动画: function ({ context, event }) {
      // Add your action code here
      // ...
    },
    计算蓄力时长: function ({ context, event }) {
      // Add your action code here
      // ...
    },
    创建蓄力结束通知: function ({ context, event }) {
      // Add your action code here
      // ...
    },
    启用咏唱动画: function ({ context, event }) {
      // Add your action code here
      // ...
    },
    计算咏唱时长: function ({ context, event }) {
      // Add your action code here
      // ...
    },
    创建咏唱结束通知: function ({ context, event }) {
      // Add your action code here
      // ...
    },
    启用技能发动动画: function ({ context, event }) {
      // Add your action code here
      // ...
    },
    计算发动时长: function ({ context, event }) {
      // Add your action code here
      // ...
    },
    创建发动结束通知: function ({ context, event }) {
      // Add your action code here
      // ...
    },
    技能效果管线: function ({ context, event }) {
      // Add your action code here
      // ...
    },
    重置控制抵抗时间: function ({ context, event }) {
      // Add your action code here
      // ...
    },
    中断当前行为: function ({ context, event }) {
      // Add your action code here
      // ...
    },
    启动受控动画: function ({ context, event }) {
      // Add your action code here
      // ...
    },
    重置到复活状态: function ({ context, event }) {
      // Add your action code here
      // ...
    },
    发送快照到请求者: function ({ context, event }) {
      // Add your action code here
      // ...
    },
    发送命中判定事件给自己: function ({ context, event }) {
      // Add your action code here
      // ...
    },
    反馈命中结果给施法者: function ({ context, event }) {
      // Add your action code here
      // ...
    },
    发送控制判定事件给自己: function ({ context, event }) {
      // Add your action code here
      // ...
    },
    命中计算管线: function ({ context, event }) {
      // Add your action code here
      // ...
    },
    根据命中结果进行下一步: function ({ context, event }) {
      // Add your action code here
      // ...
    },
    控制判定管线: function ({ context, event }) {
      // Add your action code here
      // ...
    },
    反馈控制结果给施法者: function ({ context, event }) {
      // Add your action code here
      // ...
    },
    发送伤害计算事件给自己: function ({ context, event }) {
      // Add your action code here
      // ...
    },
    伤害计算管线: function ({ context, event }) {
      // Add your action code here
      // ...
    },
    反馈伤害结果给施法者: function ({ context, event }) {
      // Add your action code here
      // ...
    },
    发送属性修改事件给自己: function ({ context, event }) {
      // Add your action code here
      // ...
    },
    发送buff修改事件给自己: function ({ context, event }) {
      // Add your action code here
      // ...
    },
  },
  guards: {
    存在蓄力阶段: function ({ context, event }) {
      // Add your guard condition here
      return true;
    },
    存在咏唱阶段: function ({ context, event }) {
      // Add your guard condition here
      return true;
    },
    存在后续连击: function ({ context, event }) {
      // Add your guard condition here
      return true;
    },
    是物理伤害: function ({ context, event }) {
      // Add your guard condition here
      return true;
    },
    满足存活条件: function ({ context, event }) {
      // Add your guard condition here
      return true;
    },
  },
}).createMachine({
  context: {},
  id: "Mob",
  initial: "存活",
  entry: {
    type: "根据角色配置生成初始状态",
  },
  states: {
    存活: {
      initial: "可操作状态",
      on: {
        收到快照请求: {
          actions: {
            type: "发送快照到请求者",
          },
        },
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
                            target:
                              "#Mob.存活.可操作状态.技能处理状态.初始化技能",
                            guard: {
                              type: "存在后续连击",
                            },
                          },
                          {
                            target: "#Mob.存活.可操作状态.空闲状态",
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
              target: "#Mob.存活.可操作状态.空闲状态",
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
          target: "#Mob.存活.可操作状态",
          actions: {
            type: "重置到复活状态",
          },
        },
      },
      description: "不可操作，中断当前行为",
    },
  },
});