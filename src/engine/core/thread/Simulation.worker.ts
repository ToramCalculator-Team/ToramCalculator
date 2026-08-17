/**
 * 模拟器 Worker。
 *
 * GameEngine 运行在 Worker 内，并屏蔽部分全局对象；这里不是强安全沙箱。
 */

import { createActor } from "xstate";
import { createLogger, LogLevel, setGlobalLogLevel } from "~/lib/logger";
import { prepareForTransfer, sanitizeForPostMessage } from "~/lib/workerPool/MessageSerializer";
import type { WorkerMessage, WorkerMessageEvent } from "~/lib/workerPool/type";
import { BUILT_IN_EVENTS } from "../Event/BuiltInEvents";
import { EventCatalog } from "../Event/EventCatalog";
import { getBuiltInTags } from "../Event/TagConstants";
import { TagRegistry } from "../Event/TagRegistry";
import { GameEngine } from "../GameEngine";
import {
	type EngineLifecycleCommand,
	EngineLifecycleCommandSchema,
	type EngineLifecycleResult,
	type EngineLifecycleSnapshot,
	GameEngineSM,
	projectEngineLifecycleSnapshot,
} from "../GameEngineSM";
import { JSProcessor } from "../JSProcessor/JSProcessor";
import { PipelineCatalog } from "../Pipeline/PipelineCatalog";
import { PipelineResolverService } from "../Pipeline/PipelineResolverService";
import type { SimulatorSafeAPI } from "../sandboxGlobals";
import type { EngineInfrastructure } from "../types";
import { ModifierType } from "../World/Member/runtime/AttributeContainer/AttributeContainer";
import type { MemberMovementInput } from "../World/Member/runtime/types";
import { readSharedMovementState, type SharedMovementStateSnapshot } from "./controllerInputBuffer";
import { DebugViewRegistry } from "./DebugViewRegistry";
import { executeSimulationTask } from "./executeSimulationTask";
import {
	type EngineRPC,
	EngineRPCSchema,
	type EngineRPCWireResult,
	type EngineTaskPriority,
	type EngineWorkerTaskMap,
	type EngineWorkerTaskResult,
	type EngineWorkerTaskTypeMapValue,
	engineLifecycleFailure,
	engineLifecycleSuccess,
	engineRPCFailure,
	engineRPCSuccess,
	type PushMessageType,
} from "./protocol";
import {
	STATE_FLAG_AIRBORNE,
	STATE_FLAG_MOVING,
	WorldStateAreaShapeKind,
	WorldStateAreaType,
	type WorldStateCommit,
	WorldStateEntityType,
	WorldStateWriter,
	worldStateStringId,
} from "./worldStateBuffer";

function readConfiguredLogLevel(): LogLevel | null {
	const raw = new URL(globalThis.location.href).searchParams.get("engineLogLevel");
	switch (raw) {
		case "0":
			return LogLevel.SILENT;
		case "1":
			return LogLevel.ERROR;
		case "2":
			return LogLevel.WARN;
		case "3":
			return LogLevel.INFO;
		case "4":
			return LogLevel.DEBUG;
		default:
			return null;
	}
}

const configuredLogLevel = readConfiguredLogLevel();
if (configuredLogLevel !== null) setGlobalLogLevel(configuredLogLevel);
// 常驻 Worker 保持 SimWorker 自身仅报错；分支 Worker 则由 EngineService 的全局等级统一控制全部模块。
const log = createLogger("SimWorker", {
	level: configuredLogLevel === null ? LogLevel.ERROR : LogLevel.DEBUG,
});

// ==================== Worker 受限环境初始化 ====================

/**
 * 初始化 Worker 受限全局对象。
 *
 * 这里的边界是 Worker 隔离 + 屏蔽部分全局对象，不是强安全沙箱。
 * 表达式或 BT agent 若来自不可信输入，必须先经过额外的策略限制。
 */
function initializeRestrictedWorkerEnvironment() {
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

	// 3. 提供受限 API
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

	// console.log("Worker 受限环境已初始化");
}

// 初始化 Worker 受限环境
initializeRestrictedWorkerEnvironment();

// Worker 级长期持有的基础设施 -- 跨 engine reset/cleanup 存活
const pipelineCatalog = new PipelineCatalog();
const tagRegistry = new TagRegistry(getBuiltInTags());
const eventCatalog = new EventCatalog(BUILT_IN_EVENTS);
const infra: EngineInfrastructure = {
	jsProcessor: new JSProcessor(),
	pipelineCatalog,
	pipelineResolverService: new PipelineResolverService(pipelineCatalog),
	tagRegistry,
	eventCatalog,
};

