/**
 * 沙盒化的模拟器Worker
 * 将GameEngine运行在安全沙盒环境中
 */
import { prepareForTransfer, sanitizeForPostMessage } from "~/lib/WorkerPool/MessageSerializer";
import type { WorkerMessage, WorkerMessageEvent } from "~/lib/WorkerPool/type";
import { GameEngine } from "../GameEngine";
import { type EngineControlMessage, EngineControlMessageSchema } from "../GameEngineSM";
import type { SimulatorSafeAPI } from "../sandboxGlobals";
import {
	type DataQueryCommand,
	DataQueryCommandSchema,
	type SimulatorTaskMap,
	type SimulatorTaskPriority,
	type SimulatorTaskTypeMapValue,
} from "./SimulatorPool";
import { DebugViewRegistry } from "./DebugViewRegistry";

// ==================== 沙盒环境初始化 ====================

/**
 * 初始化Worker沙盒环境
 * 屏蔽危险的全局对象，确保JS片段执行安全
 */
function initializeWorkerSandbox() {
	// 2. 屏蔽危险的全局对象
	// 使用 Reflect.set(target, prop, value) 可以避免类型不兼容报错，无需 as any
	// 注意：'this' 是保留关键字，必须使用字符串索引访问

	const propsToUndefine = [
		"global",
		"process",
		"require",
		"module",
		"exports",
		"Buffer",
		"eval",
		"importScripts",
		"this",
	];

	propsToUndefine.forEach((key) => {
		Reflect.set(globalThis, key, undefined);
	});

	// 3. 提供安全的 API
	// 现在 globalThis.safeAPI 拥有完整的类型推断
	const sandboxGlobal = globalThis as typeof globalThis & { safeAPI: SimulatorSafeAPI };
	sandboxGlobal.safeAPI = {
		console,
		setTimeout,
		clearTimeout,
		setInterval,
		clearInterval,
		Date,
		Math,
		JSON,
		// 数学函数的便捷访问
		floor: Math.floor,
		ceil: Math.ceil,
		round: Math.round,
		max: Math.max,
		min: Math.min,
		abs: Math.abs,
		pow: Math.pow,
		sqrt: Math.sqrt,
		// ID生成和时间
		generateId: () => Math.random().toString(36).substring(2, 15),
		now: () => Date.now(),
	};

	// console.log("🛡️ Worker沙盒环境已初始化");
}

// 初始化沙盒环境
initializeWorkerSandbox();

// 在沙盒环境中创建GameEngine实例
const gameEngine = new GameEngine({
	enableRealtimeControl: true,
	eventQueueConfig: {
		maxQueueSize: 1000,
		enablePerformanceMonitoring: false,
	},
	frameLoopConfig: {
		targetFPS: 60,
		enableFrameSkip: true,
		maxFrameSkip: 5,
		enablePerformanceMonitoring: false,
		timeScale: 1,
		maxEventsPerFrame: 10,
		mode: "realtime",
	},
});

// 创建调试视图注册表（井盖模式）
const debugViewRegistry = new DebugViewRegistry();
debugViewRegistry.setGameEngine(gameEngine);

// 注释：引擎状态机现在已集成到 GameEngine 内部，不再需要单独的 Actor

// ==================== 数据查询处理函数 ====================

/**
 * 处理数据查询命令
 */
