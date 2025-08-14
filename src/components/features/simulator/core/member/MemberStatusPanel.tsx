/**
 * 成员状态显示面板
 *
 * 职责：
 * - 显示选中成员的详细信息
 * - 实时更新成员状态
 * - 展示成员属性、位置、状态等数据
 */

import { Accessor, Show, createMemo } from "solid-js";
import { MemberSerializeData } from "./MemberType";
import { DataStorage, isDataStorageType } from "./ReactiveSystem";

// ============================== 组件实现 ==============================

const actualValueClass = "Value text-nowrap rounded-sm px-1 flex-1 flex items-center ";
const baseValueClass = " Value text-nowrap rounded-sm px-1 text-accent-color-70 flex-1 flex items-center ";
const modifierStaticClass = " Value text-nowrap rounded-sm px-1 text-accent-color-70 ";
const modifierDynamicClass = " Value text-nowrap rounded-sm px-1 text-accent-color-70 ";
const originClass =
  "Origin buttom-full absolute left-0 z-10 hidden rounded-sm bg-primary-color p-2 text-sm text-accent-color-70 shadow-xl shadow-transition-color-8 group-hover:flex pointer-events-none";
// 由于tailwind编译时生成对应class，此处class将不会生效
// const columns = 8;
const columnsWidth = "";

