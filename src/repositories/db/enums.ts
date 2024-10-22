export const UserRole = {
    USER: "USER",
    ADMIN: "ADMIN"
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
export const Element = {
    NO_ELEMENT: "NO_ELEMENT",
    LIGHT: "LIGHT",
    DARK: "DARK",
    WATER: "WATER",
    FIRE: "FIRE",
    EARTH: "EARTH",
    WIND: "WIND"
} as const;
export type Element = (typeof Element)[keyof typeof Element];
export const MonsterType = {
    COMMON_MOBS: "COMMON_MOBS",
    COMMON_MINI_BOSS: "COMMON_MINI_BOSS",
    COMMON_BOSS: "COMMON_BOSS",
    EVENT_MOBS: "EVENT_MOBS",
    EVENT_MINI_BOSS: "EVENT_MINI_BOSS",
    EVENT_BOSS: "EVENT_BOSS"
} as const;
export type MonsterType = (typeof MonsterType)[keyof typeof MonsterType];
export const ModifiersName = {
    STR: "STR",
    INT: "INT",
    VIT: "VIT",
    AGI: "AGI",
    DEX: "DEX",
    MAX_MP: "MAX_MP",
    AGGRO: "AGGRO",
    WEAPON_RANGE: "WEAPON_RANGE",
    HP_REGEN: "HP_REGEN",
    MP_REGEN: "MP_REGEN",
    PHYSICAL_ATK: "PHYSICAL_ATK",
    MAGICAL_ATK: "MAGICAL_ATK",
    WEAPON_ATK: "WEAPON_ATK",
    UNSHEATHE_ATK: "UNSHEATHE_ATK",
    PHYSICAL_PIERCE: "PHYSICAL_PIERCE",
    MAGICAL_PIERCE: "MAGICAL_PIERCE",
    CRITICAL_RATE: "CRITICAL_RATE",
    CRITICAL_DAMAGE: "CRITICAL_DAMAGE",
    MAGIC_CRT_CONVERSION_RATE: "MAGIC_CRT_CONVERSION_RATE",
    MAGIC_CRT_DAMAGE_CONVERSION_RATE: "MAGIC_CRT_DAMAGE_CONVERSION_RATE",
    SHORT_RANGE_DAMAGE: "SHORT_RANGE_DAMAGE",
    LONG_RANGE_DAMAGE: "LONG_RANGE_DAMAGE",
    STRONGER_AGAINST_NETURAL: "STRONGER_AGAINST_NETURAL",
    STRONGER_AGAINST_LIGHT: "STRONGER_AGAINST_LIGHT",
    STRONGER_AGAINST_DARK: "STRONGER_AGAINST_DARK",
    STRONGER_AGAINST_WATER: "STRONGER_AGAINST_WATER",
    STRONGER_AGAINST_FIRE: "STRONGER_AGAINST_FIRE",
    STRONGER_AGAINST_EARTH: "STRONGER_AGAINST_EARTH",
    STRONGER_AGAINST_WIND: "STRONGER_AGAINST_WIND",
    STABILITY: "STABILITY",
    ACCURACY: "ACCURACY",
    ADDITIONAL_PHYSICS: "ADDITIONAL_PHYSICS",
    ADDITIONAL_MAGIC: "ADDITIONAL_MAGIC",
    ANTICIPATE: "ANTICIPATE",
    GUARD_BREAK: "GUARD_BREAK",
    REFLECT: "REFLECT",
    ABSOLUTA_ACCURACY: "ABSOLUTA_ACCURACY",
    ATK_UP_STR: "ATK_UP_STR",
    ATK_UP_INT: "ATK_UP_INT",
    ATK_UP_VIT: "ATK_UP_VIT",
    ATK_UP_AGI: "ATK_UP_AGI",
    ATK_UP_DEX: "ATK_UP_DEX",
    MATK_UP_STR: "MATK_UP_STR",
    MATK_UP_INT: "MATK_UP_INT",
    MATK_UP_VIT: "MATK_UP_VIT",
    MATK_UP_AGI: "MATK_UP_AGI",
    MATK_UP_DEX: "MATK_UP_DEX",
    ATK_DOWN_STR: "ATK_DOWN_STR",
    ATK_DOWN_INT: "ATK_DOWN_INT",
    ATK_DOWN_VIT: "ATK_DOWN_VIT",
    ATK_DOWN_AGI: "ATK_DOWN_AGI",
    ATK_DOWN_DEX: "ATK_DOWN_DEX",
    MATK_DOWN_STR: "MATK_DOWN_STR",
    MATK_DOWN_INT: "MATK_DOWN_INT",
    MATK_DOWN_VIT: "MATK_DOWN_VIT",
    MATK_DOWN_AGI: "MATK_DOWN_AGI",
    MATK_DOWN_DEX: "MATK_DOWN_DEX",
    MAX_HP: "MAX_HP",
    PHYSICAL_DEF: "PHYSICAL_DEF",
    MAGICAL_DEF: "MAGICAL_DEF",
    PHYSICAL_RESISTANCE: "PHYSICAL_RESISTANCE",
    MAGICAL_RESISTANCE: "MAGICAL_RESISTANCE",
    NEUTRAL_RESISTANCE: "NEUTRAL_RESISTANCE",
    LIGHT_RESISTANCE: "LIGHT_RESISTANCE",
    DARK_RESISTANCE: "DARK_RESISTANCE",
    WATER_RESISTANCE: "WATER_RESISTANCE",
    FIRE_RESISTANCE: "FIRE_RESISTANCE",
    EARTH_RESISTANCE: "EARTH_RESISTANCE",
    WIND_RESISTANCE: "WIND_RESISTANCE",
    DODGE: "DODGE",
    AILMENT_RESISTANCE: "AILMENT_RESISTANCE",
    BASE_GUARD_POWER: "BASE_GUARD_POWER",
    GUARD_POWER: "GUARD_POWER",
    BASE_GUARD_RECHARGE: "BASE_GUARD_RECHARGE",
    GUARD_RECHANGE: "GUARD_RECHANGE",
    EVASION_RECHARGE: "EVASION_RECHARGE",
    PHYSICAL_BARRIER: "PHYSICAL_BARRIER",
    MAGICAL_BARRIER: "MAGICAL_BARRIER",
    FRACTIONAL_BARRIER: "FRACTIONAL_BARRIER",
    BARRIER_COOLDOWN: "BARRIER_COOLDOWN",
    REDUCE_DMG_FLOOR: "REDUCE_DMG_FLOOR",
    REDUCE_DMG_METEOR: "REDUCE_DMG_METEOR",
    REDUCE_DMG_PLAYER_EPICENTER: "REDUCE_DMG_PLAYER_EPICENTER",
    REDUCE_DMG_FOE_EPICENTER: "REDUCE_DMG_FOE_EPICENTER",
    REDUCE_DMG_BOWLING: "REDUCE_DMG_BOWLING",
    REDUCE_DMG_BULLET: "REDUCE_DMG_BULLET",
    REDUCE_DMG_STRAIGHT_LINE: "REDUCE_DMG_STRAIGHT_LINE",
    REDUCE_DMG_CHARGE: "REDUCE_DMG_CHARGE",
    ABSOLUTE_DODGE: "ABSOLUTE_DODGE",
    ASPD: "ASPD",
    CSPD: "CSPD",
    MSPD: "MSPD",
    DROP_RATE: "DROP_RATE",
    REVIVE_TIME: "REVIVE_TIME",
    FLINCH_UNAVAILABLE: "FLINCH_UNAVAILABLE",
    TUMBLE_UNAVAILABLE: "TUMBLE_UNAVAILABLE",
    STUN_UNAVAILABLE: "STUN_UNAVAILABLE",
    INVINCIBLE_AID: "INVINCIBLE_AID",
    EXP_RATE: "EXP_RATE",
    PET_EXP: "PET_EXP",
    ITEM_COOLDOWN: "ITEM_COOLDOWN",
    RECOIL_DAMAGE: "RECOIL_DAMAGE",
    GEM_POWDER_DROP: "GEM_POWDER_DROP"
} as const;
export type ModifiersName = (typeof ModifiersName)[keyof typeof ModifiersName];
export const SpecialAbiType = {
    NULL: "NULL",
    LUK: "LUK",
    CRI: "CRI",
    TEC: "TEC",
    MEN: "MEN"
} as const;
export type SpecialAbiType = (typeof SpecialAbiType)[keyof typeof SpecialAbiType];
export const CrystalType = {
    GENERAL: "GENERAL",
    WEAPONCRYSTAL: "WEAPONCRYSTAL",
    BODYCRYSTAL: "BODYCRYSTAL",
    ADDITIONALCRYSTAL: "ADDITIONALCRYSTAL",
    SPECIALCRYSTAL: "SPECIALCRYSTAL"
} as const;
export type CrystalType = (typeof CrystalType)[keyof typeof CrystalType];
export const MainWeaponType = {
    NO_WEAPON: "NO_WEAPON",
    ONE_HAND_SWORD: "ONE_HAND_SWORD",
    TWO_HANDS_SWORD: "TWO_HANDS_SWORD",
    BOW: "BOW",
    BOWGUN: "BOWGUN",
    STAFF: "STAFF",
    MAGIC_DEVICE: "MAGIC_DEVICE",
    KNUCKLE: "KNUCKLE",
    HALBERD: "HALBERD",
    KATANA: "KATANA"
} as const;
export type MainWeaponType = (typeof MainWeaponType)[keyof typeof MainWeaponType];
export const SubWeaponType = {
    NO_WEAPON: "NO_WEAPON",
    ONE_HAND_SWORD: "ONE_HAND_SWORD",
    MAGIC_DEVICE: "MAGIC_DEVICE",
    KNUCKLE: "KNUCKLE",
    KATANA: "KATANA",
    ARROW: "ARROW",
    DAGGER: "DAGGER",
    NINJUTSUSCROLL: "NINJUTSUSCROLL",
    SHIELD: "SHIELD"
} as const;
export type SubWeaponType = (typeof SubWeaponType)[keyof typeof SubWeaponType];
export const BodyArmorType = {
    NORMAL: "NORMAL",
    LIGHT: "LIGHT",
    HEAVY: "HEAVY"
} as const;
export type BodyArmorType = (typeof BodyArmorType)[keyof typeof BodyArmorType];
export const SkillTreeName = {
    BLADE: "BLADE",
    SHOT: "SHOT",
    MAGIC: "MAGIC",
    MARTIAL: "MARTIAL",
    DUALSWORD: "DUALSWORD",
    HALBERD: "HALBERD",
    MONONOFU: "MONONOFU",
    CRUSHER: "CRUSHER",
    SPRITE: "SPRITE"
} as const;
export type SkillTreeName = (typeof SkillTreeName)[keyof typeof SkillTreeName];
export const SkillType = {
    ACTIVE_SKILL: "ACTIVE_SKILL",
    PASSIVE_SKILL: "PASSIVE_SKILL"
} as const;
export type SkillType = (typeof SkillType)[keyof typeof SkillType];
export const SkillExtraActionType = {
    None: "None",
    Chanting: "Chanting",
    Charging: "Charging"
} as const;
export type SkillExtraActionType = (typeof SkillExtraActionType)[keyof typeof SkillExtraActionType];
export const YieldType = {
    PersistentEffect: "PersistentEffect",
    ImmediateEffect: "ImmediateEffect"
} as const;
export type YieldType = (typeof YieldType)[keyof typeof YieldType];
export const DurationType = {
    FRAME: "FRAME",
    SKILL: "SKILL",
    UNLIMITED: "UNLIMITED"
} as const;
export type DurationType = (typeof DurationType)[keyof typeof DurationType];
export const WeaponElementDependencyType = {
    EXTEND: "EXTEND",
    UNEXTEND: "UNEXTEND"
} as const;
export type WeaponElementDependencyType = (typeof WeaponElementDependencyType)[keyof typeof WeaponElementDependencyType];
export const ComboType = {
    NULL: "NULL"
} as const;
export type ComboType = (typeof ComboType)[keyof typeof ComboType];
export const CharacterType = {
    Tank: "Tank",
    Mage: "Mage",
    Ranger: "Ranger",
    Marksman: "Marksman"
} as const;
export type CharacterType = (typeof CharacterType)[keyof typeof CharacterType];
