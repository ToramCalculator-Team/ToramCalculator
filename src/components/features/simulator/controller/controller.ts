/**
 * 重构后的控制器
 *
 * 核心理念：状态机驱动，控制器只做桥接
 * 1. 状态读取 - 直接从状态机获取
 * 2. 用户操作 - 直接发送到状态机
 * 3. 简化通信 - 统一通过状态机处理
 */

import { createSignal, onCleanup } from "solid-js";
import { controllerInputCommunication } from "./communication";
import { findMemberWithRelations, type MemberWithRelations } from "@db/repositories/member";
import { findSimulatorWithRelations } from "@db/repositories/simulator";
import { type MemberSerializeData } from "../core/member/Member";
import { EngineView, FrameSnapshot } from "../core/GameEngine";
import { createActor } from "xstate";
import { gameEngineSM, type EngineCommand } from "../core/GameEngineSM";
import { type WorkerMessageEvent } from "../core/thread/messages";
import { type WorkerWrapper } from "../core/thread/WorkerPool";

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
    // 创建状态机，包含所有通信逻辑
    this.engineActor = createActor(gameEngineSM, {
      input: {
        mirror: {
          send: (msg: EngineCommand) => {
            controllerInputCommunication.sendEngineCommand(msg).catch((error) => {
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
    this.selectedMemberId[1](memberId);
    await this.refreshSelectedMember();
  }

  async selectTarget(targetMemberId: string) {
    const sourceMemberId = this.selectedMemberId[0]();
    if (!sourceMemberId) return;

    await controllerInputCommunication.selectTarget(sourceMemberId, targetMemberId);
  }

  async castSkill(skillId: string) {
    const memberId = this.selectedMemberId[0]();
    if (!memberId) return;

    await controllerInputCommunication.castSkill(memberId, skillId);
  }

  async moveMember(x: number, y: number) {
    const memberId = this.selectedMemberId[0]();
    if (!memberId) return;

    await controllerInputCommunication.moveMember(memberId, x, y);
  }

  async stopMemberAction() {
    const memberId = this.selectedMemberId[0]();
    if (!memberId) return;

    await controllerInputCommunication.stopMemberAction(memberId);
  }

  // ==================== 数据同步设置 ====================

  private setupDataSync() {
    // 设置来自Worker的消息监听
    controllerInputCommunication.on("worker-message", this.handleWorkerMessage.bind(this));

    // 自动初始化引擎
    this.autoInitializeEngine();
  }

  private handleWorkerMessage(message: { worker: WorkerWrapper; event: WorkerMessageEvent }) {
    // message 结构: { worker, event: { type, data, ... } }
    const event = message?.event;
    if (!event) {
      console.warn("Controller: 消息格式无效:", message);
      return;
    }

    const { type, data } = event;

    // 忽略没有type的消息（可能是任务完成消息）
    if (!type) {
      return;
    }

    // 忽略渲染相关的消息
    if (type.startsWith("render:") || type === "render_cmd") {
      return;
    }

    switch (type) {
      case "engine_state_machine":
        // 转发状态机消息 - data 应该是 EngineCommand
        if (data && typeof data === 'object' && 'type' in data) {
          this.engineActor.send(data as EngineCommand);
        }
        break;

      case "frame_snapshot":
        // 更新引擎视图数据 - data 应该是 FrameSnapshot
        if (data && typeof data === 'object' && 'frameNumber' in data) {
          this.engineView[1](data as FrameSnapshot);
        }
        break;

      case "system_event":
        // 更新引擎统计数据 - data 应该是 EngineStats
        this.engineStats[1](data);
        break;

      default:
        console.warn("Controller: 未知消息类型:", type);
    }
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
      this.engineActor.send({ type: "INIT", data: simulatorData });

      // 等待一下让状态机处理
      await new Promise((resolve) => setTimeout(resolve, 100));

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
    return controllerInputCommunication.isReady();
  }

  // ==================== 数据刷新方法 ====================

  private async refreshMembers() {
    try {
      const result = await controllerInputCommunication.getMembers();

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
