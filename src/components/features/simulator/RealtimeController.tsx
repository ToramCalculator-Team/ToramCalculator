/**
 * 实时模拟控制器 - 简化版本
 *
 * 使用简化的控制器，只做3件事：
 * 1. 展示 - 管理UI状态
 * 2. 输入 - 处理用户操作
 * 3. 通信 - 与Worker交互
 */

import { createSignal, createMemo, createEffect } from "solid-js";
import { Controller } from "./controller/controller";
import {
  StatusBar,
  ControlPanel,
  MemberSelect,
  MemberStatus,
  SkillPanel,
  ActionPanel,
} from "./controller/components";
import { Portal } from "solid-js/web";
import { GameView } from "./core/render/Renderer";

export default function RealtimeController() {
  // 创建控制器实例（自动初始化）
  const controller = new Controller();
  
  // 创建响应式状态信号
  const [isReady, setIsReady] = createSignal(false);
  const [isRunning, setIsRunning] = createSignal(false);
  const [isPaused, setIsPaused] = createSignal(false);
  const [isInitialized, setIsInitialized] = createSignal(false);
  const [connectionStatus, setConnectionStatus] = createSignal(false);
  
  // 监听状态机变化并更新UI状态
  createEffect(() => {
    const checkStatus = () => {
      setIsReady(controller.isReady());
      setIsRunning(controller.isRunning());
      setIsPaused(controller.isPaused());
      setIsInitialized(controller.isInitialized());
      setConnectionStatus(controller.getConnectionStatus());
    };
    
    // 立即检查一次
    checkStatus();
    
    // 定期检查状态变化（因为Controller方法不是响应式的）
    const interval = setInterval(checkStatus, 100);
    
    return () => clearInterval(interval);
  });

  // ==================== UI 渲染 ====================
  return (
    <div class="grid h-full w-full auto-rows-min grid-cols-12 grid-rows-12 gap-4 overflow-y-auto p-4">
      {/* 状态栏 */}
      <StatusBar
        isReady={isReady}
        isRunning={isRunning}
        isPaused={isPaused}
        isInitialized={isInitialized}
        connectionStatus={connectionStatus}
        engineView={controller.engineView[0]}
        engineStats={controller.engineStats[0]}
      />

      {/* 可视区域，不能在这里放置组件影响场景可见性 */}
      <div class="col-span-12 row-span-7 flex flex-col items-center gap-2 portrait:row-span-6">
        <div class="flex h-full w-full flex-col overflow-hidden rounded"></div>
      </div>

      {/* 成员状态 */}
      <MemberStatus
        member={createMemo(() => {
          const memberId = controller.selectedMemberId[0]();
          const memberList = controller.members[0]();
          if (!memberId || !memberList) return null;
          const foundMember = memberList.find((m) => m.id === memberId);
          return foundMember || null;
        })}
      />

      {/* 技能面板 */}
      <SkillPanel
        selectedMember={createMemo(() => {
          const memberId = controller.selectedMemberId[0]();
          const memberList = controller.members[0]();
          if (!memberId || !memberList) return null;
          const foundMember = memberList.find((m) => m.id === memberId);
          return foundMember || null;
        })}
        selectedMemberSkills={controller.selectedMemberSkills[0]}
        onCastSkill={(skillId) => controller.castSkill(skillId)}
      />

      {/* 动作面板 */}
      <ActionPanel
        selectedEngineMember={createMemo(() => {
          const memberId = controller.selectedMemberId[0]();
          const memberList = controller.members[0]();
          if (!memberId || !memberList) return null;
          const foundMember = memberList.find((m) => m.id === memberId);
          return foundMember || null;
        })}
        members={controller.members[0]}
        onSelectTarget={(targetMemberId) => controller.selectTarget(targetMemberId)}
        onMove={(x, y) => controller.moveMember(x, y)}
        onStopAction={() => controller.stopMemberAction()}
      />

      {/* 控制栏 + 成员选择 */}
      <div class="col-span-12 row-span-1 flex flex-wrap items-center gap-x-8 gap-y-2 portrait:row-span-2">
        <ControlPanel 
          engineActor={controller.engineActor}
          onStart={() => controller.startSimulation()}
          onReset={() => controller.resetSimulation()}
          onPause={() => controller.pauseSimulation()}
          onResume={() => controller.resumeSimulation()}
          onStep={() => controller.stepSimulation()}
        />

        <MemberSelect
          members={controller.members[0]() || []}
          selectedId={controller.selectedMemberId[0]()}
          onSelect={(memberId) => controller.selectMember(memberId)}
        />
      </div>

      {/* 背景游戏视图显示 */}
      <Portal>
        <div class="fixed top-0 left-0 -z-1 h-dvh w-dvw">
          <GameView followEntityId={controller.selectedMemberId[0]() || undefined} />
        </div>
      </Portal>
    </div>
  );
}
