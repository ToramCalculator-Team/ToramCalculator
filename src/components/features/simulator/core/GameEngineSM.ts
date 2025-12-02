import { setup, createMachine } from "xstate";
import GameEngine from "./GameEngine";
import { z } from "zod/v4";
import { SimulatorWithRelationsSchema } from "@db/generated/repositories/simulator";


export const EngineCommandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("INIT"),
    data: SimulatorWithRelationsSchema,
    origin: z.enum(["source", "mirror"]).optional(),
  }),
  z.object({
    type: z.literal("START"),
    origin: z.enum(["source", "mirror"]).optional(),
  }),
  z.object({
    type: z.literal("PAUSE"),
    origin: z.enum(["source", "mirror"]).optional(),
  }),
  z.object({
    type: z.literal("RESUME"),
    origin: z.enum(["source", "mirror"]).optional(),
  }),
  z.object({
    type: z.literal("STOP"),
    origin: z.enum(["source", "mirror"]).optional(),
  }),
  z.object({
    type: z.literal("RESET"),
    origin: z.enum(["source", "mirror"]).optional(),
  }),
  z.object({
    type: z.literal("STEP"),
    origin: z.enum(["source", "mirror"]).optional(),
  }),
  z.object({
    type: z.literal("RESULT"),
    command: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
    origin: z.enum(["source", "mirror"]).optional(),
  }),
]);

export type EngineCommand = z.output<typeof EngineCommandSchema>;

// 指令事件类型
// export type EngineCommand =
//   | { type: "INIT"; data: SimulatorWithRelations; origin?: "source" | "mirror" }
//   | { type: "START"; origin?: "source" | "mirror" }
//   | { type: "PAUSE"; origin?: "source" | "mirror" }
//   | { type: "RESUME"; origin?: "source" | "mirror" }
//   | { type: "STOP"; origin?: "source" | "mirror" }
//   | { type: "RESET"; origin?: "source" | "mirror" }
//   | { type: "STEP"; origin?: "source" | "mirror" }
//   | { type: "RESULT"; command: string; success: boolean; error?: string; origin?: "source" | "mirror" };

// 上下文类型
export interface EngineSMContext {
  mirror: { send: (msg: EngineCommand) => void | Promise<void> }; // 镜像状态机通信
  engine?: GameEngine; // 引擎执行器
  controller?: { showPaused?: () => void }; // 控制器UI（可选，不强依赖）
  threadName?: string; // 线程标识：'main' 或 'worker'
}