async function handleDataQuery(
	command: DataQueryCommand,
): Promise<{ success: boolean; data?: unknown; error?: string }> {
	try {
		switch (command.type) {
			case "get_members": {
				const members = gameEngine.getAllMemberData();
				return { success: true, data: members };
			}
			case "get_member_skill_list": {
				const memberId = command.memberId;
				if (!memberId) {
					return { success: false, error: "memberId required" };
				}
				try {
					return { success: true, data: gameEngine.getMemberSkillList(memberId) };
				} catch (error) {
					return {
						success: false,
						error: error instanceof Error ? error.message : "Unknown error",
					};
				}
			}

			case "get_stats": {
				const stats = gameEngine.getStats();
				return { success: true, data: stats };
			}

			case "get_snapshot": {
				const snapshot = gameEngine.getCurrentSnapshot();
				return { success: true, data: snapshot };
			}
			case "get_member_state": {
				const memberId = command.memberId;
				if (!memberId) {
					return { success: false, error: "memberId required" };
				}
				const member = gameEngine.getMember(memberId);
				if (!member) {
					return { success: false, error: "member not found" };
				}
				try {
					const snap = member.actor.getSnapshot();
					const value = String(snap?.value ?? "");
					return { success: true, data: { memberId, value } };
				} catch (e) {
					return {
						success: false,
						error: e instanceof Error ? e.message : "Unknown error",
					};
				}
			}

			case "send_intent": {
				const intent = command.intent;
				if (!intent || !intent.type) {
					return { success: false, error: "Invalid intent data" };
				}
				try {
					const result = await gameEngine.processIntent(intent);
					return { success: result.success, error: result.error };
				} catch (error) {
					return {
						success: false,
						error: error instanceof Error ? error.message : "Unknown error",
					};
				}
			}

			case "subscribe_debug_view": {
				try {
					const viewId = debugViewRegistry.subscribe({
						controllerId: command.controllerId,
						memberId: command.memberId,
						viewType: command.viewType,
						hz: command.hz ?? 10,
						fields: command.fields,
					});
					return { success: true, data: { viewId } };
				} catch (error) {
					return {
						success: false,
						error: error instanceof Error ? error.message : "Unknown error",
					};
				}
			}

			case "unsubscribe_debug_view": {
				try {
					const removed = debugViewRegistry.unsubscribe(command.viewId);
					return { success: removed, error: removed ? undefined : "订阅不存在" };
				} catch (error) {
					return {
						success: false,
						error: error instanceof Error ? error.message : "Unknown error",
					};
				}
			}
		}
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

// 处理主线程消息 - 只处理初始化
self.onmessage = async (event: MessageEvent<{ type: "init"; port?: MessagePort }>) => {
	const { type, port } = event.data;

	try {
		switch (type) {
			case "init": {
				// 初始化Worker，设置MessageChannel
				if (!port) {
					throw new Error("初始化失败，缺少MessagePort");
				}
				const messagePort: MessagePort = port;

				// 设置引擎的对端通信发送器（executor → controller）
				// 统一使用 postSystemMessage 发送 engine_state_machine
				gameEngine.setMirrorSender((msg: EngineControlMessage) => {
					try {
						postSystemMessage(messagePort, "engine_state_machine", msg);
					} catch (error) {
						console.error("Worker: 发送对端消息失败:", error);
					}
				});

				// 设置MessageChannel端口用于任务通信
				messagePort.onmessage = async (
					portEvent: MessageEvent<WorkerMessage<SimulatorTaskTypeMapValue, SimulatorTaskPriority>>,
				) => {
					// console.log("🔌 Worker: 收到消息", portEvent.data);
					const { belongToTaskId: portbelongToTaskId, payload } = portEvent.data;
					const startTime = performance.now();

					try {
						// 检查命令是否存在
						if (!payload) {
							throw new Error("命令不能为空");
						}

						let portResult: { success: boolean; data?: unknown; error?: string };

						// 使用 Zod Schema 验证命令类型
						const engineCommandResult = EngineControlMessageSchema.safeParse(payload);
						const dataQueryResult = DataQueryCommandSchema.safeParse(payload);
						if (engineCommandResult.success) {
							// 状态机命令直接转发给引擎（controller → executor）
							console.log("收到状态机命令:", engineCommandResult.data);
							gameEngine.sendCommand(engineCommandResult.data);
							// console.log("命令已发送到引擎状态机");
							portResult = { success: true };
						} else if (dataQueryResult.success) {
							console.log("收到意图:", dataQueryResult.data);
							// 数据查询命令处理
							portResult = await handleDataQuery(dataQueryResult.data);
							// console.log("数据查询命令已处理:", portResult);
						} else {
							console.error(payload);
							console.error(engineCommandResult.error);
							console.error(dataQueryResult.error);
							const maybeType =
								typeof payload === "object" && payload !== null && "type" in payload
									? String((payload as { type?: unknown }).type)
									: "undefined";
							throw new Error(`未知命令类型: ${maybeType}`);
						}

						// 计算执行时间
						const endTime = performance.now();
						const duration = endTime - startTime;

						// 返回结果给SimulatorPool
						const response: WorkerMessageEvent<
							unknown,
							SimulatorTaskMap,
							unknown
						> = {
							belongToTaskId: portbelongToTaskId,
							result: portResult,
							error: null,
							metrics: {
								duration,
								memoryUsage: 0, // 浏览器环境无法获取精确内存使用
							},
						};
						messagePort.postMessage(response);
					} catch (error) {
						// 计算执行时间
						const endTime = performance.now();
						const duration = endTime - startTime;

						// 返回错误给SimulatorPool
						const errorResponse: WorkerMessageEvent<
							unknown,
							SimulatorTaskMap,
							unknown
						> = {
							belongToTaskId: portbelongToTaskId,
							result: null,
							error: error instanceof Error ? error.message : String(error),
							metrics: {
								duration,
								memoryUsage: 0,
							},
						};
						messagePort.postMessage(errorResponse);
					}
				};

				// 设置渲染消息发送器：用于FSM发送渲染指令（通过系统消息格式）
				gameEngine.setRenderMessageSender((payload: unknown) => {
					try {
						// console.log("🔌 Worker: 发送渲染消息到主线程", payload);
						postSystemMessage(messagePort, "render_cmd", payload);
					} catch (error) {
						console.error("Worker: 发送渲染消息失败:", error);
					}
				});

				// 设置系统消息发送器：用于发送系统级事件到控制器（worker_ready/error/日志等）
				gameEngine.setSystemMessageSender((payload: unknown) => {
					try {
						console.log("🔌 Worker: 发送系统消息到主线程", payload);
						postSystemMessage(messagePort, "system_event", payload);
					} catch (error) {
						console.error("Worker: 发送系统消息失败:", error);
					}
				});

				// 设置领域事件批发送器：直接发送 domain_event_batch 顶层消息
				gameEngine.setDomainEventBatchSender((payload) => {
					try {
						// console.log("🔌 Worker: 发送领域事件批到主线程", payload);
						postSystemMessage(messagePort, "domain_event_batch", payload);
					} catch (error) {
						console.error("Worker: 发送领域事件批失败:", error);
					}
				});

				// 设置调试视图数据帧发送器
				debugViewRegistry.setDebugFrameSender((frame) => {
					try {
						postSystemMessage(messagePort, "debug_view_frame", frame);
					} catch (error) {
						console.error("Worker: 发送调试视图数据帧失败:", error);
					}
				});

				// 设置帧快照发送器：用于发送帧快照到主线程（向后兼容）
				gameEngine.setFrameSnapshotSender((snapshot) => {
					try {
						postSystemMessage(messagePort, "frame_snapshot", snapshot);
					} catch (error) {
						console.error("Worker: 发送帧快照失败:", error);
					}
				});

				// 启动引擎遥测推送（轻量指标，独立于 frame_snapshot）
				startTelemetryLoop(messagePort);

				// 发送 Worker 初始化完成消息
				// console.log("✅ Worker: 初始化完成，发送 ready 消息");
				postSystemMessage(messagePort, "system_event", {
					type: "worker_ready",
					workerId: "main",
				});

				return;
			}

			default:
				throw new Error(`未知消息类型: ${type}`);
		}
	} catch (error) {
		// 初始化错误，通过MessageChannel返回
		console.error("Worker初始化失败:", error);
		try {
			if (typeof port !== "undefined" && port) {
				postSystemMessage(port as MessagePort, "system_event", {
					level: "error",
					message: String(error),
				});
			}
		} catch {}
	}
};

// ==================== 统一系统消息出口 ====================
/**
 * 统一的 Push/Stream 消息发送函数
 * 
 * 支持所有顶层 push 消息类型：
 * - engine_state_machine: 引擎状态机镜像
 * - render_cmd: 渲染指令
 * - domain_event_batch: 控制器领域事件批
 * - system_event: 系统事件（worker_ready/error/日志等）
 * - frame_snapshot: 帧快照（向后兼容）
 * - debug_view_frame: 调试视图数据帧（订阅制）
 */
function postSystemMessage(
	port: MessagePort,
	type:
		| "system_event"
		| "frame_snapshot"
		| "render_cmd"
		| "engine_state_machine"
		| "engine_telemetry"
		| "domain_event_batch"
		| "debug_view_frame",
	data: unknown,
) {
	// 使用共享的MessageSerializer确保数据可以安全地通过postMessage传递
	const sanitizedData = sanitizeForPostMessage(data);
	const msg = { belongToTaskId: type, type, data: sanitizedData } as const;

	try {
		const { message, transferables } = prepareForTransfer(msg);
		port?.postMessage(message, transferables);
	} catch (error) {
		console.error("Worker: 消息序列化失败:", error);
		// 如果序列化失败，尝试发送清理后的数据
		try {
			port?.postMessage({ belongToTaskId: type, type, data: sanitizedData });
		} catch (fallbackError) {
			console.error("Worker: 备用消息发送也失败:", fallbackError);
		}
	}
}

// ==================== 引擎遥测（轻量指标） ====================
const TELEMETRY_INTERVAL_MS = 200;
let telemetryTimer: number | null = null;

function startTelemetryLoop(port: MessagePort) {
	if (telemetryTimer !== null) return;
	telemetryTimer = setInterval(() => {
		try {
			// 仅在运行/暂停阶段推送遥测（避免 idle 时噪音）
			if (!gameEngine.isRunning() && gameEngine.getSMState() !== "paused") return;
			const frameLoopStats = gameEngine.getFrameLoop().getFrameLoopStats();
			postSystemMessage(port, "engine_telemetry", {
				frameNumber: gameEngine.getCurrentFrame(),
				runTime: gameEngine.getRunTimeMs(),
				fps: frameLoopStats.averageFPS,
				memberCount: gameEngine.getMemberCount(),
			});
		} catch {
			// 遥测失败不应影响主流程
		}
	}, TELEMETRY_INTERVAL_MS) as unknown as number;
}

