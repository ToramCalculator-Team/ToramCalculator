import { setup } from "xstate";

export const machine = setup({
  types: {
    context: {} as {},
    events: {} as
      | { type: "受到控制" }
      | { type: "受到致命伤害" }
      | { type: "控制时间结束" }
      | { type: "复活倒计时清零" }
      | { type: "使用技能" }
      | { type: "如果技能可用" }
      | { type: "如果技能不可用" }
      | { type: "收到蓄力结束通知" }
      | { type: "后摇结束，判断是否存在后续连击" }
      | { type: "收到前摇结束通知" }
      | { type: "发现蓄力动作" }
      | { type: "未发现蓄力动作，写入技能效果事件" }
      | { type: "移动" }
      | { type: "停止" },
  },
  actions: {
    根据角色配置生成初始状态: function ({ context, event }, params) {
      // Add your action code here
      // ...
    },
    "【休息】动画": function ({ context, event }, params) {
      // Add your action code here
      // ...
    },
    判断是否处于冷却中: function ({ context, event }, params) {
      // Add your action code here
      // ...
    },
    判断是否满足施法消耗: function ({ context, event }, params) {
      // Add your action code here
      // ...
    },
    判断是否存在可用效果: function ({ context, event }, params) {
      // Add your action code here
      // ...
    },
    "【前摇】动画": function ({ context, event }, params) {
      // Add your action code here
      // ...
    },
    扣除技能消耗: function ({ context, event }, params) {
      // Add your action code here
      // ...
    },
    写入前摇结束通知事件: function ({ context, event }, params) {
      // Add your action code here
      // ...
    },
    "【蓄力】动画": function ({ context, event }, params) {
      // Add your action code here
      // ...
    },
    写入技能效果事件: function ({ context, event }, params) {
      // Add your action code here
      // ...
    },
    写入蓄力结束通知事件: function ({ context, event }, params) {
      // Add your action code here
      // ...
    },
    "【后摇】动画": function ({ context, event }, params) {
      // Add your action code here
      // ...
    },
    "HP\\MP清零；状态清空": function ({ context, event }, params) {
      // Add your action code here
      // ...
    },
  },
  guards: {
    发现后续连击: function ({ context, event }) {
      // Add your guard condition here
      return true;
    },
    未发现后续连击: function ({ context, event }) {
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
        受到致命伤害: {
          target: "死亡",
        },
      },
      description: "玩家存活状态，此时可操作且可影响上下文",
      states: {
        可操作状态: {
          initial: "静止状态",
          on: {
            受到控制: {
              target: "控制类异常状态",
            },
          },
          description: "可响应输入操作",
          states: {
            静止状态: {
              on: {
                移动: {
                  target: "移动中",
                },
                使用技能: {
                  target: "判断技能可用性",
                },
              },
              entry: {
                type: "【休息】动画",
              },
            },
            移动中: {
              on: {
                停止: {
                  target: "静止状态",
                },
              },
            },
            判断技能可用性: {
              on: {
                如果技能可用: {
                  target: "发动技能中",
                },
                如果技能不可用: {
                  target: "#Player.存活.控制类异常状态",
                },
              },
              entry: [
                {
                  type: "判断是否处于冷却中",
                },
                {
                  type: "判断是否满足施法消耗",
                },
                {
                  type: "判断是否存在可用效果",
                },
              ],
            },
            发动技能中: {
              initial: "前摇",
              states: {
                前摇: {
                  on: {
                    收到前摇结束通知: {
                      target: "寻找蓄力动作",
                    },
                  },
                  entry: [
                    {
                      type: "【前摇】动画",
                    },
                    {
                      type: "扣除技能消耗",
                    },
                    {
                      type: "写入前摇结束通知事件",
                    },
                  ],
                },
                寻找蓄力动作: {
                  on: {
                    发现蓄力动作: {
                      target: "蓄力动作",
                    },
                    "未发现蓄力动作，写入技能效果事件": {
                      target: "后摇",
                    },
                  },
                },
                蓄力动作: {
                  on: {
                    收到蓄力结束通知: {
                      target: "后摇",
                    },
                  },
                  entry: [
                    {
                      type: "【蓄力】动画",
                    },
                    {
                      type: "写入技能效果事件",
                    },
                    {
                      type: "写入蓄力结束通知事件",
                    },
                  ],
                },
                后摇: {
                  on: {
                    "后摇结束，判断是否存在后续连击": [
                      {
                        target: "#Player.存活.可操作状态.判断技能可用性",
                        guard: {
                          type: "发现后续连击",
                        },
                      },
                      {
                        target: "#Player.存活.可操作状态.静止状态",
                        guard: {
                          type: "未发现后续连击",
                        },
                      },
                    ],
                  },
                  entry: {
                    type: "【后摇】动画",
                  },
                },
              },
            },
          },
        },
        控制类异常状态: {
          on: {
            控制时间结束: {
              target: "#Player.存活.可操作状态.静止状态",
            },
          },
        },
      },
    },
    死亡: {
      on: {
        复活倒计时清零: {
          target: "#Player.存活.可操作状态",
          actions: {
            type: "HP\\MP清零；状态清空",
          },
        },
      },
      description: "不可操作，中断当前行为，且移出上下文",
    },
  },
});