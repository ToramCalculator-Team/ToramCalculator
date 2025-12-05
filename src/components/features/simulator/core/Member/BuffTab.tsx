/**
 * Buff Tab 内容组件
 * 
 * 职责：
 * - 展示成员当前的 Buff 列表
 * - 显示 Buff 的关键信息（名称、层数、持续时间、变量等）
 * - 显示动态管线效果信息
 */

import { For, Show, createMemo } from "solid-js";
import type { BuffViewData } from "./Member";

interface BuffTabProps {
  buffs?: BuffViewData[];
}

/**
 * 格式化持续时间显示
 */
function formatDuration(duration: number, startTime: number, currentTime: number = performance.now()): string {
  if (duration === -1) {
    return "永久";
  }
  const elapsed = (currentTime - startTime) / 1000; // 转换为秒
  const remaining = Math.max(0, duration - elapsed);
  if (remaining <= 0) {
    return "已过期";
  }
  if (remaining < 60) {
    return `${Math.floor(remaining)}秒`;
  }
  if (remaining < 3600) {
    return `${Math.floor(remaining / 60)}分${Math.floor(remaining % 60)}秒`;
  }
  return `${Math.floor(remaining / 3600)}小时${Math.floor((remaining % 3600) / 60)}分`;
}

export default function BuffTab(props: BuffTabProps) {
  const buffs = createMemo(() => props.buffs || []);

  return (
    <div class="flex w-full flex-col gap-2">
      <Show
        when={buffs().length > 0}
        fallback={
          <div class="flex flex-1 items-center justify-center py-8">
            <div class="text-dividing-color text-center">
              <div class="mb-2 text-lg">✨</div>
              <div class="text-sm">当前没有激活的 Buff</div>
            </div>
          </div>
        }
      >
        <div class="flex flex-col gap-2">
          <For each={buffs()}>
            {(buff) => (
              <div class="bg-area-color border-dividing-color flex flex-col gap-2 rounded border p-3">
                {/* Buff 基本信息 */}
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-main-text-color text-sm font-semibold">{buff.name}</span>
                    {buff.source && (
                      <span class="text-accent-color-70 text-xs">来源: {buff.source}</span>
                    )}
                  </div>
                  <div class="flex items-center gap-2">
                    {buff.maxStacks && buff.maxStacks > 1 && (
                      <span class="text-accent-color-70 text-xs">
                        层数: {buff.currentStacks || 1}/{buff.maxStacks}
                      </span>
                    )}
                  </div>
                </div>

                {/* 持续时间 */}
                <div class="flex items-center gap-2">
                  <span class="text-accent-color-70 text-xs">持续时间:</span>
                  <span class="text-main-text-color text-xs">
                    {formatDuration(buff.duration, buff.startTime)}
                  </span>
                </div>

                {/* 描述 */}
                {buff.description && (
                  <div class="text-accent-color-70 text-xs">{buff.description}</div>
                )}

                {/* 变量信息 */}
                {buff.variables && Object.keys(buff.variables).length > 0 && (
                  <div class="border-dividing-color border-t pt-2">
                    <div class="text-accent-color-70 mb-1 text-xs font-medium">变量:</div>
                    <div class="flex flex-wrap gap-2">
                      <For each={Object.entries(buff.variables)}>
                        {([key, value]) => (
                          <div class="bg-primary-color text-main-text-color rounded px-2 py-1 text-xs">
                            <span class="text-accent-color-70">{key}:</span> {String(value)}
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                )}

                {/* 动态管线效果 */}
                {buff.dynamicEffects && buff.dynamicEffects.length > 0 && (
                  <div class="border-dividing-color border-t pt-2">
                    <div class="text-accent-color-70 mb-1 text-xs font-medium">动态效果:</div>
                    <div class="flex flex-col gap-1">
                      <For each={buff.dynamicEffects}>
                        {(effect) => (
                          <div class="text-accent-color-70 text-xs">
                            • {effect.pipeline}
                            {effect.stage && ` → ${effect.stage}`}
                            {effect.priority !== undefined && ` (优先级: ${effect.priority})`}
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                )}
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

