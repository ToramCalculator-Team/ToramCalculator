import { Component, createSignal, createEffect, createMemo, createResource } from "solid-js";
import { create, all } from "mathjs";
import { MainHandType, SubHandType } from "@db/schema/enums";
import { CharacterWithRelations, findCharacterWithRelations } from "@db/repositories/character";

// 机体属性
enum CharacterAttrEnum {
  LV, // 等级
  // 能力值
  STR, // 力量
  INT, // 智力
  VIT, // 耐力
  AGI, // 敏捷
  DEX, // 灵巧
  LUK, // 幸运
  TEC, // 技巧
  MEN, // 异抗
  CRI, // 暴击
  // 基础属性
  MAX_MP, // 最大MP
  MP, // MP
  AGGRO, // 仇恨值
  WEAPON_RANGE, // 武器射程
  HP_REGEN, // HP自然回复
  MP_REGEN, // MP自然回复
  MP_ATK_REGEN, // MP攻击回复
  // 单次伤害增幅
  PHYSICAL_ATK, // 物理攻击
  MAGICAL_ATK, // 魔法攻击
  WEAPON_ATK, // 武器攻击
  UNSHEATHE_ATK, // 拔刀攻击
  PHYSICAL_PIERCE, // 物理贯穿
  MAGICAL_PIERCE, // 魔法贯穿
  PHYSICAL_CRITICAL_RATE, // 暴击率
  PHYSICAL_CRITICAL_DAMAGE, // 暴击伤害
  MAGICAL_CRT_CONVERSION_RATE, // 魔法暴击转化率
  MAGICAL_CRT_DAMAGE_CONVERSION_RATE, // 魔法爆伤转化率
  MAGICAL_CRITICAL_RATE, // 魔法暴击率
  MAGICAL_CRITICAL_DAMAGE, // 魔法暴击伤害
  SHORT_RANGE_DAMAGE, // 近距离威力
  LONG_RANGE_DAMAGE, // 远距离威力
  STRONGER_AGAINST_NETURAL, // 对无属性增强
  STRONGER_AGAINST_Light, // 对光属性增强
  STRONGER_AGAINST_Dark, // 对暗属性增强
  STRONGER_AGAINST_Water, // 对水属性增强
  STRONGER_AGAINST_Fire, // 对火属性增强
  STRONGER_AGAINST_Earth, // 对地属性增强
  STRONGER_AGAINST_Wind, // 对风属性增强
  TOTAL_DAMAGE, // 总伤害
  FINAL_DAMAGE, // 最终伤害
  PHYSICAL_STABILITY, // 稳定率
  MAGIC_STABILITY, // 魔法稳定率
  ACCURACY, // 命中
  ADDITIONAL_PHYSICS, // 物理追击
  ADDITIONAL_MAGIC, // 魔法追击
  ANTICIPATE, // 看穿
  GUARD_BREAK, // 破防
  REFLECT, // 反弹伤害
  ABSOLUTA_ACCURACY, // 绝对命中
  ATK_UP_STR, // 物理攻击提升（力量）
  ATK_UP_INT, // 物理攻击提升（智力）
  ATK_UP_VIT, // 物理攻击提升（耐力）
  ATK_UP_AGI, // 物理攻击提升（敏捷）
  ATK_UP_DEX, // 物理攻击提升（灵巧）
  MATK_UP_STR, // 魔法攻击提升（力量）
  MATK_UP_INT, // 魔法攻击提升（智力）
  MATK_UP_VIT, // 魔法攻击提升（耐力）
  MATK_UP_AGI, // 魔法攻击提升（敏捷）
  MATK_UP_DEX, // 魔法攻击提升（灵巧）
  ATK_DOWN_STR, // 物理攻击下降（力量）
  ATK_DOWN_INT, // 物理攻击下降（智力）
  ATK_DOWN_VIT, // 物理攻击下降（耐力）
  ATK_DOWN_AGI, // 物理攻击下降（敏捷）
  ATK_DOWN_DEX, // 物理攻击下降（灵巧）
  MATK_DOWN_STR, // 魔法攻击下降（力量）
  MATK_DOWN_INT, // 魔法攻击下降（智力）
  MATK_DOWN_VIT, // 魔法攻击下降（耐力）
  MATK_DOWN_AGI, // 魔法攻击下降（敏捷）
  MATK_DOWN_DEX, // 魔法攻击下降（灵巧）
  // 生存能力加成
  MAX_HP, // 最大HP
  HP, // 当前HP
  BODYARMOR_DEF, // 身体装备防御
  PHYSICAL_DEF, // 物理防御
  MAGICAL_DEF, // 魔法防御
  PHYSICAL_RESISTANCE, // 物理抗性
  MAGICAL_RESISTANCE, // 魔法抗性
  NEUTRAL_RESISTANCE, // 无属性抗性
  Light_RESISTANCE, // 光属性抗性
  Dark_RESISTANCE, // 暗属性抗性
  Water_RESISTANCE, // 水属性抗性
  Fire_RESISTANCE, // 火属性抗性
  Earth_RESISTANCE, // 地属性抗性
  Wind_RESISTANCE, // 风属性抗性
  DODGE, // 回避
  AILMENT_RESISTANCE, // 异常抗性
  GUARD_POWER, // 格挡力
  GUARD_RECHANGE, // 格挡回复
  EVASION_RECHARGE, // 闪躲回复
  PHYSICAL_BARRIER, // 物理屏障
  MAGICAL_BARRIER, // 魔法屏障
  FRACTIONAL_BARRIER, // 百分比瓶屏障
  BARRIER_COOLDOWN, // 屏障回复速度
  REDUCE_DMG_FLOOR, // 地面伤害减轻（地刺）
  REDUCE_DMG_METEOR, // 陨石伤害减轻（天火）
  REDUCE_DMG_PLAYER_EPICENTER, // 范围伤害减轻（以玩家为中心的范围伤害）
  REDUCE_DMG_FOE_EPICENTER, // 敌方周围伤害减轻（以怪物自身为中心的范围伤害）
  REDUCE_DMG_BOWLING, // 贴地伤害减轻（剑气、风刃）
  REDUCE_DMG_BULLET, // 子弹伤害减轻（各种球）
  REDUCE_DMG_STRAIGHT_LINE, // 直线伤害减轻（激光）
  REDUCE_DMG_CHARGE, // 冲撞伤害减轻（怪物的位移技能）
  ABSOLUTE_DODGE, // 绝对回避
  // 速度加成
  ASPD, // 攻击速度
  MSPD, // 行动速度
  MSRD, // 动作缩减
  CSPD, // 咏唱速度
  CSRD, // 咏唱缩减
  // 其他加成
  DROP_RATE, // 掉宝率
  REVIVE_TIME, // 复活时间
  FLINCH_UNAVAILABLE, // 封印胆怯
  TUMBLE_UNAVAILABLE, // 封印翻覆
  STUN_UNAVAILABLE, // 封印昏厥
  INVINCIBLE_AID, // 无敌急救
  EXP_RATE, // 经验加成
  PET_EXP, // 宠物经验
  ITEM_COOLDOWN, // 道具冷却
  RECOIL_DAMAGE, // 反作用伤害
  GEM_POWDER_DROP, // 晶石粉末掉落
  // 中间数值
  WEAPON_MATK_CONVERSION_RATE, // 主武器魔法攻击转换率
  WEAPON_ATK_CONVERSION_RATE, // 主武器物理攻击转换率
  MAINWEAPON_BASE_VALUE, // 主武器基础值
  MAINWEAPON_ATK, // 主武器攻击
  SUBWEAPON_BASE_VALUE, // 副武器基础值
  SUBWEAPON_ATK, // 副武器攻击
  BODYARMOR_BASE_VALUE, // 防具基础值
}
type CharacterAttrType = keyof typeof CharacterAttrEnum;

