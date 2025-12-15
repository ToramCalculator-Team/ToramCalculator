/**
 * UI组件模块
 *
 * 功能：
 * - 按功能区域组织的UI组件
 * - 状态栏、控制面板、成员面板等
 * - 可复用的UI组件
 */

import { Show, For, Switch, Match, type Accessor, type Setter, createEffect, createSignal } from "solid-js";
import { Button } from "~/components/controls/button";
import { Select } from "~/components/controls/select";
import { LoadingBar } from "~/components/controls/loadingBar";
import MemberStatusPanel from "../core/Member/MemberStatusPanel";
import type { MemberSerializeData } from "../core/Member/Member";
import type { FrameSnapshot, ComputedSkillInfo } from "../core/GameEngine";

// ============================== 状态栏组件 ==============================

interface StatusBarProps {
  isReady: Accessor<boolean>;
  isRunning: Accessor<boolean>;
  isPaused: Accessor<boolean>;
  isInitialized: Accessor<boolean>;
  connectionStatus: Accessor<boolean>;
  engineView: Accessor<FrameSnapshot | null>;
  engineStats: Accessor<any>;
}

/**
 * 状态栏组件 - 显示模拟器运行状态和关键指标
 */
export function StatusBar(props: StatusBarProps) {
  return (
    <div class="portrait:bg-area-color flex w-full items-center justify-between rounded p-4">
      <div class="flex w-full items-center gap-4 portrait:justify-between">
        <div class="flex items-center gap-2 portrait:hidden">
          <span class="text-sm font-medium">状态:</span>
          <div
            class={`h-2 w-2 rounded-full ${
              !props.connectionStatus()
                ? "bg-brand-color-2nd"
                : props.isRunning()
                  ? "bg-brand-color-3rd"
                  : props.isReady()
                    ? "bg-brand-color-4th"
                    : "bg-brand-color-1st"
            }`}
          ></div>
          <span class="text-sm">
            {!props.connectionStatus()
              ? "连接断开"
              : props.isRunning()
                ? props.isPaused()
                  ? "已暂停"
                  : "运行中"
                : props.isReady()
                  ? "就绪"
                  : props.isInitialized()
                    ? "已停止"
                    : "初始化中"}
          </span>
        </div>
        <Show when={props.isRunning() || props.isPaused()}>
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium">帧数</span>
            <span class="text-sm">{props.engineView()?.engine.frameNumber || 0}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium">运行时间</span>
            <span class="text-sm">{((props.engineView()?.engine.runTime ?? 0) / 1000).toFixed(1)}s</span>
          </div>
          <div class="flex items-center gap-2 portrait:hidden">
            <span class="text-sm font-medium">连接</span>
            <span class="text-sm">{props.connectionStatus() ? "正常" : "断开"}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium">成员</span>
            <span class="text-sm">{props.engineView()?.members.length || 0}</span>
          </div>
        </Show>
      </div>
    </div>
  );
}

// ============================== 控制面板组件 ==============================

interface ControlPanelProps {
  engineActor: any; // 状态机 Actor
  onStart: () => void;
  onReset: () => void;
  onPause: () => void;
  onResume: () => void;
  onStep: () => void;
}

/**
 * 控制面板组件 - 模拟器控制按钮
 */
export function ControlPanel(props: ControlPanelProps) {
  // 使用响应式信号来跟踪按钮状态
  const [canStart, setCanStart] = createSignal(false);
  const [canReset, setCanReset] = createSignal(false);
  const [canPause, setCanPause] = createSignal(false);
  const [canResume, setCanResume] = createSignal(false);
  const [canStep, setCanStep] = createSignal(false);

  // 监听状态机变化并更新按钮状态
  createEffect(() => {
    const snapshot = props.engineActor.getSnapshot();
    setCanStart(snapshot.can({ type: "START" }));
    setCanReset(snapshot.can({ type: "RESET" }));
    setCanPause(snapshot.can({ type: "PAUSE" }));
    setCanResume(snapshot.can({ type: "RESUME" }));
    setCanStep(snapshot.can({ type: "STEP" }));
  });

  // 订阅状态机变化
  createEffect(() => {
    const subscription = props.engineActor.subscribe(() => {
      const snapshot = props.engineActor.getSnapshot();
      setCanStart(snapshot.can({ type: "START" }));
      setCanReset(snapshot.can({ type: "RESET" }));
      setCanPause(snapshot.can({ type: "PAUSE" }));
      setCanResume(snapshot.can({ type: "RESUME" }));
      setCanStep(snapshot.can({ type: "STEP" }));
    });

    return () => subscription.unsubscribe();
  });

  return (
    <div class="ControlPanel flex w-full flex-1 gap-2">
      {/* 启动/暂停/恢复按钮 - 互斥 */}
      <Show when={!canPause() && !canResume()}>
        <Button onClick={props.onStart} disabled={!canStart()} class="w-full">
          启动模拟
        </Button>
      </Show>
      <Show when={canPause()}>
        <Button onClick={props.onPause} class="bg-brand-color-1st w-full">
          暂停
        </Button>
      </Show>
      <Show when={canResume()}>
        <Button onClick={props.onResume} class="w-full">
          恢复
        </Button>
      </Show>

      {/* 重置按钮 - 启动后才可用 */}
      <Button onClick={props.onReset} disabled={!canReset()} class="w-full">
        重置模拟
      </Button>

      {/* 单步按钮 - 仅在暂停状态下可用 */}
      <Button onClick={props.onStep} disabled={!canStep()} class="w-full">
        单步推进
      </Button>
    </div>
  );
}

