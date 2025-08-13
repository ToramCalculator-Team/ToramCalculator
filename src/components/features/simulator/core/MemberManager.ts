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

import type { Actor } from "xstate";
import type { MemberType } from "@db/schema/enums";
import type { MemberWithRelations } from "@db/repositories/member";
import type GameEngine from "./GameEngine";
import { createPlayerActor, type PlayerAttrType } from "./member/player/PlayerActor";
import { ReactiveSystem, type NestedSchema } from "./member/ReactiveSystem";
import { applyPrebattleModifiers } from "./member/player/PrebattleModifiers";
import { PlayerAttrSchema } from "./member/player/PlayerData";
import { MobAttrSchema } from "./member/mob/MobData";
import { createMobActor, MobAttrType } from "./member/mob/MobActor";

// ============================== 类型定义 ==============================

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
  attrs: ReactiveSystem<any>;
}

// ============================== 成员管理器类 ==============================

/**
 * 成员管理器类
 * 统一管理所有成员的生命周期，是成员管理的最终执行层
 */
export class MemberManager {
  // ==================== 私有属性 ====================

  /** 所有成员的管理表 - 主存储（存储Actor与元数据） */
  private members: Map<string, MemberManagerEntry> = new Map();
  /** 阵营注册表（仅存基础信息） */
  private camps: Map<string, { id: string; name?: string }> = new Map();
  /** 队伍注册表（仅存基础信息） */
  private teams: Map<string, { id: string; campId: string; name?: string }> = new Map();
  /** 阵营 -> 成员ID集合 索引 */
  private membersByCamp: Map<string, Set<string>> = new Map();
  /** 队伍 -> 成员ID集合 索引 */
  private membersByTeam: Map<string, Set<string>> = new Map();

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
   * 创建阵营（幂等）
   */
  createCamp(campId: string, campName?: string): { id: string; name?: string } {
    if (!this.camps.has(campId)) {
      this.camps.set(campId, { id: campId, name: campName });
      this.membersByCamp.set(campId, this.membersByCamp.get(campId) || new Set());
    }
    return this.camps.get(campId)!;
  }

