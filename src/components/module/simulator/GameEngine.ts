/**
 * 基于引用的游戏引擎 V2 - 解决数据同步问题
 *
 * 核心设计理念：
 * 1. 所有状态数据都存储在Member子类中
 * 2. GameEngine只持有Member引用，不重复存储状态
 * 3. 快照直接从Member实例获取数据
 * 4. 事件系统统一使用Member的事件队列
 *
 * 解决的数据同步问题：
 * - 状态数据重复存储
 * - 事件系统不统一
 * - 快照数据不一致
 * - 实时控制状态同步
 */

import { createSignal } from "solid-js";
import type { TeamWithRelations } from "~/repositories/team";
import type { MemberWithRelations } from "~/repositories/member";
import type { SimulatorWithRelations } from "~/repositories/simulator";
import { Member, createMember } from "./Member";

// ============================== 核心数据类型定义 ==============================

/**
 * 战斗事件接口 - 统一使用Member的事件系统
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
 * 战斗中的成员状态接口 - 只持有Member引用，不重复存储状态
 */
interface BattleMemberState {
  /** 成员实例 - 所有状态数据都从这里获取 */
  member: Member;
  /** 成员ID - 用于快速查找 */
  id: string;
  /** 成员类型 - 用于快速判断 */
  type: MemberType;
  /** 当前状态数据 - 仅在快照中填充，从Member实例获取 */
  currentStats?: any;
  /** 当前状态机状态 - 仅在快照中填充，从Member实例获取 */
  currentState?: any;
  /** 是否存活 - 仅在快照中填充，从Member实例获取 */
  isAlive?: boolean;
  /** 是否活跃 - 仅在快照中填充，从Member实例获取 */
  isActive?: boolean;
}

/**
 * 战斗中的队伍状态接口 - 基于数据库team表，但成员状态从Member获取
 */
interface BattleTeamState {
  /** 队伍ID */
  id: string;
  /** 队伍名称 */
  name: string;
  /** 队伍中的所有成员 - 只存储Member引用 */
  members: BattleMemberState[];
  /** 宝石列表 */
  gems: string[];
}

/**
 * 战斗中的阵营状态接口
 */
interface BattleCampState {
  /** 阵营ID（campA 或 campB） */
  id: string;
  /** 阵营名称 */
  name: string;
  /** 阵营中的所有队伍 */
  teams: Map<string, BattleTeamState>;
}

/**
 * 战斗快照接口 - 直接从Member实例获取数据
 */
interface BattleSnapshot {
  /** 快照时间戳 */
  timestamp: number;
  /** 所有阵营的状态 - 从Member实例动态获取 */
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
 * 基于引用的游戏引擎类 V2
 *
 * 设计理念：
 * 1. 基于数据库结构：直接使用数据库中的team、member、simulator等表结构
 * 2. 引用而非复制：所有状态数据都从Member实例获取，避免重复存储
 * 3. 事件驱动：所有战斗逻辑通过Member的事件系统触发和处理
 * 4. 性能优化：每60帧生成快照，避免过度计算
 * 5. 类型安全：充分利用TypeScript类型系统确保数据一致性
 */
export class GameEngine {
  // ==================== 核心数据结构 ====================

  /** 所有阵营的状态（campA, campB） */
  private camps: Map<string, BattleCampState> = new Map();

  /** 所有待处理的事件队列 - 统一使用Member的事件系统 */
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
      id: teamData.id,
      name: teamName || teamData.name || `Team_${teamData.id}`,
      gems: teamData.gems || [],
      members: [],
    };

