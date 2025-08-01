import { createSignal, onMount, onCleanup, For } from "solid-js";
import { Player } from "~/components/features/simulator/core/member/player/Player";
import { findMemberWithRelations } from "@db/repositories/member";
import {
  PlayerAttrEnum,
  PlayerAttrDic,
  PlayerAttrKeys,
  PlayerAttrType,
} from "~/components/features/simulator/core/member/player/PlayerData";
import { Button } from "~/components/controls/button";
import { Select, SelectOption } from "~/components/controls/select";
import { Card } from "~/components/containers/card";

export default function ReactivityValidationTestPage() {
  const [player, setPlayer] = createSignal<Player | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [dependencyInfoDisplay, setDependencyInfoDisplay] = createSignal(false);
  const [attributes, setAttributes] = createSignal<Record<string, number>>({});
  const [dirtyAttributes, setDirtyAttributes] = createSignal<Set<string>>(new Set());
  const [changeHistory, setChangeHistory] = createSignal<
    Array<{
      timestamp: number;
      action: string;
      targetAttr: string;
      oldValue?: number;
      newValue?: number;
      affectedAttrs: string[];
    }>
  >([]);

  // 更新属性显示
  const updateAttributes = () => {
    const playerInstance = player();
    if (!playerInstance) return;

    const attrValues: Record<string, number> = {};
    for (const attr of PlayerAttrKeys) {
      try {
        attrValues[attr] = playerInstance.getAttributeValue(attr);
      } catch (err) {
        attrValues[attr] = 0;
      }
    }
    setAttributes(attrValues);
  };

  // 检查脏属性
  const checkDirtyAttributes = () => {
    const playerInstance = player();
    if (!playerInstance) return;

    const reactiveSystem = playerInstance.getReactiveDataManager();
    const debugInfo = reactiveSystem.getDebugInfo();
    const dirtySet = new Set<string>();

    // 检查哪些属性被标记为脏
    for (const [attrName, attrInfo] of Object.entries(debugInfo)) {
      if (attrInfo.isDirty) {
        dirtySet.add(attrName);
      }
    }

    setDirtyAttributes(dirtySet);
  };

  // 修改属性并记录变化
  const modifyAttribute = (attrName: PlayerAttrType, newValue: number) => {
    const playerInstance = player();
    if (!playerInstance) return;

    const oldValue = playerInstance.getAttributeValue(attrName);

    // 记录修改前的状态
    const beforeDirty = new Set(dirtyAttributes());

    // 执行修改
    playerInstance.setAttributeValue(attrName, "baseValue" as any, newValue, "test");

    // 检查修改后的状态
    setTimeout(() => {
      checkDirtyAttributes();
      updateAttributes();

      // 记录变化历史
      const afterDirty = dirtyAttributes();
      const newlyDirty = Array.from(afterDirty).filter((attr) => !beforeDirty.has(attr));

      setChangeHistory((prev) => [
        {
          timestamp: Date.now(),
          action: "修改属性",
          targetAttr: attrName,
          oldValue,
          newValue,
          affectedAttrs: newlyDirty,
        },
        ...prev.slice(0, 19),
      ]); // 保留最近20条记录
    }, 10);
  };

  // 批量修改属性
  const batchModifyAttributes = (modifications: Array<{ attr: PlayerAttrType; value: number }>) => {
    const playerInstance = player();
    if (!playerInstance) return;

    const beforeDirty = new Set(dirtyAttributes());
    const oldValues: Record<string, number> = {};

    // 记录旧值
    for (const { attr } of modifications) {
      oldValues[attr] = playerInstance.getAttributeValue(attr);
    }

    // 执行批量修改
    for (const { attr, value } of modifications) {
      playerInstance.setAttributeValue(attr, "baseValue" as any, value, "batch-test");
    }

    // 检查修改后的状态
    setTimeout(() => {
      checkDirtyAttributes();
      updateAttributes();

      const afterDirty = dirtyAttributes();
      const newlyDirty = Array.from(afterDirty).filter((attr) => !beforeDirty.has(attr));

      setChangeHistory((prev) => [
        {
          timestamp: Date.now(),
          action: "批量修改",
          targetAttr: modifications.map((m) => m.attr).join(", "),
          oldValue: undefined,
          newValue: undefined,
          affectedAttrs: newlyDirty,
        },
        ...prev.slice(0, 19),
      ]);
    }, 10);
  };

  // 获取依赖关系信息
  const getDependencyInfo = () => {
    const playerInstance = player();
    if (!playerInstance) return null;

    const reactiveSystem = playerInstance.getReactiveDataManager();
    return reactiveSystem.getDependencyGraphInfo();
  };

  onMount(async () => {
    try {
      setLoading(true);

      // 创建Player实例
      const memberData = await findMemberWithRelations("defaultMember1Id");
      const playerInstance = new Player(memberData);
      setPlayer(playerInstance);

      // 初始化显示
      updateAttributes();
      checkDirtyAttributes();

      // 定期检查状态
      const interval = setInterval(() => {
        checkDirtyAttributes();
      }, 100);

      onCleanup(() => {
        clearInterval(interval);
      });
    } catch (err) {
      console.error("❌ 测试初始化失败:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  });

  // 创建属性选项
  const attributeOptions = (): SelectOption[] => {
    return PlayerAttrKeys.map((attr) => ({
      label: PlayerAttrDic[attr] || attr,
      value: attr,
    }));
  };

  return (
    <div class="flex h-full flex-col gap-6 p-6">
      {/* 页面标题 */}
      <div>
        <h1 class="mb-2 text-3xl font-bold">🔍 响应式系统监控测试</h1>
        <p class="text-accent-color text-lg">监控属性变化、脏标记状态和依赖关系</p>
      </div>

      {/* 加载状态 */}
      {loading() && (
        <div class="bg-area-color border-dividing-color mb-6 rounded-lg border p-6">
          <div class="flex items-center space-x-3">
            <div class="border-primary-color h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"></div>
            <span class="text-accent-color">正在初始化响应式系统...</span>
          </div>
        </div>
      )}

      {/* 错误状态 */}
      {error() && (
        <div class="mb-6 rounded-lg border border-red-600 bg-red-900/20 p-6">
          <h3 class="mb-2 font-bold text-red-400">❌ 初始化失败</h3>
          <p class="text-red-300">{error()}</p>
        </div>
      )}

      {/* 主要内容 */}
      {player() && !loading() && (
        <div class="flex h-full flex-1 gap-4 overflow-y-hidden">
          {/* 左侧：监控和控制 */}
          <div class="flex h-full basis-1/3 flex-col gap-3">
            {/* 变化历史 */}
            <div class="bg-area-color border-dividing-color h-full rounded-lg border p-6">
              <div class="mb-3 flex flex-wrap gap-3">
                <Select
                  value=""
                  setValue={(value) => {
                    if (value) {
                      const currentValue = attributes()[value as PlayerAttrType] || 0;
                      modifyAttribute(value as PlayerAttrType, currentValue + 10);
                    }
                  }}
                  options={attributeOptions()}
                  placeholder="选择属性"
                  class="w-48"
                />
              </div>
              <h2 class="mb-4 text-xl font-semibold">📊 变化历史</h2>
              {/* 单个属性修改 */}
              <div class="mb-6">
                <h3 class="text-accent-color mb-3 text-lg font-medium">单个属性修改</h3>
              </div>
              <div class="max-h-60 space-y-3 overflow-y-auto">
                <For each={changeHistory()}>
                  {(record) => (
                    <div class="bg-background-color border-dividing-color rounded border p-4">
                      <div class="mb-2 flex items-start justify-between">
                        <span class="font-medium">{record.action}</span>
                        <span class="text-accent-color text-sm">{new Date(record.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div class="text-main-text-color mb-2 text-sm">
                        目标: {record.targetAttr}
                        {record.oldValue !== undefined && record.newValue !== undefined && (
                          <span class="text-accent-color ml-2">
                            ({record.oldValue} → {record.newValue})
                          </span>
                        )}
                      </div>
                      {record.affectedAttrs.length > 0 && (
                        <div class="text-sm">
                          <span class="text-yellow-500">影响属性:</span>
                          <span class="text-accent-color ml-1">{record.affectedAttrs.join(", ")}</span>
                        </div>
                      )}
                    </div>
                  )}
                </For>
              </div>
            </div>
          </div>

          {/* 右侧：数据展示 */}
          <div class="flex h-full basis-2/3 flex-col gap-3">
            {/* 当前属性值 */}
            <div class="bg-area-color border-dividing-color h-full rounded-lg border p-6">
              <div
                class="grid h-full flex-1 grid-cols-2 gap-3 overflow-y-auto"
                onClick={() => setDependencyInfoDisplay(!dependencyInfoDisplay())}
              >
                <For each={Object.entries(attributes())}>
                  {([key, value]) => {
                    const attrName = PlayerAttrDic[key as PlayerAttrType] || key;
                    const isDirty = dirtyAttributes().has(key);
                    return (
                      <div
                        class={`rounded border p-3 ${isDirty ? "border-red-600 bg-red-900/20" : "bg-background-color border-dividing-color"}`}
                      >
                        <div class="flex items-center justify-between">
                          <span class="text-main-text-color font-medium">{attrName}</span>
                          <span class={`font-mono font-bold ${isDirty ? "text-red-400" : "text-green-500"}`}>
                            {typeof value === "number" ? value.toLocaleString() : String(value)}
                          </span>
                        </div>
                        {isDirty && <div class="mt-1 text-xs text-red-400">🚨 脏标记</div>}
                      </div>
                    );
                  }}
                </For>
              </div>
            </div>

            {/* 依赖关系信息 */}
            <Card title="🔗 依赖关系" index={0} total={1} display={dependencyInfoDisplay()}>
              <div class="flex flex-col gap-2" onClick={() => setDependencyInfoDisplay(false)}>
                <For each={Object.entries(getDependencyInfo()!)}>
                  {([attr, dependents]) => (
                    <div class="bg-background-color border-dividing-color rounded border p-3">
                      <div class="mb-1 font-medium">{PlayerAttrDic[attr as PlayerAttrType] || attr}</div>
                      <div class="text-accent-color text-xs">
                        影响: {dependents.map((d) => PlayerAttrDic[d as PlayerAttrType] || d).join(", ") || "无"}
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
