import type { DB } from "@db/generated/zod/index";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import type { Kysely } from "kysely";
import { type ActorRefFrom, assign, fromCallback, raise, type SnapshotFrom, setup } from "xstate";
import type { EngineService } from "~/lib/engine/core/thread/EngineService";
import type { RealtimeEngineHandle } from "~/lib/engine/core/thread/RealtimeEngineHandle";
import type { MemberSnapshot } from "~/lib/engine/core/World/Member/Member";
import {
	type CharacterLiveModel,
	type CharacterLiveSnapshot,
	createCharacterLiveModel,
} from "../data/CharacterLiveModel";
import type { CharacterAggregateIdentity } from "../data/characterAggregateQuery";
import { persistCharacterEditBatch } from "../edit/persistCharacterEdits";
import type { CharacterPreviewPolicy } from "../preview/compileCharacterPreviewBehavior";
import {
	type CharacterPreviewResult,
	interpretCharacterPreviewResult,
} from "../preview/interpretCharacterPreviewResult";
import {
	type CharacterValidationInput,
	createDefaultCharacterPreviewPolicy,
	resolveCharacterPreviewTask,
	resolveCharacterRealtimeScenario,
} from "../preview/resolveCharacterPreviewTask";
import {
	CharacterEditQueue,
	type CharacterEditQueueOptions,
	type CharacterEditQueueSnapshot,
} from "./CharacterEditQueue";
import type { CharacterSessionIntent } from "./characterSessionProtocol";

export type CharacterSessionError = {
	operation: "load" | "edit" | "switch" | "engine" | "validation";
	message: string;
};

export type CharacterPreviewTaskState =
	| { status: "running" }
	| { status: "succeeded"; result: CharacterPreviewResult }
	| { status: "failed"; error: string };

export type CharacterValidationSnapshot = {
	token: number;
	identity: CharacterAggregateIdentity | null;
	validationRevision: number | null;
	status: "idle" | "running" | "ready" | "partial" | "failed";
	attributeStatus: "idle" | "running" | "ready" | "failed";
	members: readonly MemberSnapshot[];
	previews: Readonly<Record<string, CharacterPreviewTaskState>>;
	error?: string;
};

export type CharacterSessionContext = {
	identity: CharacterAggregateIdentity | null;
	pendingIdentity: CharacterAggregateIdentity | null;
	liveStatus: CharacterLiveSnapshot["status"];
	engineStatus: "loading" | "ready" | "error";
	validation: CharacterValidationSnapshot;
	error: CharacterSessionError | null;
};

type ValidationAttributeResult = { ok: true; members: readonly MemberSnapshot[] } | { ok: false; error: string };

type ValidationCompletedPreviewState = Exclude<CharacterPreviewTaskState, { status: "running" }>;

type CharacterSessionInternalEvent =
	| { type: "live.snapshot"; identity: CharacterAggregateIdentity; snapshot: CharacterLiveSnapshot }
	| { type: "edits.changed"; snapshot: CharacterEditQueueSnapshot }
	| { type: "edits.evaluate" }
	| { type: "engine.ready" }
	| { type: "engine.failed"; error: unknown }
	| { type: "engine.runtimeFailed"; reason: string }
	| {
			type: "validation.started";
			token: number;
			identity: CharacterAggregateIdentity;
			validationRevision: number;
			candidateSkillIds: readonly string[];
			preserveResults: boolean;
	  }
	| {
			type: "validation.completed";
			token: number;
			identity: CharacterAggregateIdentity;
			validationRevision: number;
			attribute: ValidationAttributeResult;
			previews: Readonly<Record<string, ValidationCompletedPreviewState>>;
	  };

type CharacterSessionEvent = CharacterSessionIntent | CharacterSessionInternalEvent;

export type CharacterLiveModelPort = Pick<
	CharacterLiveModel,
	"identity" | "getSnapshot" | "subscribe" | "start" | "stop"
>;

export type CharacterSessionRealtimeHandlePort = Pick<
	RealtimeEngineHandle,
	| "close"
	| "subscribeRuntimeFailure"
	| "loadScenario"
	| "setRuntimeConfig"
	| "patchMemberConfig"
	| "fastForward"
	| "getMembers"