// 怪物属性
enum mobAttrEnum {
  default,
  physicalAtk, // 物理攻击
  magicalAtk, // 魔法攻击
  criticalRate, // 暴击率
  criticalDamage, // 暴击伤害
  stability, // 稳定率
  accuracy, // 命中
  maxHp, // 最大HP
  physicalDef, // 物理防御
  magicalDef, // 魔法防御
  physicalResistance, // 物理抗性
  magicalResistance, // 魔法抗性
  neutralResistance, // 无属性抗性
  lightResistance, // 光属性抗性
  darkResistance, // 暗属性抗性
  waterResistance, // 水属性抗性
  fireResistance, // 火属性抗性
  earthResistance, // 地属性抗性
  windResistance, // 风属性抗性
  dodge, // 回避
  ailmentResistance, // 异常抗性
  baseGuardPower, // 基础格挡力
  guardPower, // 格挡力
  baseGuardRecharge, // 基础格挡回复
  guardRechange, // 格挡回复
  evasionRecharge, // 闪躲回复
  aspd, // 攻击速度
  cspd, // 咏唱速度
  mspd, // 行动速度
}
type mobAttrType = keyof typeof mobAttrEnum;

// 技能属性
enum SkillAttrEnum {}
type SkillModifierType = keyof typeof SkillAttrEnum;

// 属性类型
type AttrType = CharacterAttrType | mobAttrType | SkillModifierType;

// 数值来源

// 主武器类型
type SourceName = AttrType | "SYSTEM";

// 主武器的属性转换映射
const MainWeaponAbiT: Record<
  MainHandType,
  {
    baseHit: number;
    baseAspd: number;
    weaAtk_Matk_Convert: number;
    weaAtk_Patk_Convert: number;
    abi_Attr_Convert: Record<
      "str" | "int" | "agi" | "dex",
      { pAtkC: number; mAtkC: number; aspdC: number; pStabC: number }
    >;
  }