const gameEngine = new GameEngine(
	{
		eventQueueConfig: {
			maxQueueSize: 1000,
			enablePerformanceMonitoring: false,
		},
		frameLoopConfig: {
			logicHz: 60,
			enableTickSkip: true,
			maxTickSkip: 5,
			enablePerformanceMonitoring: false,
			timeScale: 1,
			maxEventsPerTick: 10,
		},
	},
	infra,
);

const executorActor = createActor(GameEngineSM, { input: { role: "executor" } });
executorActor.start();

// ─── SAB 世界状态写入器（Worker 侧，loadScenario 后由主线程 RPC 初始化） ──────
let worldStateWriter: WorldStateWriter | null = null;
const controllerInputReaders = new Map<
	string,
	{ buffer: SharedArrayBuffer; lastStableState: SharedMovementStateSnapshot | null }
>();

/** 在 Tick 收尾一次性收集所有实时表，确保属性、动作状态和区域来自同一提交。 */
function createWorldStateCommit(): WorldStateCommit {
	const currentTimeMs = gameEngine.getCurrentTimeMs();
	const modifierSources: Array<{ idHash: number; type: number }> = [];
	const modifierChains: Array<{ sourceIndex: number; parentIndex: number }> = [];
	const sourceIndexes = new Map<string, number>();
	const members = gameEngine
		.getWorld()
		.memberManager.getAllMembers()
		.map((member) => {
			const container = member.attributeContainer;
			container.prepareIndexedRead();
			const attributes = {
				base: Array.from({ length: container.getAttributeCount() }, (_, index) => container.getBaseValueAt(index)),
				act: Array.from({ length: container.getAttributeCount() }, (_, index) => container.getValueAt(index)),
			};
			const modifiers: Array<{
				attributeIndex: number;
				type: number;
				value: number;
				sourceIndex: number;
				chainIndex: number;
			}> = [];
			for (let index = 0; index < container.getAttributeCount(); index++) {
				for (const type of [
					ModifierType.BASE_VALUE,
					ModifierType.STATIC_FIXED,
					ModifierType.STATIC_PERCENTAGE,
					ModifierType.DYNAMIC_FIXED,
					ModifierType.DYNAMIC_PERCENTAGE,
				]) {
					container.visitModifiersAt(index, type, (source, value) => {
						let sourceIndex = sourceIndexes.get(source.key);
						if (sourceIndex === undefined) {
							sourceIndex = modifierSources.length;
							sourceIndexes.set(source.key, sourceIndex);
							modifierSources.push({ idHash: worldStateStringId(source.key), type: worldStateStringId(source.type) });
							modifierChains.push({ sourceIndex, parentIndex: -1 });
						}
						modifiers.push({ attributeIndex: index, type, value, sourceIndex, chainIndex: sourceIndex });
					});
				}
			}
			const currentState = member.presentationState.current;
			const entityType =
				member.type === "Mob"
					? WorldStateEntityType.MOB
					: member.type === "Player"
						? WorldStateEntityType.PLAYER
						: WorldStateEntityType.SUMMON;
			return {
				id: member.id,
				entityType,
				visualProfileId: worldStateStringId(member.id),
				active: true,
				position: member.position,
				yaw: member.runtime.yaw,
				speed: member.runtime.movement?.speed ?? 0,
				stateFlags:
					(member.runtime.movement ? STATE_FLAG_MOVING : 0) | (!member.runtime.grounded ? STATE_FLAG_AIRBORNE : 0),
				state: {
					id: currentState ? worldStateStringId(currentState.name) : 0,
					instance: currentState?.instance ?? 0,
					startedAtLogicalTimeMs: currentState?.startedAtLogicalTimeMs ?? currentTimeMs,
				},
				attributes,
				modifiers,
			};
		});
	const areaSnapshots = gameEngine.getWorld().areaManager.damageAreaSystem.getAreaSnapshot(currentTimeMs);
	return {
		logicalTimeMs: currentTimeMs,
		tickIndex: gameEngine.getTickIndex(),
		members,
		modifierSources,
		modifierChains,
		areas: areaSnapshots.map((area) => ({
			id: area.id,
			active: true,
			type: WorldStateAreaType.DAMAGE,
			shape: {
				kind:
					area.shape.kind === "point"
						? WorldStateAreaShapeKind.POINT
						: area.shape.kind === "rect"
							? WorldStateAreaShapeKind.RECTANGLE
							: WorldStateAreaShapeKind.CIRCLE,
				radius: area.shape.radius,
				width: area.shape.width,
				height: area.shape.height,
			},
			spawnTimeMs: area.spawnTimeMs,
			trajectory: area.trajectory,
			sourceMemberId: area.sourceMemberId,
			targetMemberId: area.targetMemberId,
		})),
	};
}

