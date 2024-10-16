import type { ColumnType } from "kysely";
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

import type { UserRole, Element, MonsterType, ModifiersName, SpecialAbiType, CrystalType, MainWeaponType, SubWeaponType, BodyArmorType, SkillTreeName, SkillType, SkillExtraActionType, YieldType, DurationType, ComboType, CharacterType } from "./enums";

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
    userId: string;
};
export type additional_equipment = {
    id: string;
    name: string;
    refinement: number;
    modifiersListId: string;
    extraDetails: string;
    dataSources: string;
    updatedAt: Timestamp;
    createdAt: Timestamp;
    updatedByUserId: string | null;
    createdByUserId: string | null;
    statisticsId: string;
};
export type additional_equipmentTocrystal = {
    A: string;
    B: string;
};
export type analyzer = {
    id: string;
    name: string;
    extraDetails: string | null;
    updatedAt: Timestamp;
    createdAt: Timestamp;
    updatedByUserId: string | null;
    createdByUserId: string | null;
    statisticsId: string;
};
export type analyzerTomember = {
    A: string;
    B: string;
};
export type analyzerTomob = {
    A: string;
    B: string;
};
export type body_armor = {
    id: string;
    name: string;
    bodyArmorType: BodyArmorType;
    refinement: number;
    baseDef: number;
    modifiersListId: string;
    extraDetails: string;
    dataSources: string;
    updatedAt: Timestamp;
    createdAt: Timestamp;
    updatedByUserId: string | null;
    createdByUserId: string | null;
    statisticsId: string;
};
export type body_armorTocrystal = {
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
    mainWeaponId: string;
    subWeaponId: string;
    bodyArmorId: string;
    additionalEquipmentId: string;
    specialEquipmentId: string;
    fashionModifiersListId: string;
    CuisineModifiersListId: string;
    petId: string;
    modifiersListId: string;
    extraDetails: string;
    updatedAt: Timestamp;
    createdAt: Timestamp;
    updatedByUserId: string | null;
    createdByUserId: string | null;
    statisticsId: string;
    imageId: string;
};
export type characterTocombo = {
    A: string;
    B: string;
};
export type characterToconsumable = {
    A: string;
    B: string;
};
export type characterToskill = {
    A: string;
    B: string;
};
export type combo = {
    id: string;
    name: string;
    userCreateUserId: string | null;
};
export type combo_step = {
    id: string;
    order: number;
    comboType: ComboType;
    skillId: string;
    comboId: string;
};
export type consumable = {
    id: string;
    name: string;
    modifiersListId: string;
    extraDetails: string;
    dataSources: string;
    updatedAt: Timestamp;
    createdAt: Timestamp;
    updatedByUserId: string | null;
    createdByUserId: string | null;
    statisticsId: string;
};
export type crystal = {
    id: string;
    name: string;
    crystalType: CrystalType;
    front: number;
    modifiersListId: string;
    extraDetails: string | null;
    dataSources: string | null;
    updatedAt: Timestamp;
    createdAt: Timestamp;
    updatedByUserId: string | null;
    createdByUserId: string | null;
    statisticsId: string;
};
export type crystalTomain_weapon = {
    A: string;
    B: string;
};
export type crystalTospecial_equipment = {
    A: string;
    B: string;
};
export type image = {
    id: string;
    dataUrl: string;
    main_weaponId: string | null;
    sub_weaponId: string | null;
    body_armorId: string | null;
    additional_equipmentId: string | null;
    special_equipmentId: string | null;
};
export type main_weapon = {
    id: string;
    name: string;
    mainWeaponType: MainWeaponType;
    baseAtk: number;
    refinement: number;
    stability: number;
    element: Element;
    modifiersListId: string;
    extraDetails: string;
    dataSources: string;
    updatedAt: Timestamp;
    createdAt: Timestamp;
    updatedByUserId: string | null;
    createdByUserId: string | null;
    statisticsId: string;
};
export type member = {
    id: string;
    characterId: string;
    flow: unknown;
};
export type mob = {
    id: string;
    monsterId: string;
    star: number;
    flow: string;
};
export type modifier = {
    id: string;
    formula: string;
    belongToModifiersListId: string;
};
export type modifiers_list = {
    id: string;
    name: string;
};
export type monster = {
    id: string;
    /**
     * @zod.string.min(2, { message: "最少2个字符" })
     */
    name: string;
    monsterType: MonsterType;
    baseLv: number;
    experience: number;
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
    difficultyOfTank: number;
    difficultyOfMelee: number;
    difficultyOfRanged: number;
    possibilityOfRunningAround: number;
    extraDetails: string;
    dataSources: string;
    updatedAt: Timestamp;
    createdAt: Timestamp;
    updatedByUserId: string | null;
    createdByUserId: string | null;
    statisticsId: string;
    imageId: string;
};
export type pet = {
    id: string;
    name: string;
    extraDetails: string;
    dataSources: string;
    updatedAt: Timestamp;
    createdAt: Timestamp;
    updatedByUserId: string | null;
    createdByUserId: string | null;
    statisticsId: string;
};
export type post = {
    id: string;
    name: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdById: string;
};
export type process = {
    id: string;
};
export type rate = {
    id: string;
    rate: number;
    userId: string;
    statisticsId: string;
};
export type session = {
    id: string;
    sessionToken: string;
    expires: Timestamp;
    userId: string;
};
export type skill = {
    id: string;
    skillTreeName: SkillTreeName;
    name: string;
    skillType: SkillType;
    weaponElementDependencyType: boolean;
    element: Element;
    skillDescription: string | null;
    extraDetails: string;
    dataSources: string;
    updatedAt: Timestamp;
    createdAt: Timestamp;
    updatedByUserId: string | null;
    createdByUserId: string | null;
    statisticsId: string;
};
export type skill_cost = {
    id: string;
    name: string | null;
    costFormula: string;
    skillEffectId: string | null;
};
export type skill_effect = {
    id: string;
    condition: string;
    description: string;
    actionBaseDurationFormula: string;
    actionModifiableDurationFormula: string;
    skillExtraActionType: SkillExtraActionType;
    chantingBaseDurationFormula: string;
    chantingModifiableDurationFormula: string;
    chargingBaseDurationFormula: string;
    chargingModifiableDurationFormula: string;
    skillStartupFramesFormula: string;
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
    id: string;
    name: string;
    modifiersListId: string;
    extraDetails: string;
    dataSources: string;
    updatedAt: Timestamp;
    createdAt: Timestamp;
    updatedByUserId: string | null;
    createdByUserId: string | null;
    statisticsId: string;
};
export type statistics = {
    id: string;
    monsterId: string | null;
    crystalId: string | null;
    mainWeaponId: string | null;
    subWeaponId: string | null;
    bodyArmorId: string | null;
    additionalEquipmentId: string | null;
    specialEquipmentId: string | null;
    skillId: string | null;
    petId: string | null;
    consumableId: string | null;
    characterId: string | null;
    analyzerId: string | null;
};
export type step = {
    id: string;
    order: number;
    skillId: string;
    processId: string;
};
export type sub_weapon = {
    id: string;
    name: string;
    subWeaponType: SubWeaponType;
    baseAtk: number;
    refinement: number;
    stability: number;
    element: Element;
    modifiersListId: string;
    extraDetails: string;
    dataSources: string;
    updatedAt: Timestamp;
    createdAt: Timestamp;
    updatedByUserId: string | null;
    createdByUserId: string | null;
    statisticsId: string;
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
export type user_create_data = {
    userId: string;
};
export type user_update_data = {
    userId: string;
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
export type DB = {
    _additional_equipmentTocrystal: additional_equipmentTocrystal;
    _analyzerTomember: analyzerTomember;
    _analyzerTomob: analyzerTomob;
    _body_armorTocrystal: body_armorTocrystal;
    _characterTocombo: characterTocombo;
    _characterToconsumable: characterToconsumable;
    _characterToskill: characterToskill;
    _crystalTomain_weapon: crystalTomain_weapon;
    _crystalTospecial_equipment: crystalTospecial_equipment;
    account: account;
    additional_equipment: additional_equipment;
    analyzer: analyzer;
    body_armor: body_armor;
    character: character;
    combo: combo;
    combo_step: combo_step;
    consumable: consumable;
    crystal: crystal;
    image: image;
    main_weapon: main_weapon;
    member: member;
    mob: mob;
    modifier: modifier;
    modifiers_list: modifiers_list;
    monster: monster;
    pet: pet;
    post: post;
    process: process;
    rate: rate;
    session: session;
    skill: skill;
    skill_cost: skill_cost;
    skill_effect: skill_effect;
    skill_yield: skill_yield;
    special_equipment: special_equipment;
    statistics: statistics;
    step: step;
    sub_weapon: sub_weapon;
    usage_timestamp: usage_timestamp;
    user: user;
    user_create_data: user_create_data;
    user_update_data: user_update_data;
    verification_token: verification_token;
    view_timestamp: view_timestamp;
};
