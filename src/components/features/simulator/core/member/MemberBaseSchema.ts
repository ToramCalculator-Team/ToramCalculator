import type {
  ConvertToNestedSchema,
  ConvertToNestedSchemaDic,
  ConvertToSchema,
  SchemaAttribute,
} from "../dataSys/SchemaTypes";

// ============================== 逆向出来的BounsType参考数据类型 ==============================

// 类型枚举
enum BounsTypeEnum {
  None, // 无
  Str, // 力量
  Int, // 智力
  Vit, // 耐力
  Agi, // 敏捷
  Dex, // 灵巧
  StrRate, // 百分比力量
  IntRate, // 百分比智力
  VitRate, // 百分比耐力
  AgiRate, // 百分比敏捷
  DexRate, // 百分比灵巧
  MaxHp, // 最大HP
  MaxHpTo10,
  MaxHpRate, // 百分比最大HP
  MaxMp, // 最大MP
  EqAtk, // 武器攻击
  EqAtkRate, // 百分比武器攻击
  Atk, // 物理攻击
  AtkRate, // 百分比物理攻击
  Matk, // 魔法攻击
  MatkRate, // 百分比魔法攻击
  Sta, // 物理稳定率
  Hit, // 命中
  HitRate, // 百分比命中
  Flee, // 回避
  FleeRate, // 百分比回避
  Def, // 物理防御
  DefRate, // 百分比物理防御
  Mdef, // 魔法防御
  MdefRate, // 百分比魔法防御
  Aspd, // 攻击速度
  AspdRate, // 百分比攻击速度
  Cspd, // 咏唱速度
  CspdRate, // 百分比咏唱速度
  HpRecovery, // HP自然回复
  HpRecoveryRate, // 百分比HP自然回复
  MpRecovery, // MP自然回复
  MpRecoveryRate, // 百分比MP自然回复
  AtkMpRecovery, // MP攻击回复
  AtkMpRecoveryRate, // 百分比MP攻击回复
  Critical, // 暴击
  CriticalRate, // 百分比暴击
  CriticalDmg, // 暴击伤害
  CriticalDmgRate, // 百分比暴击伤害
  AntiVirus, // 异常抗性
  Guard, // 格挡
  GuardPower, // 格挡力
  Avoid, // 回避
  Respawn, // 复活
  PowerResist, // 物理抗性
  MagicResist, // 魔法抗性
  PowerResistBreaker, // 物理抗性穿透 ？
  MagicResistBreaker, // 魔法抗性破除 ？
  FireKiller, // 对火属性增强
  AquaKiller, // 对水属性增强
  WindKiller, // 对风属性增强
  EarthKiller, // 对地属性增强
  LightKiller, // 对光属性增强
  DarkKiller, // 对暗属性增强
  NormalKiller, // 对无属性增强
  PowerSkillDmgRate, // 物理技能伤害增加百分比
  MagicSkillDmgRate, // 魔法技能伤害增加百分比
  HateRate, // 百分比仇恨值
  ExpRate, // 经验加成
  DropRate, // 掉宝率
  Element, // 属性
  BladeLastDmgRate, // 刀剑最终伤害增加百分比 ？
  ShootLastDmgRate, // 射击最终伤害增加百分比 ？
  MagicLastDmgRate, // 魔法最终伤害增加百分比 ？
  MarshallLastDmgRate, // 空手最终伤害增加百分比 ？
  HandicapResist, // 封印抗性
  FireShield, // 火属性抗性
  AquaShield, // 水属性抗性
  WindShield, // 风属性抗性
  EarthShield, // 地属性抗性
  LightShield, // 光属性抗性
  DarkShield, // 暗属性抗性
  NormalShield, // 无属性抗性
  AntiVenomu, // 中毒
  AntiParaizu, // 麻痹
  AntiDark, // 黑暗
  AntiFire, // 着火
  AntiFreeze, // 冻结
  AntiBreak, // 破防
  AntiSlow, // 缓慢
  AntiStop, // 停止
  AntiFear, // 恐惧
  NinjutsuScrollLimit, // 仅限忍术卷轴
  OneHandLimit, // 仅限单手武器
  TwoHandLimit, // 仅限双手武器
  BowLimit, // 仅限弓
  GunLimit, // 仅限枪
  RodLimit, // 仅限法杖
  MagictoolLimit, // 仅限魔导具
  DualswordLimit, // 仅限双剑
  PoleweaponLimit, // 仅限长枪
  KatanaLimit, // 仅限拔刀剑
  ArrowLimit, // 仅限弓箭
  KnifeLimit, // 仅限小刀
  LightArmorLimit, // 仅限轻甲
  HeavyArmorLimit, // 仅限重甲
  KnuckleLimit, // 仅限拳套
  MotionSpeed, // 行动速度
  LongRange, // 远距离威力
  AvoidDmgRate, // 回避伤害增加百分比 ？
  ShortRange, // 近距离威力
  ShieldLimit, // 仅限盾牌
  MaxMpTo10,
  FirstAttack, // 先制攻击 ？
  FirstAttackRate, // 先制攻击增加百分比 ？
  MaxMpRate, // 最大MP增加百分比
  EventCheck,
  SurroundingsResist, // 周围伤害减轻
  RangeResist, // 子弹伤害减轻
  LineResist, // 直线伤害减轻
  MoveAttackResist,
  VerticalResist, // 垂直伤害减轻
  BreathResist, // 吐息伤害减轻
  TranslationResist, // 冲撞伤害减轻
  WallResist,
  WiddResist, // 剑气伤害减轻 ？
  ExplosionResist, // 爆炸伤害减轻
  BlackholeResist, // 黑洞伤害减轻
  GenericEffectID, // 通用效果ID
  AbsoluteHitRate, // 绝对命中
  AbsoluteFreeRate, // 绝对回避
  SelfDmgRate, // 自身伤害增加百分比
  ItemHpEffectPlus, // 道具HP效果增加 ？
  ItemEffectRate, // 道具效果增加百分比 ？
  ItemDelay, // 道具延迟
  Guts, // 勇气
  Sacrifice, // 牺牲
  HelpMaster, // 帮助主人
  Avoidbreaker, // 回避破除
  Guardbreaker, // 格挡破除
  BossKiller, // 对BOSS增强
  MagicStealRate, // 魔法偷取增加百分比
  MagicSteal, // 魔法偷取
  LifeStealRate, // 生命偷取增加百分比
  LifeSteal, // 生命偷取
  ExpHpRecovery, // 经验HP恢复
  ExpMpRecovery, // 经验MP恢复
  PhysicalPursuit, // 物理追击
  MagicPursuit, // 魔法追击
  DamageReflection, // 伤害反射
  HateUpSuppression, // 仇恨值增加抑制
  HateDownSuppression, // 仇恨值减少抑制
  PhysicalBarrier, // 物理屏障
  MagicBarrier, // 魔法屏障
  RateBarrier, // 百分比屏障
  BarrierSpeed, // 屏障回复速度
  GrantStopFlinch, // 封印翻覆
  GrantStopTumble, // 封印翻覆
  GrantStopStun, // 封印昏厥
  StrToAtk, // 力量转换为物理攻击
  IntToAtk, // 智力转换为物理攻击
  VitToAtk, // 耐力转换为物理攻击
  AgiToAtk, // 敏捷转换为物理攻击
  DexToAtk, // 灵巧转换为物理攻击
  StrToMAtk, // 力量转换为魔法攻击
  IntToMAtk, // 智力转换为魔法攻击
  VitToMAtk, // 耐力转换为魔法攻击
  AgiToMAtk, // 敏捷转换为魔法攻击
  DexToMAtk, // 灵巧转换为魔法攻击
  PetExpRate, // 宠物经验增加百分比
  GemDustDropRate, // 晶石粉末掉落增加百分比
  AvatarAtk, // 角色物理攻击
  AvatarMatk, // 角色魔法攻击
  AvatarHit, // 角色命中
  AvatarFlee, // 角色回避
  AvatarAspd, // 角色攻击速度
  AvatarCspd, // 角色咏唱速度
  AvatarHp, // 角色最大HP
  AvatarMp, // 角色最大MP
  AvatarRespawn, // 角色复活
  AvatarSkill, // 角色技能
  GemDropFixing, // 晶石掉落固定
  GemPlayerDown, // 晶石玩家减少
  GemMonsterUp, // 晶石怪物增加
  DamageLimit, // 伤害限制
  hp_heal, // HP恢复
  hp_healrate, // HP恢复增加百分比
  hp_healmaximum, // HP恢复最大值
  mp_heal, // MP恢复
  mp_healrate, // MP恢复增加百分比
  mp_healmaximum, // MP恢复最大值
  anti_virus, // 抗病毒
  protect_virus, // 保护病毒
  runn_hp_heal, // 战斗时HP恢复
  runn_mp_heal, // 战斗时MP恢复
  runn_maxhp, // 战斗时最大HP
  runn_maxmp, // 战斗时最大MP
  runn_atk, // 战斗时物理攻击
  runn_matk, // 战斗时魔法攻击
  runn_def, // 战斗时物理防御
  runn_mdef, // 战斗时魔法防御
  runn_hit, // 战斗时命中
  runn_flee, // 战斗时回避
  runn_aspd, // 战斗时攻击速度
  runn_cspd, // 战斗时咏唱速度
  runn_atkelm, // 战斗时物理抗性
  runn_defelm, // 战斗时魔法抗性
  runn_antivirus, // 战斗时抗病毒
  runn_osaisen, // 战斗时奥赛战
  repeatwait, // 重复等待
  startwait, // 开始等待
  if_hp, // 如果HP
  if_hprate, // 如果HP增加百分比
  if_mp, // 如果MP
  if_mprate, // 如果MP增加百分比
  if_state, // 如果状态
  delete_runn, // 删除战斗 ？
  if_runnlast, // 如果战斗结束
  succeed_itemid, // 成功物品ID
  add_value, // 增加值
  product_value, // 产品值
  status_value, // 状态值
  set_value, // 设置值
  item_warp, // 物品传送
  RandomItemGet, // 随机物品获取
  getSkilltree, // 获取技能树
  item_forcedwarp, // 物品强制传送
  foodPoisoning, // 食物中毒
  runn_price, // 战斗价格
}

