import type { ColumnType } from "kysely";
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

import type { UserRole, Element, MobType, SpecialAbiType, ArmorType, SkillType, SkillTargetType, SkillChargingType, YieldType, DurationType, MobDifficultyFlag, MobDamageType, ComboType, CharacterType, AddressType, MaterialType, PartBreakReward, MobPart, AvailabilityType, AcquisitionMethodType, SkillDistanceResistType, Persona, PetType, MercenaryType, MercenarySkillType } from "./enums";

export type account = {
    id: string;
    type: string;
    provider: string;
    providerAccountId: string;
    refresh_token: string | null;
    access_token: string | null;
    expires_at: number | null;
    token_type: string | null;
    scope: string | null;
    id_token: string | null;
    session_state: string | null;
    accountId: string;
};
export type account_create_data = {
    accountId: string;
};
export type account_update_data = {
    accountId: string;
};
export type additional_equipment = {
    name: string;
    baseDef: number;
    availability: AvailabilityType;
    acquisitionMethod: AcquisitionMethodType;
    modifiers: string[];
    colorA: number;
    colorB: number;
    colorC: number;
    itemId: string;
};
export type additional_equipmentTocrystal = {
    A: string;
    B: string;
};
export type address = {
    id: string;
    name: string;
    type: AddressType;
    x: number;
    y: number;
    worldId: string;
};
export type armor = {
    name: string;
    baseDef: number;
    availability: AvailabilityType;
    acquisitionMethod: AcquisitionMethodType;
    modifiers: string[];
    colorA: number;
    colorB: number;
    colorC: number;
    itemId: string;
};
export type armor_enchantment_attributes = {
    id: string;
    name: string;
    flow: unknown;
    extraDetails: string | null;
    dataSources: string | null;
    updatedAt: Timestamp;
    createdAt: Timestamp;
    statisticsId: string;
    updatedByAccountId: string | null;
    createdByAccountId: string | null;
};
export type armorTocrystal = {
    A: string;
    B: string;
};
export type character = {
    id: string;
    name: string;
    characterType: CharacterType;
    lv: number;
    baseStr: number;
    baseInt: number;
    baseVit: number;
    baseAgi: number;
    baseDex: number;
    specialAbiType: SpecialAbiType;
    specialAbiValue: number;
    weaponId: string;
    subWeaponId: string;
    armorId: string;
    addEquipId: string;
    speEquipId: string;
    fashion: string[];
    cuisine: string[];
    ExtraAttrs: string[];
    masterId: string;
    extraDetails: string;
    updatedAt: Timestamp;
    createdAt: Timestamp;
    statisticsId: string;
    imageId: string;
};
export type character_skill = {
    id: string;
    lv: number;
    templateId: string;
};
export type characterTocharacter_skill = {
    A: string;
    B: string;
};
export type characterTocombo = {
    A: string;
    B: string;
};
export type characterToconsumable = {
    A: string;
    B: string;
};
export type combo = {
    id: string;
    name: string;
    combo: unknown;
};
export type consumable = {
    id: string;
    name: string;
    modifiers: string[];
};
export type crystal = {
    name: string;
    crystalType: string;
    modifiers: string[];
    itemId: string;
};
export type crystalTocustom_additional_equipment = {
    A: string;
    B: string;
};
export type crystalTocustom_armor = {
    A: string;
    B: string;
};
export type crystalTocustom_special_equipment = {
    A: string;
    B: string;
};
export type crystalTocustom_weapon = {
    A: string;
    B: string;
};
export type crystalTospecial_equipment = {
    A: string;
    B: string;
};
export type crystalToweapon = {
    A: string;
    B: string;
};
export type custom_additional_equipment = {
    id: string;
    name: string;
    def: number;
    templateId: string;
    refinement: number;
    masterId: string;
    updatedAt: Timestamp;
    createdAt: Timestamp;
    extraDetails: string;
};
export type custom_armor = {
    id: string;
    name: string;
    def: number;
    armorType: ArmorType;
    templateId: string;
    refinement: number;
    enchantmentAttributesId: string;
    masterId: string;
    updatedAt: Timestamp;
    createdAt: Timestamp;
    extraDetails: string;
};
export type custom_pet = {
    id: string;
    templateId: string;
    pStr: number;
    pInt: number;
    pVit: number;
    pAgi: number;
    pDex: number;
    str: number;
    int: number;
    vit: number;
    agi: number;
    dex: number;
    weaponType: string;
    persona: Persona;
    type: PetType;
    weaponAtk: number;
    masterId: string;
};
export type custom_special_equipment = {
    id: string;
    name: string;
    def: number;
    templateId: string;
    refinement: number;
    masterId: string;
    updatedAt: Timestamp;
    createdAt: Timestamp;
    extraDetails: string;
};
export type custom_weapon = {
    id: string;
    name: string;
    extraAbi: number;
    templateId: string;
    refinement: number;
    enchantmentAttributesId: string;
    masterId: string;
    updatedAt: Timestamp;
    createdAt: Timestamp;
    extraDetails: string;
};
export type drop_item = {
    id: string;
    itemId: string;
    probability: number;
    relatedPart: MobPart;
    relatedPartInfo: string;
    breakReward: PartBreakReward;
    dropById: string;
};
export type image = {
    id: string;
    dataUrl: string;
    npcId: string | null;
};
export type imageToitem = {
    A: string;
    B: string;
};
export type item = {
    id: string;
    name: string;
    dataSources: string;
    extraDetails: string;
    updatedAt: Timestamp;
    createdAt: Timestamp;
    statisticsId: string;
    updatedByAccountId: string | null;
    createdByAccountId: string | null;
};
export type material = {
    id: string;
    name: string;
    material: MaterialType;
    ptValue: number;
    price: number;
};
export type member = {
    id: string;
    flow: unknown;
    characterId: string;
    mobId: string;
    mobDifficultyFlag: MobDifficultyFlag;
};
export type memberTosimulator = {
    A: string;
    B: string;
};
export type mercenary = {
    id: string;
    type: MercenaryType;
    templateId: string;
    masterId: string;
    skillAId: string;
    skillAType: MercenarySkillType;
    skillBId: string;
    skillBType: MercenarySkillType;
};
export type mob = {
    id: string;
    /**
     * @zod.string.min(2, { message: "最少2个字符" })
     */
    name: string;
    mobType: MobType;
    baseLv: number;
    experience: number;
    partsExperience: number;
    address: string;
    element: Element;
    radius: number;
    maxhp: number;
    physicalDefense: number;
    physicalResistance: number;
    magicalDefense: number;
    magicalResistance: number;
    criticalResistance: number;
    avoidance: number;
    dodge: number;
    block: number;
    normalAttackResistanceModifier: number;
    physicalAttackResistanceModifier: number;
    magicalAttackResistanceModifier: number;
    flow: string;
    difficultyOfTank: number;
    difficultyOfMelee: number;
    difficultyOfRanged: number;
    possibilityOfRunningAround: number;
    extraDetails: string;
    dataSources: string;
    updatedAt: Timestamp;
    createdAt: Timestamp;
    statisticsId: string;
    imageId: string;
    updatedByAccountId: string | null;
    createdByAccountId: string | null;
};
export type mobTozone = {
    A: string;
    B: string;
};
export type npc = {
    id: string;
    name: string;
    zoneId: string;
};
export type pet = {
    id: string;
    name: string;
    maxLv: number;
    extraDetails: string;
    dataSources: string;
    updatedAt: Timestamp;
    createdAt: Timestamp;
    statisticsId: string;
    updatedByAccountId: string | null;
    createdByAccountId: string | null;
};
export type post = {
    id: string;
    name: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdById: string;
};
export type rate = {
    id: string;
    rate: number;
    accountId: string;
    statisticsId: string;
};
export type recipeIngredient = {
    id: string;
    type: string;
    count: number;
    itemId: string | null;
    belongToItemId: string;
};
export type reward = {
    id: string;
    type: string;
    value: number;
    probability: number;
    itemId: string | null;
    taskId: string;
};
export type session = {
    id: string;
    sessionToken: string;
    expires: Timestamp;
    accountId: string;
};
export type simulator = {
    id: string;
    name: string;
    extraDetails: string | null;
    updatedAt: Timestamp;
    createdAt: Timestamp;
    statisticsId: string;
    updatedByAccountId: string | null;
    createdByAccountId: string | null;
};
export type skill = {
    id: string;
    skillTreeName: string;
    posX: number;
    posY: number;
    tier: number;
    name: string;
    skillType: SkillType;
    weaponElementDependencyType: boolean;
    defaultElement: Element | null;
    chargingType: SkillChargingType;
    distanceResist: SkillDistanceResistType;
    skillDescription: string | null;
    extraDetails: string;
    dataSources: string;
    updatedAt: Timestamp;
    createdAt: Timestamp;
    statisticsId: string;
    updatedByAccountId: string | null;
    createdByAccountId: string | null;
};
export type skill_effect = {
    id: string;
    mainHand: string;
    subHand: string;
    armor: string;
    description: string;
    motionBaseDurationFormula: string;
    motionModifiableDurationFormula: string;
    chantingBaseDurationFormula: string;
    chantingModifiableDurationFormula: string;
    ReservoirBaseDurationFormula: string;
    ReservoirModifiableDurationFormula: string;
    skillStartupFramesFormula: string;
    costFormula: string;
    belongToskillId: string;
};
export type skill_yield = {
    id: string;
    name: string;
    yieldType: YieldType;
    yieldFormula: string;
    mutationTimingFormula: string | null;
    skillEffectId: string | null;
};
export type special_equipment = {
    name: string;
    baseDef: number;
    availability: AvailabilityType;
    acquisitionMethod: AcquisitionMethodType;
    modifiers: string[];
    itemId: string;
};
export type statistics = {
    id: string;
};
export type task = {
    id: string;
    lv: number;
    name: string;
    npcId: string;
};
export type usage_timestamp = {
    timestamp: Timestamp;
    statisticsId: string | null;
};
export type user = {
    id: string;
    name: string | null;
    email: string | null;
    emailVerified: Timestamp | null;
    image: string | null;
    userRole: UserRole;
};
export type verification_token = {
    identifier: string;
    token: string;
    expires: Timestamp;
};
export type view_timestamp = {
    timestamp: Timestamp;
    statisticsId: string | null;
};
export type weapon = {
    name: string;
    type: string;
    availability: AvailabilityType;
    acquisitionMethod: AcquisitionMethodType;
    baseAbi: number;
    stability: number;
    modifiers: string[];
    colorA: number;
    colorB: number;
    colorC: number;
    itemId: string;
};
export type weapon_enchantment_attributes = {
    id: string;
    name: string;
    flow: unknown;
    extraDetails: string | null;
    dataSources: string | null;
    updatedAt: Timestamp;
    createdAt: Timestamp;
    statisticsId: string;
    updatedByAccountId: string | null;
    createdByAccountId: string | null;
};
export type world = {
    id: string;
    name: string;
};
export type zone = {
    id: string;
    name: string | null;
    linkZone: string[];
    rewardNodes: number;
    addressId: string;
};
export type DB = {
    _additional_equipmentTocrystal: additional_equipmentTocrystal;
    _armorTocrystal: armorTocrystal;
    _characterTocharacter_skill: characterTocharacter_skill;
    _characterTocombo: characterTocombo;
    _characterToconsumable: characterToconsumable;
    _crystalTocustom_additional_equipment: crystalTocustom_additional_equipment;
    _crystalTocustom_armor: crystalTocustom_armor;
    _crystalTocustom_special_equipment: crystalTocustom_special_equipment;
    _crystalTocustom_weapon: crystalTocustom_weapon;
    _crystalTospecial_equipment: crystalTospecial_equipment;
    _crystalToweapon: crystalToweapon;
    _imageToitem: imageToitem;
    _memberTosimulator: memberTosimulator;
    _mobTozone: mobTozone;
    account: account;
    account_create_data: account_create_data;
    account_update_data: account_update_data;
    additional_equipment: additional_equipment;
    address: address;
    armor: armor;
    armor_enchantment_attributes: armor_enchantment_attributes;
    character: character;
    character_skill: character_skill;
    combo: combo;
    consumable: consumable;
    crystal: crystal;
    custom_additional_equipment: custom_additional_equipment;
    custom_armor: custom_armor;
    custom_pet: custom_pet;
    custom_special_equipment: custom_special_equipment;
    custom_weapon: custom_weapon;
    drop_item: drop_item;
    image: image;
    item: item;
    material: material;
    member: member;
    mercenary: mercenary;
    mob: mob;
    npc: npc;
    pet: pet;
    post: post;
    rate: rate;
    recipeIngredient: recipeIngredient;
    reward: reward;
    session: session;
    simulator: simulator;
    skill: skill;
    skill_effect: skill_effect;
    skill_yield: skill_yield;
    special_equipment: special_equipment;
    statistics: statistics;
    task: task;
    usage_timestamp: usage_timestamp;
    user: user;
    verification_token: verification_token;
    view_timestamp: view_timestamp;
    weapon: weapon;
    weapon_enchantment_attributes: weapon_enchantment_attributes;
    world: world;
    zone: zone;
};
