/**
 * 玩家数据配置
 */
import { CharacterWithRelations } from "@db/repositories/character";
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

// ============================== 逆向出来的BounsType参考数据类型 ==============================

// 类型枚举
export enum BounsTypeEnum {
  None, // 无
  bStr, // 力量
  bInt, // 智力
  bVit, // 耐力
  bAgi, // 敏捷
  bDex, // 灵巧
  bStrRate, // 百分比力量
  bIntRate, // 百分比智力
  bVitRate, // 百分比耐力
  bAgiRate, // 百分比敏捷
  bDexRate, // 百分比灵巧
  bMaxHp, // 最大HP
  bMaxHpTo10,
  bMaxHpRate, // 百分比最大HP
  bMaxMp, // 最大MP
  bEqAtk, // 武器攻击
  bEqAtkRate, // 百分比武器攻击
  bAtk, // 物理攻击
  bAtkRate, // 百分比物理攻击
  bMatk, // 魔法攻击
  bMatkRate, // 百分比魔法攻击
  bSta, // 物理稳定率
  bHit, // 命中
  bHitRate, // 百分比命中
  bFlee, // 回避
  bFleeRate, // 百分比回避
  bDef, // 物理防御
  bDefRate, // 百分比物理防御
  bMdef, // 魔法防御
  bMdefRate, // 百分比魔法防御
  bAspd, // 攻击速度
  bAspdRate, // 百分比攻击速度
  bCspd, // 咏唱速度
  bCspdRate, // 百分比咏唱速度
  bHpRecovery, // HP自然回复
  bHpRecoveryRate, // 百分比HP自然回复
  bMpRecovery, // MP自然回复
  bMpRecoveryRate, // 百分比MP自然回复
  bAtkMpRecovery, // MP攻击回复
  bAtkMpRecoveryRate, // 百分比MP攻击回复
  bCritical, // 暴击
  bCriticalRate, // 百分比暴击
  bCriticalDmg, // 暴击伤害
  bCriticalDmgRate, // 百分比暴击伤害
  bAntiVirus, // 异常抗性
  bGuard, // 格挡
  bGuardPower, // 格挡力
  bAvoid, // 回避
  bRespawn, // 复活
  bPowerResist, // 物理抗性
  bMagicResist, // 魔法抗性
  bPowerResistBreaker, // 物理抗性穿透 ？
  bMagicResistBreaker, // 魔法抗性破除 ？
  bFireKiller, // 对火属性增强
  bAquaKiller, // 对水属性增强
  bWindKiller, // 对风属性增强
  bEarthKiller, // 对地属性增强
  bLightKiller, // 对光属性增强
  bDarkKiller, // 对暗属性增强
  bNormalKiller, // 对无属性增强
  bPowerSkillDmgRate, // 物理技能伤害增加百分比
  bMagicSkillDmgRate, // 魔法技能伤害增加百分比
  bHateRate, // 百分比仇恨值
  bExpRate, // 经验加成
  bDropRate, // 掉宝率
  bElement, // 属性
  bBladeLastDmgRate, // 刀剑技能伤害增加百分比 ？
  bShootLastDmgRate, // 射击技能伤害增加百分比 ？
  bMagicLastDmgRate, // 魔法技能伤害增加百分比 ？
  bMarshallLastDmgRate, // 魔法技能伤害增加百分比 ？
  bHandicapResist, // 封印抗性
  bFireShield, // 火属性抗性
  bAquaShield, // 水属性抗性
  bWindShield, // 风属性抗性
  bEarthShield, // 地属性抗性
  bLightShield, // 光属性抗性
  bDarkShield, // 暗属性抗性
  bNormalShield, // 无属性抗性
  bAntiVenomu, // 中毒
  bAntiParaizu, // 麻痹
  bAntiDark, // 黑暗
  bAntiFire, // 着火
  bAntiFreeze, // 冻结
  bAntiBreak, // 破防
  bAntiSlow, // 缓慢
  bAntiStop, // 停止
  bAntiFear, // 恐惧
  bNinjutsuScrollLimit, // 仅限忍术卷轴
  b1handLimit, // 仅限单手武器
  b2handLimit, // 仅限双手武器
  bBowLimit, // 仅限弓
  bGunLimit, // 仅限枪
  bRodLimit, // 仅限法杖
  bMagictoolLimit, // 仅限魔法工具
  bKnuckleLimit, // 仅限拳套
  bMotionSpeed, // 行动速度
  bLongRange, // 远距离威力
  bAvoidDmgRate, // 回避伤害增加百分比 ？
  bShortRange, // 近距离威力
  bDualswordLimit, // 仅限双剑
  bShieldLimit, // 仅限盾牌
  bMaxMpTo10,
  bFirstAttack, // 先制攻击 ？
  bFirstAttackRate, // 先制攻击增加百分比 ？
  bMaxMpRate, // 最大MP增加百分比
  bEventCheck,
  bPoleweaponLimit, // 仅限长枪
  bKatanaLimit, // 仅限拔刀剑
  bArrowLimit, // 仅限弓箭
  bKnifeLimit, // 仅限小刀
  bLightArmorLimit, // 仅限轻甲
  bHeavyArmorLimit, // 仅限重甲
  bSurroundingsResist, // 周围伤害减轻
  bRangeResist, // 子弹伤害减轻
  bLineResist, // 直线伤害减轻
  bMoveAttackResist,
  bVerticalResist, // 垂直伤害减轻
  bBreathResist,
  bTranslationResist, // 冲撞伤害减轻
  bWallResist,
  bWiddResist, // 剑气伤害减轻 ？
  bExplosionResist, // 爆炸伤害减轻
  bBlackholeResist, // 黑洞伤害减轻
  bGenericEffectID, // 通用效果ID
  bAbsoluteHitRate, // 绝对命中
  bAbsoluteFreeRate, // 绝对回避
  bSelfDmgRate, // 自身伤害增加百分比
  bItemHpEffectPlus, // 道具HP效果增加 ？
  bItemEffectRate, // 道具效果增加百分比 ？
  bItemDelay, // 道具延迟
  bGuts, // 勇气
  bSacrifice, // 牺牲
  bHelpMaster, // 帮助主人
  bAvoidbreaker, // 回避破除
  bGuardbreaker, // 格挡破除
  bBossKiller, // 对BOSS增强
  bMagicStealRate, // 魔法偷取增加百分比
  bMagicSteal, // 魔法偷取
  bLifeStealRate, // 生命偷取增加百分比
  bLifeSteal, // 生命偷取
  bExpHpRecovery, // 经验HP恢复
  bExpMpRecovery, // 经验MP恢复
  bPhysicalPursuit, // 物理追击
  bMagicPursuit, // 魔法追击
  bDamageReflection, // 伤害反射
  bHateUpSuppression, // 仇恨值增加抑制
  bHateDownSuppression, // 仇恨值减少抑制
  bPhysicalBarrier, // 物理屏障
  bMagicBarrier, // 魔法屏障
  bRateBarrier, // 百分比屏障
  bBarrierSpeed, // 屏障回复速度
  bGrantStopFlinch, // 封印翻覆
  bGrantStopTumble, // 封印翻覆
  bGrantStopStun, // 封印昏厥
  bStrToAtk, // 力量转换为物理攻击
  bIntToAtk, // 智力转换为物理攻击
  bVitToAtk, // 耐力转换为物理攻击
  bAgiToAtk, // 敏捷转换为物理攻击
  bDexToAtk, // 灵巧转换为物理攻击
  bStrToMAtk, // 力量转换为魔法攻击
  bIntToMAtk, // 智力转换为魔法攻击
  bVitToMAtk, // 耐力转换为魔法攻击
  bAgiToMAtk, // 敏捷转换为魔法攻击
  bDexToMAtk, // 灵巧转换为魔法攻击
  bPetExpRate, // 宠物经验增加百分比
  bGemDustDropRate, // 晶石粉末掉落增加百分比
  bAvatarAtk, // 角色物理攻击
  bAvatarMatk, // 角色魔法攻击
  bAvatarHit, // 角色命中
  bAvatarFlee, // 角色回避
  bAvatarAspd, // 角色攻击速度
  bAvatarCspd, // 角色咏唱速度
  bAvatarHp, // 角色最大HP
  bAvatarMp, // 角色最大MP
  bAvatarRespawn, // 角色复活
  bAvatarSkill, // 角色技能
  bGemDropFixing, // 晶石掉落固定
  bGemPlayerDown, // 晶石玩家减少
  bGemMonsterUp, // 晶石怪物增加
  bDamageLimit, // 伤害限制
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
  bRandomItemGet, // 随机物品获取
  getSkilltree, // 获取技能树
  item_forcedwarp, // 物品强制传送
  foodPoisoning, // 食物中毒
  runn_price, // 战斗价格
}

