/**
 * 简化游戏引擎 - 固定流程模拟专用
 *
 * 核心功能：
 * 1. 基础事件处理
 * 2. 每60帧输出快照
 * 3. 基于数据库结构的阵营-队伍-成员层级管理
 *
 * 数据结构说明：
 * - 引擎直接管理两个阵营（campA, campB）
 * - 每个阵营包含多个队伍（team）
 * - 每个队伍包含多个成员（member）
 * - 成员可以是玩家角色（character）、佣兵（mercenary）、怪物（mob）等
 */

import { createSignal } from "solid-js";
import type { TeamWithRelations } from "~/repositories/team";
import type { MemberWithRelations } from "~/repositories/member";
import type { SimulatorWithRelations } from "~/repositories/simulator";
import type { CharacterWithRelations } from "~/repositories/character";
import type { MercenaryWithRelations } from "~/repositories/mercenary";
import type { MobWithRelations } from "~/repositories/mob";
import type { PlayerWithRelations } from "~/repositories/player";
import { createMember, type Member } from "./Member";

// ============================== 核心数据类型定义 ==============================

/**
 * 战斗事件接口
 * 定义模拟器运行过程中发生的所有事件
 */
interface BattleEvent {
  /** 事件唯一标识符 */
  id: string;
  /** 事件类型 */
  type: string;
  /** 事件发生的时间戳（帧数） */
  timestamp: number;
  /** 事件源成员ID */
  sourceId?: string;
  /** 事件目标成员ID */
  targetId?: string;
  /** 事件附加数据 */
  data?: Record<string, any>;
}

/**
 * 事件类型枚举
 * 涵盖战斗模拟中可能发生的所有事件类型
 */
type BattleEventType =
  | "member_spawn" // 成员生成事件
  | "member_death" // 成员死亡事件
  | "skill_start" // 技能开始事件
  | "skill_effect" // 技能效果事件
  | "battle_end" // 战斗结束事件
  | "frame_update"; // 帧更新事件

/**
 * 成员类型枚举
 * 对应数据库中的MemberType
 */
type MemberType = "PLAYER" | "MERCENARY" | "MOB" | "PARTNER";

/**
 * 类型守卫：检查成员是否为玩家类型
 */
function isPlayerMember(
  member: MemberWithRelations,
): member is MemberWithRelations & { player: NonNullable<MemberWithRelations["player"]> } {
  return member.player !== null && member.player !== undefined;
}

/**
 * 类型守卫：检查成员是否为佣兵类型
 */
function isMercenaryMember(
  member: MemberWithRelations,
): member is MemberWithRelations & { mercenary: NonNullable<MemberWithRelations["mercenary"]> } {
  return member.mercenary !== null && member.mercenary !== undefined;
}

/**
 * 类型守卫：检查成员是否为怪物类型
 */
function isMobMember(
  member: MemberWithRelations,
): member is MemberWithRelations & { mob: NonNullable<MemberWithRelations["mob"]> } {
  return member.mob !== null && member.mob !== undefined;
}

/**
 * 类型守卫：检查成员是否为伙伴类型
 */
function isPartnerMember(
  member: MemberWithRelations,
): member is MemberWithRelations & { partner: NonNullable<MemberWithRelations["partner"]> } {
  return member.partner !== null && member.partner !== undefined;
}

/**
 * 战斗中的成员状态接口
 * 基于Member类，但添加了战斗相关的临时状态
 */
interface BattleMemberState {
  /** 成员实例 */
  member: Member;
  /** 是否存活 */
  isAlive: boolean;
  /** 是否可行动 */
  isActive: boolean;
  /** 当前生命值 */
  currentHp: number;
  /** 当前魔法值 */
  currentMp: number;
  /** 位置坐标 */
  position: { x: number; y: number };
}

/**
 * 战斗中的队伍状态接口
 * 基于数据库team表，但添加了战斗相关的临时状态
 */
interface BattleTeamState {
  /** 队伍ID */
  id: string;
  /** 队伍名称 */
  name: string;
  /** 队伍中的所有成员 */
  members: BattleMemberState[];
  /** 队伍是否还有存活成员 */
  hasAliveMembers: boolean;
  /** 宝石列表 */
  gems: string[];
}

