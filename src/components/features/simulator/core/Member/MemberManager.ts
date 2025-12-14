/**
 * 成员管理器 - 统一管理所有成员的生命周期
 *
 * 核心职责（根据架构设计）：
 * 1. 成员创建：根据数据创建Player、Mob等具体成员实例
 * 2. 成员注册：管理所有成员的引用和索引
 * 3. 生命周期：负责成员的创建、销毁、查找等操作
 * 4. 引擎集成：通过Engine引用为成员提供服务访问
 *
 * 设计理念：
 * - 职责专一：专门负责成员管理，是最终执行层
 * - 依赖注入：接受GameEngine引用，传递给创建的成员
 * - 统一接口：所有成员类型使用相同的管理接口
 * - 类型安全：强类型检查和错误处理
 */

import type { Actor, AnyActorLogic, EventObject, ParameterizedObject } from "xstate";
import type { MemberType } from "@db/schema/enums";
import type { MemberWithRelations } from "@db/generated/repositories/member";
import type GameEngine from "../GameEngine";
import { StatContainer } from "./runtime/StatContainer/StatContainer";
import { PlayerAttrSchema } from "./types/Player/PlayerAttrSchema";
import { MobAttrSchema } from "./types/Mob/MobAttrSchema";
import { Team, TeamWithRelations } from "@db/generated/repositories/team";
import { Player } from "./types/Player/Player";
import { Member } from "./Member";
import { Mob } from "./types/Mob/Mob";
import { NestedSchema } from "./runtime/StatContainer/SchemaTypes";

// ============================== 类型定义 ==============================

export type AnyMemberEntry = Member<string, any, any, any, any>;

/**
 * 成员管理条目
 * 包含成员实例和相关管理信息
 */
export interface MemberManagerEntry {
  /** 成员Actor引用 */
  actor: Actor<any>;
  /** 成员ID */
  id: string;
  /** 成员类型 */
  type: MemberType;
  /** 成员名称 */
  name: string;
  /** 所属阵营ID */
  campId: string;
  /** 所属队伍ID */
  teamId: string;
  /** 是否活跃 */
  isActive: boolean;
  /** 属性Schema（用于编译表达式等） */
  schema: NestedSchema;
  /** 响应式系统实例（用于稳定导出属性） */
  attrs: StatContainer<any>;
}

// ============================== 成员管理器类 ==============================

/**
 * 成员管理器类
 * 统一管理所有成员的生命周期，是成员管理的最终执行层
 */
export class MemberManager {
  // ==================== 私有属性 ====================

  /** 所有成员的管理表 - 主存储（存储Actor与元数据） */
  private members: Map<string, AnyMemberEntry> = new Map();
  /** 阵营注册表（仅存基础信息） */
  private camps: Map<string, TeamWithRelations[]> = new Map();
  /** 队伍注册表（仅存基础信息） */
  private teams: Map<string, TeamWithRelations> = new Map();
  /** 阵营 -> 成员ID集合 索引 */
  private membersByCamp: Map<string, Set<string>> = new Map();
  /** 队伍 -> 成员ID集合 索引 */
  private membersByTeam: Map<string, Set<string>> = new Map();
  
  // ==================== 主控目标系统 ====================
  
  /** 当前主控目标ID - 用户操作的成员，相机跟随的目标 */
  private primaryTargetId: string | null = null;

  // ==================== 构造函数 ====================

  /**
   * 构造函数
   * @param engine 游戏引擎引用 - 依赖注入，用于传递给创建的成员
   */
  constructor(private readonly engine: GameEngine) {
    // console.log("MemberManager: 初始化完成，已注入GameEngine依赖");
  }

