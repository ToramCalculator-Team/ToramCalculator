/**
 * 玩家数据配置
 */
import { MainHandType, SubHandType } from "@db/schema/enums";

/*
 * 命名说明：
 * XX基础值：指的是可被百分比加成和常数加成增幅的属性，比如基础智力（可被百分比智力加成和常数智力加成增幅）、
 *          基础武器攻击（可被百分比武器攻击加成和常数武器攻击加成增幅）
 */

// ============================== 玩家属性枚举 ==============================
/*
 * 玩家属性是指的作为Member在引擎中需要缓存的计算属性，包括机体的静态配置，朝向等状态数据，
 * 这些属性主要是为了在引擎中给mathjs充当scope，并提高计算效率，避免每次计算都重新从机体配置计算
 */
export enum PlayerAttrEnum {
  lv, // 等级
  str, // 力量
  int, // 智力
  vit, // 耐力
  agi, // 敏捷
  dex, // 灵巧
  luk, // 幸运
  tec, // 技巧
  men, // 异抗
  cri, // 暴击
  maxMp, // 最大MP
  aggroRate, // 仇恨值倍率
  weaponRange, // 武器射程
  hpRegen, // HP自然回复
  mpRegen, // MP自然回复
  mpAtkRegen, // MP攻击回复
  // 单次伤害增幅
  physicalAtk, // 物理攻击
  magicalAtk, // 魔法攻击
  weaponAtk, // 武器攻击
  unsheatheAtk, // 拔刀攻击
  physicalPierce, // 物理贯穿
    magicalPierce, // 魔法贯穿
  physicalCriticalRate, // 暴击率
  physicalCriticalDamage, // 暴击伤害
  magicalCrtConversionRate, // 魔法暴击转化率
  magicalCrtDamageConversionRate, // 魔法爆伤转化率
  magicalCriticalRate, // 魔法暴击率
  magicalCriticalDamage, // 魔法暴击伤害
  shortRangeDamage, // 近距离威力
  longRangeDamage, // 远距离威力
  strongerAgainstNetural, // 对无属性增强
  strongerAgainstLight, // 对光属性增强
  strongerAgainstDark, // 对暗属性增强
  strongerAgainstWater, // 对水属性增强
  strongerAgainstFire, // 对火属性增强
  strongerAgainstEarth, // 对地属性增强
  strongerAgainstWind, // 对风属性增强
  totalDamage, // 总伤害
  finalDamage, // 最终伤害
  physicalStability, // 稳定率
  magicalStability, // 魔法稳定率
  accuracy, // 命中
  additionalPhysics, // 物理追击
  additionalMagic, // 魔法追击
  anticipate, // 看穿
  guardBreak, // 破防
  reflect, // 反弹伤害
  absoluteAccuracy, // 绝对命中
    atkUpStr, // 物理攻击提升（力量）
  atkUpInt, // 物理攻击提升（智力）
  atkUpVit, // 物理攻击提升（耐力）
  atkUpAgi, // 物理攻击提升（敏捷）
  atkUpDex, // 物理攻击提升（灵巧）
  matkUpStr, // 魔法攻击提升（力量）
  matkUpInt, // 魔法攻击提升（智力）
  matkUpVit, // 魔法攻击提升（耐力）
  matkUpAgi, // 魔法攻击提升（敏捷）
  matkUpDex, // 魔法攻击提升（灵巧）
  atkDownStr, // 物理攻击下降（力量）
  atkDownInt, // 物理攻击下降（智力）
  atkDownVit, // 物理攻击下降（耐力）
  atkDownAgi, // 物理攻击下降（敏捷）
  atkDownDex, // 物理攻击下降（灵巧）
  matkDownStr, // 魔法攻击下降（力量）
  matkDownInt, // 魔法攻击下降（智力）
  matkDownVit, // 魔法攻击下降（耐力）
  matkDownAgi, // 魔法攻击下降（敏捷）
  matkDownDex, // 魔法攻击下降（灵巧）
  // 生存能力加成
  maxHp, // 最大HP
  bodyArmorDef, // 身体装备防御
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
  guardPower, // 格挡力
  guardRechange, // 格挡回复
  evasionRecharge, // 闪躲回复
  physicalBarrier, // 物理屏障
  magicalBarrier, // 魔法屏障
  fractionalBarrier, // 百分比瓶屏障
  barrierCooldown, // 屏障回复速度
  reduceDmgFloor, // 地面伤害减轻（地刺）
  reduceDmgMeteor, // 陨石伤害减轻（天火）
  reduceDmgPlayerEpicenter, // 范围伤害减轻（以玩家为中心的范围伤害）
  reduceDmgFoeEpicenter, // 敌方周围伤害减轻（以怪物自身为中心的范围伤害）
  reduceDmgBowling, // 贴地伤害减轻（剑气、风刃）
  reduceDmgBullet, // 子弹伤害减轻（各种球）
  reduceDmgStraightLine, // 直线伤害减轻（激光）
  reduceDmgCharge, // 冲撞伤害减轻（怪物的位移技能）
  absoluteDodge, // 绝对回避
  // 速度加成
  aspd, // 攻击速度
  mspd, // 行动速度
  msrd, // 动作缩减
  cspd, // 咏唱速度
  csr, // 咏唱缩减
  // 其他加成
  dropRate, // 掉宝率
  reviveTime, // 复活时间
  flinchUnavailable, // 封印胆怯
  tumbleUnavailable, // 封印翻覆
  stunUnavailable, // 封印昏厥
  invincibleAid, // 无敌急救
  expRate, // 经验加成
  petExp, // 宠物经验
  itemCooldown, // 道具冷却
  recoilDamage, // 反作用伤害
  gemPowderDrop, // 晶石粉末掉落
  // 中间数值
  weaponMatkConversionRate, // 主武器魔法攻击转换率
  weaponAtkConversionRate, // 主武器物理攻击转换率
  mainWeaponBaseValue, // 主武器基础值
  mainWeaponAtk, // 主武器攻击
  subWeaponBaseValue, // 副武器基础值
  subWeaponAtk, // 副武器攻击
  bodyArmorBaseValue, // 防具基础值
}
export type PlayerAttrType = keyof typeof PlayerAttrEnum;
export const PlayerAttrDic: Record<PlayerAttrType, string> = {
  lv: "等级",
  str: "力量",
  int: "智力",
  vit: "体力",
  agi: "敏捷",
  dex: "灵巧",
  luk: "幸运",
  tec: "技巧",
  men: "异抗",
  cri: "暴击",
  maxHp: "最大HP",
  maxMp: "最大MP",
  aggroRate: "仇恨值倍率",
  weaponRange: "武器射程",
  hpRegen: "HP自然回复",
  mpRegen: "MP自然回复",
  mpAtkRegen: "MP攻击回复",
  physicalAtk: "物理攻击",
  magicalAtk: "魔法攻击",
  weaponAtk: "武器攻击",
  unsheatheAtk: "拔刀攻击",
  physicalPierce: "物理贯穿",
  magicalPierce: "魔法贯穿",
  physicalCriticalRate: "物理暴击率",
  physicalCriticalDamage: "物理暴击伤害",
  magicalCrtConversionRate: "魔法暴击转化率",
  magicalCrtDamageConversionRate: "魔法爆伤转化率",
  magicalCriticalRate: "魔法暴击率",
  magicalCriticalDamage: "魔法暴击伤害",
  shortRangeDamage: "近距离威力",
  longRangeDamage: "远距离威力",
  strongerAgainstNetural: "对无属性增强",
  strongerAgainstLight: "对光属性增强",
  strongerAgainstDark: "对暗属性增强",
  strongerAgainstWater: "对水属性增强",
  strongerAgainstFire: "对火属性增强",
  strongerAgainstEarth: "对地属性增强",
  strongerAgainstWind: "对风属性增强",
  totalDamage: "总伤害",
  finalDamage: "最终伤害",
  physicalStability: "物理稳定率",
  magicalStability: "魔法稳定率",
  accuracy: "命中",
  additionalPhysics: "物理追击",
  additionalMagic: "魔法追击",
  anticipate: "看穿",
  guardBreak: "破防",
  reflect: "反弹伤害",
  absoluteAccuracy: "绝对命中",
  atkUpStr: "物理攻击提升（力量）",
  atkUpInt: "物理攻击提升（智力）",
  atkUpVit: "物理攻击提升（耐力）",
  atkUpAgi: "物理攻击提升（敏捷）",
  atkUpDex: "物理攻击提升（灵巧）",
  matkUpStr: "魔法攻击提升（力量）",
  matkUpInt: "魔法攻击提升（智力）",
  matkUpVit: "魔法攻击提升（耐力）",
  matkUpAgi: "魔法攻击提升（敏捷）",
  matkUpDex: "魔法攻击提升（灵巧）",
  atkDownStr: "物理攻击下降（力量）",
  atkDownInt: "物理攻击下降（智力）",
  atkDownVit: "物理攻击下降（耐力）",
  atkDownAgi: "物理攻击下降（敏捷）",
  atkDownDex: "物理攻击下降（灵巧）",
  matkDownStr: "魔法攻击下降（力量）",
  matkDownInt: "魔法攻击下降（智力）",
  matkDownVit: "魔法攻击下降（耐力）",
  matkDownAgi: "魔法攻击下降（敏捷）",
  matkDownDex: "魔法攻击下降（灵巧）",
  bodyArmorDef: "身体装备防御",
  physicalDef: "物理防御",
  magicalDef: "魔法防御",
  physicalResistance: "物理抗性",
  magicalResistance: "魔法抗性",
  neutralResistance: "无属性抗性",
  lightResistance: "光属性抗性",
  darkResistance: "暗属性抗性",
  waterResistance: "水属性抗性",
  fireResistance: "火属性抗性",
  earthResistance: "地属性抗性",
  windResistance: "风属性抗性",
  dodge: "回避",
  ailmentResistance: "异常抗性",
  guardPower: "格挡力",
  guardRechange: "格挡回复",
  evasionRecharge: "闪躲回复",
  physicalBarrier: "物理屏障",
  magicalBarrier: "魔法屏障",
  fractionalBarrier: "百分比瓶屏障",
  barrierCooldown: "屏障回复速度",
  reduceDmgFloor: "地面伤害减轻（地刺）",
  reduceDmgMeteor: "陨石伤害减轻（天火）",
  reduceDmgPlayerEpicenter: "范围伤害减轻（以玩家为中心的范围伤害）",
  reduceDmgFoeEpicenter: "敌方周围伤害减轻（以怪物自身为中心的范围伤害）",
  reduceDmgBowling: "贴地伤害减轻（剑气、风刃）",
  reduceDmgBullet: "子弹伤害减轻（各种球）",
  reduceDmgStraightLine: "直线伤害减轻（激光）",
  reduceDmgCharge: "冲撞伤害减轻（怪物的位移技能）",
  absoluteDodge: "绝对回避",
  aspd: "攻击速度",
  mspd: "行动速度",
  msrd: "动作缩减",
  cspd: "咏唱速度",
  csr: "咏唱缩减",
  dropRate: "掉宝率",
  reviveTime: "复活时间",
  flinchUnavailable: "封印胆怯",
  tumbleUnavailable: "封印翻覆",
  stunUnavailable: "封印昏厥",
  invincibleAid: "无敌急救",
  expRate: "经验加成",
  petExp: "宠物经验",
  itemCooldown: "道具冷却",
  recoilDamage: "反作用伤害",
  gemPowderDrop: "晶石粉末掉落",
  weaponMatkConversionRate: "主武器魔法攻击转换率",
  weaponAtkConversionRate: "主武器物理攻击转换率",
  mainWeaponBaseValue: "主武器基础值",
  mainWeaponAtk: "主武器攻击",
  subWeaponBaseValue: "副武器基础值",
  subWeaponAtk: "副武器攻击",
  bodyArmorBaseValue: "防具基础值",
};
export const PlayerAttrKeys = Object.keys(PlayerAttrDic) as PlayerAttrType[];

// ============================== 属性表达式定义 ==============================

/**
 * 属性表达式定义
 * 使用 MathJS 表达式作为单一事实来源
 * 表达式会自动解析依赖关系
 */
export const PlayerAttrExpressionsMap = new Map<PlayerAttrType, { expression: string; isBase?: boolean }>([
  ["lv", { expression: "lv", isBase: true }],
  ["str", { expression: "str", isBase: true }],
  ["int", { expression: "int", isBase: true }],
  ["vit", { expression: "vit", isBase: true }],
  ["agi", { expression: "agi", isBase: true }],
  ["dex", { expression: "dex", isBase: true }],
  ["luk", { expression: "luk", isBase: true }],
]);

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
      baseAbi: "armor.baseAbi",
      refv: "armor.refv",
      type: "armor.type",
      aspdM: "armor.type === 'light' ? 0.5 : armor.type === 'heavy' ? -0.5 : 0",
    },
  },
};

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
