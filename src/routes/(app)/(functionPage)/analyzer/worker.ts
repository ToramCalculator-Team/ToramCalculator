/// <reference lib="webworker" />

import * as _ from "lodash-es";
import { ModifierType, type $Enums } from "~/schema/enums";
import { type getDictionary } from "~/locales/i18n";
import { type MathNode, all, create, floor, max, min, parse } from "mathjs";
import { type SelectCharacter } from "~/schema/character";
import { type SelectMonster } from "~/schema/monster";
import { type SelectSkillEffect } from "~/schema/skill_effect";
import { type SelectModifiersList } from "~/schema/modifiers_list";
import { SelectModifier } from "~/schema/modifier";

const fps = 60;

export type computeInput = {
  type: "start" | "stop";
  arg: {
    dictionary: ReturnType<typeof getDictionary>;
    team: {
      config: SelectCharacter;
      actionQueue: tSkill[];
    }[];
    monster: SelectMonster;
  };
};

export type computeOutput = {
  type: "progress" | "success" | "error";
  computeResult: FrameData[] | string;
};

export class modifiers {
  name: ModifierType | null;
  baseValue: number;
  modifiers: {
    static: {
      fixed: {
        value: number;
        origin: string;
      }[];
      percentage: {
        value: number;
        origin: string;
      }[];
    };
    dynamic: {
      fixed: {
        value: number;
        origin: string;
      }[];
      percentage: {
        value: number;
        origin: string;
      }[];
    };
  };
  relations?: modifiers[];
  update?: () => void;
  constructor(name: ModifierType | null, baseValue?: number) {
    this.name = null;
    this.baseValue = baseValue ?? 0;
    this.modifiers = {
      static: {
        fixed: [],
        percentage: [],
      },
      dynamic: {
        fixed: [],
        percentage: [],
      },
    };
    this.relations = [];
    this.update = () => {};
  }
}

// modifier的递归更新方法
const relationUpdata = (target: modifiers) => {
  if (target.relations && target.relations.length > 0) {
    target.relations.forEach((relationModifier) => {
      relationModifier.update?.();
      if (relationModifier.relations && relationModifier.relations.length > 0) {
        relationUpdata(relationModifier);
      }
    });
  }
};

export type tSkill = {
  id: string;
  state: string;
  skillTreeName: string;
  name: string;
  skillDescription: string;
  level: number;
  weaponElementDependencyType: string;
  element: string;
  skillType: string;
  skillEffect: Omit<SelectSkillEffect, "condition">;
};

enum EventStatus {
  Pending = "Pending",
  InProgress = "InProgress",
  Completed = "Completed",
}

export type eventSequenceType = {
  state: EventStatus;
  type: $Enums.YieldType;
  condition: string;
  behavior: string;
  origin: string;
  registrationFrame: number;
};

// 参数统计方法
export const baseValue = (m: modifiers): number => {
  if (m.name === ModifierType.MAGICAL_PIERCE || m.name === ModifierType.PHYSICAL_PIERCE) return 100;
  return m.baseValue;
};

export const staticFixedValue = (m: modifiers): number => {
  const fixedArray = m.modifiers.static.fixed.map((mod) => mod.value);
  return fixedArray.reduce((a, b) => a + b, 0);
};

export const dynamicFixedValue = (m: modifiers): number => {
  let value = 0;
  if (m.modifiers.dynamic?.fixed) {
    const fixedArray = m.modifiers.dynamic.fixed.map((mod) => mod.value);
    value = fixedArray.reduce((a, b) => a + b, 0) + staticFixedValue(m);
  }
  return value;
};

export const staticPercentageValue = (m: modifiers): number => {
  const percentageArray = m.modifiers.static.percentage.map((mod) => mod.value);
  return percentageArray.reduce((a, b) => a + b, 0);
};

export const dynamicPercentageValue = (m: modifiers): number => {
  let value = 0;
  if (m.modifiers.dynamic?.percentage) {
    const percentageArray = m.modifiers.dynamic.percentage.map((mod) => mod.value);
    value = percentageArray.reduce((a, b) => a + b, 0) + staticPercentageValue(m);
  }
  return value;
};

export const staticTotalValue = (m: modifiers): number => {
  const base = baseValue(m);
  const fixed = staticFixedValue(m);
  const percentage = staticPercentageValue(m);
  return base * (1 + percentage / 100) + fixed;
};

export const dynamicTotalValue = (m: modifiers): number => {
  const base = baseValue(m);
  const fixed = dynamicFixedValue(m);
  const percentage = dynamicPercentageValue(m);
  return floor(base * (1 + percentage / 100) + fixed);
};

// 随机种子设置
const randomSeed: null | string = null;
// 向math中添加自定义方法
// 验证 `all` 是否为有效的 FactoryFunctionMap 对象
if (!all) {
  throw new Error("all is undefined. Make sure you are importing it correctly.");
}

const math = create(all, {
  epsilon: 1e-12,
  matrix: "Matrix",
  number: "number",
  precision: 64,
  predictable: false,
  randomSeed: randomSeed,
});

// 定义一个自定义节点转换函数
function replaceNode(node: MathNode) {
  // 如果节点是AccessorNode，替换成FunctionNode dynamicTotalValue(SymbolNode)
  if ("isAccessorNode" in node && node.isAccessorNode) {
    return new math.FunctionNode(new math.SymbolNode("dynamicTotalValue"), [node]);
  }
  // 遍历节点的子节点并递归替换
  return node.map(replaceNode);
}

// 导入自定义方法
// 此处需要考虑参数的上下文环境，静态加成的上下文环境为CharacterData，动态加成的上下文环境为computeArgType
math.import({
  dynamicTotalValue: dynamicTotalValue,
  // 应用于CharacterData环境的函数--------------------------------
  // 判断主武器类型是否为无
  isNO_WEAPON: function (mainWeapon: CharacterData["mainWeapon"]) {
    return mainWeapon.type === "NO_WEAPON";
  },
  // 判断主武器类型是否为单手剑
  isONE_HAND_SWORD: function (mainWeapon: CharacterData["mainWeapon"]) {
    return mainWeapon.type === "ONE_HAND_SWORD";
  },
  // 判断主武器类型是否为双手剑
  isTWO_HANDS_SWORD: function (mainWeapon: CharacterData["mainWeapon"]) {
    return mainWeapon.type === "TWO_HANDS_SWORD";
  },
  // 判断主武器类型是否为弓
  isBOW: function (mainWeapon: CharacterData["mainWeapon"]) {
    return mainWeapon.type === "BOW";
  },
  // 判断主武器类型是否为弩
  isBOWGUN: function (mainWeapon: CharacterData["mainWeapon"]) {
    return mainWeapon.type === "BOWGUN";
  },
  // 判断主武器类型是否为法杖
  isSTAFF: function (mainWeapon: CharacterData["mainWeapon"]) {
    return mainWeapon.type === "STAFF";
  },
  // 判断主武器类型是否为魔导具
  isMAGIC_DEVICE: function (mainWeapon: CharacterData["mainWeapon"]) {
    return mainWeapon.type === "MAGIC_DEVICE";
  },
  // 判断主武器类型是否为拳套
  isKNUCKLE: function (mainWeapon: CharacterData["mainWeapon"]) {
    return mainWeapon.type === "KNUCKLE";
  },
  // 判断主武器类型是否为旋风枪
  isHALBERD: function (mainWeapon: CharacterData["mainWeapon"]) {
    return mainWeapon.type === "HALBERD";
  },
  // 判断主武器类型是否为拔刀剑
  isKATANA: function (mainWeapon: CharacterData["mainWeapon"]) {
    return mainWeapon.type === "KATANA";
  },
  // 应用于SkillData环境的函数--------------------------------
});

