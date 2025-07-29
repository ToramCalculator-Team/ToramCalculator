/**
 * 玩家数据配置
 */
import { MainHandType, SubHandType } from "@db/schema/enums";

/*
 * 命名说明：
 * XX基础值：指的是可被百分比加成和常数加成增幅的属性，比如基础智力（可被百分比智力加成和常数智力加成增幅）、
 *          基础武器攻击（可被百分比武器攻击加成和常数武器攻击加成增幅）
 * 
 * 物理相关：physical → p
 * 魔法相关：magical → m
 * 攻击相关：attack → atk
 * 防御相关：defense → def
 * 抗性相关：resistance → res
 * 伤害相关：damage → dmg
 * 减轻相关：reduce → red
 * 增强相关：strongerAgainst → vs
 * 转换率相关：conversionRate → conv
 * 基础值相关：baseValue → base
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
  pAtk, // 物理攻击
  mAtk, // 魔法攻击
  weaponAtk, // 武器攻击
  unsheatheAtk, // 拔刀攻击
  pPierce, // 物理贯穿
  mPierce, // 魔法贯穿
  pCritRate, // 物理暴击率
  pCritDmg, // 物理暴击伤害
  mCritConvRate, // 魔法暴击转化率
  mCritDmgConvRate, // 魔法爆伤转化率
  mCritRate, // 魔法暴击率
  mCritDmg, // 魔法暴击伤害
  shortRangeDmg, // 近距离威力
  longRangeDmg, // 远距离威力
  vsNeutral, // 对无属性增强
  vsLight, // 对光属性增强
  vsDark, // 对暗属性增强
  vsWater, // 对水属性增强
  vsFire, // 对火属性增强
  vsEarth, // 对地属性增强
  vsWind, // 对风属性增强
  totalDmg, // 总伤害
  finalDmg, // 最终伤害
  pStab, // 物理稳定率
  mStab, // 魔法稳定率
  accuracy, // 命中
  pChase, // 物理追击
  mChase, // 魔法追击
  anticipate, // 看穿
  guardBreak, // 破防
  reflect, // 反弹伤害
  absoluteAccuracy, // 绝对命中
  pAtkUpStr, // 物理攻击提升（力量）
  pAtkUpInt, // 物理攻击提升（智力）
  pAtkUpVit, // 物理攻击提升（耐力）
  pAtkUpAgi, // 物理攻击提升（敏捷）
  pAtkUpDex, // 物理攻击提升（灵巧）
  mAtkUpStr, // 魔法攻击提升（力量）
  mAtkUpInt, // 魔法攻击提升（智力）
  mAtkUpVit, // 魔法攻击提升（耐力）
  mAtkUpAgi, // 魔法攻击提升（敏捷）
  mAtkUpDex, // 魔法攻击提升（灵巧）
  pAtkDownStr, // 物理攻击下降（力量）
  pAtkDownInt, // 物理攻击下降（智力）
  pAtkDownVit, // 物理攻击下降（耐力）
  pAtkDownAgi, // 物理攻击下降（敏捷）
  pAtkDownDex, // 物理攻击下降（灵巧）
  mAtkDownStr, // 魔法攻击下降（力量）
  mAtkDownInt, // 魔法攻击下降（智力）
  mAtkDownVit, // 魔法攻击下降（耐力）
  mAtkDownAgi, // 魔法攻击下降（敏捷）
  mAtkDownDex, // 魔法攻击下降（灵巧）
  // 生存能力加成
  maxHp, // 最大HP
  bodyArmorDef, // 身体装备防御
  pDef, // 物理防御
  mDef, // 魔法防御
  pRes, // 物理抗性
  mRes, // 魔法抗性
  neutralRes, // 无属性抗性
  lightRes, // 光属性抗性
  darkRes, // 暗属性抗性
  waterRes, // 水属性抗性
  fireRes, // 火属性抗性
  earthRes, // 地属性抗性
  windRes, // 风属性抗性
  dodge, // 回避
  ailmentRes, // 异常抗性
  guardPower, // 格挡力
  guardRecharge, // 格挡回复
  evasionRecharge, // 闪躲回复
  pBarrier, // 物理屏障
  mBarrier, // 魔法屏障
  fractionalBarrier, // 百分比瓶屏障
  barrierCooldown, // 屏障回复速度
  redDmgFloor, // 地面伤害减轻（地刺）
  redDmgMeteor, // 陨石伤害减轻（天火）
  redDmgPlayerEpicenter, // 范围伤害减轻（以玩家为中心的范围伤害）
  redDmgFoeEpicenter, // 敌方周围伤害减轻（以怪物自身为中心的范围伤害）
  redDmgBowling, // 贴地伤害减轻（剑气、风刃）
  redDmgBullet, // 子弹伤害减轻（各种球）
  redDmgStraightLine, // 直线伤害减轻（激光）
  redDmgCharge, // 冲撞伤害减轻（怪物的位移技能）
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
  recoilDmg, // 反作用伤害
  gemPowderDrop, // 晶石粉末掉落
  // Player的其他属性扁平化
  weaponMAtkConv, // 主武器魔法攻击转换率
  weaponPAtkConv, // 主武器物理攻击转换率
  mainWeaponBaseAtk, // 主武器基础值
  mainWeaponAtk, // 主武器攻击
  subWeaponBaseAtk, // 副武器基础值
  subWeaponAtk, // 副武器攻击
  bodyArmorBaseDef, // 防具基础值
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
  pAtk: "物理攻击",
  mAtk: "魔法攻击",
  weaponAtk: "武器攻击",
  unsheatheAtk: "拔刀攻击",
  pPierce: "物理贯穿",
  mPierce: "魔法贯穿",
  pCritRate: "物理暴击率",
  pCritDmg: "物理暴击伤害",
  mCritConvRate: "魔法暴击转化率",
  mCritDmgConvRate: "魔法爆伤转化率",
  mCritRate: "魔法暴击率",
  mCritDmg: "魔法暴击伤害",
  shortRangeDmg: "近距离威力",
  longRangeDmg: "远距离威力",
  vsNeutral: "对无属性增强",
  vsLight: "对光属性增强",
  vsDark: "对暗属性增强",
  vsWater: "对水属性增强",
  vsFire: "对火属性增强",
  vsEarth: "对地属性增强",
  vsWind: "对风属性增强",
  totalDmg: "总伤害",
  finalDmg: "最终伤害",
  pStab: "物理稳定率",
  mStab: "魔法稳定率",
  accuracy: "命中",
  pChase: "物理追击",
  mChase: "魔法追击",
  anticipate: "看穿",
  guardBreak: "破防",
  reflect: "反弹伤害",
  absoluteAccuracy: "绝对命中",
  pAtkUpStr: "物理攻击提升（力量）",
  pAtkUpInt: "物理攻击提升（智力）",
  pAtkUpVit: "物理攻击提升（耐力）",
  pAtkUpAgi: "物理攻击提升（敏捷）",
  pAtkUpDex: "物理攻击提升（灵巧）",
  mAtkUpStr: "魔法攻击提升（力量）",
  mAtkUpInt: "魔法攻击提升（智力）",
  mAtkUpVit: "魔法攻击提升（耐力）",
  mAtkUpAgi: "魔法攻击提升（敏捷）",
  mAtkUpDex: "魔法攻击提升（灵巧）",
  pAtkDownStr: "物理攻击下降（力量）",
  pAtkDownInt: "物理攻击下降（智力）",
  pAtkDownVit: "物理攻击下降（耐力）",
  pAtkDownAgi: "物理攻击下降（敏捷）",
  pAtkDownDex: "物理攻击下降（灵巧）",
  mAtkDownStr: "魔法攻击下降（力量）",
  mAtkDownInt: "魔法攻击下降（智力）",
  mAtkDownVit: "魔法攻击下降（耐力）",
  mAtkDownAgi: "魔法攻击下降（敏捷）",
  mAtkDownDex: "魔法攻击下降（灵巧）",
  bodyArmorDef: "身体装备防御",
  pDef: "物理防御",
  mDef: "魔法防御",
  pRes: "物理抗性",
  mRes: "魔法抗性",
  neutralRes: "无属性抗性",
  lightRes: "光属性抗性",
  darkRes: "暗属性抗性",
  waterRes: "水属性抗性",
  fireRes: "火属性抗性",
  earthRes: "地属性抗性",
  windRes: "风属性抗性",
  dodge: "回避",
  ailmentRes: "异常抗性",
  guardPower: "格挡力",
  guardRecharge: "格挡回复",
  evasionRecharge: "闪躲回复",
  pBarrier: "物理屏障",
  mBarrier: "魔法屏障",
  fractionalBarrier: "百分比瓶屏障",
  barrierCooldown: "屏障回复速度",
  redDmgFloor: "地面伤害减轻（地刺）",
  redDmgMeteor: "陨石伤害减轻（天火）",
  redDmgPlayerEpicenter: "范围伤害减轻（以玩家为中心的范围伤害）",
  redDmgFoeEpicenter: "敌方周围伤害减轻（以怪物自身为中心的范围伤害）",
  redDmgBowling: "贴地伤害减轻（剑气、风刃）",
  redDmgBullet: "子弹伤害减轻（各种球）",
  redDmgStraightLine: "直线伤害减轻（激光）",
  redDmgCharge: "冲撞伤害减轻（怪物的位移技能）",
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
  recoilDmg: "反作用伤害",
  gemPowderDrop: "晶石粉末掉落",
  weaponMAtkConv: "主武器魔法攻击转换率",
  weaponPAtkConv: "主武器物理攻击转换率",
  mainWeaponBaseAtk: "主武器基础值",
  mainWeaponAtk: "主武器攻击",
  subWeaponBaseAtk: "副武器基础值",
  subWeaponAtk: "副武器攻击",
  bodyArmorBaseDef: "防具基础值",
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
  ["luk", { expression: "personalityType === 'Luk' ? luk : 0", isBase: true }],
  ["tec", { expression: "personalityType === 'Tec' ? tec : 0", isBase: true }],
  ["men", { expression: "personalityType === 'Men' ? men : 0", isBase: true }],
  ["cri", { expression: "personalityType === 'Cri' ? cri : 0", isBase: true }],
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
