import { z } from "zod/v4";
import { TerrainDefinitionSchema } from "~/lib/terrain";
import { EngineScenarioSchema } from "./ScenarioSchema";

// ==================== TickContext ====================

/**
 * 单次逻辑 tick 的权威时间上下文。
 *
 * 设计说明：
 * - currentTimeMs 模拟时刻。
 * - tickIndex 帧序号。
 * - fixedStepMs 帧步长。
 */
export interface SimulationTickContext {
	tickIndex: number;
	currentTimeMs: number;
	fixedStepMs: number;
}

// ==================== RuntimeConfig ====================

/** 帧驱动方式 */
export const DriveModeSchema = z.enum(["clocked", "unclocked"]);
export type DriveMode = z.output<typeof DriveModeSchema>;

/** 停止策略 */
export const StopPolicySchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("manual") }),
	z.object({ kind: z.literal("untilTimeMs"), targetTimeMs: z.number().nonnegative() }),
	z.object({ kind: z.literal("untilBattleEnd") }),
	z.object({ kind: z.literal("untilSequencesDone") }),
	z.object({ kind: z.literal("untilMemberActionEnds"), memberId: z.string() }),
	z.object({ kind: z.literal("untilMemberAiBehaviorEnds"), memberId: z.string() }),
]);
export type StopPolicy = z.output<typeof StopPolicySchema>;

/**
 * 引擎运行配置描述符。
 *
 * 本契约只描述引擎执行机制。实时投影频率和执行记录策略使用各自独立契约，
 * 不能通过业务用途模式改变运行语义。
 */
export const RuntimeConfigSchema = z.object({
	driveMode: DriveModeSchema,
	stopPolicy: StopPolicySchema,
	acceptExternalIntents: z.boolean(),
	timeScale: z.number().positive(),
	maxCatchUpTicks: z.number().int().positive(),
});
export type RuntimeConfig = z.output<typeof RuntimeConfigSchema>;

/**
 * 预设：实时模式（`driveMode: "clocked"`）。
 *
 * 模拟贴近真实时间的运行：由时钟循环按 `logicHz` 等驱动推进。
 *
 * 1. 时钟驱动、近似恒定节拍推进（受 `timeScale` / 跳帧上限等影响）。
 * 2. 当前实现下不因成员闲置而自动停帧；若后续增加「同步手动成员」类开关，行为以该字段为准。
 * 3. 实时 Session 显式附加 latest-state SAB，UI 与渲染器允许跳过中间提交。
 * 4. `acceptExternalIntents: true`，成员可接收外部意图（如 `MemberController`）。
 */
export function createRealtimeConfig(overrides?: Partial<RuntimeConfig>): RuntimeConfig {
	return {
		driveMode: "clocked",
		stopPolicy: { kind: "manual" },
		acceptExternalIntents: true,
		timeScale: 1,
		maxCatchUpTicks: 5,
		...overrides,
	};
}

// ==================== EngineScenarioData ====================

export const EngineScenarioDataSchema = z.object({
	scenario: EngineScenarioSchema,
	terrain: TerrainDefinitionSchema,
});

export type EngineScenarioData = z.output<typeof EngineScenarioDataSchema>;

// ==================== EngineSnapshot ====================

/**
 * 帧快照接口 - 包含引擎和所有成员的完整状态
 */
export interface GameEngineSnapshot {
	tickIndex: number;
	currentTimeMs: number;
	world: unknown; // TODO：之后world结构确定时补充
}

// ==================== Checkpoint / Restore ====================

/** 引擎完整检查点 */
export interface EngineCheckpoint {
	tickIndex: number;
	currentTimeMs: number;
	timestamp: number;
	world: unknown; // TODO:world结构稳定时从World处引入
}
