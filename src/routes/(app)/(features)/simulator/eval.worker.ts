import { CharacterWithRelations, type Character } from "@db/repositories/character";
import { type MathNode, all, create, floor, max, min, parse } from "mathjs";
import {
  MainHandType,
  SubHandType,
} from "@db/schema/enums";
import { createRoot, createSignal, createMemo, createEffect, Signal } from "solid-js";

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
interface ModifiersData<TSourceName extends number>  {
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
interface AttrData<TSourceName extends number> {
  name: TSourceName;
  baseValue:
    | number
    | {
        value: number;
        source: TSourceName | "SYSTEM";
      }[];
  modifiers: ModifiersData<TSourceName>;
}

// 角色属性数据
type CharacterAttrData = AttrData<CharacterAttrEnum> & {
  type: ValueType;
  influences: {
    name: CharacterAttrType;
    targetType: TargetType;
    computation: () => number;
  }[];
}

// 参数统计方法
const baseValue = (m: AttrData<number> | undefined): number => {
  if (!m) throw new Error("传入的属性无法计算");
  if (m.name === CharacterAttrEnum.MAGICAL_PIERCE || m.name === CharacterAttrEnum.PHYSICAL_PIERCE) return 100;
  if (typeof m.baseValue === "number") return m.baseValue;
  let sum = 0;
  for (let i = 0; i < m.baseValue.length; i++) {
    sum += m.baseValue[i].value;
  }
  return sum;
};

const staticFixedValue = (m: AttrData<number>): number => {
  const fixedArray = m.modifiers.static.fixed.map((mod) => mod.value);
  return fixedArray.reduce((a, b) => a + b, 0);
};

const dynamicFixedValue = (m: AttrData<number>): number => {
  let value = 0;
  if (m.modifiers.dynamic?.fixed) {
    const fixedArray = m.modifiers.dynamic.fixed.map((mod) => mod.value);
    value = fixedArray.reduce((a, b) => a + b, 0) + staticFixedValue(m);
  }
  return value;
};

const staticPercentageValue = (m: AttrData<number>): number => {
  const percentageArray = m.modifiers.static.percentage.map((mod) => mod.value);
  return percentageArray.reduce((a, b) => a + b, 0);
};

const dynamicPercentageValue = (m: AttrData<number>): number => {
  let value = 0;
  if (m.modifiers.dynamic?.percentage) {
    const percentageArray = m.modifiers.dynamic.percentage.map((mod) => mod.value);
    value = percentageArray.reduce((a, b) => a + b, 0) + staticPercentageValue(m);
  }
  return value;
};

const staticTotalValue = (m: AttrData<number>): number => {
  const base = baseValue(m);
  const fixed = staticFixedValue(m);
  const percentage = staticPercentageValue(m);
  return base * (1 + percentage / 100) + fixed;
};

const dynamicTotalValue = (m: AttrData<number> | undefined): number => {
  if (!m) throw new Error("传入的属性无法计算");
  const base = baseValue(m);
  const fixed = dynamicFixedValue(m);
  const percentage = dynamicPercentageValue(m);
  if (m.name === CharacterAttrEnum.MAGICAL_PIERCE || m.name === CharacterAttrEnum.PHYSICAL_PIERCE) {
    return floor(base * (1 + percentage / 100) + fixed - 100);
  }
  return floor(base * (1 + percentage / 100) + fixed);
};

// 属性修改器数据缺省值
const DefaultModifiersData: ModifiersData<number> = {
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
interface AttributeDependency {
  target: CharacterAttrEnum;
  dependencies: CharacterAttrEnum[];
  formula: (deps: Record<CharacterAttrEnum, number>) => number;
  description?: string;
}

// 响应式属性系统
class ReactiveAttributeSystem {
  private baseAttrSignals: Map<CharacterAttrEnum, Signal<CharacterAttrData>> = new Map();
  private computedAttrSignals: Map<CharacterAttrEnum, Signal<CharacterAttrData>> = new Map();
  private config: CharacterWithRelations;
  private dispose: (() => void) | null = null;

  constructor(character: CharacterWithRelations) {
    this.config = character;

    // 在 createRoot 中初始化响应式属性
    this.dispose = createRoot((dispose) => {
      this.initializeReactiveAttributes();
      return dispose;
    });
  }

  // 初始化响应式属性系统
  private initializeReactiveAttributes(): void {
    // 1. 初始化基础属性信号
    this.initializeBaseAttributes();

    // 2. 动态建立计算属性的响应式计算
    this.setupComputedAttributes();
  }

  // 初始化基础属性
  private initializeBaseAttributes(): void {
    // 基础属性列表（可被外界修改）
    const BASE_ATTRS = [
      CharacterAttrEnum.LV,
      CharacterAttrEnum.STR,
      CharacterAttrEnum.INT,
      CharacterAttrEnum.VIT,
      CharacterAttrEnum.AGI,
      CharacterAttrEnum.DEX,
      CharacterAttrEnum.LUK,
      CharacterAttrEnum.TEC,
      CharacterAttrEnum.MEN,
      CharacterAttrEnum.CRI,
      CharacterAttrEnum.MAINWEAPON_BASE_VALUE,
      CharacterAttrEnum.SUBWEAPON_BASE_VALUE,
      CharacterAttrEnum.BODYARMOR_BASE_VALUE,
    ];

    for (const attr of BASE_ATTRS) {
      const initialAttrData = this.createInitialAttrData(attr);
      this.baseAttrSignals.set(attr, createSignal(initialAttrData));
    }
  }

  // 创建初始属性数据
  private createInitialAttrData(attr: CharacterAttrEnum): CharacterAttrData {
    const baseValue = this.getBaseValue(attr);

    return {
      type: ValueType.user,
      name: attr,
      baseValue: baseValue,
      modifiers: DefaultModifiersData,
      influences: [], // 基础属性暂时没有影响其他属性的逻辑
    };
  }

  // 获取基础值
  private getBaseValue(attr: CharacterAttrEnum): number {
    switch (attr) {
      case CharacterAttrEnum.LV:
        return this.config.lv;
      case CharacterAttrEnum.STR:
        return this.config.str;
      case CharacterAttrEnum.INT:
        return this.config.int;
      case CharacterAttrEnum.VIT:
        return this.config.vit;
      case CharacterAttrEnum.AGI:
        return this.config.agi;
      case CharacterAttrEnum.DEX:
        return this.config.dex;
      case CharacterAttrEnum.LUK:
        return this.config.personalityType === "Luk" ? this.config.personalityValue : 0;
      case CharacterAttrEnum.TEC:
        return this.config.personalityType === "Tec" ? this.config.personalityValue : 0;
      case CharacterAttrEnum.MEN:
        return this.config.personalityType === "Men" ? this.config.personalityValue : 0;
      case CharacterAttrEnum.CRI:
        return this.config.personalityType === "Cri" ? this.config.personalityValue : 0;
      case CharacterAttrEnum.MAINWEAPON_BASE_VALUE:
        return (this.config.weapon.baseAbi ?? this.config.weapon.template.baseAbi) + this.config.weapon.extraAbi;
      case CharacterAttrEnum.SUBWEAPON_BASE_VALUE:
        return (
          (this.config.subWeapon.baseAbi ?? this.config.subWeapon.template.baseAbi) + this.config.subWeapon.extraAbi
        );
      case CharacterAttrEnum.BODYARMOR_BASE_VALUE:
        return (this.config.armor.baseDef ?? this.config.armor.template.baseDef) + this.config.armor.extraAbi;
      default:
        return 0;
    }
  }

  // 设置计算属性
  private setupComputedAttributes(): void {
    // 按依赖深度排序，确保依赖的属性先计算
    const sortedDependencies = this.sortDependenciesByDepth(this.getAttributeDependencies());

    for (const dependency of sortedDependencies) {
      this.createComputedAttribute(dependency);
    }
  }

  // 获取属性依赖关系
  private getAttributeDependencies(): AttributeDependency[] {
    const weaponType = this.config.weapon.template.type as MainHandType;
    const weaponAbiT = MainWeaponAbiT[weaponType];

    return [
      {
        target: CharacterAttrEnum.MAINWEAPON_ATK,
        dependencies: [CharacterAttrEnum.MAINWEAPON_BASE_VALUE],
        formula: (deps: Record<CharacterAttrEnum, number>) => deps[CharacterAttrEnum.MAINWEAPON_BASE_VALUE],
        description: "主武器攻击 = 主武器基础值",
      },
      {
        target: CharacterAttrEnum.SUBWEAPON_ATK,
        dependencies: [CharacterAttrEnum.SUBWEAPON_BASE_VALUE],
        formula: (deps: Record<CharacterAttrEnum, number>) => deps[CharacterAttrEnum.SUBWEAPON_BASE_VALUE],
        description: "副武器攻击 = 副武器基础值",
      },
      {
        target: CharacterAttrEnum.WEAPON_ATK,
        dependencies: [CharacterAttrEnum.MAINWEAPON_ATK, CharacterAttrEnum.SUBWEAPON_ATK],
        formula: (deps: Record<CharacterAttrEnum, number>) =>
          deps[CharacterAttrEnum.MAINWEAPON_ATK] + deps[CharacterAttrEnum.SUBWEAPON_ATK],
        description: "武器攻击 = 主武器攻击 + 副武器攻击",
      },
      {
        target: CharacterAttrEnum.BODYARMOR_DEF,
        dependencies: [CharacterAttrEnum.BODYARMOR_BASE_VALUE],
        formula: (deps: Record<CharacterAttrEnum, number>) => deps[CharacterAttrEnum.BODYARMOR_BASE_VALUE],
        description: "身体装备防御 = 防具基础值",
      },
      {
        target: CharacterAttrEnum.PHYSICAL_ATK,
        dependencies: [
          CharacterAttrEnum.LV,
          CharacterAttrEnum.STR,
          CharacterAttrEnum.INT,
          CharacterAttrEnum.AGI,
          CharacterAttrEnum.DEX,
          CharacterAttrEnum.WEAPON_ATK,
        ],
        formula: (deps: Record<CharacterAttrEnum, number>) => {
          return (
            deps[CharacterAttrEnum.LV] +
            deps[CharacterAttrEnum.STR] * weaponAbiT.abi_Attr_Convert.str.pAtkC +
            deps[CharacterAttrEnum.INT] * weaponAbiT.abi_Attr_Convert.int.pAtkC +
            deps[CharacterAttrEnum.AGI] * weaponAbiT.abi_Attr_Convert.agi.pAtkC +
            deps[CharacterAttrEnum.DEX] * weaponAbiT.abi_Attr_Convert.dex.pAtkC +
            deps[CharacterAttrEnum.WEAPON_ATK] * weaponAbiT.weaAtk_Patk_Convert
          );
        },
        description: "物理攻击 = 等级 + 力量*系数 + 智力*系数 + 敏捷*系数 + 灵巧*系数 + 武器攻击*系数",
      },
      {
        target: CharacterAttrEnum.MAGICAL_ATK,
        dependencies: [
          CharacterAttrEnum.LV,
          CharacterAttrEnum.STR,
          CharacterAttrEnum.INT,
          CharacterAttrEnum.AGI,
          CharacterAttrEnum.DEX,
          CharacterAttrEnum.WEAPON_ATK,
        ],
        formula: (deps: Record<CharacterAttrEnum, number>) => {
          return (
            deps[CharacterAttrEnum.LV] +
            deps[CharacterAttrEnum.STR] * weaponAbiT.abi_Attr_Convert.str.mAtkC +
            deps[CharacterAttrEnum.INT] * weaponAbiT.abi_Attr_Convert.int.mAtkC +
            deps[CharacterAttrEnum.AGI] * weaponAbiT.abi_Attr_Convert.agi.mAtkC +
            deps[CharacterAttrEnum.DEX] * weaponAbiT.abi_Attr_Convert.dex.mAtkC +
            deps[CharacterAttrEnum.WEAPON_ATK] * weaponAbiT.weaAtk_Matk_Convert
          );
        },
        description: "魔法攻击 = 等级 + 力量*系数 + 智力*系数 + 敏捷*系数 + 灵巧*系数 + 武器攻击*系数",
      },
      {
        target: CharacterAttrEnum.ASPD,
        dependencies: [
          CharacterAttrEnum.LV,
          CharacterAttrEnum.STR,
          CharacterAttrEnum.INT,
          CharacterAttrEnum.AGI,
          CharacterAttrEnum.DEX,
        ],
        formula: (deps: Record<CharacterAttrEnum, number>) => {
          return (
            deps[CharacterAttrEnum.LV] +
            deps[CharacterAttrEnum.STR] * weaponAbiT.abi_Attr_Convert.str.aspdC +
            deps[CharacterAttrEnum.INT] * weaponAbiT.abi_Attr_Convert.int.aspdC +
            deps[CharacterAttrEnum.AGI] * weaponAbiT.abi_Attr_Convert.agi.aspdC +
            deps[CharacterAttrEnum.DEX] * weaponAbiT.abi_Attr_Convert.dex.aspdC
          );
        },
        description: "攻击速度 = 等级 + 力量*系数 + 智力*系数 + 敏捷*系数 + 灵巧*系数",
      },
      {
        target: CharacterAttrEnum.CSPD,
        dependencies: [CharacterAttrEnum.LV, CharacterAttrEnum.AGI, CharacterAttrEnum.DEX],
        formula: (deps: Record<CharacterAttrEnum, number>) => {
          return deps[CharacterAttrEnum.LV] + deps[CharacterAttrEnum.AGI] * 1.16 + deps[CharacterAttrEnum.DEX] * 2.94;
        },
        description: "咏唱速度 = 等级 + 敏捷*1.16 + 灵巧*2.94",
      },
      {
        target: CharacterAttrEnum.MSPD,
        dependencies: [CharacterAttrEnum.ASPD],
        formula: (deps: Record<CharacterAttrEnum, number>) =>
          Math.max(0, Math.floor((deps[CharacterAttrEnum.ASPD] - 1000) / 180)),
        description: "行动速度 = max(0, floor((攻击速度 - 1000) / 180))",
      },
      {
        target: CharacterAttrEnum.CSRD,
        dependencies: [CharacterAttrEnum.CSPD],
        formula: (deps: Record<CharacterAttrEnum, number>) =>
          Math.min(
            50 + Math.floor((deps[CharacterAttrEnum.CSPD] - 1000) / 180),
            Math.floor(deps[CharacterAttrEnum.CSPD] / 20),
          ),
        description: "咏唱缩减 = min(50 + floor((咏唱速度 - 1000) / 180), floor(咏唱速度 / 20))",
      },
      {
        target: CharacterAttrEnum.HP,
        dependencies: [CharacterAttrEnum.LV, CharacterAttrEnum.VIT],
        formula: (deps: Record<CharacterAttrEnum, number>) =>
          (deps[CharacterAttrEnum.LV] * 127) / 17 + (deps[CharacterAttrEnum.VIT] * deps[CharacterAttrEnum.LV]) / 3,
        description: "生命值 = 等级*127/17 + 体力*等级/3",
      },
      {
        target: CharacterAttrEnum.MP,
        dependencies: [CharacterAttrEnum.LV, CharacterAttrEnum.INT],
        formula: (deps: Record<CharacterAttrEnum, number>) =>
          deps[CharacterAttrEnum.LV] + deps[CharacterAttrEnum.INT] * 0.1,
        description: "魔法值 = 等级 + 智力*0.1",
      },
      {
        target: CharacterAttrEnum.PHYSICAL_STABILITY,
        dependencies: [CharacterAttrEnum.STR, CharacterAttrEnum.INT, CharacterAttrEnum.AGI, CharacterAttrEnum.DEX],
        formula: (deps: Record<CharacterAttrEnum, number>) => {
          return (
            deps[CharacterAttrEnum.STR] * weaponAbiT.abi_Attr_Convert.str.pStabC +
            deps[CharacterAttrEnum.INT] * weaponAbiT.abi_Attr_Convert.int.pStabC +
            deps[CharacterAttrEnum.AGI] * weaponAbiT.abi_Attr_Convert.agi.pStabC +
            deps[CharacterAttrEnum.DEX] * weaponAbiT.abi_Attr_Convert.dex.pStabC
          );
        },
        description: "物理稳定率 = 力量*系数 + 智力*系数 + 敏捷*系数 + 灵巧*系数",
      },
      {
        target: CharacterAttrEnum.PHYSICAL_CRITICAL_DAMAGE,
        dependencies: [CharacterAttrEnum.STR, CharacterAttrEnum.AGI],
        formula: (deps: Record<CharacterAttrEnum, number>) => {
          const baseDamage = 150;
          const strBonus =
            deps[CharacterAttrEnum.STR] * (deps[CharacterAttrEnum.STR] >= deps[CharacterAttrEnum.AGI] ? 0.2 : 0);
          const agiBonus =
            deps[CharacterAttrEnum.AGI] * (deps[CharacterAttrEnum.AGI] > deps[CharacterAttrEnum.STR] ? 0.1 : 0);
          return baseDamage + strBonus + agiBonus;
        },
        description: "物理暴击伤害 = 150 + 力量加成 + 敏捷加成",
      },
    ];
  }

  // 创建计算属性
  private createComputedAttribute(dependency: AttributeDependency): void {
    const { target, dependencies, formula } = dependency;

    // 创建响应式计算
    const computedSignal = createMemo(() => {
      // 收集所有依赖属性的当前值
      const depValues: Record<CharacterAttrEnum, number> = {} as Record<CharacterAttrEnum, number>;

      for (const depAttr of dependencies) {
        depValues[depAttr] = this.getAttributeValue(depAttr);
      }

      // 应用计算公式
      return formula(depValues);
    });

    // 将 createMemo 的结果包装成类似 signal 的结构
    this.computedAttrSignals.set(target, [computedSignal, () => {}] as ReturnType<typeof createSignal<number>>);
  }

  // 获取属性值
  private getAttributeValue(attr: CharacterAttrEnum): number {
    // 优先从计算属性获取
    const computedSignal = this.computedAttrSignals.get(attr);
    if (computedSignal) {
      return computedSignal[0]();
    }

    // 从基础属性获取
    const baseSignal = this.baseAttrSignals.get(attr);
    if (baseSignal) {
      const attrData = baseSignal[0]();
      return dynamicTotalValue(attrData);
    }

    return 0;
  }

  // 拓扑排序依赖关系
  private sortDependenciesByDepth(dependencies: AttributeDependency[]): AttributeDependency[] {
    // 构建依赖图
    const dependencyGraph = new Map<CharacterAttrEnum, Set<CharacterAttrEnum>>();

    for (const dep of dependencies) {
      dependencyGraph.set(dep.target, new Set(dep.dependencies));
    }

    // 拓扑排序
    const sorted: AttributeDependency[] = [];
    const visited = new Set<CharacterAttrEnum>();
    const visiting = new Set<CharacterAttrEnum>();

    const visit = (target: CharacterAttrEnum) => {
      if (visiting.has(target)) {
        throw new Error(`Circular dependency detected: ${target}`);
      }
      if (visited.has(target)) return;

      visiting.add(target);
      const deps = dependencyGraph.get(target);
      if (deps) {
        for (const dep of deps) {
          visit(dep);
        }
      }
      visiting.delete(target);
      visited.add(target);
    };

    // 对每个目标属性进行拓扑排序
    for (const dep of dependencies) {
      if (!visited.has(dep.target)) {
        visit(dep.target);
      }
    }

    // 按访问顺序排序依赖关系
    const visitOrder = Array.from(visited);
    return dependencies.sort((a, b) => {
      const aIndex = visitOrder.indexOf(a.target);
      const bIndex = visitOrder.indexOf(b.target);
      return aIndex - bIndex;
    });
  }

  // 外界接口：设置属性值
  setPlayerAttr(attrName: CharacterAttrEnum, value: number): void {
    const signal = this.baseAttrSignals.get(attrName);
    if (signal) {
      const currentAttrData = signal[0]();
      const updatedAttrData: CharacterAttrData = {
        ...currentAttrData,
        baseValue: value,
      };
      signal[1](updatedAttrData); // 更新基础属性
      // 计算属性会自动重新计算，无需手动触发
    }
  }

  // 外界接口：获取属性值
  getPlayerAttr(attrName: CharacterAttrEnum): number {
    return this.getAttributeValue(attrName);
  }

  // 获取所有属性值
  getAllAttributes(): Record<CharacterAttrEnum, number> {
    const result: Record<CharacterAttrEnum, number> = {} as Record<CharacterAttrEnum, number>;

    // 获取所有基础属性
    for (const [attr, signal] of this.baseAttrSignals) {
      const attrData = signal[0]();
      result[attr] = dynamicTotalValue(attrData);
    }

    // 获取所有计算属性
    for (const [attr, signal] of this.computedAttrSignals) {
      result[attr] = signal[0]();
    }

    return result;
  }

  // 获取属性依赖关系信息
  getAttributeDependencyInfo(): AttributeDependency[] {
    return this.getAttributeDependencies();
  }

  // 清理资源
  cleanup(): void {
    if (this.dispose) {
      this.dispose();
      this.dispose = null;
    }
  }
}

// 导出响应式属性系统类
export { ReactiveAttributeSystem };

// 创建响应式属性系统的工厂函数
export function createReactiveAttributeSystem(character: CharacterWithRelations) {
  // 在 Worker 中直接创建系统，不需要额外的 createRoot 包装
  // 因为 ReactiveAttributeSystem 内部已经管理了信号的创建
  return new ReactiveAttributeSystem(character);
}
