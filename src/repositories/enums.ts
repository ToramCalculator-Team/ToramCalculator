
export type AccountType = "Admin" | "User";

export enum ModifierType {
  DEFAULT = "default",
  // 能力值
  STR = "str", // 力量
  INT = "int", // 智力
  VIT = "vit", // 耐力
  AGI = "agi", // 敏捷
  DEX = "dex", // 灵巧
  LUK = "luk", // 幸运
  TEC = "tec", // 技巧
  MEN = "men", // 异抗
  CRI = "cri", // 暴击
  // 基础属性
  MAX_MP = "maxMp", // 最大MP
  MP = "mp", // MP
  AGGRO = "aggro", // 仇恨值
  WEAPON_RANGE = "weaponRange", // 武器射程
  HP_REGEN = "hpRegen", // HP自然回复
  MP_REGEN = "mpRegen", // MP自然回复
  MP_ATK_REGEN = "mpAtkRegen", // MP攻击回复
  // 单次伤害增幅
  PHYSICAL_ATK = "physicalAtk", // 物理攻击
  MAGICAL_ATK = "magicalAtk", // 魔法攻击
  WEAPON_ATK = "weaponAtk", // 武器攻击
  UNSHEATHE_ATK = "unsheatheAtk", // 拔刀攻击
  PHYSICAL_PIERCE = "physicalPierce", // 物理贯穿
  MAGICAL_PIERCE = "magicalPierce", // 魔法贯穿
  PHYSICAL_CRITICAL_RATE = "criticalRate", // 暴击率
  PHYSICAL_CRITICAL_DAMAGE = "criticalDamage", // 暴击伤害
  MAGICAL_CRT_CONVERSION_RATE = "magicCrtConversionRate", // 魔法暴击转化率
  MAGICAL_CRT_DAMAGE_CONVERSION_RATE = "magicCrtDamageConversionRate", // 魔法爆伤转化率
  MAGICAL_CRITICAL_RATE = "magicCriticalRate", // 魔法暴击率
  MAGICAL_CRITICAL_DAMAGE = "magicCriticalDamage", // 魔法暴击伤害
  SHORT_RANGE_DAMAGE = "shortRangeDamage", // 近距离威力
  LONG_RANGE_DAMAGE = "longRangeDamage", // 远距离威力
  STRONGER_AGAINST_NETURAL = "strongerAgainstNetural", // 对无属性增强
  STRONGER_AGAINST_LIGHT = "strongerAgainstLight", // 对光属性增强
  STRONGER_AGAINST_DARK = "strongerAgainstDark", // 对暗属性增强
  STRONGER_AGAINST_WATER = "strongerAgainstWater", // 对水属性增强
  STRONGER_AGAINST_FIRE = "strongerAgainstFire", // 对火属性增强
  STRONGER_AGAINST_EARTH = "strongerAgainstEarth", // 对地属性增强
  STRONGER_AGAINST_WIND = "strongerAgainstWind", // 对风属性增强
  TOTAL_DAMAGE = "totalDamage", // 总伤害
  FINAL_DAMAGE = "finalDamage", // 最终伤害
  PHYSICAL_STABILITY = "stability", // 稳定率
  MAGIC_STABILITY = "magicStability", // 魔法稳定率
  ACCURACY = "accuracy", // 命中
  ADDITIONAL_PHYSICS = "additionalPhysics", // 物理追击
  ADDITIONAL_MAGIC = "additionalMagic", // 魔法追击
  ANTICIPATE = "anticipate", // 看穿
  GUARD_BREAK = "guardBreak", // 破防
  REFLECT = "reflect", // 反弹伤害
  ABSOLUTA_ACCURACY = "absolutaAccuracy", // 绝对命中
  ATK_UP_STR = "atkUpStr", // 物理攻击提升（力量）
  ATK_UP_INT = "atkUpInt", // 物理攻击提升（智力）
  ATK_UP_VIT = "atkUpVit", // 物理攻击提升（耐力）
  ATK_UP_AGI = "atkUpAgi", // 物理攻击提升（敏捷）
  ATK_UP_DEX = "atkUpDex", // 物理攻击提升（灵巧）
  MATK_UP_STR = "matkUpStr", // 魔法攻击提升（力量）
  MATK_UP_INT = "matkUpInt", // 魔法攻击提升（智力）
  MATK_UP_VIT = "matkUpVit", // 魔法攻击提升（耐力）
  MATK_UP_AGI = "matkUpAgi", // 魔法攻击提升（敏捷）
  MATK_UP_DEX = "matkUpDex", // 魔法攻击提升（灵巧）
  ATK_DOWN_STR = "atkDownStr", // 物理攻击下降（力量）
  ATK_DOWN_INT = "atkDownInt", // 物理攻击下降（智力）
  ATK_DOWN_VIT = "atkDownVit", // 物理攻击下降（耐力）
  ATK_DOWN_AGI = "atkDownAgi", // 物理攻击下降（敏捷）
  ATK_DOWN_DEX = "atkDownDex", // 物理攻击下降（灵巧）
  MATK_DOWN_STR = "matkDownStr", // 魔法攻击下降（力量）
  MATK_DOWN_INT = "matkDownInt", // 魔法攻击下降（智力）
  MATK_DOWN_VIT = "matkDownVit", // 魔法攻击下降（耐力）
  MATK_DOWN_AGI = "matkDownAgi", // 魔法攻击下降（敏捷）
  MATK_DOWN_DEX = "matkDownDex", // 魔法攻击下降（灵巧）
  // 生存能力加成
  MAX_HP = "maxHp", // 最大HP
  HP = "hp", // 当前HP
  PHYSICAL_DEF = "physicalDef", // 物理防御
  MAGICAL_DEF = "magicalDef", // 魔法防御
  PHYSICAL_RESISTANCE = "physicalResistance", // 物理抗性
  MAGICAL_RESISTANCE = "magicalResistance", // 魔法抗性
  NEUTRAL_RESISTANCE = "neutralResistance", // 无属性抗性
  LIGHT_RESISTANCE = "lightResistance", // 光属性抗性
  DARK_RESISTANCE = "darkResistance", // 暗属性抗性
  WATER_RESISTANCE = "waterResistance", // 水属性抗性
  FIRE_RESISTANCE = "fireResistance", // 火属性抗性
  EARTH_RESISTANCE = "earthResistance", // 地属性抗性
  WIND_RESISTANCE = "windResistance", // 风属性抗性
  DODGE = "dodge", // 回避
  AILMENT_RESISTANCE = "ailmentResistance", // 异常抗性
  BASE_GUARD_POWER = "baseGuardPower", // 基础格挡力
  GUARD_POWER = "guardPower", // 格挡力
  BASE_GUARD_RECHARGE = "baseGuardRecharge", // 基础格挡回复
  GUARD_RECHANGE = "guardRecharge", // 格挡回复
  EVASION_RECHARGE = "evasionRecharge", // 闪躲回复
  PHYSICAL_BARRIER = "physicalBarrier", // 物理屏障
  MAGICAL_BARRIER = "magicalBarrier", // 魔法屏障
  FRACTIONAL_BARRIER = "fractionalBarrier", // 百分比瓶屏障
  BARRIER_COOLDOWN = "barrierCooldown", // 屏障回复速度
  REDUCE_DMG_FLOOR = "reduceDmgFloor", // 地面伤害减轻（地刺）
  REDUCE_DMG_METEOR = "reduceDmgMeteor", // 陨石伤害减轻（天火）
  REDUCE_DMG_PLAYER_EPICENTER = "reduceDmgPlayerEpicenter", // 范围伤害减轻（以玩家为中心的范围伤害）
  REDUCE_DMG_FOE_EPICENTER = "reduceDmgFoeEpicenter", // 敌方周围伤害减轻（以怪物自身为中心的范围伤害）
  REDUCE_DMG_BOWLING = "reduceDmgBowling", // 贴地伤害减轻（剑气、风刃）
  REDUCE_DMG_BULLET = "reduceDmgBullet", // 子弹伤害减轻（各种球）
  REDUCE_DMG_STRAIGHT_LINE = "reduceDmgStraightLine", // 直线伤害减轻（激光）
  REDUCE_DMG_CHARGE = "reduceDmgCharge", // 冲撞伤害减轻（怪物的位移技能）
  ABSOLUTE_DODGE = "absoluteDodge", // 绝对回避
  // 速度加成
  ASPD = "aspd", // 攻击速度
  MSRD = "asrd", // 动作缩减
  CSPD = "cspd", // 咏唱速度
  CSRD = "csrd", // 咏唱缩减
  MSPD = "mspd", // 行动速度
  // 其他加成
  DROP_RATE = "dropRate", // 掉宝率
  REVIVE_TIME = "reviveTime", // 复活时间
  FLINCH_UNAVAILABLE = "flinchUnavailable", // 封印胆怯
  TUMBLE_UNAVAILABLE = "tumbleUnavailable", // 封印翻覆
  STUN_UNAVAILABLE = "stunUnavailable", // 封印昏厥
  INVINCIBLE_AID = "invincibleAid", // 无敌急救
  EXP_RATE = "expRate", // 经验加成
  PET_EXP = "petExp", // 宠物经验
  ITEM_COOLDOWN = "itemCooldown", // 道具冷却
  RECOIL_DAMAGE = "recoilDamage", // 反作用伤害
  GEM_POWDER_DROP = "gemPowderDrop", // 晶石粉末掉落
  // 中间数值
  WEAPON_MATK_CONVERSION_RATE = "weaponMatkConversionRate", // 主武器魔法攻击转换率
  WEAPON_ATK_CONVERSION_RATE = "weaponAtkConversionRate", // 主武器物理攻击转换率
  MAINWEAPON_BASE_VALUE = "mainWeaponBaseValue", // 主武器基础值
  MAINWEAPON_ATK = "mainWeaponAtk", // 主武器攻击
  SUBWEAPON_BASE_VALUE = "subweaponBaseValue", // 副武器基础值
  SUBWEAPON_ATK = "subweaponAtk", // 副武器攻击
  BODYARMOR_BASE_VALUE = "bodyarmorBaseValue", // 防具基础值
}

