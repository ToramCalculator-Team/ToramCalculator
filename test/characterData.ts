import { type Character } from "~/repositories/character";
import { type MathNode, all, create, floor, max, min, parse } from "mathjs";
import { MainWeaponType } from "~/repositories/enums";

export enum TemporaryPlayerStatus {
  Lv,
  EqAtk,
  SubEqAtk,
  EqDef,

  Str,
  Int,
  Vit,
  Agi,
  Dex,
  Crt,
  Luk,
  Tec,
  Men,

  Stable,
  SubStable,

  MaxHp,
  HpRecovery,
  MaxMp,
  MpRecovery,

  Atk,
  SubAtk,
  Def,
  Matk,
  SubMatk,
  Mdef,

  AntiVirus,

  AtkMpRecovery,

  Aspd,
  Cspd,
  
  Avoid,
  AvoidTired,
  AvoidSpeed,

  Guard,
  GuardPower,
  GuardSpeed,

  Critical,
  CriticalDmg,
  CriticalMagicDmg,

  ElementPower,

  Flee,
  Hit,

  DamageReductionRate,

  Respawn,
}

export enum CharacterAttrEnum {
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
export type CharacterAttrType = keyof typeof CharacterAttrEnum;
export enum mobAttrEnum {
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
export type mobAttrType = keyof typeof mobAttrEnum;
export enum SkillAttrEnum {}
export type SkillModifierType = keyof typeof SkillAttrEnum;
export type AttrType = CharacterAttrType | mobAttrType | SkillModifierType;
export type SourceName = AttrType | "SYSTEM";

type MainHandWeaponType = MainWeaponType | "None";

const weaponAbiT: Record<
MainHandWeaponType,
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

const enum ValueType {
  system,
  user,
  both,
}
const enum OriginType {
  baseValue,
  staticConstant,
  staticPercentage,
  dynamicConstant,
  dynamicPercentage,
}

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
  relation: {
    name: CharacterAttrType;
    formula: number | string;
    originType: OriginType;
  }[];
}

// 参数统计方法
export const baseValue = (m: AttrData | undefined): number => {
  if (!m) throw new Error("传入的属性无法计算");
  if (m.name === CharacterAttrEnum.MAGICAL_PIERCE || m.name === CharacterAttrEnum.PHYSICAL_PIERCE) return 100;
  if (typeof m.baseValue === "number") return m.baseValue;
  let sum = 0;
  for (let i = 0; i < m.baseValue.length; i++) {
    sum += m.baseValue[i].value;
  }
  return sum;
};
export const staticFixedValue = (m: AttrData): number => {
  const fixedArray = m.modifiers.static.fixed.map((mod) => mod.value);
  return fixedArray.reduce((a, b) => a + b, 0);
};
export const dynamicFixedValue = (m: AttrData): number => {
  let value = 0;
  if (m.modifiers.dynamic?.fixed) {
    const fixedArray = m.modifiers.dynamic.fixed.map((mod) => mod.value);
    value = fixedArray.reduce((a, b) => a + b, 0) + staticFixedValue(m);
  }
  return value;
};
export const staticPercentageValue = (m: AttrData): number => {
  const percentageArray = m.modifiers.static.percentage.map((mod) => mod.value);
  return percentageArray.reduce((a, b) => a + b, 0);
};
export const dynamicPercentageValue = (m: AttrData): number => {
  let value = 0;
  if (m.modifiers.dynamic?.percentage) {
    const percentageArray = m.modifiers.dynamic.percentage.map((mod) => mod.value);
    value = percentageArray.reduce((a, b) => a + b, 0) + staticPercentageValue(m);
  }
  return value;
};
export const staticTotalValue = (m: AttrData): number => {
  const base = baseValue(m);
  const fixed = staticFixedValue(m);
  const percentage = staticPercentageValue(m);
  return base * (1 + percentage / 100) + fixed;
};
export const dynamicTotalValue = (m: AttrData | undefined): number => {
  if (!m) throw new Error("传入的属性无法计算");
  const base = baseValue(m);
  const fixed = dynamicFixedValue(m);
  const percentage = dynamicPercentageValue(m);
  if (m.name === CharacterAttrEnum.MAGICAL_PIERCE || m.name === CharacterAttrEnum.PHYSICAL_PIERCE) {
    return floor(base * (1 + percentage / 100) + fixed - 100);
  }
  return floor(base * (1 + percentage / 100) + fixed);
};

const fps = 60;

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

type Scope = {
  currentFrame: number;
  team: CharacterAttrData[];
};

// 定义一个自定义节点转换函数
function replaceNode(node: MathNode) {
  // 如果节点是AccessorNode，替换成FunctionNode dynamicTotalValue(SymbolNode)
  if ("isAccessorNode" in node && node.isAccessorNode) {
    return new math.FunctionNode(new math.SymbolNode("dynamicTotalValue"), [node]);
  }
  // 遍历节点的子节点并递归替换
  return node.map(replaceNode);
}

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

const characterData = (character: Character) => {
  const characterMap = new Map<CharacterAttrEnum, CharacterAttrData>();
  const d = (m: CharacterAttrType) => dynamicTotalValue(characterMap.get(CharacterAttrEnum[m]));
  const b = (m: CharacterAttrType) => baseValue(characterMap.get(CharacterAttrEnum[m]));

  // 定义属性
  // 末位属性（无下一级）
  characterMap.set(CharacterAttrEnum.MSPD, {
    type: ValueType.user,
    name: CharacterAttrEnum.MSPD,
    baseValue: [],
    modifiers: DefaultModifiersData,
    relation: [],
  });
  characterMap.set(CharacterAttrEnum.CSRD, {
    type: ValueType.user,
    name: CharacterAttrEnum.CSRD,
    baseValue: [],
    modifiers: DefaultModifiersData,
    relation: [],
  });

  //
  characterMap.set(CharacterAttrEnum.MAINWEAPON_ATK, {
    type: ValueType.user,
    name: CharacterAttrEnum.MAINWEAPON_ATK,
    baseValue: [],
    modifiers: DefaultModifiersData,
    relation: [
      {
        name: "WEAPON_ATK",
        formula: 1,
        originType: OriginType.baseValue,
      },
    ],
  });
  characterMap.set(CharacterAttrEnum.SUBWEAPON_ATK, {
    type: ValueType.user,
    name: CharacterAttrEnum.SUBWEAPON_ATK,
    baseValue: [],
    modifiers: DefaultModifiersData,
    relation: [
      {
        name: "WEAPON_ATK",
        formula: 1,
        originType: OriginType.baseValue,
      },
    ],
  });
  characterMap.set(CharacterAttrEnum.WEAPON_ATK, {
    type: ValueType.user,
    name: CharacterAttrEnum.WEAPON_ATK,
    baseValue: [],
    modifiers: DefaultModifiersData,
    relation: [
      {
        name: "PHYSICAL_ATK",
        formula: weaponAbiT[character.weapon.template.type].weaAtk_Patk_Convert,
        originType: OriginType.baseValue,
      },
      {
        name: "MAGICAL_ATK",
        formula: weaponAbiT[character.mainWeapon.mainWeaponType].weaAtk_Matk_Convert,
        originType: OriginType.baseValue,
      },
    ],
  });
  characterMap.set(CharacterAttrEnum.BODYARMOR_DEF, {
    type: ValueType.user,
    name: CharacterAttrEnum.BODYARMOR_DEF,
    baseValue: [],
    modifiers: DefaultModifiersData,
    relation: [
      {
        name: "PHYSICAL_DEF",
        formula: 1,
        originType: OriginType.baseValue,
      },
      {
        name: "MAGICAL_DEF",
        formula: 1,
        originType: OriginType.baseValue,
      },
    ],
  });
  characterMap.set(CharacterAttrEnum.ASPD, {
    type: ValueType.user,
    name: CharacterAttrEnum.ASPD,
    baseValue: [],
    modifiers: DefaultModifiersData,
    relation: [
      {
        name: "MSPD",
        formula: "max(0, floor((thisCharacter.ASPD - 1000) / 180))",
        originType: OriginType.staticConstant,
      },
    ],
  });
  characterMap.set(CharacterAttrEnum.CSPD, {
    type: ValueType.user,
    name: CharacterAttrEnum.CSPD,
    baseValue: [],
    modifiers: DefaultModifiersData,
    relation: [
      {
        name: "CSRD",
        formula: "min(50 + floor((thisCharacter.CSPD - 1000) / 180), floor(thisCharacter.CSPD / 20))",
        originType: OriginType.staticConstant,
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
    relation: [],
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
    relation: [],
  });

  // 基础属性
  characterMap.set(CharacterAttrEnum.LV, {
    type: ValueType.user,
    name: CharacterAttrEnum.LV,
    baseValue: character.lv,
    modifiers: DefaultModifiersData,
    relation: [
      {
        name: "PHYSICAL_ATK",
        formula: 1,
        originType: OriginType.baseValue,
      },
      {
        name: "MAGICAL_ATK",
        formula: 1,
        originType: OriginType.baseValue,
      },
      {
        name: "ASPD",
        formula: 1,
        originType: OriginType.baseValue,
      },
      {
        name: "CSPD",
        formula: 1,
        originType: OriginType.baseValue,
      },
      {
        name: "HP",
        formula: 127 / 17,
        originType: OriginType.baseValue,
      },
      {
        name: "MP",
        formula: 1,
        originType: OriginType.baseValue,
      },
      {
        name: "ACCURACY",
        formula: 1,
        originType: OriginType.baseValue,
      },
      {
        name: "DODGE",
        formula: 1,
        originType: OriginType.baseValue,
      },
    ],
  });
  characterMap.set(CharacterAttrEnum.STR, {
    type: ValueType.user,
    name: CharacterAttrEnum.STR,
    baseValue: character.baseStr,
    modifiers: DefaultModifiersData,
    relation: [
      {
        name: "PHYSICAL_ATK",
        formula: weaponAbiT[character.mainWeapon.mainWeaponType].abi_Attr_Convert.str.pAtkC,
        originType: OriginType.baseValue,
      },
      {
        name: "MAGICAL_ATK",
        formula: weaponAbiT[character.mainWeapon.mainWeaponType].abi_Attr_Convert.str.mAtkC,
        originType: OriginType.baseValue,
      },
      {
        name: "PHYSICAL_STABILITY",
        formula: weaponAbiT[character.mainWeapon.mainWeaponType].abi_Attr_Convert.str.pStabC,
        originType: OriginType.baseValue,
      },
      {
        name: "ASPD",
        formula: weaponAbiT[character.mainWeapon.mainWeaponType].abi_Attr_Convert.str.aspdC,
        originType: OriginType.baseValue,
      },
      {
        name: "PHYSICAL_CRITICAL_DAMAGE",
        formula: d("STR") >= d("AGI") ? 0.2 : 0,
        originType: OriginType.baseValue,
      },
    ],
  });
  characterMap.set(CharacterAttrEnum.INT, {
    type: ValueType.user,
    name: CharacterAttrEnum.INT,
    baseValue: character.baseInt,
    modifiers: DefaultModifiersData,
    relation: [
      {
        name: "MP",
        formula: 0.1,
        originType: OriginType.baseValue,
      },
      {
        name: "PHYSICAL_ATK",
        formula: weaponAbiT[character.mainWeapon.mainWeaponType].abi_Attr_Convert.int.pAtkC,
        originType: OriginType.baseValue,
      },
      {
        name: "MAGICAL_ATK",
        formula: weaponAbiT[character.mainWeapon.mainWeaponType].abi_Attr_Convert.int.mAtkC,
        originType: OriginType.baseValue,
      },
      {
        name: "ASPD",
        formula: weaponAbiT[character.mainWeapon.mainWeaponType].abi_Attr_Convert.int.aspdC,
        originType: OriginType.baseValue,
      },
      {
        name: "PHYSICAL_STABILITY",
        formula: weaponAbiT[character.mainWeapon.mainWeaponType].abi_Attr_Convert.int.pStabC,
        originType: OriginType.baseValue,
      },
    ],
  });
  characterMap.set(CharacterAttrEnum.VIT, {
    type: ValueType.user,
    name: CharacterAttrEnum.VIT,
    baseValue: character.baseVit,
    modifiers: DefaultModifiersData,
    relation: [
      {
        name: "HP",
        formula: d("LV") / 3,
        originType: OriginType.baseValue,
      },
    ],
  });
  characterMap.set(CharacterAttrEnum.AGI, {
    type: ValueType.user,
    name: CharacterAttrEnum.AGI,
    baseValue: character.baseAgi,
    modifiers: DefaultModifiersData,
    relation: [
      {
        name: "PHYSICAL_ATK",
        formula: weaponAbiT[character.mainWeapon.mainWeaponType].abi_Attr_Convert.agi.pAtkC,
        originType: OriginType.baseValue,
      },
      {
        name: "MAGICAL_ATK",
        formula: weaponAbiT[character.mainWeapon.mainWeaponType].abi_Attr_Convert.agi.mAtkC,
        originType: OriginType.baseValue,
      },
      {
        name: "ASPD",
        formula: weaponAbiT[character.mainWeapon.mainWeaponType].abi_Attr_Convert.agi.aspdC,
        originType: OriginType.baseValue,
      },
      {
        name: "PHYSICAL_STABILITY",
        formula: weaponAbiT[character.mainWeapon.mainWeaponType].abi_Attr_Convert.agi.pStabC,
        originType: OriginType.baseValue,
      },
      {
        name: "CSPD",
        formula: 1.16,
        originType: OriginType.baseValue,
      },
      {
        name: "PHYSICAL_CRITICAL_DAMAGE",
        formula: d("AGI") > d("STR") ? 0.1 : 0,
        originType: OriginType.baseValue,
      },
    ],
  });
  characterMap.set(CharacterAttrEnum.DEX, {
    type: ValueType.user,
    name: CharacterAttrEnum.DEX,
    baseValue: character.baseDex,
    modifiers: DefaultModifiersData,
    relation: [
      {
        name: "PHYSICAL_ATK",
        formula: weaponAbiT[character.mainWeapon.mainWeaponType].abi_Attr_Convert.dex.pAtkC,
        originType: OriginType.baseValue,
      },
      {
        name: "MAGICAL_ATK",
        formula: weaponAbiT[character.mainWeapon.mainWeaponType].abi_Attr_Convert.dex.mAtkC,
        originType: OriginType.baseValue,
      },
      {
        name: "ASPD",
        formula: weaponAbiT[character.mainWeapon.mainWeaponType].abi_Attr_Convert.dex.aspdC,
        originType: OriginType.baseValue,
      },
      {
        name: "PHYSICAL_STABILITY",
        formula: weaponAbiT[character.mainWeapon.mainWeaponType].abi_Attr_Convert.dex.pStabC,
        originType: OriginType.baseValue,
      },
      {
        name: "CSPD",
        formula: 2.94,
        originType: OriginType.baseValue,
      },
    ],
  });
  characterMap.set(CharacterAttrEnum.LUK, {
    type: ValueType.user,
    name: CharacterAttrEnum.LUK,
    baseValue: character.specialAbiType === "LUK" ? character.specialAbiValue : 0,
    modifiers: DefaultModifiersData,
    relation: [],
  });
  characterMap.set(CharacterAttrEnum.TEC, {
    type: ValueType.user,
    name: CharacterAttrEnum.TEC,
    baseValue: character.specialAbiType === "TEC" ? character.specialAbiValue : 0,
    modifiers: DefaultModifiersData,
    relation: [],
  });
  characterMap.set(CharacterAttrEnum.MEN, {
    type: ValueType.user,
    name: CharacterAttrEnum.MEN,
    baseValue: character.specialAbiType === "MEN" ? character.specialAbiValue : 0,
    modifiers: DefaultModifiersData,
    relation: [],
  });
  characterMap.set(CharacterAttrEnum.CRI, {
    type: ValueType.user,
    name: CharacterAttrEnum.CRI,
    baseValue: character.specialAbiType === "CRI" ? character.specialAbiValue : 0,
    modifiers: DefaultModifiersData,
    relation: [],
  });
  characterMap.set(CharacterAttrEnum.MAINWEAPON_BASE_VALUE, {
    type: ValueType.user,
    name: CharacterAttrEnum.MAINWEAPON_BASE_VALUE,
    baseValue: character.mainWeapon.baseAtk,
    modifiers: DefaultModifiersData,
    relation: [
      {
        name: "MAINWEAPON_ATK",
        formula: 1,
        originType: OriginType.baseValue,
      },
    ],
  });
  characterMap.set(CharacterAttrEnum.SUBWEAPON_BASE_VALUE, {
    type: ValueType.user,
    name: CharacterAttrEnum.SUBWEAPON_BASE_VALUE,
    baseValue: character.subWeapon.baseAtk,
    modifiers: DefaultModifiersData,
    relation: [
      {
        name: "SUBWEAPON_ATK",
        formula: 1,
        originType: OriginType.baseValue,
      },
    ],
  });
  characterMap.set(CharacterAttrEnum.BODYARMOR_BASE_VALUE, {
    type: ValueType.user,
    name: CharacterAttrEnum.BODYARMOR_BASE_VALUE,
    baseValue: character.bodyArmor.baseDef,
    modifiers: DefaultModifiersData,
    relation: [
      {
        name: "BODYARMOR_DEF",
        formula: 1,
        originType: OriginType.baseValue,
      },
    ],
  });

  return characterMap;
};
