import React from "react";
import { type modifiers, type CharacterData, type MonsterData, type SkillData, dynamicTotalValue } from "./worker";
import { type getDictionary } from "~/app/get-dictionary";

// 类型谓词函数，用于检查对象是否符合目标类型
function isTargetType(obj: unknown): obj is modifiers {
  // 检查对象是否为目标类型
  const isModifier = typeof obj === "object" && obj !== null && "baseValue" in obj && "modifiers" in obj;
  return isModifier;
}

type keyObj = SkillData & CharacterData & MonsterData

const hiddenKey: (keyof keyObj)[] = [
  "weaponPatkT", "weaponMatkT"
];

const actualValueClass = "Value text-nowrap rounded-sm px-1 flex-1 flex items-center ";
const baseValueClass = " Value text-nowrap rounded-sm px-1 text-accent-color-70 flex-1 flex items-center ";
const modifierStaticClass = " Value text-nowrap rounded-sm px-1 text-accent-color-70 ";
const modifierDynamicClass = " Value text-nowrap rounded-sm px-1 text-accent-color-70 ";
const originClass =
  "Origin buttom-full absolute left-0 z-10 hidden rounded-sm bg-primary-color p-2 text-sm text-accent-color-70 shadow-xl shadow-transition-color-8 group-hover:flex pointer-events-none";
// 由于tailwind编译时生成对应class，此处class将不会生效
// const columns = 8;
const columnsWidth = " lg:w-[calc((100%-16px)/5)] ";

