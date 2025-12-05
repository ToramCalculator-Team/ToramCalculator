/**
 * 重构后的控制器
 *
 * 核心理念：状态机驱动，控制器只做桥接
 * 1. 状态读取 - 直接从状态机获取
 * 2. 用户操作 - 直接发送到状态机
 * 3. 简化通信 - 统一通过状态机处理
 */

import { createSignal } from "solid-js";
import { selectMemberByIdWithRelations, type MemberWithRelations } from "@db/generated/repositories/member";
import { selectSimulatorByIdWithRelations, SimulatorWithRelations } from "@db/generated/repositories/simulator";
import { type MemberSerializeData } from "../core/Member/Member";
import { FrameSnapshot, ComputedSkillInfo } from "../core/GameEngine";
import { createActor, waitFor } from "xstate";
import { GameEngineSM, type EngineCommand } from "../core/GameEngineSM";
import { realtimeSimulatorPool } from "../core/thread/SimulatorPool";
import { IntentMessage } from "../core/MessageRouter/MessageRouter";

export class Controller {
  // ==================== 核心状态机 ====================

  // 唯一的状态源 - 引擎状态机
  public engineActor: ReturnType<typeof createActor<typeof GameEngineSM>>;

  // ==================== 数据状态 (非控制状态) ====================

  // 只保留真正的数据状态，移除所有控制状态
  members = createSignal<MemberSerializeData[]>([]);
  selectedMemberId = createSignal<string | null>(null);
  selectedMember = createSignal<MemberWithRelations | null>(null);
  /** 技能数据 - 包含预计算的 MP/HP 消耗等动态值 */
  selectedMemberSkills = createSignal<ComputedSkillInfo[]>([]);

  // 引擎数据快照
  engineView = createSignal<FrameSnapshot | null>(null);
  engineStats = createSignal<any | null>(null);

  // 连接状态（外部系统状态）
  isConnected = createSignal(false);

  // ==================== 构造函数 - 简化初始化 ====================

  constructor(simulatorData: SimulatorWithRelations) {
    // 使用 SimulatorPool 创建状态机
    this.engineActor = createActor(GameEngineSM, {
      input: {
        threadName: 'main',  // 标识主线程
        mirror: {
          send: (msg: EngineCommand) => {
            realtimeSimulatorPool.executeTask("engine_command", msg, "high")
              .then((result) => {
                console.log("Controller: mirror.send - 任务执行完成:", result);
              })
              .catch((error) => {
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

    // 自动初始化引擎
    this.initializeEngine(simulatorData);

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
        const snapshot = data.event as FrameSnapshot;
        this.engineView[1](snapshot);

        // 从快照中更新选中成员的技能数据（包含计算后的 MP/HP 消耗等）
        const selectedId = this.selectedMemberId[0]();
        if (selectedId && snapshot.selectedMemberId === selectedId) {
          this.selectedMemberSkills[1](snapshot.selectedMemberSkills);
        }
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
  }


  // 初始化引擎
  private async initializeEngine(simulatorData: SimulatorWithRelations) {
    // 2. 通过状态机进入ready状态（包含数据）
    this.engineActor.send({ 
      type: "INIT", 
      data: simulatorData,
      origin: "source"
    });

    // 3. 等待一下让状态机处理
    await waitFor(this.engineActor, (state) => state.matches("ready"), { timeout: 5000 });

    // 4. 预加载成员数据
    await this.refreshMembers();

    console.log("✅ 引擎初始化完成，当前状态:", this.engineActor.getSnapshot().value);
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
      const member = await selectMemberByIdWithRelations(memberId);
      if (!member) {
        this.selectedMember[1](null);
        this.selectedMemberSkills[1]([]);
        return;
      }
      this.selectedMember[1](member);

      // 初始化技能列表（静态数据，计算值会在 frame_snapshot 中更新）
      if (member.player?.characters?.[0]?.skills) {
        const skills: ComputedSkillInfo[] = member.player.characters[0].skills.map((skill) => ({
          id: skill.id,
          name: skill.template?.name || "未知技能",
          level: skill.lv,
          computed: {
            mpCost: 0,      // 初始值，会在 frame_snapshot 中更新
            hpCost: 0,
            castingRange: null,
            cooldownRemaining: 0,
            isAvailable: true,
          },
        }));
        this.selectedMemberSkills[1](skills);
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