export enum CharacterModifierType {
  DEFAULT = "default",
  // 能力值
  STR = "str", // 力量
  INT = "int", // 智力
  VIT = "vit", // 耐力
  AGI = "agi", // 敏捷
  DEX = "dex", // 灵巧
  // 基础属性
  MAX_MP = "maxMp", // 最大MP
  AGGRO = "aggro", // 仇恨值
  WEAPON_RANGE = "weaponRange", // 武器射程
  HP_REGEN = "hpRegen", // HP自然回复
  MP_REGEN = "mpRegen", // MP自然回复
  // 单次伤害增幅
  PHYSICAL_ATK = "physicalAtk", // 物理攻击
  MAGICAL_ATK = "magicalAtk", // 魔法攻击
  WEAPON_ATK = "weaponAtk", // 武器攻击
  UNSHEATHE_ATK = "unsheatheAtk", // 拔刀攻击
  PHYSICAL_PIERCE = "physicalPierce", // 物理贯穿
  MAGICAL_PIERCE = "magicalPierce", // 魔法贯穿
  CRITICAL_RATE = "criticalRate", // 暴击率
  CRITICAL_DAMAGE = "criticalDamage", // 暴击伤害
  MAGIC_CRT_CONVERSION_RATE = "magicCrtConversionRate", // 魔法暴击转化率
  MAGIC_CRT_DAMAGE_CONVERSION_RATE = "magicCrtDamageConversionRate", // 魔法爆伤转化率
  SHORT_RANGE_DAMAGE = "shortRangeDamage", // 近距离威力
  LONG_RANGE_DAMAGE = "longRangeDamage", // 远距离威力
  STRONGER_AGAINST_NETURAL = "strongerAgainstNetural", // 对无属性增强
  STRONGER_AGAINST_LIGHT = "strongerAgainstLight", // 对光属性增强
  STRONGER_AGAINST_DARK = "strongerAgainstDark", // 对暗属性增强
  STRONGER_AGAINST_WATER = "strongerAgainstWater", // 对水属性增强
  STRONGER_AGAINST_FIRE = "strongerAgainstFire", // 对火属性增强
  STRONGER_AGAINST_EARTH = "strongerAgainstEarth", // 对地属性增强
  STRONGER_AGAINST_WIND = "strongerAgainstWind", // 对风属性增强
  TOTAL_DAMAGE = "totalDamage", // 总伤害
  FINAL_DAMAGE = "finalDamage", // 最终伤害
  STABILITY = "stability", // 稳定率
  ACCURACY = "accuracy", // 命中
  ADDITIONAL_PHYSICS = "additionalPhysics", // 物理追击
  ADDITIONAL_MAGIC = "additionalMagic", // 魔法追击
  ANTICIPATE = "anticipate", // 看穿
  GUARD_BREAK = "guardBreak", // 破防
  REFLECT = "reflect", // 反弹伤害
  ABSOLUTA_ACCURACY = "absolutaAccuracy", // 绝对命中
  ATK_UP_STR = "atkUpStr", // 物理攻击提升（力量）
  ATK_UP_INT = "atkUpInt", // 物理攻击提升（智力）
  ATK_UP_VIT = "atkUpVit", // 物理攻击提升（耐力）
  ATK_UP_AGI = "atkUpAgi", // 物理攻击提升（敏捷）
  ATK_UP_DEX = "atkUpDex", // 物理攻击提升（灵巧）
  MATK_UP_STR = "matkUpStr", // 魔法攻击提升（力量）
  MATK_UP_INT = "matkUpInt", // 魔法攻击提升（智力）
  MATK_UP_VIT = "matkUpVit", // 魔法攻击提升（耐力）
  MATK_UP_AGI = "matkUpAgi", // 魔法攻击提升（敏捷）
  MATK_UP_DEX = "matkUpDex", // 魔法攻击提升（灵巧）
  ATK_DOWN_STR = "atkDownStr", // 物理攻击下降（力量）
  ATK_DOWN_INT = "atkDownInt", // 物理攻击下降（智力）
  ATK_DOWN_VIT = "atkDownVit", // 物理攻击下降（耐力）
  ATK_DOWN_AGI = "atkDownAgi", // 物理攻击下降（敏捷）
  ATK_DOWN_DEX = "atkDownDex", // 物理攻击下降（灵巧）
  MATK_DOWN_STR = "matkDownStr", // 魔法攻击下降（力量）
  MATK_DOWN_INT = "matkDownInt", // 魔法攻击下降（智力）
  MATK_DOWN_VIT = "matkDownVit", // 魔法攻击下降（耐力）
  MATK_DOWN_AGI = "matkDownAgi", // 魔法攻击下降（敏捷）
  MATK_DOWN_DEX = "matkDownDex", // 魔法攻击下降（灵巧）
  // 生存能力加成
  MAX_HP = "maxHp", // 最大HP
  PHYSICAL_DEF = "physicalDef", // 物理防御
  MAGICAL_DEF = "magicalDef", // 魔法防御
  PHYSICAL_RESISTANCE = "physicalResistance", // 物理抗性
  MAGICAL_RESISTANCE = "magicalResistance", // 魔法抗性
  NEUTRAL_RESISTANCE = "neutralResistance", // 无属性抗性
  LIGHT_RESISTANCE = "lightResistance", // 光属性抗性
  DARK_RESISTANCE = "darkResistance", // 暗属性抗性
  WATER_RESISTANCE = "waterResistance", // 水属性抗性
  FIRE_RESISTANCE = "fireResistance", // 火属性抗性
  EARTH_RESISTANCE = "earthResistance", // 地属性抗性
  WIND_RESISTANCE = "windResistance", // 风属性抗性
  DODGE = "dodge", // 回避
  AILMENT_RESISTANCE = "ailmentResistance", // 异常抗性
  BASE_GUARD_POWER = "baseGuardPower", // 基础格挡力
  GUARD_POWER = "guardPower", // 格挡力
  BASE_GUARD_RECHARGE = "baseGuardRecharge", // 基础格挡回复
  GUARD_RECHANGE = "guardRecharge", // 格挡回复
  EVASION_RECHARGE = "evasionRecharge", // 闪躲回复
  PHYSICAL_BARRIER = "physicalBarrier", // 物理屏障
  MAGICAL_BARRIER = "magicalBarrier", // 魔法屏障
  FRACTIONAL_BARRIER = "fractionalBarrier", // 百分比瓶屏障
  BARRIER_COOLDOWN = "barrierCooldown", // 屏障回复速度
  REDUCE_DMG_FLOOR = "reduceDmgFloor", // 地面伤害减轻（地刺）
  REDUCE_DMG_METEOR = "reduceDmgMeteor", // 陨石伤害减轻（天火）
  REDUCE_DMG_PLAYER_EPICENTER = "reduceDmgPlayerEpicenter", // 范围伤害减轻（以玩家为中心的范围伤害）
  REDUCE_DMG_FOE_EPICENTER = "reduceDmgFoeEpicenter", // 敌方周围伤害减轻（以怪物自身为中心的范围伤害）
  REDUCE_DMG_BOWLING = "reduceDmgBowling", // 贴地伤害减轻（剑气、风刃）
  REDUCE_DMG_BULLET = "reduceDmgBullet", // 子弹伤害减轻（各种球）
  REDUCE_DMG_STRAIGHT_LINE = "reduceDmgStraightLine", // 直线伤害减轻（激光）
  REDUCE_DMG_CHARGE = "reduceDmgCharge", // 冲撞伤害减轻（怪物的位移技能）
  ABSOLUTE_DODGE = "absoluteDodge", // 绝对回避
  // 速度加成
  ASPD = "aspd", // 攻击速度
  CSPD = "cspd", // 咏唱速度
  MSPD = "mspd", // 行动速度
  // 其他加成
  DROP_RATE = "dropRate", // 掉宝率
  REVIVE_TIME = "reviveTime", // 复活时间
  FLINCH_UNAVAILABLE = "flinchUnavailable", // 封印胆怯
  TUMBLE_UNAVAILABLE = "tumbleUnavailable", // 封印翻覆
  STUN_UNAVAILABLE = "stunUnavailable", // 封印昏厥
  INVINCIBLE_AID = "invincibleAid", // 无敌急救
  EXP_RATE = "expRate", // 经验加成
  PET_EXP = "petExp", // 宠物经验
  ITEM_COOLDOWN = "itemCooldown", // 道具冷却
  RECOIL_DAMAGE = "recoilDamage", // 反作用伤害
  GEM_POWDER_DROP = "gemPowderDrop", // 晶石粉末掉落
  // 中间数值
  WEAPON_MATK_CONVERSION_RATE = "weaponMatkConversionRate", // 武器魔法攻击转换率
  WEAPON_ATK_CONVERSION_RATE = "weaponAtkConversionRate", // 武器物理攻击转换率
}

