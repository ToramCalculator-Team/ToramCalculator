/**
 * 简化的控制器
 * 
 * 只做3件事：
 * 1. 展示 - 管理UI状态
 * 2. 输入 - 处理用户操作
 * 3. 通信 - 与Worker交互
 */

import { createSignal, createEffect, onCleanup } from "solid-js";
import { controllerCommunication } from "./communication";
import { findSimulatorWithRelations } from "@db/repositories/simulator";
import { findMemberWithRelations, type MemberWithRelations } from "@db/repositories/member";
import { type MemberSerializeData } from "../core/member/Member";
import { EngineView } from "../core/GameEngine";

export class Controller {
  // ==================== 状态管理 (展示) ====================
  
  // 基础状态 - 直接暴露信号
  isConnected = createSignal(false);
  isLoading = createSignal(false);
  error = createSignal<string | null>(null);
  
  // 模拟器状态
  isRunning = createSignal(false);
  isPaused = createSignal(false);
  
  // 成员数据
  members = createSignal<MemberSerializeData[]>([]);
  selectedMemberId = createSignal<string | null>(null);
  selectedMember = createSignal<MemberWithRelations | null>(null);
  
  // 技能数据 - 确保响应式更新
  selectedMemberSkills = createSignal<Array<{ id: string; name: string; level: number }>>([]);
  
  // 引擎数据 - 分别存储高频和低频数据
  engineView = createSignal<EngineView | null>(null);      // 高频KPI数据
  engineStats = createSignal<any | null>(null);    // 低频全量数据

  // ==================== 输入处理 ====================
  
  // 模拟控制
  async startSimulation() {
    try {
      this.setLoading(true);
      this.setError(null);
      
      const simulatorData = await findSimulatorWithRelations("defaultSimulatorId");
      if (!simulatorData) {
        throw new Error("无法获取模拟器数据");
      }
      
      const result = await controllerCommunication.startSimulation(simulatorData);
      if (!result.success) {
        throw new Error(result.error || "启动失败");
      }
      
      this.setRunning(true);
      await this.refreshMembers();
    } catch (error) {
      this.setError(error instanceof Error ? error.message : "启动失败");
    } finally {
      this.setLoading(false);
    }
  }

  async stopSimulation() {
    try {
      this.setLoading(true);
      
      const result = await controllerCommunication.stopSimulation();
      if (!result.success) {
        throw new Error(result.error || "停止失败");
      }
      
      this.setRunning(false);
      this.setPaused(false);
    } catch (error) {
      this.setError(error instanceof Error ? error.message : "停止失败");
    } finally {
      this.setLoading(false);
    }
  }

  async pauseSimulation() {
    try {
      this.setLoading(true);
      
      const result = await controllerCommunication.pauseSimulation();
      if (!result.success) {
        throw new Error(result.error || "暂停失败");
      }
      
      this.setPaused(true);
    } catch (error) {
      this.setError(error instanceof Error ? error.message : "暂停失败");
    } finally {
      this.setLoading(false);
    }
  }

  async resumeSimulation() {
    try {
      this.setLoading(true);
      
      const result = await controllerCommunication.resumeSimulation();
      if (!result.success) {
        throw new Error(result.error || "恢复失败");
      }
      
      this.setPaused(false);
    } catch (error) {
      this.setError(error instanceof Error ? error.message : "恢复失败");
    } finally {
      this.setLoading(false);
    }
  }

  // 成员操作
  async selectMember(memberId: string) {
    try {
      this.setError(null);
      
      const result = await controllerCommunication.selectMember(memberId);
      if (!result.success) {
        throw new Error("选择成员失败");
      }
      
      this.setSelectedMemberId(memberId);
      await this.refreshSelectedMember();
    } catch (error) {
      this.setError(error instanceof Error ? error.message : "选择成员失败");
    }
  }