  /**
   * 创建并注册新成员
   *
   * @param memberData 成员数据库数据
   * @param campId 阵营ID
   * @param teamId 队伍ID
   * @param initialState 初始状态配置
   * @returns 创建的成员实例，失败则返回null
   */
  createAndRegister(
    memberData: MemberWithRelations,
    campId: string,
    teamId: string,
  ): Actor<any> | null {
    try {
      let actor: Actor<any>;
      let schema: NestedSchema | undefined;
      let rs: ReactiveSystem<any> | undefined;

      // 根据成员类型创建相应的实例，注入GameEngine依赖
      switch (memberData.type) {
        case "Player":
          schema = PlayerAttrSchema(memberData.player!.character);
          rs = new ReactiveSystem<PlayerAttrType>(memberData, schema);
          // 装备与被动技能的战前常驻修正注入（在 Actor 启动前）
          try {
            applyPrebattleModifiers(rs, memberData);
          } catch (e) {
            console.warn("预战修正应用失败", e);
          }
          actor = createPlayerActor({
            engine: this.engine,
            memberData,
            campId,
            reactiveDataManager: rs,
          });
          break;
        case "Mob":
          schema = MobAttrSchema(memberData.mob!);
          rs = new ReactiveSystem<MobAttrType>(memberData, schema);
          actor = createMobActor({
            engine: this.engine,
            memberData,
            campId,
            reactiveDataManager: rs,
          });
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

      // 启动并注册成员
      try {
        actor.start();
        const success = this.registerMember(actor, campId, teamId, memberData, schema!, rs!);
        if (success) {
          console.log(`✅ 创建并注册成员成功: ${memberData.name} (${memberData.type})`);
          return actor;
        } else {
          // 注册失败：不与 actor 交互，直接返回
          return null;
        }
      } catch (error) {
        console.error(`❌ Actor 启动失败: ${memberData.name}`, error);
        // 不直接 stop，避免非根 Actor 抛错
        return null;
      }
    } catch (error) {
      console.error("❌ 创建并注册成员失败:", error);
      return null;
    }
  }

  /**
   * 注册新成员
   *
   * @param member 成员实例
   * @param campId 阵营ID
   * @param teamId 队伍ID
   * @returns 注册是否成功
   */
  registerMember(
    actor: Actor<any>,
    campId: string,
    teamId: string,
    memberData: MemberWithRelations,
    schema: NestedSchema,
    attrs: ReactiveSystem<any>,
  ): boolean {
    try {
      const entry: MemberManagerEntry = {
        actor,
        id: memberData.id,
        type: memberData.type as MemberType,
        name: (memberData as any).name ?? memberData.id,
        campId,
        teamId,
        isActive: true,
        schema,
        attrs,
      };

      this.members.set(entry.id, entry);
      console.log(`📝 注册成员: ${entry.name} (${entry.type}) -> ${campId}/${teamId}`);

      // 维护阵营/队伍索引
      if (!this.membersByCamp.has(campId)) {
        this.membersByCamp.set(campId, new Set());
      }
      this.membersByCamp.get(campId)!.add(entry.id);

      if (!this.membersByTeam.has(teamId)) {
        this.membersByTeam.set(teamId, new Set());
      }
      this.membersByTeam.get(teamId)!.add(entry.id);
      return true;
    } catch (error) {
      console.error("❌ 注册成员失败:", error);
      return false;
    }
  }

  /**
   * 注销成员
   *
   * @param memberId 成员ID
   * @returns 注销是否成功
   */
  unregisterMember(memberId: string): boolean {
    const entry = this.members.get(memberId);
    if (!entry) {
      console.warn(`⚠️ 成员不存在: ${memberId}`);
      return false;
    }

    try {
      // 从注册表中移除
      this.members.delete(memberId);

      // 从索引中移除
      if (entry.campId && this.membersByCamp.has(entry.campId)) {
        this.membersByCamp.get(entry.campId)!.delete(memberId);
        if (this.membersByCamp.get(entry.campId)!.size === 0) {
          this.membersByCamp.delete(entry.campId);
        }
      }
      if (entry.teamId && this.membersByTeam.has(entry.teamId)) {
        this.membersByTeam.get(entry.teamId)!.delete(memberId);
        if (this.membersByTeam.get(entry.teamId)!.size === 0) {
          this.membersByTeam.delete(entry.teamId);
        }
      }

      console.log(`🗑️ 注销成员: ${entry.name} (${entry.type})`);
      return true;
    } catch (error) {
      console.error("❌ 注销成员失败:", error);
      return false;
    }
  }

  /**
   * 获取成员实例
   *
   * @param memberId 成员ID
   * @returns 成员实例，如果不存在则返回null
   */
  getMember(memberId: string): Actor<any> | null {
    const entry = this.members.get(memberId);
    return entry ? entry.actor : null;
  }

  /**
   * 获取成员注册信息
   *
   * @param memberId 成员ID
   * @returns 成员注册信息，如果不存在则返回null
   */
  getMemberEntry(memberId: string): MemberManagerEntry | null {
    return this.members.get(memberId) || null;
  }

  /**
   * 获取所有成员
   *
   * @returns 所有成员实例的数组
   */
  getAllMembers(): Actor<any>[] {
    return Array.from(this.members.values()).map((entry) => entry.actor);
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
  getMembersByType(type: MemberType): Actor<any>[] {
    return Array.from(this.members.values())
      .filter((entry) => entry.type === type)
      .map((entry) => entry.actor);
  }

  /**
   * 按阵营获取成员
   *
   * @param campId 阵营ID
   * @returns 指定阵营的成员数组
   */
  getMembersByCamp(campId: string): Actor<any>[] {
    const idSet = this.membersByCamp.get(campId);
    if (!idSet) return [];
    const result: Actor<any>[] = [];
    for (const id of idSet) {
      const entry = this.members.get(id);
      if (entry) result.push(entry.actor);
    }
    return result;
  }

  /**
   * 按队伍获取成员
   *
   * @param teamId 队伍ID
   * @returns 指定队伍的成员数组
   */
  getMembersByTeam(teamId: string): Actor<any>[] {
    const idSet = this.membersByTeam.get(teamId);
    if (!idSet) return [];
    const result: Actor<any>[] = [];
    for (const id of idSet) {
      const entry = this.members.get(id);
      if (entry) result.push(entry.actor);
    }
    return result;
  }

  /**
   * 获取活跃成员
   *
   * @returns 活跃成员数组
   */
  getActiveMembers(): Actor<any>[] {
    return Array.from(this.members.values())
      .filter((entry) => entry.isActive)
      .map((entry) => entry.actor);
  }

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
    const entry = this.members.get(memberId);
    if (!entry) {
      return false;
    }

    try {
      const prevCamp = entry.campId;
      const prevTeam = entry.teamId;

      Object.assign(entry, updates);

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

      console.log(`🔄 更新成员: ${entry.name} (${entry.type})`);
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

  /** 添加阵营（幂等） */
  addCamp(campId: string, campName?: string): void {
    if (!this.camps.has(campId)) {
      this.camps.set(campId, { id: campId, name: campName });
      this.membersByCamp.set(campId, this.membersByCamp.get(campId) || new Set());
    }
  }

  /** 添加队伍（幂等） */
  addTeam(campId: string, team: { id: string; name?: string }, teamName?: string): void {
    if (!this.camps.has(campId)) {
      // 若未注册阵营，先注册
      this.addCamp(campId);
    }
    const name = teamName ?? team.name;
    this.teams.set(team.id, { id: team.id, campId, name });
    this.membersByTeam.set(team.id, this.membersByTeam.get(team.id) || new Set());
  }

  /**
   * 发送事件到指定成员
   */
  sendTo(memberId: string, event: any): void {
    const entry = this.members.get(memberId);
    entry?.actor.send?.(event as any);
  }

  /** 查询阵营是否存在 */
  hasCamp(campId: string): boolean {
    return this.camps.has(campId);
  }
  /** 查询队伍是否存在 */
  hasTeam(teamId: string): boolean {
    return this.teams.has(teamId);
  }
}

// ============================== 导出 ==============================

export default MemberManager;