/**
 * 战斗中的阵营状态接口
 * 对应数据库中的campA和campB关联表
 */
interface BattleCampState {
  /** 阵营ID（campA 或 campB） */
  id: string;
  /** 阵营名称 */
  name: string;
  /** 阵营中的所有队伍 */
  teams: Map<string, BattleTeamState>;
  /** 阵营是否还有存活成员 */
  hasAliveMembers: boolean;
}

/**
 * 战斗快照接口
 * 记录战斗在某个时间点的完整状态
 */
interface BattleSnapshot {
  /** 快照时间戳 */
  timestamp: number;
  /** 所有阵营的状态 */
  camps: Map<string, BattleCampState>;
  /** 该时间点的事件 */
  events: BattleEvent[];
  /** 战斗状态信息 */
  battleStatus: {
    /** 战斗是否已结束 */
    isEnded: boolean;
    /** 胜利阵营 */
    winner?: "campA" | "campB";
    /** 结束原因 */
    reason?: string;
  };
}

// ============================== 主游戏引擎类 ==============================

/**
 * 简化游戏引擎类
 *
 * 设计理念：
 * 1. 基于数据库结构：直接使用数据库中的team、member、simulator等表结构
 * 2. 层级管理：阵营 -> 队伍 -> 成员的清晰层级关系
 * 3. 事件驱动：所有战斗逻辑通过事件触发和处理
 * 4. 性能优化：每60帧生成快照，避免过度计算
 * 5. 类型安全：充分利用TypeScript类型系统确保数据一致性
 */
export class GameEngine {
  // ==================== 核心数据结构 ====================

  /** 所有阵营的状态（campA, campB） */
  private camps: Map<string, BattleCampState> = new Map();

  /** 所有待处理的事件队列 */
  private events: BattleEvent[] = [];

  /** 当前模拟时间戳（帧数） */
  private currentTimestamp: number = 0;

  /** 最大模拟时间戳（120秒@60FPS） */
  private maxTimestamp: number = 7200;

  /** 引擎运行状态 */
  private isRunning: boolean = false;

  /** 战斗快照历史记录 */
  private snapshots: BattleSnapshot[] = [];

  /** 快照生成间隔（每60帧生成一次） */
  private snapshotInterval: number = 60;

  // ==================== 事件处理器 ====================

  /** 事件类型到处理器函数的映射 */
  private eventHandlers: Map<string, Array<(event: BattleEvent, engine: GameEngine) => void>> = new Map();

  // ==================== 性能统计 ====================

  /** 引擎运行统计信息 */
  private stats = {
    /** 总处理事件数 */
    totalEventsProcessed: 0,
    /** 总生成快照数 */
    totalSnapshotsGenerated: 0,
    /** 引擎启动时间 */
    startTime: 0,
    /** 引擎结束时间 */
    endTime: 0,
  };

    constructor() {
    this.initializeEventHandlers();
  }

  // ==================== 公共接口 ====================

  /**
   * 添加阵营到引擎
   *
   * @param campId 阵营ID（campA 或 campB）
   * @param campName 阵营名称
   */
  addCamp(campId: string, campName?: string): void {
    const campState: BattleCampState = {
      id: campId,
      name: campName || `Camp_${campId}`,
      teams: new Map(),
      hasAliveMembers: false,
    };

    this.camps.set(campId, campState);
    console.log(`🏰 添加阵营: ${campState.name}`);
  }

  /**
   * 添加队伍到指定阵营
   *
   * @param campId 阵营ID
   * @param teamData 队伍数据（基于数据库team表）
   * @param teamName 队伍名称（可选，会覆盖teamData中的name）
   */
  addTeam(campId: string, teamData: TeamWithRelations, teamName?: string): void {
    const camp = this.camps.get(campId);
    if (!camp) {
      console.warn(`阵营 ${campId} 不存在`);
      return;
    }

    const teamState: BattleTeamState = {
      ...teamData,
      name: teamName || teamData.name || `Team_${teamData.id}`,
      gems: teamData.gems || [],
      members: [],
      hasAliveMembers: false,
    };

    camp.teams.set(teamData.id, teamState);
    console.log(`👥 添加队伍: ${camp.name} -> ${teamState.name}`);
  }