// 类型谓词函数，用于检查对象是否符合SelectModifiersList类型
function isSelectModifiersList(obj: unknown, currentPath?: string[]): obj is SelectModifiersList {
  // 检查对象是否为目标类型
  const isModifiersList =
    typeof obj === "object" && obj !== null && "modifiers" in obj && typeof obj.modifiers === "object";
  // console.log(
  //   "当前路径：",
  //   _currentPath.join("."),
  //   "正在检查属性：",
  //   obj,
  //   "是否符合ModifiersList类型，结论：",
  //   isModifiersList,
  // );
  return isModifiersList;
}

// 类型谓词函数，用于检查对象是否符合modifiers类型
function isModifiers(obj: unknown, currentPath?: string[]): obj is modifiers {
  // 检查对象是否为目标类型
  const isModifier = typeof obj === "object" && obj !== null && "baseValue" in obj && typeof obj.baseValue === "number";
  // console.log(
  //   "当前路径：",
  //   _currentPath.join("."),
  //   "正在检查属性：",
  //   obj,
  //   "是否符合Modifier类型，结论：",
  //   isModifier,
  // );
  return isModifier;
}

// 角色加成项收集
export const characterModifierCollector = (character: SelectCharacter): SelectModifiersList[] => {
  console.log("开始收集角色配置中的加成项");

  // 递归收集对象中所有符合目标类型的属性
  const result: SelectModifiersList[] = [];

  function recurse(value: unknown, currentPath: string[]): void {
    if (isSelectModifiersList(value, currentPath)) {
      // console.log("收集到一个符合条件的对象：", value, "当前路径：", currentPath.join("."));
      result.push(value);
    }

    if (_.isObject(value) && !_.isArray(value)) {
      _.forOwn(value, (subValue, key) => {
        recurse(subValue, [...currentPath, key]);
      });
    }

    if (_.isArray(value)) {
      value.forEach((subValue, index) => {
        recurse(subValue, [...currentPath, index.toString()]);
      });
    }
  }

  recurse(character, []);
  return result;
};

// 将加成项应用至指定对象
const applyModifiers = (formula: string, origin: string, scope: object): void => {
  const match = formula.match(/(.+?)([+\-])(.+)/);
  if (!match) {
    console.log(`加成项表达式[${formula}]中没有找到加减运算符，放弃此属性`);
    return;
  }
  // 预期的表达式格式：mAtk + 5% ：targetStr + operatorStr + formulaStr
  const targetStr = _.trim(match[1]);
  const operatorStr = match[2];
  const formulaStr = _.trim(match[3]);
  // 如果能够发现加减运算符，则对符号左右侧字符串进行验证
  console.log(`表达式拆解为：1:目标属性:[${targetStr}] 2:运算符:[${operatorStr}] 3:表达式:[${formulaStr}]`);
  // 查找目标属性
  const targetStrSplit = targetStr.split(".");
  let finalPath = "";
  targetStrSplit.forEach((item, index) => {
    finalPath = finalPath + (index === targetStrSplit.length - 1 ? item : `${item}.`);
  });
  console.log("目标属性路径：", finalPath);
  let target: string | number | object;
  if (!_.get(scope, finalPath)) {
    console.log("在计算上下文中没有找到对应的自定义属性:" + targetStr);
    return;
  }
  // 如果在characterAttr找到了对应的属性
  target = _.get(scope, finalPath);
  console.log("依据最终路径，找到了：", _.cloneDeep(target));
  // 开始计算表达式
  let formulaResult = 0;
  let subNode = parse(formulaStr);
  // 判断值类型，依据字符串结尾是否具有百分比符号分为百分比加成和常数加成，此正则将字符串中最后一个%符号的左右拆分
  const perMatch = formulaStr.match(/^([\s\S]+?)\s*(%?)$/);
  console.log("表达式拆分结果：", perMatch);
  if (perMatch && perMatch[2] === "%") {
    console.log("表达式值为百分比类型，%符号左侧表达式：", perMatch[1]);
    // 表达式非空，说明存在%符号
    if (perMatch[1] === "") {
      console.log("表达式错误：%符号左侧内容为空");
      return;
    }
    if (perMatch[3]) {
      console.log("%符号右侧存在表达式：", perMatch[3], "无法计算");
      return;
    }
    subNode = parse(perMatch[1]);
  }
  // 将属性[.]节点转换成总值计算
  const transformSubNode = replaceNode(subNode);
  const transformSubNodeStr = transformSubNode.toString();
  formulaResult = _.toNumber(
    math.evaluate(transformSubNodeStr, { ...JSON.parse(JSON.stringify(scope)) }) as number | void,
  );

  console.log("达式计算结果：", formulaResult);
  // 应用计算结果
  if (isModifiers(target)) {
    console.log("目标属性是modifier类，将计算结果新增进数组");
    // 表达能够正确计算的话
    if (perMatch && perMatch[2] === "%" && !perMatch[3]) {
      console.log("由于表达式末尾存在百分比符号，将计算结果添加进百分比数组中");
      switch (operatorStr) {
        case "+":
          target.modifiers.static.percentage.push({
            value: formulaResult,
            origin: origin,
          });
          break;
        case "-":
          target.modifiers.static.percentage.push({
            value: -formulaResult,
            origin: origin,
          });
          break;
        default:
          console.log("未知运算符");
          break;
      }
    } else {
      console.log("表达式为常数类型，将计算结果添加进常数数组中");
      switch (operatorStr) {
        case "+":
          target.modifiers.static.fixed.push({
            value: formulaResult,
            origin: origin,
          });
          break;
        case "-":
          target.modifiers.static.fixed.push({
            value: -formulaResult,
            origin: origin,
          });
          break;
        default:
          console.log("未知运算符");
          break;
      }
    }
    // 更新相关值
    if (target.relations && target.relations.length > 0) {
      console.log("将更新受影响的属性：", target.relations);
      relationUpdata(target);
    } else {
      console.log("没有属性受此属性影响，无需更新");
    }
  } else if (_.isNumber(target)) {
    console.log("目标属性为常数类型，直接相加");
    // 表达能够正确计算的话
    if (perMatch) {
      console.log("由于表达式末尾存在百分比符号，将计算结果添加进百分比数组中");
      switch (operatorStr) {
        case "+":
          target = target + (target * formulaResult) / 100;
          break;
        case "-":
          target = target - (target * formulaResult) / 100;
          break;
        default:
          console.log("未知运算符");
          break;
      }
    } else {
      console.log("表达式为常数类型，将计算结果添加进常数数组中");
      switch (operatorStr) {
        case "+":
          target += formulaResult;
          break;
        case "-":
          target -= formulaResult;
          break;
        default:
          console.log("未知运算符");
          break;
      }
    }
  } else {
    console.log("目标属性不是modifier和number类，暂时无法计算");
  }
  console.log("修改后的属性值：", _.cloneDeep(target));
};