> = {
  OneHandSword: {
    baseHit: 0.25,
    baseAspd: 100,
    abi_Attr_Convert: {
      str: {
        pAtkC: 2,
        pStabC: 0.025,
        aspdC: 0.2,
        mAtkC: 0,
      },
      int: {
        mAtkC: 3,
        pAtkC: 0,
        aspdC: 0,
        pStabC: 0,
      },
      agi: {
        aspdC: 4.2,
        pAtkC: 0,
        mAtkC: 0,
        pStabC: 0,
      },
      dex: {
        pAtkC: 2,
        pStabC: 0.075,
        mAtkC: 0,
        aspdC: 0,
      },
    },
    weaAtk_Matk_Convert: 0,
    weaAtk_Patk_Convert: 1,
  },
  Katana: {
    baseHit: 0.3,
    baseAspd: 200,
    abi_Attr_Convert: {
      str: {
        pAtkC: 1.5,
        pStabC: 0.075,
        aspdC: 0.3,
        mAtkC: 0,
      },
      int: {
        mAtkC: 1.5,
        pAtkC: 0,
        aspdC: 0,
        pStabC: 0,
      },
      agi: {
        aspdC: 3.9,
        pAtkC: 0,
        mAtkC: 0,
        pStabC: 0,
      },
      dex: {
        pAtkC: 2.5,
        pStabC: 0.025,
        mAtkC: 0,
        aspdC: 0,
      },
    },
    weaAtk_Matk_Convert: 0,
    weaAtk_Patk_Convert: 1,
  },
  TwoHandSword: {
    baseHit: 0.15,
    baseAspd: 50,
    abi_Attr_Convert: {
      str: {
        pAtkC: 3,
        aspdC: 0.2,
        mAtkC: 0,
        pStabC: 0,
      },
      int: {
        mAtkC: 3,
        pAtkC: 0,
        aspdC: 0,
        pStabC: 0,
      },
      agi: {
        aspdC: 2.2,
        pAtkC: 0,
        mAtkC: 0,
        pStabC: 0,
      },
      dex: {
        pAtkC: 1,
        pStabC: 0.1,
        mAtkC: 0,
        aspdC: 0,
      },
    },
    weaAtk_Matk_Convert: 0,
    weaAtk_Patk_Convert: 1,
  },
  Bow: {
    baseHit: 0.1,
    baseAspd: 75,
    abi_Attr_Convert: {
      str: {
        pAtkC: 1,
        pStabC: 0.05,
        mAtkC: 0,
        aspdC: 0,
      },
      int: {
        mAtkC: 3,
        pAtkC: 0,
        aspdC: 0,
        pStabC: 0,
      },
      agi: {
        aspdC: 3.1,
        pAtkC: 0,
        mAtkC: 0,
        pStabC: 0,
      },
      dex: {
        pAtkC: 3,
        pStabC: 0.05,
        aspdC: 0.2,
        mAtkC: 0,
      },
    },
    weaAtk_Matk_Convert: 0,
    weaAtk_Patk_Convert: 1,
  },
  Bowgun: {
    baseHit: 0.05,
    baseAspd: 100,
    abi_Attr_Convert: {
      str: {
        pStabC: 0.05,
        pAtkC: 0,
        mAtkC: 0,
        aspdC: 0,
      },
      int: {
        mAtkC: 3,
        pAtkC: 0,
        aspdC: 0,
        pStabC: 0,
      },
      agi: {
        aspdC: 2.2,
        pAtkC: 0,
        mAtkC: 0,
        pStabC: 0,
      },
      dex: {
        pAtkC: 4,
        aspdC: 0.2,
        mAtkC: 0,
        pStabC: 0,
      },
    },
    weaAtk_Matk_Convert: 0,
    weaAtk_Patk_Convert: 1,
  },
  Rod: {
    baseHit: 0.3,
    baseAspd: 60,
    abi_Attr_Convert: {
      str: {
        pAtkC: 3,
        pStabC: 0.05,
        mAtkC: 0,
        aspdC: 0,
      },
      int: {
        mAtkC: 4,
        pAtkC: 1,
        aspdC: 0.2,
        pStabC: 0,
      },
      agi: {
        aspdC: 1.8,
        pAtkC: 0,
        mAtkC: 0,
        pStabC: 0,
      },
      dex: {
        aspdC: 0.2,
        pAtkC: 0,
        mAtkC: 0,
        pStabC: 0,
      },
    },
    weaAtk_Matk_Convert: 1,
    weaAtk_Patk_Convert: 1,
  },
  Magictool: {
    baseHit: 0.1,
    baseAspd: 90,
    abi_Attr_Convert: {
      str: {
        pAtkC: 0,
        mAtkC: 0,
        aspdC: 0,
        pStabC: 0,
      },
      int: {
        mAtkC: 4,
        pAtkC: 2,
        aspdC: 0.2,
        pStabC: 0,
      },
      agi: {
        pAtkC: 2,
        aspdC: 4,
        mAtkC: 0,
        pStabC: 0,
      },
      dex: {
        pStabC: 0.1,
        pAtkC: 0,
        mAtkC: 1,
        aspdC: 0,
      },
    },
    weaAtk_Matk_Convert: 1,
    weaAtk_Patk_Convert: 1,
  },
  Knuckle: {
    baseHit: 0.1,
    baseAspd: 120,
    abi_Attr_Convert: {
      str: {
        aspdC: 0.1,
        pAtkC: 0,
        mAtkC: 0,
        pStabC: 0,
      },
      int: {
        mAtkC: 4,
        pAtkC: 0,
        aspdC: 0,
        pStabC: 0,
      },
      agi: {
        pAtkC: 2,
        aspdC: 4.6,
        mAtkC: 0,
        pStabC: 0,
      },
      dex: {
        pAtkC: 0.5,
        pStabC: 0.025,
        mAtkC: 0,
        aspdC: 0.1,
      },
    },
    weaAtk_Matk_Convert: 0.5,
    weaAtk_Patk_Convert: 1,
  },
  Halberd: {
    baseHit: 0.25,
    baseAspd: 20,
    abi_Attr_Convert: {
      str: {
        pAtkC: 2.5,
        pStabC: 0.05,
        aspdC: 0.2,
        mAtkC: 0,
      },
      int: {
        mAtkC: 2,
        pAtkC: 0,
        aspdC: 0,
        pStabC: 0,
      },
      agi: {
        aspdC: 3.5,
        pAtkC: 1.5,
        mAtkC: 1,
        pStabC: 0,
      },
      dex: {
        pStabC: 0.05,
        pAtkC: 0,
        mAtkC: 0,
        aspdC: 0,
      },
    },
    weaAtk_Matk_Convert: 0,
    weaAtk_Patk_Convert: 1,
  },
  None: {
    baseHit: 50,
    baseAspd: 1000,
    abi_Attr_Convert: {
      str: {
        pAtkC: 1,
        mAtkC: 0,
        aspdC: 0,
        pStabC: 0,
      },
      int: {
        mAtkC: 3,
        pAtkC: 0,
        aspdC: 0,
        pStabC: 0,
      },
      agi: {
        aspdC: 9.6,
        pAtkC: 0,
        mAtkC: 0,
        pStabC: 0,
      },
      dex: {
        pAtkC: 0,
        mAtkC: 0,
        aspdC: 0,
        pStabC: 0,
      },
    },
    weaAtk_Matk_Convert: 0,
    weaAtk_Patk_Convert: 1,
  },
};

