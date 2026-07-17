import { createId } from "@paralleldrive/cuid2";
import { type ActorRefFrom, assign, fromCallback, fromPromise, type SnapshotFrom, sendParent, setup } from "xstate";
import type { EngineRunOutput } from "~/lib/engine/core/runOutput";
import type { EngineTelemetry } from "~/lib/engine/core/thread/protocol";
import type { RealtimeEngineHandle } from "~/lib/engine/core/thread/RealtimeEngineHandle";
import type { SimulationRenderSource } from "~/lib/engine/core/thread/RendererProtocol";
import { assertSharedMemorySupport, readSharedMemoryCapabilities } from "~/lib/engine/core/thread/sharedMemorySupport";
import type { TickStateHistoryDirectory } from "~/lib/engine/core/tickStateHistory";
import type { FrameSnapshot } from "~/lib/engine/core/types";
import type { MemberSnapshot } from "~/lib/engine/core/World/Member/Member";
import { createDesignCopy, type DesignCopy, editDesignCopy } from "./designCopy";
import { applyDesignCopyToPersistentDesign } from "./designPersistence";
import { createRecordedBehaviorDesignCopy } from "./recordedBehavior";
import { type SimulationDesign, SimulationDesignSchema } from "./simulationDesignSchema";
import type { SimulatorSessionEvent } from "./simulatorSessionProtocol";

type SimulatorSessionMachineEvent =
	| SimulatorSessionEvent
	| { type: "engine.ready" }
	| { type: "engine.failed"; error: unknown }
	| { type: "engine.runtimeFailed"; reason: string };

export type SimulatorControllerBinding = {
	controllerId: string;
	boundMemberId: string;
};

export type SimulatorSessionRealtimeHandlePort = Pick<
	RealtimeEngineHandle,
	| "loadScenario"
	| "subscribeLifecycle"
	| "setRuntimeConfig"
	| "setRealtimeSnapshotHz"
	| "getMembers"
	| "unbindAllMemberControllers"
	| "bindMemberController"
	| "getMemberSkillList"
	| "startRunOutput"
	| "cancelRunOutput"
	| "start"
	| "stop"
	| "finishRunOutput"
	| "acknowledgeRunOutput"
	| "pause"
	| "resume"
	| "step"
	| "castMemberSkill"
	| "unloadScenario"
	| "getRenderSnapshot"
	| "on"
	| "off"
	| "close"
>;

export type SimulatorSessionEngineServicePort = {
	openRealtimeEngine(): Promise<SimulatorSessionRealtimeHandlePort>;
};

export type SimulatorRuntimeSnapshot = {
	latestFrame: FrameSnapshot | null;
	telemetry: EngineTelemetry | null;
	isRunning: boolean;
};

export type SimulatorRunOutput = EngineRunOutput & { stateHistory: TickStateHistoryDirectory };

export type SessionRunRecord = {
	id: string;
	designCopyId: string;
	endedAt: number;
	output: SimulatorRunOutput;
};

export type SimulatorSessionError = {
	operation:
		| "load"
		| "switch"
		| "startValidation"
		| "finishValidation"
		| "releaseOutput"
		| "engineControl"
		| "persistence"
		| "behaviorSave"
		| "engine";
	message: string;
};

export type SimulatorSessionContext = {
	simulatorId: string | null;
	baseline: SimulationDesign | null;
	designCopies: DesignCopy[];
	currentDesignCopyId: string | null;
	runRecords: SessionRunRecord[];
	selectedRunIds: [string | null, string | null];
	members: MemberSnapshot[];
	controllers: SimulatorControllerBinding[];
	activeControllerId: string | null;
	activeSkills: Array<{ id: string; name: string; level: number }>;
	activeRun: { runId: string; designCopyId: string } | null;
	unreleasedOutput: SimulatorRunOutput | null;
	pendingDesign: SimulationDesign | null;
	engineStatus: "loading" | "ready" | "error";
	error: SimulatorSessionError | null;
};

