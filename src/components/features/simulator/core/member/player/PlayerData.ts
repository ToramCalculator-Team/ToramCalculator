/**
 * 玩家数据配置
 */
import { CharacterWithRelations } from "@db/generated/repositories/character";
import { MainHandType, SubHandType } from "@db/schema/enums";
import { ConvertToNestedSchema, ConvertToNestedSchemaDic, ConvertToSchema } from "../../dataSys/SchemaTypes";
import { MemberBaseStructure } from "../MemberBaseSchema";

// ============================== 其他玩家数据 ==============================

// 主武器的属性转换映射
export const MainWeaponTypeMap: Record<
  MainHandType,
  {
    range: number;
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
    range: 2,
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
    range: 2,
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
    range: 3,
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
    range: 6,
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
    range: 6,
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
    range: 1,
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
    range: 6,
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
    range: 1,
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
    range: 3,
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
    range: 1,
  },
};

// 副武器的属性转换映射
export const SubWeaponTypeMap: Record<
  SubHandType,
  {
    range: number;
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
    range: 0,
  },
  OneHandSword: {
    aspdM: 0,
    pAtkM: 0,
    mAtkM: 0,
    pDefM: 0,
    mDefM: 0,
    range: 2,
  },
  Magictool: {
    aspdM: 0,
    pAtkM: -0.15,
    mAtkM: 0,
    pDefM: 0,
    mDefM: 0,
    range: 6,
  },
  Knuckle: {
    aspdM: 0,
    pAtkM: 0,
    mAtkM: -0.15,
    pDefM: 0,
    mDefM: 0,
    range: 1,
  },
  Katana: {
    aspdM: 0,
    pAtkM: 0,
    mAtkM: 0,
    pDefM: 0,
    mDefM: 0,
    range: 2,
  },
  Arrow: {
    aspdM: 0,
    pAtkM: 0,
    mAtkM: 0,
    pDefM: -0.25,
    mDefM: -0.25,
    range: 0,
  },
  ShortSword: {
    aspdM: 0,
    pAtkM: 0,
    mAtkM: 0,
    pDefM: 0,
    mDefM: 0,
    range: 0,
  },
  NinjutsuScroll: {
    aspdM: 0,
    pAtkM: 0,
    mAtkM: 0,
    pDefM: 0,
    mDefM: 0,
    range: 0,
  },
  Shield: {
    aspdM: -0.5,
    pAtkM: 0,
    mAtkM: 0,
    pDefM: 0,
    mDefM: 0,
    range: 0,
  },
};

// ============================== 基础结构定义 ==============================

/**
 * 成员基础结构定义
 *
 * 这个接口定义了成员的基本属性结构，使用null作为占位符
 * 通过类型推导可以自动生成Schema、NestedSchema或NestedSchemaDic类型
 */
export interface PlayerDataStructure extends MemberBaseStructure {
  // ============================== 基础信息 ==============================
  lv: null;

  // ============================== 基础能力值 ==============================
  str: null;
  int: null;
  vit: null;
  agi: null;
  dex: null;
  luk: null;
  tec: null;
  men: null;
  cri: null;

  mainWeapon: {
    range: null;
    element: null;
    baseAtk: null;
    type: null;
    ref: null;
    stability: null;
  };

  subWeapon: {
    range: null;
    element: null;
    type: null;
    ref: null;
    stability: null;
  };

  armor: {
    ability: null;
    baseAbi: null;
    ref: null;
  };

  option: {
    baseAbi: null;
    ref: null;
  };

  special: {
    baseAbi: null;
  };

  conv: {
    strToPatk: null;
    intToPatk: null;
    agiToPatk: null;
    dexToPatk: null;
    strToMatk: null;
    intToMatk: null;
    agiToMatk: null;
    dexToMatk: null;
    strToAspd: null;
    intToAspd: null;
    agiToAspd: null;
    dexToAspd: null;
    strToStab: null;
    intToStab: null;
    agiToStab: null;
    dexToStab: null;
    pcrToMcr: null;
    pcdToMcd: null;
  };

