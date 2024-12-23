export const UserRole = {
    USER: "USER",
    ADMIN: "ADMIN"
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
export const Element = {
    Normal: "Normal",
    Light: "Light",
    Dark: "Dark",
    Water: "Water",
    Fire: "Fire",
    Earth: "Earth",
    Wind: "Wind"
} as const;
export type Element = (typeof Element)[keyof typeof Element];
export const MobType = {
    Mob: "Mob",
    MiniBoss: "MiniBoss",
    Boss: "Boss"
} as const;
export type MobType = (typeof MobType)[keyof typeof MobType];
export const SpecialAbiType = {
    None: "None",
    Luk: "Luk",
    Cri: "Cri",
    Tec: "Tec",
    Men: "Men"
} as const;
export type SpecialAbiType = (typeof SpecialAbiType)[keyof typeof SpecialAbiType];
export const ArmorType = {
    Normal: "Normal",
    Light: "Light",
    Heavy: "Heavy"
} as const;
export type ArmorType = (typeof ArmorType)[keyof typeof ArmorType];
export const SkillTargetType = {
    None: "None",
    Self: "Self",
    Player: "Player",
    Enemy: "Enemy"
} as const;
export type SkillTargetType = (typeof SkillTargetType)[keyof typeof SkillTargetType];
export const SkillChargingType = {
    None: "None",
    Chanting: "Chanting",
    Reservoir: "Reservoir"
} as const;
export type SkillChargingType = (typeof SkillChargingType)[keyof typeof SkillChargingType];
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
export const MobDifficultyFlag = {
    Easy: "Easy",
    Normal: "Normal",
    Hard: "Hard",
    Lunatic: "Lunatic",
    Ultimate: "Ultimate"
} as const;
export type MobDifficultyFlag = (typeof MobDifficultyFlag)[keyof typeof MobDifficultyFlag];
export const MobDamageType = {
    Physics: "Physics",
    Magic: "Magic",
    CurrentRate: "CurrentRate",
    MaxRate: "MaxRate"
} as const;
export type MobDamageType = (typeof MobDamageType)[keyof typeof MobDamageType];
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
export const AddressType = {
    Normal: "Normal",
    Limited: "Limited"
} as const;
export type AddressType = (typeof AddressType)[keyof typeof AddressType];
export const MaterialType = {
    Metal: "Metal",
    Cloth: "Cloth",
    Beast: "Beast",
    Wood: "Wood",
    Drug: "Drug",
    Magic: "Magic"
} as const;
export type MaterialType = (typeof MaterialType)[keyof typeof MaterialType];
export const PartBreakReward = {
    None: "None",
    CanDrop: "CanDrop",
    DropUp: "DropUp"
} as const;
export type PartBreakReward = (typeof PartBreakReward)[keyof typeof PartBreakReward];
export const MobPart = {
    A: "A",
    B: "B",
    C: "C"
} as const;
export type MobPart = (typeof MobPart)[keyof typeof MobPart];
export const AvailabilityType = {
    permanent: "permanent",
    event: "event"
} as const;
export type AvailabilityType = (typeof AvailabilityType)[keyof typeof AvailabilityType];
export const AcquisitionMethodType = {
    Drop: "Drop",
    Craft: "Craft"
} as const;
export type AcquisitionMethodType = (typeof AcquisitionMethodType)[keyof typeof AcquisitionMethodType];
export const SkillDistanceResistType = {
    None: "None",
    Long: "Long",
    Short: "Short",
    Both: "Both"
} as const;
export type SkillDistanceResistType = (typeof SkillDistanceResistType)[keyof typeof SkillDistanceResistType];
export const Persona = {
    Fervent: "Fervent",
    Intelligent: "Intelligent",
    Mild: "Mild",
    Swift: "Swift",
    Justice: "Justice",
    Devoted: "Devoted",
    Impulsive: "Impulsive",
    Calm: "Calm",
    Sly: "Sly",
    Timid: "Timid",
    Brave: "Brave",
    Active: "Active",
    Sturdy: "Sturdy",
    Steady: "Steady",
    Max: "Max"
} as const;
export type Persona = (typeof Persona)[keyof typeof Persona];
export const PetType = {
    AllTrades: "AllTrades",
    PhysicalAttack: "PhysicalAttack",
    MagicAttack: "MagicAttack",
    PhysicalDefense: "PhysicalDefense",
    MagicDefensem: "MagicDefensem",
    Avoidance: "Avoidance",
    Hit: "Hit",
    SkillsEnhancement: "SkillsEnhancement",
    Genius: "Genius"
} as const;
export type PetType = (typeof PetType)[keyof typeof PetType];
export const MercenaryType = {
    Tank: "Tank",
    Dps: "Dps"
} as const;
export type MercenaryType = (typeof MercenaryType)[keyof typeof MercenaryType];
export const MercenarySkillType = {
    Active: "Active",
    Passive: "Passive"
} as const;
export type MercenarySkillType = (typeof MercenarySkillType)[keyof typeof MercenarySkillType];
export const Visibility = {
    Public: "Public",
    Private: "Private"
} as const;
export type Visibility = (typeof Visibility)[keyof typeof Visibility];