  /**
   * 添加成员到指定队伍
   *
   * @param campId 阵营ID
   * @param teamId 队伍ID
   * @param memberData 成员数据（基于数据库member表）
   * @param initialState 战斗初始状态（生命值、魔法值、位置等）
   */
  addMember(
    campId: string,
    teamId: string,
    memberData: MemberWithRelations,
    initialState: {
      currentHp?: number;
      currentMp?: number;
      position?: { x: number; y: number };
    } = {},
  ): void {
    const camp = this.camps.get(campId);
    if (!camp) {
      console.warn(`阵营 ${campId} 不存在`);
      return;
    }

    const team = camp.teams.get(teamId);
    if (!team) {
      console.warn(`队伍 ${teamId} 不存在`);
      return;
    }

    // 创建成员实例
    const member = createMember(memberData, initialState);
    const stats = member.getStats();

    const memberState: BattleMemberState = {
      member,
      isAlive: true,
      isActive: true,
      currentHp: stats.currentHp,
      currentMp: stats.currentMp,
      position: stats.position,
    };

    team.members.push(memberState);
    team.hasAliveMembers = true;
    camp.hasAliveMembers = true;

    // 添加角色生成事件
    this.addEvent({
      id: `event_${Date.now()}_${Math.random()}`,
      type: "member_spawn",
      timestamp: this.currentTimestamp,
      sourceId: memberData.id,
      data: {
        position: memberState.position,
        campId,
        teamId,
        memberType: memberData.type,
      },
    });

    console.log(`👤 添加成员: ${camp.name} -> ${team.name} -> ${member.getName()} (${memberData.type})`);
  }



  /**
   * 获取所有成员（扁平化）
   *
   * @returns 所有成员的Map，key为成员ID
   */
  getAllMembers(): Map<string, BattleMemberState> {
    const allMembers = new Map<string, BattleMemberState>();

    for (const camp of this.camps.values()) {
      for (const team of camp.teams.values()) {
        for (const member of team.members) {
          allMembers.set(member.member.getId(), member);
        }
      }
    }

    return allMembers;
  }

  /**
   * 根据成员ID查找成员信息
   *
   * @param memberId 成员ID
   * @returns 包含成员、队伍、阵营信息的对象，如果未找到则返回null
   */
  findMember(memberId: string): { member: BattleMemberState; camp: BattleCampState; team: BattleTeamState } | null {
    for (const camp of this.camps.values()) {
      for (const team of camp.teams.values()) {
        const member = team.members.find((m) => m.member.getId() === memberId);
        if (member) {
          return { member, camp, team };
        }
      }
    }
    return null;
  }

  /**
   * 添加事件到引擎
   *
   * @param event 要添加的事件
   */
  addEvent(event: BattleEvent): void {
    this.events.push(event);
  }

  /**
   * 注册事件处理器
   *
   * @param eventType 事件类型
   * @param handler 处理器函数
   */
  on(eventType: BattleEventType, handler: (event: BattleEvent, engine: GameEngine) => void): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  /**
   * 启动引擎
   * 开始战斗模拟
   */
  start(): void {
    if (this.isRunning) {
      console.warn("引擎已在运行中");
      return;
    }

    this.isRunning = true;
    this.stats.startTime = Date.now();

    console.log("🚀 游戏引擎启动");
  }

  /**
   * 停止引擎
   * 结束战斗模拟
   */
  stop(): void {
    if (!this.isRunning) {
      console.warn("引擎未在运行");
      return;
    }

    this.isRunning = false;
    this.stats.endTime = Date.now();

    console.log("🛑 游戏引擎停止");
    this.printStats();
  }