// 副武器的属性转换映射
const SubWeaponModifier: Record<SubHandType, {}> = {
  None: {},
  OneHandSword: {},
  Magictool: {},
  Knuckle: {},
  Katana: {},
  Arrow: {},
  ShortSword: {},
  NinjutsuScroll: {},
  Shield: {},
};

// 数值来源
const enum ValueType {
  system,
  user,
  both,
}

// 数值的作用位置
const enum TargetType {
  baseValue,
  staticConstant,
  staticPercentage,
  dynamicConstant,
  dynamicPercentage,
}

// 属性修改器
interface ModifiersData {
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
}

// 属性数据
interface AttrData {
  name: CharacterAttrEnum | mobAttrEnum | SkillAttrEnum;
  baseValue:
    | number
    | {
        value: number;
        sourceName: SourceName;
        source: CharacterAttrEnum | mobAttrEnum | SkillAttrEnum | "SYSTEM";
      }[];
  modifiers: ModifiersData;
}

// 角色属性数据
interface CharacterAttrData extends AttrData {
  type: ValueType;
  name: CharacterAttrEnum;
  baseValue:
    | number
    | {
        value: number;
        sourceName: CharacterAttrType | "SYSTEM";
        source: CharacterAttrEnum | "SYSTEM";
      }[];
  influences: {
    name: CharacterAttrType;
    targetType: TargetType;
    computation: () => number;
  }[];
}

// 参数统计方法
const baseValue = (m: AttrData | undefined): number => {
  if (!m) throw new Error("传入的属性无法计算");
  if (m.name === CharacterAttrEnum.MAGICAL_PIERCE || m.name === CharacterAttrEnum.PHYSICAL_PIERCE) return 100;
  if (typeof m.baseValue === "number") return m.baseValue;
  let sum = 0;
  for (let i = 0; i < m.baseValue.length; i++) {
    sum += m.baseValue[i].value;
  }
  return sum;
};
const staticFixedValue = (m: AttrData): number => {
  const fixedArray = m.modifiers.static.fixed.map((mod) => mod.value);
  return fixedArray.reduce((a, b) => a + b, 0);
};
const dynamicFixedValue = (m: AttrData): number => {
  let value = 0;
  if (m.modifiers.dynamic?.fixed) {
    const fixedArray = m.modifiers.dynamic.fixed.map((mod) => mod.value);
    value = fixedArray.reduce((a, b) => a + b, 0) + staticFixedValue(m);
  }
  return value;
};
const staticPercentageValue = (m: AttrData): number => {
  const percentageArray = m.modifiers.static.percentage.map((mod) => mod.value);
  return percentageArray.reduce((a, b) => a + b, 0);
};
const dynamicPercentageValue = (m: AttrData): number => {
  let value = 0;
  if (m.modifiers.dynamic?.percentage) {
    const percentageArray = m.modifiers.dynamic.percentage.map((mod) => mod.value);
    value = percentageArray.reduce((a, b) => a + b, 0) + staticPercentageValue(m);
  }
  return value;
};
const staticTotalValue = (m: AttrData): number => {
  const base = baseValue(m);
  const fixed = staticFixedValue(m);
  const percentage = staticPercentageValue(m);
  return base * (1 + percentage / 100) + fixed;
};
const dynamicTotalValue = (m: AttrData | undefined): number => {
  if (!m) throw new Error("传入的属性无法计算");
  const base = baseValue(m);
  const fixed = dynamicFixedValue(m);
  const percentage = dynamicPercentageValue(m);
  if (m.name === CharacterAttrEnum.MAGICAL_PIERCE || m.name === CharacterAttrEnum.PHYSICAL_PIERCE) {
    return Math.floor(base * (1 + percentage / 100) + fixed - 100);
  }
  return Math.floor(base * (1 + percentage / 100) + fixed);
};
// 属性修改器数据缺省值
const DefaultModifiersData: ModifiersData = {
  static: {
    fixed: [],
    percentage: [],
  },
  dynamic: {
    fixed: [],
    percentage: [],
  },
};

