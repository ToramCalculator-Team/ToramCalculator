/**
 * 成员注册表 - 统一管理所有实体引用
 * 
 * 核心职责（根据架构文档）：
 * 1. 管理所有实体（Players/NPCs等）的引用
 * 2. 负责统一访问、创建、销毁等生命周期操作
 * 3. 包含对状态机（FSM）的引用
 * 
 * 设计理念：
 * - 简单直接：只管理引用，不处理业务逻辑
 * - 统一接口：所有实体类型使用相同的管理接口
 * - 状态机引用：每个成员都包含对其FSM的引用
 * - 生命周期管理：创建、销毁、访问
 */

import { Member } from "./Member";
import Mob from "./member/mob/Mob";
import { Player } from "./member/player/Player";
import type { MemberType } from "@db/schema/enums";
import type { MemberWithRelations } from "@db/repositories/member";

// ============================== 类型定义 ==============================

/**
 * 成员注册信息
 * 包含成员实例和其状态机引用
 */
export interface MemberRegistryEntry {
  /** 成员实例 */
  member: Member;
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
}

// ============================== 成员注册表类 ==============================

/**
 * 成员注册表类
 * 统一管理所有实体的引用和生命周期
 */
export class MemberRegistry {
  // ==================== 私有属性 ====================

  /** 所有成员的注册表 - 主存储 */
  private members: Map<string, MemberRegistryEntry> = new Map();

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
  createAndRegister(
    memberData: MemberWithRelations, 
    campId: string, 
    teamId: string,
    initialState: {
      position?: { x: number; y: number };
      currentHp?: number;
      currentMp?: number;
    } = {}
  ): Member | null {
    try {
      let member: Member;

      // 根据成员类型创建相应的实例
      switch (memberData.type) {
        case "Player":
          member = new Player(memberData, initialState);
          break;
        case "Mob":
          member = new Mob(memberData, initialState);
          break;
        // case "Mercenary":
        //   member = new Mercenary(memberData, initialState);
        //   break;
        // case "Partner":
        //   member = new Partner(memberData, initialState);
        //   break;
        default:
          console.error(`❌ 不支持的成员类型: ${memberData.type}`);
          return null;
      }

      // 注册成员
      const success = this.registerMember(member, campId, teamId);
      if (success) {
        console.log(`✅ 创建并注册成员成功: ${member.getName()} (${member.getType()})`);
        return member;
      } else {
        // 如果注册失败，清理创建的成员
        member.destroy();
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
  registerMember(member: Member, campId: string, teamId: string): boolean {
    try {
      const entry: MemberRegistryEntry = {
        member,
        id: member.getId(),
        type: member.getType(),
        name: member.getName(),
        campId,
        teamId,
        isActive: true,
      };

      this.members.set(entry.id, entry);
      console.log(`📝 注册成员: ${entry.name} (${entry.type}) -> ${campId}/${teamId}`);
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
      // 销毁成员实例
      entry.member.destroy();
      
      // 从注册表中移除
      this.members.delete(memberId);
      
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
  getMember(memberId: string): Member | null {
    const entry = this.members.get(memberId);
    return entry ? entry.member : null;
  }

  /**
   * 获取成员注册信息
   * 
   * @param memberId 成员ID
   * @returns 成员注册信息，如果不存在则返回null
   */
  getMemberEntry(memberId: string): MemberRegistryEntry | null {
    return this.members.get(memberId) || null;
  }

  /**
   * 获取所有成员
   * 
   * @returns 所有成员实例的数组
   */
  getAllMembers(): Member[] {
    return Array.from(this.members.values()).map(entry => entry.member);
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
  getMembersByType(type: MemberType): Member[] {
    return Array.from(this.members.values())
      .filter(entry => entry.type === type)
      .map(entry => entry.member);
  }

  /**
   * 按阵营获取成员
   * 
   * @param campId 阵营ID
   * @returns 指定阵营的成员数组
   */
  getMembersByCamp(campId: string): Member[] {
    return Array.from(this.members.values())
      .filter(entry => entry.campId === campId)
      .map(entry => entry.member);
  }

  /**
   * 按队伍获取成员
   * 
   * @param teamId 队伍ID
   * @returns 指定队伍的成员数组
   */
  getMembersByTeam(teamId: string): Member[] {
    return Array.from(this.members.values())
      .filter(entry => entry.teamId === teamId)
      .map(entry => entry.member);
  }

  /**
   * 获取活跃成员
   * 
   * @returns 活跃成员数组
   */
  getActiveMembers(): Member[] {
    return Array.from(this.members.values())
      .filter(entry => entry.isActive)
      .map(entry => entry.member);
  }

  /**
   * 更新成员状态
   * 
   * @param memberId 成员ID
   * @param updates 更新内容
   * @returns 更新是否成功
   */
  updateMember(memberId: string, updates: Partial<Pick<MemberRegistryEntry, 'campId' | 'teamId' | 'isActive'>>): boolean {
    const entry = this.members.get(memberId);
    if (!entry) {
      return false;
    }

    try {
      Object.assign(entry, updates);
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

    // 销毁所有成员实例
    for (const entry of this.members.values()) {
      try {
        entry.member.destroy();
      } catch (error) {
        console.warn(`⚠️ 销毁成员失败: ${entry.name}`, error);
      }
    }

    // 清空注册表
    this.members.clear();
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
}

// ============================== 导出 ==============================

export default MemberRegistry; 