  hp: {
    max: null;
    current: null;
    recovery: null;
  };

  mp: {
    max: null;
    current: null;
    recovery: null;
    atkRegen: null;
  };

  weaponAtk: {
    p: null;
    m: null;
  };

  atk: {
    p: null;
    m: null;
  };

  pie: {
    p: null;
    m: null;
  };

  def: {
    p: null;
    m: null;
  };

  c: {
    rate: {
      p: null;
      m: null;
    };
    dmg: {
      p: null;
      m: null;
    };
  };

  stab: {
    p: null;
    m: null;
  };

  red: {
    p: null;
    m: null;
    rate: null;
    water: null;
    fire: null;
    earth: null;
    wind: null;
    light: null;
    dark: null;
    normal: null;
    floor: null;
    meteor: null;
    playerEpicenter: null;
    foeEpicenter: null;
    bowling: null;
    bullet: null;
    straightLine: null;
    charge: null;
  };

  amp: {
    water: null;
    fire: null;
    earth: null;
    wind: null;
    light: null;
    dark: null;
    normal: null;
  };

  barrier: {
    p: null;
    m: null;
    rate: null;
    recharge: null;
  };

  antiVirus: null;

  pursuit: {
    rate: {
      p: null;
      m: null;
    };
    dmg: {
      p: null;
      m: null;
    };
  };

  mUpper: null;
  mLower: null;

  unsheatheAtk: null;

  distanceDmg: {
    short: null;
    long: null;
  };

  totalDmg: null;

  finalDmg: null;

  accuracy: null;

  absAccuracy: null;

  avoid: null;

  absAvoid: null;

  dodge: {
    recharge: null;
  };

  guard: {
    power: null;
    recharge: null;
  };

  anticipate: null;

  guardBreak: null;

  reflect: null;

  aspd: null;
  mspd: null;
  cspd: null;
  cspr: null;

  aggro: {
    current: null;
    rate: null;
  };
  drop: {
    rate: null;
    gemPowder: null;
  };
  exp: {
    rate: null;
    pet: null;
  };
  revival: {
    time: null;
  };
  flinchUnavailable: null;
  tumbleUnavailable: null;
  stunUnavailable: null;
  invincibleAid: null;
  itemCooldown: null;
  recoilDmg: null;
}

/**
 * 将基础结构转换为NestedSchema类型
 *
 * 递归地将null值转换为SchemaAttribute，需要提供属性工厂类型
 */
export type PlayerDataNestedSchema = ConvertToNestedSchema<PlayerDataStructure>;

/**
 * 将基础结构转换为NestedSchemaDic类型
 *
 * 递归地将null值转换为多语言对象，需要提供多语言工厂类型
 */
export type PlayerDataNestedSchemaDic = ConvertToNestedSchemaDic<PlayerDataStructure>;

// ============================== 属性Schema ==============================

/**
 * 统一的玩家属性Schema
 *
 * 结构说明：
 * - 每个属性包含displayName(显示名称)、expression(计算表达式)
 * - 嵌套结构便于用户理解和DSL编写 (如 self.lv, self.atk.p)
 * - 属性路径小驼峰化后作为实际存储结构的键名，表达式内的属性调用使用当前结构自身的属性路径
 *
 * 命名说明：
 * XX基础值：指的是可被百分比加成和常数加成增幅的属性，比如基础智力（可被百分比智力加成和常数智力加成增幅）、
 *          基础武器攻击（可被百分比武器攻击加成和常数武器攻击加成增幅）
 *
 * 物理相关：physical → p
 * 魔法相关：magical → m
 * 攻击相关：attack → atk
 * 防御相关：defense → def
 * 增强相关（数值增减）：amplification → amp
 * 减轻相关（数值增减）：reduce → red
 * 伤害：damage → dmg
 * 抗性相关(概率型)：resistance → res
 * 转换率相关：conversionRate → conv
 * 基础值相关：baseValue → base
 */
