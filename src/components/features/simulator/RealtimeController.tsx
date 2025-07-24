/**
 * 实时模拟控制器
 *
 * 职责：
 * - 收集用户输入，转发为意图事件
 * - 逻辑判断、权限控制、技能条件判定
 * - 通过SimulatorPool与Worker通信
 * - UI状态管理和用户交互
 */

import { createSignal, createEffect, createMemo, onCleanup, createResource, Show } from "solid-js";
import { realtimeSimulatorPool } from "./SimulatorPool";
import type { IntentMessage } from "./core/MessageRouter";
//
import type { SimulatorWithRelations } from "@db/repositories/simulator";
import { findSimulatorWithRelations } from "@db/repositories/simulator";
import { findCharacterWithRelations } from "@db/repositories/character";
import { findMobWithRelations } from "@db/repositories/mob";
import { Button } from "~/components/controls/button";
import { Select } from "~/components/controls/select";
import { MemberSerializeData } from "./core/Member";
import MemberStatusPanel from "./MemberStatusPanel";
import { LoadingBar } from "~/components/controls/loadingBar";

// ============================== 类型定义 ==============================

interface ControllerState {
  isRunning: boolean;
  isPaused: boolean;
  currentFrame: number;
  memberCount: number;
  selectedMemberId: string | null;
  isWorkerReady: boolean;
}

// ============================== 组件实现 ==============================