// ============================== 计算层类型 ==============================
// 类型枚举
export enum PlayerAttrEnum {
  lv, // 等级

  // 基础能力值
  str, // 力量
  int, // 智力
  vit, // 耐力
  agi, // 敏捷
  dex, // 灵巧
  luk, // 幸运
  tec, // 技巧
  men, // 异抗
  cri, // 暴击

  // Mp
  maxMp, // MP上限
  currentMp, // MP当前值
  mpRegen, // MP自然回复
  mpAtkRegen, // MP攻击回复

  // Hp
  maxHp, // HP上限
  currentHp, // HP当前值
  hpRegen, // HP自然回复

  // 武器
  mainWeaponRange, // 主武器射程
  mainWeaponBaseAtk, // 主武器基础值
  mainWeaponType, // 主武器类型
  mainWeaponRef, // 主武器精炼
  mainWeaponStability, // 主武器稳定性
  subWeaponRange, // 副武器射程
  subWeaponType, // 副武器类型
  subWeaponRef, // 副武器精炼
  subWeaponStability, // 副武器稳定性
  weaponPAtk, // 武器物理攻击
  weaponMAtk, // 武器魔法攻击

  // 防具
  armorType, // 身体装备类型
  armorBaseAbi, // 身体装备基础值
  armorRef, // 身体装备精炼
  optionBaseAbi, // 追加装备基础值
  optionRef, // 追加装备精炼
  specialBaseAbi, // 特殊装备基础值

