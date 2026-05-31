const a = {
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
          受到控制: {
            target: "受控状态",
          },
        },
        states: {
          动作状态: {
            initial: "空闲状态",
            description: "移动状态外的其他行动",
            states: {
              空闲状态: {
                on: {
                  使用格挡: {
                    target: "格挡中",
                  },
                  使用闪躲: {
                    target: "闪躲中",
                  },
                  使用技能: {
                    target: "使用技能中",
                  },
                },
                entry: {
                  type: "设置允许移动",
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
                          type: "施法条件不满足",
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
                        target:
                          "#Player v1.存活.可操作状态.动作状态.空闲状态",
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
                          target:
                            "#Player v1.存活.可操作状态.动作状态.空闲状态",
                          guard: {
                            type: "不存在后续连击",
                          },
                        },
                        {
                          target:
                            "#Player v1.存活.可操作状态.动作状态.使用技能中",
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
          移动状态: {
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
      },
    },
    description: "不可操作，中断当前行为",
  },
}