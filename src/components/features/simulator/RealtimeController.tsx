/**
 * 实时模拟控制器 - 简化版本
 *
 * 使用简化的控制器，只做3件事：
 * 1. 展示 - 管理UI状态
 * 2. 输入 - 处理用户操作
 * 3. 通信 - 与Worker交互
 */

import { createSignal, createMemo, createEffect, onCleanup, onMount } from "solid-js";
import hotkeys from "hotkeys-js";
import { Controller } from "./controller/controller";
import { StatusBar, ControlPanel, MemberSelect, MemberStatus, SkillPanel, ActionPanel } from "./controller/components";
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

  // 设置热键
  onMount(() => {
    // 模拟器控制热键
    hotkeys("ctrl+r", (event) => {
      event.preventDefault();
      if (isReady()) {
        controller.startSimulation();
      }
    });

    hotkeys("ctrl+p", (event) => {
      event.preventDefault();
      if (isRunning()) {
        controller.pauseSimulation();
      } else if (isPaused()) {
        controller.resumeSimulation();
      }
    });

    hotkeys("ctrl+shift+r", (event) => {
      event.preventDefault();
      controller.resetSimulation();
    });

    hotkeys("ctrl+s", (event) => {
      event.preventDefault();
      if (isRunning()) {
        controller.stepSimulation();
      }
    });

    // 成员选择热键 (1-9)
    for (let i = 1; i <= 9; i++) {
      hotkeys(`${i}`, (event) => {
        const members = controller.members[0]();
        if (members && members[i - 1]) {
          controller.selectMember(members[i - 1].id);
          event.preventDefault();
        }
      });
    }

    // 技能释放热键 (Q, E, R, T)
    hotkeys("q", (event) => {
      const selectedMember = controller.selectedMemberId[0]();
      if (selectedMember) {
        controller.castSkill("skill_1"); // 假设技能ID
        event.preventDefault();
      }
    });

    hotkeys("e", (event) => {
      const selectedMember = controller.selectedMemberId[0]();
      if (selectedMember) {
        controller.castSkill("skill_2");
        event.preventDefault();
      }
    });

    hotkeys("r", (event) => {
      const selectedMember = controller.selectedMemberId[0]();
      if (selectedMember) {
        controller.castSkill("skill_3");
        event.preventDefault();
      }
    });

    hotkeys("t", (event) => {
      const selectedMember = controller.selectedMemberId[0]();
      if (selectedMember) {
        controller.castSkill("skill_4");
        event.preventDefault();
      }
    });

    // 停止动作热键
    hotkeys("space", (event) => {
      controller.stopMemberAction();
      event.preventDefault();
    });

    // WASD 角色移动控制（仅在第三人称模式下）
    let movementKeys = { w: false, a: false, s: false, d: false };

    const handleMovement = () => {
      const selectedMember = controller.selectedMemberId[0]();
      if (!selectedMember) return;

      let forward = 0,
        right = 0;
      if (movementKeys.w) forward += 1;
      if (movementKeys.s) forward -= 1;
      if (movementKeys.a) right -= 1;
      if (movementKeys.d) right += 1;

      if (forward !== 0 || right !== 0) {
        // 计算移动方向和速度
        const angle = Math.atan2(right, forward);
        const direction = {
          x: Math.sin(angle),
          z: Math.cos(angle),
        };
        const speed = Math.sqrt(forward * forward + right * right) * 3;

        controller.moveMember(direction.x * speed, direction.z * speed);
      } else {
        controller.stopMemberAction();
      }
    };

    // WASD 按键监听 - 使用标准的keydown/keyup事件监听器
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d"].includes(key)) {
        console.log(`${key} down`);
        switch (key) {
          case "w":
            movementKeys.w = true;
            break;
          case "a":
            movementKeys.a = true;
            break;
          case "s":
            movementKeys.s = true;
            break;
          case "d":
            movementKeys.d = true;
            break;
        }
        handleMovement();
        event.preventDefault();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d"].includes(key)) {
        console.log(`${key} up`);
        switch (key) {
          case "w":
            movementKeys.w = false;
            break;
          case "a":
            movementKeys.a = false;
            break;
          case "s":
            movementKeys.s = false;
            break;
          case "d":
            movementKeys.d = false;
            break;
        }
        handleMovement();
        event.preventDefault();
      }
    };

    // 添加键盘事件监听器
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    // 清理函数
    onCleanup(() => {
      hotkeys.unbind("ctrl+r");
      hotkeys.unbind("ctrl+p");
      hotkeys.unbind("ctrl+shift+r");
      hotkeys.unbind("ctrl+s");
      hotkeys.unbind("q");
      hotkeys.unbind("e");
      hotkeys.unbind("r");
      hotkeys.unbind("t");
      hotkeys.unbind("space");
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      for (let i = 1; i <= 9; i++) {
        hotkeys.unbind(`${i}`);
      }
    });
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

      {/* 可视区域 - 点击启用第三人称控制 */}
      <div class="col-span-12 row-span-7 flex flex-col items-center gap-2 portrait:row-span-6">
        <div
          class="group relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded"
          onClick={() => {
            // 发送相机跟随指令
            const selectedMember = controller.selectedMemberId[0]();
            if (selectedMember) {
              window.dispatchEvent(
                new CustomEvent("cameraControl", {
                  detail: {
                    cmd: {
                      type: "camera_control",
                      entityId: selectedMember,
                      subType: "follow",
                      data: {
                        followEntityId: selectedMember,
                        distance: 8,
                        verticalAngle: Math.PI / 6,
                      },
                      seq: Date.now(),
                      ts: Date.now(),
                    },
                  },
                }),
              );
            }
          }}
        >
          <GameView followEntityId={controller.selectedMemberId[0]() || undefined} />
        </div>
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
      <div class="col-span-12 row-span-1 flex items-center gap-x-4 gap-y-2 portrait:row-span-2 portrait:flex-col">
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

        {/* 热键帮助提示 */}
        <div class="text-xs text-gray-500 opacity-75 transition-opacity hover:opacity-100">
          <div class="flex flex-wrap gap-x-4 gap-y-1">
            <span>
              <kbd class="rounded bg-gray-200 px-1 text-gray-700">Ctrl+R</kbd> 开始
            </span>
            <span>
              <kbd class="rounded bg-gray-200 px-1 text-gray-700">Ctrl+P</kbd> 暂停
            </span>
            <span>
              <kbd class="rounded bg-gray-200 px-1 text-gray-700">1-9</kbd> 选择成员
            </span>
            <span>
              <kbd class="rounded bg-gray-200 px-1 text-gray-700">Q/E/R/T</kbd> 技能
            </span>
            <span>
              <kbd class="rounded bg-gray-200 px-1 text-gray-700">Space</kbd> 停止
            </span>
          </div>
        </div>
      </div>

      {/* 背景游戏视图显示 */}
      <Portal>
        <div class="fixed top-0 left-0 -z-1 h-dvh w-dvw"></div>
      </Portal>
    </div>
  );
}
