import { createMachine } from "xstate";

export const machine = createMachine({
  context: {},
  id: "Mob",
  initial: "存活",
  entry: {
    type: "根据配置生成初始状态",
  },
  states: {
    存活: {
      initial: "自由行动状态",
      on: {
        Hp小于等于0: {
          target: "死亡",
        },
      },
      description: "怪物存活状态，此时可影响上下文",
      states: {
        自由行动状态: {
          initial: "静止状态",
          on: {
            受到控制: {
              target: "控制类异常状态",
            },
          },
          description: "可按AI行动",
          states: {
            静止状态: {
              on: {
                移动指令: {
                  target: "移动中",
                },
                使用技能: {
                  target: "发动技能中",
                },
              },
            },
            移动中: {
              on: {
                停止移动指令: {
                  target: "静止状态",
                },
              },
            },
            发动技能中: {
              initial: "技能初始化",
              states: {
                技能初始化: {
                  on: {
                    判断可用性: [
                      {
                        target: "前摇",
                        guard: {
                          type: "可用",
                        },
                      },
                      {
                        target: "#Mob.存活.自由行动状态.静止状态",
                        guard: {
                          type: "不可用",
                        },
                      },
                    ],
                  },
                  entry: {
                    type: "【技能开始】事件",
                  },
                },
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
                        target: "技能效果动作",
                        guard: {
                          type: "无蓄力动作",
                        },
                      },
                    ],
                  },
                  entry: {
                    type: "【前摇开始】事件",
                  },
                },
                蓄力动作: {
                  on: {
                    蓄力结束: {
                      target: "技能效果动作",
                    },
                  },
                  entry: {
                    type: "【开始蓄力】事件",
                  },
                  exit: {
                    type: "【蓄力结束】事件",
                  },
                },
                技能效果动作: {
                  on: {
                    技能动作结束: [
                      {
                        target: "技能初始化",
                        guard: {
                          type: "存在后续连击",
                        },
                      },
                      {
                        target: "#Mob.存活.自由行动状态.静止状态",
                      },
                    ],
                  },
                  entry: {
                    type: "【技能效果】事件",
                  },
                  exit: {
                    type: "【技能动画结束】事件",
                  },
                },
              },
            },
          },
        },
        控制类异常状态: {
          on: {
            控制时间结束: {
              target: "#Mob.存活.自由行动状态.静止状态",
            },
          },
        },
      },
    },
    死亡: {
      description: "不可操作，中断当前行为，且移出上下文",
    },
  },
}).withConfig({
  actions: {
    根据配置生成初始状态: function (context, event) {
      // Add your action code here
      // ...
    },
    "【技能开始】事件": function (context, event) {
      // Add your action code here
      // ...
    },
    "【前摇开始】事件": function (context, event) {
      // Add your action code here
      // ...
    },
    "【开始蓄力】事件": function (context, event) {
      // Add your action code here
      // ...
    },
    "【蓄力结束】事件": function (context, event) {
      // Add your action code here
      // ...
    },
    "【技能效果】事件": function (context, event) {
      // Add your action code here
      // ...
    },
    "【技能动画结束】事件": function (context, event) {
      // Add your action code here
      // ...
    },
  },
  guards: {
    存在后续连击: function (context, event) {
      // Add your guard condition here
      return true;
    },
    有蓄力动作: function (context, event) {
      // Add your guard condition here
      return true;
    },
    无蓄力动作: function (context, event) {
      // Add your guard condition here
      return true;
    },
    可用: function (context, event) {
      // Add your guard condition here
      return true;
    },
    不可用: function (context, event) {
      // Add your guard condition here
      return true;
    },
  },
});