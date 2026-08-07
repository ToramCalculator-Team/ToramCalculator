import { assign, type SnapshotFrom, setup } from "xstate";
import { z } from "zod/v4";
import { EngineScenarioDataSchema } from "./types";

export const EngineExecutionErrorSchema = z.object({
	code: z.string(),
	message: z.string(),
	details: z.unknown().optional(),
});
export type EngineExecutionError = z.output<typeof EngineExecutionErrorSchema>;

export const FastForwardOptionsSchema = z
	.object({
		maxTicks: z.number().int().positive().optional(),
		maxDurationMs: z.number().positive().optional(),
	})
	.strict();
export type FastForwardOptions = z.output<typeof FastForwardOptionsSchema>;

export const FastForwardResultSchema = z
	.object({
		ticksRun: z.number().int().nonnegative(),
		elapsedMs: z.number().nonnegative(),
		reachedLimit: z.boolean(),
	})
	.strict();
export type FastForwardResult = z.output<typeof FastForwardResultSchema>;

const CommandIdentityShape = {
	sourceSide: z.literal("controller"),
	correlationId: z.string().min(1),
};

export const EngineLifecycleCommandSchema = z.discriminatedUnion("type", [
	z.object({ ...CommandIdentityShape, type: z.literal("CMD_INIT"), data: EngineScenarioDataSchema }).strict(),
	z.object({ ...CommandIdentityShape, type: z.literal("CMD_START") }).strict(),
	z.object({ ...CommandIdentityShape, type: z.literal("CMD_PAUSE") }).strict(),
	z.object({ ...CommandIdentityShape, type: z.literal("CMD_RESUME") }).strict(),
	z.object({ ...CommandIdentityShape, type: z.literal("CMD_STOP") }).strict(),
	z.object({ ...CommandIdentityShape, type: z.literal("CMD_RESET") }).strict(),
	z.object({ ...CommandIdentityShape, type: z.literal("CMD_STEP") }).strict(),
	z.object({ ...CommandIdentityShape, type: z.literal("CMD_UNLOAD") }).strict(),
	z
		.object({
			...CommandIdentityShape,
			type: z.literal("CMD_FAST_FORWARD"),
			options: FastForwardOptionsSchema.optional(),
		})
		.strict(),
]);
export type EngineLifecycleCommand = z.output<typeof EngineLifecycleCommandSchema>;
export type EngineLifecycleCommandType = EngineLifecycleCommand["type"];

const ResultIdentityShape = {
	sourceSide: z.literal("executor"),
	correlationId: z.string().min(1),
};

const lifecycleVoidResultSchema = <TType extends string>(type: TType) =>
	z.discriminatedUnion("success", [
		z.object({ ...ResultIdentityShape, type: z.literal(type), success: z.literal(true) }).strict(),
		z
			.object({
				...ResultIdentityShape,
				type: z.literal(type),
				success: z.literal(false),
				error: EngineExecutionErrorSchema,
			})
			.strict(),
	]);

const FastForwardLifecycleResultSchema = z.discriminatedUnion("success", [
	z
		.object({
			...ResultIdentityShape,
			type: z.literal("RESULT_FAST_FORWARD"),
			success: z.literal(true),
			data: FastForwardResultSchema,
		})
		.strict(),
	z
		.object({
			...ResultIdentityShape,
			type: z.literal("RESULT_FAST_FORWARD"),
			success: z.literal(false),
			error: EngineExecutionErrorSchema,
		})
		.strict(),
]);

export const EngineLifecycleResultSchema = z.union([
	lifecycleVoidResultSchema("RESULT_INIT"),
	lifecycleVoidResultSchema("RESULT_START"),
	lifecycleVoidResultSchema("RESULT_PAUSE"),
	lifecycleVoidResultSchema("RESULT_RESUME"),
	lifecycleVoidResultSchema("RESULT_STOP"),
	lifecycleVoidResultSchema("RESULT_RESET"),
	lifecycleVoidResultSchema("RESULT_STEP"),
	lifecycleVoidResultSchema("RESULT_UNLOAD"),
	FastForwardLifecycleResultSchema,
]);
export type EngineLifecycleResult = z.output<typeof EngineLifecycleResultSchema>;
export type EngineLifecycleResultType = EngineLifecycleResult["type"];

export const EngineControlMessageSchema = z.union([EngineLifecycleCommandSchema, EngineLifecycleResultSchema]);
export type EngineControlMessage = z.output<typeof EngineControlMessageSchema>;