const initialContext = (): SimulatorSessionContext => ({
	simulatorId: null,
	baseline: null,
	designCopies: [],
	currentDesignCopyId: null,
	runRecords: [],
	selectedRunIds: [null, null],
	members: [],
	controllers: [],
	activeControllerId: null,
	activeSkills: [],
	activeRun: null,
	unreleasedOutput: null,
	pendingDesign: null,
	engineStatus: "loading",
	error: null,
});

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));
const sessionError = (operation: SimulatorSessionError["operation"], error: unknown): SimulatorSessionError => ({
	operation,
	message: errorMessage(error),
});

const requireSimulatorId = (context: SimulatorSessionContext): string => {
	if (context.simulatorId === null) throw new Error("SimulatorSession 当前状态缺少 simulatorId");
	return context.simulatorId;
};

const requireActiveControllerId = (context: SimulatorSessionContext): string => {
	if (context.activeControllerId === null) throw new Error("SimulatorSession 当前验证缺少 activeControllerId");
	return context.activeControllerId;
};

export const selectCurrentDesignCopy = (context: SimulatorSessionContext): DesignCopy | null =>
	context.designCopies.find((copy) => copy.id === context.currentDesignCopyId) ?? null;

const editCurrentCopy = (
	context: SimulatorSessionContext,
	edit: (draft: SimulationDesign) => void,
): Pick<SimulatorSessionContext, "designCopies" | "currentDesignCopyId" | "error"> => {
	const current = selectCurrentDesignCopy(context);
	if (!current) {
		return {
			designCopies: context.designCopies,
			currentDesignCopyId: context.currentDesignCopyId,
			error: { operation: "load", message: "尚未加载 DesignCopy" },
		};
	}
	const next = editDesignCopy(current, edit);
	return {
		designCopies:
			next.id === current.id
				? context.designCopies.map((copy) => (copy.id === current.id ? next : copy))
				: [...context.designCopies, next],
		currentDesignCopyId: next.id,
		error: null,
	};
};

