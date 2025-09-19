import { setup, createMachine } from "xstate";
import GameEngine from "./GameEngine";

// 指令事件类型
export type EngineCommand =
  | { type: "INIT"; origin?: "source" | "mirror" }
  | { type: "START"; origin?: "source" | "mirror" }
  | { type: "PAUSE"; origin?: "source" | "mirror" }
  | { type: "RESUME"; origin?: "source" | "mirror" }
  | { type: "STOP"; origin?: "source" | "mirror" }
  | { type: "RESULT"; command: string; success: boolean; error?: string; origin?: "source" | "mirror" };

type Command = EngineCommand;

// 上下文类型
export interface EngineSMContext {
  mirror: { send: (msg: Command) => void | Promise<void> }; // 镜像状态机通信
  engine?: GameEngine; // 引擎执行器
  controller?: { showPaused?: () => void }; // 控制器UI（可选，不强依赖）
}

export const engineMachine = setup({
  types: {} as {
    context: EngineSMContext;
    events: Command;
    input: EngineSMContext;
  },
  actions: {
    forwardToMirror: ({ context, event }) => {
      context.mirror.send({ ...event, origin: "mirror" });
    },
    doInit: ({ context }) => {
      // worker 内部执行引擎初始化逻辑（不启动）
      // 主线程镜像只做状态转换
      // 初始化完成，引擎准备就绪但未启动
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
      },
    },

    starting: {
      on: {
        RESULT: {
          guard: ({ event }) => event.command === "START" && event.success,
          target: "running",
        },
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
      },
    },

    pausing: {
      on: {
        RESULT: {
          guard: ({ event }) => event.command === "PAUSE" && event.success,
          target: "paused",
        },
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
      },
    },

    resuming: {
      on: {
        RESULT: {
          guard: ({ event }) => event.command === "RESUME" && event.success,
          target: "running",
        },
      },
    },

    stopping: {
      on: {
        RESULT: {
          guard: ({ event }) => event.command === "STOP" && event.success,
          target: "stopped",
        },
      },
    },

    stopped: {
      type: "final",
    },
  },
});
