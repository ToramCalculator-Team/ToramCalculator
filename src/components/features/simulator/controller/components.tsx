/**
 * UI组件模块
 * 
 * 功能：
 * - 按功能区域组织的UI组件
 * - 状态栏、控制面板、成员面板等
 * - 可复用的UI组件
 */

import { Show, For, Switch, Match } from "solid-js";
import { Button } from "~/components/controls/button";
import { Select } from "~/components/controls/select";
import { LoadingBar } from "~/components/controls/loadingBar";
import MemberStatusPanel from "../core/member/MemberStatusPanel";
import type { MemberSerializeData } from "../core/member/Member";
import type { PlayerWithRelations } from "@db/repositories/player";
import type { MemberWithRelations } from "@db/repositories/member";

// ============================== 状态栏组件 ==============================

interface StatusBarProps {
  isLoading: boolean;
  isError: boolean;
  isRunning: boolean;
  isPaused: boolean;
  currentFrame: number;
  averageFPS: number;
  clockKind: string;
  queueSize: number;
}

/**
 * 状态栏组件 - 显示模拟器运行状态和关键指标
 */
export function StatusBar(props: StatusBarProps) {
  return (
    <div class="col-span-12 flex h-[1fr] items-center justify-between rounded-lg p-4">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium">状态:</span>
          <div
            class={`h-2 w-2 rounded-full ${
              props.isLoading
                ? "bg-brand-color-1st"
                : props.isError
                  ? "bg-brand-color-2nd"
                  : props.isRunning
                    ? "bg-brand-color-3rd"
                    : "bg-brand-color-4th"
            }`}
          ></div>
          <span class="text-sm">
            {props.isLoading
              ? "加载中..."
              : props.isError
                ? "错误"
                : props.isRunning
                  ? props.isPaused
                    ? "已暂停"
                    : "运行中"
                  : "就绪"}
          </span>
        </div>
        <Show when={props.isRunning}>
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium">帧数</span>
            <span class="text-sm">{props.currentFrame}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium">FPS</span>
            <span class="text-sm">{props.averageFPS.toFixed?.(1) ?? 0}</span>
          </div>
          <div class="flex items-center gap-2 portrait:hidden">
            <span class="text-sm font-medium">时钟</span>
            <span class="text-sm">{props.clockKind || "raf"}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium">队列</span>
            <span class="text-sm">{props.queueSize}</span>
          </div>
        </Show>
      </div>
    </div>
  );
}

// ============================== 控制面板组件 ==============================

interface ControlPanelProps {
  canStart: boolean;
  isLoading: boolean;
  isRunning: boolean;
  isPaused: boolean;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onClearError: () => void;
}

/**
 * 控制面板组件 - 模拟器控制按钮
 */
export function ControlPanel(props: ControlPanelProps) {
  return (
    <div class="ControlPanel flex gap-2">
      <Button
        onClick={() => {
          props.onClearError();
          props.onStart();
        }}
        disabled={!props.canStart}
        class="bg-green-600 hover:bg-green-700"
      >
        启动模拟
      </Button>
      <Button 
        onClick={props.onStop} 
        disabled={props.isLoading || !props.isRunning} 
        class="bg-red-600 hover:bg-red-700"
      >
        停止模拟
      </Button>
      <Button
        onClick={props.onPause}
        disabled={!props.isRunning || props.isPaused}
        class="bg-brand-color-1st hover:brightness-110"
      >
        暂停
      </Button>
      <Button
        onClick={props.onResume}
        disabled={!props.isPaused}
        class="bg-blue-600 hover:bg-blue-700"
      >
        恢复
      </Button>
    </div>
  );
}

// ============================== 成员管理组件 ==============================

interface MemberSelectProps {
  members: MemberSerializeData[];
  selectedId: string | null;
  onSelect: (memberId: string) => void;
}

/**
 * 成员选择组件
 */
