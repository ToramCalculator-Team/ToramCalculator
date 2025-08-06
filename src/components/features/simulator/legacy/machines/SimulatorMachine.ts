import { setup } from "xstate";

export const machine = setup({
  types: {
    context: {} as {},
    events: {} as
      | { type: "启动" }
      | { type: "暂停" }
      | { type: "终止" }
      | { type: "初始化完毕" }
      | { type: "事件队列结束或者满足终止条件" },
  },
  actions: {
    "遍历阵营，遍历阵营中的队伍，遍历队伍中的成员，根据成员配置生成成员状态对象":
      function ({ context, event }, params) {
        // Add your action code here
        // ...
      },
    "遍历所有成员的事件队列，查找最近事件所在的帧，执行所有成员在该帧的事件":
      function ({ context, event }, params) {
        // Add your action code here
        // ...
      },
    "判断当前帧与上次发送状态的帧相距是否超过60帧，是则计算并发送最近帧的所有成员状态快照。":
      function ({ context, event }, params) {
        // Add your action code here
        // ...
      },
    "判断玩家是否空闲，是则等待输入动作": function (
      { context, event },
      params,
    ) {
      // Add your action code here
      // ...
    },
  },
}).createMachine({
  context: {},
  id: "模拟器",
  initial: "闲置",
  states: {
    闲置: {
      on: {
        启动: {
          target: "正在运行",
        },
      },
    },
    正在运行: {
      initial: "初始化引擎",
      on: {
        暂停: {
          target: "暂停",
        },
      },
      states: {
        初始化引擎: {
          on: {
            初始化完毕: {
              target: "成员动作循环",
            },
          },
          entry: {
            type: "遍历阵营，遍历阵营中的队伍，遍历队伍中的成员，根据成员配置生成成员状态对象",
          },
        },
        成员动作循环: {
          on: {
            事件队列结束或者满足终止条件: {
              target: "#模拟器.闲置",
            },
          },
          entry: [
            {
              type: "遍历所有成员的事件队列，查找最近事件所在的帧，执行所有成员在该帧的事件",
            },
            {
              type: "判断当前帧与上次发送状态的帧相距是否超过60帧，是则计算并发送最近帧的所有成员状态快照。",
            },
            {
              type: "判断玩家是否空闲，是则等待输入动作",
            },
          ],
        },
      },
    },
    暂停: {
      on: {
        终止: {
          target: "闲置",
        },
      },
    },
  },
});