// ============================== 基础结构定义 ==============================

/**
 * 成员基础结构定义
 *
 * 这个接口定义了成员的基本属性结构，使用null作为占位符
 * 通过类型推导可以自动生成Schema、NestedSchema或NestedSchemaDic类型
 */
export interface MemberBaseStructure {
  // ============================== 基础信息 ==============================
  lv: null;

  hp: {
    max: null;
    current: null;
  };

  mp: {
    max: null;
    current: null;
  };

  atk: {
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
  };
  accuracy: null;
  avoid: null;
  guardRate: null;
  dodgeRate: null;
}

// ============================== 静态类型推导 ==============================

/**
 * 将基础结构转换为NestedSchema类型
 *
 * 递归地将null值转换为SchemaAttribute，需要提供属性工厂类型
 */
export type MemberBaseNestedSchema = ConvertToNestedSchema<MemberBaseStructure>;

/**
 * 将基础结构转换为NestedSchemaDic类型
 *
 * 递归地将null值转换为多语言对象，需要提供多语言工厂类型
 */
export type MemberBaseNestedSchemaDic = ConvertToNestedSchemaDic<MemberBaseStructure>;

// ============================== 默认实现 ==============================

/**
 * 默认的成员基础结构实例
 *
 * 可以直接使用，也可以通过类型推导生成其他类型
 */
