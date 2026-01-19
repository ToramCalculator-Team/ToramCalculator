import { setup, createMachine } from "xstate";
import type { GameEngine } from "./GameEngine";
import { z } from "zod/v4";
import { SimulatorWithRelationsSchema } from "@db/generated/repositories/simulator";
import { createId } from "@paralleldrive/cuid2";

// 命令类型（controller → executor）
const CommandSchema = z.discriminatedUnion("type", [
  z.object({
		type: z.literal("CMD_INIT"),
    data: SimulatorWithRelationsSchema,
		sourceSide: z.literal("controller"),
		seq: z.number(),
		correlationId: z.string(),
		operatorId: z.string(), // 操作者ID，用于权限校验
	}),
	z.object({
		type: z.literal("CMD_START"),
		sourceSide: z.literal("controller"),
		seq: z.number(),
		correlationId: z.string(),
		operatorId: z.string(),
	}),
	z.object({
		type: z.literal("CMD_PAUSE"),
		sourceSide: z.literal("controller"),
		seq: z.number(),
		correlationId: z.string(),
		operatorId: z.string(),
	}),
	z.object({
		type: z.literal("CMD_RESUME"),
		sourceSide: z.literal("controller"),
		seq: z.number(),
		correlationId: z.string(),
		operatorId: z.string(),
	}),
	z.object({
		type: z.literal("CMD_STOP"),
		sourceSide: z.literal("controller"),
		seq: z.number(),
		correlationId: z.string(),
		operatorId: z.string(),
	}),
	z.object({
		type: z.literal("CMD_RESET"),
		sourceSide: z.literal("controller"),
		seq: z.number(),
		correlationId: z.string(),
		operatorId: z.string(),
  }),
  z.object({
		type: z.literal("CMD_STEP"),
		sourceSide: z.literal("controller"),
		seq: z.number(),
		correlationId: z.string(),
		operatorId: z.string(),
	}),
]);

// 结果类型（executor → controller）
const ResultSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("RESULT_INIT"),
		sourceSide: z.literal("executor"),
		seq: z.number(),
		correlationId: z.string(),
		success: z.boolean(),
		error: z.string().optional(),
  }),
  z.object({
		type: z.literal("RESULT_START"),
		sourceSide: z.literal("executor"),
		seq: z.number(),
		correlationId: z.string(),
		success: z.boolean(),
		error: z.string().optional(),
  }),
  z.object({
		type: z.literal("RESULT_PAUSE"),
		sourceSide: z.literal("executor"),
		seq: z.number(),
		correlationId: z.string(),
		success: z.boolean(),
		error: z.string().optional(),
  }),
  z.object({
		type: z.literal("RESULT_RESUME"),
		sourceSide: z.literal("executor"),
		seq: z.number(),
		correlationId: z.string(),
		success: z.boolean(),
		error: z.string().optional(),
  }),
  z.object({
		type: z.literal("RESULT_STOP"),
		sourceSide: z.literal("executor"),
		seq: z.number(),
		correlationId: z.string(),
		success: z.boolean(),
		error: z.string().optional(),
  }),
  z.object({
		type: z.literal("RESULT_RESET"),
		sourceSide: z.literal("executor"),
		seq: z.number(),
		correlationId: z.string(),
		success: z.boolean(),
		error: z.string().optional(),
  }),
  z.object({
		type: z.literal("RESULT_STEP"),
		sourceSide: z.literal("executor"),
		seq: z.number(),
		correlationId: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
]);

// 统一消息类型
export const EngineControlMessageSchema = z.union([CommandSchema, ResultSchema]);
export type EngineControlMessage = z.output<typeof EngineControlMessageSchema>;

// 上下文类型
export interface EngineSMContext {
	role: "controller" | "executor"; // 角色：控制器或执行器
	peer: { send: (msg: EngineControlMessage) => void | Promise<void> }; // 对端通信
	engine?: GameEngine; // 引擎执行器（仅 executor 需要）
  controller?: { showPaused?: () => void }; // 控制器UI（可选，不强依赖）
  threadName?: string; // 线程标识：'main' 或 'worker'
	// 权限管理
	hostOperatorId?: string; // 主机操作者ID（仅 executor 需要，用于权限校验）
	// 序列号生成器
	nextSeq: () => number; // 生成下一个序列号
	newCorrelationId: () => string; // 生成新的关联ID
	// 内部状态
	_seqCounter: number; // 序列号计数器
}

