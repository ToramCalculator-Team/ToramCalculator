import { MemberType } from "@db/schema/enums";
import { QueueSnapshot, QueueStats } from "./EventQueue/types";
import { FrameLoopStats, FrameSnapshot } from "./FrameLoop/types";
import { MemberSerializeData } from "./member/Member";
import { MessageRouterStats } from "./MessageRouter";
import { z } from "zod/v4";
import { EventQueueConfigSchema } from "./EventQueue/types";
import { FrameLoopConfigSchema } from "./FrameLoop/types";

/**
* 引擎状态枚举
*/
export type EngineState =
 | "unInitialized" // 未初始化
 | "initialized" // 已初始化
 | "running" // 运行中
 | "paused" // 已暂停
 | "stopped"; // 已停止


/**
 * 引擎配置接口
 */
export const EngineConfigSchema = z.object({
  enableRealtimeControl: z.boolean(),
  eventQueueConfig: EventQueueConfigSchema,
  frameLoopConfig: FrameLoopConfigSchema,
});
export type EngineConfig = z.output<typeof EngineConfigSchema>;

/**
 * 引擎统计信息接口
 */
export interface EngineStats {
  /** 引擎状态 */
  SMState: string; // 待优化
  /** 当前帧号 */
  currentFrame: number;
  /** 运行时间（毫秒） */
  runTime: number;
  /** 成员 */
  members: MemberSerializeData[];
  /** 事件队列统计 */
  eventQueueStats: QueueStats;
  /** 帧循环统计 */
  frameLoopStats: FrameLoopStats;
  /** 消息路由统计 */
  messageRouterStats: MessageRouterStats;
}

/**
 * 技能计算数据 - 预计算的动态值，用于UI显示
 */
export const ComputedSkillInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.number(),
  computed: z.object({
    mpCost: z.number(),
    hpCost: z.number(),
    castingRange: z.string().nullable(),
    cooldownRemaining: z.number(),
    isAvailable: z.boolean(),
  }),
});
export type ComputedSkillInfo = z.output<typeof ComputedSkillInfoSchema>;

/**
 * 帧快照接口 - 包含引擎和所有成员的完整状态
 */
export interface GameEngineSnapshot {
  frameNumber: number;
  timestamp: number;
  engine: {
    frameNumber: number;
    runTime: number;
    frameLoop: FrameSnapshot;
    eventQueue: QueueSnapshot;
    memberCount: number;
    activeMemberCount: number;
  };
  members: MemberSerializeData[];
}

/**
 * 帧快照Schema
 */
export const FrameSnapshotSchema = z.object({
  frameNumber: z.number(),
  timestamp: z.number(),
  engine: z.object({
    frameNumber: z.number(),
    runTime: z.number(),
    frameLoop: z.object({
      averageFPS: z.number(),
      averageFrameTime: z.number(),
      totalFrames: z.number(),
      totalRunTime: z.number(),
      clockKind: z.enum(["raf", "timeout"]).optional(),
      skippedFrames: z.number().optional(),
      frameBudgetMs: z.number().optional(),
    }),
    eventQueue: z.object({
      currentSize: z.number(),
      totalProcessed: z.number(),
      totalInserted: z.number(),
      overflowCount: z.number(),
    }),
    memberCount: z.number(),
    activeMemberCount: z.number(),
  }),
  members: z.array(
    z.object({
      id: z.string(),
      type: z.string(), // 这里保持 z.string() 因为 Zod 不支持从外部类型推断
      name: z.string(),
      state: z.any(),
      attrs: z.record(z.string(), z.unknown()),
      isAlive: z.boolean(),
      position: z.object({
        x: z.number(),
        y: z.number(),
        z: z.number(),
      }),
      campId: z.string(),
      teamId: z.string(),
      targetId: z.string(),
      skills: z.array(ComputedSkillInfoSchema).optional(),
    }),
  ),
});

/**
 * 引擎统计完整类型
 * 扩展的引擎统计信息，支持动态属性
 */
export const EngineStatsFullSchema = z
  .object({
    currentFrame: z.number(),
  })
  .passthrough();

export type EngineStatsFull = z.output<typeof EngineStatsFullSchema>;

/**
 * 战斗快照接口
 */
export interface BattleSnapshot {
  /** 快照时间戳 */
  timestamp: number;
  /** 帧号 */
  frameNumber: number;
  /** 所有成员状态 */
  members: Array<MemberSerializeData>;
  /** 战斗状态 */
  battleStatus: {
    isEnded: boolean;
    winner?: string;
    reason?: string;
  };
}
