/**
 * 重构后的控制器
 *
 * 核心理念：状态机驱动，控制器只做桥接
 * 1. 状态读取 - 直接从状态机获取
 * 2. 用户操作 - 直接发送到状态机
 * 3. 简化通信 - 统一通过状态机处理
 */

import { createSignal } from "solid-js";
import { findMemberWithRelations, type MemberWithRelations } from "@db/repositories/member";
import { findSimulatorWithRelations } from "@db/repositories/simulator";
import { type MemberSerializeData } from "../core/member/Member";
import { FrameSnapshot } from "../core/GameEngine";
import { createActor, waitFor } from "xstate";
import { gameEngineSM, type EngineCommand } from "../core/GameEngineSM";
import { type WorkerMessageEvent } from "~/lib/WorkerPool/type";
import { type WorkerWrapper } from "~/lib/WorkerPool/WorkerPool";
import { realtimeSimulatorPool } from "../core/thread/SimulatorPool";
import { IntentMessage } from "../core/MessageRouter";

export class Controller {
  // ==================== 核心状态机 ====================

  // 唯一的状态源 - 引擎状态机
  public engineActor: ReturnType<typeof createActor<typeof gameEngineSM>>;

  // ==================== 数据状态 (非控制状态) ====================

  // 只保留真正的数据状态，移除所有控制状态
  members = createSignal<MemberSerializeData[]>([]);
  selectedMemberId = createSignal<string | null>(null);
  selectedMember = createSignal<MemberWithRelations | null>(null);
  selectedMemberSkills = createSignal<Array<{ id: string; name: string; level: number }>>([]);

  // 引擎数据快照
  engineView = createSignal<FrameSnapshot | null>(null);
  engineStats = createSignal<any | null>(null);

  // 连接状态（外部系统状态）
  isConnected = createSignal(false);

  // ==================== 构造函数 - 简化初始化 ====================

  constructor() {
    // 创建状态机，直接使用 SimulatorPool
    this.engineActor = createActor(gameEngineSM, {
      input: {
        mirror: {
          send: (msg: EngineCommand) => {
            realtimeSimulatorPool.executeTask("engine_command", msg, "high").catch((error) => {
              console.error("Controller: 发送引擎命令失败:", error);
            });
          },
        },
        engine: undefined,
        controller: undefined,
      },
    });

    // 启动状态机（内部会处理所有初始化）
    this.engineActor.start();

    // 设置数据同步
    this.setupDataSync();
  }

  // ==================== 输入处理 - 直接转发到状态机 ====================

  // 模拟控制 - 简化为纯状态机操作
  startSimulation() {
    this.engineActor.send({ type: "START" });
  }

  stopSimulation() {
    this.engineActor.send({ type: "STOP" });
  }

  pauseSimulation() {
    this.engineActor.send({ type: "PAUSE" });
  }

  resumeSimulation() {
    this.engineActor.send({ type: "RESUME" });
  }

  resetSimulation() {
    this.engineActor.send({ type: "RESET" });
  }

  stepSimulation() {
    this.engineActor.send({ type: "STEP" });
  }

  // 成员操作 - 保持原有逻辑
  async selectMember(memberId: string) {
    console.log(`🎯 Controller: 用户选择成员 ${memberId}`);
    
    // 更新控制器选中的成员ID
    this.selectedMemberId[1](memberId);
    
    // 通知引擎设置主控目标
    const intent: IntentMessage = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      type: "设置主控成员",
      targetMemberId: memberId,
      data: { memberId }
    };
    await realtimeSimulatorPool.sendIntent(intent);
    