export const LifecycleResultTypeByCommand = {
	CMD_INIT: "RESULT_INIT",
	CMD_START: "RESULT_START",
	CMD_PAUSE: "RESULT_PAUSE",
	CMD_RESUME: "RESULT_RESUME",
	CMD_STOP: "RESULT_STOP",
	CMD_RESET: "RESULT_RESET",
	CMD_STEP: "RESULT_STEP",
	CMD_UNLOAD: "RESULT_UNLOAD",
	CMD_FAST_FORWARD: "RESULT_FAST_FORWARD",
} as const satisfies Record<EngineLifecycleCommandType, EngineLifecycleResultType>;

export function isMatchingLifecycleResult(command: EngineLifecycleCommand, result: EngineLifecycleResult): boolean {
	return LifecycleResultTypeByCommand[command.type] === result.type && command.correlationId === result.correlationId;
}

export const EngineLifecycleStableStateSchema = z.enum(["idle", "ready", "running", "paused"]);
export type EngineLifecycleStableState = z.output<typeof EngineLifecycleStableStateSchema>;

export const EngineLifecycleStateSchema = z.enum([
	"idle",
	"initializing",
	"ready",
	"starting",
	"running",
	"pausing",
	"paused",
	"resuming",
	"stopping",
	"resetting",
	"stepping",
	"unloading",
	"advancing",
]);
export type EngineLifecycleState = z.output<typeof EngineLifecycleStateSchema>;

export const EngineLifecycleSnapshotSchema = z
	.object({
		state: EngineLifecycleStateSchema,
		confirmedState: EngineLifecycleStableStateSchema,
		pending: z
			.object({
				type: z.enum([
					"CMD_INIT",
					"CMD_START",
					"CMD_PAUSE",
					"CMD_RESUME",
					"CMD_STOP",
					"CMD_RESET",
					"CMD_STEP",
					"CMD_UNLOAD",
					"CMD_FAST_FORWARD",
				]),
				correlationId: z.string(),
			})
			.strict()
			.nullable(),
	})
	.strict();
export type EngineLifecycleSnapshot = z.output<typeof EngineLifecycleSnapshotSchema>;

export interface EngineSMContext {
	role: "controller" | "executor";
	confirmedState: EngineLifecycleStableState;
	pendingCommand: EngineLifecycleCommand | null;
}

function isLifecycleCommand(event: EngineControlMessage): event is EngineLifecycleCommand {
	return event.sourceSide === "controller";
}

function isLifecycleResult(event: EngineControlMessage): event is EngineLifecycleResult {
	return event.sourceSide === "executor";
}

function resultMatchesPending(context: EngineSMContext, event: EngineControlMessage): event is EngineLifecycleResult {
	return (
		context.pendingCommand !== null &&
		isLifecycleResult(event) &&
		isMatchingLifecycleResult(context.pendingCommand, event)
	);
}

