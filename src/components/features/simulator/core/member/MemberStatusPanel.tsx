/**
 * 成员状态显示面板
 *
 * 职责：
 * - 显示选中成员的详细信息
 * - 实时更新成员状态
 * - 展示成员属性、位置、状态等数据
 */

import { createSignal, createEffect, Show, createMemo } from "solid-js";
import { MemberSerializeData } from "../Member";

// ============================== 类型定义 ==============================

interface MemberStatusPanelProps {
  selectedMember: MemberSerializeData | null;
}

interface StatDisplay {
  name: string;
  baseValue: number;
  currentValue: number;
  maxValue?: number;
  type: string;
}

// 类型谓词函数，用于检查对象是否为modifier类型
function isModifierType(obj: unknown): obj is { baseValue: number; modifiers: any } {
  return typeof obj === "object" && obj !== null && "baseValue" in obj && "modifiers" in obj;
}

// 计算动态总值（简化版本）
function calculateDynamicTotalValue(modifier: any): number {
  if (!modifier || typeof modifier !== "object") return 0;
  
  let total = modifier.baseValue || 0;
  
  // 添加静态修正值
  if (modifier.modifiers?.static?.fixed) {
    modifier.modifiers.static.fixed.forEach((mod: any) => {
      total += mod.value || 0;
    });
  }
  
  // 添加静态百分比修正
  if (modifier.modifiers?.static?.percentage) {
    modifier.modifiers.static.percentage.forEach((mod: any) => {
      total += (total * (mod.value || 0)) / 100;
    });
  }
  
  // 添加动态修正值
  if (modifier.modifiers?.dynamic?.fixed) {
    modifier.modifiers.dynamic.fixed.forEach((mod: any) => {
      total += mod.value || 0;
    });
  }
  
  // 添加动态百分比修正
  if (modifier.modifiers?.dynamic?.percentage) {
    modifier.modifiers.dynamic.percentage.forEach((mod: any) => {
      total += (total * (mod.value || 0)) / 100;
    });
  }
  
  return Math.round(total * 100) / 100; // 保留两位小数
}