  // 物理属性

  aggroRate, // 仇恨值倍率

  pAtk, // 物理攻击

  mAtk, // 魔法攻击

  // 单次伤害增幅
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
  pPursuit, // 物理追击
  mPursuit, // 魔法追击
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
}
// 角色属性嵌套模型，核心结构
const PlayerAttr = {
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
    range: 2
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
    range: 2
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
    range: 3
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
    range: 6
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
    range: 6
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
    range: 1
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
    range: 6
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
    range: 1
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
    range: 3
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
    range: 1
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
    range: 0
  },
  OneHandSword: {
    aspdM: 0,
    pAtkM: 0,
    mAtkM: 0,
    pDefM: 0,
    mDefM: 0,
    range: 2
  },
  Magictool: {
    aspdM: 0,
    pAtkM: -0.15,
    mAtkM: 0,
    pDefM: 0,
    mDefM: 0,
    range: 6
  },
  Knuckle: {
    aspdM: 0,
    pAtkM: 0,
    mAtkM: -0.15,
    pDefM: 0,
    mDefM: 0,
    range: 1
  },
  Katana: {
    aspdM: 0,
    pAtkM: 0,
    mAtkM: 0,
    pDefM: 0,
    mDefM: 0,
    range: 2
  },
  Arrow: {
    aspdM: 0,
    pAtkM: 0,
    mAtkM: 0,
    pDefM: -0.25,
    mDefM: -0.25,
    range: 0
  },
  ShortSword: {
    aspdM: 0,
    pAtkM: 0,
    mAtkM: 0,
    pDefM: 0,
    mDefM: 0,
    range: 0
  },
  NinjutsuScroll: {
    aspdM: 0,
    pAtkM: 0,
    mAtkM: 0,
    pDefM: 0,
    mDefM: 0,
    range: 0
  },
  Shield: {
    aspdM: -0.5,
    pAtkM: 0,
    mAtkM: 0,
    pDefM: 0,
    mDefM: 0,
    range: 0
  },
};

/**
 * 统一的玩家属性Schema
 *
 * 结构说明：
 * - 每个属性包含displayName(显示名称)、expression(计算表达式)、isBase(是否基础值)
 * - 嵌套结构便于用户理解和DSL编写 (如 self.str)
 * - 属性路径小驼峰化后作为实际存储结构的键名，表达式内的属性调用使用当前结构自身的属性路径
 */