// 用于递归遍历对象并生成DOM结构的组件（响应式）
const StatsRenderer = (props: { data?: object }) => {
  const resolved = createMemo(() => props.data);
  const renderObject = (
    obj: unknown,
    path: string[] = [],
    d: Record<string, string | number | object> | undefined = {},
  ) =>
    Object.entries(obj ?? {}).map((data) => {
      const [key, value] = data as [string, DataStorage];
      const currentPath = [...path, key].join(".");
      if (typeof value === "object" && value !== null) {
        if (!isDataStorageType(value)) {
          return (
            <div
              class={`key=${currentPath} Object border-transition-color-20 flex gap-1 border-b-1 p-1 ${!currentPath.includes(".") && columnsWidth}`}
            >
              <span
                class="font-bold w-8 text-center bg-area-color text-main-text-color"
                style={{ "writing-mode": "sideways-lr", "text-orientation": "mixed" }}
              >
                {key}
              </span>
              <div class="flex w-full flex-col gap-1">
                {renderObject(value, [...path, key], d[key] as Record<string, string | number | object> | undefined)}
              </div>
            </div>
          );
        }
        return (
          <div
            class={`key=${currentPath} Modifiers bg-area-color flex w-full flex-none flex-col gap-1 rounded-sm p-1 ${!(value.static.fixed.length > 0 || value.static.percentage.length > 0 || value.dynamic.fixed.length > 0 || value.dynamic.percentage.length > 0) && !currentPath.includes(".") && columnsWidth}`}
          >
            <div class="Key w-full p-1 text-sm font-bold">
              {value.displayName ?? (d[key] as string | number) ?? key}：
            </div>
            {value.static.fixed.length > 0 ||
            value.static.percentage.length > 0 ||
            value.dynamic.fixed.length > 0 ||
            value.dynamic.percentage.length > 0 ? (
              <div class="Values border-transition-color-20 flex flex-1 flex-wrap gap-1 border-t-[1px] lg:gap-4">
                <div
                  class={`TotalValue flex flex-col rounded-sm p-1 ${!(value.static.fixed.length > 0 || value.static.percentage.length > 0 || value.dynamic.fixed.length > 0 || value.dynamic.percentage.length > 0) && "w-full"}`}
                >
                  <div class="Key text-accent-color-70 text-sm">{"实际值"}</div>
                  <div class={`` + actualValueClass}>{value.actValue}</div>
                </div>
                <div class="BaseVlaue flex w-[25%] flex-col rounded-sm p-1 lg:w-[10%]">
                  <span class="BaseValueName text-accent-color-70 text-sm">{"基础值"}</span>
                  <span class={`` + baseValueClass}>{value.baseValue}</span>
                </div>
                <div class="ModifierVlaue flex w-full flex-1 flex-col rounded-sm p-1">
                  <span class="ModifierValueName text-accent-color-70 px-1 text-sm">{"修正值"}</span>
                  <div class="ModifierValueContent flex gap-1">
                    {(value.static.fixed.length > 0 || value.static.percentage.length > 0) && (
                      <div class="ModifierStaticBox flex flex-1 items-center px-1">
                        <span class="ModifierStaticName text-accent-color-70 text-sm">{"静态修正值"}</span>
                        <div class="ModifierStaticContent flex flex-wrap gap-1 rounded-sm p-1 text-nowrap">
                          {value.static.fixed.length > 0 && (
                            <div class="ModifierStaticFixedBox flex gap-2">
                              {value.static.fixed.map((mod, index) => (
                                <div
                                  class={`key=${"ModifierStaticFixed" + index} ModifierStaticFixed group bg-transition-color-20 relative flex items-center gap-1 rounded-sm px-1 py-0.5`}
                                >
                                  <span class={`` + modifierStaticClass}>{mod.value}</span>
                                  <span class={`` + originClass}>来源：{mod.sourceId}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {value.static.percentage.length > 0 && (
                            <div class="ModifierStaticPercentageBox flex flex-wrap gap-1">
                              {value.static.percentage.map((mod, index) => (
                                <div
                                  class={`key=${"ModifierStaticPercentage" + index} ModifierStaticPercentage group bg-transition-color-20 relative flex items-center gap-1 rounded-sm px-1 py-0.5`}
                                >
                                  <span class={`` + modifierStaticClass}>{mod.value}%</span>
                                  <span class={`` + originClass}>来源：{mod.sourceId}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {(value.dynamic.fixed.length > 0 || value.dynamic.percentage.length > 0) && (
                      <div class="ModifierDynamicBox flex flex-1 items-center px-1">
                        <span class="ModifierDynamicName text-accent-color-70 text-sm">{"动态修正值"}</span>
                        <div class="ModifierDynamicContent flex flex-wrap gap-1 rounded-sm p-1 text-nowrap">
                          {value.dynamic.fixed.length > 0 && (
                            <div class="ModifierDynamicFixedBox flex flex-1 flex-wrap gap-1">
                              {value.dynamic.fixed.map((mod, index) => (
                                <div
                                  class={`key=${"ModifierDynamicFixed" + index} ModifierDynamicFixed group bg-transition-color-20 relative flex items-center gap-1 rounded-sm px-1 py-0.5`}
                                >
                                  <span class={`` + modifierDynamicClass}>{mod.value}</span>
                                  <span class={`` + originClass}>来源：{mod.sourceId}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {value.dynamic.percentage.length > 0 && (
                            <div class="ModifierDynamicPercentageBox flex">
                              {value.dynamic.percentage.map((mod, index) => (
                                <div
                                  class={`key=${"ModifierDynamicPercentage" + index} ModifierDynamicPercentage group bg-transition-color-20 relative flex items-center gap-1 rounded-sm px-1 py-0.5`}
                                >
                                  <span class={`` + modifierDynamicClass}>{mod.value}%</span>
                                  <span class={`` + originClass}>来源：{mod.sourceId}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div class={`` + actualValueClass}>{value.actValue}</div>
            )}
          </div>
        );
      }
      return (
        <div
          class={`String bg-area-color flex w-full flex-none flex-col gap-1 rounded-sm p-1 lg:gap-4 ${!currentPath.includes(".") && columnsWidth}`}
        >
          <div class="Key w-full p-1 text-sm font-bold">{(d[key] as string | number) ?? key}：</div>
          <div class={`` + actualValueClass}>{String(value)}</div>
        </div>
      );
    });

  return <div class="RenderObject flex w-full flex-col gap-1">{renderObject(resolved())}</div>;
};

export default function MemberStatusPanel(props: { member: Accessor<MemberSerializeData<string> | null> }) {
  const selectedMemberData = createMemo(() => props.member()?.attrs);

  return (
    <Show
      when={props.member()}
      fallback={
        <div class="flex flex-1 items-center justify-center">
          <div class="text-dividing-color text-center">
            <div class="mb-2 text-lg">👤</div>
            <div class="text-sm">请选择一个成员查看详细信息</div>
          </div>
        </div>
      }
    >
      <div class="flex w-full flex-1 flex-col gap-1">
        {/* 基础信息 */}
        <div class="bg-primary-color border-accent-color sticky top-0 z-10 border-b-2 p-2">
          {/* <h4 class="text-md mb-3 font-semibold">基础信息</h4> */}
          <div class="grid grid-cols-5 gap-4 text-sm">
            <div class="flex gap-2">
              <span class="text-main-text-color text-nowrap">名称:</span>
              <span class="font-bold">{props.member()?.name}</span>
            </div>
            <div class="flex gap-2">
              <span class="text-main-text-color text-nowrap">类型:</span>
              <span class="font-bold">{props.member()?.type}</span>
            </div>
            <div class="flex gap-2">
              <span class="text-main-text-color text-nowrap">活跃:</span>
              <span class={`font-bold ${props.member()?.isActive ? "" : ""}`}>
                {props.member()?.isActive ? "活跃" : "非活跃"}
              </span>
            </div>
            <div class="flex gap-2">
              <span class="text-main-text-color text-nowrap">阵营:</span>
              <span class="font-bold">{props.member()?.campId || "-"}</span>
            </div>
            <div class="flex gap-2">
              <span class="text-main-text-color text-nowrap">队伍:</span>
              <span class="font-bold">{props.member()?.teamId || "-"}</span>
            </div>
          </div>
        </div>

        {/* 属性详情（从 attrs 构建的嵌套对象） */}
        <div class="flex-1 rounded">
          <StatsRenderer data={selectedMemberData()} />
        </div>

        {/* 调试信息 */}
        <div class="bg-area-color rounded p-2">
          <h4 class="text-md text-main-text-color mb-3 font-semibold">调试信息</h4>
          <details class="text-xs">
            <summary class="text-dividing-color hover:text-main-text-color cursor-pointer">查看原始数据</summary>
            <pre class="bg-primary-color text-main-text-color mt-2 rounded p-2">
              {JSON.stringify(props.member(), null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </Show>
  );
}
