/**
 * 当前 Engine 运行的权威原始产出契约与收集器。
 *
 * 本模块只负责在 Worker 内收集一次活动运行，并在结束时封闭为不可变的
 * `EngineRunOutput`。它不认识应用业务阶段，不生成业务摘要，也不保存已移交
 * 运行的历史目录。结束结果会保留到调用方明确确认，以便跨线程通信失败时
 * 能够按同一 runId 幂等重试。
 */
import { z } from "zod/v4";
import {
	TickStateHistoryDirectorySchema,
	TickStateHistoryWriter,
	type TickStateMemberSource,
} from "./tickStateHistory";

/** 执行记录只描述需要捕获的技术事实，不编码调用方的业务用途。 */
export const ExecutionRecordingPolicySchema = z
	.object({
		tickStateHistory: z.enum(["none", "everyTick"]),
	})
	.strict();
export type ExecutionRecordingPolicy = z.output<typeof ExecutionRecordingPolicySchema>;

const emptyPayloadSchema = z.object({}).strict();
const reviveActionSchema = z.object({ type: z.literal("复活"), payload: emptyPayloadSchema }).strict();
const moveActionSchema = z
	.object({
		type: z.literal("移动"),
		payload: z.object({ position: z.object({ x: z.number(), y: z.number() }).strict() }).strict(),
	})
	.strict();
const stopMoveActionSchema = z.object({ type: z.literal("停止移动"), payload: emptyPayloadSchema }).strict();
const skillActionSchema = z
	.object({ type: z.literal("使用技能"), payload: z.object({ skillId: z.string().min(1) }).strict() })
	.strict();
const startGuardActionSchema = z.object({ type: z.literal("使用格挡"), payload: emptyPayloadSchema }).strict();
const stopGuardActionSchema = z.object({ type: z.literal("结束格挡"), payload: emptyPayloadSchema }).strict();
const dodgeActionSchema = z.object({ type: z.literal("使用闪躲"), payload: emptyPayloadSchema }).strict();
const selectTargetActionSchema = z
	.object({ type: z.literal("切换目标"), payload: z.object({ targetId: z.string().min(1) }).strict() })
	.strict();

/** 运行输入的严格语义形状；目标状态只通过独立的“切换目标”动作表达。 */
export const RunInputActionSchema = z.discriminatedUnion("type", [
	reviveActionSchema,
	moveActionSchema,
	stopMoveActionSchema,
	skillActionSchema,
	startGuardActionSchema,
	stopGuardActionSchema,
	dodgeActionSchema,
	selectTargetActionSchema,
]);

const runInputIdentityShape = {
	inputId: z.string().min(1),
	timeMs: z.number().finite().nonnegative(),
};

export const AcceptedRunInputRecordSchema = z.object({
	...runInputIdentityShape,
	action: RunInputActionSchema,
	memberId: z.string().min(1),
	status: z.literal("accepted"),
});

export const RejectedRunInputRecordSchema = z.object({
	...runInputIdentityShape,
	action: RunInputActionSchema,
	memberId: z.string().min(1).nullable(),
	status: z.literal("rejected"),
	reason: z.string().min(1),
});

export const RunInputRecordSchema = z.discriminatedUnion("status", [
	AcceptedRunInputRecordSchema,
	RejectedRunInputRecordSchema,
]);

export const SkillReleaseRecordSchema = z.object({
	memberId: z.string(),
	skillId: z.string(),
	timeMs: z.number().finite().nonnegative(),
});

export const DamageRecordSchema = z.object({
	sourceMemberId: z.string(),
	targetMemberId: z.string(),
	sourceSkillId: z.string().nullable(),
	damage: z.number(),
	timeMs: z.number().finite().nonnegative(),
});

export const EngineRunOutputSchema = z.object({
	runId: z.string(),
	durationMs: z.number().finite().nonnegative(),
	stateHistory: TickStateHistoryDirectorySchema.nullable(),
	inputs: z.array(RunInputRecordSchema),
	skillReleases: z.array(SkillReleaseRecordSchema),
	damage: z.array(DamageRecordSchema),
});

