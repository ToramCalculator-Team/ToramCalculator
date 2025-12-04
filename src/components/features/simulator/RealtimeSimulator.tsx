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
import { GameView } from "./render/Renderer";
import { SimulatorWithRelations } from "@db/generated/repositories/simulator";
import { MemberSerializeData } from "./core/member/Member";

export interface RealtimeSimulatorProps {
  simulatorData: SimulatorWithRelations;
}

export default function RealtimeSimulator(props: RealtimeSimulatorProps) {
  // 创建控制器实例（自动初始化）
  const controller = new Controller(props.simulatorData);

  // 创建响应式状态信号
  const [isReady, setIsReady] = createSignal(false);
  const [isRunning, setIsRunning] = createSignal(false);
  const [isPaused, setIsPaused] = createSignal(false);
  const [isInitialized, setIsInitialized] = createSignal(false);
  const [connectionStatus, setConnectionStatus] = createSignal(false);
  
  // 鼠标控制相关变量
  let canvasRef: HTMLElement | null = null;
  let isMouseControlEnabled = false;
  const mouseSensitivity = 0.002; // 鼠标灵敏度

  // 鼠标控制函数
  const enableMouseControl = (enable: boolean) => {
    isMouseControlEnabled = enable;
    if (enable) {
      console.log("🎮 FPS风格鼠标控制已启用");
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('pointerlockchange', handlePointerLockChange);
    } else {
      console.log("🎮 FPS风格鼠标控制已禁用");
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.exitPointerLock();
    }
  };

  // 处理鼠标移动
  const handleMouseMove = (event: MouseEvent) => {
    if (!isMouseControlEnabled || document.pointerLockElement !== canvasRef) return;

    const deltaX = event.movementX * mouseSensitivity;
    const deltaY = event.movementY * mouseSensitivity;

    // 发送相机旋转指令
    window.dispatchEvent(
      new CustomEvent("cameraControl", {
        detail: {
          type: "camera_control",
          subType: "setAngle",
          data: {
            horizontalAngle: deltaX, // 水平旋转（左右）
            verticalAngle: -deltaY,  // 垂直旋转（上下，注意反向）
            smooth: false,           // FPS风格需要立即响应
            delta: true,             // 增量模式：累加到当前角度
          },
        },
      }),
    );
  };

  // 处理pointer lock状态变化
  const handlePointerLockChange = () => {
    if (document.pointerLockElement === canvasRef) {
      console.log("🎮 鼠标已锁定，FPS控制激活");
    } else {
      console.log("🎮 鼠标锁定已取消");
      enableMouseControl(false);
    }
  };

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

    // ESC键退出鼠标控制
    hotkeys("escape", (event) => {
      event.preventDefault();
      if (isMouseControlEnabled) {
        enableMouseControl(false);
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
      hotkeys.unbind("escape");
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      // 清理鼠标控制
      enableMouseControl(false);
      for (let i = 1; i <= 9; i++) {
        hotkeys.unbind(`${i}`);
      }
    });
  });

  onMount(() => {
    console.log(`--RealtimeSimulator Page Mount`);
  });

  onCleanup(() => {
    console.log(`--RealtimeSimulator Page Unmount`);
  });

  // 启用鼠标控制
  const allowMouseControl = async () => {
    console.log("🎮 ViewArea 被点击了！");
    // 启用FPS风格的鼠标控制
    const selectedMember = controller.selectedMemberId[0]();
    console.log("🎮 选中的成员ID:", selectedMember);
    console.log("🎮 canvasRef:", canvasRef);
    if (selectedMember && canvasRef) {
      try {
        // 请求鼠标锁定
        await canvasRef.requestPointerLock();
        console.log("🎮 鼠标锁定已启用");
        
        // 发送相机跟随指令
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
        
        // 启用鼠标控制
        enableMouseControl(true);
        
      } catch (error) {
        console.error("🎮 鼠标锁定失败:", error);
      }
    } else {
      console.warn("🎮 无法启用鼠标控制:");
      console.warn("  - selectedMember:", selectedMember);
      console.warn("  - canvasRef:", canvasRef);
    }
  }

  // ==================== UI 渲染 ====================
  return (
    <div class="flex flex-col h-full w-full gap-4 overflow-y-auto p-4">
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
      <div class="ViewArea w-full h-full flex flex-col items-center gap-2">
        <div
          class="group relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded"
          ref={(el) => {
            // 保存canvas引用用于pointer lock
            canvasRef = el;
          }}
          onClick={allowMouseControl}
        >
        </div>
      </div>

      {/* 成员状态 */}
      <MemberStatus
        member={createMemo(() => {
          const memberId = controller.selectedMemberId[0]();
          if (!memberId) return null;

          // 1. 优先从引擎快照中读取（包含实时 attrs/buffs）
          const snapshot = controller.engineView[0]();
          if (snapshot && snapshot.selectedMemberId === memberId && snapshot.selectedMemberDetail) {
            const detail = snapshot.selectedMemberDetail;
            const memberBasic = snapshot.members.find((m) => m.id === memberId);

            // 回退到初始化成员列表以补齐类型等静态信息
            const memberList = controller.members[0]();
            const fallback = memberList?.find((mm) => mm.id === memberId) || null;

            return {
              attrs: detail.attrs ?? fallback?.attrs ?? {},
              id: memberId,
              type: (fallback?.type as any) ?? (memberBasic as any)?.type ?? "Player",
              name: fallback?.name ?? memberBasic?.name ?? "",
              campId: fallback?.campId ?? memberBasic?.campId ?? "",
              teamId: fallback?.teamId ?? memberBasic?.teamId ?? "",
              targetId: fallback?.targetId ?? (memberBasic?.targetId ?? ""),
              isAlive: memberBasic?.isAlive ?? fallback?.isAlive ?? true,
              position: memberBasic?.position ?? fallback?.position ?? { x: 0, y: 0, z: 0 },
              buffs: detail.buffs ?? fallback?.buffs,
            } satisfies MemberSerializeData;
          }

          // 2. 回退到初始化时拉取的静态成员数据（通常不含 Buff/实时属性）
          const memberList = controller.members[0]();
          if (!memberList) return null;
          const fallback = memberList.find((m) => m.id === memberId) || null;
          return fallback;
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
          onStart={() => {
            // allowMouseControl();
            controller.startSimulation()
          }}
          onReset={() => controller.resetSimulation()}
          onPause={() => controller.pauseSimulation()}
          onResume={() => controller.resumeSimulation()}
          onStep={() => controller.stepSimulation()}
        />

        <MemberSelect
          members={controller.members[0]}
          selectedId={controller.selectedMemberId[0]}
          onSelect={(memberId) => controller.selectMember(memberId)}
        />

        {/* 热键帮助提示 */}
        <div class="text-xs text-main-text-color hidden lg:landscape:block">
          <div class="flex flex-wrap gap-x-4 gap-y-1">
            <span>
              <kbd class="rounded bg-area-color px-1 text-main-text-color">Ctrl+R</kbd> 开始
            </span>
            <span>
              <kbd class="rounded bg-area-color px-1 text-main-text-color">Ctrl+P</kbd> 暂停
            </span>
            <span>
              <kbd class="rounded bg-area-color px-1 text-main-text-color">1-9</kbd> 选择成员
            </span>
            <span>
              <kbd class="rounded bg-area-color px-1 text-main-text-color">Q/E/R/T</kbd> 技能
            </span>
            <span>
              <kbd class="rounded bg-area-color px-1 text-main-text-color">Space</kbd> 停止
            </span>
          </div>
        </div>
      </div>

      {/* 背景游戏视图显示 */}
      <Portal>
        <div class="fixed top-0 left-0 -z-1 h-dvh w-dvw">
          {/* <GameView followEntityId={controller.selectedMemberId[0]() || undefined} /> */}
        </div>
      </Portal>
    </div>
  );
}