// 角色属性应用
export const characterModifiersApplicator = (character: SelectCharacter, characterData: CharacterData): void => {
  const modifiersListArray = characterModifierCollector(character);
  console.log("目前已收集的加成项列表：", modifiersListArray);
  console.log("开始将已收集的加成项应用至角色配置中");
  modifiersListArray.forEach((modifiersListData) => {
    const origin = modifiersListData.name ?? "未命名的加成项组"; // 用于显示的结果中标记属性来源
    modifiersListData.modifiers.forEach((modifier) => {
      if (modifier.formula === "") return;
      console.log(`找到加成项： ${modifier.formula}, 来源于：${origin}`);
      // 属性添加
      const node = parse(modifier.formula);
      const nodeString = node.toString();
      if (node.type === "AssignmentNode") {
        console.log(
          `加成项表达式[${modifier.formula}]中存在赋值节点："${nodeString}", 角色属性应用时不允许使用赋值语句，放弃此属性`,
        );
        return;
      }
      // 非赋值表达式说明该行为是对当前角色已有属性进行增减,从第一个加减号开始分解表达式
      applyModifiers(modifier.formula, origin, characterData);
    });
  });
};

export class CharacterData {
  // 武器的能力值-属性转化率
  static weaponAbiT: Record<
    $Enums.MainWeaponType,
    {
      baseHit: number;
      baseAspd: number;
      weaAtk_Matk_Convert: number;
      weaAtk_Patk_Convert: number;
      abi_Attr_Convert: Record<
        "str" | "int" | "agi" | "dex",
        { pAtkT: number; mAtkT: number; aspdT: number; stabT: number }
      >;
    }
  > = {
    ONE_HAND_SWORD: {
      baseHit: 0.25,
      baseAspd: 100,
      abi_Attr_Convert: {
        str: {
          pAtkT: 2,
          stabT: 0.025,
          aspdT: 0.2,
          mAtkT: 0,
        },
        int: {
          mAtkT: 3,
          pAtkT: 0,
          aspdT: 0,
          stabT: 0,
        },
        agi: {
          aspdT: 4.2,
          pAtkT: 0,
          mAtkT: 0,
          stabT: 0,
        },
        dex: {
          pAtkT: 2,
          stabT: 0.075,
          mAtkT: 0,
          aspdT: 0,
        },
      },
      weaAtk_Matk_Convert: 0,
      weaAtk_Patk_Convert: 1,
    },
    KATANA: {
      baseHit: 0.3,
      baseAspd: 200,
      abi_Attr_Convert: {
        str: {
          pAtkT: 1.5,
          stabT: 0.075,
          aspdT: 0.3,
          mAtkT: 0,
        },
        int: {
          mAtkT: 1.5,
          pAtkT: 0,
          aspdT: 0,
          stabT: 0,
        },
        agi: {
          aspdT: 3.9,
          pAtkT: 0,
          mAtkT: 0,
          stabT: 0,
        },
        dex: {
          pAtkT: 2.5,
          stabT: 0.025,
          mAtkT: 0,
          aspdT: 0,
        },
      },
      weaAtk_Matk_Convert: 0,
      weaAtk_Patk_Convert: 1,
    },
    TWO_HANDS_SWORD: {
      baseHit: 0.15,
      baseAspd: 50,
      abi_Attr_Convert: {
        str: {
          pAtkT: 3,
          aspdT: 0.2,
          mAtkT: 0,
          stabT: 0,
        },
        int: {
          mAtkT: 3,
          pAtkT: 0,
          aspdT: 0,
          stabT: 0,
        },
        agi: {
          aspdT: 2.2,
          pAtkT: 0,
          mAtkT: 0,
          stabT: 0,
        },
        dex: {
          pAtkT: 1,
          stabT: 0.1,
          mAtkT: 0,
          aspdT: 0,
        },
      },
      weaAtk_Matk_Convert: 0,
      weaAtk_Patk_Convert: 1,
    },
    BOW: {
      baseHit: 0.1,
      baseAspd: 75,
      abi_Attr_Convert: {
        str: {
          pAtkT: 1,
          stabT: 0.05,
          mAtkT: 0,
          aspdT: 0,
        },
        int: {
          mAtkT: 3,
          pAtkT: 0,
          aspdT: 0,
          stabT: 0,
        },
        agi: {
          aspdT: 3.1,
          pAtkT: 0,
          mAtkT: 0,
          stabT: 0,
        },
        dex: {
          pAtkT: 3,
          stabT: 0.05,
          aspdT: 0.2,
          mAtkT: 0,
        },
      },
      weaAtk_Matk_Convert: 0,
      weaAtk_Patk_Convert: 1,
    },
    BOWGUN: {
      baseHit: 0.05,
      baseAspd: 100,
      abi_Attr_Convert: {
        str: {
          stabT: 0.05,
          pAtkT: 0,
          mAtkT: 0,
          aspdT: 0,
        },
        int: {
          mAtkT: 3,
          pAtkT: 0,
          aspdT: 0,
          stabT: 0,
        },
        agi: {
          aspdT: 2.2,
          pAtkT: 0,
          mAtkT: 0,
          stabT: 0,
        },
        dex: {
          pAtkT: 4,
          aspdT: 0.2,
          mAtkT: 0,
          stabT: 0,
        },
      },
      weaAtk_Matk_Convert: 0,
      weaAtk_Patk_Convert: 1,
    },
    STAFF: {
      baseHit: 0.3,
      baseAspd: 60,
      abi_Attr_Convert: {
        str: {
          pAtkT: 3,
          stabT: 0.05,
          mAtkT: 0,
          aspdT: 0,
        },
        int: {
          mAtkT: 4,
          pAtkT: 1,
          aspdT: 0.2,
          stabT: 0,
        },
        agi: {
          aspdT: 1.8,
          pAtkT: 0,
          mAtkT: 0,
          stabT: 0,
        },
        dex: {
          aspdT: 0.2,
          pAtkT: 0,
          mAtkT: 0,
          stabT: 0,
        },
      },
      weaAtk_Matk_Convert: 1,
      weaAtk_Patk_Convert: 1,
    },
    MAGIC_DEVICE: {
      baseHit: 0.1,
      baseAspd: 90,
      abi_Attr_Convert: {
        str: {
          pAtkT: 0,
          mAtkT: 0,
          aspdT: 0,
          stabT: 0,
        },
        int: {
          mAtkT: 4,
          pAtkT: 2,
          aspdT: 0.2,
          stabT: 0,
        },
        agi: {
          pAtkT: 2,
          aspdT: 4,
          mAtkT: 0,
          stabT: 0,
        },
        dex: {
          stabT: 0.1,
          pAtkT: 0,
          mAtkT: 1,
          aspdT: 0,
        },
      },
      weaAtk_Matk_Convert: 1,
      weaAtk_Patk_Convert: 1,
    },
    KNUCKLE: {
      baseHit: 0.1,
      baseAspd: 120,
      abi_Attr_Convert: {
        str: {
          aspdT: 0.1,
          pAtkT: 0,
          mAtkT: 0,
          stabT: 0,
        },
        int: {
          mAtkT: 4,
          pAtkT: 0,
          aspdT: 0,
          stabT: 0,
        },
        agi: {
          pAtkT: 2,
          aspdT: 4.6,
          mAtkT: 0,
          stabT: 0,
        },
        dex: {
          pAtkT: 0.5,
          stabT: 0.025,
          mAtkT: 0,
          aspdT: 0.1,
        },
      },
      weaAtk_Matk_Convert: 0.5,
      weaAtk_Patk_Convert: 1,
    },
    HALBERD: {
      baseHit: 0.25,
      baseAspd: 20,
      abi_Attr_Convert: {
        str: {
          pAtkT: 2.5,
          stabT: 0.05,
          aspdT: 0.2,
          mAtkT: 0,
        },
        int: {
          mAtkT: 2,
          pAtkT: 0,
          aspdT: 0,
          stabT: 0,
        },
        agi: {
          aspdT: 3.5,
          pAtkT: 1.5,
          mAtkT: 1,
          stabT: 0,
        },
        dex: {
          stabT: 0.05,
          pAtkT: 0,
          mAtkT: 0,
          aspdT: 0,
        },
      },
      weaAtk_Matk_Convert: 0,
      weaAtk_Patk_Convert: 1,
    },
    NO_WEAPON: {
      baseHit: 50,
      baseAspd: 1000,
      abi_Attr_Convert: {
        str: {
          pAtkT: 1,
          mAtkT: 0,
          aspdT: 0,
          stabT: 0,
        },
        int: {
          mAtkT: 3,
          pAtkT: 0,
          aspdT: 0,
          stabT: 0,
        },
        agi: {
          aspdT: 9.6,
          pAtkT: 0,
          mAtkT: 0,
          stabT: 0,
        },
        dex: {
          pAtkT: 0,
          mAtkT: 0,
          aspdT: 0,
          stabT: 0,
        },
      },
      weaAtk_Matk_Convert: 0,
      weaAtk_Patk_Convert: 1,
    },
  };