  /**
   * 执行一步模拟
   * 推进一帧并处理当前时间戳的所有事件
   *
   * @returns 是否继续执行
   */
  step(): boolean {
    if (!this.isRunning) return false;

    // 检查终止条件
    if (this.shouldTerminate()) {
      this.addEvent({
        id: `event_${Date.now()}_${Math.random()}`,
        type: "battle_end",
        timestamp: this.currentTimestamp,
        data: { reason: "termination_condition_met" },
      });
      this.stop();
      return false;
    }

    // 处理当前时间戳的事件
    this.processEventsAtTimestamp();

    // 生成快照（每60帧）
    if (this.currentTimestamp % this.snapshotInterval === 0) {
      this.generateSnapshot();
    }

    // 推进时间戳
    this.currentTimestamp++;

    return true;
  }

  /**
   * 运行完整模拟
   * 从开始到结束执行所有事件
   *
   * @returns 所有生成的快照
   */
  async run(): Promise<BattleSnapshot[]> {
    this.start();

    while (this.isRunning) {
      if (!this.step()) break;

      // 让出控制权，避免阻塞主线程
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    return this.snapshots;
  }

  /**
   * 获取当前战斗快照
   *
   * @returns 当前时间点的战斗快照
   */
  getCurrentSnapshot(): BattleSnapshot {
    return {
      timestamp: this.currentTimestamp,
      camps: new Map(this.camps),
      events: [],
      battleStatus: {
        isEnded: !this.isRunning,
        winner: this.getWinner(),
        reason: this.isRunning ? undefined : "simulation_complete",
      },
    };
  }

  /**
   * 获取所有快照
   *
   * @returns 所有生成的快照数组
   */
  getSnapshots(): BattleSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * 获取性能统计
   *
   * @returns 引擎运行统计信息
   */
  getStats() {
    return {
      ...this.stats,
      duration: this.stats.endTime - this.stats.startTime,
      eventsPerSecond: this.stats.totalEventsProcessed / ((this.stats.endTime - this.stats.startTime) / 1000),
    };
  }

  // ==================== 私有方法 ====================

  /**
   * 初始化默认事件处理器
   * 设置各种事件类型的默认处理逻辑
   */
  private initializeEventHandlers(): void {
    // 角色生成事件处理器
    this.on("member_spawn", (event, engine) => {
      const memberInfo = this.findMember(event.sourceId!);
      if (memberInfo) {
        console.log(
          `👤 角色生成: ${memberInfo.member.member.getName()} (${event.data?.campId} -> ${event.data?.teamId}) - 类型: ${event.data?.memberType}`,
        );
      }
    });

    // 角色死亡事件处理器
    this.on("member_death", (event, engine) => {
      const memberInfo = this.findMember(event.sourceId!);
      if (memberInfo) {
        memberInfo.member.isAlive = false;
        memberInfo.member.isActive = false;

        // 更新队伍和阵营的存活状态
        this.updateAliveStatus(memberInfo.camp, memberInfo.team);

        console.log(`💀 角色死亡: ${memberInfo.member.member.getName()} (${memberInfo.camp.name} -> ${memberInfo.team.name})`);
      }
    });

    // 技能开始事件处理器
    this.on("skill_start", (event, engine) => {
      const memberInfo = this.findMember(event.sourceId!);
      if (memberInfo) {
        console.log(`🎯 技能开始: ${memberInfo.member.member.getName()} -> ${event.data?.skillId}`);
      }
    });

    // 技能效果事件处理器
    this.on("skill_effect", (event, engine) => {
      const sourceInfo = this.findMember(event.sourceId!);
      const targetInfo = this.findMember(event.targetId!);

      if (sourceInfo && targetInfo) {
        console.log(`✨ 技能效果: ${sourceInfo.member.member.getName()} -> ${targetInfo.member.member.getName()}`);

        // 处理伤害
        if (event.data?.damage) {
          targetInfo.member.currentHp = Math.max(0, targetInfo.member.currentHp - event.data.damage);
          console.log(`💥 造成伤害: ${event.data.damage}`);

          // 检查死亡
          if (targetInfo.member.currentHp <= 0) {
            this.addEvent({
              id: `event_${Date.now()}_${Math.random()}`,
              type: "member_death",
              timestamp: this.currentTimestamp + 1,
              sourceId: event.targetId,
            });
          }
        }
      }
    });

    // 战斗结束事件处理器
    this.on("battle_end", (event, engine) => {
      console.log(`🏁 战斗结束: ${event.data?.reason}`);
    });
  }

  /**
   * 更新队伍和阵营的存活状态
   *
   * @param camp 阵营
   * @param team 队伍
   */
  private updateAliveStatus(camp: BattleCampState, team: BattleTeamState): void {
    // 检查队伍是否还有存活成员
    team.hasAliveMembers = Array.from(team.members.values()).some((member) => member.isAlive);

    // 检查阵营是否还有存活成员
    camp.hasAliveMembers = Array.from(camp.teams.values()).some((team) => team.hasAliveMembers);
  }

  /**
   * 处理当前时间戳的事件
   * 过滤出当前时间戳的所有事件并依次处理
   */
  private processEventsAtTimestamp(): void {
    const currentEvents = this.events.filter((event) => event.timestamp === this.currentTimestamp);

    for (const event of currentEvents) {
      this.processEvent(event);
      this.stats.totalEventsProcessed++;
    }

    // 移除已处理的事件
    this.events = this.events.filter((event) => event.timestamp > this.currentTimestamp);
  }

  /**
   * 处理单个事件
   * 调用注册的事件处理器
   *
   * @param event 要处理的事件
   */
  private processEvent(event: BattleEvent): void {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event, this);
        } catch (error) {
          console.error(`事件处理器错误 [${event.type}]:`, error);
        }
      }
    }
  }

  /**
   * 生成战斗快照
   * 记录当前时间点的完整战斗状态
   */
  private generateSnapshot(): void {
    const snapshot: BattleSnapshot = {
      timestamp: this.currentTimestamp,
      camps: new Map(this.camps),
      events: [],
      battleStatus: {
        isEnded: !this.isRunning,
        winner: this.getWinner(),
        reason: this.isRunning ? undefined : "snapshot_generated",
      },
    };

    this.snapshots.push(snapshot);
    this.stats.totalSnapshotsGenerated++;

    console.log(`📸 生成快照: 第${this.currentTimestamp}帧`);
  }

  /**
   * 检查是否应该终止模拟
   *
   * @returns 是否应该终止
   */
  private shouldTerminate(): boolean {
    // 检查时间限制
    if (this.currentTimestamp >= this.maxTimestamp) {
      return true;
    }

    // 检查阵营存活情况
    const aliveMembers = Array.from(this.getAllMembers().values()).filter((m) => m.isAlive);
    if (aliveMembers.length <= 1) {
      return true;
    }

    return false;
  }

  /**
   * 获取胜利者
   * 根据阵营存活成员数量判断胜利者
   *
   * @returns 胜利阵营或undefined
   */
  private getWinner(): "campA" | "campB" | undefined {
    // 检查每个阵营的存活成员数量
    const campAliveCounts = new Map<string, number>();

    for (const camp of this.camps.values()) {
      let aliveCount = 0;
      for (const team of camp.teams.values()) {
        for (const member of team.members.values()) {
          if (member.isAlive) {
            aliveCount++;
          }
        }
      }
      campAliveCounts.set(camp.id, aliveCount);
    }

    // 如果只有一个阵营有存活成员，返回该阵营
    const aliveCamps = Array.from(campAliveCounts.entries()).filter(([_, count]) => count > 0);
    if (aliveCamps.length === 1) {
      return aliveCamps[0][0] as "campA" | "campB";
    }

    return undefined;
  }

  /**
   * 打印性能统计
   * 输出引擎运行的详细统计信息
   */
  private printStats(): void {
    const duration = this.stats.endTime - this.stats.startTime;
    console.log("📊 性能统计:");
    console.log(`   总事件数: ${this.stats.totalEventsProcessed}`);
    console.log(`   生成快照: ${this.stats.totalSnapshotsGenerated}`);
    console.log(`   运行时间: ${duration}ms`);
    console.log(`   事件/秒: ${(this.stats.totalEventsProcessed / (duration / 1000)).toFixed(2)}`);
  }
}

// ============================== 导出 ==============================

export default GameEngine;
