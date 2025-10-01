import { setup, createMachine } from "xstate";
import GameEngine from "./GameEngine";
import { SimulatorRelationsSchema } from "@db/repositories/simulator";
import { z } from "zod/v3";

export const EngineCommandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("INIT"),
    data: SimulatorRelationsSchema,
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

export type EngineCommand = z.infer<typeof EngineCommandSchema>;

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

type Command = EngineCommand;

// 上下文类型
export interface EngineSMContext {
  mirror: { send: (msg: Command) => void | Promise<void> }; // 镜像状态机通信
  engine?: GameEngine; // 引擎执行器
  controller?: { showPaused?: () => void }; // 控制器UI（可选，不强依赖）
}

export const gameEngineSM = setup({
  types: {} as {
    context: EngineSMContext;
    events: Command;
    input: EngineSMContext;
  },
  actions: {
    forwardToMirror: ({ context, event }) => {
      context.mirror.send({ ...event, origin: "mirror" });
    },
    doInit: ({ context, event }) => {
      // worker 内部执行引擎初始化逻辑（不启动）
      if (event.type === "INIT" && event.data) {
        context.engine?.initialize(event.data);
      } else {
        throw new Error("INIT 命令必须提供数据");
      }
      context.mirror.send({ type: "RESULT", command: "INIT", success: true });
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
      const initData = context.engine?.getInitializationData?.();
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
        RESULT: {
          guard: ({ event }) => event.command === "INIT" && event.success,
          target: "ready",
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
            guard: ({ event }) => {
              console.log("GameEngineSM: RESET guard 1 - event.origin:", event.origin);
              return event.origin !== "mirror";
            },
            target: "idle",
            actions: ["forwardToMirror"],
          },
          {
            guard: ({ event }) => {
              console.log("GameEngineSM: RESET guard 2 - event.origin:", event.origin);
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