  // 自由数值：玩家可定义基础值和加成项的，不由其他数值转化而来，但是会参与衍生属性计算的数值
  lv: number;
  mainWeapon: {
    type: $Enums.MainWeaponType;
    baseAtk: modifiers;
    refinement: number;
    stability: number;
  };
  subWeapon: {
    type: $Enums.SubWeaponType;
    baseAtk: modifiers;
    refinement: number;
    stability: number;
  };
  bodyArmor: {
    type: $Enums.BodyArmorType;
    baseDef: modifiers;
    refinement: number;
  };
  str: modifiers;
  int: modifiers;
  vit: modifiers;
  agi: modifiers;
  dex: modifiers;
  luk: modifiers;
  cri: modifiers;
  tec: modifiers;
  men: modifiers;
  // 系统数值：由系统决定基础值，加成项由自由数值决定的
  pPie: modifiers;
  mPie: modifiers;
  pStab: modifiers;
  nDis: modifiers;
  fDis: modifiers;
  crT: modifiers;
  cdT: modifiers;
  weaponPatkT: modifiers;
  weaponMatkT: modifiers;
  uAtk: modifiers;
  stro: Record<$Enums.Element, modifiers>;
  total: modifiers;
  final: modifiers;
  am: modifiers;
  cm: modifiers;
  aggro: modifiers;
  anticipate: modifiers; // 看穿
  // 衍生属性：基础值由自由数值决定，玩家只能定义加成项的
  maxHp: modifiers;
  maxMp: modifiers;
  pCr: modifiers;
  pCd: modifiers;
  mainWeaponAtk: modifiers;
  subWeaponAtk: modifiers;
  weaponAtk: modifiers;
  pAtk: modifiers;
  mAtk: modifiers;
  aspd: modifiers;
  cspd: modifiers;
  // 再衍生属性
  ampr: modifiers;
  hp: modifiers;
  mp: modifiers;

  [key: string]: object | string | number;