// ============================== 成员管理组件 ==============================

interface MemberSelectProps {
  members: Accessor<MemberSerializeData[]>;
  selectedId: Accessor<string | null>;
  onSelect: (memberId: string) => void;
  placeholder?: string;
}

/**
 * 成员选择组件
 */
export function MemberSelect(props: MemberSelectProps) {
  return (
    <div class="MemberSelect flex w-full flex-1 items-center gap-2">
      <Show
        when={props.members().length > 0}
        fallback={
          <div class="bg-area-color flex h-12 w-full items-center justify-center rounded">
            <LoadingBar />
          </div>
        }
      >
        <Select
          value={props.selectedId() || ""}
          setValue={(v) => {
            if (!v && props.members().length > 0) return;
            props.onSelect(v);
          }}
          options={[
            ...props.members().map((member) => ({
              label: `${member.name || member.id} (${member.type || "unknown"})`,
              value: member.id,
            })),
          ]}
          placeholder={props.placeholder || "请选择成员"}
          optionPosition="top"
        />
      </Show>
    </div>
  );
}

interface MemberStatusProps {
  member: Accessor<MemberSerializeData | null>;
}

/**
 * 成员状态面板组件
 */
export function MemberStatus(props: MemberStatusProps) {
  return (
    <div class="flex w-full flex-col items-center gap-2">
      <MemberStatusPanel member={props.member} />
    </div>
  );
}

// ============================== 技能面板组件 ==============================

interface SkillPanelProps {
  selectedMember: Accessor<MemberSerializeData | null>;
  selectedMemberSkills: Accessor<ComputedSkillInfo[]>;
  onCastSkill: (skillId: string) => void;
}

/**
 * 技能面板组件
 */
export function SkillPanel(props: SkillPanelProps) {

  createEffect(() => {
    console.log("🎮 选中的成员:", props.selectedMember());
  });

  createEffect(() => {
    console.log("🎮 选中的成员技能:", props.selectedMemberSkills());
  });

  return (
    <div class="bg-area-color flex w-full flex-col rounded-lg p-3">
      <Show when={props.selectedMember()} fallback={<div class="text-sm text-brand-color-1st">暂无成员</div>}>
        <h3 class="mb-2 text-lg font-semibold">技能</h3>
        <div class="grid flex-1 grid-cols-4 grid-rows-1 gap-2 overflow-y-auto">
          <Switch fallback={<div class="text-sm text-gray-500">暂无技能</div>}>
            <Match when={props.selectedMember()?.type === "Player"}>
              {/* 玩家技能 - 使用传入的技能信号 */}
              <For each={props.selectedMemberSkills()}>
                {(skill) => (
                  <Button
                    onClick={() => props.onCastSkill(skill.id)}
                    disabled={!skill.computed.isAvailable}
                    class="col-span-1 row-span-1 flex-col items-start"
                    size="sm"
                  >
                    <span class="text-sm">{skill.name}</span>
                    <div class="flex w-full items-center justify-between text-xs text-gray-500">
                      <span>Lv.{skill.level}</span>
                      {/* 始终展示 MP 消耗，包括 0，方便调试动态消耗（如魔法炮） */}
                      <span class="text-blue-400">MP:{skill.computed.mpCost}</span>
                    </div>
                    <Show when={skill.computed.cooldownRemaining > 0}>
                      <span class="text-xs text-orange-400">CD:{skill.computed.cooldownRemaining}f</span>
                    </Show>
                  </Button>
                )}
              </For>
            </Match>
            <Match when={props.selectedMember()?.type === "Mob"}>
              {/* 怪物技能 */}
              <div class="col-span-4 text-sm text-gray-500">怪物技能系统待实现</div>
            </Match>
          </Switch>
        </div>
      </Show>
    </div>
  );
}

// ============================== 动作面板组件 ==============================

interface ActionPanelProps {
  selectedEngineMember: Accessor<MemberSerializeData | null>;
  members: Accessor<MemberSerializeData[]>;
  onSelectTarget: (targetMemberId: string) => void;
  onMove: (x: number, y: number) => void;
  onStopAction: () => void;
}

/**
 * 动作面板组件
 */
export function ActionPanel(props: ActionPanelProps) {
  return (
    <div class="bg-area-color w-full rounded-lg p-3">
      <Show when={props.selectedEngineMember()}>
        <h3 class="mb-2 text-lg font-semibold">动作</h3>
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-600">选择目标:</span>
            <MemberSelect
              members={props.members}
              selectedId={() => null} // 目标选择不需要保持状态
              onSelect={props.onSelectTarget}
              placeholder="选择目标成员"
            />
          </div>
          {/* <div class="flex gap-2">
            <Button onClick={() => props.onMove(100, 100)} class="">
              移动到 (100, 100)
            </Button>
            <Button onClick={props.onStopAction} class="">
              停止动作
            </Button>
          </div> */}
        </div>
      </Show>
    </div>
  );
}