  async castSkill(skillId: string) {
    const memberId = this.getSelectedMemberId();
    if (!memberId) return;
    
    try {
      const result = await controllerCommunication.castSkill(memberId, skillId);
      if (!result.success) {
        throw new Error(result.error || "释放技能失败");
      }
    } catch (error) {
      this.setError(error instanceof Error ? error.message : "释放技能失败");
    }
  }

  async moveMember(x: number, y: number) {
    const memberId = this.getSelectedMemberId();
    if (!memberId) return;
    
    try {
      const result = await controllerCommunication.moveMember(memberId, x, y);
      if (!result.success) {
        throw new Error(result.error || "移动失败");
      }
    } catch (error) {
      this.setError(error instanceof Error ? error.message : "移动失败");
    }
  }

  async stopMemberAction() {
    const memberId = this.getSelectedMemberId();
    if (!memberId) return;
    
    try {
      const result = await controllerCommunication.stopMemberAction(memberId);
      if (!result.success) {
        throw new Error(result.error || "停止动作失败");
      }
    } catch (error) {
      this.setError(error instanceof Error ? error.message : "停止动作失败");
    }
  }

  // 错误处理
  clearError() {
    this.setError(null);
  }

  // ==================== 通信管理 ====================
  
  // 初始化通信
  initialize() {
    // 检查连接状态
    this.checkConnection();
    
    // 监听Worker事件
    this.setupWorkerListeners();
    
    // 定期检查连接
    const interval = setInterval(() => {
      this.checkConnection();
    }, 1000);
    
    onCleanup(() => {
      clearInterval(interval);
    });
  }

  // 检查连接
  private checkConnection() {
    const connected = controllerCommunication.checkConnection();
    this.setConnected(connected);
    
    if (!connected && this.getRunning()) {
      this.setRunning(false);
      this.setPaused(false);
    }
  }

  // 设置Worker监听器
  private setupWorkerListeners() {
    // 帧快照更新 - 每帧包含完整的引擎和成员状态
    controllerCommunication.on("frame_snapshot", (data: any) => {
      // console.log("🔧 收到帧快照:", data);
      
      if (data.event) {
        const snapshot = data.event;
        
        // 更新引擎视图（包含FPS和帧数信息）
        if (snapshot.engine) {
          this.setEngineView({
            frameNumber: snapshot.engine.frameNumber,
            runTime: snapshot.engine.runTime,
            frameLoop: snapshot.engine.frameLoop,
            eventQueue: snapshot.engine.eventQueue,
          });
          
          // 同时更新引擎统计信息（用于显示FPS等）
          this.setEngineStats({
            frameNumber: snapshot.engine.frameNumber,
            runTime: snapshot.engine.runTime,
            frameLoop: snapshot.engine.frameLoop,
            eventQueue: snapshot.engine.eventQueue,
            memberCount: snapshot.engine.memberCount,
            activeMemberCount: snapshot.engine.activeMemberCount,
          });
        }
        
        // 更新成员数据（包含状态机状态和属性）
        if (snapshot.members && Array.isArray(snapshot.members)) {
          // 将帧快照中的成员数据转换为 MemberSerializeData 格式
          const members: MemberSerializeData[] = snapshot.members.map((member: any) => ({
            id: member.id,
            type: member.type as any,
            name: member.name,
            attrs: member.attrs,
            isAlive: member.isAlive,
            position: member.position,
            campId: member.campId,
            teamId: member.teamId,
            targetId: member.targetId,
            // 添加状态机状态信息
            state: member.state,
          }));
          
          this.setMembers(members);
        }
      }
    });
  }

  // 刷新数据
  private async refreshMembers() {
    try {
      const result = await controllerCommunication.getMembers();
      
      // 确保结果是 MemberSerializeData[] 类型
      if (Array.isArray(result)) {
        // 验证每个成员的数据结构
        const validMembers = result.filter(member => 
          member && 
          typeof member === 'object' && 
          'id' in member && 
          'type' in member && 
          'name' in member
        ) as MemberSerializeData[];
        
        this.setMembers(validMembers);
      } else {
        console.warn("获取成员列表失败: 结果不是数组", result);
        this.setMembers([]);
      }
    } catch (error) {
      console.warn("获取成员列表失败:", error);
      this.setMembers([]);
    }
  }