/** 创建不依赖 Solid、路由或具体 AUI actor 的 SimulatorSession 运行时。 */
export function createSimulatorSessionRuntime(engineService: SimulatorSessionEngineServicePort) {
	let realtimeHandle: SimulatorSessionRealtimeHandlePort | null = null;
	let runtimeSnapshot: SimulatorRuntimeSnapshot = { latestFrame: null, telemetry: null, isRunning: false };
	const runtimeListeners = new Set<(snapshot: SimulatorRuntimeSnapshot) => void>();
	const emitRuntime = (patch: Partial<SimulatorRuntimeSnapshot>) => {
		runtimeSnapshot = { ...runtimeSnapshot, ...patch };
		for (const listener of runtimeListeners) listener(runtimeSnapshot);
	};
	const requireHandle = (): SimulatorSessionRealtimeHandlePort => {
		if (!realtimeHandle) throw new Error("SimulatorSession 实时引擎 Handle 尚未就绪");
		return realtimeHandle;
	};
	const releaseSessionResources = async () => {
		const handle = realtimeHandle;
		if (!handle) return;
		await handle.unbindAllMemberControllers();
		await handle.unloadScenario();
	};
	const renderSource: SimulationRenderSource = {
		getRenderSnapshot: async (includeAreas) =>
			realtimeHandle ? await realtimeHandle.getRenderSnapshot(includeAreas) : null,
		on: (_event, listener) => realtimeHandle?.on("render_cmd", listener) ?? (() => {}),
		off: (_event, listener) => realtimeHandle?.off("render_cmd", listener),
	};
	const machineSetup = setup({
		types: {
			context: {} as SimulatorSessionContext,
			events: {} as SimulatorSessionMachineEvent,
		},
		actors: {
			sessionLifetime: fromCallback(({ sendBack }) => {
				let stopped = false;
				let releaseEvents = () => {};
				void engineService
					.openRealtimeEngine()
					.then(async (handle) => {
						if (stopped) {
							await handle.close();
							return;
						}
						realtimeHandle = handle;
						const releases = [
							handle.on("runtime_failure", ({ reason }) => sendBack({ type: "engine.runtimeFailed", reason })),
							handle.on("frame_snapshot", ({ snapshot }) => emitRuntime({ latestFrame: snapshot })),
							handle.on("engine_telemetry", ({ telemetry }) => emitRuntime({ telemetry })),
							handle.subscribeLifecycle((snapshot) => {
								emitRuntime({ isRunning: snapshot.confirmedState === "running" });
							}),
						];
						releaseEvents = () => {
							for (const release of releases) release();
						};
						sendBack({ type: "engine.ready" });
					})
					.catch((error) => {
						if (!stopped) sendBack({ type: "engine.failed", error });
					});
				return () => {
					stopped = true;
					releaseEvents();
					const handle = realtimeHandle;
					realtimeHandle = null;
					emitRuntime({ latestFrame: null, telemetry: null, isRunning: false });
					if (handle) {
						void (async () => {
							await handle.unbindAllMemberControllers().catch(() => undefined);
							await handle.unloadScenario().catch(() => undefined);
							await handle.close();
						})();
					}
				};
			}),
			parseDesign: fromPromise(({ input }: { input: unknown }) => Promise.resolve(SimulationDesignSchema.parse(input))),
			startValidation: fromPromise(async ({ input }: { input: DesignCopy }) => {
				if (typeof window !== "undefined") {
					const capabilities = readSharedMemoryCapabilities();
					assertSharedMemorySupport(capabilities);
					if (import.meta.env.DEV) console.info("[Simulator][SharedMemory]", capabilities);
				}
				const primaryMemberId = input.design.primaryMemberId;
				if (!primaryMemberId) throw new Error("DesignCopy 未指定主控 Player Member");
				const runId = createId();
				let collectorStarted = false;
				try {
					const handle = requireHandle();
					await handle.loadScenario(input.resolvedScene.engineInput);
					await handle.setRuntimeConfig({
						driveMode: "clocked",
						stopPolicy: { kind: "manual" },
						acceptExternalIntents: true,
						logicHz: input.design.logicHz,
						timeScale: 1,
						maxTickSkip: 5,
					});
					await handle.setRealtimeSnapshotHz(10);
					const members = await handle.getMembers();
					await handle.unbindAllMemberControllers();
					const controller = await handle.bindMemberController(primaryMemberId);
					const skills = await handle.getMemberSkillList(primaryMemberId);
					await handle.startRunOutput(runId, { tickStateHistory: "everyTick" });
					collectorStarted = true;
					await handle.start();
					return { members, controller, skills, runId, designCopyId: input.id };
				} catch (error) {
					const handle = realtimeHandle;
					if (collectorStarted) await handle?.cancelRunOutput(runId).catch(() => undefined);
					await handle?.unbindAllMemberControllers().catch(() => undefined);
					await handle?.unloadScenario().catch(() => undefined);
					throw error;
				}
			}),
			finishValidation: fromPromise(async ({ input }: { input: string }) => {
				const handle = requireHandle();
				await handle.stop();
				return await handle.finishRunOutput(input);
			}),
			acknowledgeOutput: fromPromise(async ({ input }: { input: string }) => {
				await requireHandle().acknowledgeRunOutput(input);
				return input;
			}),
			controlEngine: fromPromise(
				async ({
					input,
				}: {
					input: { command: "pause" | "resume" | "step" | "cast"; controllerId?: string; skillId?: string };
				}) => {
					const handle = requireHandle();
					if (input.command === "pause") return await handle.pause();
					if (input.command === "resume") return await handle.resume();
					if (input.command === "step") return await handle.step();
					if (!input.controllerId || !input.skillId) throw new Error("施放技能缺少控制器或技能身份");
					return await handle.castMemberSkill(input.controllerId, input.skillId);
				},
			),
			releaseSession: fromPromise(releaseSessionResources),
			abandonValidation: fromPromise(async ({ input }: { input: string }) => {
				const handle = requireHandle();
				await handle.stop().catch(() => undefined);
				try {
					await handle.acknowledgeRunOutput(input);
				} catch {
					await handle.cancelRunOutput(input);
				}
				await releaseSessionResources();
			}),
			applyDesign: fromPromise(
				async ({ input }: { input: { baseline: SimulationDesign; candidate: SimulationDesign } }) => {
					await applyDesignCopyToPersistentDesign(input.baseline, input.candidate);
					return input.candidate;
				},
			),
		},
		actions: {
			commitSwitchedDesign: assign(({ context }) => {
				if (!context.pendingDesign) return {};
				const copy = createDesignCopy(context.pendingDesign);
				return {
					simulatorId: context.pendingDesign.id,
					baseline: structuredClone(context.pendingDesign),
					designCopies: [copy],
					currentDesignCopyId: copy.id,
					runRecords: [],
					selectedRunIds: [null, null] as [null, null],
					members: [],
					controllers: [],
					activeControllerId: null,
					activeSkills: [],
					activeRun: null,
					unreleasedOutput: null,
					pendingDesign: null,
					error: null,
				};
			}),
			clearSession: assign(({ context }) => ({ ...initialContext(), engineStatus: context.engineStatus })),
			commitRunRecord: assign(({ context, event }) => {
				if (!("output" in event)) return {};
				// XState 的 action 事件联合会把 invoke output 扩宽为 unknown；finishValidation 已从类型化 Worker 协议返回并完成唯一一次运行时校验。
				const output = event.output as EngineRunOutput;
				const activeRun = context.activeRun;
				if (!activeRun || output.runId !== activeRun.runId) {
					throw new Error(`EngineRunOutput 与活动运行不匹配: ${output.runId}`);
				}
				if (!output.stateHistory) throw new Error(`Simulator 运行 ${output.runId} 缺少逐 Tick 状态历史`);
				const recordedOutput: SimulatorRunOutput = { ...output, stateHistory: output.stateHistory };
				const record: SessionRunRecord = {
					id: output.runId,
					designCopyId: activeRun.designCopyId,
					endedAt: Date.now(),
					output: recordedOutput,
				};
				const selectedRunIds: [string | null, string | null] = [
					context.selectedRunIds[0] ?? record.id,
					context.selectedRunIds[1],
				];
				return {
					runRecords: context.runRecords.some((item) => item.id === record.id)
						? context.runRecords
						: [...context.runRecords, record],
					selectedRunIds,
					activeRun: null,
					unreleasedOutput: recordedOutput,
					error: null,
				};
			}),
			clearActiveValidation: assign({
				members: () => [],
				controllers: () => [],
				activeControllerId: () => null,
				activeSkills: () => [],
				activeRun: () => null,
				unreleasedOutput: () => null,
				error: () => null,
			}),
			selectController: assign(({ context, event }) =>
				event.type === "controller.selected" &&
				context.controllers.some((controller) => controller.controllerId === event.controllerId)
					? { activeControllerId: event.controllerId, error: null }
					: {},
			),
			selectDesignCopy: assign(({ context, event }) =>
				event.type === "design.copy.selected" && context.designCopies.some((copy) => copy.id === event.copyId)
					? { currentDesignCopyId: event.copyId, error: null }
					: {},
			),
			selectRun: assign(({ context, event }) => {
				if (event.type !== "run.selected") return {};
				if (event.runId && !context.runRecords.some((record) => record.id === event.runId)) return {};
				return {
					selectedRunIds:
						event.side === "A"
							? ([event.runId, context.selectedRunIds[1]] as [string | null, string | null])
							: ([context.selectedRunIds[0], event.runId] as [string | null, string | null]),
				};
			}),
			editDesignNumber: assign(({ context, event }) => {
				if (event.type === "design.characterNumber.changed") {
					return editCurrentCopy(context, (design) => {
						const member = design.teams
							.flatMap((team) => team.members)
							.find((candidate) => candidate.id === design.primaryMemberId);
						if (member?.character) member.character[event.field] = Math.max(0, Math.trunc(event.value));
					});
				}
				if (event.type === "design.simulatorNumber.changed") {
					return editCurrentCopy(context, (design) => {
						design[event.field] = Math.max(event.field === "logicHz" ? 1 : 0, Math.trunc(event.value));
					});
				}
				return {};
			}),
			saveRunBehavior: assign(({ context, event }) => {
				if (event.type !== "run.behavior.save.requested") return {};
				const result = createRecordedBehaviorDesignCopy(context.designCopies, context.runRecords, event.runId);
				if (!result.ok) return { error: sessionError("behaviorSave", result.error) };
				return {
					designCopies: [...context.designCopies, result.copy],
					currentDesignCopyId: result.copy.id,
					error: null,
				};
			}),
			rejectUnavailableCommand: assign(({ event }) => ({
				error: sessionError(
					event.type.startsWith("session.") ? "switch" : "engineControl",
					`当前会话状态不接受命令: ${event.type}`,
				),
			})),
			setEngineReady: assign({ engineStatus: () => "ready" as const }),
			setEngineFailed: assign(({ event }) =>
				event.type === "engine.failed"
					? {
							engineStatus: "error" as const,
							error: sessionError("engine", event.error),
						}
					: {},
			),
		},
	});

	const machine = machineSetup.createMachine({
		id: "simulatorSession",
		context: initialContext,
		initial: "inactive",
		invoke: { id: "sessionLifetime", src: "sessionLifetime" },
		on: {
			"engine.ready": { actions: "setEngineReady" },
			"engine.failed": { actions: "setEngineFailed" },
			"engine.runtimeFailed": {
				actions: assign(({ event }) => ({ error: sessionError("engine", event.reason) })),
			},
			"session.initialLoad.requested": { actions: "rejectUnavailableCommand" },
			"session.switch.requested": { actions: "rejectUnavailableCommand" },
			"session.end.requested": { actions: "rejectUnavailableCommand" },
			"validation.start.requested": { actions: "rejectUnavailableCommand" },
			"validation.finish.requested": { actions: "rejectUnavailableCommand" },
		},
		states: {
			inactive: {
				on: { "session.initialLoad.requested": "loading" },
			},
			loading: {
				invoke: {
					id: "parseInitialDesign",
					src: "parseDesign",
					input: ({ event }: { event: SimulatorSessionEvent }) => {
						if (event.type !== "session.initialLoad.requested") throw new Error("缺少初始设计");
						return event.design;
					},
					onDone: {
						target: "ready",
						actions: [
							assign(({ event }) => {
								const design = event.output;
								const copy = createDesignCopy(design);
								return {
									simulatorId: design.id,
									baseline: structuredClone(design),
									designCopies: [copy],
									currentDesignCopyId: copy.id,
									error: null,
								};
							}),
							sendParent(({ event }) => ({
								type: "simulator.session.loaded" as const,
								simulatorId: event.output.id,
							})),
						],
					},
					onError: {
						target: "inactive",
						actions: assign(({ event }) => ({
							error: sessionError("load", event.error),
						})),
					},
				},
			},
			ready: {
				on: {
					"session.switch.requested": "parsingSwitch",
					"session.end.requested": {
						target: "awaitingEndAuthorization",
						actions: sendParent(({ context }) => ({
							type: "simulator.session.end.proposed" as const,
							simulatorId: requireSimulatorId(context),
						})),
					},
					"validation.start.requested": {
						target: "awaitingStartAuthorization",
						actions: sendParent(({ context }) => ({
							type: "simulator.validation.start.proposed" as const,
							simulatorId: requireSimulatorId(context),
						})),
					},
					"validation.returnToDesign.requested": {
						target: "awaitingReturnAuthorization",
						actions: sendParent(({ context }) => ({
							type: "simulator.validation.returnToDesign.proposed" as const,
							simulatorId: requireSimulatorId(context),
						})),
					},
					"design.copy.selected": { actions: "selectDesignCopy" },
					"run.selected": { actions: "selectRun" },
					"design.characterNumber.changed": { actions: "editDesignNumber" },
					"design.simulatorNumber.changed": { actions: "editDesignNumber" },
					"run.behavior.save.requested": { actions: "saveRunBehavior" },
					"design.apply.requested": "applyingDesign",
				},
			},
			awaitingReturnAuthorization: {
				on: {
					"validation.returnToDesign.authorized": {
						target: "ready",
						actions: sendParent(({ context }) => ({
							type: "simulator.validation.returnedToDesign" as const,
							simulatorId: requireSimulatorId(context),
						})),
					},
					"validation.returnToDesign.denied": {
						target: "ready",
						actions: assign(({ event }) => ({ error: sessionError("engineControl", event.reason) })),
					},
				},
			},
			parsingSwitch: {
				invoke: {
					id: "parseSwitchDesign",
					src: "parseDesign",
					input: ({ event }: { event: SimulatorSessionEvent }) => {
						if (event.type !== "session.switch.requested") throw new Error("缺少切换设计");
						return event.design;
					},
					onDone: {
						target: "awaitingSwitchAuthorization",
						actions: [
							assign(({ event }) => ({ pendingDesign: event.output, error: null })),
							sendParent(({ event }) => ({
								type: "simulator.session.switch.proposed" as const,
								simulatorId: event.output.id,
							})),
						],
					},
					onError: {
						target: "ready",
						actions: assign(({ event }) => ({
							error: sessionError("switch", event.error),
						})),
					},
				},
			},
			awaitingSwitchAuthorization: {
				on: {
					"session.switch.authorized": "switching",
					"session.switch.denied": {
						target: "ready",
						actions: assign(({ event }) => ({ error: sessionError("switch", event.reason), pendingDesign: null })),
					},
				},
			},
			switching: {
				invoke: {
					id: "releaseForSwitch",
					src: "releaseSession",
					onDone: {
						target: "ready",
						actions: [
							"commitSwitchedDesign",
							sendParent(({ context }) => ({
								type: "simulator.session.switched" as const,
								simulatorId: requireSimulatorId(context),
							})),
						],
					},
					onError: {
						target: "ready",
						actions: assign(({ event }) => ({ error: sessionError("switch", event.error) })),
					},
				},
			},
			awaitingEndAuthorization: {
				on: {
					"session.end.authorized": "ending",
					"session.end.denied": {
						target: "ready",
						actions: assign(({ event }) => ({ error: sessionError("switch", event.reason) })),
					},
				},
			},
			ending: {
				invoke: {
					id: "releaseForEnd",
					src: "releaseSession",
					onDone: {
						target: "inactive",
						actions: [
							sendParent(({ context }) => ({
								type: "simulator.session.ended" as const,
								simulatorId: requireSimulatorId(context),
							})),
							"clearSession",
						],
					},
					onError: {
						target: "ready",
						actions: assign(({ event }) => ({ error: sessionError("switch", event.error) })),
					},
				},
			},
			awaitingStartAuthorization: {
				on: {
					"validation.start.authorized": "startingValidation",
					"validation.start.denied": {
						target: "ready",
						actions: assign(({ event }) => ({ error: sessionError("startValidation", event.reason) })),
					},
				},
			},
			startingValidation: {
				invoke: {
					id: "startValidation",
					src: "startValidation",
					input: ({ context }) => {
						const copy = selectCurrentDesignCopy(context);
						if (!copy) throw new Error("尚未加载 DesignCopy");
						return copy;
					},
					onDone: {
						target: "runActive",
						actions: [
							assign(({ context, event }) => ({
								members: event.output.members,
								controllers: [event.output.controller],
								activeControllerId: event.output.controller.controllerId,
								activeSkills: event.output.skills,
								activeRun: { runId: event.output.runId, designCopyId: event.output.designCopyId },
								designCopies: context.designCopies.map((copy) =>
									copy.id === event.output.designCopyId ? { ...copy, hasRun: true } : copy,
								),
								error: null,
							})),
							sendParent(({ context }) => ({
								type: "simulator.validation.started" as const,
								simulatorId: requireSimulatorId(context),
							})),
						],
					},
					onError: {
						target: "ready",
						actions: [
							assign(({ event }) => ({ error: sessionError("startValidation", event.error) })),
							sendParent(({ context, event }) => ({
								type: "simulator.validation.startRejected" as const,
								simulatorId: requireSimulatorId(context),
								reason: errorMessage(event.error),
							})),
						],
					},
				},
			},
			runActive: {
				on: {
					"engine.runtimeFailed": {
						target: "validationFailedDecision",
						actions: assign(({ event }) => ({ error: sessionError("engineControl", event.reason) })),
					},
					"validation.finish.requested": {
						target: "awaitingFinishAuthorization",
						actions: sendParent(({ context }) => ({
							type: "simulator.validation.finish.proposed" as const,
							simulatorId: requireSimulatorId(context),
						})),
					},
					"validation.pause.requested": "controllingEngine",
					"validation.resume.requested": "controllingEngine",
					"validation.step.requested": "controllingEngine",
					"skill.cast.requested": "controllingEngine",
					"controller.selected": { actions: "selectController" },
				},
			},
			validationFailedDecision: {
				on: {
					"validation.retry.requested": "abandoningForRetry",
					"validation.returnToDesign.requested": {
						target: "awaitingRuntimeFailureReturnAuthorization",
						actions: sendParent(({ context }) => ({
							type: "simulator.validation.returnToDesign.proposed" as const,
							simulatorId: requireSimulatorId(context),
						})),
					},
				},
			},
			awaitingRuntimeFailureReturnAuthorization: {
				on: {
					"validation.returnToDesign.authorized": "abandoningValidation",
					"validation.returnToDesign.denied": {
						target: "validationFailedDecision",
						actions: assign(({ event }) => ({ error: sessionError("engineControl", event.reason) })),
					},
				},
			},
			abandoningForRetry: {
				invoke: {
					id: "abandonForRetry",
					src: "abandonValidation",
					input: ({ context }) => {
						if (!context.activeRun) throw new Error("当前没有可重试的验证");
						return context.activeRun.runId;
					},
					onDone: { target: "restartingValidation", actions: "clearActiveValidation" },
					onError: {
						target: "validationFailedDecision",
						actions: assign(({ event }) => ({ error: sessionError("engineControl", event.error) })),
					},
				},
			},
			restartingValidation: {
				invoke: {
					id: "restartValidation",
					src: "startValidation",
					input: ({ context }) => {
						const copy = selectCurrentDesignCopy(context);
						if (!copy) throw new Error("尚未加载 DesignCopy");
						return copy;
					},
					onDone: {
						target: "runActive",
						actions: assign(({ context, event }) => ({
							members: event.output.members,
							controllers: [event.output.controller],
							activeControllerId: event.output.controller.controllerId,
							activeSkills: event.output.skills,
							activeRun: { runId: event.output.runId, designCopyId: event.output.designCopyId },
							designCopies: context.designCopies.map((copy) =>
								copy.id === event.output.designCopyId ? { ...copy, hasRun: true } : copy,
							),
							error: null,
						})),
					},
					onError: {
						target: "validationFailedDecision",
						actions: assign(({ event }) => ({ error: sessionError("startValidation", event.error) })),
					},
				},
			},
			controllingEngine: {
				invoke: {
					id: "controlEngine",
					src: "controlEngine",
					input: ({ context, event }) => {
						if (event.type === "validation.pause.requested") return { command: "pause" as const };
						if (event.type === "validation.resume.requested") return { command: "resume" as const };
						if (event.type === "validation.step.requested") return { command: "step" as const };
						if (event.type === "skill.cast.requested") {
							return {
								command: "cast" as const,
								controllerId: requireActiveControllerId(context),
								skillId: event.skillId,
							};
						}
						throw new Error("未知引擎控制命令");
					},
					onDone: "runActive",
					onError: {
						target: "runActive",
						actions: assign(({ event }) => ({ error: sessionError("engineControl", event.error) })),
					},
				},
			},
			awaitingFinishAuthorization: {
				on: {
					"validation.finish.authorized": "finishingValidation",
					"validation.finish.denied": {
						target: "runActive",
						actions: assign(({ event }) => ({ error: sessionError("finishValidation", event.reason) })),
					},
				},
			},
			finishingValidation: {
				invoke: {
					id: "finishValidation",
					src: "finishValidation",
					input: ({ context }) => {
						if (!context.activeRun) throw new Error("当前没有进行中的验证");
						return context.activeRun.runId;
					},
					onDone: {
						target: "releasingOutput",
						actions: "commitRunRecord",
					},
					onError: {
						target: "finishFailed",
						actions: [
							assign(({ event }) => ({ error: sessionError("finishValidation", event.error) })),
							sendParent(({ context, event }) => ({
								type: "simulator.validation.finishRejected" as const,
								simulatorId: requireSimulatorId(context),
								reason: errorMessage(event.error),
							})),
						],
					},
				},
			},
			releasingOutput: {
				invoke: {
					id: "releaseOutput",
					src: "acknowledgeOutput",
					input: ({ context }) => {
						if (!context.unreleasedOutput) throw new Error("缺少待释放的 EngineRunOutput");
						return context.unreleasedOutput.runId;
					},
					onDone: {
						target: "ready",
						actions: [
							assign({ unreleasedOutput: () => null, error: () => null }),
							sendParent(({ context, event }) => ({
								type: "simulator.validation.finished" as const,
								simulatorId: requireSimulatorId(context),
								runId: event.output,
							})),
						],
					},
					onError: {
						target: "outputReleaseFailed",
						actions: assign(({ event }) => ({ error: sessionError("releaseOutput", event.error) })),
					},
				},
			},
			outputReleaseFailed: {
				on: {
					"validation.finish.retry": "releasingOutput",
				},
			},
			finishFailed: {
				on: {
					"validation.finish.retry": "finishingValidation",
					"validation.returnToDesign.requested": {
						target: "awaitingFailedReturnAuthorization",
						actions: sendParent(({ context }) => ({
							type: "simulator.validation.returnToDesign.proposed" as const,
							simulatorId: requireSimulatorId(context),
						})),
					},
				},
			},
			awaitingFailedReturnAuthorization: {
				on: {
					"validation.returnToDesign.authorized": "abandoningValidation",
					"validation.returnToDesign.denied": {
						target: "finishFailed",
						actions: assign(({ event }) => ({ error: sessionError("finishValidation", event.reason) })),
					},
				},
			},
			abandoningValidation: {
				invoke: {
					id: "abandonValidation",
					src: "abandonValidation",
					input: ({ context }) => {
						if (!context.activeRun) throw new Error("当前没有可放弃的验证");
						return context.activeRun.runId;
					},
					onDone: {
						target: "ready",
						actions: [
							"clearActiveValidation",
							sendParent(({ context }) => ({
								type: "simulator.validation.returnedToDesign" as const,
								simulatorId: requireSimulatorId(context),
							})),
						],
					},
					onError: {
						target: "finishFailed",
						actions: assign(({ event }) => ({ error: sessionError("finishValidation", event.error) })),
					},
				},
			},
			applyingDesign: {
				invoke: {
					id: "applyDesign",
					src: "applyDesign",
					input: ({ context }) => {
						const current = selectCurrentDesignCopy(context);
						if (!context.baseline || !current) throw new Error("没有可应用的 DesignCopy");
						return { baseline: context.baseline, candidate: current.design };
					},
					onDone: {
						target: "ready",
						actions: assign(({ event }) => ({ baseline: structuredClone(event.output), error: null })),
					},
					onError: {
						target: "ready",
						actions: assign(({ event }) => ({ error: sessionError("persistence", event.error) })),
					},
				},
			},
		},
	});

	return {
		machine,
		getRuntimeSnapshot: () => runtimeSnapshot,
		subscribeRuntimeProjection: (listener: (snapshot: SimulatorRuntimeSnapshot) => void) => {
			runtimeListeners.add(listener);
			listener(runtimeSnapshot);
			return () => runtimeListeners.delete(listener);
		},
		renderSource,
	};
}

/** 兼容测试和纯 actor 组合的 logic 工厂；生产组合根使用 runtime 取得运行投影。 */
export function createSimulatorSessionMachine(engineService: SimulatorSessionEngineServicePort) {
	return createSimulatorSessionRuntime(engineService).machine;
}

export type SimulatorSessionRuntime = ReturnType<typeof createSimulatorSessionRuntime>;
export type SimulatorSessionMachine = ReturnType<typeof createSimulatorSessionMachine>;
export type SimulatorSessionActorRef = ActorRefFrom<SimulatorSessionMachine>;
export type SimulatorSessionSnapshot = SnapshotFrom<SimulatorSessionMachine>;
