/**
 * 实时模拟控制器
 *
 * 职责：
 * - 收集用户输入，转发为意图事件
 * - 逻辑判断、权限控制、技能条件判定
 * - 通过SimulatorPool与Worker通信
 * - UI状态管理和用户交互
 */

import {
  createSignal,
  createEffect,
  createMemo,
  onCleanup,
  createResource,
  on,
} from "solid-js";
import { createActor } from "xstate";
import { realtimeSimulatorPool } from "./core/thread/SimulatorPool";
import { findSimulatorWithRelations } from "@db/repositories/simulator";
import { MemberSerializeData } from "./core/member/Member";
import MemberStatusPanel from "./core/member/MemberStatusPanel";
import { findMemberWithRelations, MemberWithRelations } from "@db/repositories/member";

// 导入控制器模块
import {
  // 状态机
  controllerMachine,
  handleEngineStateChange,
  handleEngineStatsFull,
  handleMemberStateUpdate,
  handleRenderCommand,
  // 模拟控制
  startSimulation as startSimulationLogic,
  stopSimulation as stopSimulationLogic,
  pauseSimulation as pauseSimulationLogic,
  resumeSimulation as resumeSimulationLogic,
  sendIntent as sendIntentLogic,
  checkWorkerReady,
  getMembers,
  getMemberState,
  // 成员管理
  castSkill as castSkillLogic,
  move as moveLogic,
  stopAction as stopActionLogic,
  createKeyboardInputManager,
  // UI组件
  StatusBar,
  ControlPanel,
  MemberSelect,
  MemberStatus,
  SkillPanel,
  ActionPanel,
  GameViewArea,
} from "./controller";

// ============================== 组件实现 ==============================