  private async refreshSelectedMember() {
    const memberId = this.getSelectedMemberId();
    if (!memberId) return;
    
    try {
      const member = await findMemberWithRelations(memberId);
      this.setSelectedMember(member);
    } catch (error) {
      console.warn("获取成员详情失败:", error);
    }
  }

  // ==================== 状态设置器 ====================
  
  private setConnected(value: boolean) {
    this.isConnected[1](value);
  }

  private setLoading(value: boolean) {
    this.isLoading[1](value);
  }

  private setError(value: string | null) {
    this.error[1](value);
  }

  private setRunning(value: boolean) {
    this.isRunning[1](value);
  }

  private setPaused(value: boolean) {
    this.isPaused[1](value);
  }

  private setMembers(value: MemberSerializeData[]) {
    this.members[1](value);
  }

  private setSelectedMemberId(value: string | null) {
    this.selectedMemberId[1](value);
  }

  private setSelectedMember(value: MemberWithRelations | null) {
    this.selectedMember[1](value);
    // 当选中成员变化时，同时更新技能数据
    this.updateSelectedMemberSkills(value);
  }

  private setEngineView(value: EngineView | null) {
    this.engineView[1](value);
  }

  private setEngineStats(value: any | null) {
    this.engineStats[1](value);
  }



  // 更新选中成员的技能数据
  private updateSelectedMemberSkills(member: MemberWithRelations | null) {
    if (!member) {
      this.selectedMemberSkills[1]([]);
      return;
    }

    // 从成员数据中提取技能信息
    const skills = this.extractSkillsFromMember(member);
    this.selectedMemberSkills[1](skills);
  }

  // 从成员数据中提取技能信息
  private extractSkillsFromMember(member: MemberWithRelations): Array<{ id: string; name: string; level: number }> {
    // 尝试从不同来源获取技能数据
    let skills: any[] = [];

    // 1. 从 player.character.skills 中获取（如果是玩家）
    if (member.player?.character?.skills && Array.isArray(member.player.character.skills)) {
      skills = member.player.character.skills;
    }
    // // 2. 从 mercenary.skills 中获取（如果是佣兵）
    // else if (member.mercenary?.skills && Array.isArray(member.mercenary.skills)) {
    //   skills = member.mercenary.skills;
    // }
    // // 3. 从 mob.skills 中获取（如果是怪物）
    // else if (member.mob?.skills && Array.isArray(member.mob.skills)) {
    //   skills = member.mob.skills;
    // }

    // 转换技能数据格式
    return skills.map(skill => ({
      id: skill.id || skill.skillId || String(Math.random()),
      name: skill.name || skill.skillName || skill.template?.name || "未知技能",
      level: skill.level || skill.lv || 1
    }));
  }

  // ==================== 状态获取器 ====================
  
  getConnected() { return this.isConnected[0](); }
  getLoading() { return this.isLoading[0](); }
  getError() { return this.error[0](); }
  getRunning() { return this.isRunning[0](); }
  getPaused() { return this.isPaused[0](); }
  getMembers() { return this.members[0](); }
  getSelectedMemberId() { return this.selectedMemberId[0](); }
  getSelectedMember() { return this.selectedMember[0](); }
  getSelectedMemberSkills() { return this.selectedMemberSkills[0](); }
  getEngineView() { return this.engineView[0](); }
  getEngineStats() { return this.engineStats[0](); }

  // ==================== 计算属性 ====================
  
  canStart() {
    return this.getConnected() && !this.getRunning();
  }

  canPause() {
    return this.getRunning() && !this.getPaused();
  }

  canResume() {
    return this.getRunning() && this.getPaused();
  }

  canStop() {
    return this.getRunning();
  }
}

// ============================== 导出单例 ==============================

export const controller = new Controller();