// 角色数据Map
const characterData = (character: CharacterWithRelations) => {
  console.log("data:", character);
  const characterMap = new Map<CharacterAttrEnum, CharacterAttrData>();
  const d = (m: CharacterAttrType) => dynamicTotalValue(characterMap.get(CharacterAttrEnum[m]));
  const b = (m: CharacterAttrType) => baseValue(characterMap.get(CharacterAttrEnum[m]));

  // 定义属性
  // 末位属性（无下一级）

  characterMap.set(CharacterAttrEnum.PHYSICAL_ATK, {
    type: ValueType.user,
    name: CharacterAttrEnum.PHYSICAL_ATK,
    baseValue: [],
    modifiers: DefaultModifiersData,
    influences: [],
  });

  // 动画缩减
  characterMap.set(CharacterAttrEnum.MSPD, {
    type: ValueType.user,
    name: CharacterAttrEnum.MSPD,
    baseValue: [],
    modifiers: DefaultModifiersData,
    influences: [],
  });

  // 咏唱缩减
  characterMap.set(CharacterAttrEnum.CSRD, {
    type: ValueType.user,
    name: CharacterAttrEnum.CSRD,
    baseValue: [],
    modifiers: DefaultModifiersData,
    influences: [],
  });

  // 
  // 主武器攻击力
  characterMap.set(CharacterAttrEnum.MAINWEAPON_ATK, {
    type: ValueType.user,
    name: CharacterAttrEnum.MAINWEAPON_ATK,
    baseValue: [],
    modifiers: DefaultModifiersData,
    influences: [
      {
        name: "WEAPON_ATK", // 将影响的目标属性
        targetType: TargetType.baseValue, // 作用的位置
        computation: () => d("MAINWEAPON_ATK"), // 作用的值
      },
    ],
  });
  // 副武器攻击力
  characterMap.set(CharacterAttrEnum.SUBWEAPON_ATK, {
    type: ValueType.user,
    name: CharacterAttrEnum.SUBWEAPON_ATK,
    baseValue: [],
    modifiers: DefaultModifiersData,
    influences: [
      {
        name: "WEAPON_ATK",
        computation: () => d("SUBWEAPON_ATK"),
        targetType: TargetType.baseValue,
      },
    ],
  });
  // 武器性能
  characterMap.set(CharacterAttrEnum.WEAPON_ATK, {
    type: ValueType.user,
    name: CharacterAttrEnum.WEAPON_ATK,
    baseValue: [],
    modifiers: DefaultModifiersData,
    influences: [
      {
        name: "PHYSICAL_ATK",
        computation: () =>
          d("WEAPON_ATK") * MainWeaponAbiT[character.weapon.template.type as MainHandType].weaAtk_Patk_Convert,
        targetType: TargetType.baseValue,
      },
      {
        name: "MAGICAL_ATK",
        computation: () =>
          d("WEAPON_ATK") * MainWeaponAbiT[character.weapon.template.type as MainHandType].weaAtk_Matk_Convert,
        targetType: TargetType.baseValue,
      },
    ],
  });
  characterMap.set(CharacterAttrEnum.BODYARMOR_DEF, {
    type: ValueType.user,
    name: CharacterAttrEnum.BODYARMOR_DEF,
    baseValue: [],
    modifiers: DefaultModifiersData,
    influences: [
      {
        name: "PHYSICAL_DEF",
        computation: () => d("BODYARMOR_DEF"),
        targetType: TargetType.baseValue,
      },
      {
        name: "MAGICAL_DEF",
        computation: () => d("BODYARMOR_DEF"),
        targetType: TargetType.baseValue,
      },
    ],
  });
  characterMap.set(CharacterAttrEnum.ASPD, {
    type: ValueType.user,
    name: CharacterAttrEnum.ASPD,
    baseValue: [],
    modifiers: DefaultModifiersData,
    influences: [
      {
        name: "MSPD",
        computation: () => Math.max(0, Math.floor((d("ASPD") - 1000) / 180)),
        targetType: TargetType.staticConstant,
      },
    ],
  });
  characterMap.set(CharacterAttrEnum.CSPD, {
    type: ValueType.user,
    name: CharacterAttrEnum.CSPD,
    baseValue: [],
    modifiers: DefaultModifiersData,
    influences: [
      {
        name: "CSRD",
        computation: () => Math.min(50 + Math.floor((d("CSPD") - 1000) / 180), Math.floor(d("CSPD") / 20)),
        targetType: TargetType.staticConstant,
      },
    ],
  });
  characterMap.set(CharacterAttrEnum.PHYSICAL_CRITICAL_DAMAGE, {
    type: ValueType.user,
    name: CharacterAttrEnum.PHYSICAL_CRITICAL_DAMAGE,
    baseValue: [
      {
        value: 150,
        sourceName: "SYSTEM",
        source: "SYSTEM",
      },
    ],
    modifiers: DefaultModifiersData,
    influences: [],
  });
  characterMap.set(CharacterAttrEnum.MAGICAL_CRITICAL_DAMAGE, {
    type: ValueType.user,
    name: CharacterAttrEnum.MAGICAL_CRITICAL_DAMAGE,
    baseValue: [
      {
        value: 100 + ((d("PHYSICAL_CRITICAL_DAMAGE") - 100) * d("MAGICAL_CRT_DAMAGE_CONVERSION_RATE")) / 100,
        sourceName: "SYSTEM",
        source: "SYSTEM",
      },
    ],
    modifiers: DefaultModifiersData,
    influences: [],
  });

  // 基础属性
  characterMap.set(CharacterAttrEnum.LV, {
    type: ValueType.user,
    name: CharacterAttrEnum.LV,
    baseValue: character.lv,
    modifiers: DefaultModifiersData,
    influences: [
      {
        name: "PHYSICAL_ATK",
        computation: () => d("LV"),
        targetType: TargetType.baseValue,
      },
      {
        name: "MAGICAL_ATK",
        computation: () => d("LV"),
        targetType: TargetType.baseValue,
      },
      {
        name: "ASPD",
        computation: () => d("LV"),
        targetType: TargetType.baseValue,
      },
      {
        name: "CSPD",
        computation: () => d("LV"),
        targetType: TargetType.baseValue,
      },
      {
        name: "HP",
        computation: () => (d("LV") * 127) / 17,
        targetType: TargetType.baseValue,
      },
      {
        name: "MP",
        computation: () => d("LV"),
        targetType: TargetType.baseValue,
      },
      {
        name: "ACCURACY",
        computation: () => d("LV"),
        targetType: TargetType.baseValue,
      },
      {
        name: "DODGE",
        computation: () => d("LV"),
        targetType: TargetType.baseValue,
      },
    ],
  });
  characterMap.set(CharacterAttrEnum.STR, {
    type: ValueType.user,
    name: CharacterAttrEnum.STR,
    baseValue: character.str,
    modifiers: DefaultModifiersData,
    influences: [
      {
        name: "PHYSICAL_ATK",
        computation: () =>
          d("STR") * MainWeaponAbiT[character.weapon.template.type as MainHandType].abi_Attr_Convert.str.pAtkC,
        targetType: TargetType.baseValue,
      },
      {
        name: "MAGICAL_ATK",
        computation: () =>
          d("STR") * MainWeaponAbiT[character.weapon.template.type as MainHandType].abi_Attr_Convert.str.mAtkC,
        targetType: TargetType.baseValue,
      },
      {
        name: "PHYSICAL_STABILITY",
        computation: () =>
          d("STR") * MainWeaponAbiT[character.weapon.template.type as MainHandType].abi_Attr_Convert.str.pStabC,
        targetType: TargetType.baseValue,
      },
      {
        name: "ASPD",
        computation: () =>
          d("STR") * MainWeaponAbiT[character.weapon.template.type as MainHandType].abi_Attr_Convert.str.aspdC,
        targetType: TargetType.baseValue,
      },
      {
        name: "PHYSICAL_CRITICAL_DAMAGE",
        computation: () => d("STR") * (d("STR") >= d("AGI") ? 0.2 : 0),
        targetType: TargetType.baseValue,
      },
    ],
  });
  characterMap.set(CharacterAttrEnum.INT, {
    type: ValueType.user,
    name: CharacterAttrEnum.INT,
    baseValue: character.int,
    modifiers: DefaultModifiersData,
    influences: [
      {
        name: "MP",
        computation: () => d("INT") * 0.1,
        targetType: TargetType.baseValue,
      },
      {
        name: "PHYSICAL_ATK",
        computation: () =>
          d("INT") * MainWeaponAbiT[character.weapon.template.type as MainHandType].abi_Attr_Convert.int.pAtkC,
        targetType: TargetType.baseValue,
      },
      {
        name: "MAGICAL_ATK",
        computation: () =>
          d("INT") * MainWeaponAbiT[character.weapon.template.type as MainHandType].abi_Attr_Convert.int.mAtkC,
        targetType: TargetType.baseValue,
      },
      {
        name: "ASPD",
        computation: () =>
          d("INT") * MainWeaponAbiT[character.weapon.template.type as MainHandType].abi_Attr_Convert.int.aspdC,
        targetType: TargetType.baseValue,
      },
      {
        name: "PHYSICAL_STABILITY",
        computation: () =>
          d("INT") * MainWeaponAbiT[character.weapon.template.type as MainHandType].abi_Attr_Convert.int.pStabC,
        targetType: TargetType.baseValue,
      },
    ],
  });
  characterMap.set(CharacterAttrEnum.VIT, {
    type: ValueType.user,
    name: CharacterAttrEnum.VIT,
    baseValue: character.vit,
    modifiers: DefaultModifiersData,
    influences: [
      {
        name: "HP",
        computation: () => (d("VIT") * d("LV")) / 3,
        targetType: TargetType.baseValue,
      },
    ],
  });
  characterMap.set(CharacterAttrEnum.AGI, {
    type: ValueType.user,
    name: CharacterAttrEnum.AGI,
    baseValue: character.agi,
    modifiers: DefaultModifiersData,
    influences: [
      {
        name: "PHYSICAL_ATK",
        computation: () =>
          d("AGI") * MainWeaponAbiT[character.weapon.template.type as MainHandType].abi_Attr_Convert.agi.pAtkC,
        targetType: TargetType.baseValue,
      },
      {
        name: "MAGICAL_ATK",
        computation: () =>
          d("AGI") * MainWeaponAbiT[character.weapon.template.type as MainHandType].abi_Attr_Convert.agi.mAtkC,
        targetType: TargetType.baseValue,
      },
      {
        name: "ASPD",
        computation: () =>
          d("AGI") * MainWeaponAbiT[character.weapon.template.type as MainHandType].abi_Attr_Convert.agi.aspdC,
        targetType: TargetType.baseValue,
      },
      {
        name: "PHYSICAL_STABILITY",
        computation: () =>
          d("AGI") * MainWeaponAbiT[character.weapon.template.type as MainHandType].abi_Attr_Convert.agi.pStabC,
        targetType: TargetType.baseValue,
      },
      {
        name: "CSPD",
        computation: () => d("AGI") * 1.16,
        targetType: TargetType.baseValue,
      },
      {
        name: "PHYSICAL_CRITICAL_DAMAGE",
        computation: () => d("AGI") * (d("AGI") > d("STR") ? 0.1 : 0),
        targetType: TargetType.baseValue,
      },
    ],
  });
  characterMap.set(CharacterAttrEnum.DEX, {
    type: ValueType.user,
    name: CharacterAttrEnum.DEX,
    baseValue: character.dex,
    modifiers: DefaultModifiersData,
    influences: [
      {
        name: "PHYSICAL_ATK",
        computation: () =>
          d("DEX") * MainWeaponAbiT[character.weapon.template.type as MainHandType].abi_Attr_Convert.dex.pAtkC,
        targetType: TargetType.baseValue,
      },
      {
        name: "MAGICAL_ATK",
        computation: () =>
          d("DEX") * MainWeaponAbiT[character.weapon.template.type as MainHandType].abi_Attr_Convert.dex.mAtkC,
        targetType: TargetType.baseValue,
      },
      {
        name: "ASPD",
        computation: () =>
          d("DEX") * MainWeaponAbiT[character.weapon.template.type as MainHandType].abi_Attr_Convert.dex.aspdC,
        targetType: TargetType.baseValue,
      },
      {
        name: "PHYSICAL_STABILITY",
        computation: () =>
          d("DEX") * MainWeaponAbiT[character.weapon.template.type as MainHandType].abi_Attr_Convert.dex.pStabC,
        targetType: TargetType.baseValue,
      },
      {
        name: "CSPD",
        computation: () => d("DEX") * 2.94,
        targetType: TargetType.baseValue,
      },
    ],
  });
  characterMap.set(CharacterAttrEnum.LUK, {
    type: ValueType.user,
    name: CharacterAttrEnum.LUK,
    baseValue: character.personalityType === "Luk" ? character.personalityValue : 0,
    modifiers: DefaultModifiersData,
    influences: [],
  });
  characterMap.set(CharacterAttrEnum.TEC, {
    type: ValueType.user,
    name: CharacterAttrEnum.TEC,
    baseValue: character.personalityType === "Tec" ? character.personalityValue : 0,
    modifiers: DefaultModifiersData,
    influences: [],
  });
  characterMap.set(CharacterAttrEnum.MEN, {
    type: ValueType.user,
    name: CharacterAttrEnum.MEN,
    baseValue: character.personalityType === "Men" ? character.personalityValue : 0,
    modifiers: DefaultModifiersData,
    influences: [],
  });
  characterMap.set(CharacterAttrEnum.CRI, {
    type: ValueType.user,
    name: CharacterAttrEnum.CRI,
    baseValue: character.personalityType === "Cri" ? character.personalityValue : 0,
    modifiers: DefaultModifiersData,
    influences: [],
  });
  characterMap.set(CharacterAttrEnum.MAINWEAPON_BASE_VALUE, {
    type: ValueType.user,
    name: CharacterAttrEnum.MAINWEAPON_BASE_VALUE,
    baseValue: (character.weapon.baseAbi ?? character.weapon.template.baseAbi) + character.weapon.extraAbi,
    modifiers: DefaultModifiersData,
    influences: [
      {
        name: "MAINWEAPON_ATK",
        computation: () => d("MAINWEAPON_BASE_VALUE"),
        targetType: TargetType.baseValue,
      },
    ],
  });
  characterMap.set(CharacterAttrEnum.SUBWEAPON_BASE_VALUE, {
    type: ValueType.user,
    name: CharacterAttrEnum.SUBWEAPON_BASE_VALUE,
    baseValue: (character.subWeapon.baseAbi ?? character.subWeapon.template.baseAbi) + character.subWeapon.extraAbi,
    modifiers: DefaultModifiersData,
    influences: [
      {
        name: "SUBWEAPON_ATK",
        computation: () => d("SUBWEAPON_BASE_VALUE"),
        targetType: TargetType.baseValue,
      },
    ],
  });
  characterMap.set(CharacterAttrEnum.BODYARMOR_BASE_VALUE, {
    type: ValueType.user,
    name: CharacterAttrEnum.BODYARMOR_BASE_VALUE,
    baseValue: (character.armor.baseDef ?? character.armor.template.baseDef) + character.armor.extraAbi,
    modifiers: DefaultModifiersData,
    influences: [
      {
        name: "BODYARMOR_DEF",
        computation: () => d("BODYARMOR_BASE_VALUE"),
        targetType: TargetType.baseValue,
      },
    ],
  });

  return characterMap;
};