export default function RealtimeController() {
  // ==================== XState 状态机 ====================

  const actor = createActor(controllerMachine);
  const [state, setState] = createSignal(actor.getSnapshot());
  const [selectedEngineMemberFsm, setSelectedMemberFsm] = createSignal<string | null>(null);

  // 启动 actor 并订阅状态变化
  createEffect(() => {
    actor.subscribe((snapshot) => {
      setState(snapshot);
    });

    actor.start();

    // 清理函数
    onCleanup(() => {
      try {
        actor.stop();
      } catch {}
    });
  });

  // ==================== 数据资源 ====================

  // 获取真实的simulator数据
  const [simulator, { refetch: refetchSimulator }] = createResource(async () => {
    return findSimulatorWithRelations("defaultSimulatorId");
  });

  // ==================== 事件处理 ====================

  // 处理引擎状态变化事件
  const handleEngineStateChangeLocal = (data: any) => {
    const result = handleEngineStateChange(
      data,
      state().context.engineStats,
      state().context.members
    );
    
    if (result) {
      actor.send({
        type: "ENGINE_STATE_UPDATE",
        stats: result.stats,
        members: result.members,
      });
    }
  };

  // 接收低频全量 EngineStats
  const handleEngineStatsFullLocal = (data: any) => {
    const result = handleEngineStatsFull(data, state().context.members);
    
    if (result) {
      actor.send({
        type: "ENGINE_STATE_UPDATE",
        stats: result.stats,
        members: result.members,
      });
    }
  };

  // 处理选中成员 FSM 状态更新
  const handleMemberStateUpdateLocal = (data: any) => {
    const result = handleMemberStateUpdate(
      data,
      state().context.selectedEngineMemberId
    );
    
    if (result !== null) {
      setSelectedMemberFsm(result);
    }
  };

  // ==================== 生命周期管理 ====================

  createEffect(() => {
    // 订阅引擎状态变化事件
    console.log("🔗 RealtimeController: 订阅引擎状态变化事件");
    realtimeSimulatorPool.on("engine_state_update", handleEngineStateChangeLocal);
    realtimeSimulatorPool.on("member_state_update", handleMemberStateUpdateLocal);
    realtimeSimulatorPool.on("engine_stats_full", handleEngineStatsFullLocal);
    // 渲染指令透传
    realtimeSimulatorPool.on("render_cmd", handleRenderCommand);

    // 检查worker准备状态
    const checkWorkerReadyLocal = () => {
      try {
        const isReady = checkWorkerReady();
        if (isReady) {
          actor.send({ type: "WORKER_READY" });
        }
      } catch (error) {
        actor.send({ type: "WORKER_ERROR", error: error instanceof Error ? error.message : "Worker错误" });
      }
    };

    // 初始检查：仅在 actor 未进入终态时检查一次
    try {
      if (!actor.getSnapshot().status || actor.getSnapshot().status !== "done") {
        checkWorkerReadyLocal();
      }
    } catch {}

    // 添加worker状态监控
    // 定时检查：若已进入非初始状态（ready/starting/running/paused/stopping/error），避免再发送 WORKER_READY
    const workerStatusInterval = setInterval(() => {
      const snap = actor.getSnapshot();
      if (
        snap.matches &&
        (snap.matches("ready") ||
          snap.matches("starting") ||
          snap.matches("running") ||
          snap.matches("paused") ||
          snap.matches("stopping") ||
          snap.matches("error"))
      ) {
        return; // 不再触发 WORKER_READY
      }
      checkWorkerReadyLocal();
    }, 500);

    // 清理函数
    onCleanup(() => {
      realtimeSimulatorPool.off("engine_state_update", handleEngineStateChangeLocal);
      realtimeSimulatorPool.off("member_state_update", handleMemberStateUpdateLocal);
      realtimeSimulatorPool.off("engine_stats_full", handleEngineStatsFullLocal);
      realtimeSimulatorPool.off("render_cmd", handleRenderCommand);
      clearInterval(workerStatusInterval);
      // 清理选中成员订阅
      const selectedId = actor.getSnapshot().context.selectedEngineMemberId;
      if (selectedId) {
        realtimeSimulatorPool.unwatchMember(selectedId);
      }
      try {
        actor.stop();
      } catch {}
    });
  });

  // ==================== FPS 输入聚合（主线程） ====================
  // 说明：仅采集 WASD 方向，作为高层意图发送给 Worker，由 FSM 产出渲染命令
  createEffect(() => {
    const inputManager = createKeyboardInputManager();
    let rafId = 0 as number | undefined as any;

    const loop = () => {
      const memberId = context().selectedEngineMemberId;
      inputManager.processInput(memberId);
      rafId = requestAnimationFrame(loop) as any;
    };

    inputManager.startListening();
    rafId = requestAnimationFrame(loop) as any;

    onCleanup(() => {
      inputManager.stopListening();
      if (rafId) cancelAnimationFrame(rafId);
    });
  });

  // 当选中成员变化时，立即水合一次其 FSM 状态，保证"首帧有值"
  let lastSelectedId: string | null = null;
  createEffect(() => {
    const currentId = context().selectedEngineMemberId;
    if (!currentId || currentId === lastSelectedId) return;
    lastSelectedId = currentId;
    setSelectedMemberFsm(null);
    (async () => {
      try {
        const res = await getMemberState(currentId);
        // 只在当前仍为选中对象时应用结果，避免竞态
        if (actor.getSnapshot().context.selectedEngineMemberId === currentId && res.success) {
          setSelectedMemberFsm(res.value || null);
        }
      } catch {}
    })();
  });

  // ==================== 业务逻辑方法 ====================

  const startSimulation = async () => {
    try {
      actor.send({ type: "START_SIMULATION" });

      const simulatorData = simulator();
      if (!simulatorData) {
        throw new Error("无法获取模拟器数据");
      }

      const result = await startSimulationLogic(simulatorData);
      if (!result.success) {
        throw new Error(result.error || "启动模拟失败");
      }

      // 启动成功后，主动拉取一次成员数据用于下拉框
      try {
        const members = await getMembers();
        // 更新成员数据
        actor.send({
          type: "ENGINE_STATE_UPDATE",
          stats: state().context.engineStats,
          members,
        });
      } catch (e) {
        console.warn("获取成员失败（可稍后手动重试）", e);
      }
    } catch (error) {
      console.error("❌ 启动模拟失败:", error);
      actor.send({
        type: "WORKER_ERROR",
        error: error instanceof Error ? error.message : "启动失败",
      });
    }
  };

  const stopSimulation = async () => {
    try {
      actor.send({ type: "STOP_SIMULATION" });

      const result = await stopSimulationLogic();
      if (!result.success) {
        throw new Error(result.error || "停止模拟失败");
      }
    } catch (error) {
      console.error("❌ 停止模拟失败:", error);
      actor.send({
        type: "WORKER_ERROR",
        error: error instanceof Error ? error.message : "停止失败",
      });
    }
  };

  const pauseSimulation = async () => {
    try {
      const result = await pauseSimulationLogic();
      if (!result.success) {
        throw new Error(result.error || "暂停模拟失败");
      }

      // 成功后进入本地 paused 状态，保证按钮可用性正确
      actor.send({ type: "PAUSE_SIMULATION" });
    } catch (error) {
      console.error("❌ 暂停模拟失败:", error);
      actor.send({
        type: "WORKER_ERROR",
        error: error instanceof Error ? error.message : "暂停失败",
      });
    }
  };

  const resumeSimulation = async () => {
    try {
      const result = await resumeSimulationLogic();
      if (!result.success) {
        throw new Error(result.error || "恢复失败");
      }

      // 成功后进入本地 running 状态
      actor.send({ type: "RESUME_SIMULATION" });
    } catch (error) {
      console.error("❌ 恢复模拟失败:", error);
      actor.send({
        type: "WORKER_ERROR",
        error: error instanceof Error ? error.message : "恢复失败",
      });
    }
  };

  // 发送意图的本地包装函数
  const sendIntentLocal = async (intent: any) => {
    try {
      const result = await sendIntentLogic(intent);
      if (!result.success) {
        throw new Error(result.error || "发送意图失败");
      }
    } catch (error) {
      console.error("❌ 发送意图失败:", error);
      actor.send({
        type: "WORKER_ERROR",
        error: error instanceof Error ? error.message : "发送意图失败",
      });
    }
  };

  const selectMember = (memberId: string) => {
    setSelectedMemberFsm(null);
    actor.send({ type: "SELECT_MEMBER", memberId });
  };

  const clearError = () => {
    actor.send({
      type: "CLEAR_ERROR",
    });
  };

  // ==================== 计算属性 ====================

  const currentState = createMemo(() => state());
  const context = createMemo(() => currentState().context);

  const isRunning = createMemo(() => currentState().matches("running") || currentState().matches("paused"));

  const isPaused = createMemo(() => currentState().matches("paused"));
  const isError = createMemo(() => currentState().matches("error"));
  const isLoading = createMemo(
    () =>
      currentState().matches("initializing") ||
      currentState().matches("starting") ||
      currentState().matches("stopping"),
  );

  // 只有当 Worker 就绪 且 模拟器数据已就绪 才允许启动
  const canStart = createMemo(() => currentState().matches("ready") && !!simulator());

  const selectedEngineMember = createMemo(() => {
    const memberId = context().selectedEngineMemberId;
    if (!memberId) return null;

    const engineMember = context().members.find((member) => member.id === memberId);
    if (engineMember) {
      return engineMember;
    }
    return null;
  });

  const [selectedMember, setSelectedMember] = createSignal<MemberWithRelations | null>(null);

  createEffect(
    on(
      () => selectedEngineMember(),
      async () => {
        const memberId = selectedEngineMember()?.id;
        if (!memberId) return null;
        const member = await findMemberWithRelations(memberId);
        setSelectedMember(member);
      },
      {
        defer: true,
      },
    ),
  );

  // ==================== 技能和动作方法 ====================

  const castSkillLocal = (skillId: string) => {
    castSkillLogic(context().selectedEngineMemberId, skillId);
  };

  const moveLocal = (x: number, y: number) => {
    moveLogic(context().selectedEngineMemberId, x, y);
  };

  const stopActionLocal = () => {
    stopActionLogic(context().selectedEngineMemberId);
  };

  // ==================== UI 渲染 ====================

  return (
    <div class="grid h-full w-full auto-rows-min grid-cols-12 grid-rows-12 gap-4 overflow-y-auto p-4">
      {/* 状态栏 */}
      <StatusBar
        isLoading={isLoading()}
        isError={isError()}
        isRunning={isRunning()}
        isPaused={isPaused()}
        currentFrame={context().engineStats.currentFrame}
        averageFPS={context().engineStats.frameLoopStats.averageFPS}
        clockKind={context().engineStats.frameLoopStats.clockKind || "raf"}
        queueSize={context().engineStats.eventQueueStats.currentSize}
      />

      {/* 画面布局 */}
      <GameViewArea />

      {/* 成员状态 */}
      <MemberStatus member={selectedEngineMember()} />

      {/* 技能面板 */}
      <SkillPanel
        selectedMember={selectedMember()}
        onCastSkill={castSkillLocal}
      />

      {/* 动作面板 */}
      <ActionPanel
        selectedEngineMember={selectedEngineMember()}
        onMove={moveLocal}
        onStopAction={stopActionLocal}
      />

      {/* 控制栏 + 成员选择 */}
      <div class="col-span-12 row-span-1 flex flex-wrap items-center gap-x-8 gap-y-2 portrait:row-span-2">
        <ControlPanel
          canStart={canStart()}
          isLoading={isLoading()}
          isRunning={isRunning()}
          isPaused={isPaused()}
          onStart={startSimulation}
          onStop={stopSimulation}
          onPause={pauseSimulation}
          onResume={resumeSimulation}
          onClearError={clearError}
        />
        
        <MemberSelect
          members={context().members}
          selectedId={context().selectedEngineMemberId}
          onSelect={selectMember}
        />
      </div>
    </div>
  );
}