// 递归渲染stats对象的组件（支持 Map、Map-like、Record）
function StatsRenderer(props: { data: any; path?: string[] }) {
  console.log("StatsRenderer", props);
  const renderStats = (obj: any, path: string[] = []) => {
    if (!obj || typeof obj !== "object") {
      return null;
    }
    
    // 处理Map对象
    let entries: [string, any][] = [];
    try {
      // 显式 Map
      if (obj instanceof Map) {
        entries = Array.from(obj.entries()).map(([key, value]) => [String(key), value]);
      }
      // Worker 传回的形如 { dataType: 'Map', data: [[k,v], ...] }
      else if ((obj as any)?.dataType === 'Map' && Array.isArray((obj as any).data)) {
        entries = (obj as any).data.map(([k, v]: any[]) => [String(k), v]);
      }
      // 一般 Record
      else {
        entries = Object.entries(obj);
      }
    } catch {
      entries = Object.entries(obj);
    }

    // 对 keys 做稳定排序：数字在前，字符串按字母
    entries.sort(([ak], [bk]) => {
      const an = Number(ak);
      const bn = Number(bk);
      const aIsNum = !Number.isNaN(an);
      const bIsNum = !Number.isNaN(bn);
      if (aIsNum && bIsNum) return an - bn;
      if (aIsNum) return -1;
      if (bIsNum) return 1;
      return ak.localeCompare(bk);
    });
    
    return entries.map(([key, value]) => {
      const currentPath = [...path, key];
      const pathString = currentPath.join(".");
      
      if (typeof value === "object" && value !== null) {
        if (isModifierType(value)) {
          // 渲染modifier类型的数据
          const hasModifiers = 
            (value.modifiers?.static?.fixed?.length > 0) ||
            (value.modifiers?.static?.percentage?.length > 0) ||
            (value.modifiers?.dynamic?.fixed?.length > 0) ||
            (value.modifiers?.dynamic?.percentage?.length > 0);
          
          return (
            <div class="flex w-full flex-col gap-1 rounded-sm bg-transition-color-8 p-1 border-b-accent-color border-1">
              <div class="w-full p-1 text-sm font-bold text-main-text-color">
                {key}：
              </div>
              {hasModifiers ? (
                <div class="flex flex-1 flex-wrap gap-1 border-t border-transition-color-20">
                  {/* 总值 */}
                  <div class="flex flex-col rounded-sm p-1">
                    <div class="text-sm text-accent-color-70">实际值</div>
                    <div class="text-nowrap rounded-sm px-1 flex-1 flex items-center text-main-text-color">
                      {calculateDynamicTotalValue(value)}
                    </div>
                  </div>
                  
                  {/* 基础值 */}
                  <div class="flex w-[25%] flex-col rounded-sm p-1">
                    <span class="text-sm text-accent-color-70">基础值</span>
                    <span class="text-nowrap rounded-sm px-1 text-accent-color-70 flex-1 flex items-center">
                      {value.baseValue}
                    </span>
                  </div>
                  
                  {/* 修正值 */}
                  <div class="flex w-full flex-1 flex-col rounded-sm p-1">
                    <span class="px-1 text-sm text-accent-color-70">修正值</span>
                    <div class="flex gap-1">
                      {/* 静态修正 */}
                      {(value.modifiers?.static?.fixed?.length > 0 || value.modifiers?.static?.percentage?.length > 0) && (
                        <div class="flex flex-1 items-center px-1">
                          <span class="text-sm text-accent-color-70">静态</span>
                          <div class="flex flex-wrap gap-1 text-nowrap rounded-sm p-1">
                            {value.modifiers.static.fixed?.map((mod: any, index: number) => (
                              <div class="group relative flex items-center gap-1 rounded-sm bg-transition-color-20 px-1 py-0.5">
                                <span class="text-nowrap rounded-sm px-1 text-accent-color-70">{mod.value}</span>
                                <span class="absolute bottom-full left-0 z-10 hidden rounded-sm bg-primary-color p-2 text-sm text-accent-color-70 shadow-xl group-hover:flex pointer-events-none">
                                  来源：{mod.origin}
                                </span>
                              </div>
                            ))}
                            {value.modifiers.static.percentage?.map((mod: any, index: number) => (
                              <div class="group relative flex items-center gap-1 rounded-sm bg-transition-color-20 px-1 py-0.5">
                                <span class="text-nowrap rounded-sm px-1 text-accent-color-70">{mod.value}%</span>
                                <span class="absolute bottom-full left-0 z-10 hidden rounded-sm bg-primary-color p-2 text-sm text-accent-color-70 shadow-xl group-hover:flex pointer-events-none">
                                  来源：{mod.origin}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* 动态修正 */}
                      {(value.modifiers?.dynamic?.fixed?.length > 0 || value.modifiers?.dynamic?.percentage?.length > 0) && (
                        <div class="flex flex-1 items-center px-1">
                          <span class="text-sm text-accent-color-70">动态</span>
                          <div class="flex flex-wrap gap-1 text-nowrap rounded-sm p-1">
                            {value.modifiers.dynamic.fixed?.map((mod: any, index: number) => (
                              <div class="group relative flex items-center gap-1 rounded-sm bg-transition-color-20 px-1 py-0.5">
                                <span class="text-nowrap rounded-sm px-1 text-accent-color-70">{mod.value}</span>
                                <span class="absolute bottom-full left-0 z-10 hidden rounded-sm bg-primary-color p-2 text-sm text-accent-color-70 shadow-xl group-hover:flex pointer-events-none">
                                  来源：{mod.origin}
                                </span>
                              </div>
                            ))}
                            {value.modifiers.dynamic.percentage?.map((mod: any, index: number) => (
                              <div class="group relative flex items-center gap-1 rounded-sm bg-transition-color-20 px-1 py-0.5">
                                <span class="text-nowrap rounded-sm px-1 text-accent-color-70">{mod.value}%</span>
                                <span class="absolute bottom-full left-0 z-10 hidden rounded-sm bg-primary-color p-2 text-sm text-accent-color-70 shadow-xl group-hover:flex pointer-events-none">
                                  来源：{mod.origin}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div class="text-nowrap rounded-sm px-1 flex-1 flex items-center text-main-text-color">
                  {calculateDynamicTotalValue(value)}
                </div>
              )}
            </div>
          );
        } else {
          // 渲染普通对象
          return (
            <div class="flex flex-col gap-1 rounded-sm border border-transition-color-20 p-1">
              <span class="text-brand-color-2nd text-sm">{pathString}</span>
              {renderStats(value, currentPath)}
            </div>
          );
        }
      } else {
        // 渲染简单值
        return (
          <div class="flex w-full flex-col gap-1 rounded-sm bg-transition-color-8 p-1 border-b-1 border-dividing-color">
            <div class="w-full p-1 text-sm font-bold text-main-text-color">
              {key}：
            </div>
            <div class="text-nowrap rounded-sm px-1 flex-1 flex items-center text-main-text-color">
              {JSON.stringify(value)}
            </div>
          </div>
        );
      }
    });
  };
  
  const normalized = (() => {
    const d = props.data;
    if (!d) return {};
    if (d instanceof Map) return d;
    if (d?.dataType === 'Map' && Array.isArray(d?.data)) return new Map(d.data);
    // 若是超大扁平 Record，仅挑选前 200 项以免卡顿（可按需调整）
    const entries = Object.entries(d);
    if (entries.length > 500) {
      return Object.fromEntries(entries.slice(0, 200));
    }
    return d;
  })();

  return <div class="flex w-full flex-col gap-1 p-1">{renderStats(normalized, props.path || [])}</div>;
}

// ============================== 组件实现 ==============================

export default function MemberStatusPanel(props: MemberStatusPanelProps) {
  const [stats, setStats] = createSignal<StatDisplay[]>([]);

  // 将扁平化的 stats（"a.b.c": 1）重建为嵌套对象，以便完整递归渲染
  const nestedStats = createMemo(() => {
    console.log("nestedStats", props.selectedMember);
    const source = (props.selectedMember as any)?.state?.context?.stats;
    if (!source) return {} as Record<string, any>;

    // 兼容 Map / Map-like
    const entries: [string, any][] =
      source instanceof Map
        ? Array.from(source.entries())
        : source?.dataType === "Map" && Array.isArray(source?.data)
          ? (source.data as any[]).map(([k, v]) => [String(k), v])
          : Object.entries(source as Record<string, any>);

    const root: Record<string, any> = {};
    for (const [key, value] of entries) {
      if (typeof key !== "string") continue;
      const parts = key.split(".").filter(Boolean);
      if (parts.length === 0) continue;
      let cursor: Record<string, any> = root;
      for (let i = 0; i < parts.length; i += 1) {
        const part = parts[i];
        const isLeaf = i === parts.length - 1;
        if (isLeaf) {
          cursor[part] = value;
        } else {
          if (!(part in cursor) || typeof cursor[part] !== "object" || cursor[part] === null) {
            cursor[part] = {};
          }
          cursor = cursor[part];
        }
      }
    }
    return root;
  });

  // 解析成员状态数据
  createEffect(() => {
    const member = props.selectedMember;
    if (!member) {
      setStats([]);
      return;
    }

    const parsedStats: StatDisplay[] = [];

    // 解析基础属性
    if (member.state?.context?.stats) {
      try {
        // 尝试解析stats Map
        const statsMap = member.state.context.stats;
        if (statsMap && typeof statsMap === "object") {
          // 遍历stats Map
          Object.entries(statsMap).forEach(([key, value]) => {
            if (value && typeof value === "object" && "baseValue" in value) {
              const stat = value as any;
              parsedStats.push({
                name: stat.name || key,
                baseValue: stat.baseValue || 0,
                currentValue: stat.baseValue || 0, // 这里可以根据需要计算实际值
                type: stat.type || "unknown",
              });
            }
          });
        }
      } catch (error) {
        console.warn("解析成员状态数据失败:", error);
      }
    }

    // 添加基础信息
    parsedStats.unshift(
      {
        name: "HP",
        baseValue: member.currentHp || 0,
        currentValue: member.currentHp || 0,
        maxValue: member.maxHp || 0,
        type: "health",
      },
      {
        name: "MP",
        baseValue: member.currentMp || 0,
        currentValue: member.currentMp || 0,
        maxValue: member.maxMp || 0,
        type: "mana",
      },
    );

    setStats(parsedStats);
  });

  // 格式化数值显示
  const formatValue = (value: number, maxValue?: number) => {
    if (maxValue && maxValue > 0) {
      return `${value}/${maxValue}`;
    }
    return value.toString();
  };

  // 获取状态颜色
  const getStatusColor = (type: string, currentValue: number, maxValue?: number) => {
    switch (type) {
      case "health":
        if (maxValue && maxValue > 0) {
          const percentage = (currentValue / maxValue) * 100;
          if (percentage < 25) return "text-red-500";
          if (percentage < 50) return "text-yellow-500";
          return "text-green-500";
        }
        return "text-main-text-color";
      case "mana":
        return "text-blue-500";
      default:
        return "text-main-text-color";
    }
  };

  return (
    <div class="flex h-full flex-col gap-2">
      {/* 成员信息显示 */}
      <Show
        when={props.selectedMember}
        fallback={
          <div class="flex flex-1 items-center justify-center">
            <div class="text-dividing-color text-center">
              <div class="mb-2 text-lg">👤</div>
              <div class="text-sm">请选择一个成员查看详细信息</div>
            </div>
          </div>
        }
      >
        <div class="flex flex-1 flex-col gap-2">
          {/* 基础信息 */}
          <div class="bg-area-color p-2">
            <h4 class="text-md text-main-text-color mb-3 font-semibold">基础信息</h4>
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div class="flex justify-between">
                <span class="text-dividing-color">ID:</span>
                <span class="text-main-text-color font-mono">{props.selectedMember?.id}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-dividing-color">类型:</span>
                <span class="text-main-text-color">{props.selectedMember?.type}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-dividing-color">状态:</span>
                <span class={`${props.selectedMember?.isAlive ? "text-green-500" : "text-red-500"}`}>
                  {props.selectedMember?.isAlive ? "存活" : "死亡"}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-dividing-color">活跃:</span>
                <span class={`${props.selectedMember?.isActive ? "text-green-500" : "text-yellow-500"}`}>
                  {props.selectedMember?.isActive ? "活跃" : "非活跃"}
                </span>
              </div>
            </div>
          </div>

          {/* 位置信息 */}
          <div class="bg-area-color p-2">
            <h4 class="text-md text-main-text-color mb-3 font-semibold">位置信息</h4>
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div class="flex justify-between">
                <span class="text-dividing-color">X坐标:</span>
                <span class="text-main-text-color font-mono">{props.selectedMember?.position?.x || 0}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-dividing-color">Y坐标:</span>
                <span class="text-main-text-color font-mono">{props.selectedMember?.position?.y || 0}</span>
              </div>
            </div>
          </div>

          {/* 状态机信息 */}
          <Show when={props.selectedMember?.state?.context}>
            <div class="bg-area-color p-2">
              <h4 class="text-md text-main-text-color mb-3 font-semibold">状态机信息</h4>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-dividing-color">最后更新:</span>
                  <span class="text-main-text-color">
                    {props.selectedMember?.state?.context?.lastUpdateTimestamp || 0}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-dividing-color">事件队列:</span>
                  <span class="text-main-text-color">
                    {props.selectedMember?.state?.context?.eventQueue?.length || 0} 个事件
                  </span>
                </div>
              </div>
              
              {/* Stats信息（可折叠，默认收起） */}
              <Show when={props.selectedMember?.state?.context?.stats}>
                <details class="mt-3">
                  <summary class="text-sm text-main-text-color mb-2 font-semibold cursor-pointer select-none">
                    属性详情（完整）
                  </summary>
              <div class="max-h-80 overflow-auto pr-1">
                <StatsRenderer data={nestedStats()} />
                  </div>
                </details>
              </Show>
            </div>
          </Show>

          {/* 调试信息 */}
          <div class="bg-area-color p-2">
            <h4 class="text-md text-main-text-color mb-3 font-semibold">调试信息</h4>
            <details class="text-xs">
              <summary class="text-dividing-color hover:text-main-text-color cursor-pointer">查看原始数据</summary>
              <pre class="bg-primary-color text-main-text-color mt-2 rounded p-2">
                {JSON.stringify(props.selectedMember, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      </Show>
    </div>
  );
}
 