const MathjsTest: Component = () => {
  const [result, setResult] = createSignal<string>("");
  const [expression, setExpression] = createSignal<string>("p.atk + p.str * 2");

  const [character, { refetch }] = createResource(async () => {
    const character = await findCharacterWithRelations("defaultCharacterId");
    return character;
  });

  const playerData = createMemo(() => {
    const char = character();
    if (!char) return {};
    return characterData(char);
  });

  // 创建 mathjs 实例
  const math = create(all);

  // 测试 mathjs 表达式计算
  const testExpression = () => {
    try {
      // 创建包含玩家数据的对象，供 mathjs 表达式使用
      const scope = {
        p: playerData(),
      };

      // 计算表达式
      const calculatedResult = math.evaluate(expression(), scope);
      setResult(`计算结果: ${calculatedResult}`);
    } catch (error) {
      setResult(`错误: ${error instanceof Error ? error.message : "未知错误"}`);
    }
  };

  // 测试一些预定义的表达式
  const testPredefinedExpressions = () => {
    const expressions = [
      "p.atk + p.str * 2",
      "p.lv * 10 + p.vit * 5",
      "max(p.atk, p.str * 3)",
      "floor(p.hp / 10) + p.int",
      "p.agi > p.dex ? p.agi : p.dex",
    ];

    const results = expressions.map((expr) => {
      try {
        const scope = { p: playerData() };
        const value = math.evaluate(expr, scope);
        return `${expr} = ${value}`;
      } catch (error) {
        return `${expr} = 错误: ${error instanceof Error ? error.message : "未知错误"}`;
      }
    });

    setResult(results.join("\n"));
  };

  // 组件挂载时自动测试
  createEffect(() => {
    testPredefinedExpressions();
  });

  return (
    <div class="min-h-screen bg-gray-100 p-8">
      <div class="mx-auto max-w-4xl">
        <h1 class="mb-8 text-3xl font-bold text-gray-800">MathJS 表达式测试</h1>

        {/* 表达式测试 */}
        <div class="mb-6 rounded-lg bg-white p-6 shadow-md">
          <h2 class="mb-4 text-xl font-semibold">表达式测试</h2>
          <div class="mb-4 flex items-end gap-4">
            <div class="flex-1">
              <label class="mb-2 block text-sm font-medium text-gray-700">表达式</label>
              <input
                type="text"
                value={expression()}
                onChange={(e) => setExpression(e.target.value)}
                placeholder="例如: p.atk + p.str * 2"
                class="w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>
            <button onClick={testExpression} class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
              计算
            </button>
          </div>

          <div class="mb-4">
            <button
              onClick={testPredefinedExpressions}
              class="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
            >
              测试预定义表达式
            </button>
          </div>

          {/* 结果显示 */}
          <div class="rounded border bg-gray-50 p-4">
            <h3 class="mb-2 font-medium text-gray-800">计算结果:</h3>
            <pre class="text-sm whitespace-pre-wrap text-gray-700">{result()}</pre>
          </div>
        </div>

        {/* 使用说明 */}
        <div class="rounded-lg bg-white p-6 shadow-md">
          <h2 class="mb-4 text-xl font-semibold">使用说明</h2>
          <div class="space-y-2 text-gray-700">
            <p>
              <strong>语法:</strong> 在表达式中使用 <code class="rounded bg-gray-100 px-1">p.属性名</code>{" "}
              来访问玩家属性
            </p>
            <p>
              <strong>示例:</strong>
            </p>
            <ul class="ml-4 list-inside list-disc space-y-1">
              <li>
                <code class="rounded bg-gray-100 px-1">p.atk + p.str * 2</code> - 攻击力 + 力量*2
              </li>
              <li>
                <code class="rounded bg-gray-100 px-1">max(p.atk, p.str * 3)</code> - 攻击力和力量*3的较大值
              </li>
              <li>
                <code class="rounded bg-gray-100 px-1">p.lv * 10 + p.vit * 5</code> - 等级*10 + 体力*5
              </li>
              <li>
                <code class="rounded bg-gray-100 px-1">p.agi {">"} p.dex ? p.agi : p.dex</code> - 条件表达式
              </li>
            </ul>
            <p>
              <strong>支持的函数:</strong> max, min, floor, ceil, abs, sqrt, pow 等 mathjs 内置函数
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MathjsTest;