export function MemberSelect(props: MemberSelectProps) {
  return (
    <div class="MemberSelect ml-auto flex flex-1 items-center gap-2">
      <Show
        when={props.members.length > 0}
        fallback={
          <div class="bg-area-color flex h-12 w-full items-center justify-center rounded">
            <LoadingBar />
          </div>
        }
      >
        <Select
          value={props.selectedId || ""}
          setValue={(v) => {
            if (!v && props.members.length > 0) return;
            props.onSelect(v);
          }}
          options={[
            ...props.members.map((member) => ({
              label: `${member.name || member.id} (${member.type || "unknown"})`,
              value: member.id,
            })),
          ]}
          placeholder="请选择成员"
          optionPosition="top"
        />
      </Show>
    </div>
  );
}

interface MemberStatusProps {
  member: MemberSerializeData | null;
}

/**
 * 成员状态面板组件
 */
export function MemberStatus(props: MemberStatusProps) {
  return (
    <div class="col-span-12 row-span-1 flex flex-col items-center gap-2 portrait:row-span-1">
      <MemberStatusPanel member={() => props.member} />
    </div>
  );
}

// ============================== 技能面板组件 ==============================

interface SkillPanelProps {
  selectedMember: MemberWithRelations | null;
  onCastSkill: (skillId: string) => void;
}

/**
 * 技能面板组件
 */
export function SkillPanel(props: SkillPanelProps) {
  return (
    <div class="bg-area-color col-span-6 row-span-2 flex flex-col rounded-lg p-3">
      <Show when={props.selectedMember}>
        <h3 class="mb-2 text-lg font-semibold">技能</h3>
        <div class="grid flex-1 grid-cols-4 grid-rows-1 gap-2 overflow-y-auto">
          <Switch fallback={<div>暂无技能</div>}>
            <Match when={props.selectedMember?.type === "Player"}>
              <For each={(props.selectedMember?.player as PlayerWithRelations).character.skills ?? []}>
                {(skill) => (
                  <Button
                    onClick={() => props.onCastSkill(skill.id)}
                    class="col-span-1 row-span-1 flex-col items-start"
                    size="sm"
                  >
                    <span class="text-sm">{skill.template?.name}</span>
                    <span class="text-xs text-gray-500">Lv.{skill.lv}</span>
                  </Button>
                )}
              </For>
            </Match>
            <Match when={props.selectedMember?.type === "Mob"}>
              <pre>{JSON.stringify(props.selectedMember?.mob, null, 2)}</pre>
            </Match>
          </Switch>
        </div>
      </Show>
    </div>
  );
}

// ============================== 动作面板组件 ==============================

interface ActionPanelProps {
  selectedEngineMember: MemberSerializeData | null;
  onMove: (x: number, y: number) => void;
  onStopAction: () => void;
}

/**
 * 动作面板组件
 */
export function ActionPanel(props: ActionPanelProps) {
  return (
    <div class="bg-area-color col-span-6 row-span-2 rounded-lg p-3">
      <Show when={props.selectedEngineMember}>
        <h3 class="mb-2 text-lg font-semibold">动作</h3>
        <div class="flex gap-2">
          {/* 暂时注释掉，等待实现 */}
          {/* <Button onClick={() => props.onMove(100, 100)} class="bg-green-600 hover:bg-green-700" size="sm">
            移动到 (100, 100)
          </Button>
          <Button onClick={props.onStopAction} class="bg-red-600 hover:bg-red-700" size="sm">
            停止动作
          </Button> */}
        </div>
      </Show>
    </div>
  );
}

// ============================== 画面组件 ==============================

/**
 * 游戏画面区域组件
 */
export function GameViewArea() {
  return (
    <div class="col-span-12 row-span-7 flex flex-col items-center gap-2 portrait:row-span-6">
      <div class="flex h-full w-full flex-col overflow-hidden rounded"></div>
    </div>
  );
}