  constructor(dictionary: ReturnType<typeof getDictionary>, config: SelectCharacter) {
    console.log("开始实例化CharacterData");
    const mainWeaponType = config.mainWeapon?.mainWeaponType ?? "NO_WEAPON";
    const subWeaponType = config.subWeapon?.subWeaponType ?? "NO_WEAPON";
    const bodyArmorType = config.bodyArmor?.bodyArmorType ?? "NORMAL";

    // 计算基础值
    this.lv = config.lv;
    this.weaponMatkT = new modifiers(
      ModifierType.DEFAULT,
      CharacterData.weaponAbiT[mainWeaponType].weaAtk_Matk_Convert,
    );
    this.weaponPatkT = new modifiers(
      ModifierType.DEFAULT,
      CharacterData.weaponAbiT[mainWeaponType].weaAtk_Patk_Convert,
    );
    this.mainWeapon = {
      type: mainWeaponType,
      baseAtk: new modifiers(ModifierType.DEFAULT, config.mainWeapon?.baseAtk ?? 0),
      refinement: config.mainWeapon?.refinement ?? 0,
      stability: config.mainWeapon?.stability ?? 0,
    };
    this.subWeapon = {
      type: subWeaponType,
      baseAtk: new modifiers(ModifierType.DEFAULT, config.subWeapon?.baseAtk ?? 0),
      refinement: config.subWeapon?.refinement ?? 0,
      stability: config.subWeapon?.stability ?? 0,
    };
    this.bodyArmor = {
      type: bodyArmorType,
      baseDef: new modifiers(ModifierType.DEFAULT, config.bodyArmor?.baseDef ?? 0),
      refinement: config.bodyArmor?.refinement ?? 0,
    };
    this.str = new modifiers(ModifierType.STR, config.baseStr ?? 0);
    this.int = new modifiers(ModifierType.INT, config.baseInt ?? 0);
    this.vit = new modifiers(ModifierType.VIT, config.baseVit ?? 0);
    this.agi = new modifiers(ModifierType.AGI, config.baseAgi ?? 0);
    this.dex = new modifiers(ModifierType.DEX, config.baseDex ?? 0);
    this.luk = new modifiers(ModifierType.DEFAULT, config.specialAbiType === "LUK" ? (config.specialAbiValue ?? 0) : 0);
    this.tec = new modifiers(ModifierType.DEFAULT, config.specialAbiType === "TEC" ? (config.specialAbiValue ?? 0) : 0);
    this.men = new modifiers(ModifierType.DEFAULT, config.specialAbiType === "MEN" ? (config.specialAbiValue ?? 0) : 0);
    this.cri = new modifiers(ModifierType.DEFAULT, config.specialAbiType === "CRI" ? (config.specialAbiValue ?? 0) : 0);

    // 二级属性
    this.mainWeaponAtk = new modifiers(ModifierType.DEFAULT);
    this.mainWeaponAtk.modifiers.static.fixed[0] = {
      value: this.mainWeapon.refinement,
      origin: dictionary.ui.analyze.dialogData.mainWeapon.refinement,
    };
    this.mainWeaponAtk.modifiers.static.percentage[0] = {
      value: Math.pow(this.mainWeapon.refinement, 2),
      origin: dictionary.ui.analyze.dialogData.mainWeapon.refinement,
    };
    this.mainWeaponAtk.update = () => {
      this.mainWeaponAtk.baseValue = dynamicTotalValue(this.mainWeapon.baseAtk);
    };
    this.mainWeaponAtk.update();

    this.subWeaponAtk = new modifiers(ModifierType.DEFAULT);
    this.subWeaponAtk.update = () => {
      this.subWeaponAtk.baseValue = dynamicTotalValue(this.subWeapon.baseAtk);
    };
    this.subWeaponAtk.update();

    this.weaponAtk = new modifiers(ModifierType.DEFAULT);
    this.weaponAtk.update = () => {
      this.weaponAtk.baseValue = dynamicTotalValue(this.mainWeaponAtk) + dynamicTotalValue(this.subWeaponAtk);
    };
    this.weaponAtk.update();

    this.pAtk = new modifiers(ModifierType.DEFAULT);
    this.pAtk.update = () => {
      this.pAtk.baseValue =
        this.lv +
        dynamicTotalValue(this.weaponAtk) * dynamicTotalValue(this.weaponPatkT) +
        CharacterData.weaponAbiT[mainWeaponType].abi_Attr_Convert.str.pAtkT * dynamicTotalValue(this.str) +
        CharacterData.weaponAbiT[mainWeaponType].abi_Attr_Convert.int.pAtkT * dynamicTotalValue(this.int) +
        CharacterData.weaponAbiT[mainWeaponType].abi_Attr_Convert.agi.pAtkT * dynamicTotalValue(this.agi) +
        CharacterData.weaponAbiT[mainWeaponType].abi_Attr_Convert.dex.pAtkT * dynamicTotalValue(this.dex);
    };
    this.pAtk.update();

    this.mAtk = new modifiers(ModifierType.DEFAULT);
    this.mAtk.update = () => {
      this.mAtk.baseValue =
        this.lv +
        dynamicTotalValue(this.weaponAtk) * dynamicTotalValue(this.weaponMatkT) +
        CharacterData.weaponAbiT[mainWeaponType].abi_Attr_Convert.str.mAtkT * dynamicTotalValue(this.str) +
        CharacterData.weaponAbiT[mainWeaponType].abi_Attr_Convert.int.mAtkT * dynamicTotalValue(this.int) +
        CharacterData.weaponAbiT[mainWeaponType].abi_Attr_Convert.agi.mAtkT * dynamicTotalValue(this.agi) +
        CharacterData.weaponAbiT[mainWeaponType].abi_Attr_Convert.dex.mAtkT * dynamicTotalValue(this.dex);
      // console.log(
      //   `
      //   =========================================
      //   基础魔攻 = 等级 + 总武器攻击 + 能力值转化
      //   } + 能力值转化:
      //   等级： ${this.lv}
      //   总武器攻击： ${dynamicTotalValue(this.weaponAtk) * dynamicTotalValue(this.weaponMatkT)}
      //   当前武器类型： ${mainWeaponType} 的转化率如下
      //   str - 魔攻转化率：${CharacterData.weaponAbiT[mainWeaponType].abi_Attr_Convert.str.mAtkT} * 总str:${dynamicTotalValue(this.str)}
      //   int - 魔攻转化率：${CharacterData.weaponAbiT[mainWeaponType].abi_Attr_Convert.int.mAtkT} * 总int:${dynamicTotalValue(this.int)}
      //   agi - 魔攻转化率：${CharacterData.weaponAbiT[mainWeaponType].abi_Attr_Convert.agi.mAtkT} * 总agi:${dynamicTotalValue(this.agi)}
      //   dex - 魔攻转化率：${CharacterData.weaponAbiT[mainWeaponType].abi_Attr_Convert.dex.mAtkT} * 总dex:${dynamicTotalValue(this.dex)}
      //   魔攻 = ${this.mAtk.baseValue}
      //   =========================================
      //   `,
      // );
    };
    this.mAtk.update();

    this.aspd = new modifiers(ModifierType.DEFAULT);
    this.aspd.update = () => {
      this.aspd.baseValue =
        CharacterData.weaponAbiT[mainWeaponType].baseAspd +
        this.lv +
        CharacterData.weaponAbiT[mainWeaponType].abi_Attr_Convert.str.aspdT * dynamicTotalValue(this.str) +
        CharacterData.weaponAbiT[mainWeaponType].abi_Attr_Convert.int.aspdT * dynamicTotalValue(this.int) +
        CharacterData.weaponAbiT[mainWeaponType].abi_Attr_Convert.agi.aspdT * dynamicTotalValue(this.agi) +
        CharacterData.weaponAbiT[mainWeaponType].abi_Attr_Convert.dex.aspdT * dynamicTotalValue(this.dex);
    };
    this.aspd.update();

    this.cspd = new modifiers(ModifierType.DEFAULT);
    this.cspd.update = () => {
      this.cspd.baseValue = this.lv + dynamicTotalValue(this.dex) * 2.94 + dynamicTotalValue(this.agi) * 1.16;
      // console.log(`=======基础咏唱速度= 等级:${this.lv} + 灵巧:${dynamicTotalValue(this.dex)} *2.94 + 敏捷:${dynamicTotalValue(this.agi)} * 1.16 = ${this.cspd.baseValue}`);
    };
    this.cspd.update();

    this.pCr = new modifiers(ModifierType.DEFAULT);
    this.pCr.update = () => {
      this.pCr.baseValue = 25 + dynamicTotalValue(this.cri) / 5;
    };
    this.pCr.update();

    this.pCd = new modifiers(ModifierType.DEFAULT);
    this.pCd.update = () => {
      this.pCd.baseValue =
        150 +
        Math.floor(
          Math.max(dynamicTotalValue(this.str) / 5, dynamicTotalValue(this.str) + dynamicTotalValue(this.agi)) / 10,
        );
    };
    this.pCd.update();

    this.pStab = new modifiers(ModifierType.DEFAULT, 0);
    this.pStab.modifiers.static.fixed[0] = {
      value: config.mainWeapon?.stability ?? 0,
      origin: dictionary.ui.analyze.dialogData.mainWeapon.stability,
    };
    this.pStab.update = () => {
      this.pStab.modifiers.static.fixed[1] = {
        value:
          floor(
            CharacterData.weaponAbiT[mainWeaponType].abi_Attr_Convert.str.stabT * dynamicTotalValue(this.str) +
              CharacterData.weaponAbiT[mainWeaponType].abi_Attr_Convert.int.stabT * dynamicTotalValue(this.int) +
              CharacterData.weaponAbiT[mainWeaponType].abi_Attr_Convert.agi.stabT * dynamicTotalValue(this.agi) +
              CharacterData.weaponAbiT[mainWeaponType].abi_Attr_Convert.dex.stabT * dynamicTotalValue(this.dex),
          ) ?? 0,
        origin: [
          dictionary.ui.analyze.dialogData.str,
          dictionary.ui.analyze.dialogData.int,
          dictionary.ui.analyze.dialogData.agi,
          dictionary.ui.analyze.dialogData.dex,
        ].join(" + "),
      };
    };
    this.pStab.update();

    this.maxHp = new modifiers(ModifierType.DEFAULT);
    this.maxHp.update = () => {
      this.maxHp.baseValue = Math.floor(93 + this.lv * (127 / 17 + dynamicTotalValue(this.vit) / 3));
    };
    this.maxHp.update();

    this.maxMp = new modifiers(ModifierType.DEFAULT);
    this.maxMp.update = () => {
      this.maxMp.baseValue = Math.floor(99 + this.lv + dynamicTotalValue(this.int) / 10 + dynamicTotalValue(this.tec));
    };
    this.maxMp.update();

    // 系统属性
    this.aggro = new modifiers(ModifierType.DEFAULT, 100);
    this.pPie = new modifiers(ModifierType.PHYSICAL_PIERCE, 0);
    this.mPie = new modifiers(ModifierType.MAGICAL_PIERCE, 0);
    this.nDis = new modifiers(ModifierType.DEFAULT, 100);
    this.fDis = new modifiers(ModifierType.DEFAULT, 100);
    this.crT = new modifiers(ModifierType.DEFAULT, 0);
    this.cdT = new modifiers(ModifierType.DEFAULT, 50);
    this.stro = {
      WATER: new modifiers(ModifierType.DEFAULT, 100),
      FIRE: new modifiers(ModifierType.DEFAULT, 100),
      EARTH: new modifiers(ModifierType.DEFAULT, 100),
      WIND: new modifiers(ModifierType.DEFAULT, 100),
      LIGHT: new modifiers(ModifierType.DEFAULT, 100),
      DARK: new modifiers(ModifierType.DEFAULT, 100),
      NO_ELEMENT: new modifiers(ModifierType.DEFAULT, 100),
    };
    this.uAtk = new modifiers(ModifierType.DEFAULT, 100);
    this.total = new modifiers(ModifierType.DEFAULT, 100);
    this.final = new modifiers(ModifierType.DEFAULT, 100);
    this.anticipate = new modifiers(ModifierType.DEFAULT, 0);

    // 三级属性
    this.am = new modifiers(ModifierType.DEFAULT, 0);
    this.am.update = () => {
      this.am.modifiers.static.fixed[0] = {
        value: max(0, floor((dynamicTotalValue(this.aspd) - 1000) / 180)),
        origin: dictionary.ui.analyze.dialogData.aspd,
      };
    };
    this.am.update();

    this.cm = new modifiers(ModifierType.DEFAULT, 0);
    this.cm.update = () => {
      this.cm.modifiers.static.fixed[0] = {
        value: min(50 + floor((dynamicTotalValue(this.cspd) - 1000) / 180), floor(dynamicTotalValue(this.cspd) / 20)),
        origin: dictionary.ui.analyze.dialogData.cspd,
      };
    };
    this.cm.update();

    this.ampr = new modifiers(ModifierType.DEFAULT);
    this.ampr.update = () => {
      this.ampr.baseValue = 10 + dynamicTotalValue(this.maxMp) / 100;
    };
    this.ampr.update();

    // 状态记录
    this.hp = new modifiers(ModifierType.DEFAULT);
    this.hp.update = () => {
      this.hp.baseValue = dynamicTotalValue(this.maxHp);
    };
    this.hp.update();

    this.mp = new modifiers(ModifierType.DEFAULT);
    this.mp.update = () => {
      this.mp.baseValue = dynamicTotalValue(this.maxMp);
    };
    this.mp.update();

    // 定义关系
    this.weaponPatkT.relations = [this.pAtk]; // 武器物攻转化率：物攻
    this.weaponMatkT.relations = [this.mAtk]; // 武器魔攻转化率：魔攻
    this.mainWeapon.baseAtk.relations = [this.mainWeaponAtk]; // 主武器基础攻击值：主武器性能
    this.subWeapon.baseAtk.relations = [this.subWeaponAtk]; // 副武器基础攻击值：副武器性能
    this.bodyArmor.baseDef.relations = []; // 身体装备基础防御值：
    this.str.relations = [this.pCd, this.pAtk, this.pStab, this.aspd]; // 力量：物理爆伤、物理攻击、物理稳定、攻速
    this.int.relations = [this.maxMp, this.pAtk, this.mAtk, this.aspd, this.pStab]; // 智力：最大魔法值、物理攻击、魔法攻击、攻速、物理稳定
    this.vit.relations = [this.maxHp]; // 耐力：最大生命值
    this.agi.relations = [this.pAtk, this.mAtk, this.pCd, this.aspd, this.cspd]; // 敏捷：物理攻击、魔法攻击、物理爆伤、攻速、咏唱速度
    this.dex.relations = [this.pAtk, this.mAtk, this.pStab, this.aspd, this.cspd]; // 灵巧：物理攻击、魔法攻击、物理稳定、攻速、咏唱速度
    this.luk.relations = [];
    this.tec.relations = [];
    this.men.relations = [];
    this.cri.relations = [];

    this.maxHp.relations = [this.hp];
    this.maxMp.relations = [this.mp];
    this.pCr.relations = [];
    this.pCd.relations = [];
    this.mainWeaponAtk.relations = [this.weaponAtk];
    this.subWeaponAtk.relations = [this.weaponAtk];
    this.weaponAtk.relations = [this.pAtk, this.mAtk];
    this.pAtk.relations = [];
    this.mAtk.relations = [];
    this.aspd.relations = [this.am];
    this.cspd.relations = [this.cm];

    this.pPie.relations = [];
    this.mPie.relations = [];
    this.pStab.relations = [];
    this.nDis.relations = [];
    this.fDis.relations = [];
    this.crT.relations = [];
    this.cdT.relations = [];
    this.uAtk.relations = [];
    this.total.relations = [];
    this.final.relations = [];

    this.am.relations = [];
    this.cm.relations = [];
    this.aggro.relations = [];
    this.ampr.relations = [];

    this.hp.relations = [];
    this.mp.relations = [];

    // 添加加成项
    characterModifiersApplicator(config, this);
    console.log("CharacterData实例化完毕：", _.cloneDeep(this));
  }
}