export const MemberBaseStructure: MemberBaseStructure = {
  lv: null,
  hp: {
    max: null,
    current: null,
  },
  mp: {
    max: null,
    current: null,
  },
  atk: {
    p: null,
    m: null,
  },
  def: {
    p: null,
    m: null,
  },
  c: {
    rate: {
      p: null,
      m: null,
    },
    dmg: {
      p: null,
      m: null,
    },
  },
  stab: {
    p: null,
    m: null,
  },
  red: {
    p: null,
    m: null,
    rate: null,
    water: null,
    fire: null,
    earth: null,
    wind: null,
    light: null,
    dark: null,
    normal: null,
  },
  accuracy: null,
  avoid: null,
  guardRate: null,
  dodgeRate: null,
};

/**
 * 默认的NestedSchema实例
 *
 * 类型：MemberBaseNestedSchema
 */
export const MemberBaseNestedSchema: MemberBaseNestedSchema = {
  lv: {
    displayName: "等级",
    expression: "0",
  },
  hp: {
    max: {
      displayName: "最大生命值",
      expression: "0",
    },
    current: {
      displayName: "当前生命值",
      expression: "0",
    },
    },
    mp: {
    max: {
      displayName: "最大魔法值",
      expression: "0",
    },
    current: {
      displayName: "当前魔法值",
      expression: "0",
    },
    },
    atk: {
    p: {
      displayName: "物理攻击力",
      expression: "0",
    },
    m: {
      displayName: "魔法攻击力",
      expression: "0",
    },
    },
    def: {
    p: {
      displayName: "物理防御力",
      expression: "0",
    },
    m: {
      displayName: "魔法防御力",
      expression: "0",
    },
    },
    c: {
        rate: {
      p: {
        displayName: "物理暴击率",
        expression: "0",
      },
      m: {
        displayName: "魔法暴击率",
        expression: "0",
      },
        },
        dmg: {
      p: {
        displayName: "物理暴击伤害",
        expression: "0",
      },
      m: {
        displayName: "魔法暴击伤害",
        expression: "0",
      },
    },
    },
    stab: {
    p: {
      displayName: "物理穿透",
      expression: "0",
    },
    m: {
      displayName: "魔法穿透",
      expression: "0",
    },
    },
    red: {
    p: {
      displayName: "物理抗性",
      expression: "0",
    },
    m: {
      displayName: "魔法抗性",
      expression: "0",
    },
    rate: {
      displayName: "百分比抗性",
      expression: "0",
    },
    water: {
      displayName: "水属性抗性",
      expression: "0",
    },
    fire: {
      displayName: "火属性抗性",
      expression: "0",
    },
    earth: {
      displayName: "地属性抗性",
      expression: "0",
    },
    wind: {
      displayName: "风属性抗性",
      expression: "0",
    },
    light: {
      displayName: "光属性抗性",
      expression: "0",
    },
    dark: {
      displayName: "暗属性抗性",
      expression: "0",
    },
    normal: {
      displayName: "无属性抗性",
      expression: "0",
    },
  },
  accuracy: {
    displayName: "命中",
    expression: "0",
  },
  avoid: {
    displayName: "回避",
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

/**
 * 默认的NestedSchemaDic实例
 *
 * 类型：MemberBaseNestedSchemaDic
 */
export const MemberBaseNestedSchemaDic: MemberBaseNestedSchemaDic = {
  lv: "",
  hp: {
    max: "",
    current: "",
  },
  mp: {
    max: "",
    current: "",
  },
  atk: {
    p: "",
    m: "",
  },
  def: {
    p: "",
    m: "",
  },
  c: {
    rate: {
      p: "",
      m: "",
    },
    dmg: {
      p: "",
      m: "",
    },
  },
  stab: {
    p: "",
    m: "",
  },
  red: {
    p: "",
    m: "",
    rate: "",
    water: "",
    fire: "",
    earth: "",
    wind: "",
    light: "",
    dark: "",
    normal: "",
  },
  accuracy: "",
  avoid: "",
  guardRate: "",
  dodgeRate: "",
};