export const GameEngineSM = setup({
	types: {} as {
		context: EngineSMContext;
		events: EngineControlMessage;
		input: { role: EngineSMContext["role"] };
	},
	actions: {
		beginCommand: assign({
			pendingCommand: ({ event }) => (isLifecycleCommand(event) ? event : null),
		}),
		enterIdle: assign({ confirmedState: () => "idle", pendingCommand: () => null }),
		enterReady: assign({ confirmedState: () => "ready", pendingCommand: () => null }),
		enterRunning: assign({ confirmedState: () => "running", pendingCommand: () => null }),
		enterPaused: assign({ confirmedState: () => "paused", pendingCommand: () => null }),
	},
	guards: {
		matchingSuccess: ({ context, event }) => resultMatchesPending(context, event) && event.success,
		matchingFailureToIdle: ({ context, event }) =>
			resultMatchesPending(context, event) && !event.success && context.confirmedState === "idle",
		matchingFailureToReady: ({ context, event }) =>
			resultMatchesPending(context, event) && !event.success && context.confirmedState === "ready",
		matchingFailureToRunning: ({ context, event }) =>
			resultMatchesPending(context, event) && !event.success && context.confirmedState === "running",
		matchingFailureToPaused: ({ context, event }) =>
			resultMatchesPending(context, event) && !event.success && context.confirmedState === "paused",
	},
}).createMachine({
	id: "engine-lifecycle",
	initial: "idle",
	context: ({ input }) => ({ role: input.role, confirmedState: "idle", pendingCommand: null }),
	states: {
		idle: {
			entry: "enterIdle",
			on: {
				CMD_INIT: { target: "initializing", actions: "beginCommand" },
				CMD_UNLOAD: { target: "unloading", actions: "beginCommand" },
			},
		},
		initializing: {
			on: {
				RESULT_INIT: [
					{ guard: "matchingSuccess", target: "ready" },
					{ guard: "matchingFailureToIdle", target: "idle" },
					{ guard: "matchingFailureToReady", target: "ready" },
				],
			},
		},
		ready: {
			entry: "enterReady",
			on: {
				CMD_INIT: { target: "initializing", actions: "beginCommand" },
				CMD_START: { target: "starting", actions: "beginCommand" },
				CMD_STOP: { target: "stopping", actions: "beginCommand" },
				CMD_RESET: { target: "resetting", actions: "beginCommand" },
				CMD_UNLOAD: { target: "unloading", actions: "beginCommand" },
				CMD_FAST_FORWARD: { target: "advancing", actions: "beginCommand" },
			},
		},
		starting: {
			on: {
				RESULT_START: [
					{ guard: "matchingSuccess", target: "running" },
					{ guard: "matchingFailureToReady", target: "ready" },
				],
			},
		},
		running: {
			entry: "enterRunning",
			on: {
				CMD_PAUSE: { target: "pausing", actions: "beginCommand" },
				CMD_STOP: { target: "stopping", actions: "beginCommand" },
				CMD_RESET: { target: "resetting", actions: "beginCommand" },
				CMD_UNLOAD: { target: "unloading", actions: "beginCommand" },
			},
		},
		pausing: {
			on: {
				RESULT_PAUSE: [
					{ guard: "matchingSuccess", target: "paused" },
					{ guard: "matchingFailureToRunning", target: "running" },
				],
			},
		},
		paused: {
			entry: "enterPaused",
			on: {
				CMD_RESUME: { target: "resuming", actions: "beginCommand" },
				CMD_STOP: { target: "stopping", actions: "beginCommand" },
				CMD_RESET: { target: "resetting", actions: "beginCommand" },
				CMD_STEP: { target: "stepping", actions: "beginCommand" },
				CMD_UNLOAD: { target: "unloading", actions: "beginCommand" },
			},
		},
		resuming: {
			on: {
				RESULT_RESUME: [
					{ guard: "matchingSuccess", target: "running" },
					{ guard: "matchingFailureToPaused", target: "paused" },
				],
			},
		},
		stopping: {
			on: {
				RESULT_STOP: [
					{ guard: "matchingSuccess", target: "ready" },
					{ guard: "matchingFailureToReady", target: "ready" },
					{ guard: "matchingFailureToRunning", target: "running" },
					{ guard: "matchingFailureToPaused", target: "paused" },
				],
			},
		},
		resetting: {
			on: {
				RESULT_RESET: [
					{ guard: "matchingSuccess", target: "ready" },
					{ guard: "matchingFailureToReady", target: "ready" },
					{ guard: "matchingFailureToRunning", target: "running" },
					{ guard: "matchingFailureToPaused", target: "paused" },
				],
			},
		},
		stepping: {
			on: {
				RESULT_STEP: [
					{ guard: "matchingSuccess", target: "paused" },
					{ guard: "matchingFailureToPaused", target: "paused" },
				],
			},
		},
		unloading: {
			on: {
				RESULT_UNLOAD: [
					{ guard: "matchingSuccess", target: "idle" },
					{ guard: "matchingFailureToIdle", target: "idle" },
					{ guard: "matchingFailureToReady", target: "ready" },
					{ guard: "matchingFailureToRunning", target: "running" },
					{ guard: "matchingFailureToPaused", target: "paused" },
				],
			},
		},
		advancing: {
			on: {
				RESULT_FAST_FORWARD: [
					{ guard: "matchingSuccess", target: "ready" },
					{ guard: "matchingFailureToReady", target: "ready" },
				],
			},
		},
	},
});

/** 将 actor 内部 snapshot 收窄为 Handle 可以安全公开的只读协议视图。 */
export function projectEngineLifecycleSnapshot(snapshot: SnapshotFrom<typeof GameEngineSM>): EngineLifecycleSnapshot {
	const state = EngineLifecycleStateSchema.parse(snapshot.value);
	const pending = snapshot.context.pendingCommand
		? {
				type: snapshot.context.pendingCommand.type,
				correlationId: snapshot.context.pendingCommand.correlationId,
			}
		: null;
	return EngineLifecycleSnapshotSchema.parse({
		state,
		confirmedState: snapshot.context.confirmedState,
		pending,
	});
}