export enum MonsterModifierType {
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

// export enum SkillModifierType {

//  }

// 任务奖励类型
export type TaskRewardType = "Exp" | "Money" | Item;

// 道具
export type Item = EquipType | CrystalType;

// 锻晶
export type CrystalType =
  | "Normal"
  | "Weapon"
  | "Armor"
  | "AddEquip"
  | "Special"
  | "PowerUpNormal"
  | "PowerUpWeapon"
  | "PowerUpArmor"
  | "PowerUpAddEquip"
  | "PowerUpSpecial";

// 装备
export type EquipType = WeaponType | SubWeaponType | "Armor" | "AddEquip" | "SpecialEquip";

// 武器
export type WeaponType = MainWeaponType | SubWeaponType;

// 主武器
export type MainWeaponType =
  | "OneHandSword"
  | "TwoHandSword"
  | "Bow"
  | "Bowgun"
  | "Rod"
  | "Magictool"
  | "Knuckle"
  | "Halberd"
  | "Katana";

// 副武器
export type SubWeaponType = "Arrow" | "ShortSword" | "NinjutsuScroll" | "Shield";

// 异常状态
export type AbnormalType =
  | "MagicFlinch"
  | "None"
  | "Flinch"
  | "Tumble"
  | "Stun"
  | "KnockBack"
  | "Poison"
  | "PoisonLevel1"
  | "PoisonLevel2"
  | "Paralysis"
  | "Blindness"
  | "Ignition"
  | "Freeze"
  | "Breaking"
  | "Slow"
  | "Stop"
  | "Fear"
  | "Dizzy"
  | "Weak"
  | "Collapse"
  | "Confusion"
  | "Silent"
  | "Bleed"
  | "Sleep"
  | "Rage"
  | "Tiredness"
  | "Blessing"
  | "SystemInvincibility"
  | "BestState"
  | "Invincibility"
  | "Suction"
  | "Taming"
  | "Curse"
  | "Flash"
  | "Runaway"
  | "MagicalExplosion"
  | "Sick"
  | "Malgravity"
  | "Dispel"
  | "Inversion"
  | "Mineralization"
  | "NoTools"
  | "Enhance"
  | "ComboInvincibility"
  | "DeathTorqueShot"
  | "SystemAddHate"
  | "Recovery";

// export type SkillType = "Unknown"
//   | "Attack" // 攻击
//   | "Mastery" 
//   | "Support" // 辅助
//   | "Buffer" // buff
//   | "Circle" // 圈
//   | "Object" // 对象
//   | "Heal" //   治疗
//   | 'Special' // 特殊技能
//   | "Extra" // 额外 

export type SkillTreeType =
  | "BladeSkill" // 剑术技能
  | "ShootSkill" // 射击技能
  | "MagicSkill" // 魔法技能
  | "MarshallSkill" // 格斗技能
  | "DualSwordSkill" // 双剑技能
  | "HalberdSkill" // 斧枪技能
  | "MononofuSkill" // 武士技能
  | "CrusherSkill" // 粉碎者技能
  | "FeatheringSkill" // 灵魂技能
  | "GuardSkill" // 格挡技能
  | "ShieldSkill" // 护盾技能
  | "KnifeSkill" // 小刀技能
  | "KnightSkill" // 骑士技能
  | "HunterSkill" // 狩猎技能
  | "PriestSkill" // 祭司技能
  | "AssassinSkill" // 暗杀技能
  | "WizardSkill" // 巫师技能
  //
  | "SupportSkill" // 辅助技能
  | "BattleSkill" // 好战分子
  | "SurvivalSkill" // 生存本能
  //
  | "SmithSkill" // 锻冶大师
  | "AlchemySkill" // 炼金术士
  | "TamerSkill" // 驯兽天分
  //
  | "DarkPowerSkill" // 暗黑之力
  | "MagicBladeSkill" // 魔剑技能
  | "DancerSkill" // 舞者技能
  | "MinstrelSkill" // 诗人技能
  | "BareHandSkill" // 空手技能
  | "NinjaSkill" // 忍者技能
  | "PartisanSkill" // 游击队技能
  //
  | "LuckSkill"
  | "MerchantSkill" // 商人技能
  | "PetSkill"; // 宠物技能

// 玩家技能攻击类型
export type SkillAttackType = "None" | "Physical" | "Magic" | "SkillNormal";

// 连击效果类型
export type SkillComboType =
  | "None"
  | "Start"
  | "Rengeki" // 连击
  | "ThirdEye" // 心眼
  | "Filling" // 补位
  | "Quick" // 迅速
  | "HardHit" // 增幅
  | "Tenacity" // 执着
  | "Invincible" // 无敌
  | "BloodSucking" // 吸血
  | "Tough" // 强韧
  | "AMomentaryWalk"
  | "Reflection" // 反射
  | "Illusion"
  | "Max";