export class MonsterData {
  name: string;
  lv: number;
  hp: modifiers;
  pDef: modifiers;
  pRes: modifiers;
  mDef: modifiers;
  mRes: modifiers;
  cRes: modifiers;
  [key: string]: object | string | number;
  constructor(monster: SelectMonster) {
    this.name = monster.name;
    this.lv = monster.baseLv ?? 0;
    this.pDef = new modifiers(ModifierType.DEFAULT, monster.physicalDefense ?? 0);
    this.pRes = new modifiers(ModifierType.DEFAULT, monster.physicalResistance ?? 0);
    this.mDef = new modifiers(ModifierType.DEFAULT, monster.magicalDefense ?? 0);
    this.mRes = new modifiers(ModifierType.DEFAULT, monster.magicalResistance ?? 0);
    this.cRes = new modifiers(ModifierType.DEFAULT, monster.criticalResistance ?? 0);
    this.hp = new modifiers(ModifierType.DEFAULT, monster.maxhp ?? 0);
  }
}

enum SkillEffectType {
  Normal = "normal",
  Chanting = "chanting",
  Charging = "charging",
  Both = "both",
}

export class SkillData {
  index: number;
  name: string;
  lv: number;
  am: modifiers;
  cm: modifiers;
  vMatk: modifiers;
  vPatk: modifiers;
  skillEffectType: SkillEffectType;
  actionFixedDuration: number;
  actionModifiableDuration: number;
  chantingFixedDuration: number;
  chantingModifiableDuration: number;
  chargingFixedDuration: number;
  chargingModifiableDuration: number;
  skillActionFrames: number;
  skillChantingFrames: number;
  skillChargingFrames: number;
  skillDuration: number;
  skillStartupFrames: number;
  [key: string]: object | string | number;
  constructor(
    Index: number,
    skill: tSkill,
    scope: { p: CharacterData } & Scope,
    passedFrames: number,
    eventSequence: eventSequenceType[],
  ) {
    console.log("开始实例化SkillData");
    this.index = Index;
    this.name = skill.name;
    this.lv = skill.level ?? 0;
    this.vMatk = new modifiers(
      ModifierType.MAGICAL_ATK,
      ((dynamicTotalValue(scope.p.mAtk) + scope.p.lv - scope.m.lv) * (100 - dynamicTotalValue(scope.m.mRes))) / 100 -
        ((100 - dynamicTotalValue(scope.p.mPie)) / 100) * dynamicTotalValue(scope.m.mDef),
    );
    this.vPatk = new modifiers(
      ModifierType.PHYSICAL_ATK,
      ((dynamicTotalValue(scope.p.pAtk) + scope.p.lv - scope.m.lv) * (100 - dynamicTotalValue(scope.m.pRes))) / 100 -
        ((100 - dynamicTotalValue(scope.p.pPie)) / 100) * dynamicTotalValue(scope.m.pDef),
    );
    this.am = new modifiers(ModifierType.DEFAULT, dynamicTotalValue(scope.p.am));
    this.cm = new modifiers(ModifierType.DEFAULT, dynamicTotalValue(scope.p.cm));
    scope.s = this;
    // 封装当前状态的公式计算方法
    const cEvaluate = (formula: string) => {
      return math.evaluate(formula, { ...JSON.parse(JSON.stringify(scope)) }) as number | void;
    };
    // 动作
    this.actionFixedDuration = cEvaluate(skill.skillEffect.actionBaseDurationFormula) as number;
    this.actionModifiableDuration = cEvaluate(skill.skillEffect.actionModifiableDurationFormula) as number;
    // 咏唱
    this.chantingFixedDuration = cEvaluate(skill.skillEffect.chantingBaseDurationFormula) as number;
    this.chantingModifiableDuration = cEvaluate(skill.skillEffect.chantingModifiableDurationFormula) as number;
    // 蓄力
    this.chargingFixedDuration = cEvaluate(skill.skillEffect.chargingBaseDurationFormula) as number;
    this.chargingModifiableDuration = cEvaluate(skill.skillEffect.chargingModifiableDurationFormula) as number;
    this.skillEffectType =
      this.chantingFixedDuration + this.chantingModifiableDuration > 0
        ? this.chantingFixedDuration + this.chantingModifiableDuration > 0
          ? SkillEffectType.Both
          : SkillEffectType.Chanting
        : this.chargingFixedDuration + this.chargingModifiableDuration > 0
          ? SkillEffectType.Charging
          : SkillEffectType.Normal;
    this.skillActionFrames = floor(
      this.actionFixedDuration + (this.actionModifiableDuration * (100 - min(dynamicTotalValue(this.am), 50))) / 100,
    );
    this.skillChantingFrames = floor(
      this.chantingFixedDuration +
        (this.chantingModifiableDuration * (100 - min(dynamicTotalValue(this.cm), 50))) / 100,
    );
    this.skillChargingFrames = floor(
      this.chargingFixedDuration +
        (this.chargingModifiableDuration * (100 - min(dynamicTotalValue(this.cm), 50))) / 100,
    );
    this.skillDuration = this.skillActionFrames + this.skillChantingFrames * fps;
    // 计算技能前摇
    const skillStartupFramesComputer = (
      skillStartupFramesFormula: string | null,
      skillDuration: number,
      scope: Scope,
    ) => {
      if (!skillStartupFramesFormula) {
        console.log("未注明前摇值，默认为技能总时长：" + skillDuration + "帧");
        return skillDuration;
      }
      // 判断前摇计算公式是否包含百分比符号，未注明前摇时长的技能效果都默认在技能动画执行3/4后生效
      const perMatch = skillStartupFramesFormula.match(/^([\s\S]+?)\s*(%?)$/);
      if (perMatch) {
        // 表达式非空时
        if (perMatch[2] === "%") {
          // console.log("技能前摇表达式为百分比形式");
          if (perMatch[1]) {
            // 尝试计算表达式结果
            const result = math.evaluate(perMatch[1], scope) as number;
            if (result) {
              // console.log("前摇百分比表达式计算结果", result);
              return floor((skillDuration * result) / 100);
            } else {
              // console.log("前摇百分比表达式计算结果为空，默认为技能总时长：" + skillTotalFrame * 3/4  + "帧");
              return floor((skillDuration * 3) / 4);
            }
          }
        } else {
          if (perMatch[1]) {
            const result = math.evaluate(perMatch[1], scope) as number;
            if (result) {
              // console.log("前摇常数表达式计算结果", result);
              return floor(result);
            } else {
              // console.log("前摇常数表达式计算结果为空，默认为技能总时长：" + skillTotalFrame *3/4 + "帧");
              return floor((skillDuration * 3) / 4);
            }
          } else {
            console.log("perMatch[1]为空");
          }
        }
      } else {
        console.log("未注明前摇值，默认为技能总时长：" + floor((skillDuration * 3) / 4) + "帧");
      }
      return floor((skillDuration * 3) / 4);
    };
    this.skillStartupFrames = skillStartupFramesComputer(
      skill.skillEffect.skillStartupFramesFormula,
      this.skillDuration,
      scope,
    );
    scope.s = _.cloneDeep(this);
    console.log("向事件队列添加此技能效果");
    skill.skillEffect.skillYield.forEach((yield_) => {
      let baseCondition = yield_.mutationTimingFormula;
      if (yield_.mutationTimingFormula === "null" || !yield_.mutationTimingFormula) {
        baseCondition = "true";
      }
      eventSequence.push(
        _.cloneDeep({
          state: EventStatus.Pending,
          type: yield_.yieldType,
          behavior: yield_.yieldFormula,
          condition: "frame > " + (passedFrames + this.skillStartupFrames - 2) + " and " + baseCondition,
          origin: skill.name,
          registrationFrame: passedFrames,
        }),
      );
      console.log(
        "已将" + skill.name + "的技能效果：" + yield_.yieldFormula,
        "添加到事件队列，当前队列为：",
        _.cloneDeep(eventSequence),
      );
    });
    console.log("SkillData实例化完毕", _.cloneDeep(this));
  }
}

