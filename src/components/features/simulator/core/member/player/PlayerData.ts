/**
 * 玩家数据配置
 */
import { CharacterWithRelations } from "@db/repositories/character";
import { MainHandType, SubHandType } from "@db/schema/enums";

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
export const PlayerAttrSchema = (character: CharacterWithRelations) => {
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
      },
    },

    subWeapon: {
      range: {
        displayName: "副武器射程",
        expression: `${SubWeaponTypeMap[subWeaponType].range}`,
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

    optional: {
      baseAbi: {
        displayName: "追加装备基础值",
        expression: `${character.optEquip.baseAbi}`,
      },
      ref: {
        displayName: "追加装备精炼",
        expression: `${character.optEquip.refinement}`,
      },
    },

    special: {
      baseAbi: {
        displayName: "特殊装备基础值",
        expression: `${character.speEquip.baseAbi}`,
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
      },
      pcdToMcd: {
        displayName: "魔法爆伤转化率",
        expression: "0.25",
      },
    },

    hp: {
      max: {
        displayName: "最大HP",
        expression: "Math.floor(93 + lv * (127 / 17 +   vit / 3))",
      },
      current: {
        displayName: "当前HP",
        expression: "0",
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
        expression: "0",
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
      },
      m: {
        displayName: "魔法贯穿",
        expression: "0",
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
        displayName: "物理减轻",
        expression: "0",
      },
      m: {
        displayName: "魔法减轻",
        expression: "0",
      },
      rate: {
        displayName: "百分比伤害减轻",
        expression: "0",
      },
      water: {
        displayName: "水属性减轻",
        expression: "0",
      },
      fire: {
        displayName: "火属性减轻",
        expression: "0",
      },
      earth: {
        displayName: "地属性减轻",
        expression: "0",
      },
      wind: {
        displayName: "风属性减轻",
        expression: "0",
      },
      light: {
        displayName: "光属性减轻",
        expression: "0",
      },
      dark: {
        displayName: "暗属性减轻",
        expression: "0",
      },
      normal: {
        displayName: "无属性减轻",
        expression: "0",
      },
      floor: {
        displayName: "地面伤害减轻（地刺）",
        expression: "0",
      },
      meteor: {
        displayName: "陨石伤害减轻（天火）",
        expression: "0",
      },
      playerEpicenter: {
        displayName: "范围伤害减轻（以玩家为中心的范围伤害）",
        expression: "0",
      },
      foeEpicenter: {
        displayName: "敌方周围伤害减轻（以怪物自身为中心的范围伤害）",
        expression: "0",
      },
      bowling: {
        displayName: "贴地伤害减轻（剑气、风刃）",
        expression: "0",
      },
      bullet: {
        displayName: "子弹伤害减轻（各种球）",
        expression: "0",
      },
      straightLine: {
        displayName: "直线伤害减轻（激光）",
        expression: "0",
      },
      charge: {
        displayName: "冲撞伤害减轻（怪物的位移技能）",
        expression: "0",
      },
    },

    amp: {
      water: {
        displayName: "对水属性增强",
        expression: "0",
      },
      fire: {
        displayName: "对火属性增强",
        expression: "0",
      },
      earth: {
        displayName: "对地属性增强",
        expression: "0",
      },
      wind: {
        displayName: "对风属性增强",
        expression: "0",
      },
      light: {
        displayName: "对光属性增强",
        expression: "0",
      },
      dark: {
        displayName: "对暗属性增强",
        expression: "0",
      },
      normal: {
        displayName: "对无属性增强",
        expression: "0",
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
        expression: "0",
      },
    },

    antiVirus: {
      displayName: "异常抗性",
      expression: "0",
    },

    pursuit: {
      rate: {
        p: {
          displayName: "物理追击概率",
          expression: "0",
        },
        m: {
          displayName: "魔法追击概率",
          expression: "0",
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

    element: {
      displayName: "属性觉醒",
      expression: "Normal",
    },

    distanceDmg: {
      short: {
        displayName: "近距离伤害",
        expression: "0",
      },
      long: {
        displayName: "远距离伤害",
        expression: "0",
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
      displayName: "看穿",
      expression: "0",
    },

    guardBreak: {
      displayName: "破防",
      expression: "0",
    },

    reflect: {
      displayName: "反弹伤害",
      expression: "0",
    },

    aspd: {
      displayName: "攻击速度",
      expression: "0",
    },
    mspd: {
      displayName: "行动速度",
      expression: "0",
    },
    cspd: {
      displayName: "咏唱速度",
      expression: "0",
    },
    cspr: {
      displayName: "咏唱缩减",
      expression: "0",
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
      },
      gemPowder: {
        displayName: "晶石粉末掉落",
        expression: "0",
      },
    },
    exp: {
      rate: {
        displayName: "经验加成",
        expression: "0",
      },
      pet: {
        displayName: "宠物经验",
        expression: "0",
      },
    },
    revival: {
      time: {
        displayName: "复活时间",
        expression: "0",
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
  };
};
