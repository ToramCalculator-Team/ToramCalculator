export const account_type = {
    Admin: "Admin",
    User: "User"
} as const;
export type account_type = (typeof account_type)[keyof typeof account_type];
export const address_type = {
    Normal: "Normal",
    Limited: "Limited"
} as const;
export type address_type = (typeof address_type)[keyof typeof address_type];
export const mob_type = {
    Mob: "Mob",
    MiniBoss: "MiniBoss",
    Boss: "Boss"
} as const;
export type mob_type = (typeof mob_type)[keyof typeof mob_type];
export const mob_initialElement = {
    Normal: "Normal",
    Light: "Light",
    Dark: "Dark",
    Water: "Water",
    Fire: "Fire",
    Earth: "Earth",
    Wind: "Wind"
} as const;
export type mob_initialElement = (typeof mob_initialElement)[keyof typeof mob_initialElement];
export const item_tableType = {
    weapon: "weapon",
    armor: "armor",
    option: "option",
    special: "special",
    crystal: "crystal",
    consumable: "consumable",
    material: "material"
} as const;
export type item_tableType = (typeof item_tableType)[keyof typeof item_tableType];
export const material_type = {
    Metal: "Metal",
    Cloth: "Cloth",
    Beast: "Beast",
    Wood: "Wood",
    Drug: "Drug",
    Magic: "Magic"
} as const;
export type material_type = (typeof material_type)[keyof typeof material_type];
export const consumable_type = {
    MaxHp: "MaxHp",
    MaxMp: "MaxMp",
    pAtk: "pAtk",
    mAtk: "mAtk",
    Aspd: "Aspd",
    Cspd: "Cspd",
    Hit: "Hit",
    Flee: "Flee",
    EleStro: "EleStro",
    EleRes: "EleRes",
    pRes: "pRes",
    mRes: "mRes"
} as const;
export type consumable_type = (typeof consumable_type)[keyof typeof consumable_type];
export const crystal_type = {
    NormalCrystal: "NormalCrystal",
    WeaponCrystal: "WeaponCrystal",
    ArmorCrystal: "ArmorCrystal",
    OptEquipCrystal: "OptEquipCrystal",
    SpecialCrystal: "SpecialCrystal"
} as const;
export type crystal_type = (typeof crystal_type)[keyof typeof crystal_type];
export const weapon_type = {
    OneHandSword: "OneHandSword",
    TwoHandSword: "TwoHandSword",
    Bow: "Bow",
    Bowgun: "Bowgun",
    Rod: "Rod",
    Magictool: "Magictool",
    Knuckle: "Knuckle",
    Halberd: "Halberd",
    Katana: "Katana",
    Arrow: "Arrow",
    ShortSword: "ShortSword",
    NinjutsuScroll: "NinjutsuScroll",
    Shield: "Shield"
} as const;
export type weapon_type = (typeof weapon_type)[keyof typeof weapon_type];
export const weapon_elementType = {
    Normal: "Normal",
    Light: "Light",
    Dark: "Dark",
    Water: "Water",
    Fire: "Fire",
    Earth: "Earth",
    Wind: "Wind"
} as const;
export type weapon_elementType = (typeof weapon_elementType)[keyof typeof weapon_elementType];
export const recipe_ingredient_type = {
    gold: "gold",
    item: "item"
} as const;
export type recipe_ingredient_type = (typeof recipe_ingredient_type)[keyof typeof recipe_ingredient_type];
export const drop_item_relatedPartType = {
    A: "A",
    B: "B",
    C: "C"
} as const;
export type drop_item_relatedPartType = (typeof drop_item_relatedPartType)[keyof typeof drop_item_relatedPartType];
export const task_type = {
    Collect: "Collect",
    Defeat: "Defeat",
    Both: "Both",
    Other: "Other"
} as const;
export type task_type = (typeof task_type)[keyof typeof task_type];
export const reward_type = {
    Exp: "Exp",
    Money: "Money",
    Item: "Item"
} as const;
export type reward_type = (typeof reward_type)[keyof typeof reward_type];
export const skill_treeType = {
    BladeSkill: "BladeSkill",
    ShootSkill: "ShootSkill",
    MagicSkill: "MagicSkill",
    MarshallSkill: "MarshallSkill",
    DualSwordSkill: "DualSwordSkill",
    HalberdSkill: "HalberdSkill",
    MononofuSkill: "MononofuSkill",
    CrusherSkill: "CrusherSkill",
    FeatheringSkill: "FeatheringSkill",
    GuardSkill: "GuardSkill",
    ShieldSkill: "ShieldSkill",
    KnifeSkill: "KnifeSkill",
    KnightSkill: "KnightSkill",
    HunterSkill: "HunterSkill",
    PriestSkill: "PriestSkill",
    AssassinSkill: "AssassinSkill",
    WizardSkill: "WizardSkill",
    SupportSkill: "SupportSkill",
    BattleSkill: "BattleSkill",
    SurvivalSkill: "SurvivalSkill",
    SmithSkill: "SmithSkill",
    AlchemySkill: "AlchemySkill",
    TamerSkill: "TamerSkill",
    DarkPowerSkill: "DarkPowerSkill",
    MagicBladeSkill: "MagicBladeSkill",
    DancerSkill: "DancerSkill",
    MinstrelSkill: "MinstrelSkill",
    BareHandSkill: "BareHandSkill",
    NinjaSkill: "NinjaSkill",
    PartisanSkill: "PartisanSkill",
    LuckSkill: "LuckSkill",
    MerchantSkill: "MerchantSkill",
    PetSkill: "PetSkill"
} as const;
export type skill_treeType = (typeof skill_treeType)[keyof typeof skill_treeType];
export const skill_chargingType = {
    Chanting: "Chanting",
    Reservoir: "Reservoir"
} as const;
export type skill_chargingType = (typeof skill_chargingType)[keyof typeof skill_chargingType];
export const skill_distanceType = {
    None: "None",
    Long: "Long",
    Short: "Short",
    Both: "Both"
} as const;
export type skill_distanceType = (typeof skill_distanceType)[keyof typeof skill_distanceType];
export const skill_targetType = {
    None: "None",
    Self: "Self",
    Player: "Player",
    Enemy: "Enemy"
} as const;
export type skill_targetType = (typeof skill_targetType)[keyof typeof skill_targetType];
export const player_armor_ability = {
    Normal: "Normal",
    Light: "Light",
    Heavy: "Heavy"
} as const;
export type player_armor_ability = (typeof player_armor_ability)[keyof typeof player_armor_ability];
export const player_pet_weaponType = {
    OneHandSword: "OneHandSword",
    TwoHandSword: "TwoHandSword",
    Bow: "Bow",
    Bowgun: "Bowgun",
    Rod: "Rod",
    Magictool: "Magictool",
    Knuckle: "Knuckle",
    Halberd: "Halberd",
    Katana: "Katana"
} as const;
export type player_pet_weaponType = (typeof player_pet_weaponType)[keyof typeof player_pet_weaponType];
export const player_pet_personaType = {
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
export type player_pet_personaType = (typeof player_pet_personaType)[keyof typeof player_pet_personaType];
export const player_pet_type = {
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
export type player_pet_type = (typeof player_pet_type)[keyof typeof player_pet_type];
export const avatar_type = {
    Decoration: "Decoration",
    Top: "Top",
    Bottom: "Bottom"
} as const;
export type avatar_type = (typeof avatar_type)[keyof typeof avatar_type];
export const character_personalityType = {
    None: "None",
    Luk: "Luk",
    Cri: "Cri",
    Tec: "Tec",
    Men: "Men"
} as const;
export type character_personalityType = (typeof character_personalityType)[keyof typeof character_personalityType];
export const character_partnerSkillAType = {
    Passive: "Passive",
    Active: "Active"
} as const;
export type character_partnerSkillAType = (typeof character_partnerSkillAType)[keyof typeof character_partnerSkillAType];
export const character_partnerSkillBType = {
    Passive: "Passive",
    Active: "Active"
} as const;
export type character_partnerSkillBType = (typeof character_partnerSkillBType)[keyof typeof character_partnerSkillBType];
export const combo_step_type = {
    None: "None",
    Start: "Start",
    Rengeki: "Rengeki",
    ThirdEye: "ThirdEye",
    Filling: "Filling",
    Quick: "Quick",
    HardHit: "HardHit",
    Tenacity: "Tenacity",
    Invincible: "Invincible",
    BloodSucking: "BloodSucking",
    Tough: "Tough",
    AMomentaryWalk: "AMomentaryWalk",
    Reflection: "Reflection",
    Illusion: "Illusion",
    Max: "Max"
} as const;
export type combo_step_type = (typeof combo_step_type)[keyof typeof combo_step_type];
export const mercenary_type = {
    Tank: "Tank",
    Dps: "Dps"
} as const;
export type mercenary_type = (typeof mercenary_type)[keyof typeof mercenary_type];
export const mercenary_skillAType = {
    Passive: "Passive",
    Active: "Active"
} as const;
export type mercenary_skillAType = (typeof mercenary_skillAType)[keyof typeof mercenary_skillAType];
export const mercenary_skillBType = {
    Passive: "Passive",
    Active: "Active"
} as const;
export type mercenary_skillBType = (typeof mercenary_skillBType)[keyof typeof mercenary_skillBType];
export const member_mobDifficultyFlag = {
    Easy: "Easy",
    Normal: "Normal",
    Hard: "Hard",
    Lunatic: "Lunatic",
    Ultimate: "Ultimate"
} as const;
export type member_mobDifficultyFlag = (typeof member_mobDifficultyFlag)[keyof typeof member_mobDifficultyFlag];