enum characterStatus {
  Free = "free",
  Chanting = "chanting",
  Charging = "charging",
  Channeling = "channeling",
  Startup = "startup",
  Recovery = "recovery",
}

// 角色每帧下的状态
export class CharacterState {
  index: number;
  frame: number;
  name: string;
  state: characterStatus;
  scope: Scope;
  actionIndex: number;
  actionFrameIndex: number;
  characterData: CharacterData;
  skillData: SkillData;
  eventSequence: eventSequenceType[];
  cEvaluate: (formula: string) => number | void;
  constructor(
    dictionary: ReturnType<typeof getDictionary>,
    scope: Scope,
    character: SelectCharacter,
    skill: tSkill,
    frame: number,
    index: number,
  ) {
    console.log("实例化角色状态类：", character.name, "序号：", index);
    this.index = index;
    this.frame = frame;
    this.name = character.name;
    this.state = characterStatus.Startup;
    this.actionIndex = 0;
    this.actionFrameIndex = 0;
    this.eventSequence = [];
    this.characterData = new CharacterData(dictionary, character);
    this.scope = scope;
    // 将角色数据传入作用域
    this.scope.p = this.characterData;
    this.skillData = new SkillData(
      this.actionIndex,
      skill,
      scope as { p: CharacterData } & Scope,
      scope.frame,
      this.eventSequence,
    );
    // 将技能数据传入作用域
    this.scope.s = this.skillData;
    this.cEvaluate = (formula: string) =>
      math.evaluate(formula, { ...JSON.parse(JSON.stringify(this.scope)) }) as number | void;
  }