    camp.teams.set(teamData.id, teamState);
    console.log(`👥 添加队伍: ${camp.name} -> ${teamState.name}`);
  }

  /**
   * 添加成员到指定队伍 - 只存储Member引用，不重复存储状态
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

    // 创建成员实例 - 所有状态数据都在这里
    const member = createMember(memberData, initialState);

    // 只存储Member引用，不重复存储状态数据
    const memberState: BattleMemberState = {
      member,
      id: memberData.id,
      type: memberData.type as MemberType,
    };

    team.members.push(memberState);

    // 添加角色生成事件
    this.addEvent({
      id: `event_${Date.now()}_${Math.random()}`,
      type: "member_spawn",
      timestamp: this.currentTimestamp,
      sourceId: memberData.id,
      data: {
        position: member.getStats().position,
        campId,
        teamId,
        memberType: memberData.type,
      },
    });

    console.log(`👤 添加成员: ${camp.name} -> ${team.name} -> ${member.getName()} (${memberData.type})`);
  }

  /**
   * 获取所有成员（扁平化） - 返回Member引用
   *
   * @returns 所有成员的Map，key为成员ID
   */
  getAllMembers(): Map<string, BattleMemberState> {
    const allMembers = new Map<string, BattleMemberState>();

    for (const camp of this.camps.values()) {
      for (const team of camp.teams.values()) {
        for (const member of team.members) {
          allMembers.set(member.id, member);
        }
      }
    }

    return allMembers;
  }

  /**
   * 根据成员ID查找成员信息 - 返回Member引用
   *
   * @param memberId 成员ID
   * @returns 包含成员、队伍、阵营信息的对象，如果未找到则返回null
   */
  findMember(memberId: string): { member: BattleMemberState; camp: BattleCampState; team: BattleTeamState } | null {
    for (const camp of this.camps.values()) {
      for (const team of camp.teams.values()) {
        const member = team.members.find((m) => m.id === memberId);
        if (member) {
          return { member, camp, team };
        }
      }
    }
    return null;
  }

  /**
   * 添加事件到引擎 - 统一使用Member的事件系统
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

    console.log("🚀 游戏引擎 V2 启动");
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

    console.log("🛑 游戏引擎 V2 停止");
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

    // 更新所有成员的状态 - 使用Member的事件系统
    this.updateAllMembers();

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
   * 获取当前战斗快照 - 直接从Member实例获取数据
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
        // 通过Member实例处理死亡，不直接修改状态
        memberInfo.member.member.takeDamage(999999, "physical", "death");
        
        // 更新队伍和阵营的存活状态（动态计算）
        this.updateAliveStatus(memberInfo.camp, memberInfo.team);

        console.log(
          `💀 角色死亡: ${memberInfo.member.member.getName()} (${memberInfo.camp.name} -> ${memberInfo.team.name})`,
        );
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

        // 处理伤害 - 通过Member实例处理
        if (event.data?.damage) {
          targetInfo.member.member.takeDamage(event.data.damage, event.data.damageType || "physical", event.sourceId);
          console.log(`💥 造成伤害: ${event.data.damage}`);

          // 检查死亡 - 通过Member实例检查
          if (!targetInfo.member.member.isAlive()) {
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
   * 检查队伍是否有存活成员
   *
   * @param team 队伍
   * @returns 是否有存活成员
   */
  private hasAliveMembers(team: BattleTeamState): boolean {
    return team.members.some(member => member.member.isAlive());
  }

  /**
   * 检查阵营是否有存活成员
   *
   * @param camp 阵营
   * @returns 是否有存活成员
   */
  private hasAliveMembersInCamp(camp: BattleCampState): boolean {
    return Array.from(camp.teams.values()).some(team => this.hasAliveMembers(team));
  }

  /**
   * 更新队伍和阵营的存活状态 - 动态计算，不存储
   *
   * @param camp 阵营
   * @param team 队伍
   */
  private updateAliveStatus(camp: BattleCampState, team: BattleTeamState): void {
    // 存活状态通过方法动态计算，无需手动更新
    console.log(`📊 更新存活状态: ${camp.name} -> ${team.name} - 存活成员: ${this.hasAliveMembers(team)}`);
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
   * 更新所有成员的状态 - 使用Member的事件系统
   */
  private updateAllMembers(): void {
    const allMembers = this.getAllMembers();
    
    for (const memberState of allMembers.values()) {
      // 使用Member的事件系统更新状态
      memberState.member.update(this.currentTimestamp);
    }
  }

  /**
   * 生成战斗快照 - 直接从Member实例获取数据
   * 记录当前时间点的完整战斗状态
   */
  private generateSnapshot(): void {
    // 从Member实例获取详细的战斗数据
    const detailedCamps = new Map<string, BattleCampState>();
    
    for (const [campId, camp] of this.camps) {
      const detailedCamp: BattleCampState = {
        id: camp.id,
        name: camp.name,
        teams: new Map()
      };
      
      for (const [teamId, team] of camp.teams) {
        const detailedTeam: BattleTeamState = {
          id: team.id,
          name: team.name,
          members: team.members.map(memberState => ({
            ...memberState,
            // 从Member实例获取当前状态
            currentStats: memberState.member.getStats(),
            currentState: memberState.member.getCurrentState(),
            isAlive: memberState.member.isAlive(),
            isActive: memberState.member.isActive()
          })),
          gems: team.gems
        };
        
        detailedCamp.teams.set(teamId, detailedTeam);
      }
      
      detailedCamps.set(campId, detailedCamp);
    }

    const snapshot: BattleSnapshot = {
      timestamp: this.currentTimestamp,
      camps: detailedCamps,
      events: [],
      battleStatus: {
        isEnded: !this.isRunning,
        winner: this.getWinner(),
        reason: this.isRunning ? undefined : "snapshot_generated",
      },
    };

    this.snapshots.push(snapshot);
    this.stats.totalSnapshotsGenerated++;

    console.log(`📸 生成快照: 第${this.currentTimestamp}帧 - 存活成员: ${Array.from(this.getAllMembers().values()).filter(m => m.member.isAlive()).length}`);
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

    // 检查阵营存活情况 - 通过动态计算
    const aliveMembers = Array.from(this.getAllMembers().values()).filter((m) => m.member.isAlive());
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
    // 检查每个阵营的存活成员数量 - 通过动态计算
    const campAliveCounts = new Map<string, number>();

    for (const camp of this.camps.values()) {
      let aliveCount = 0;
      for (const team of camp.teams.values()) {
        for (const member of team.members) {
          if (member.member.isAlive()) {
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