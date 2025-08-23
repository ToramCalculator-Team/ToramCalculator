/**
 * 实时模拟控制器 - 简化版本
 * 
 * 使用简化的控制器，只做3件事：
 * 1. 展示 - 管理UI状态
 * 2. 输入 - 处理用户操作  
 * 3. 通信 - 与Worker交互
 */

import { createEffect, createMemo } from "solid-js";
import { controller } from "./controller/controller";
import {
  StatusBar,
  ControlPanel,
  MemberSelect,
  MemberStatus,
  SkillPanel,
  ActionPanel,
  GameViewArea,
} from "./controller/components";

export default function RealtimeController() {
  // 初始化控制器
  createEffect(() => {
    console.log("初始化控制器");
    controller.initialize();
  });

  // ==================== UI 渲染 ====================
  return (
    <div class="grid h-full w-full auto-rows-min grid-cols-12 grid-rows-12 gap-4 overflow-y-auto p-4">
      {/* 状态栏 */}
      <StatusBar
        isLoading={controller.isLoading[0]}
        isError={controller.error[0]}
        isRunning={controller.isRunning[0]}
        isPaused={controller.isPaused[0]}
        currentFrame={createMemo(() => ({ currentFrame: controller.engineView[0]()?.frameNumber || 0 }))}
        averageFPS={createMemo(() => ({ frameLoopStats: { averageFPS: controller.engineView[0]()?.frameLoop?.averageFPS || 0 } }))}
        clockKind={createMemo(() => ({ frameLoopStats: { clockKind: controller.engineView[0]()?.frameLoop?.clockKind || "raf" } }))}
        queueSize={createMemo(() => ({ eventQueueStats: { currentSize: controller.engineView[0]()?.eventQueue?.currentSize || 0 } }))}
      />

      {/* 游戏视图区域 */}
      <GameViewArea />

      {/* 成员状态 */}
      <MemberStatus member={createMemo(() => {
        const memberId = controller.selectedMemberId[0]();
        const memberList = controller.members[0]();
        if (!memberId || !memberList) return null;
        const foundMember = memberList.find(m => m.id === memberId);
        return foundMember || null;
      })} />

      {/* 技能面板 */}
      <SkillPanel
        selectedMember={createMemo(() => {
          const memberId = controller.selectedMemberId[0]();
          const memberList = controller.members[0]();
          if (!memberId || !memberList) return null;
          const foundMember = memberList.find(m => m.id === memberId);
          return foundMember || null;
        })}
        onCastSkill={controller.castSkill.bind(controller)}
      />

      {/* 动作面板 */}
      <ActionPanel
        selectedEngineMember={createMemo(() => {
          const memberId = controller.selectedMemberId[0]();
          const memberList = controller.members[0]();
          if (!memberId || !memberList) return null;
          const foundMember = memberList.find(m => m.id === memberId);
          return foundMember || null;
        })}
        onMove={controller.moveMember.bind(controller)}
        onStopAction={controller.stopMemberAction.bind(controller)}
      />

      {/* 控制栏 + 成员选择 */}
      <div class="col-span-12 row-span-1 flex flex-wrap items-center gap-x-8 gap-y-2 portrait:row-span-2">
        <ControlPanel
          canStart={controller.canStart()}
          isLoading={controller.isLoading[0]()}
          isRunning={controller.isRunning[0]()}
          isPaused={controller.isPaused[0]()}
          onStart={controller.startSimulation.bind(controller)}
          onStop={controller.stopSimulation.bind(controller)}
          onPause={controller.pauseSimulation.bind(controller)}
          onResume={controller.resumeSimulation.bind(controller)}
          onClearError={controller.clearError.bind(controller)}
        />
        
        <MemberSelect
          members={controller.members[0]() || []}
          selectedId={controller.selectedMemberId[0]()}
          onSelect={controller.selectMember.bind(controller)}
        />
      </div>
    </div>
  );
}