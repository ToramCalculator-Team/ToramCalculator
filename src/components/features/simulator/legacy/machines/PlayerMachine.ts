import { setup } from "xstate";

export const machine = setup({
  types: {
    context: {} as {},
    events: {} as
      | { type: "cast_end" } // 前摇结束
      | { type: "controlled" } // 受到控制
      | { type: "move_command" } // 移动指令
      | { type: "charge_end" } // 蓄力结束
      | { type: "hp_zero" } // HP小于等于0
      | { type: "stop_move" } // 停止移动指令
      | { type: "control_end" } // 控制时间结束
      | { type: "revive_ready" } // 复活倒计时清零
      | { type: "skill_press" } // 按下技能
      | { type: "check_availability" } // 判断可用性
      | { type: "skill_animation_end" }, // 技能动作结束
  },
  actions: {
    initializePlayerState: function ({ context, event }, params) {
      // 根据角色配置生成初始状态
      // Add your action code here
      // ...
    },
    onSkillStart: function ({ context, event }, params) {
      // 【技能开始】事件
      // Add your action code here
      // ...
    },
    onCastStart: function ({ context, event }, params) {
      // 【前摇开始】事件
      // Add your action code here
      // ...
    },
    onCastEnd: function ({ context, event }, params) {
      // 【前摇结束】事件
      // Add your action code here
      // ...
    },
    onSkillEffect: function ({ context, event }, params) {
      // 【技能效果】事件
      // Add your action code here
      // ...
    },
    onSkillAnimationEnd: function ({ context, event }, params) {
      // 【技能动画结束】事件
      // Add your action code here
      // ...
    },
    onChargeStart: function ({ context, event }, params) {
      // 【开始蓄力】事件
      // Add your action code here
      // ...
    },
    onChargeEnd: function ({ context, event }, params) {
      // 【蓄力结束】事件
      // Add your action code here
      // ...
    },
    resetHpMpAndStatus: function ({ context, event }, params) {
      // HP/MP清零；状态清空
      // Add your action code here
      // ...
    },
  },
  guards: {
    hasNextCombo: function ({ context, event }) {
      // 存在后续连击
      // Add your guard condition here
      return true;
    },
    hasChargeAction: function ({ context, event }) {
      // 有蓄力动作
      // Add your guard condition here
      return true;
    },
    hasNoChargeAction: function ({ context, event }) {
      // 无蓄力动作
      // Add your guard condition here
      return true;
    },
    isSkillAvailable: function ({ context, event }) {
      // 可用
      // Add your guard condition here
      return true;
    },
    skillNotAvailable: function ({ context, event }) {
      // 不可用，输出警告
      // Add your guard condition here
      return true;
    },
  },
}).createMachine({
  context: {},
  id: "Member",
  initial: "alive", // 存活
  entry: {
    type: "initializePlayerState",
  }, // 根据角色配置生成初始状态
  states: {
    alive: { // 存活
      initial: "operational", // 可操作状态
      on: {
        hp_zero: { // HP小于等于0
          target: "dead", // 死亡
        },
      },
      description: "玩家存活状态，此时可操作且可影响上下文",
      states: {
        operational: { // 可操作状态
          initial: "idle", // 静止状态
          on: {
            controlled: { // 受到控制
              target: "control_abnormal", // 控制类异常状态
            },
          },
          description: "可响应输入操作",
          states: {
            idle: { // 静止状态
              on: {
                move_command: { // 移动指令
                  target: "moving", // 移动中
                },
                skill_press: { // 按下技能
                  target: "skill_casting", // 发动技能中
                },
              },
            },
            moving: { // 移动中
              on: {
                stop_move: { // 停止移动指令
                  target: "idle", // 静止状态
                },
              },
            },
            skill_casting: { // 发动技能中
              initial: "skill_init", // 技能初始化
              states: {
                skill_init: { // 技能初始化
                  on: {
                    check_availability: [ // 判断可用性
                      {
                        target: "pre_cast", // 前摇
                        guard: "isSkillAvailable", // 可用
                      },
                      {
                        target: "#Member.alive.operational.idle", // 静止状态
                        guard: "skillNotAvailable", // 不可用，输出警告
                      },
                    ],
                  },
                  entry: {
                    type: "onSkillStart",
                  }, // 【技能开始】事件
                },
                pre_cast: { // 前摇
                  on: {
                    cast_end: [ // 前摇结束
                      {
                        target: "charge", // 蓄力动作
                        guard: "hasChargeAction", // 有蓄力动作
                      },
                      {
                        target: "skill_effect", // 技能效果动作
                        guard: "hasNoChargeAction", // 无蓄力动作
                      },
                    ],
                  },
                  entry: {
                    type: "onCastStart",
                  }, // 【前摇开始】事件
                  exit: {
                    type: "onCastEnd",
                  }, // 【前摇结束】事件
                },
                skill_effect: { // 技能效果动作
                  on: {
                    skill_animation_end: [ // 技能动作结束
                      {
                        target: "skill_init", // 技能初始化
                        guard: "hasNextCombo", // 存在后续连击
                      },
                      {
                        target: "#Member.alive.operational.idle", // 静止状态
                      },
                    ],
                  },
                  entry: {
                    type: "onSkillEffect",
                  }, // 【技能效果】事件
                  exit: {
                    type: "onSkillAnimationEnd",
                  }, // 【技能动画结束】事件
                },
                charge: { // 蓄力动作
                  on: {
                    charge_end: { // 蓄力结束
                      target: "skill_effect", // 技能效果动作
                    },
                  },
                  entry: {
                    type: "onChargeStart",
                  }, // 【开始蓄力】事件
                  exit: {
                    type: "onChargeEnd",
                  }, // 【蓄力结束】事件
                },
              },
            },
          },
        },
        control_abnormal: { // 控制类异常状态
          on: {
            control_end: { // 控制时间结束
              target: "#Member.alive.operational.idle", // 静止状态
            },
          },
        },
      },
    },
    dead: { // 死亡
      on: {
        revive_ready: { // 复活倒计时清零
          target: "#Member.alive.operational", // 可操作状态
          actions: {
            type: "resetHpMpAndStatus",
          }, // HP/MP清零；状态清空
        },
      },
      description: "不可操作，中断当前行为，且移出上下文",
    },
  },
});