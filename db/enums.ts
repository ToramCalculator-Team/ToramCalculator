// 已知的可加成项
export const MODIFIER_TYPE = [
  // 能力值
  "str", // 力量
  "int", // 智力
  "vit", // 耐力
  "agi", // 敏捷
  "dex", // 灵巧
  "luk", // 幸运
  "tec", // 技巧
  "men", // 异抗
  "cri", // 暴击
  // 基础属性
  "maxMp", // 最大MP
  "mp", // MP
  "aggro", // 仇恨值
  "weaponRange", // 武器射程
  "hpRegen", // HP自然回复
  "mpRegen", // MP自然回复
  "mpAtkRegen", // MP攻击回复
  // 单次伤害增幅
  "physicalAtk", // 物理攻击
  "magicalAtk", // 魔法攻击
  "weaponAtk", // 武器攻击
  "unsheatheAtk", // 拔刀攻击
  "physicalPierce", // 物理贯穿
  "magicalPierce", // 魔法贯穿
  "criticalRate", // 暴击率
  "criticalDamage", // 暴击伤害
  "magicCrtConversionRate", // 魔法暴击转化率
  "magicCrtDamageConversionRate", // 魔法爆伤转化率
  "magicCriticalRate", // 魔法暴击率
  "magicCriticalDamage", // 魔法暴击伤害
  "shortRangeDamage", // 近距离威力
  "longRangeDamage", // 远距离威力
  "strongerAgainstNetural", // 对无属性增强
  "strongerAgainstLight", // 对光属性增强
  "strongerAgainstDark", // 对暗属性增强
  "strongerAgainstWater", // 对水属性增强
  "strongerAgainstFire", // 对火属性增强
  "strongerAgainstEarth", // 对地属性增强
  "strongerAgainstWind", // 对风属性增强
  "totalDamage", // 总伤害
  "finalDamage", // 最终伤害
  "stability", // 稳定率
  "magicStability", // 魔法稳定率
  "accuracy", // 命中
  "additionalPhysics", // 物理追击
  "additionalMagic", // 魔法追击
  "anticipate", // 看穿
  "guardBreak", // 破防
  "reflect", // 反弹伤害
  "absolutaAccuracy", // 绝对命中
  "atkUpStr", // 物理攻击提升（力量）
  "atkUpInt", // 物理攻击提升（智力）
  "atkUpVit", // 物理攻击提升（耐力）
  "atkUpAgi", // 物理攻击提升（敏捷）
  "atkUpDex", // 物理攻击提升（灵巧）
  "matkUpStr", // 魔法攻击提升（力量）
  "matkUpInt", // 魔法攻击提升（智力）
  "matkUpVit", // 魔法攻击提升（耐力）
  "matkUpAgi", // 魔法攻击提升（敏捷）
  "matkUpDex", // 魔法攻击提升（灵巧）
  "atkDownStr", // 物理攻击下降（力量）
  "atkDownInt", // 物理攻击下降（智力）
  "atkDownVit", // 物理攻击下降（耐力）
  "atkDownAgi", // 物理攻击下降（敏捷）
  "atkDownDex", // 物理攻击下降（灵巧）
  "matkDownStr", // 魔法攻击下降（力量）
  "matkDownInt", // 魔法攻击下降（智力）
  "matkDownVit", // 魔法攻击下降（耐力）
  "matkDownAgi", // 魔法攻击下降（敏捷）
  "matkDownDex", // 魔法攻击下降（灵巧）
  // 生存能力加成
  "maxHp", // 最大HP
  "hp", // 当前HP
  "physicalDef", // 物理防御
  "magicalDef", // 魔法防御
  "physicalResistance", // 物理抗性
  "magicalResistance", // 魔法抗性
  "neutralResistance", // 无属性抗性
  "lightResistance", // 光属性抗性
  "darkResistance", // 暗属性抗性
  "waterResistance", // 水属性抗性
  "fireResistance", // 火属性抗性
  "earthResistance", // 地属性抗性
  "windResistance", // 风属性抗性
  "dodge", // 回避
  "ailmentResistance", // 异常抗性
  "baseGuardPower", // 基础格挡力
  "guardPower", // 格挡力
  "baseGuardRecharge", // 基础格挡回复
  "guardRecharge", // 格挡回复
  "evasionRecharge", // 闪躲回复
  "physicalBarrier", // 物理屏障
  "magicalBarrier", // 魔法屏障
  "fractionalBarrier", // 百分比瓶屏障
  "barrierCooldown", // 屏障回复速度
  "reduceDmgFloor", // 地面伤害减轻（地刺）
  "reduceDmgMeteor", // 陨石伤害减轻（天火）
  "reduceDmgPlayerEpicenter", // 范围伤害减轻（以玩家为中心的范围伤害）
  "reduceDmgFoeEpicenter", // 敌方周围伤害减轻（以怪物自身为中心的范围伤害）
  "reduceDmgBowling", // 贴地伤害减轻（剑气、风刃）
  "reduceDmgBullet", // 子弹伤害减轻（各种球）
  "reduceDmgStraightLine", // 直线伤害减轻（激光）
  "reduceDmgCharge", // 冲撞伤害减轻（怪物的位移技能）
  "absoluteDodge", // 绝对回避
  // 速度加成
  "aspd", // 攻击速度
  "asrd", // 动作缩减
  "cspd", // 咏唱速度
  "csrd", // 咏唱缩减
  "mspd", // 行动速度
  // 其他加成
  "dropRate", // 掉宝率
  "reviveTime", // 复活时间
  "flinchUnavailable", // 封印胆怯
  "tumbleUnavailable", // 封印翻覆
  "stunUnavailable", // 封印昏厥
  "invincibleAid", // 无敌急救
  "expRate", // 经验加成
  "petExp", // 宠物经验
  "itemCooldown", // 道具冷却
  "recoilDamage", // 反作用伤害
  "gemPowderDrop", // 晶石粉末掉落
] as const;
export type ModifierType = (typeof MODIFIER_TYPE)[number];
// 用户角色
export const ACCOUNT_TYPE = ["User", "Admin"] as const;
export type AccountType = (typeof ACCOUNT_TYPE)[number];
// 元素属性
export const ELEMENT_TYPE = ["Normal", "Light", "Dark", "Water", "Fire", "Earth", "Wind"] as const;
export type ElementType = (typeof ELEMENT_TYPE)[number];
// 怪物分类枚举
export const MOB_TYPE = ["Mob", "MiniBoss", "Boss"] as const;
export type MobType = (typeof MOB_TYPE)[number];
// Boss部位类型
export const BOSS_PART_TYPE = ["A", "B", "C"] as const;
export type BossPartType = (typeof BOSS_PART_TYPE)[number];
// Boss部位破坏奖励类型
export const BOSS_PART_BREAK_REWARD_TYPE = ["None", "CanDrop", "DropUp"] as const;
export type BossPartBreakRewardType = (typeof BOSS_PART_BREAK_REWARD_TYPE)[number];
// 个人能力值类型枚举
export const CHARACTER_PERSONALITY_TYPE = ["None", "Luk", "Cri", "Tec", "Men"] as const;
export type CharacterPersonalityType = (typeof CHARACTER_PERSONALITY_TYPE)[number];
// 伙伴技能类型
export const PARTNER_SKILL_TYPE = ["Passive", "Active"] as const;
export type PartnerSkillType = (typeof PARTNER_SKILL_TYPE)[number];
// 技能目标类型
export const SKILL_TARGET_TYPE = ["None", "Self", "Player", "Enemy"] as const;
export type SkillTargetType = (typeof SKILL_TARGET_TYPE)[number];
// 技能距离威力抵制类型
export const SKILL_DISTANCE_TYPE = ["None", "Long", "Short", "Both"] as const;
export type SkillDistanceType = (typeof SKILL_DISTANCE_TYPE)[number];
// 技能充能类型枚举（咏唱、蓄力）
export const SKILL_CHARGING_TYPE = ["Chanting", "Reservoir"] as const;
export type SkillChargingType = (typeof SKILL_CHARGING_TYPE)[number];
// 怪物难度标识
export const MOB_DIFFICULTY_FLAG = ["Easy", "Normal", "Hard", "Lunatic", "Ultimate"] as const;
export type MobDifficultyFlag = (typeof MOB_DIFFICULTY_FLAG)[number];
// 地点类型（普通地点，限时地点）
export const ADDRESS_TYPE = ["Normal", "Limited"] as const;
export type AddressType = (typeof ADDRESS_TYPE)[number];
// 素材类型
export const MATERIAL_TYPE = ["Metal", "Cloth", "Beast", "Wood", "Drug", "Magic"] as const;
export type MaterialType = (typeof MATERIAL_TYPE)[number];
// 宠物性格
export const PET_PERSONA_TYPE = [
  "Fervent",
  "Intelligent",
  "Mild",
  "Swift",
  "Justice",
  "Devoted",
  "Impulsive",
  "Calm",
  "Sly",
  "Timid",
  "Brave",
  "Active",
  "Sturdy",
  "Steady",
  "Max",
] as const;
export type PetPersonaType = (typeof PET_PERSONA_TYPE)[number];
// 宠物类型
export const PET_TYPE = [
  "AllTrades",
  "PhysicalAttack",
  "MagicAttack",
  "PhysicalDefense",
  "MagicDefensem",
  "Avoidance",
  "Hit",
  "SkillsEnhancement",
  "Genius",
] as const;
export type PetType = (typeof PET_TYPE)[number];
// 佣兵类型
export const MERCENARY_TYPE = ["Tank", "Dps"] as const;
export type MercenaryType = (typeof MERCENARY_TYPE)[number];
// 其他用户可见性
export const VISIBILITY = ["Public", "Private"] as const;
export type Visibility = (typeof VISIBILITY)[number];
// 主武器类型
export const MAIN_WEAPON_TYPE = [
  "OneHandSword",// 0
  "TwoHandSword",// 1
  "Bow",// 2
  "Bowgun",// 3
  "Rod",// 4
  "Magictool",// 5
  "Knuckle",// 6
  "Halberd",// 7
  "Katana",// 8
] as const;
export type MainWeaponType = (typeof MAIN_WEAPON_TYPE)[number];
// 主手武器类型
export const MAIN_HAND_TYPE = [...MAIN_WEAPON_TYPE, "None"] as const;
export type MainHandType = (typeof MAIN_HAND_TYPE)[number];
// 副武器
export const SUB_WEAPON_TYPE = ["Arrow", "ShortSword", "NinjutsuScroll", "Shield"] as const;
export type SubWeaponType = (typeof SUB_WEAPON_TYPE)[number];
// 副手武器类型
export const SUB_HAND_TYPE = [...SUB_WEAPON_TYPE, MAIN_WEAPON_TYPE[0], MAIN_HAND_TYPE[5], MAIN_HAND_TYPE[6], MAIN_HAND_TYPE[8], "None"] as const;
export type SubHandType = (typeof SUB_HAND_TYPE)[number];
// 武器
export const WEAPON_TYPE = [...MAIN_WEAPON_TYPE, ...SUB_WEAPON_TYPE] as const;
export type WeaponType = (typeof WEAPON_TYPE)[number];
// 用户防具类型
export const PLAYER_ARMOR_ABILITY_TYPE = ["Normal", "Light", "Heavy"] as const;
export type PlayerArmorAbilityType = (typeof PLAYER_ARMOR_ABILITY_TYPE)[number];
// 装备
export const EQUIP_TYPE = [...WEAPON_TYPE, ...SUB_WEAPON_TYPE, "Armor", "Option", "Special"] as const;
export type EquipType = (typeof EQUIP_TYPE)[number];
// 时装
export const AVATAR_TYPE = ["Decoration", "Top", "Bottom"] as const;
export type AvatarType = (typeof AVATAR_TYPE)[number];
// 锻晶
export const CRYSTAL_TYPE = [
  "NormalCrystal",
  "WeaponCrystal",
  "ArmorCrystal",
  "OptionCrystal",
  "SpecialCrystal",
] as const;
export type CrystalType = (typeof CRYSTAL_TYPE)[number];
// 消耗品
export const CONSUMABLE_TYPE = [
  "MaxHp",
  "MaxMp",
  "pAtk",
  "mAtk",
  "Aspd",
  "Cspd",
  "Hit",
  "Flee",
  "EleStro",
  "EleRes",
  "pRes",
  "mRes",
] as const;
export type ConsumableType = (typeof CONSUMABLE_TYPE)[number];
// 道具
export const ITEM_TYPE = ["Weapon", "Armor", "Option", "Special", "Crystal", "Consumable", "Material"] as const;
export type ItemType = (typeof ITEM_TYPE)[number];
// 任务类型
export const TASK_TYPE = ["Collect", "Defeat", "Both", "Other"] as const;
export type TaskType = (typeof TASK_TYPE)[number];
// 任务奖励类型
export const TASK_REWARD_TYPE = ["Exp", "Money", "Item"] as const;
export type TaskRewardType = (typeof TASK_REWARD_TYPE)[number];
// 配方
export const RECIPE_INGREDIENT_TYPE = ["Gold", ...MATERIAL_TYPE, "Item"] as const;
// 异常状态
export const ABNORMAL_TYPE = [
  "MagicFlinch",
  "None",
  "Flinch",
  "Tumble",
  "Stun",
  "KnockBack",
  "Poison",
  "PoisonLevel1",
  "PoisonLevel2",
  "Paralysis",
  "Blindness",
  "Ignition",
  "Freeze",
  "Breaking",
  "Slow",
  "Stop",
  "Fear",
  "Dizzy",
  "Weak",
  "Collapse",
  "Confusion",
  "Silent",
  "Bleed",
  "Sleep",
  "Rage",
  "Tiredness",
  "Blessing",
  "SystemInvincibility",
  "BestState",
  "Invincibility",
  "Suction",
  "Taming",
  "Curse",
  "Flash",
  "Runaway",
  "MagicalExplosion",
  "Sick",
  "Malgravity",
  "Dispel",
  "Inversion",
  "Mineralization",
  "NoTools",
  "Enhance",
  "ComboInvincibility",
  "DeathTorqueShot",
  "SystemAddHate",
  "Recovery",
] as const;
export type AbnormalType = (typeof ABNORMAL_TYPE)[number];
// 技能树类型
export const SKILL_TREE_TYPE = [
  "BladeSkill", // 剑术技能
  "ShootSkill", // 射击技能
  "MagicSkill", // 魔法技能
  "MarshallSkill", // 格斗技能
  "DualSwordSkill", // 双剑技能
  "HalberdSkill", // 斧枪技能
  "MononofuSkill", // 武士技能
  "CrusherSkill", // 粉碎者技能
  "FeatheringSkill", // 灵魂技能
  "GuardSkill", // 格挡技能
  "ShieldSkill", // 护盾技能
  "KnifeSkill", // 小刀技能
  "KnightSkill", // 骑士技能
  "HunterSkill", // 狩猎技能
  "PriestSkill", // 祭司技能
  "AssassinSkill", // 暗杀技能
  "WizardSkill", // 巫师技能
  //
  "SupportSkill", // 辅助技能
  "BattleSkill", // 好战分子
  "SurvivalSkill", // 生存本能
  //
  "SmithSkill", // 锻冶大师
  "AlchemySkill", // 炼金术士
  "TamerSkill", // 驯兽天分
  //
  "DarkPowerSkill", // 暗黑之力
  "MagicBladeSkill", // 魔剑技能
  "DancerSkill", // 舞者技能
  "MinstrelSkill", // 诗人技能
  "BareHandSkill", // 空手技能
  "NinjaSkill", // 忍者技能
  "PartisanSkill", // 游击队技能
  //
  "LuckSkill",
  "MerchantSkill", // 商人技能
  "PetSkill", // 宠物技能
] as const;
export type SkillTreeType = (typeof SKILL_TREE_TYPE)[number];
// 技能伤害类型
export const SKILL_ATTACK_TYP = ["None", "Physical", "Magic", "SkillNormal"] as const;
export type SkillAttackType = (typeof SKILL_ATTACK_TYP)[number];
// 连击效果类型
export const COMBO_STEP_TYPE = [
  "None",
  "Start",
  "Rengeki", // 连击
  "ThirdEye", // 心眼
  "Filling", // 补位
  "Quick", // 迅速
  "HardHit", // 增幅
  "Tenacity", // 执着
  "Invincible", // 无敌
  "BloodSucking", // 吸血
  "Tough", // 强韧
  "AMomentaryWalk",
  "Reflection", // 反射
  "Illusion",
  "Max",
] as const;
export type ComboStepType = (typeof COMBO_STEP_TYPE)[number];
// 雷吉斯托环类型
export const REGISLET_TYPE = [
  "Nil",
  "AtkUp",
  "MAtkUp",
  "MaxHpUp",
  "MaxMpUp",
  "DefUp",
  "MDefUp",
  "HitUp",
  "FleeUp",
  "AspdUp",
  "CspdUp",
  "PursuitResist",
  "PoisonRecovery",
  "BurningFightingSpirit",
  "NeuralControl",
  "CatEye",
  "Hyperthermia",
  "Temporaryrepairs",
  "Spike",
  "StandingWithArmsCrossed",
  "BloodyWarrior",
  "SilentRecharge",
  "ShortSleeper",
  "MagicalNonExplosion",
  "MonsterHunt",
  "CoffeeBreak",
  "Practitioner",
  "PetOfAttacker",
  "PetOfTanker",
  "EmergencyHpRecovery",
  "EmergencyMpRecovery",
  "MagicalBash",
  "SavingTechnique",
  "LastHero",
  "Lonely",
  "StartDash",
  "BaskInTheSun",
  "TheSameBoat",
  "LastResistance",
  "BackwardWarning",
  "Saviour",
  "Panic",
  "Transfer",
  "HideCombo",
  "NothingStyle",
  "FailTrapper",
  "Guitarist",
  "QuickDance",
  "SeoulConnect",
  "ExtremeSurvival",
  "AvoidSet",
  "LongStep",
  "TeleportStep",
  "FireTalent",
  "WaterTalent",
  "WindTalent",
  "LandTalent",
  "LightTalent",
  "DarkTalent",
  "CriticalCare",
  "NoneNow",
  "TargetDeclaration",
  "LeavingWorkNotification",
  "DamageCheck",
  "PoisonBooster",
  "FlameBooster",
  "WeaknessBlade",
  "PreparationPoison",
  "HardHitEnhance",
  "AccelBladeExtension",
  "PowerShootSharp",
  "OneWheelEnhance",
  "MagicArrowPursuit",
  "MagicWallEnhance",
  "SmashEnhance",
  "SonicWaveEnhance",
] as const;
export type RegisletType = (typeof REGISLET_TYPE)[number];