  // ==================== 公共接口 ====================
  /**
   * 创建并注册新成员
   *
   * @param memberData 成员数据库数据
   * @param campId 阵营ID
   * @param teamId 队伍ID
   * @param initialState 初始状态配置
   * @returns 创建的成员实例，失败则返回null
   */
  createAndRegister<T extends string>(
    memberData: MemberWithRelations,
    campId: string,
    teamId: string,
    position?: { x: number; y: number; z: number },
  ): Actor<AnyActorLogic> | null {
    switch (memberData.type) {
      case "Player":
        {
          const schema = PlayerAttrSchema(memberData.player!.characters?.[0]);
          const player = new Player(this.engine, memberData, campId, teamId, memberData.id, schema, {}, position);
          const success = this.registerMember(player, campId, teamId, memberData);
          if (success) {
            console.log(`✅ 创建并注册玩家成功: ${memberData.name} (${memberData.type})`);
            return player.actor;
          } else {
            // 注册失败：不与 actor 交互，直接返回
            return null;
          }
        }
        break;
      case "Mob":
        {
          const schema = MobAttrSchema(memberData.mob!);
          const mob = new Mob(this.engine, memberData, campId, teamId, memberData.id, schema, {}, position);
          const success = this.registerMember(mob, campId, teamId, memberData);
            if (success) {
              console.log(`✅ 创建并注册怪物成功: ${memberData.name} (${memberData.type})`);
              return mob.actor;
            } else {
              // 注册失败：不与 actor 交互，直接返回
              return null;
            }
        }
        break;
      // case "Mercenary":
      //   member = new Mercenary(memberData, this.engine, initialState);
      //   break;
      // case "Partner":
      //   member = new Partner(memberData, this.engine, initialState);
      //   break;
      default:
        console.error(`❌ 不支持的成员类型: ${memberData.type}`);
        return null;
    }
  }

  /**
   * 注册新成员，将actor包装进MemberManagerEntry中，并维护阵营/队伍索引
   *
   * @param member 成员实例
   * @param campId 阵营ID
   * @param teamId 队伍ID
   * @returns 注册是否成功
   */
  registerMember(
    member: AnyMemberEntry,
    campId: string,
    teamId: string,
    memberData: MemberWithRelations,
  ): boolean {
    this.members.set(memberData.id, member);
    // console.log(`📝 注册成员: ${memberData.name} (${memberData.type}) -> ${campId}/${teamId}`);

    // 维护阵营/队伍索引
    if (!this.membersByCamp.has(campId)) {
      this.membersByCamp.set(campId, new Set());
    }
    this.membersByCamp.get(campId)!.add(memberData.id);

    if (!this.membersByTeam.has(teamId)) {
      this.membersByTeam.set(teamId, new Set());
    }
    this.membersByTeam.get(teamId)!.add(memberData.id);

    // 自动选择主控目标（如果还没有设置的话）
    if (!this.primaryTargetId) {
      this.autoSelectPrimaryTarget();
    }

    return true;
  }

  /**
   * 注销成员
   *
   * @param memberId 成员ID
   * @returns 注销是否成功
   */
  unregisterMember(memberId: string): boolean {
    const member = this.members.get(memberId);
    if (!member) {
      console.warn(`⚠️ 成员不存在: ${memberId}`);
      return false;
    }

    this.members.delete(memberId);
    this.membersByCamp.forEach((value) => {
      value.delete(memberId);
    });
    this.membersByTeam.forEach((value) => {
      value.delete(memberId);
    });

    // 如果被删除的成员是当前主控目标，重新选择目标
    if (this.primaryTargetId === memberId) {
      console.log(`🎯 当前主控目标被删除，重新选择目标`);
      this.autoSelectPrimaryTarget();
    }

    return true;
  }

  /**
   * 获取成员实例
   *
   * @param memberId 成员ID
   * @returns 成员实例，如果不存在则返回null
   */
  getMember(memberId: string): AnyMemberEntry | null {
    return this.members.get(memberId) || null;
  }

  /**
   * 获取所有成员
   *
   * @returns 所有成员实例的数组
   */
  getAllMembers(): AnyMemberEntry[] {
    return Array.from(this.members.values());
  }