export const PlayerAttrSchema = (character: CharacterWithRelations): PlayerDataNestedSchema => {
  if (!character) throw new Error("PlayerAttrSchema参数不能为空");
  const mainWeaponType = character.weapon.type as MainHandType;
  const subWeaponType = character.subWeapon.type as SubHandType;
  return {
    // ============================== 基础信息 ==============================
    lv: {
      displayName: "等级",
      expression: `${character.lv}`,
    },

    // ============================== 基础能力值 ==============================
    str: {
      displayName: "力量",
      expression: `${character.str}`,
    },
    int: {
      displayName: "智力",
      expression: `${character.int}`,
    },
    vit: {
      displayName: "体力",
      expression: `${character.vit}`,
    },
    agi: {
      displayName: "敏捷",
      expression: `${character.agi}`,
    },
    dex: {
      displayName: "灵巧",
      expression: `${character.dex}`,
    },
    luk: {
      displayName: "幸运",
      expression: `${character.personalityType === "Luk" ? character.personalityValue : 0}`,
    },
    tec: {
      displayName: "技巧",
      expression: `${character.personalityType === "Tec" ? character.personalityValue : 0}`,
    },
    men: {
      displayName: "异抗",
      expression: `${character.personalityType === "Men" ? character.personalityValue : 0}`,
    },
    cri: {
      displayName: "暴击",
      expression: `${character.personalityType === "Cri" ? character.personalityValue : 0}`,
    },

    mainWeapon: {
      range: {
        displayName: "主武器射程",
        expression: `${MainWeaponTypeMap[mainWeaponType].range}`,
      },
      element: {
        displayName: "属性觉醒",
        expression: "Normal",
      },
      baseAtk: {
        displayName: "主武器基础攻击",
        expression: `${character.weapon.baseAbi}`,
      },
      type: {
        displayName: "主武器类型",
        expression: `${character.weapon.type}`,
      },
      ref: {
        displayName: "主武器精炼",
        expression: `${character.weapon.refinement}`,
      },
      stability: {
        displayName: "主武器稳定性",
        expression: `${character.weapon.stability}`,
        noBaseValue: true,
      },
    },

    subWeapon: {
      range: {
        displayName: "副武器射程",
        expression: `${SubWeaponTypeMap[subWeaponType].range}`,
      },
      element: {
        displayName: "属性觉醒",
        expression: "Normal",
      },
      type: {
        displayName: "副武器类型",
        expression: `${character.subWeapon.type}`,
      },
      ref: {
        displayName: "副武器精炼",
        expression: `${character.subWeapon.refinement}`,
      },
      stability: {
        displayName: "副武器稳定性",
        expression: `${character.subWeapon.stability}`,
        noBaseValue: true,
      },
    },

    armor: {
      ability: {
        displayName: "身体装备类型",
        expression: `${character.armor.ability}`,
      },
      baseAbi: {
        displayName: "身体装备基础值",
        expression: `${character.armor.baseAbi}`,
      },
      ref: {
        displayName: "身体装备精炼",
        expression: `${character.armor.refinement}`,
      },
    },

    option: {
      baseAbi: {
        displayName: "追加装备基础值",
        expression: `${character.option.baseAbi}`,
      },
      ref: {
        displayName: "追加装备精炼",
        expression: `${character.option.refinement}`,
      },
    },

    special: {
      baseAbi: {
        displayName: "特殊装备基础值",
        expression: `${character.special.baseAbi}`,
      },
    },

    conv: {
      strToPatk: {
        displayName: "力量转物理攻击",
        expression: `${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.str.pAtkC}`,
      },
      intToPatk: {
        displayName: "智力转物理攻击",
        expression: `${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.int.pAtkC}`,
      },
      agiToPatk: {
        displayName: "敏捷转物理攻击",
        expression: `${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.agi.pAtkC}`,
      },
      dexToPatk: {
        displayName: "灵巧转物理攻击",
        expression: `${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.dex.pAtkC}`,
      },
      strToMatk: {
        displayName: "力量转魔法攻击",
        expression: `${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.str.mAtkC}`,
      },
      intToMatk: {
        displayName: "智力转魔法攻击",
        expression: `${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.int.mAtkC}`,
      },
      agiToMatk: {
        displayName: "敏捷转魔法攻击",
        expression: `${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.agi.mAtkC}`,
      },
      dexToMatk: {
        displayName: "灵巧转魔法攻击",
        expression: `${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.dex.mAtkC}`,
      },
      strToAspd: {
        displayName: "力量转攻速",
        expression: `${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.str.aspdC}`,
      },
      intToAspd: {
        displayName: "智力转攻速",
        expression: `${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.int.aspdC}`,
      },
      agiToAspd: {
        displayName: "敏捷转攻速",
        expression: `${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.agi.aspdC}`,
      },
      dexToAspd: {
        displayName: "灵巧转攻速",
        expression: `${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.dex.aspdC}`,
      },
      strToStab: {
        displayName: "力量转稳定率",
        expression: `${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.str.pStabC}`,
      },
      intToStab: {
        displayName: "智力转稳定率",
        expression: `${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.int.pStabC}`,
      },
      agiToStab: {
        displayName: "敏捷转稳定率",
        expression: `${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.agi.pStabC}`,
      },
      dexToStab: {
        displayName: "灵巧转稳定率",
        expression: `${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.dex.pStabC}`,
      },
      pcrToMcr: {
        displayName: "魔法暴击转化率",
        expression: "0",
        noBaseValue: true,
      },
      pcdToMcd: {
        displayName: "魔法爆伤转化率",
        expression: "0.25",
        noBaseValue: true,
      },
    },

    hp: {
      max: {
        displayName: "最大HP",
        expression: "Math.floor(93 + lv * (127 / 17 +   vit / 3))",
      },
      current: {
        displayName: "当前HP",
        expression: "hp.max",
      },
      recovery: {
        displayName: "HP自然回复",
        expression: "1 + hp.max / 25", // 默认值，可通过装备等修改
      },
    },

    mp: {
      max: {
        displayName: "最大MP",
        expression: "Math.floor(99 + lv + int / 10 + tec)",
      },
      current: {
        displayName: "当前MP",
        expression: "mp.max",
      },
      recovery: {
        displayName: "MP自然回复",
        expression: "1 + mp.max / 10",
      },
      atkRegen: {
        displayName: "MP攻击生成",
        expression: "10 + mp.max / 10",
      },
    },

    weaponAtk: {
      p: {
        displayName: "武器物理攻击",
        expression: `(  mainWeapon.baseAtk +   mainWeapon.ref + Math.pow(  mainWeapon.ref, 2)) * ${MainWeaponTypeMap[mainWeaponType].patkC}`,
      },
      m: {
        displayName: "武器魔法攻击",
        expression: `(  mainWeapon.baseAtk +   mainWeapon.ref + Math.pow(  mainWeapon.ref, 2)) * ${MainWeaponTypeMap[mainWeaponType].matkC}`,
      },
    },

    atk: {
      p: {
        displayName: "物理攻击",
        expression: `lv +   weaponAtk.p +   str * ${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.str.pAtkC} +   int * ${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.int.pAtkC} +   agi * ${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.agi.pAtkC} +   dex * ${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.dex.pAtkC}`,
      },
      m: {
        displayName: "魔法攻击",
        expression: `lv +   weaponAtk.m +   str * ${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.str.mAtkC} +   int * ${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.int.mAtkC} +   agi * ${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.agi.mAtkC} +   dex * ${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.dex.mAtkC}`,
      },
    },

    pie: {
      p: {
        displayName: "物理贯穿",
        expression: "0",
        noBaseValue: true,
      },
      m: {
        displayName: "魔法贯穿",
        expression: "0",
        noBaseValue: true,
      },
    },

    def: {
      p: {
        displayName: "物理防御",
        expression: "0",
      },
      m: {
        displayName: "魔法防御",
        expression: "0",
      },
    },

    c: {
      rate: {
        p: {
          displayName: "物理暴击率",
          expression: "25 + cri / 3.4",
        },
        m: {
          displayName: "魔法暴击率",
          expression: "c.rate.p * conv.pcrToMcr",
        },
      },
      dmg: {
        p: {
          displayName: "物理暴击伤害",
          expression: "150 + ( str > agi ? str /10 : (str + agi) /20 )",
        },
        m: {
          displayName: "魔法暴击伤害",
          expression: "100 + ( c.dmg.p - 100 ) * conv.pcdToMcd",
        },
      },
    },

    stab: {
      p: {
        displayName: "物理稳定率",
        expression: `${character.weapon.stability} + Math.floor(  str * ${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.str.pStabC} +   int * ${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.int.pStabC} +   agi * ${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.agi.pStabC} +   dex * ${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.dex.pStabC})`,
      },
      m: {
        displayName: "魔法稳定率",
        expression: "50 + stab.p / 2",
      },
    },

    red: {
      p: {
        displayName: "物理伤害减轻",
        expression: "0",
        noBaseValue: true,
      },
      m: {
        displayName: "魔法伤害减轻",
        expression: "0",
        noBaseValue: true,
      },
      rate: {
        displayName: "百分比伤害减轻",
        expression: "0",
        noBaseValue: true,
      },
      water: {
        displayName: "水属性伤害减轻",
        expression: "0",
        noBaseValue: true,
      },
      fire: {
        displayName: "火属性伤害减轻",
        expression: "0",
        noBaseValue: true,
      },
      earth: {
        displayName: "地属性伤害减轻",
        expression: "0",
        noBaseValue: true,
      },
      wind: {
        displayName: "风属性伤害减轻",
        expression: "0",
        noBaseValue: true,
      },
      light: {
        displayName: "光属性伤害减轻",
        expression: "0",
        noBaseValue: true,
      },
      dark: {
        displayName: "暗属性伤害减轻",
        expression: "0",
        noBaseValue: true,
      },
      normal: {
        displayName: "无属性伤害减轻",
        expression: "0",
        noBaseValue: true,
      },
      floor: {
        displayName: "地面伤害减轻（地刺）",
        expression: "0",
        noBaseValue: true,
      },
      meteor: {
        displayName: "陨石伤害减轻（天火）",
        expression: "0",
        noBaseValue: true,
      },
      playerEpicenter: {
        displayName: "范围伤害减轻（以玩家为中心的范围伤害）",
        expression: "0",
        noBaseValue: true,
      },
      foeEpicenter: {
        displayName: "敌方周围伤害减轻（以怪物自身为中心的范围伤害）",
        expression: "0",
        noBaseValue: true,
      },
      bowling: {
        displayName: "贴地伤害减轻（剑气、风刃）",
        expression: "0",
        noBaseValue: true,
      },
      bullet: {
        displayName: "子弹伤害减轻（各种球）",
        expression: "0",
        noBaseValue: true,
      },
      straightLine: {
        displayName: "直线伤害减轻（激光）",
        expression: "0",
        noBaseValue: true,
      },
      charge: {
        displayName: "冲撞伤害减轻（怪物的位移技能）",
        expression: "0",
        noBaseValue: true,
      },
    },

    amp: {
      water: {
        displayName: "对水属性增强",
        expression: "0",
        noBaseValue: true,
      },
      fire: {
        displayName: "对火属性增强",
        expression: "0",
        noBaseValue: true,
      },
      earth: {
        displayName: "对地属性增强",
        expression: "0",
        noBaseValue: true,
      },
      wind: {
        displayName: "对风属性增强",
        expression: "0",
        noBaseValue: true,
      },
      light: {
        displayName: "对光属性增强",
        expression: "0",
        noBaseValue: true,
      },
      dark: {
        displayName: "对暗属性增强",
        expression: "0",
        noBaseValue: true,
      },
      normal: {
        displayName: "对无属性增强",
        expression: "0",
        noBaseValue: true,
      },
    },

    barrier: {
      p: {
        displayName: "物理屏障",
        expression: "0",
      },
      m: {
        displayName: "魔法屏障",
        expression: "0",
      },
      rate: {
        displayName: "百分比屏障",
        expression: "0",
      },
      recharge: {
        displayName: "屏障回复速度",
        expression: "30",
      },
    },

    antiVirus: {
      displayName: "异常抗性",
      expression: "men / 3.4",
      noBaseValue: true,
    },

    pursuit: {
      rate: {
        p: {
          displayName: "物理追击概率",
          expression: "0",
          noBaseValue: true,
        },
        m: {
          displayName: "魔法追击概率",
          expression: "0",
          noBaseValue: true,
        },
      },
      dmg: {
        p: {
          displayName: "物理追击伤害",
          expression: "0",
        },
        m: {
          displayName: "魔法追击伤害",
          expression: "0",
        },
      },
    },

    mUpper: {
      displayName: "魔法伤害上限",
      expression: "110",
    },
    mLower: {
      displayName: "魔法伤害下限",
      expression: "90",
    },

    unsheatheAtk: {
      displayName: "拔刀攻击",
      expression: "100",
    },

    distanceDmg: {
      short: {
        displayName: "近距离伤害",
        expression: "100",
      },
      long: {
        displayName: "远距离伤害",
        expression: "100",
      },
    },

    totalDmg: {
      displayName: "总伤害",
      expression: "100",
    },

    finalDmg: {
      displayName: "最终伤害",
      expression: "100",
    },

    accuracy: {
      displayName: "命中",
      expression: "0",
    },

    absAccuracy: {
      displayName: "绝对命中",
      expression: "0",
    },

    avoid: {
      displayName: "回避",
      expression: "0",
    },

    absAvoid: {
      displayName: "绝对回避",
      expression: "0",
    },

    dodge: {
      recharge: {
        displayName: "闪躲回复",
        expression: "0",
      },
    },

    guard: {
      power: {
        displayName: "格挡力",
        expression: "0",
      },
      recharge: {
        displayName: "格挡回复",
        expression: "0",
      },
    },

    anticipate: {
      displayName: "识破",
      expression: "0",
      noBaseValue: true,
    },

    guardBreak: {
      displayName: "破防",
      expression: "0",
      noBaseValue: true,
    },

    reflect: {
      displayName: "反弹伤害",
      expression: "0",
      noBaseValue: true,
    },

    aspd: {
      displayName: "攻击速度",
      expression: "0",
    },
    mspd: {
      displayName: "行动速度",
      expression: "0",
      noBaseValue: true,
    },
    cspd: {
      displayName: "咏唱速度",
      expression: "0",
    },
    cspr: {
      displayName: "咏唱缩减",
      expression: "0",
      noBaseValue: true,
    },

    aggro: {
      current: {
        displayName: "当前仇恨值",
        expression: "0",
      },
      rate: {
        displayName: "仇恨值倍率",
        expression: "100",
      },
    },
    drop: {
      rate: {
        displayName: "掉宝率",
        expression: "0",
        noBaseValue: true,
      },
      gemPowder: {
        displayName: "晶石粉末掉落",
        expression: "0",
        noBaseValue: true,
      },
    },
    exp: {
      rate: {
        displayName: "经验加成",
        expression: "100",
      },
      pet: {
        displayName: "宠物经验",
        expression: "100",
      },
    },
    revival: {
      time: {
        displayName: "复活时间",
        expression: "300",
      },
    },
    flinchUnavailable: {
      displayName: "封印胆怯",
      expression: "0",
    },
    tumbleUnavailable: {
      displayName: "封印翻覆",
      expression: "0",
    },
    stunUnavailable: {
      displayName: "封印昏厥",
      expression: "0",
    },
    invincibleAid: {
      displayName: "无敌急救",
      expression: "0",
    },
    itemCooldown: {
      displayName: "道具冷却",
      expression: "0",
    },
    recoilDmg: {
      displayName: "反作用伤害",
      expression: "0",
    },
    guardRate: {
      displayName: "格挡率",
      expression: "0",
    },
    dodgeRate: {
      displayName: "闪躲率",
      expression: "0",
    },
  };
};