>;

export type CharacterSessionEngineServicePort = Pick<
	EngineService,
	"executeSimulationTask" | "executeSimulationTasks"
> & {
	openRealtimeEngine(): Promise<CharacterSessionRealtimeHandlePort>;
};

export type CharacterSessionDependencies = {
	engineService: CharacterSessionEngineServicePort;
	createLiveModel?: (identity: CharacterAggregateIdentity) => CharacterLiveModelPort;
	getDatabase?: () => Promise<Kysely<DB>>;
	persistEdits?: CharacterEditQueueOptions["persistBatch"];
	resolvePreviewPolicy?: (characterId: string) => CharacterPreviewPolicy;
	createPreviewRunId?: () => string;
};

const emptyValidationSnapshot = (): CharacterValidationSnapshot => ({
	token: 0,
	identity: null,
	validationRevision: null,
	status: "idle",
	attributeStatus: "idle",
	members: [],
	previews: {},
});

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

const sessionError = (operation: CharacterSessionError["operation"], message: string): CharacterSessionError => ({
	operation,
	message,
});

const sameIdentity = (left: CharacterAggregateIdentity | null, right: CharacterAggregateIdentity): boolean =>
	left?.playerId === right.playerId && left.characterId === right.characterId;

export type CharacterSessionRuntime = ReturnType<typeof createCharacterSessionRuntime>;

/**
 * 构造 CharacterSession child logic 与其唯一 live model 读面。
 * runtime 只供应用组合根和 facade 装配；CUI 不取得 EngineService、handle、编辑队列或 live model 可变入口。
 */