export type RunInputAction = z.output<typeof RunInputActionSchema>;
export type AcceptedRunInputRecord = z.output<typeof AcceptedRunInputRecordSchema>;
export type RejectedRunInputRecord = z.output<typeof RejectedRunInputRecordSchema>;
export type RunInputRecord = z.output<typeof RunInputRecordSchema>;
export type SkillReleaseRecord = z.output<typeof SkillReleaseRecordSchema>;
export type DamageRecord = z.output<typeof DamageRecordSchema>;
export type EngineRunOutput = z.output<typeof EngineRunOutputSchema>;

type PendingRunInput = {
	inputId: string;
	memberId: string | null;
	timeMs: number;
	action: RunInputAction;
	status: "pending";
};

type ActiveRunOutput = {
	runId: string;
	startedAtTick: number;
	startedAtTimeMs: number;
	stateHistory: TickStateHistoryWriter | null;
	inputs: Array<PendingRunInput | RunInputRecord>;
	skillReleases: SkillReleaseRecord[];
	damage: DamageRecord[];
};

/**
 * Worker 内单槽运行产出收集器。
 * 活动收集与待认领结果互斥，防止 Engine 重新承担多运行历史所有权。
 */
export class RunOutputRecorder {
	private activeOutput: ActiveRunOutput | null = null;
	private pendingTransfer: EngineRunOutput | null = null;
	private lastTransferredRunId: string | null = null;

	isRecording(): boolean {
		return this.activeOutput !== null;
	}

	hasPendingTransfer(): boolean {
		return this.pendingTransfer !== null;
	}

	/** 场景只能在没有活动记录和待确认产出时切换，避免同一输出跨场景续写或被静默丢弃。 */
	assertScenarioChangeAllowed(): void {
		if (this.activeOutput) throw new Error(`运行 ${this.activeOutput.runId} 仍在记录，不能切换场景`);
		if (this.pendingTransfer) throw new Error(`运行 ${this.pendingTransfer.runId} 的产出尚未确认，不能切换场景`);
	}

	private requireActive(): ActiveRunOutput {
		if (!this.activeOutput) throw new Error("当前没有活动运行产出");
		return this.activeOutput;
	}

	start(runId: string, startedAtTick: number, startedAtTimeMs: number, policy: ExecutionRecordingPolicy): void {
		if (this.activeOutput) throw new Error(`运行 ${this.activeOutput.runId} 尚未结束`);
		if (this.pendingTransfer) throw new Error(`运行 ${this.pendingTransfer.runId} 的产出尚未移交`);
		if (!Number.isFinite(startedAtTimeMs) || startedAtTimeMs < 0) {
			throw new Error(`运行 ${runId} 起始模拟时间无效: ${startedAtTimeMs}`);
		}
		this.activeOutput = {
			runId,
			startedAtTick,
			startedAtTimeMs,
			stateHistory:
				policy.tickStateHistory === "everyTick"
					? new TickStateHistoryWriter(startedAtTick, startedAtTimeMs, runId)
					: null,
			inputs: [],
			skillReleases: [],
			damage: [],
		};
	}

	appendTick(tickIndex: number, currentTimeMs: number, members: readonly TickStateMemberSource[]): void {
		this.requireActive().stateHistory?.appendTick(tickIndex, currentTimeMs, members);
	}

	appendInput(input: Omit<PendingRunInput, "status">): void {
		const output = this.requireActive();
		if (output.inputs.some((candidate) => candidate.inputId === input.inputId)) {
			throw new Error(`运行 ${output.runId} 收到重复 inputId: ${input.inputId}`);
		}
		output.inputs.push({
			...structuredClone(input),
			action: RunInputActionSchema.parse(input.action),
			status: "pending",
		});
	}

	/** 判断当前运行是否拥有尚未形成最终判决的输入。 */
	hasPendingInput(inputId: string): boolean {
		return this.activeOutput?.inputs.some((input) => input.inputId === inputId && input.status === "pending") ?? false;
	}