gameEngine.setControllerMovementInputSource((controllerId): MemberMovementInput | null => {
	const reader = controllerInputReaders.get(controllerId);
	if (!reader) return null;
	const current = readSharedMovementState(reader.buffer);
	if (current !== null) reader.lastStableState = current;
	const state = reader.lastStableState;
	if (!state?.enabled || !state.moving) return null;
	return { direction: state.direction, intensity: state.intensity };
});

const getExecutorSnapshot = (): EngineLifecycleSnapshot => projectEngineLifecycleSnapshot(executorActor.getSnapshot());

function requireExecutorState(operation: string, allowed: readonly EngineLifecycleSnapshot["state"][]): void {
	const state = getExecutorSnapshot().state;
	if (allowed.includes(state)) return;
	throw {
		code: "invalid_engine_lifecycle_state",
		message: `${operation} 不允许在 ${state} 状态执行`,
		details: { operation, state, allowed },
	};
}

/** 在 Worker 权威 actor 已接纳命令后执行原子副作用，并把实际结果送回同一 actor。 */
function handleLifecycleCommand(command: EngineLifecycleCommand): EngineWorkerTaskResult {
	executorActor.send(command);
	const pending = getExecutorSnapshot().pending;
	if (pending?.correlationId !== command.correlationId) {
		return engineLifecycleFailure(
			command,
			{
				code: "invalid_engine_lifecycle_transition",
				message: `${command.type} 不允许在 ${getExecutorSnapshot().state} 状态执行`,
			},
			"invalid_engine_lifecycle_transition",
		);
	}

	let result: EngineLifecycleResult;
	try {
		switch (command.type) {
			case "CMD_INIT":
				gameEngine.loadScenario(command.data);
				result = engineLifecycleSuccess(command);
				break;
			case "CMD_START":
				gameEngine.start();
				result = engineLifecycleSuccess(command);
				break;
			case "CMD_PAUSE":
				gameEngine.pause();
				result = engineLifecycleSuccess(command);
				break;
			case "CMD_RESUME":
				gameEngine.resume();
				result = engineLifecycleSuccess(command);
				break;
			case "CMD_STOP":
				gameEngine.stop();
				result = engineLifecycleSuccess(command);
				break;
			case "CMD_RESET":
				gameEngine.reset();
				result = engineLifecycleSuccess(command);
				break;
			case "CMD_STEP":
				gameEngine.step();
				result = engineLifecycleSuccess(command);
				break;
			case "CMD_UNLOAD":
				gameEngine.unloadScenario();
				controllerInputReaders.clear();
				worldStateWriter = null;
				gameEngine.setPostTickCallback(null);
				result = engineLifecycleSuccess(command);
				break;
			case "CMD_FAST_FORWARD":
				result = engineLifecycleSuccess(command, gameEngine.fastForwardSync(command.options));
				break;
		}
	} catch (error) {
		result = engineLifecycleFailure(command, error);
	}

	executorActor.send(result);
	return result;
}

// 创建调试视图注册表（井盖模式）
const debugViewRegistry = new DebugViewRegistry();
debugViewRegistry.setGameEngine(gameEngine);

// ==================== Engine RPC 处理函数 ====================

