import { MainHandType, SubHandType } from "@db/schema/enums";

// 机体属性
export enum CharacterAttrEnum {
  LV, // 等级
  STR, // 力量
  INT, // 智力
  VIT, // 耐力
  AGI, // 敏捷
  DEX, // 灵巧
  LUK, // 幸运
  TEC, // 技巧
  MEN, // 异抗
  CRI, // 暴击
  MAX_MP, // 最大MP
  AGGRO_RATE, // 仇恨值倍率
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

// 主武器的属性转换映射
export const MainWeaponAbiT: Record<
  MainHandType,
  {
    baseHitRate: number;
    baseAspd: number;
    matkC: number;
    patkC: number;
    abi_Attr_Convert: Record<
      "str" | "int" | "agi" | "dex",
      { pAtkC: number; mAtkC: number; aspdC: number; pStabC: number }
    >;
  }
> = {
  OneHandSword: {
    baseHitRate: 0.25,
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
    matkC: 0,
    patkC: 1,
  },
  Katana: {
    baseHitRate: 0.3,
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
    matkC: 0,
    patkC: 1,
  },
  TwoHandSword: {
    baseHitRate: 0.15,
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
    matkC: 0,
    patkC: 1,
  },
  Bow: {
    baseHitRate: 0.1,
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
    matkC: 0,
    patkC: 1,
  },
  Bowgun: {
    baseHitRate: 0.05,
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
    matkC: 0,
    patkC: 1,
  },
  Rod: {
    baseHitRate: 0.3,
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
    matkC: 1,
    patkC: 1,
  },
  Magictool: {
    baseHitRate: 0.1,
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
    matkC: 1,
    patkC: 1,
  },
  Knuckle: {
    baseHitRate: 0.1,
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
    matkC: 0.5,
    patkC: 1,
  },
  Halberd: {
    baseHitRate: 0.25,
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
    matkC: 0,
    patkC: 1,
  },
  None: {
    baseHitRate: 50,
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
    matkC: 0,
    patkC: 1,
  },
};

// 副武器的属性转换映射
export const SubWeaponModifier: Record<
  SubHandType,
  {
    aspdM: number;
    pAtkM: number;
    mAtkM: number;
    pDefM: number;
    mDefM: number;
  }
> = {
  None: {
    aspdM: 0,
    pAtkM: 0,
    mAtkM: 0,
    pDefM: 0,
    mDefM: 0,
  },
  OneHandSword: {
    aspdM: 0,
    pAtkM: 0,
    mAtkM: 0,
    pDefM: 0,
    mDefM: 0,
  },
  Magictool: {
    aspdM: 0,
    pAtkM: -0.15,
    mAtkM: 0,
    pDefM: 0,
    mDefM: 0,
  },
  Knuckle: {
    aspdM: 0,
    pAtkM: 0,
    mAtkM: -0.15,
    pDefM: 0,
    mDefM: 0,
  },
  Katana: {
    aspdM: 0,
    pAtkM: 0,
    mAtkM: 0,
    pDefM: 0,
    mDefM: 0,
  },
  Arrow: {
    aspdM: 0,
    pAtkM: 0,
    mAtkM: 0,
    pDefM: -0.25,
    mDefM: -0.25,
  },
  ShortSword: {
    aspdM: 0,
    pAtkM: 0,
    mAtkM: 0,
    pDefM: 0,
    mDefM: 0,
  },
  NinjutsuScroll: {
    aspdM: 0,
    pAtkM: 0,
    mAtkM: 0,
    pDefM: 0,
    mDefM: 0,
  },
  Shield: {
    aspdM: -0.5,
    pAtkM: 0,
    mAtkM: 0,
    pDefM: 0,
    mDefM: 0,
  },
};

// 属性修改器
export interface ModifiersData<TSourceName extends number> {
  static: {
    fixed: {
      value: number;
      source: TSourceName;
    }[];
    percentage: {
      value: number;
      source: TSourceName;
    }[];
  };
  dynamic: {
    fixed: {
      value: number;
      source: TSourceName;
    }[];
    percentage: {
      value: number;
      source: TSourceName;
    }[];
  };
}

// 属性数据
export interface AttrData<TSourceName extends number> {
  name: TSourceName;
  baseValue:
    | number
    | {
        value: number;
        source: TSourceName | "SYSTEM";
      }[];
  modifiers: ModifiersData<TSourceName>;
}

// 参数统计方法
export const baseValue = (m: AttrData<number> | undefined): number => {
  if (!m) throw new Error("传入的属性无法计算");
  if (m.name === CharacterAttrEnum.MAGICAL_PIERCE || m.name === CharacterAttrEnum.PHYSICAL_PIERCE) return 100;
  if (typeof m.baseValue === "number") return m.baseValue;
  let sum = 0;
  for (let i = 0; i < m.baseValue.length; i++) {
    sum += m.baseValue[i].value;
  }
  return sum;
};

export const staticFixedValue = (m: AttrData<number>): number => {
  const fixedArray = m.modifiers.static.fixed.map((mod) => mod.value);
  return fixedArray.reduce((a, b) => a + b, 0);
};

export const dynamicFixedValue = (m: AttrData<number>): number => {
  let value = 0;
  if (m.modifiers.dynamic?.fixed) {
    const fixedArray = m.modifiers.dynamic.fixed.map((mod) => mod.value);
    value = fixedArray.reduce((a, b) => a + b, 0) + staticFixedValue(m);
  }
  return value;
};

export const staticPercentageValue = (m: AttrData<number>): number => {
  const percentageArray = m.modifiers.static.percentage.map((mod) => mod.value);
  return percentageArray.reduce((a, b) => a + b, 0);
};

export const dynamicPercentageValue = (m: AttrData<number>): number => {
  let value = 0;
  if (m.modifiers.dynamic?.percentage) {
    const percentageArray = m.modifiers.dynamic.percentage.map((mod) => mod.value);
    value = percentageArray.reduce((a, b) => a + b, 0) + staticPercentageValue(m);
  }
  return value;
};

export const staticTotalValue = (m: AttrData<number>): number => {
  const base = baseValue(m);
  const fixed = staticFixedValue(m);
  const percentage = staticPercentageValue(m);
  return base * (1 + percentage / 100) + fixed;
};

export const dynamicTotalValue = (m: AttrData<number> | undefined): number => {
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
export const DefaultModifiersData: ModifiersData<number> = {
  static: {
    fixed: [],
    percentage: [],
  },
  dynamic: {
    fixed: [],
    percentage: [],
  },
};

// 属性依赖关系定义
export interface AttributeDependency<TAttrEnum extends number> {
  dependencies: TAttrEnum[];
  formula: (deps: Record<TAttrEnum, number>) => number;
}

/**
 * 
 */
const characterAttr = {
  abi: {
    str: "str",
    int: "int",
    agi: "agi",
    dex: "dex",
    vit: "vit",
    luk: "personalityType === 'Luk' ? luk : 0",
    tec: "personalityType === 'Tec' ? tec : 0",
    men: "personalityType === 'Men' ? men : 0",
    cri: "personalityType === 'Cri' ? cri : 0",
  },
  equip: {
    mainWeapon: {
      baseAspd: "mainWeaponAbiT(mainWeapon.type).baseAspd",
      baseHitRate: "mainWeaponAbiT(mainWeapon.type).baseHitRate",
      patkC: "mainWeaponAbiT(mainWeapon.type).patkC",
      matkC: "mainWeaponAbiT(mainWeapon.type).matkC",
      attrConvert: {
        pAtkC: "mainWeaponAbiT(mainWeapon.type).abi_Attr_Convert.str.pAtkC",
        mAtkC: "mainWeaponAbiT(mainWeapon.type).abi_Attr_Convert.str.mAtkC",
        aspdC: "mainWeaponAbiT(mainWeapon.type).abi_Attr_Convert.str.aspdC",
        pStabC: "mainWeaponAbiT(mainWeapon.type).abi_Attr_Convert.str.pStabC",
      },
      baseAtk: "mainWeapon.baseAtk",
      pstab: "mainWeapon.Pstab",
      range: "mainWeapon.range",
      baseElement: "mainWeapon.baseElement",
      refv: "mainWeapon.refv",
      element: "mainWeapon.element",
    },
    subWeapon: {
      baseAtk: "subWeapon.baseAtk",
      element: "subWeapon.element",
      refv: "subWeapon.refv",
      range: "subWeapon.range",
      pstab: "subWeapon.Pstab",
      modifiers: {
        aspdM: "subWeaponModifier[subWeapon.type].aspdM",
        pAtkM: "subWeaponModifier[subWeapon.type].pAtkM",
        mAtkM: "subWeaponModifier[subWeapon.type].mAtkM",
        pDefM: "subWeaponModifier[subWeapon.type].pDefM",
        mDefM: "subWeaponModifier[subWeapon.type].mDefM",
      },
    },
    armor: {
      baseDef: "armor.baseDef",
      refv: "armor.refv",
      type: "armor.type",
      aspdM: "armor.type === 'light' ? 0.5 : armor.type === 'heavy' ? -0.5 : 0",
    },
  },
};