  /**
   * 获取所有成员ID
   *
   * @returns 所有成员ID的数组
   */
  getAllMemberIds(): string[] {
    return Array.from(this.members.keys());
  }

  /**
   * 按类型获取成员
   *
   * @param type 成员类型
   * @returns 指定类型的成员数组
   */
  getMembersByType(type: MemberType): AnyMemberEntry[] {
    return Array.from(this.members.values())
      .filter((member) => member.type === type)
      .map((member) => member);
  }

  /**
   * 按阵营获取成员
   *
   * @param campId 阵营ID
   * @returns 指定阵营的成员数组
   */
  getMembersByCamp(campId: string): AnyMemberEntry[] {
    const idSet = this.membersByCamp.get(campId);
    if (!idSet) return [];
    const result: AnyMemberEntry[] = [];
    for (const id of idSet) {
      const member = this.members.get(id);
      if (member) result.push(member);
    }
    return result;
  }

  /**
   * 按队伍获取成员
   *
   * @param teamId 队伍ID
   * @returns 指定队伍的成员数组
   */
  getMembersByTeam(teamId: string): AnyMemberEntry[] {
    const idSet = this.membersByTeam.get(teamId);
    if (!idSet) return [];
    const result: AnyMemberEntry[] = [];
    for (const id of idSet) {
      const member = this.members.get(id);
      if (member) result.push(member);
    }
    return result;
  }

  /**
   * 获取活跃成员
   *
   * @returns 活跃成员数组
   */
  // getActiveMembers(): Member<any>[] {
  //   return Array.from(this.members.values())
  //     .filter((member) => member.isActive)
  //     .map((member) => member.actor);
  // }

  /**
   * 更新成员状态
   *
   * @param memberId 成员ID
   * @param updates 更新内容
   * @returns 更新是否成功
   */
  updateMember(
    memberId: string,
    updates: Partial<Pick<MemberManagerEntry, "campId" | "teamId" | "isActive">>,
  ): boolean {
    const member = this.members.get(memberId);
    if (!member) {
      return false;
    }

    try {
      const prevCamp = member.campId;
      const prevTeam = member.teamId;

      Object.assign(member, updates);

      // 维护索引（阵营变更）
      if (updates.campId && updates.campId !== prevCamp) {
        if (prevCamp && this.membersByCamp.has(prevCamp)) {
          this.membersByCamp.get(prevCamp)!.delete(memberId);
          if (this.membersByCamp.get(prevCamp)!.size === 0) this.membersByCamp.delete(prevCamp);
        }
        if (!this.membersByCamp.has(updates.campId)) this.membersByCamp.set(updates.campId, new Set());
        this.membersByCamp.get(updates.campId)!.add(memberId);
      }

      // 维护索引（队伍变更）
      if (updates.teamId && updates.teamId !== prevTeam) {
        if (prevTeam && this.membersByTeam.has(prevTeam)) {
          this.membersByTeam.get(prevTeam)!.delete(memberId);
          if (this.membersByTeam.get(prevTeam)!.size === 0) this.membersByTeam.delete(prevTeam);
        }
        if (!this.membersByTeam.has(updates.teamId)) this.membersByTeam.set(updates.teamId, new Set());
        this.membersByTeam.get(updates.teamId)!.add(memberId);
      }

      console.log(`🔄 更新成员: ${member.name} (${member.type})`);
      return true;
    } catch (error) {
      console.error("❌ 更新成员失败:", error);
      return false;
    }
  }

  /**
   * 清空注册表
   * 移除所有成员并清理资源
   */
  clear(): void {
    console.log(`🗑️ 清空成员注册表，共 ${this.members.size} 个成员`);

    // 不与 actor 交互，直接清空索引与引用，避免停止阶段的竞态

    // 清空注册表
    this.members.clear();
    this.membersByCamp.clear();
    this.membersByTeam.clear();
    this.camps.clear();
    this.teams.clear();

    // 清空主控目标
    this.primaryTargetId = null;
  }