/** 处理已通过请求 Schema 校验的 Engine RPC，并按请求类型构造成功响应。 */
async function handleEngineRPC(rpc: EngineRPC): Promise<EngineRPCWireResult> {
	try {
		switch (rpc.type) {
			case "get_members": {
				requireExecutorState(rpc.type, ["ready", "running", "paused"]);
				return engineRPCSuccess(rpc.type, gameEngine.getAllMemberData());
			}
			case "get_member_skill_list": {
				requireExecutorState(rpc.type, ["ready", "running", "paused"]);
				return engineRPCSuccess(rpc.type, gameEngine.getMemberSkillList(rpc.memberId));
			}

			case "send_intent": {
				requireExecutorState(rpc.type, ["ready", "running", "paused"]);
				const result = await gameEngine.processIntent(rpc.intent);
				return result.success
					? engineRPCSuccess(rpc.type, undefined)
					: engineRPCFailure(result.error ?? "intent failed");
			}

			case "start_run_output": {
				requireExecutorState(rpc.type, ["ready"]);
				gameEngine.startRunOutput(rpc.runId, rpc.recordingPolicy);
				return engineRPCSuccess(rpc.type, undefined);
			}

			case "finish_run_output": {
				requireExecutorState(rpc.type, ["ready"]);
				return engineRPCSuccess(rpc.type, gameEngine.finishRunOutput(rpc.runId));
			}

			case "cancel_run_output": {
				gameEngine.cancelRunOutput(rpc.runId);
				return engineRPCSuccess(rpc.type, undefined);
			}

			case "acknowledge_run_output": {
				gameEngine.acknowledgeRunOutput(rpc.runId);
				return engineRPCSuccess(rpc.type, undefined);
			}

			case "subscribe_debug_view": {
				const viewId = debugViewRegistry.subscribe({
					controllerId: rpc.controllerId,
					memberId: rpc.memberId,
					viewType: rpc.viewType,
					hz: rpc.hz ?? 10,
					fields: rpc.fields,
				});
				return engineRPCSuccess(rpc.type, { viewId });
			}

			case "unsubscribe_debug_view": {
				return debugViewRegistry.unsubscribe(rpc.viewId)
					? engineRPCSuccess(rpc.type, undefined)
					: engineRPCFailure("订阅不存在");
			}

			case "get_world_state_layout": {
				requireExecutorState(rpc.type, ["ready", "running", "paused"]);
				return engineRPCSuccess(rpc.type, gameEngine.getRealtimeWorldStateLayout());
			}

			case "set_runtime_config": {
				requireExecutorState(rpc.type, ["idle", "ready"]);
				gameEngine.setRuntimeConfig(rpc.config);
				return engineRPCSuccess(rpc.type, undefined);
			}

			case "execute_simulation_task": {
				requireExecutorState(rpc.type, ["idle"]);
				return engineRPCSuccess(rpc.type, await executeSimulationTask(gameEngine, rpc.task));
			}

			case "patch_member": {
				requireExecutorState(rpc.type, ["ready"]);
				return gameEngine.patchMemberConfig(rpc.memberId, rpc.memberData)
					? engineRPCSuccess(rpc.type, undefined)
					: engineRPCFailure("patchMemberConfig failed");
			}

			case "attach_controller_input": {
				const initialState = readSharedMovementState(rpc.buffer);
				controllerInputReaders.set(rpc.controllerId, {
					buffer: rpc.buffer,
					lastStableState: initialState,
				});
				return engineRPCSuccess(rpc.type, undefined);
			}

			case "detach_controller_input": {
				controllerInputReaders.delete(rpc.controllerId);
				return engineRPCSuccess(rpc.type, undefined);
			}

			case "attach_world_state_buffer": {
				worldStateWriter = new WorldStateWriter(rpc.buffer, rpc.descriptor);
				const writeWorldState = () => {
					if (!worldStateWriter) return;
					worldStateWriter.write(createWorldStateCommit());
				};
				gameEngine.setPostTickCallback(writeWorldState);
				writeWorldState();
				return engineRPCSuccess(rpc.type, undefined);
			}

			case "detach_world_state_buffer": {
				worldStateWriter = null;
				gameEngine.setPostTickCallback(null);
				return engineRPCSuccess(rpc.type, undefined);
			}

			case "attach_tick_signal": {
				const tickSignalView = new Int32Array(rpc.buffer);
				gameEngine.getFrameLoop().attachTickSignal(tickSignalView);
				return engineRPCSuccess(rpc.type, undefined);
			}

			case "detach_tick_signal": {
				gameEngine.getFrameLoop().detachTickSignal();
				return engineRPCSuccess(rpc.type, undefined);
			}
		}
	} catch (error) {
		return engineRPCFailure(error);
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

				executorActor.subscribe((snapshot) => {
					postSystemMessage(messagePort, "engine_lifecycle_snapshot", projectEngineLifecycleSnapshot(snapshot));
				});
				postSystemMessage(messagePort, "engine_lifecycle_snapshot", getExecutorSnapshot());

				// 设置MessageChannel端口用于任务通信
				messagePort.onmessage = async (
					portEvent: MessageEvent<WorkerMessage<EngineWorkerTaskTypeMapValue, EngineTaskPriority>>,
				) => {
					// console.log("🔌 Worker: 收到消息", portEvent.data);
					const { belongToTaskId: portbelongToTaskId, payload } = portEvent.data;
					const startTime = performance.now();

					try {
						// 检查命令是否存在
						if (!payload) {
							throw new Error("命令不能为空");
						}

						let portResult: EngineWorkerTaskResult;

						// 使用 Zod Schema 验证命令类型
						const engineCommandResult = EngineLifecycleCommandSchema.safeParse(payload);
						const engineRPCResult = EngineRPCSchema.safeParse(payload);
						if (engineCommandResult.success) {
							log.debug("收到生命周期命令:", engineCommandResult.data);
							portResult = handleLifecycleCommand(engineCommandResult.data);
						} else if (engineRPCResult.success) {
							log.debug("收到引擎 RPC:", engineRPCResult.data);
							// Engine RPC 请求处理
							portResult = await handleEngineRPC(engineRPCResult.data);
							// console.log("Engine RPC 已处理:", portResult);
						} else {
							log.error(payload);
							log.error(engineCommandResult.error);
							log.error(engineRPCResult.error);
							const maybeType =
								typeof payload === "object" && payload !== null && "type" in payload
									? String((payload as { type?: unknown }).type)
									: "undefined";
							throw new Error(`未知命令类型: ${maybeType}`);
						}

						// 计算执行时间
						const endTime = performance.now();
						const duration = endTime - startTime;

						// 返回结果给SimulationWorkerPool
						const response: WorkerMessageEvent<EngineWorkerTaskResult, EngineWorkerTaskMap, unknown> = {
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

						// 返回错误给SimulationWorkerPool
						const errorResponse: WorkerMessageEvent<EngineWorkerTaskResult, EngineWorkerTaskMap, unknown> = {
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

				// 设置系统消息发送器：用于发送系统级事件到控制器（worker_ready/error/日志等）
				gameEngine.setSystemMessageSender((payload: unknown) => {
					try {
						log.info("🔌 Worker: 发送系统消息到主线程", payload);
						postSystemMessage(messagePort, "system_event", payload);
					} catch (error) {
						log.error("Worker: 发送系统消息失败:", error);
					}
				});

				// 设置领域事件批发送器：直接发送 domain_event_batch 顶层消息
				gameEngine.setDomainEventBatchSender((payload) => {
					try {
						// console.log("🔌 Worker: 发送领域事件批到主线程", payload);
						postSystemMessage(messagePort, "domain_event_batch", payload);
					} catch (error) {
						log.error("Worker: 发送领域事件批失败:", error);
					}
				});

				// 设置调试视图数据帧发送器
				debugViewRegistry.setDebugFrameSender((frame) => {
					try {
						postSystemMessage(messagePort, "debug_view_frame", frame);
					} catch (error) {
						log.error("Worker: 发送调试视图数据帧失败:", error);
					}
				});

				// 启动引擎遥测推送；连续世界状态由 SAB 读取，不通过消息补充。
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
		log.error("Worker初始化失败:", error);
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
 * - engine_lifecycle_snapshot: 引擎生命周期只读快照
 * - domain_event_batch: 控制器领域事件批
 * - system_event: 系统事件（worker_ready/error/日志等）
 * - debug_view_frame: 调试视图数据帧（订阅制）
 */
function postSystemMessage(port: MessagePort, type: PushMessageType, data: unknown) {
	const sanitizedData = sanitizeForPostMessage(data);
	const msg = { belongToTaskId: type, type, data: sanitizedData } as const;

	try {
		const { message, transferables } = prepareForTransfer(msg);
		port?.postMessage(message, transferables);
	} catch (error) {
		log.error("Worker: 消息序列化失败:", error);
		// 如果序列化失败，尝试发送清理后的数据
		try {
			port?.postMessage({ belongToTaskId: type, type, data: sanitizedData });
		} catch (fallbackError) {
			log.error("Worker: 备用消息发送也失败:", fallbackError);
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
			const state = getExecutorSnapshot().state;
			if (state !== "running" && state !== "paused") return;
			const frameLoopStats = gameEngine.getFrameLoopStats();
			postSystemMessage(port, "engine_telemetry", {
				tickIndex: gameEngine.getTickIndex(),
				currentTimeMs: gameEngine.getCurrentTimeMs(),
				runTime: gameEngine.getRunTimeMs(),
				ticksPerSecond: frameLoopStats.averageTicksPerSecond,
				memberCount: gameEngine.getMemberCount(),
				skippedTicks: frameLoopStats.skippedTicks,
				lastStepTickDurationMs: gameEngine.getLastStepTickDurationMs(),
			});
		} catch {
			// 遥测失败不应影响主流程
		}
	}, TELEMETRY_INTERVAL_MS) as unknown as number;
}