export function createCharacterSessionRuntime(dependencies: CharacterSessionDependencies) {
	const createLiveModel = dependencies.createLiveModel ?? createCharacterLiveModel;
	const getDatabase = dependencies.getDatabase ?? getDB;
	const resolvePreviewPolicy = dependencies.resolvePreviewPolicy ?? createDefaultCharacterPreviewPolicy;
	const createPreviewRunId = dependencies.createPreviewRunId ?? createId;
	let activeLiveModel: CharacterLiveModelPort | null = null;
	const liveProjectionListeners = new Set<(snapshot: CharacterLiveSnapshot | null) => void>();
	let realtimeHandle: CharacterSessionRealtimeHandlePort | null = null;
	let sendLifetimeEvent: ((event: CharacterSessionInternalEvent) => void) | null = null;
	let validationStopped = true;
	let validationToken = 0;
	let validationRevision = 0;
	let validationSignature: string | null = null;
	let validationInFlight = false;
	let queuedValidation: {
		token: number;
		identity: CharacterAggregateIdentity;
		validationRevision: number;
		character: CharacterValidationInput;
		policy: CharacterPreviewPolicy;
		candidateSkillIds: readonly string[];
		preserveResults: boolean;
	} | null = null;
	let lastValidationKey: string | null = null;
	let realtimeSceneIdentity: string | null = null;

	const emitLiveProjection = (snapshot: CharacterLiveSnapshot | null) => {
		for (const listener of liveProjectionListeners) listener(snapshot);
	};

	const invalidateValidationRuntime = () => {
		validationToken += 1;
		queuedValidation = null;
		lastValidationKey = null;
		return validationToken;
	};

	const syncRealtimeAttributes = async (
		character: CharacterValidationInput,
		policy: CharacterPreviewPolicy,
		token: number,
	): Promise<readonly MemberSnapshot[]> => {
		const handle = realtimeHandle;
		if (!handle) throw new Error("Character 实时引擎 Handle 尚未就绪");
		const assertCurrent = () => {
			if (validationStopped || token !== validationToken) throw new Error("Character 验证已过期");
		};
		assertCurrent();
		const resolved = resolveCharacterRealtimeScenario(character, policy);
		const sceneIdentity = `${character.id}:${policy.memberId}`;
		try {
			if (realtimeSceneIdentity === sceneIdentity) {
				assertCurrent();
				await handle.patchMemberConfig(policy.memberId, resolved.member);
			} else {
				assertCurrent();
				await handle.loadScenario(resolved.scenarioData);
				assertCurrent();
				await handle.setRuntimeConfig({
					driveMode: "unclocked",
					stopPolicy: { kind: "untilMemberFlowEnds", memberId: policy.memberId },
					acceptExternalIntents: false,
					logicHz: 60,
					timeScale: 1,
					maxTickSkip: 5,
				});
				realtimeSceneIdentity = sceneIdentity;
			}
			assertCurrent();
			const fastForward = await handle.fastForward({ maxTicks: 3_600, maxDurationMs: 15_000 });
			assertCurrent();
			if (fastForward.reachedLimit) throw new Error("Character 属性同步超过模拟预算");
			return await handle.getMembers();
		} catch (error) {
			realtimeSceneIdentity = null;
			throw error;
		}
	};

	const runValidation = async (job: NonNullable<typeof queuedValidation>) => {
		const attributePromise: Promise<ValidationAttributeResult> = syncRealtimeAttributes(
			job.character,
			job.policy,
			job.token,
		).then(
			(members) => ({ ok: true, members }),
			(error) => ({ ok: false, error: errorMessage(error) }),
		);
		const previewEntries = await Promise.all(
			job.candidateSkillIds.map(async (candidateSkillId): Promise<[string, ValidationCompletedPreviewState]> => {
				try {
					const task = resolveCharacterPreviewTask({
						runId: `character-preview:${createPreviewRunId()}`,
						character: job.character,
						policy: job.policy,
						candidateSkillId,
					});
					const taskResult = await dependencies.engineService.executeSimulationTask(task, "medium");
					return [
						candidateSkillId,
						{
							status: "succeeded",
							result: interpretCharacterPreviewResult(taskResult, job.policy, candidateSkillId),
						},
					];
				} catch (error) {
					return [candidateSkillId, { status: "failed", error: errorMessage(error) }];
				}
			}),
		);
		const attribute = await attributePromise;
		if (validationStopped) return;
		sendLifetimeEvent?.({
			type: "validation.completed",
			token: job.token,
			identity: job.identity,
			validationRevision: job.validationRevision,
			attribute,
			previews: Object.fromEntries(previewEntries),
		});
	};

	const drainValidation = async () => {
		if (validationInFlight || validationStopped) return;
		validationInFlight = true;
		try {
			while (queuedValidation && !validationStopped) {
				const job = queuedValidation;
				queuedValidation = null;
				await runValidation(job);
			}
		} finally {
			validationInFlight = false;
		}
	};

	const requestValidation = (
		snapshot: CharacterLiveSnapshot,
		options: { candidateSkillIds?: readonly string[]; preserveResults?: boolean; force?: boolean } = {},
	) => {
		if (!snapshot.aggregate || validationStopped) return;
		const character = snapshot.aggregate.character;
		const signature = JSON.stringify(character);
		if (signature !== validationSignature) {
			validationSignature = signature;
			validationRevision += 1;
		}
		if (!realtimeHandle) return;
		const key = `${snapshot.identity.playerId}:${snapshot.identity.characterId}:${validationRevision}`;
		if (!options.force && key === lastValidationKey) return;
		const allCandidates = character.skills.filter((skill) => skill.lv > 0).map((skill) => skill.id);
		const requested = options.candidateSkillIds ? new Set(options.candidateSkillIds) : null;
		const candidateSkillIds = requested ? allCandidates.filter((skillId) => requested.has(skillId)) : allCandidates;
		if (requested && candidateSkillIds.length === 0) return;
		const token = ++validationToken;
		lastValidationKey = key;
		const policy = resolvePreviewPolicy(character.id);
		queuedValidation = {
			token,
			identity: snapshot.identity,
			validationRevision,
			character,
			policy,
			candidateSkillIds,
			preserveResults: options.preserveResults ?? false,
		};
		sendLifetimeEvent?.({
			type: "validation.started",
			token,
			identity: snapshot.identity,
			validationRevision,
			candidateSkillIds,
			preserveResults: options.preserveResults ?? false,
		});
		void drainValidation();
	};

	const editQueue = new CharacterEditQueue({
		persistBatch:
			dependencies.persistEdits ??
			(async (characterId, edits) => persistCharacterEditBatch(await getDatabase(), characterId, edits)),
	});
	const machineSetup = setup({
		types: {
			context: {} as CharacterSessionContext,
			events: {} as CharacterSessionEvent,
		},
		actors: {
			sessionLifetime: fromCallback<CharacterSessionEvent>(({ sendBack }) => {
				let stopped = false;
				let releaseRuntimeFailure: (() => void) | null = null;
				validationStopped = false;
				sendLifetimeEvent = sendBack;
				const releaseEditQueue = editQueue.subscribe((snapshot) => {
					sendBack({ type: "edits.changed", snapshot });
				});
				void dependencies.engineService
					.openRealtimeEngine()
					.then(async (handle) => {
						if (stopped) {
							await handle.close();
							return;
						}
						realtimeHandle = handle;
						releaseRuntimeFailure = handle.subscribeRuntimeFailure((reason) => {
							sendBack({ type: "engine.runtimeFailed", reason });
						});
						sendBack({ type: "engine.ready" });
					})
					.catch((error) => {
						if (!stopped) sendBack({ type: "engine.failed", error });
					});
				return () => {
					stopped = true;
					validationStopped = true;
					invalidateValidationRuntime();
					realtimeSceneIdentity = null;
					if (sendLifetimeEvent === sendBack) sendLifetimeEvent = null;
					releaseEditQueue();
					editQueue.stop();
					releaseRuntimeFailure?.();
					const handle = realtimeHandle;
					realtimeHandle = null;
					if (handle) void handle.close();
				};
			}),
			liveModelLifetime: fromCallback<CharacterSessionEvent, CharacterAggregateIdentity>(({ input, sendBack }) => {
				const identity = input;
				const model = createLiveModel(identity);
				activeLiveModel = model;
				const release = model.subscribe((snapshot) => {
					sendBack({ type: "live.snapshot", identity, snapshot });
					emitLiveProjection(snapshot);
				});
				model.start();
				return () => {
					release();
					if (activeLiveModel === model) {
						activeLiveModel = null;
						emitLiveProjection(null);
					}
					void model.stop();
				};
			}),
		},
		guards: {
			liveReadyWithCharacter: ({ context, event }) =>
				event.type === "live.snapshot" &&
				sameIdentity(context.identity, event.identity) &&
				event.snapshot.status === "ready" &&
				event.snapshot.aggregate !== null,
			liveReadyWithoutCharacter: ({ context, event }) =>
				event.type === "live.snapshot" &&
				sameIdentity(context.identity, event.identity) &&
				event.snapshot.status === "ready" &&
				event.snapshot.aggregate === null,
			canEdit: ({ context }) => context.identity !== null && editQueue.getSnapshot().status !== "failed",
			canResolveFailedEdits: ({ context }) => context.identity !== null && editQueue.getSnapshot().status === "failed",
			canValidate: ({ context }) => context.engineStatus === "ready" && context.identity !== null,
			requestsCurrentIdentity: ({ context, event }) =>
				(event.type === "character.load" || event.type === "character.switch.requested") &&
				sameIdentity(context.identity, event),
			editQueueFailed: ({ event }) => event.type === "edits.changed" && event.snapshot.status === "failed",
			editQueueSettled: ({ event }) => event.type === "edits.changed" && event.snapshot.status === "idle",
			editQueueCurrentlyFailed: () => editQueue.getSnapshot().status === "failed",
			editQueueCurrentlySettled: () => editQueue.getSnapshot().status === "idle",
		},
		actions: {
			setIdentity: assign(({ event }) =>
				event.type === "character.load" || event.type === "character.switch.requested"
					? {
							identity: { playerId: event.playerId, characterId: event.characterId },
							pendingIdentity: null,
							liveStatus: "idle" as const,
							error: null,
						}
					: {},
			),
			setPendingIdentity: assign(({ event }) =>
				event.type === "character.load" || event.type === "character.switch.requested"
					? { pendingIdentity: { playerId: event.playerId, characterId: event.characterId }, error: null }
					: {},
			),
			commitPendingIdentity: assign(({ context }) => ({
				identity: context.pendingIdentity,
				pendingIdentity: null,
				liveStatus: "idle" as const,
				validation: emptyValidationSnapshot(),
				error: null,
			})),
			clearIdentity: assign({
				identity: () => null,
				pendingIdentity: () => null,
				liveStatus: () => "idle" as const,
				validation: emptyValidationSnapshot,
			}),
			updateLiveStatus: assign(({ context, event }) => {
				if (event.type !== "live.snapshot" || !sameIdentity(context.identity, event.identity)) return {};
				if (event.snapshot.status === "error" && event.snapshot.error) {
					return {
						liveStatus: event.snapshot.status,
						error: sessionError("load", event.snapshot.error.message),
					};
				}
				return {
					liveStatus: event.snapshot.status,
					error: context.error?.operation === "load" ? null : context.error,
				};
			}),
			updateEditError: assign(({ context, event }) => {
				if (event.type !== "edits.changed") return {};
				if (event.snapshot.status === "failed") return { error: sessionError("edit", event.snapshot.error) };
				return context.error?.operation === "edit" || context.error?.operation === "switch" ? { error: null } : {};
			}),
			acceptEdit: ({ context, event }) => {
				if (event.type !== "character.edit.submit" || !context.identity) return;
				editQueue.accept(context.identity.characterId, event.edit);
			},
			retryFailedEdits: () => editQueue.retryFailed(),
			discardFailedEdits: () => editQueue.discardFailed(),
			setCharacterNotFound: assign({
				error: ({ context }) => {
					if (!context.identity) throw new Error("CharacterSession loading 状态缺少 Character 身份");
					return sessionError("load", `Character 不存在或不属于当前 Player: ${context.identity.characterId}`);
				},
			}),
			setEditRejected: assign({
				error: () => sessionError("edit", "Character 当前不可接纳修改"),
			}),
			setSwitchRejected: assign({
				error: ({ context }) => sessionError("switch", `Character 当前不可切换: live=${context.liveStatus}`),
			}),
			setSwitchFailed: assign({
				pendingIdentity: () => null,
				error: () => sessionError("switch", "Character 本地编辑失败，身份切换已取消"),
			}),
			setEngineReady: assign({ engineStatus: () => "ready" as const }),
			setEngineFailed: assign(({ event }) =>
				event.type === "engine.failed"
					? {
							engineStatus: "error" as const,
							error: { operation: "engine" as const, message: errorMessage(event.error) },
						}
					: {},
			),
			setEngineRuntimeFailed: assign(({ event }) =>
				event.type === "engine.runtimeFailed"
					? {
							engineStatus: "error" as const,
							error: { operation: "engine" as const, message: event.reason },
						}
					: {},
			),
			invalidateValidation: assign(({ context }) => ({
				validation: { ...context.validation, token: invalidateValidationRuntime() },
			})),
			scheduleValidationFromLive: ({ context, event }) => {
				if (event.type !== "live.snapshot" || !sameIdentity(context.identity, event.identity)) return;
				requestValidation(event.snapshot);
			},
			scheduleCurrentValidation: () => {
				const snapshot = activeLiveModel?.getSnapshot();
				if (snapshot) requestValidation(snapshot);
			},
			refreshValidation: () => {
				const snapshot = activeLiveModel?.getSnapshot();
				if (snapshot) requestValidation(snapshot, { force: true });
			},
			retryFailedValidation: ({ context, event }) => {
				if (event.type !== "character.preview.retryFailed") return;
				const failedSkillIds = event.candidateSkillId
					? context.validation.previews[event.candidateSkillId]?.status === "failed"
						? [event.candidateSkillId]
						: []
					: Object.entries(context.validation.previews)
							.filter(([, state]) => state.status === "failed")
							.map(([skillId]) => skillId);
				const snapshot = activeLiveModel?.getSnapshot();
				if (snapshot && failedSkillIds.length > 0) {
					requestValidation(snapshot, { candidateSkillIds: failedSkillIds, preserveResults: true, force: true });
				}
			},
			setValidationStarted: assign(({ context, event }) => {
				if (event.type !== "validation.started" || !sameIdentity(context.identity, event.identity)) return {};
				const previews = event.preserveResults ? { ...context.validation.previews } : {};
				for (const skillId of event.candidateSkillIds) previews[skillId] = { status: "running" };
				return {
					validation: {
						...context.validation,
						token: event.token,
						identity: event.identity,
						validationRevision: event.validationRevision,
						status: "running" as const,
						attributeStatus: "running" as const,
						previews,
						error: undefined,
					},
				};
			}),
			setValidationCompleted: assign(({ context, event }) => {
				if (
					event.type !== "validation.completed" ||
					event.token !== context.validation.token ||
					event.validationRevision !== context.validation.validationRevision ||
					!sameIdentity(context.identity, event.identity)
				) {
					return {};
				}
				const previews = { ...context.validation.previews, ...event.previews };
				const previewStates = Object.values(previews);
				const failedPreviewCount = previewStates.filter((state) => state.status === "failed").length;
				const succeededPreviewCount = previewStates.filter((state) => state.status === "succeeded").length;
				const hasFailure = !event.attribute.ok || failedPreviewCount > 0;
				const hasSuccess = event.attribute.ok || succeededPreviewCount > 0;
				return {
					validation: {
						...context.validation,
						status: hasFailure ? (hasSuccess ? "partial" : "failed") : "ready",
						attributeStatus: event.attribute.ok ? "ready" : "failed",
						members: event.attribute.ok ? event.attribute.members : context.validation.members,
						previews,
						error: event.attribute.ok
							? failedPreviewCount > 0
								? `${failedPreviewCount} 项技能预览失败`
								: undefined
							: event.attribute.error,
					},
				};
			}),
			setValidationRejected: assign({
				error: ({ context }) =>
					sessionError(
						"validation",
						`Character 当前不可开始验证: live=${context.liveStatus}, engine=${context.engineStatus}`,
					),
			}),
		},
	});
	const activeIdentityChangeTransitions = [
		{ guard: "requestsCurrentIdentity" },
		{
			target: "switching",
			actions: ["setPendingIdentity", "invalidateValidation"],
		},
	] as const;

	const machine = machineSetup.createMachine({
		id: "characterSession",
		initial: "idle",
		context: {
			identity: null,
			pendingIdentity: null,
			liveStatus: "idle",
			engineStatus: "loading",
			validation: emptyValidationSnapshot(),
			error: null,
		},
		invoke: { id: "sessionLifetime", src: "sessionLifetime" },
		on: {
			"engine.ready": { actions: ["setEngineReady", "scheduleCurrentValidation"] },
			"engine.failed": { actions: "setEngineFailed" },
			"engine.runtimeFailed": { actions: "setEngineRuntimeFailed" },
			"edits.changed": { actions: "updateEditError" },
			"validation.started": { actions: "setValidationStarted" },
			"validation.completed": { actions: "setValidationCompleted" },
		},
		states: {
			idle: {
				on: {
					"character.load": { target: "loaded", actions: "setIdentity" },
					"character.switch.requested": { target: "loaded", actions: "setIdentity" },
					"character.edit.submit": { actions: "setEditRejected" },
					"character.edits.retryFailed": { actions: "setEditRejected" },
					"character.edits.discardFailed": { actions: "setEditRejected" },
					"character.preview.refresh": { actions: "setValidationRejected" },
					"character.preview.retryFailed": { actions: "setValidationRejected" },
				},
			},
			loaded: {
				id: "loadedCharacterSession",
				invoke: {
					id: "characterLiveModel",
					src: "liveModelLifetime",
					input: ({ context }) => {
						if (!context.identity) throw new Error("CharacterSession loaded 状态缺少 Character 身份");
						return context.identity;
					},
				},
				initial: "loading",
				states: {
					loading: {
						on: {
							"live.snapshot": [
								{
									guard: "liveReadyWithCharacter",
									target: "active",
									actions: ["updateLiveStatus", "scheduleValidationFromLive"],
								},
								{
									guard: "liveReadyWithoutCharacter",
									target: "#characterSession.idle",
									actions: ["updateLiveStatus", "setCharacterNotFound", "clearIdentity"],
								},
								{ actions: "updateLiveStatus" },
							],
							"character.edit.submit": { actions: "setEditRejected" },
							"character.edits.retryFailed": { actions: "setEditRejected" },
							"character.edits.discardFailed": { actions: "setEditRejected" },
							"character.preview.refresh": { actions: "setValidationRejected" },
							"character.preview.retryFailed": { actions: "setValidationRejected" },
							"character.load": [{ guard: "requestsCurrentIdentity" }, { actions: "setSwitchRejected" }],
							"character.switch.requested": [{ guard: "requestsCurrentIdentity" }, { actions: "setSwitchRejected" }],
						},
					},
					active: {
						on: {
							"live.snapshot": [
								{
									guard: "liveReadyWithoutCharacter",
									target: "#characterSession.idle",
									actions: ["updateLiveStatus", "setCharacterNotFound", "clearIdentity"],
								},
								{
									actions: ["updateLiveStatus", "scheduleValidationFromLive"],
								},
							],
							"character.edit.submit": [{ guard: "canEdit", actions: "acceptEdit" }, { actions: "setEditRejected" }],
							"character.edits.retryFailed": [
								{ guard: "canResolveFailedEdits", actions: "retryFailedEdits" },
								{ actions: "setEditRejected" },
							],
							"character.edits.discardFailed": [
								{ guard: "canResolveFailedEdits", actions: "discardFailedEdits" },
								{ actions: "setEditRejected" },
							],
							"character.preview.refresh": [
								{ guard: "canValidate", actions: "refreshValidation" },
								{ actions: "setValidationRejected" },
							],
							"character.preview.retryFailed": [
								{ guard: "canValidate", actions: "retryFailedValidation" },
								{ actions: "setValidationRejected" },
							],
							"character.load": activeIdentityChangeTransitions,
							"character.switch.requested": activeIdentityChangeTransitions,
						},
					},
					switching: {
						entry: raise({ type: "edits.evaluate" }),
						on: {
							"edits.changed": [
								{
									guard: "editQueueFailed",
									target: "active",
									actions: ["updateEditError", "setSwitchFailed"],
								},
								{
									guard: "editQueueSettled",
									target: "#loadedCharacterSession",
									reenter: true,
									actions: ["updateEditError", "commitPendingIdentity"],
								},
								{ actions: "updateEditError" },
							],
							"edits.evaluate": [
								{
									guard: "editQueueCurrentlyFailed",
									target: "active",
									actions: "setSwitchFailed",
								},
								{
									guard: "editQueueCurrentlySettled",
									target: "#loadedCharacterSession",
									reenter: true,
									actions: "commitPendingIdentity",
								},
							],
							"live.snapshot": { actions: "updateLiveStatus" },
							"character.edit.submit": { actions: "setEditRejected" },
							"character.edits.retryFailed": { actions: "setEditRejected" },
							"character.edits.discardFailed": { actions: "setEditRejected" },
							"character.preview.refresh": { actions: "setValidationRejected" },
							"character.preview.retryFailed": { actions: "setValidationRejected" },
							"character.load": { actions: "setSwitchRejected" },
							"character.switch.requested": { actions: "setSwitchRejected" },
						},
					},
				},
			},
		},
	});

	return {
		machine,
		getLiveSnapshot: () => activeLiveModel?.getSnapshot() ?? null,
		subscribeLiveProjection: (listener: (snapshot: CharacterLiveSnapshot | null) => void) => {
			liveProjectionListeners.add(listener);
			listener(activeLiveModel?.getSnapshot() ?? null);
			return () => liveProjectionListeners.delete(listener);
		},
		getEditSnapshot: () => editQueue.getSnapshot(),
		subscribeEditProjection: (listener: (snapshot: CharacterEditQueueSnapshot) => void) =>
			editQueue.subscribe(listener),
	};
}

export type CharacterSessionMachine = CharacterSessionRuntime["machine"];
export type CharacterSessionActorRef = ActorRefFrom<CharacterSessionMachine>;
export type CharacterSessionSnapshot = SnapshotFrom<CharacterSessionMachine>;