export const GameEngineSM = setup({
  types: {} as {
    context: EngineSMContext;
		events: EngineControlMessage;
		input: Omit<EngineSMContext, "_seqCounter"> & { _seqCounter?: number };
  },
  actions: {
		// Controller 侧：发送命令到 executor
		sendToExecutor: ({ context, event }) => {
			if (context.role !== "controller") {
				console.warn(
					`[${context.threadName || "unknown"}] GameEngineSM: sendToExecutor 只能由 controller 调用`,
				);
				return;
			}
			const prefix = context.threadName || "unknown";
			console.log(`[${prefix}] GameEngineSM: Controller 发送命令到 Executor:`, event);
			context.peer.send(event);
		},
		// 权限校验：检查 operatorId 是否为 host
		checkOperatorPermission: ({ context, event }) => {
			if (context.role !== "executor") return true; // controller 侧不需要校验
			if (!context.hostOperatorId) return true; // 未设置 host 时允许所有操作（向后兼容）
			
			const operatorId = "operatorId" in event ? event.operatorId : undefined;
			if (operatorId !== context.hostOperatorId) {
				const prefix = context.threadName || "unknown";
				console.warn(
					`[${prefix}] GameEngineSM: 权限拒绝 - operatorId ${operatorId} 不是 host (${context.hostOperatorId})`,
				);
				return false;
			}
			return true;
		},
		// Executor 侧：执行副作用并回传结果
		runIfExecutorInit: ({ context, event }) => {
			if (context.role !== "executor") {
				console.warn(
					`[${context.threadName || "unknown"}] GameEngineSM: runIfExecutorInit 只能由 executor 调用`,
				);
				return;
			}
			const prefix = context.threadName || "unknown";
			
			// 权限校验
			if (!context.hostOperatorId) {
				// 首次初始化时，将第一个 operatorId 设为 host
				if (event.type === "CMD_INIT" && "operatorId" in event) {
					(context as any).hostOperatorId = event.operatorId;
					console.log(`[${prefix}] GameEngineSM: 设置 hostOperatorId: ${event.operatorId}`);
				}
			} else {
				// 检查权限
				const operatorId = "operatorId" in event ? event.operatorId : undefined;
				if (operatorId !== context.hostOperatorId) {
					console.warn(
						`[${prefix}] GameEngineSM: INIT 权限拒绝 - operatorId ${operatorId} 不是 host (${context.hostOperatorId})`,
					);
					context.peer.send({
						type: "RESULT_INIT",
						sourceSide: "executor",
						seq: context.nextSeq(),
						correlationId: event.correlationId,
						success: false,
						error: `权限拒绝: operatorId ${operatorId} 不是 host`,
					});
					return;
				}
			}
			
      try {
				if (event.type === "CMD_INIT" && event.data) {
          context.engine?.initialize(event.data);
					console.log(`[${prefix}] GameEngineSM: Executor 执行 INIT 完成`);
					context.peer.send({
						type: "RESULT_INIT",
						sourceSide: "executor",
						seq: context.nextSeq(),
						correlationId: event.correlationId,
						success: true,
					});
        } else {
					throw new Error("CMD_INIT 必须提供数据");
        }
      } catch (error) {
				console.error(`[${prefix}] GameEngineSM: Executor 执行 INIT 失败:`, error);
				context.peer.send({
					type: "RESULT_INIT",
					sourceSide: "executor",
					seq: context.nextSeq(),
					correlationId: event.correlationId,
            success: false, 
					error: error instanceof Error ? error.message : String(error),
          });
				throw error;
      }
    },
		runIfExecutorStart: ({ context, event }) => {
			if (context.role !== "executor") return;
			const prefix = context.threadName || "unknown";
			
			// 权限校验
			const operatorId = "operatorId" in event ? event.operatorId : undefined;
			if (context.hostOperatorId && operatorId !== context.hostOperatorId) {
				console.warn(
					`[${prefix}] GameEngineSM: START 权限拒绝 - operatorId ${operatorId} 不是 host (${context.hostOperatorId})`,
				);
				context.peer.send({
					type: "RESULT_START",
					sourceSide: "executor",
					seq: context.nextSeq(),
					correlationId: event.correlationId,
					success: false,
					error: `权限拒绝: operatorId ${operatorId} 不是 host`,
				});
				return;
			}
			
      context.engine?.start();
			console.log(`[${prefix}] GameEngineSM: Executor 执行 START 完成`);
			context.peer.send({
				type: "RESULT_START",
				sourceSide: "executor",
				seq: context.nextSeq(),
				correlationId: event.correlationId,
				success: true,
			});
    },
		runIfExecutorPause: ({ context, event }) => {
			if (context.role !== "executor") return;
			const prefix = context.threadName || "unknown";
			
			// 权限校验
			const operatorId = "operatorId" in event ? event.operatorId : undefined;
			if (context.hostOperatorId && operatorId !== context.hostOperatorId) {
				console.warn(
					`[${prefix}] GameEngineSM: PAUSE 权限拒绝 - operatorId ${operatorId} 不是 host (${context.hostOperatorId})`,
				);
				context.peer.send({
					type: "RESULT_PAUSE",
					sourceSide: "executor",
					seq: context.nextSeq(),
					correlationId: event.correlationId,
					success: false,
					error: `权限拒绝: operatorId ${operatorId} 不是 host`,
				});
				return;
			}
			
      context.engine?.pause();
      context.controller?.showPaused?.();
			console.log(`[${prefix}] GameEngineSM: Executor 执行 PAUSE 完成`);
			context.peer.send({
				type: "RESULT_PAUSE",
				sourceSide: "executor",
				seq: context.nextSeq(),
				correlationId: event.correlationId,
				success: true,
			});
    },
		runIfExecutorResume: ({ context, event }) => {
			if (context.role !== "executor") return;
			const prefix = context.threadName || "unknown";
			
			// 权限校验
			const operatorId = "operatorId" in event ? event.operatorId : undefined;
			if (context.hostOperatorId && operatorId !== context.hostOperatorId) {
				console.warn(
					`[${prefix}] GameEngineSM: RESUME 权限拒绝 - operatorId ${operatorId} 不是 host (${context.hostOperatorId})`,
				);
				context.peer.send({
					type: "RESULT_RESUME",
					sourceSide: "executor",
					seq: context.nextSeq(),
					correlationId: event.correlationId,
					success: false,
					error: `权限拒绝: operatorId ${operatorId} 不是 host`,
				});
				return;
			}
			
      context.engine?.resume();
			console.log(`[${prefix}] GameEngineSM: Executor 执行 RESUME 完成`);
			context.peer.send({
				type: "RESULT_RESUME",
				sourceSide: "executor",
				seq: context.nextSeq(),
				correlationId: event.correlationId,
				success: true,
			});
    },
		runIfExecutorStop: ({ context, event }) => {
			if (context.role !== "executor") return;
			const prefix = context.threadName || "unknown";
			
			// 权限校验
			const operatorId = "operatorId" in event ? event.operatorId : undefined;
			if (context.hostOperatorId && operatorId !== context.hostOperatorId) {
				console.warn(
					`[${prefix}] GameEngineSM: STOP 权限拒绝 - operatorId ${operatorId} 不是 host (${context.hostOperatorId})`,
				);
				context.peer.send({
					type: "RESULT_STOP",
					sourceSide: "executor",
					seq: context.nextSeq(),
					correlationId: event.correlationId,
					success: false,
					error: `权限拒绝: operatorId ${operatorId} 不是 host`,
				});
				return;
			}
			
      context.engine?.stop();
			console.log(`[${prefix}] GameEngineSM: Executor 执行 STOP 完成`);
			context.peer.send({
				type: "RESULT_STOP",
				sourceSide: "executor",
				seq: context.nextSeq(),
				correlationId: event.correlationId,
				success: true,
			});
    },
		runIfExecutorReset: ({ context, event }) => {
			if (context.role !== "executor") return;
			const prefix = context.threadName || "unknown";
			
			// 权限校验
			const operatorId = "operatorId" in event ? event.operatorId : undefined;
			if (context.hostOperatorId && operatorId !== context.hostOperatorId) {
				console.warn(
					`[${prefix}] GameEngineSM: RESET 权限拒绝 - operatorId ${operatorId} 不是 host (${context.hostOperatorId})`,
				);
				context.peer.send({
					type: "RESULT_RESET",
					sourceSide: "executor",
					seq: context.nextSeq(),
					correlationId: event.correlationId,
					success: false,
					error: `权限拒绝: operatorId ${operatorId} 不是 host`,
				});
				return;
			}
			
      context.engine?.reset?.();
			console.log(`[${prefix}] GameEngineSM: Executor 执行 RESET 完成`);
			context.peer.send({
				type: "RESULT_RESET",
				sourceSide: "executor",
				seq: context.nextSeq(),
				correlationId: event.correlationId,
				success: true,
			});
    },
		runIfExecutorResetAndReady: ({ context, event }) => {
			if (context.role !== "executor") return;
			const prefix = context.threadName || "unknown";
			
			// 权限校验
			const operatorId = "operatorId" in event ? event.operatorId : undefined;
			if (context.hostOperatorId && operatorId !== context.hostOperatorId) {
				console.warn(
					`[${prefix}] GameEngineSM: RESET 权限拒绝 - operatorId ${operatorId} 不是 host (${context.hostOperatorId})`,
				);
				context.peer.send({
					type: "RESULT_RESET",
					sourceSide: "executor",
					seq: context.nextSeq(),
					correlationId: event.correlationId,
					success: false,
					error: `权限拒绝: operatorId ${operatorId} 不是 host`,
				});
				return;
			}
			
      context.engine?.reset?.();
			console.log(`[${prefix}] GameEngineSM: Executor 执行 RESET 完成`);
			context.peer.send({
				type: "RESULT_RESET",
				sourceSide: "executor",
				seq: context.nextSeq(),
				correlationId: event.correlationId,
				success: true,
			});
			// 重置后自动转换到 ready 状态：executor 直接进入 ready，不需要再发 CMD_INIT
			// 因为 reset 后引擎已经处于初始化状态，可以直接进入 ready
		},
		runIfExecutorStep: ({ context, event }) => {
			if (context.role !== "executor") return;
			const prefix = context.threadName || "unknown";
			
			// 权限校验
			const operatorId = "operatorId" in event ? event.operatorId : undefined;
			if (context.hostOperatorId && operatorId !== context.hostOperatorId) {
				console.warn(
					`[${prefix}] GameEngineSM: STEP 权限拒绝 - operatorId ${operatorId} 不是 host (${context.hostOperatorId})`,
				);
				context.peer.send({
					type: "RESULT_STEP",
					sourceSide: "executor",
					seq: context.nextSeq(),
					correlationId: event.correlationId,
					success: false,
					error: `权限拒绝: operatorId ${operatorId} 不是 host`,
				});
				return;
			}
			
      context.engine?.step?.();
			console.log(`[${prefix}] GameEngineSM: Executor 执行 STEP 完成`);
			context.peer.send({
				type: "RESULT_STEP",
				sourceSide: "executor",
				seq: context.nextSeq(),
				correlationId: event.correlationId,
				success: true,
			});
    },
  },
}).createMachine({
  id: "engine",
  initial: "idle",
	context: ({ input }) => ({
		...input,
		_seqCounter: input._seqCounter ?? 0,
		nextSeq: input.nextSeq ?? (() => {
			let counter = input._seqCounter ?? 0;
			return () => ++counter;
		})(),
		newCorrelationId: input.newCorrelationId ?? (() => createId),
	}),
  states: {
    idle: {
      on: {
				CMD_INIT: [
          {
						guard: ({ context }) => context.role === "controller",
            target: "initializing",
						actions: ["sendToExecutor"],
          },
          {
						guard: ({ context }) => context.role === "executor",
            target: "ready",
						actions: ["runIfExecutorInit"],
          },
        ],
      },
    },

    initializing: {
      on: {
				RESULT_INIT: [
          {
						guard: ({ event, context }) =>
							context.role === "controller" && event.sourceSide === "executor" && event.success,
            target: "ready",
          },
          {
						guard: ({ event, context }) =>
							context.role === "controller" && event.sourceSide === "executor" && !event.success,
            target: "idle",
          },
        ],
      },
      // 添加超时保护，如果长时间没有收到 RESULT，自动回到 idle
      after: {
        10000: {
          target: "idle",
          actions: ({ context }) => {
						const prefix = context.threadName || "unknown";
            console.warn(`[${prefix}] GameEngineSM: 初始化超时，返回 idle 状态`);
          },
        },
      },
    },

    ready: {
      on: {
				CMD_START: [
          {
						guard: ({ context }) => context.role === "controller",
            target: "starting",
						actions: ["sendToExecutor"],
          },
          {
						guard: ({ context }) => context.role === "executor",
            target: "running",
						actions: ["runIfExecutorStart"],
          },
        ],
				CMD_RESET: [
          {
						guard: ({ context }) => context.role === "controller",
            target: "idle",
						actions: ["sendToExecutor"],
          },
          {
						guard: ({ context }) => context.role === "executor",
            target: "idle",
						actions: ["runIfExecutorReset"],
          },
        ],
      },
    },

    starting: {
      on: {
				RESULT_START: {
					guard: ({ event, context }) =>
						context.role === "controller" && event.sourceSide === "executor" && event.success,
          target: "running",
        },
				CMD_RESET: [
          {
						guard: ({ context }) => context.role === "controller",
            target: "idle",
						actions: ["sendToExecutor"],
          },
          {
						guard: ({ context }) => context.role === "executor",
            target: "idle",
						actions: ["runIfExecutorReset"],
          },
        ],
      },
    },

    running: {
      on: {
				CMD_PAUSE: [
          {
						guard: ({ context }) => context.role === "controller",
            target: "pausing",
						actions: ["sendToExecutor"],
          },
          {
						guard: ({ context }) => context.role === "executor",
            target: "paused",
						actions: ["runIfExecutorPause"],
          },
        ],
				CMD_STOP: [
          {
						guard: ({ context }) => context.role === "controller",
            target: "stopping",
						actions: ["sendToExecutor"],
          },
          {
						guard: ({ context }) => context.role === "executor",
            target: "stopped",
						actions: ["runIfExecutorStop"],
          },
        ],
				CMD_RESET: [
          {
						guard: ({ context }) => context.role === "controller",
            target: "idle",
						actions: ["sendToExecutor"],
          },
          {
						guard: ({ context }) => context.role === "executor",
            target: "idle",
						actions: ["runIfExecutorReset"],
          },
        ],
      },
    },

    pausing: {
      on: {
				RESULT_PAUSE: {
					guard: ({ event, context }) =>
						context.role === "controller" && event.sourceSide === "executor" && event.success,
          target: "paused",
        },
				CMD_RESET: [
          {
						guard: ({ context }) => context.role === "controller",
            target: "idle",
						actions: ["sendToExecutor"],
          },
          {
						guard: ({ context }) => context.role === "executor",
            target: "idle",
						actions: ["runIfExecutorReset"],
          },
        ],
      },
    },

    paused: {
      on: {
				CMD_RESUME: [
          {
						guard: ({ context }) => context.role === "controller",
            target: "resuming",
						actions: ["sendToExecutor"],
          },
          {
						guard: ({ context }) => context.role === "executor",
            target: "running",
						actions: ["runIfExecutorResume"],
          },
        ],
				CMD_STEP: [
          {
						guard: ({ context }) => context.role === "controller",
            target: "paused",
						actions: ["sendToExecutor"],
          },
          {
						guard: ({ context }) => context.role === "executor",
            target: "paused",
						actions: ["runIfExecutorStep"],
          },
        ],
				CMD_STOP: [
          {
						guard: ({ context }) => context.role === "controller",
            target: "stopping",
						actions: ["sendToExecutor"],
          },
          {
						guard: ({ context }) => context.role === "executor",
            target: "stopped",
						actions: ["runIfExecutorStop"],
          },
        ],
				CMD_RESET: [
          {
						guard: ({ context }) => context.role === "controller",
            target: "idle",
						actions: ["sendToExecutor"],
          },
          {
						guard: ({ context }) => context.role === "executor",
            target: "idle",
						actions: ["runIfExecutorReset"],
          },
        ],
      },
    },

    resuming: {
      on: {
				RESULT_RESUME: {
					guard: ({ event, context }) =>
						context.role === "controller" && event.sourceSide === "executor" && event.success,
          target: "running",
        },
				CMD_RESET: [
          {
						guard: ({ context }) => context.role === "controller",
            target: "idle",
						actions: ["sendToExecutor"],
          },
          {
						guard: ({ context }) => context.role === "executor",
            target: "idle",
						actions: ["runIfExecutorReset"],
          },
        ],
      },
    },

    stopping: {
      on: {
				RESULT_STOP: {
					guard: ({ event, context }) =>
						context.role === "controller" && event.sourceSide === "executor" && event.success,
          target: "stopped",
        },
				CMD_RESET: [
          {
						guard: ({ context }) => context.role === "controller",
            target: "idle",
						actions: ["sendToExecutor"],
          },
          {
						guard: ({ context }) => context.role === "executor",
            target: "idle",
						actions: ["runIfExecutorReset"],
          },
        ],
      },
    },

    stopped: {
      on: {
				CMD_RESET: [
          {
						guard: ({ context }) => context.role === "controller",
            target: "idle",
						actions: ["sendToExecutor"],
          },
          {
						guard: ({ context }) => context.role === "executor",
            target: "ready",
						actions: ["runIfExecutorResetAndReady"],
          },
        ],
      },
    },
  },
});