// 用于递归遍历对象并生成DOM结构的组件
export const ObjectRenderer = (props: {
  dictionary: ReturnType<typeof getDictionary>;
  data?: SkillData | CharacterData | MonsterData;
  display: boolean;
}) => {
  if (!props.data) {
    return null;
  }
  if(!props.display) {
    return null
  }
  const { dictionary, data } = props;
  // 递归遍历对象的辅助函数
  const renderObject = (
    obj: unknown,
    path: string[] = [],
    d:
      | ReturnType<typeof getDictionary>["ui"]["analyze"]["dialogData"]
      | Record<string, string | number | object>
      | undefined = dictionary.ui.analyze.dialogData,
  ) => {
    return Object.entries(obj ?? {}).map(([key, value]) => {
      const currentPath = [...path, key].join(".");
      if (hiddenKey.some((item) => key === item)) return null;
      if (typeof value === "object" && value !== null) {
        if (!isTargetType(value)) {
          return (
            <div
              key={currentPath}
              className={`key=${currentPath} Object flex flex-col gap-1 rounded-sm border-[1px] border-transition-color-20 p-1 ${!currentPath.includes(".") && columnsWidth}`}
            >
              <span className="text-brand-color-2nd">{currentPath}</span>
              {renderObject(value, [...path, key], d[key] as Record<string, string | number | object> | undefined)}
            </div>
          );
        } else {
          return (
            <div
              key={currentPath}
              className={`key=${currentPath} Modifiers flex w-full flex-none flex-col gap-1 rounded-sm bg-transition-color-8 p-1 ${!(value.modifiers.static.fixed.length > 0 || value.modifiers.static.percentage.length > 0 || value.modifiers.dynamic.fixed.length > 0 || value.modifiers.dynamic.percentage.length > 0) && !currentPath.includes(".") && columnsWidth}`}
            >
              <div className="Key w-full p-1 text-sm font-bold">
                {(d[key] as string | number) ?? key}：
              </div>
              {value.modifiers.static.fixed.length > 0 ||
              value.modifiers.static.percentage.length > 0 ||
              value.modifiers.dynamic.fixed.length > 0 ||
              value.modifiers.dynamic.percentage.length > 0 ? (
                <div className="Values flex flex-1 flex-wrap gap-1 border-t-[1px] border-transition-color-20 lg:gap-4">
                  <div
                    className={`TotalValue flex flex-col rounded-sm p-1 ${!(value.modifiers.static.fixed.length > 0 || value.modifiers.static.percentage.length > 0 || value.modifiers.dynamic.fixed.length > 0 || value.modifiers.dynamic.percentage.length > 0) && "w-full"}`}
                  >
                    <div className="Key text-sm text-accent-color-70">{dictionary.ui.analyze.actualValue}</div>
                    <div className={`` + actualValueClass}>{dynamicTotalValue(value)}</div>
                  </div>
                  <div className="BaseVlaue flex w-[25%] flex-col rounded-sm p-1 lg:w-[10%]">
                    <span className="BaseValueName text-sm text-accent-color-70">
                      {dictionary.ui.analyze.baseValue}
                    </span>
                    <span className={`` + baseValueClass}>{value.baseValue}</span>
                  </div>
                  <div className="ModifierVlaue flex w-full flex-1 flex-col rounded-sm p-1">
                    <span className="ModifierValueName px-1 text-sm text-accent-color-70">
                      {dictionary.ui.analyze.modifiers}
                    </span>
                    <div className="ModifierValueContent flex gap-1">
                      {(value.modifiers.static.fixed.length > 0 || value.modifiers.static.percentage.length > 0) && (
                        <div className="ModifierStaticBox flex flex-1 items-center px-1">
                          <span className="ModifierStaticName text-sm text-accent-color-70">
                            {dictionary.ui.analyze.staticModifiers}
                          </span>
                          <div className="ModifierStaticContent flex flex-wrap gap-1 text-nowrap rounded-sm p-1">
                            {value.modifiers.static.fixed.length > 0 && (
                              <div className="ModifierStaticFixedBox flex gap-2">
                                {value.modifiers.static.fixed.map((mod, index) => {
                                  return (
                                    <div
                                      key={"ModifierStaticFixed" + index}
                                      className={`key=${"ModifierStaticFixed" + index} ModifierStaticFixed group relative flex items-center gap-1 rounded-sm bg-transition-color-20 px-1 py-0.5`}
                                    >
                                      <span className={`` + modifierStaticClass}>{mod.value}</span>
                                      <span className={`` + originClass}>来源：{mod.origin}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {value.modifiers.static.percentage.length > 0 && (
                              <div className="ModifierStaticPercentageBox flex flex-wrap gap-1">
                                {value.modifiers.static.percentage.map((mod, index) => {
                                  return (
                                    <div
                                      key={"ModifierStaticPercentage" + index}
                                      className={`key=${"ModifierStaticPercentage" + index} ModifierStaticPercentage group relative flex items-center gap-1 rounded-sm bg-transition-color-20 px-1 py-0.5`}
                                    >
                                      <span className={`` + modifierStaticClass}>{mod.value}%</span>
                                      <span className={`` + originClass}>来源：{mod.origin}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {(value.modifiers.dynamic.fixed.length > 0 || value.modifiers.dynamic.percentage.length > 0) && (
                        <div className="ModifierDynamicBox flex flex-1 items-center px-1">
                          <span className="ModifierDynamicName text-sm text-accent-color-70">
                            {dictionary.ui.analyze.dynamicModifiers}
                          </span>
                          <div className="ModifierDynamicContent flex flex-wrap gap-1 text-nowrap rounded-sm p-1">
                            {value.modifiers.dynamic.fixed.length > 0 && (
                              <div className="ModifierDynamicFixedBox flex flex-1 flex-wrap gap-1">
                                {value.modifiers.dynamic.fixed.map((mod, index) => {
                                  return (
                                    <div
                                      key={"ModifierDynamicFixed" + index}
                                      className={`key=${"ModifierDynamicFixed" + index} ModifierDynamicFixed group relative flex items-center gap-1 rounded-sm bg-transition-color-20 px-1 py-0.5`}
                                    >
                                      <span className={`` + modifierDynamicClass}>{mod.value}</span>
                                      <span className={`` + originClass}>来源：{mod.origin}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {value.modifiers.dynamic.percentage.length > 0 && (
                              <div className="ModifierDynamicPercentageBox flex">
                                {value.modifiers.dynamic.percentage.map((mod, index) => {
                                  return (
                                    <div
                                      key={"ModifierDynamicPercentage" + index}
                                      className={`key=${"ModifierDynamicPercentage" + index} ModifierDynamicPercentage group relative flex items-center gap-1 rounded-sm bg-transition-color-20 px-1 py-0.5`}
                                    >
                                      <span className={`` + modifierDynamicClass}>{mod.value}%</span>
                                      <span className={`` + originClass}>来源：{mod.origin}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`` + actualValueClass}>{dynamicTotalValue(value)}</div>
              )}
            </div>
          );
        }
      } else {
        return (
          <div
            key={currentPath}
            className={`String flex w-full flex-none flex-col gap-1 rounded-sm bg-transition-color-8 p-1 lg:gap-4 ${!currentPath.includes(".") && columnsWidth}`}
          >
            <div className="Key w-full p-1 text-sm font-bold">
              {(d[key] as string | number) ?? key}：
            </div>
            <div className={`` + actualValueClass}>{JSON.stringify(value)}</div>
          </div>
        );
      }
    });
  };

  return (
    <div className="RenderObject flex w-full flex-col gap-1 p-1 lg:flex-row lg:flex-wrap">{renderObject(data)}</div>
  );
};