  public computeEvent() {
    const newEventSequence: eventSequenceType[] = this.eventSequence.map((event, eventIndex) => {
      if (event.state !== EventStatus.Completed) {
        console.log("第 " + eventIndex + " 个事件：", event);
        if (this.cEvaluate(event.condition)) {
          // 执行当前帧需要做的事
          console.log("条件成立，事件行为表达式：" + event.behavior);
          const node = parse(event.behavior);
          const nodeString = node.toString();
          switch (node.type) {
            case "AssignmentNode":
              {
                const attr = nodeString.substring(0, nodeString.indexOf("=")).trim();
                const formulaStr = nodeString.substring(nodeString.indexOf("=") + 1, nodeString.length).trim();
                console.log("发现赋值节点：" + nodeString);
                console.log("赋值对象路径：", attr);
                const formulaFrameData = this.cEvaluate(formulaStr) as number;
                console.log("赋值表达式只允许修改基础值，表达式结果：", formulaFrameData);
                const modifier = new modifiers(ModifierType.DEFAULT);
                if (_.isNumber(formulaFrameData)) {
                  modifier.baseValue = formulaFrameData;
                }
                _.set(this.scope, attr, modifier);
              }
              break;

            default:
              applyModifiers(event.behavior, event.origin, this.scope);
              break;
          }
          // 不论是否已执行，将持续型事件加入后续队列
          if (event.type === "PersistentEffect") {
            console.log("由于类型为持续型事件，标记为正在执行");
            return {
              ...event,
              state: EventStatus.InProgress,
            };
          } else {
            console.log("由于类型为单次事件，标记为已执行");
            return {
              ...event,
              state: EventStatus.Completed,
            };
          }
        } else {
          console.log("条件不成立，将事件保留");
          // 条件不成立，则不分类型直接放入后续队列
          return event;
        }
      }
      return event;
    });
    this.eventSequence = _.cloneDeep(newEventSequence);
  }

  public updateState() {
    const chantingTime = this.skillData.skillStartupFrames + this.skillData.skillChantingFrames;
    const chargingTime = this.skillData.skillStartupFrames + this.skillData.skillChargingFrames;
    switch (this.skillData.skillEffectType) {
      case SkillEffectType.Chanting:
        {
          if (this.skillData.skillStartupFrames - this.actionFrameIndex > 0) {
            this.state = characterStatus.Startup;
          } else if (chantingTime - this.actionFrameIndex > 0) {
            this.state = characterStatus.Chanting;
          } else {
            this.state = characterStatus.Recovery;
          }
        }
        break;
      case SkillEffectType.Charging:
        {
          if (this.skillData.skillStartupFrames - this.actionFrameIndex > 0) {
            this.state = characterStatus.Startup;
          } else if (chargingTime - this.actionFrameIndex > 0) {
            this.state = characterStatus.Charging;
          } else {
            this.state = characterStatus.Recovery;
          }
        }
        break;
      case SkillEffectType.Both:
        {
          if (this.skillData.skillStartupFrames - this.actionFrameIndex > 0) {
            this.state = characterStatus.Startup;
          } else if (this.actionFrameIndex - chantingTime - chargingTime > 0) {
            this.state = characterStatus.Recovery;
          } else {
            this.state = characterStatus.Channeling;
          }
        }
        break;

      default:
        {
          if (this.skillData.skillStartupFrames - this.actionFrameIndex > 0) {
            this.state = characterStatus.Startup;
          } else {
            this.state = characterStatus.Recovery;
          }
        }
        break;
    }
  }

  public nextAction(actionQueue: tSkill[]) {
    this.state = characterStatus.Startup;
    this.scope.p = this.characterData;
    this.actionIndex += 1;
    this.actionFrameIndex = 0;
    const skill = actionQueue[this.actionIndex];
    if (skill) {
      this.skillData = new SkillData(
        this.actionIndex,
        skill,
        this.scope as { p: CharacterData } & Scope,
        this.scope.frame,
        this.eventSequence,
      );
    } else {
      console.log("角色行动结束");
    }
  }
}

export type FrameData = {
  frame: number;
  teamState: (CharacterState | null)[];
  monsterData: MonsterData;
};

type Scope = {
  frame: number;
  p?: CharacterData;
  m: MonsterData;
  s?: SkillData;
};

export const compute = (
  dictionary: ReturnType<typeof getDictionary>,
  team: {
    config: SelectCharacter;
    actionQueue: tSkill[];
  }[],
  monster: SelectMonster,
) => {
  // 定义存储数据的结构
  let frame = 0;
  const result: FrameData[] = [];
  console.log("实例化怪物：", monster.name);
  const monsterData = new MonsterData(monster);
  const scope: Scope = {
    frame: frame,
    m: monsterData,
  };
  console.log("初始化teamData");
  const teamData = team.map((c, cIndex) => {
    const characterState = new CharacterState(dictionary, scope, c.config, c.actionQueue[0]!, frame, cIndex);
    const actionQueue = c.actionQueue;
    return {
      characterState: characterState,
      actionQueue: actionQueue,
    };
  });

  // 开始逐帧计算
  for (; frame < 7200; frame++) {
    scope.frame = frame;
    // 发送进度
    self.postMessage({
      type: "progress",
      computeResult: "正在计算第" + frame + "帧",
    } satisfies computeOutput);

    if (dynamicTotalValue(scope.m.hp) <= 0) {
      console.log("怪物已死亡");
      break;
    }

    const teamState: (CharacterState | null)[] = [];
    console.log("===  第 " + frame + " 帧  ===");
    teamData.forEach((c, cIndex) => {
      const characterState = c.characterState;
      const actionQueue = c.actionQueue;
      console.log("第 " + cIndex + " 位角色：", characterState.name);
      // 向scope中添加角色数据
      scope.p = c.characterState.characterData;
      characterState.actionFrameIndex++;
      if (scope.p) {
        // 先执行事件队列
        characterState.computeEvent();
        characterState.updateState();

        // 依据帧修改角色状态
        if (characterState.actionFrameIndex === characterState.skillData.skillDuration) {
          console.log("技能：", characterState.skillData.name, "结束");
          if (characterState.actionIndex <= actionQueue.length) {
            characterState.nextAction(actionQueue);
          } else {
            console.log(characterState.name + "行为序列结束");
          }
        }
      }
      if (characterState.actionIndex < actionQueue.length) {
        teamState.push(characterState);
      } else {
        teamState.push(null);
      }
    });

    const isAllMemberFree = teamData.every((member) => member.characterState.actionIndex >= member.actionQueue.length);
    if (isAllMemberFree) {
      console.log("所有队员行动结束");
      break;
    }
    result.push({
      frame,
      teamState: _.cloneDeep(teamState),
      monsterData: _.cloneDeep(monsterData),
    });
  }

  return result;
};

const self = globalThis;

self.onmessage = (e: MessageEvent<computeInput>) => {
  console.log("收到消息：", e.data);
  switch (e.data.type) {
    case "start":
      {
        // 接收消息
        if (e.data.arg) {
          const { dictionary, monster, team } = e.data.arg;
          // 执行计算
          const result = compute(dictionary, team, monster);
          console.log("计算结果：", result);
          // 发送结果
          self.postMessage({
            type: "success",
            // 需要过滤掉其中的函数属性
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            computeResult: JSON.parse(JSON.stringify(result)),
          } satisfies computeOutput);
        }
      }

      break;
    case "stop":
      {
        console.log("收到停止消息");
      }
      break;

    default:
      {
        // Handle any cases that are not explicitly mentioned
        // console.error("Unhandled message type:", e);
      }
      break;
  }
};
