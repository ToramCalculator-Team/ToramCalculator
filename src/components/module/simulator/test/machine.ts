import { setup } from "xstate";

export const machine = setup({
  types: {
    context: {} as {},
    events: {} as
      | { type: "使用技能" }
      | { type: "前摇结束" }
      | { type: "受到控制" }
      | { type: "后摇结束" }
      | { type: "移动指令" }
      | { type: "蓄力结束" }
      | { type: "Hp小于等于0" }
      | { type: "停止移动指令" }
      | { type: "控制时间结束" }
      | { type: "复活倒计时清零" },
  },
  actions: {
    根据角色配置生成初始状态: function ({ context, event }, params) {
      // Add your action code here
      // ...
    },
    判断是否满足技能需求: function ({ context, event }, params) {
      // Add your action code here
      // ...
    },
    产生效果: function ({ context, event }, params) {
      // Add your action code here
      // ...
    },
    "HP\\MP清零；状态清空": function ({ context, event }, params) {
      // Add your action code here
      // ...
    },
  },
  guards: {
    当前生命值满足连击中各技能的HP消耗需求: function ({ context, event }) {
      // Add your guard condition here
      return true;
    },
    有蓄力动作: function ({ context, event }) {
      // Add your guard condition here
      return true;
    },
    存在后续连击: function ({ context, event }) {
      // Add your guard condition here
      return true;
    },
  },
}).createMachine({
  context: {},
  id: "Member",
  initial: "存活",
  entry: {
    type: "根据角色配置生成初始状态",
  },
  states: {
    存活: {
      initial: "可操作状态",
      on: {
        Hp小于等于0: {
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
                移动指令: {
                  target: "移动中",
                },
                使用技能: [
                  {
                    target: "释放技能中",
                    guard: {
                      type: "当前生命值满足连击中各技能的HP消耗需求",
                    },
                  },
                  {
                    target: "静止状态",
                  },
                ],
              },
            },
            移动中: {
              on: {
                停止移动指令: {
                  target: "静止状态",
                },
              },
            },
            释放技能中: {
              initial: "前摇",
              states: {
                前摇: {
                  on: {
                    前摇结束: [
                      {
                        target: "蓄力动作",
                        guard: {
                          type: "有蓄力动作",
                        },
                      },
                      {
                        target: "后摇",
                      },
                    ],
                  },
                  entry: {
                    type: "判断是否满足技能需求",
                  },
                },
                蓄力动作: {
                  on: {
                    蓄力结束: {
                      target: "后摇",
                    },
                  },
                },
                后摇: {
                  on: {
                    后摇结束: [
                      {
                        target: "前摇",
                        guard: {
                          type: "存在后续连击",
                        },
                      },
                      {
                        target: "#Member.存活.可操作状态.静止状态",
                      },
                    ],
                  },
                  entry: {
                    type: "产生效果",
                  },
                },
              },
            },
          },
        },
        控制类异常状态: {
          on: {
            控制时间结束: {
              target: "#Member.存活.可操作状态.静止状态",
            },
          },
        },
      },
    },
    死亡: {
      on: {
        复活倒计时清零: {
          target: "#Member.存活.可操作状态",
          actions: {
            type: "HP\\MP清零；状态清空",
          },
        },
      },
      description: "不可操作，中断当前行为，且移出上下文",
    },
  },
});