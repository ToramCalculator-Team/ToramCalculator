import { describe, expect, it } from "vitest";
import { WorkerTaskResponseEnvelopeSchema } from "~/lib/WorkerPool/type";
import { EngineLifecycleCommandSchema } from "../GameEngineSM";
import { SimulationTaskExecutionError, SimulationTaskSchema } from "../simulationTask";
import { createTestTickStateHistory } from "../tickStateHistory.testUtils";
import {
	EngineProtocolError,
	EngineRPCSchema,
	engineLifecycleSuccess,
	engineRPCFailure,
	parseEngineLifecycleResult,
	parseEngineRPCResult,
} from "./protocol";

describe("WorkerTaskResponseEnvelopeSchema", () => {
	it("只接受带任务 ID 的结构化响应信封", () => {
		expect(
			WorkerTaskResponseEnvelopeSchema.parse({
				belongToTaskId: "task-1",
				result: { success: true, data: undefined },
				metrics: { duration: 1, memoryUsage: 0 },
			}),
		).toEqual({
			belongToTaskId: "task-1",
			result: { success: true, data: undefined },
			metrics: { duration: 1, memoryUsage: 0 },
		});
		expect(() => WorkerTaskResponseEnvelopeSchema.parse({ result: null, error: 42 })).toThrow();
	});
});

describe("parseEngineRPCResult", () => {
	it("send_intent 在线程边界复用 FSM 控制形状且技能不携带目标", () => {
		const baseIntent = {
			id: "input-1",
			controllerId: "controller-1",
			timestamp: 1,
		};
		expect(
			EngineRPCSchema.safeParse({
				type: "send_intent",
				intent: { ...baseIntent, type: "使用技能", data: { skillId: "skill-1" } },
			}).success,
		).toBe(true);
		expect(
			EngineRPCSchema.safeParse({
				type: "send_intent",
				intent: { ...baseIntent, type: "使用技能", data: { skillId: "skill-1", targetId: "mob-1" } },
			}).success,
		).toBe(false);
		expect(
			EngineRPCSchema.safeParse({
				type: "send_intent",
				intent: { ...baseIntent, type: "切换目标", data: { targetId: "mob-1" } },
			}).success,
		).toBe(true);
	});

	it("按请求类型解析技能列表成功响应", () => {
		const result = parseEngineRPCResult("get_member_skill_list", {
			success: true,
			data: [{ id: "skill-1", name: "Skill 1", level: 10 }],
		});

		expect(result).toEqual({
			success: true,
			data: [{ id: "skill-1", name: "Skill 1", level: 10 }],
		});
	});

	it("保留无返回数据命令的显式 undefined", () => {
		expect(parseEngineRPCResult("send_intent", { success: true, data: undefined })).toEqual({
			success: true,
			data: undefined,
		});
	});

	it("解析通用 SimulationTask 输出，并拒绝 runtimeConfig 的第二个 logicHz", () => {
		expect(
			parseEngineRPCResult("execute_simulation_task", {
				success: true,
				data: {
					output: {
						runId: "run-1",
						durationMs: 0,
						stateHistory: createTestTickStateHistory(),
						inputs: [],
						skillReleases: [],
						damage: [],
					},
					stats: { ticksRun: 0, elapsedMs: 0, reachedLimit: false },
				},
			}),
		).toMatchObject({ success: true, data: { output: { runId: "run-1" } } });

		const taskBase = {
			runId: "run-1",
			scenarioData: { scenario: { randomSeed: 1, logicHz: 60, primaryMemberId: "m", campA: [], campB: [] } },
			runtimeConfig: {
				driveMode: "unclocked",
				acceptExternalIntents: false,
				timeScale: 1,
				maxTickSkip: 0,
			},
			recordingPolicy: { tickStateHistory: "everyTick" },
			stopPolicy: { kind: "untilMemberFlowEnds", memberId: "m" },
			budget: { maxTicks: 1 },
		};
		expect(SimulationTaskSchema.safeParse(taskBase).success).toBe(true);
		expect(
			SimulationTaskSchema.safeParse({
				...taskBase,
				runtimeConfig: { ...taskBase.runtimeConfig, logicHz: 30 },
			}).success,
		).toBe(false);
	});

	it("失败响应不伪装成合法空数据", () => {
		expect(parseEngineRPCResult("get_members", engineRPCFailure("worker failed", "member_query_failed"))).toEqual({
			success: false,
			error: { code: "member_query_failed", message: "worker failed" },
		});
		expect(
			parseEngineRPCResult("get_members", {
				success: false,
				error: { code: "empty_message", message: "" },
			}),
		).toEqual({ success: false, error: { code: "empty_message", message: "" } });
	});

	it("保留通用任务的结构化执行失败 code", () => {
		expect(
			engineRPCFailure(
				new SimulationTaskExecutionError("simulation_task_timeout", "task timed out", { runId: "run-1" }),
			),
		).toEqual({
			success: false,
			error: { code: "simulation_task_timeout", message: "task timed out", details: { runId: "run-1" } },
		});
	});

	it("拒绝与请求类型不匹配的成功 payload", () => {
		expect(() =>
			parseEngineRPCResult("get_member_skill_list", {
				success: true,
				data: [{ id: "skill-1", name: "Skill 1", level: "10" }],
			}),
		).toThrow(EngineProtocolError);
	});

	it("拒绝非法 RPC 信封，并保留合法空数组和零值", () => {
		expect(() => parseEngineRPCResult("get_members", { success: false, error: "legacy string" })).toThrow(
			EngineProtocolError,
		);
		expect(parseEngineRPCResult("get_members", { success: true, data: [] })).toEqual({ success: true, data: [] });
	});
});

describe("parseEngineLifecycleResult", () => {
	const command = {
		type: "CMD_FAST_FORWARD" as const,
		sourceSide: "controller" as const,
		correlationId: "command-1",
		options: { maxTicks: 12 },
	};

	it("按命令与 correlationId 解析 fast-forward 结果", () => {
		const result = engineLifecycleSuccess(command, { ticksRun: 12, elapsedMs: 200, reachedLimit: true });
		expect(parseEngineLifecycleResult(command, result)).toEqual(result);
	});

	it("拒绝错误 correlationId 和非法 fast-forward data", () => {
		expect(() =>
			parseEngineLifecycleResult(command, {
				type: "RESULT_FAST_FORWARD",
				sourceSide: "executor",
				correlationId: "other-command",
				success: true,
				data: { ticksRun: 12, elapsedMs: 200, reachedLimit: false },
			}),
		).toThrow(EngineProtocolError);
		expect(() =>
			parseEngineLifecycleResult(command, {
				type: "RESULT_FAST_FORWARD",
				sourceSide: "executor",
				correlationId: "command-1",
				success: true,
				data: { ticksRun: -1, elapsedMs: 0, reachedLimit: false },
			}),
		).toThrow(EngineProtocolError);
	});

	it("普通 Engine RPC 不再接受生命周期命令", () => {
		expect(EngineRPCSchema.safeParse({ type: "fast_forward", options: {} }).success).toBe(false);
		expect(EngineRPCSchema.safeParse({ type: "unload_scenario" }).success).toBe(false);
	});

	it("生命周期命令不再接受多控制端预留字段", () => {
		expect(
			EngineLifecycleCommandSchema.safeParse({
				type: "CMD_START",
				sourceSide: "controller",
				correlationId: "start-1",
				operatorId: "legacy-operator",
				seq: 1,
			}).success,
		).toBe(false);
	});
});