	private requirePendingInput(inputId: string): {
		output: ActiveRunOutput;
		inputIndex: number;
		input: PendingRunInput;
	} {
		const output = this.requireActive();
		const inputIndex = output.inputs.findLastIndex((candidate) => candidate.inputId === inputId);
		if (inputIndex === -1) throw new Error(`运行 ${output.runId} 收到未知 inputId 回执: ${inputId}`);
		const input = output.inputs[inputIndex];
		if (!input) throw new Error(`运行 ${output.runId} 输入索引失效: ${inputId}`);
		if (input.status !== "pending") throw new Error(`运行 ${output.runId} 输入 ${inputId} 已有最终决议`);
		return { output, inputIndex, input };
	}

	/** 只在领域接纳边界封闭 accepted 输入；接纳不会改写原请求语义。 */
	acceptInput(inputId: string, timeMs: number): void {
		const { output, inputIndex, input } = this.requirePendingInput(inputId);
		if (input.memberId === null || input.memberId.length === 0) {
			throw new Error(`运行 ${output.runId} 接纳输入 ${inputId} 缺少 memberId`);
		}
		output.inputs[inputIndex] = { ...input, memberId: input.memberId, timeMs, status: "accepted" };
	}

	/** 拒绝事实保留原请求语义和明确原因，不用默认 action 掩盖请求内容。 */
	rejectInput(inputId: string, timeMs: number, reason: string): void {
		if (!reason) throw new Error(`拒绝输入 ${inputId} 缺少原因`);
		const { output, inputIndex, input } = this.requirePendingInput(inputId);
		output.inputs[inputIndex] = { ...input, timeMs, status: "rejected", reason };
	}

	appendSkillRelease(record: SkillReleaseRecord): void {
		this.requireActive().skillReleases.push(record);
	}

	appendDamage(record: DamageRecord): void {
		this.requireActive().damage.push(record);
	}

	/** 封闭一次活动运行；重复结束同一 runId 返回同一条待移交结果。 */
	finish(runId: string, endedAtTimeMs: number): EngineRunOutput {
		if (this.pendingTransfer) {
			if (this.pendingTransfer.runId !== runId) {
				throw new Error(`运行 ${this.pendingTransfer.runId} 的产出尚未移交`);
			}
			return this.pendingTransfer;
		}
		if (!this.activeOutput || this.activeOutput.runId !== runId) {
			throw new Error(`运行 ${runId} 不是当前活动运行`);
		}
		const active = this.activeOutput;
		const toRelativeTime = (timeMs: number): number => {
			if (timeMs < active.startedAtTimeMs) {
				throw new Error(`运行 ${runId} 记录时间 ${timeMs}ms 早于起点 ${active.startedAtTimeMs}ms`);
			}
			return timeMs - active.startedAtTimeMs;
		};
		const inputs: RunInputRecord[] = active.inputs.map((input) => {
			if (input.status === "pending") {
				return {
					...input,
					timeMs: toRelativeTime(input.timeMs),
					status: "rejected",
					reason: "运行结束前未被成员接纳",
				};
			}
			return { ...input, timeMs: toRelativeTime(input.timeMs) };
		});
		const output: EngineRunOutput = {
			runId: active.runId,
			durationMs: toRelativeTime(endedAtTimeMs),
			stateHistory: active.stateHistory?.finish() ?? null,
			inputs,
			skillReleases: active.skillReleases.map((record) => ({
				...record,
				timeMs: toRelativeTime(record.timeMs),
			})),
			damage: active.damage.map((record) => ({ ...record, timeMs: toRelativeTime(record.timeMs) })),
		};
		this.activeOutput = null;
		this.pendingTransfer = output;
		return output;
	}

	/** 启动提交前失败时丢弃尚未封闭的活动收集器；待移交结果不能被取消。 */
	cancel(runId: string): void {
		if (!this.activeOutput || this.activeOutput.runId !== runId) return;
		this.activeOutput = null;
	}

	/** 调用方确认接收后释放待移交结果；确认后 Engine 不再保留结果。 */
	acknowledgeTransfer(runId: string): void {
		if (!this.pendingTransfer && this.lastTransferredRunId === runId) return;
		if (!this.pendingTransfer || this.pendingTransfer.runId !== runId) {
			throw new Error(`运行 ${runId} 没有待移交产出`);
		}
		this.pendingTransfer = null;
		this.lastTransferredRunId = runId;
	}
}