export default function RealtimeController() {
  // ==================== 状态管理 ====================

  const [state, setState] = createSignal<ControllerState>({
    isRunning: false,
    isPaused: false,
    currentFrame: 0,
    memberCount: 0,
    selectedMemberId: null,
    isWorkerReady: false,
  });

  const [members, setMembers] = createSignal<MemberSerializeData[]>([]);
  const [logs, setLogs] = createSignal<string[]>([]);

  // 获取真实的simulator数据
  const [simulator, { refetch: refetchSimulator }] = createResource(async () => {
    return findSimulatorWithRelations("defaultSimulatorId");
  });

  const [character, { refetch: refetchCharacter }] = createResource(async () => {
    return findCharacterWithRelations("defaultCharacterId");
  });
  const [mob, { refetch: refetchMob }] = createResource(async () => {
    return findMobWithRelations("defaultMobId");
  });

  // 事件驱动的状态更新
  const handleEngineStateChange = (data: { workerId: string; event: any }) => {
    const { event } = data;
    if (event.type === "engine_state_update") {
      updateEngineStateFromEvent(event);
    }
  };

  // 从事件数据直接更新引擎状态
  const updateEngineStateFromEvent = (event: any) => {
    try {
      if (event.engineState) {
        const engineState = event.engineState;
        const stats = engineState.stats;

        setState((prev) => ({
          ...prev,
          isRunning: stats.state === "running" || stats.state === "paused",
          isPaused: stats.state === "paused",
          currentFrame: stats.currentFrame,
          memberCount: stats.memberCount,
        }));

        // 更新成员数据
        if (engineState.members && Array.isArray(engineState.members)) {
          setMembers(engineState.members);
        }
      }
    } catch (error) {
      console.error("RealtimeController: 更新引擎状态失败:", error);
    }
  };

  createEffect(() => {
    // 主动触发worker初始化
    const triggerWorkerInit = () => {
      try {
        realtimeSimulatorPool.isReady();
      } catch (error) {
        console.error("RealtimeController: 触发worker初始化失败:", error);
      }
    };

    // 检查worker准备状态
    const checkWorkerReady = () => {
      const isReady = realtimeSimulatorPool.isReady();
      setState((prev) => ({ ...prev, isWorkerReady: isReady }));
    };

    // 订阅引擎状态变化事件
    realtimeSimulatorPool.on("engine_state_update", handleEngineStateChange);

    // 初始触发worker初始化
    triggerWorkerInit();

    // 初始检查
    checkWorkerReady();

    // 添加worker状态监控（轻量级轮询，只在初始化阶段）
    const workerStatusInterval = setInterval(() => {
      checkWorkerReady();

      // 一旦worker就绪，停止监控
      if (realtimeSimulatorPool.isReady()) {
        clearInterval(workerStatusInterval);
      }
    }, 500); // 每500ms检查一次worker状态

    // 设置最大等待时间，避免无限等待
    setTimeout(() => {
      clearInterval(workerStatusInterval);
      if (!realtimeSimulatorPool.isReady()) {
        console.warn("RealtimeController: Worker初始化超时");
      }
    }, 10000); // 10秒超时

    onCleanup(() => {
      // 取消事件订阅
      realtimeSimulatorPool.off("engine_state_update", handleEngineStateChange);
      // 清理定时器
      clearInterval(workerStatusInterval);
    });
  });

  // ==================== 操作方法 ====================

  /**
   * 启动模拟
   */
  const startSimulation = async () => {
    try {
      addLog("🚀 启动模拟...");

      // 等待simulator、角色和怪物数据加载完成
      const simulatorData = simulator();
      const characterData = character();
      const mobData = mob();

      if (!simulatorData) {
        addLog("⚠️ Simulator数据未加载完成，请稍后再试");
        return;
      }

      if (!characterData || !mobData) {
        addLog("⚠️ 角色或怪物数据未加载完成，请稍后再试");
        return;
      }

      addLog(`📋 使用Simulator: ${simulatorData.name}`);
      addLog(`📋 角色: ${characterData.name}`);
      addLog(`📋 怪物: ${mobData.name}`);

      // 使用真实的simulator数据
      const result = await realtimeSimulatorPool.startSimulation(simulatorData);

      if (result.success) {
        setState((prev) => ({ ...prev, isRunning: true, isPaused: false }));
        addLog("✅ 模拟启动成功");
        // 状态将通过事件驱动自动更新
      } else {
        addLog(`❌ 模拟启动失败: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ 启动错误: ${error}`);
    }
  };

  /**
   * 停止模拟
   */
  const stopSimulation = async () => {
    try {
      addLog("🛑 停止模拟...");

      const result = await realtimeSimulatorPool.stopSimulation();

      if (result.success) {
        setState((prev) => ({ ...prev, isRunning: false, isPaused: false }));
        addLog("✅ 模拟已停止");
      } else {
        addLog(`❌ 停止失败: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ 停止错误: ${error}`);
    }
  };

  /**
   * 暂停模拟
   */
  const pauseSimulation = async () => {
    try {
      addLog("⏸️ 暂停模拟...");

      const result = await realtimeSimulatorPool.pauseSimulation();

      if (result.success) {
        setState((prev) => ({ ...prev, isPaused: true }));
        addLog("✅ 模拟已暂停");
      } else {
        addLog(`❌ 暂停失败: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ 暂停错误: ${error}`);
    }
  };

  /**
   * 恢复模拟
   */
  const resumeSimulation = async () => {
    try {
      addLog("▶️ 恢复模拟...");

      const result = await realtimeSimulatorPool.resumeSimulation();

      if (result.success) {
        setState((prev) => ({ ...prev, isPaused: false }));
        addLog("✅ 模拟已恢复");
      } else {
        addLog(`❌ 恢复失败: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ 恢复错误: ${error}`);
    }
  };

  /**
   * 发送意图消息
   * 控制器逻辑：逻辑判断、权限控制、技能条件判定
   */
  const sendIntent = async (intent: Omit<IntentMessage, "id" | "timestamp">) => {
    // Worker准备状态检查
    if (!state().isWorkerReady) {
      addLog("⚠️ Worker未准备好，无法发送意图");
      return;
    }

    // 模拟状态检查
    if (!state().isRunning || state().isPaused) {
      addLog("⚠️ 模拟未运行或已暂停");
      return;
    }

    // 目标成员检查
    if (!intent.targetMemberId) {
      addLog("⚠️ 请先选择目标成员");
      return;
    }

    // 成员存在性检查
    const targetMember = members().find((m) => m.id === intent.targetMemberId);
    if (!targetMember) {
      addLog(`⚠️ 目标成员不存在: ${intent.targetMemberId}`);
      return;
    }

    // 成员状态检查
    if (!targetMember.isAlive) {
      addLog(`⚠️ 目标成员已死亡: ${targetMember.name}`);
      return;
    }

    if (!targetMember.isActive) {
      addLog(`⚠️ 目标成员不可操作: ${targetMember.name}`);
      return;
    }

    // 技能条件判定
    if (intent.type === "cast_skill") {
      const skillId = intent.data?.skillId;
      if (!skillId) {
        addLog("⚠️ 技能ID不能为空");
        return;
      }

      // 技能可用性检查（这里可以添加更复杂的逻辑）
      if (targetMember.currentMp < 50) {
        // 示例：魔法值检查
        addLog(`⚠️ 魔法值不足，无法释放技能: ${skillId}`);
        return;
      }

      // 技能冷却检查（这里可以添加更复杂的逻辑）
      // const skillCooldown = getSkillCooldown(targetMember.id, skillId);
      // if (skillCooldown > 0) {
      //   addLog(`⚠️ 技能冷却中: ${skillId} (${skillCooldown}s)`);
      //   return;
      // }
    }

    // 移动条件判定
    if (intent.type === "move") {
      const { x, y } = intent.data || {};
      if (typeof x !== "number" || typeof y !== "number") {
        addLog("⚠️ 移动坐标无效");
        return;
      }

      // 移动范围检查（这里可以添加更复杂的逻辑）
      const currentPosition = targetMember.position;
      const distance = Math.sqrt(Math.pow(x - currentPosition.x, 2) + Math.pow(y - currentPosition.y, 2));
      const maxMoveDistance = 1000; // 示例：最大移动距离

      if (distance > maxMoveDistance) {
        addLog(`⚠️ 移动距离超出限制: ${distance.toFixed(1)} > ${maxMoveDistance}`);
        return;
      }
    }

    // 发送意图消息
    try {
      const message: IntentMessage = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        ...intent,
      };

      console.log("RealtimeController: 准备发送意图消息:", message);
      addLog(`📤 发送意图: ${intent.type} -> ${targetMember.name}`);

      // 通过SimulatorPool发送意图消息
      const result = await realtimeSimulatorPool.sendIntent(message);

      if (result.success) {
        addLog(`✅ 意图发送成功: ${intent.type}`);
      } else {
        addLog(`❌ 意图发送失败: ${result.error}`);
      }
    } catch (error) {
      console.error("RealtimeController: 发送意图异常:", error);
      addLog(`❌ 发送意图失败: ${error}`);
    }
  };

  /**
   * 获取当前选中的成员ID，如果未选择则显示错误并返回null
   */
  const getSelectedMemberId = (): string | null => {
    const memberId = state().selectedMemberId;
    if (!memberId) {
      addLog("⚠️ 请先选择成员");
      return null;
    }
    return memberId;
  };

  /**
   * 释放技能
   */
  const castSkill = (skillId: string, targetId?: string) => {
    const memberId = getSelectedMemberId();
    if (!memberId) return;

    sendIntent({
      type: "cast_skill",
      targetMemberId: memberId,
      data: { skillId, targetId },
    });
  };

  /**
   * 移动
   */
  const move = (x: number, y: number) => {
    const memberId = getSelectedMemberId();
    if (!memberId) return;

    sendIntent({
      type: "move",
      targetMemberId: memberId,
      data: { x, y },
    });
  };

  /**
   * 停止动作
   */
  const stopAction = () => {
    const memberId = getSelectedMemberId();
    if (!memberId) return;

    sendIntent({
      type: "stop_action",
      targetMemberId: memberId,
      data: {},
    });
  };

  /**
   * 切换目标
   */
  const changeTarget = (targetId: string) => {
    const memberId = getSelectedMemberId();
    if (!memberId) return;

    sendIntent({
      type: "target_change",
      targetMemberId: memberId,
      data: { targetId },
    });
  };

  /**
   * 刷新数据
   */
  const refreshData = async () => {
    try {
      addLog("🔄 刷新数据...");
      await Promise.all([refetchSimulator(), refetchCharacter(), refetchMob()]);
      addLog("✅ 数据刷新完成");
    } catch (error) {
      addLog(`❌ 数据刷新失败: ${error}`);
    }
  };

  /**
   * 添加日志
   */
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 99)]);
  };

  /**
   * 选择成员
   */
  const selectMember = (memberId: string) => {
    setState((prev) => ({ ...prev, selectedMemberId: memberId }));
    addLog(`👤 选择成员: ${memberId}`);
  };

  // 从simulator数据中获取所有成员
  const getAllMembersFromSimulator = () => {
    const simulatorData = simulator();
    if (!simulatorData) return [];

    const allMembers: any[] = [];

    // 从campA获取成员
    simulatorData.campA?.forEach((team: any) => {
      team.members?.forEach((member: any) => {
        allMembers.push({
          ...member,
          camp: "campA",
          teamId: team.id,
          teamName: team.name,
        });
      });
    });

    // 从campB获取成员
    simulatorData.campB?.forEach((team: any) => {
      team.members?.forEach((member: any) => {
        allMembers.push({
          ...member,
          camp: "campB",
          teamId: team.id,
          teamName: team.name,
        });
      });
    });

    return allMembers;
  };

  // 获取当前选中的成员数据
  const selectedMember = createMemo(() => {
    const memberId = state().selectedMemberId;
    if (!memberId) return null;

    // 优先从引擎成员中查找（如果引擎已启动）
    const engineMember = members().find((member) => member.id === memberId);
    if (engineMember) {
      return engineMember;
    }

    // 从simulator数据中查找
    const simulatorMember = getAllMembersFromSimulator().find((member) => member.id === memberId);
    return simulatorMember || null;
  });

  // ==================== 渲染 ====================

  return (
    <div class="flex h-full gap-4">
      {/* 左侧：控制器区域 */}
      <div class="flex h-full flex-1 basis-3/4 flex-col gap-4">
        {/* 上半部分：状态显示区域 */}
        <div class="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          {/* 顶部：状态显示 */}
          <div class="flex items-center justify-between">
            <h2 class="text-main-text-color text-lg font-semibold">实时模拟控制器</h2>
            <div class="text-main-text-color flex items-center gap-3 text-sm">
              <div class="flex items-center gap-1">
                <div class={`h-2 w-2 rounded-full ${state().isWorkerReady ? "bg-green-500" : "bg-yellow-500"}`}></div>
                <span>{state().isWorkerReady ? "Worker就绪" : "Worker初始化中"}</span>
              </div>
              <span class="text-dividing-color">|</span>
              <div class="flex items-center gap-1">
                <div class={`h-2 w-2 rounded-full ${state().isRunning ? "bg-green-500" : "bg-red-500"}`}></div>
                <span>{state().isRunning ? "运行中" : "已停止"}</span>
              </div>
              <span class="text-dividing-color">|</span>
              <span>帧: {state().currentFrame}</span>
              <span class="text-dividing-color">|</span>
              <span>成员: {state().memberCount}</span>
              <span class="text-dividing-color">|</span>
              <div class="flex items-center gap-1">
                <div
                  class={`h-2 w-2 rounded-full ${simulator.loading ? "bg-yellow-500" : simulator.error ? "bg-red-500" : "bg-green-500"}`}
                ></div>
                <span>{simulator.loading ? "数据加载中" : simulator.error ? "数据加载失败" : "数据就绪"}</span>
              </div>
            </div>
          </div>

          {/* 成员选择 */}
          <div class="MemberSelector flex h-fit flex-col gap-2">
            {/* <div class="text-main-text-color mb-2 text-xs">可用成员: {getAllMembersFromSimulator().length} 个</div> */}
            <Show
              when={getAllMembersFromSimulator().length > 0}
              fallback={
                <div class="flex h-fit flex-col gap-2 p-3 rounded bg-area-color">
                  <h1 class="animate-pulse">正在加载成员数据...</h1>
                  <LoadingBar class="w-full" />
                </div>
              }
            >
              <Select
                value={state().selectedMemberId || ""}
                setValue={selectMember}
                options={[
                  { label: "请选择成员", value: "" },
                  ...getAllMembersFromSimulator().map((member) => ({
                    label: `${member.name || member.id} (${member.type}) [${member.camp}]`,
                    value: member.id,
                  })),
                ]}
                placeholder="请选择成员"
              />
            </Show>
          </div>
          {/* 成员状态面板 */}
          <MemberStatusPanel selectedMember={selectedMember()} />
        </div>

        {/* 下半部分：控制器区域 */}
        <div class="p-4">
          {/* 模拟控制按钮 */}
          <div class="mb-4 flex gap-2">
            <Button
              onClick={startSimulation}
              disabled={!state().isWorkerReady || state().isRunning || simulator.loading || simulator.error}
              level="primary"
              size="sm"
            >
              启动
            </Button>
            <Button
              onClick={stopSimulation}
              disabled={!state().isWorkerReady || !state().isRunning}
              level="secondary"
              size="sm"
            >
              停止
            </Button>
            <Button
              onClick={pauseSimulation}
              disabled={!state().isWorkerReady || !state().isRunning || state().isPaused}
              level="default"
              size="sm"
            >
              暂停
            </Button>
            <Button
              onClick={resumeSimulation}
              disabled={!state().isWorkerReady || !state().isRunning || !state().isPaused}
              level="default"
              size="sm"
            >
              恢复
            </Button>
            <Button onClick={refreshData} disabled={simulator.loading} level="default" size="sm">
              刷新数据
            </Button>
          </div>

          {/* 技能和操作按钮 - 类似手机游戏控制器 */}
          <div class="grid grid-cols-8 gap-2">
            <Button
              onClick={() => castSkill("skill_1")}
              disabled={!state().isWorkerReady || !state().selectedMemberId}
              level="primary"
              size="lg"
              class="aspect-square"
            >
              技能1
            </Button>
            <Button
              onClick={() => castSkill("skill_2")}
              disabled={!state().isWorkerReady || !state().selectedMemberId}
              level="primary"
              size="lg"
              class="aspect-square"
            >
              技能2
            </Button>
            <Button
              onClick={() => move(100, 100)}
              disabled={!state().isWorkerReady || !state().selectedMemberId}
              level="secondary"
              size="lg"
              class="aspect-square"
            >
              移动
            </Button>
            <Button
              onClick={stopAction}
              disabled={!state().isWorkerReady || !state().selectedMemberId}
              level="default"
              size="lg"
              class="aspect-square"
            >
              停止
            </Button>
          </div>
        </div>
      </div>
      <div class="divider bg-dividing-color h-full w-1"></div>
      {/* 右侧：日志显示 */}
      <div class="flex h-full flex-1 basis-1/4 overflow-y-auto rounded-lg p-3">
        <div class="text-main-text-color space-y-1 font-mono text-xs">
          {logs().map((log) => (
            <div class="border-dividing-color border-b py-1 last:border-b-0">{log}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