  /**
   * 获取注册表大小
   *
   * @returns 当前注册的成员数量
   */
  size(): number {
    return this.members.size;
  }

  /**
   * 检查是否为空
   *
   * @returns 注册表是否为空
   */
  isEmpty(): boolean {
    return this.members.size === 0;
  }

  /**
   * 检查成员是否存在
   *
   * @param memberId 成员ID
   * @returns 成员是否存在
   */
  hasMember(memberId: string): boolean {
    return this.members.has(memberId);
  }

  // ==================== 阵营/队伍管理 ====================

  /**
   * 创建阵营（幂等）
   */
  addCamp(campId: string): TeamWithRelations[] {
    if (!this.camps.has(campId)) {
      this.camps.set(campId, []);
      this.membersByCamp.set(campId, this.membersByCamp.get(campId) || new Set());
    }
    return this.camps.get(campId)!;
  }

  /** 添加队伍（幂等） */
  addTeam(
    campId: string,
    team: TeamWithRelations,
  ): TeamWithRelations {
    if (!this.camps.has(campId)) {
      // 若未注册阵营，先注册
      this.addCamp(campId);
    }
    this.teams.set(team.id, team);
    this.membersByTeam.set(team.id, this.membersByTeam.get(team.id) || new Set());
    return this.teams.get(team.id)!;
  }

  /**
   * 发送事件到指定成员
   */
  sendTo(memberId: string, event: any): void {
    const member = this.members.get(memberId);
    member?.actor.send?.(event);
  }

  /** 查询阵营是否存在 */
  hasCamp(campId: string): boolean {
    return this.camps.has(campId);
  }
  /** 查询队伍是否存在 */
  hasTeam(teamId: string): boolean {
    return this.teams.has(teamId);
  }

  // ==================== 主控目标管理 ====================
  
  /** 获取当前主控目标 */
  getPrimaryTarget(): string | null {
    return this.primaryTargetId;
  }
  
  /** 设置主控目标 */
  setPrimaryTarget(memberId: string | null): void {
    const oldTarget = this.primaryTargetId;
    
    // 验证目标成员是否存在
    if (memberId && !this.members.has(memberId)) {
      console.warn(`🎯 主控目标设置失败: 成员 ${memberId} 不存在`);
      return;
    }
    
    this.primaryTargetId = memberId;
    
    if (oldTarget !== memberId) {
      console.log(`🎯 主控目标切换: ${oldTarget} -> ${memberId}`);
      
      // 通知渲染层相机跟随新目标
      if (memberId) {
        this.engine.postRenderMessage({
          type: "render:cmd",
          cmd: {
            type: "camera_follow",
            entityId: memberId,
            distance: 8,
            verticalAngle: Math.PI / 6,
            seq: Date.now(),
            ts: Date.now(),
          },
        });
      }
      
      // 通知控制器主控目标变化
      this.engine.postSystemMessage({
        type: "primary_target_changed",
        data: {
          memberId: memberId,
          oldMemberId: oldTarget,
          timestamp: Date.now(),
        },
      });
    }
  }
  
  /** 自动选择主控目标：优先Player，其次第一个成员 */
  autoSelectPrimaryTarget(): void {
    const allMembers = Array.from(this.members.values());
    
    // 优先选择Player类型的成员
    const playerMember = allMembers.find(member => member.type === 'Player');
    if (playerMember) {
      this.setPrimaryTarget(playerMember.id);
      return;
    }
    
    // 如果没有Player，选择第一个成员
    const firstMember = allMembers[0];
    if (firstMember) {
      this.setPrimaryTarget(firstMember.id);
      return;
    }
    
    // 没有成员时清空目标
    this.setPrimaryTarget(null);
  }
  
  /** 获取主控目标的成员信息 */
  getPrimaryTargetMember(): AnyMemberEntry | null {
    if (!this.primaryTargetId) return null;
    return this.members.get(this.primaryTargetId) || null;
  }
}

// ============================== 导出 ==============================

export default MemberManager;