    // 刷新选中成员的相关数据
    await this.refreshSelectedMember();
  }

  async selectTarget(targetMemberId: string) {
    const sourceMemberId = this.selectedMemberId[0]();
    if (!sourceMemberId) return;

    const intent: IntentMessage = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      type: "切换目标",
      targetMemberId: sourceMemberId,
      data: { targetId: targetMemberId }
    };
    await realtimeSimulatorPool.sendIntent(intent);
  }

  async castSkill(skillId: string) {
    const memberId = this.selectedMemberId[0]();
    if (!memberId) return;

    const intent: IntentMessage = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      type: "使用技能",
      targetMemberId: memberId,
      data: { skillId }
    };
    await realtimeSimulatorPool.sendIntent(intent);
  }

  async moveMember(x: number, y: number) {
    const memberId = this.selectedMemberId[0]();
    if (!memberId) return;

    const intent: IntentMessage = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      type: "移动",
      targetMemberId: memberId,
      data: { position: { x, y } }
    };
    await realtimeSimulatorPool.sendIntent(intent);
  }

  async stopMemberAction() {
    const memberId = this.selectedMemberId[0]();
    if (!memberId) return;

    const intent: IntentMessage = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      type: "停止移动",
      targetMemberId: memberId,
      data: {}
    };
    await realtimeSimulatorPool.sendIntent(intent);
  }

  // ==================== 数据同步设置 ====================

  private setupDataSync() {
    // 监听 SimulatorPool 分发的业务消息
    realtimeSimulatorPool.on("engine_state_machine", (data: { workerId: string; event: any }) => {
      // 转发状态机消息 - data.event 应该是 EngineCommand
      if (data.event && typeof data.event === "object" && "type" in data.event) {
        this.engineActor.send(data.event as EngineCommand);
      }
    });

    realtimeSimulatorPool.on("frame_snapshot", (data: { workerId: string; event: any }) => {
      // 更新引擎视图数据
      if (data.event && typeof data.event === "object" && "frameNumber" in data.event) {
        this.engineView[1](data.event as FrameSnapshot);
      }
    });

    realtimeSimulatorPool.on("system_event", (data: { workerId: string; event: any }) => {
      // 处理系统事件
      if (data.event && typeof data.event === "object") {
        // 处理主控目标变化事件
        if (data.event.type === "primary_target_changed") {
          console.log("🎯 Controller: 收到主控目标变化事件", data.event.data);
          this.handlePrimaryTargetChanged(data.event.data);
        } else {
          // 更新引擎统计数据（其他系统事件）
          this.engineStats[1](data.event);
        }
      }
    });

    realtimeSimulatorPool.on("render_cmd", (data: { workerId: string; event: any }) => {
      // 渲染命令由 UI 层处理，这里可以忽略或转发
      console.log("Controller: 收到渲染命令:", data.event);
    });

    // 自动初始化引擎
    this.autoInitializeEngine();
  }


  // 自动初始化引擎
  private async autoInitializeEngine() {
    try {
      // 1. 加载默认配置
      const simulatorData = await findSimulatorWithRelations("defaultSimulatorId");
      if (!simulatorData) {
        throw new Error("无法获取默认模拟器配置");
      }

      // 2. 通过状态机进入ready状态（包含数据）
      this.engineActor.send({ 
        type: "INIT", 
        data: {
          ...simulatorData,
          statistic: {
            ...simulatorData.statistic,
            usageTimestamps: simulatorData.statistic.usageTimestamps as unknown as Date[],
            viewTimestamps: simulatorData.statistic.viewTimestamps as unknown as Date[]
          }
        } as any,
        origin: "source"
      });

      // 3. 等待一下让状态机处理
      await waitFor(this.engineActor, (state) => state.matches("ready"), { timeout: 5000 });

      // 4. 预加载成员数据
      await this.refreshMembers();

      console.log("✅ 引擎初始化完成，当前状态:", this.engineActor.getSnapshot().value);
    } catch (error) {
      console.error("❌ 引擎初始化失败:", error);
    }
  }

  // ==================== 状态访问器 - 直接从状态机读取 ====================

  // 状态检查方法 - 直接查询状态机
  isInitialized(): boolean {
    return (
      this.engineActor.getSnapshot().matches("ready") ||
      this.engineActor.getSnapshot().matches("running") ||
      this.engineActor.getSnapshot().matches("paused") ||
      this.engineActor.getSnapshot().matches("stopped")
    );
  }

  isReady(): boolean {
    return this.engineActor.getSnapshot().matches("ready");
  }

  isRunning(): boolean {
    return this.engineActor.getSnapshot().matches("running");
  }

  isPaused(): boolean {
    return this.engineActor.getSnapshot().matches("paused");
  }

  canStart(): boolean {
    const ready = this.isReady();
    const running = this.isRunning();
    const canStart = ready && !running;

    // 调试信息
    console.log("🔍 canStart 检查:", {
      ready,
      running,
      canStart,
      currentState: this.engineActor.getSnapshot().value,
    });

    return canStart;
  }

  getConnectionStatus(): boolean {
    return realtimeSimulatorPool.isReady();
  }

  // ==================== 数据刷新方法 ====================

  /**
   * 处理主控目标变化事件
   * @param data 主控目标变化数据
   */
  private handlePrimaryTargetChanged(data: { memberId: string | null; oldMemberId: string | null; timestamp: number }) {
    console.log(`🎯 Controller: 主控目标变化 ${data.oldMemberId} -> ${data.memberId}`);
    
    // 更新控制器选中的成员ID
    this.selectedMemberId[1](data.memberId);
    
    // 刷新选中成员的相关数据
    this.refreshSelectedMember();
  }

  private async refreshMembers() {
    try {
      const result = await realtimeSimulatorPool.getMembers();

      if (Array.isArray(result)) {
        const validMembers = result.filter(
          (member) => member && typeof member === "object" && "id" in member && "type" in member && "name" in member,
        ) as MemberSerializeData[];

        this.members[1](validMembers);
      } else {
        console.warn("获取成员列表失败: 结果不是数组", result);
        this.members[1]([]);
      }
    } catch (error) {
      console.error("刷新成员列表失败:", error);
      this.members[1]([]);
    }
  }

  private async refreshSelectedMember() {
    const memberId = this.selectedMemberId[0]();
    if (!memberId) {
      this.selectedMember[1](null);
      this.selectedMemberSkills[1]([]);
      return;
    }

    try {
      const member = await findMemberWithRelations(memberId);
      this.selectedMember[1](member);

      if (member?.player?.character?.skills) {
        const skills = member.player.character.skills.map((skill) => ({
          id: skill.id,
          name: skill.template?.name || "未知技能",
          level: skill.lv,
        }));
        this.selectedMemberSkills[1](skills);
      } else {
        this.selectedMemberSkills[1]([]);
      }
    } catch (error) {
      console.error("刷新选中成员失败:", error);
      this.selectedMember[1](null);
      this.selectedMemberSkills[1]([]);
    }
  }

  // ==================== 清理 ====================

  destroy() {
    this.engineActor.stop();
  }
}