export const PlayerAttrSchema = (character: CharacterWithRelations) => {
  console.log("character", character);
  const mainWeaponType = character.weapon.type as MainHandType;
  const subWeaponType = character.subWeapon.type as SubHandType;
  return {
  // ============================== 基础信息 ==============================
  lv: {
    displayName: "等级",
    expression: `${character.lv}`,
  },

  // ============================== 基础能力值 ==============================
  abi: {
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
      expression: `${character.personalityType === 'Luk' ? character.personalityValue : 0}`,
    },
    tec: {
      displayName: "技巧",
      expression: `${character.personalityType === 'Tec' ? character.personalityValue : 0}`,
    },
    men: {
      displayName: "异抗",
      expression: `${character.personalityType === 'Men' ? character.personalityValue : 0}`,
    },
    cri: {
      displayName: "暴击",
      expression: `${character.personalityType === 'Cri' ? character.personalityValue : 0}`,
    },
  },

  // ============================== 生命值/魔法值 ==============================
  hp: {
    max: {
      displayName: "最大HP",
      expression: "Math.floor(93 + lv * (127 / 17 + abi.vit / 3))",
    },
    current: {
      displayName: "当前HP",
      expression: "0",
    },
    regen: {
      displayName: "HP自然回复",
      expression: "1 + hp.max / 25", // 默认值，可通过装备等修改
    },
  },

  mp: {
    max: {
      displayName: "最大MP",
      expression: "Math.floor(99 + lv + abi.int / 10 + abi.tec)",
    },
    current: {
      displayName: "当前MP",
      expression: "0",
    },
    regen: {
      displayName: "MP自然回复",
      expression: "1 + mp.max / 10",
    },
    atkRegen: {
      displayName: "MP攻击回复",
      expression: "10 + mp.max / 10",
    },
  },

  equip: {
    // ============================== 武器系统 ==============================
    weapon: {
      main: {
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
      sub: {
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
      attack: {
        physical: {
          displayName: "武器物理攻击",
          expression: `(equip.weapon.main.baseAtk + equip.weapon.main.ref + Math.pow(equip.weapon.main.ref, 2)) * ${MainWeaponTypeMap[mainWeaponType].patkC}`,
        },
        magical: {
          displayName: "武器魔法攻击",
          expression: `(equip.weapon.main.baseAtk + equip.weapon.main.ref + Math.pow(equip.weapon.main.ref, 2)) * ${MainWeaponTypeMap[mainWeaponType].matkC}`,
        },
        total: {
          displayName: "武器攻击",
          expression: "equip.weapon.main.attack.physical + equip.weapon.main.attack.magical",
        },
      },
    },

    // ============================== 防具系统 ==============================
    armor: {
      type: {
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

    optEquip: {
      baseAbi: {
        displayName: "追加装备基础值",
        expression: `${character.optEquip.baseAbi}`,
      },
      ref: {
        displayName: "追加装备精炼",
        expression: `${character.optEquip.refinement}`,
      },
    },

    speEquip: {
      baseAbi: {
        displayName: "特殊装备基础值",
        expression: `${character.speEquip.baseAbi}`,
      },
    },
  },

  aggro: {
    displayName: "仇恨值倍率",
    expression: "100",
  },
  physical: {
    displayName: "物理攻击",
    expression: `lv + equip.weapon.main.attack.physical + str * ${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.str.pAtkC} + int * ${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.int.pAtkC} + agi * ${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.agi.pAtkC} + dex * ${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.dex.pAtkC}`,
  },
  magical: {
    displayName: "魔法攻击",
    expression: `lv + equip.weapon.main.attack.magical + str * ${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.int.mAtkC} + int * ${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.int.mAtkC} + agi * ${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.agi.mAtkC} + dex * ${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.dex.mAtkC}`,
  },
  unsheathe: {
    displayName: "拔刀攻击",
    expression: "100",
  },

  pierce: {
    physical: {
      displayName: "物理贯穿",
      expression: "0",
    },
    magical: {
      displayName: "魔法贯穿",
      expression: "0",
    },
  },
  critical: {
    physical: {
      rate: {
        displayName: "物理暴击率",
        expression: "25 + abi.cri / 5",
      },
      damage: {
        displayName: "物理暴击伤害",
        expression: "150 + Math.floor(Math.max(abi.str / 5, (abi.str + abi.agi) / 10))",
      },
    },
    magical: {
      convRate: {
        displayName: "魔法暴击转化率",
        expression: "0",
      },
      dmgConvRate: {
        displayName: "魔法爆伤转化率",
        expression: "0.25",
      },
      rate: {
        displayName: "魔法暴击率",
        expression: "0",
      },
      damage: {
        displayName: "魔法暴击伤害",
        expression: "100 + (critical.physical.damage - 100) * critical.magical.dmgConvRate",
      },
    },
  },
  range: {
    short: {
      displayName: "近距离威力",
      expression: "0",
    },
    long: {
      displayName: "远距离威力",
      expression: "0",
    },
  },
  element: {
    neutral: {
      displayName: "对无属性增强",
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
  },
  total: {
    displayName: "总伤害",
    expression: "100",
  },
  final: {
    displayName: "最终伤害",
    expression: "100",
  },
  stability: {
    physical: {
      displayName: "物理稳定率",
      expression: `${character.weapon.stability} + Math.floor(abi.str * ${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.str.pStabC} + abi.int * ${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.int.pStabC} + abi.agi * ${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.agi.pStabC} + abi.dex * ${MainWeaponTypeMap[mainWeaponType].abi_Attr_Convert.dex.pStabC})`, // Placeholder
    },
    magical: {
      displayName: "魔法稳定率",
      expression: `50 + stability.physical / 2`,
    },
  },
  accuracy: {
    displayName: "命中",
    expression: "0",
  },
  pursuit: {
    physical: {
      displayName: "物理追击",
      expression: "0",
    },
    magical: {
      displayName: "魔法追击",
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
  absolute: {
    displayName: "绝对命中",
    expression: "0",
  },
}};