export const GameEngineSM = setup({
  types: {} as {
    context: EngineSMContext;
    events: EngineCommand;
    input: EngineSMContext;
  },
  actions: {
    forwardToMirror: ({ context, event }) => {
      const prefix = context.threadName || 'unknown';
      console.log(`[${prefix}] GameEngineSM: 传递事件到镜像状态机:`, event);
      context.mirror.send({ ...event, origin: "mirror" });
    },
    doInit: ({ context, event }) => {
      const prefix = context.threadName || 'unknown';
      try {
        // worker 内部执行引擎初始化逻辑（不启动）
        if (event.type === "INIT" && event.data) {
          context.engine?.initialize(event.data);
          console.log(`[${prefix}] GameEngineSM: doInit - 引擎初始化完成`);
        } else {
          throw new Error("INIT 命令必须提供数据");
        }
        // 发送成功结果
        console.log(`[${prefix}] GameEngineSM: doInit - 发送 RESULT 事件`);
        context.mirror.send({ type: "RESULT", command: "INIT", success: true });
      } catch (error) {
        console.error(`[${prefix}] GameEngineSM: doInit - 初始化失败:`, error);
        // 即使失败也要发送结果，让状态机知道发生了错误
        try {
          context.mirror.send({ 
            type: "RESULT", 
            command: "INIT", 
            success: false, 
            error: error instanceof Error ? error.message : String(error) 
          });
        } catch (sendError) {
          console.error(`[${prefix}] GameEngineSM: doInit - 发送 RESULT 失败:`, sendError);
        }
        throw error; // 重新抛出以便 XState 记录
      }
    },
    doStart: ({ context }) => {
      // worker 内部启动引擎
      context.engine?.start();
      context.mirror.send({ type: "RESULT", command: "START", success: true });
    },
    doPause: ({ context }) => {
      context.engine?.pause();
      context.controller?.showPaused?.();
      context.mirror.send({ type: "RESULT", command: "PAUSE", success: true });
    },
    doResume: ({ context }) => {
      context.engine?.resume();
      context.mirror.send({ type: "RESULT", command: "RESUME", success: true });
    },
    doStop: ({ context }) => {
      context.engine?.stop();
      context.mirror.send({ type: "RESULT", command: "STOP", success: true });
    },
    doReset: ({ context }) => {
      // worker 内部重置引擎到初始状态（使用存储的初始化参数）
      context.engine?.reset?.();
      context.mirror.send({ type: "RESULT", command: "RESET", success: true });
    },
    doResetAndReady: ({ context }) => {
      // worker 内部重置引擎到初始状态（使用存储的初始化参数）
      context.engine?.reset?.();
      context.mirror.send({ type: "RESULT", command: "RESET", success: true });
      // 重置后自动转换到 ready 状态
      const initData = context.engine?.getInitializationData();
      if (initData) {
        context.mirror.send({ type: "INIT", data: initData });
      }
    },
    doStep: ({ context }) => {
      // worker 内部执行单步
      context.engine?.step?.();
      context.mirror.send({ type: "RESULT", command: "STEP", success: true });
    },
  },
}).createMachine({
  id: "engine",
  initial: "idle",
  context: ({ input }) => input, // 由外部注入 mirror/engine/controller
  states: {
    idle: {
      on: {
        INIT: [
          {
            guard: ({ event }) => event.origin !== "mirror",
            target: "initializing",
            actions: ["forwardToMirror"],
          },
          {
            guard: ({ event }) => event.origin === "mirror",
            target: "ready",
            actions: ["doInit"],
          },
        ],
      },
    },

    initializing: {
      on: {
        RESULT: [
          {
            guard: ({ event }) => event.command === "INIT" && event.success,
            target: "ready",
          },
          {
            guard: ({ event }) => event.command === "INIT" && !event.success,
            target: "idle",
          },
        ],
      },
      // 添加超时保护，如果长时间没有收到 RESULT，自动回到 idle
      after: {
        10000: {
          target: "idle",
          actions: ({ context }) => {
            const prefix = context.threadName || 'unknown';
            console.warn(`[${prefix}] GameEngineSM: 初始化超时，返回 idle 状态`);
          },
        },
      },
    },

    ready: {
      on: {
        START: [
          {
            guard: ({ event }) => event.origin !== "mirror",
            target: "starting",
            actions: ["forwardToMirror"],
          },
          {
            guard: ({ event }) => event.origin === "mirror",
            target: "running",
            actions: ["doStart"],
          },
        ],
        RESET: [
          {
            guard: ({ event }) => event.origin !== "mirror",
            target: "idle",
            actions: ["forwardToMirror"],
          },
          {
            guard: ({ event }) => event.origin === "mirror",
            target: "idle",
            actions: ["doReset"],
          },
        ],
      },
    },

    starting: {
      on: {
        RESULT: {
          guard: ({ event }) => event.command === "START" && event.success,
          target: "running",
        },
        RESET: [
          {
            guard: ({ event }) => event.origin !== "mirror",
            target: "idle",
            actions: ["forwardToMirror"],
          },
          {
            guard: ({ event }) => event.origin === "mirror",
            target: "idle",
            actions: ["doReset"],
          },
        ],
      },
    },

    running: {
      on: {
        PAUSE: [
          {
            guard: ({ event }) => event.origin !== "mirror",
            target: "pausing",
            actions: ["forwardToMirror"],
          },
          {
            guard: ({ event }) => event.origin === "mirror",
            target: "paused",
            actions: ["doPause"],
          },
        ],
        STOP: [
          {
            guard: ({ event }) => event.origin !== "mirror",
            target: "stopping",
            actions: ["forwardToMirror"],
          },
          {
            guard: ({ event }) => event.origin === "mirror",
            target: "stopped",
            actions: ["doStop"],
          },
        ],
        RESET: [
          {
            guard: ({ event }) => event.origin !== "mirror",
            target: "idle",
            actions: ["forwardToMirror"],
          },
          {
            guard: ({ event }) => event.origin === "mirror",
            target: "idle",
            actions: ["doReset"],
          },
        ],
      },
    },

    pausing: {
      on: {
        RESULT: {
          guard: ({ event }) => event.command === "PAUSE" && event.success,
          target: "paused",
        },
        RESET: [
          {
            guard: ({ event }) => event.origin !== "mirror",
            target: "idle",
            actions: ["forwardToMirror"],
          },
          {
            guard: ({ event }) => event.origin === "mirror",
            target: "idle",
            actions: ["doReset"],
          },
        ],
      },
    },

    paused: {
      on: {
        RESUME: [
          {
            guard: ({ event }) => event.origin !== "mirror",
            target: "resuming",
            actions: ["forwardToMirror"],
          },
          {
            guard: ({ event }) => event.origin === "mirror",
            target: "running",
            actions: ["doResume"],
          },
        ],
        STEP: [
          {
            guard: ({ event }) => event.origin !== "mirror",
            target: "paused",
            actions: ["forwardToMirror"],
          },
          {
            guard: ({ event }) => event.origin === "mirror",
            target: "paused",
            actions: ["doStep"],
          },
        ],
        STOP: [
          {
            guard: ({ event }) => event.origin !== "mirror",
            target: "stopping",
            actions: ["forwardToMirror"],
          },
          {
            guard: ({ event }) => event.origin === "mirror",
            target: "stopped",
            actions: ["doStop"],
          },
        ],
        RESET: [
          {
            guard: ({ event }) => event.origin !== "mirror",
            target: "idle",
            actions: ["forwardToMirror"],
          },
          {
            guard: ({ event }) => event.origin === "mirror",
            target: "idle",
            actions: ["doReset"],
          },
        ],
      },
    },

    resuming: {
      on: {
        RESULT: {
          guard: ({ event }) => event.command === "RESUME" && event.success,
          target: "running",
        },
        RESET: [
          {
            guard: ({ event }) => event.origin !== "mirror",
            target: "idle",
            actions: ["forwardToMirror"],
          },
          {
            guard: ({ event }) => event.origin === "mirror",
            target: "idle",
            actions: ["doReset"],
          },
        ],
      },
    },

    stopping: {
      on: {
        RESULT: {
          guard: ({ event }) => event.command === "STOP" && event.success,
          target: "stopped",
        },
        RESET: [
          {
            guard: ({ event }) => event.origin !== "mirror",
            target: "idle",
            actions: ["forwardToMirror"],
          },
          {
            guard: ({ event }) => event.origin === "mirror",
            target: "idle",
            actions: ["doReset"],
          },
        ],
      },
    },

    stopped: {
      on: {
        RESET: [
          {
            guard: ({ context, event }) => {
              const prefix = context.threadName || 'unknown';
              console.log(`[${prefix}] GameEngineSM: RESET guard 1 - event.origin:`, event.origin);
              return event.origin !== "mirror";
            },
            target: "idle",
            actions: ["forwardToMirror"],
          },
          {
            guard: ({ context, event }) => {
              const prefix = context.threadName || 'unknown';
              console.log(`[${prefix}] GameEngineSM: RESET guard 2 - event.origin:`, event.origin);
              return event.origin === "mirror";
            },
            target: "ready",
            actions: ["doResetAndReady"],
          },
        ],
      },
    },
  },
});
