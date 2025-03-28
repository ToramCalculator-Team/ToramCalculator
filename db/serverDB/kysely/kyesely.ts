import type { ColumnType } from "kysely";
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

import type { account_type, address_type, mob_type, mob_initialElement, item_tableType, material_type, consumable_type, crystal_type, weapon_type, weapon_elementType, recipe_ingredient_type, drop_item_relatedPartType, task_type, reward_type, skill_treeType, skill_chargingType, skill_distanceType, skill_targetType, player_armor_ability, player_pet_weaponType, player_pet_personaType, player_pet_type, avatar_type, character_personalityType, character_partnerSkillAType, character_partnerSkillBType, combo_step_type, mercenary_type, mercenary_skillAType, mercenary_skillBType, member_mobDifficultyFlag } from "./enums";

export type account = {
    id: string;
    type: account_type;
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
export type account_create_data = {
    accountId: string;
};
export type account_update_data = {
    accountId: string;
};
export type activity = {
    id: string;
    name: string;
};
export type address = {
    id: string;
    name: string;
    type: address_type;
    posX: number;
    posY: number;
    worldId: string;
};
export type armor = {
    name: string;
    baseDef: number;
    modifiers: string[];
    colorA: number;
    colorB: number;
    colorC: number;
    dataSources: string;
    details: string | null;
    itemId: string;
};
export type armorTocrystal = {
    A: string;
    B: string;
};
export type avatar = {
    id: string;
    name: string;
    type: avatar_type;
    modifiers: string[];
    playerId: string;
};
export type avatarTocharacter = {
    A: string;
    B: string;
};
export type BackRelation = {
    A: string;
    B: string;
};
export type campA = {
    A: string;
    B: string;
};
export type campB = {
    A: string;
    B: string;
};
export type character = {
    id: string;
    name: string;
    lv: number;
    str: number;
    int: number;
    vit: number;
    agi: number;
    dex: number;
    personalityType: character_personalityType;
    personalityValue: number;
    weaponId: string;
    subWeaponId: string;
    armorId: string;
    optEquipId: string;
    speEquipId: string;
    cooking: string[];
    modifiers: string[];
    partnerSkillAId: string | null;
    partnerSkillAType: character_partnerSkillAType;
    partnerSkillBId: string | null;
    partnerSkillBType: character_partnerSkillBType;
    masterId: string;
    details: string | null;
    statisticId: string;
};
export type character_skill = {
    id: string;
    lv: number;
    isStarGem: boolean;
    templateId: string;
    characterId: string;
};
export type characterToconsumable = {
    A: string;
    B: string;
};
export type combo = {
    id: string;
    disable: boolean;
    name: string;
    characterId: string;
};
export type combo_step = {
    id: string;
    type: combo_step_type;
    characterSkillId: string;
    comboId: string;
};
export type consumable = {
    name: string;
    type: consumable_type;
    effectDuration: number;
    effects: string[];
    dataSources: string;
    details: string | null;
    itemId: string;
};
export type crystal = {
    name: string;
    type: crystal_type;
    modifiers: string[];
    dataSources: string;
    details: string | null;
    itemId: string;
};
export type crystalTooption = {
    A: string;
    B: string;
};
export type crystalToplayer_armor = {
    A: string;
    B: string;
};
export type crystalToplayer_option = {
    A: string;
    B: string;
};
export type crystalToplayer_special = {
    A: string;
    B: string;
};
export type crystalToplayer_weapon = {
    A: string;
    B: string;
};
export type crystalTospecial = {
    A: string;
    B: string;
};
export type crystalToweapon = {
    A: string;
    B: string;
};
export type drop_item = {
    id: string;
    itemId: string;
    probability: number;
    relatedPartType: drop_item_relatedPartType;
    relatedPartInfo: string;
    breakRewardType: string;
    dropById: string;
};
export type FrontRelation = {
    A: string;
    B: string;
};
export type image = {
    id: string;
    dataUrl: string;
    npcId: string | null;
    weaponId: string | null;
    armorId: string | null;
    optEquipId: string | null;
    mobId: string | null;
};
export type item = {
    id: string;
    tableType: item_tableType;
    statisticId: string;
    updatedByAccountId: string | null;
    createdByAccountId: string | null;
};
export type material = {
    name: string;
    type: material_type;
    ptValue: number;
    price: number;
    dataSources: string;
    details: string | null;
    itemId: string;
};
export type member = {
    id: string;
    name: string;
    order: number;
    playerId: string | null;
    partnerId: string | null;
    mercenaryId: string | null;
    mobId: string | null;
    mobDifficultyFlag: member_mobDifficultyFlag;
    teamId: string;
};
export type mercenary = {
    type: mercenary_type;
    templateId: string;
    skillAId: string;
    skillAType: mercenary_skillAType;
    skillBId: string;
    skillBType: mercenary_skillBType;
};
export type mob = {
    id: string;
    name: string;
    type: mob_type;
    captureable: boolean;
    baseLv: number;
    experience: number;
    partsExperience: number;
    initialElement: mob_initialElement;
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
    actions: unknown;
    details: string | null;
    dataSources: string;
    statisticId: string;
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
export type option = {
    name: string;
    baseDef: number;
    modifiers: string[];
    colorA: number;
    colorB: number;
    colorC: number;
    dataSources: string;
    details: string | null;
    itemId: string;
};
export type player = {
    id: string;
    name: string;
    useIn: string;
    actions: unknown;
    accountId: string;
};
export type player_armor = {
    id: string;
    name: string;
    def: number;
    ability: player_armor_ability;
    templateId: string | null;
    refinement: number;
    modifiers: string[];
    masterId: string;
};
export type player_option = {
    id: string;
    name: string;
    extraAbi: number;
    templateId: string;
    refinement: number;
    masterId: string;
};
export type player_pet = {
    id: string;
    templateId: string;
    name: string;
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
    weaponType: player_pet_weaponType;
    personaType: player_pet_personaType;
    type: player_pet_type;
    weaponAtk: number;
    generation: number;
    maxLv: number;
    masterId: string;
};
export type player_special = {
    id: string;
    name: string;
    extraAbi: number;
    templateId: string;
    masterId: string;
};
export type player_weapon = {
    id: string;
    name: string;
    baseAbi: number;
    stability: number;
    extraAbi: number;
    templateId: string | null;
    refinement: number;
    modifiers: string[];
    masterId: string;
};
export type post = {
    id: string;
    name: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    createdById: string;
};
export type recipe = {
    id: string;
    itemId: string;
    activityId: string | null;
};
export type recipe_ingredient = {
    id: string;
    count: number;
    type: recipe_ingredient_type;
    itemId: string | null;
    recipeId: string;
};
export type reward = {
    id: string;
    type: reward_type;
    value: number;
    probability: number;
    itemId: string | null;
    taskId: string;
};
export type session = {
    id: string;
    sessionToken: string;
    expires: Timestamp;
    userId: string;
};
export type simulator = {
    id: string;
    name: string;
    details: string | null;
    statisticId: string;
    updatedByAccountId: string | null;
    createdByAccountId: string | null;
};
export type skill = {
    id: string;
    treeType: skill_treeType;
    posX: number;
    posY: number;
    tier: number;
    name: string;
    isPassive: boolean;
    chargingType: skill_chargingType;
    distanceType: skill_distanceType;
    targetType: skill_targetType;
    details: string | null;
    dataSources: string;
    statisticId: string;
    updatedByAccountId: string | null;
    createdByAccountId: string | null;
};
export type skill_effect = {
    id: string;
    condition: string;
    elementLogic: string;
    castingRange: number;
    effectiveRange: number;
    motionFixed: string;
    motionModified: string;
    chantingFixed: string;
    chantingModified: string;
    reservoirFixed: string;
    reservoirModified: string;
    startupFrames: string;
    cost: string;
    description: string;
    logic: unknown;
    details: string | null;
    belongToskillId: string;
};
export type special = {
    name: string;
    baseDef: number;
    modifiers: string[];
    dataSources: string;
    details: string | null;
    itemId: string;
};
export type statistic = {
    id: string;
    updatedAt: Timestamp;
    createdAt: Timestamp;
    usageTimestamps: Timestamp[];
    viewTimestamps: Timestamp[];
};
export type task = {
    id: string;
    lv: number;
    name: string;
    type: task_type;
    description: string;
    npcId: string;
};
export type task_collect_require = {
    id: string;
    count: number;
    itemId: string;
    taskId: string;
};
export type task_kill_requirement = {
    id: string;
    mobId: string;
    count: number;
    taskId: string;
};
export type team = {
    id: string;
    name: string | null;
    gems: string[];
};
export type user = {
    id: string;
    /**
     * @zod.string.min(2, { message: "最少2个字符" })
     */
    name: string | null;
    email: string | null;
    emailVerified: Timestamp | null;
    image: string | null;
};
export type VerificationToken = {
    identifier: string;
    token: string;
    expires: Timestamp;
};
export type weapon = {
    name: string;
    type: weapon_type;
    baseAbi: number;
    stability: number;
    modifiers: string[];
    colorA: number;
    colorB: number;
    colorC: number;
    elementType: weapon_elementType;
    dataSources: string;
    details: string | null;
    itemId: string;
};
export type world = {
    id: string;
    name: string;
};
export type zone = {
    id: string;
    name: string;
    linkZone: string[];
    rewardNodes: number | null;
    activityId: string | null;
    addressId: string;
};
export type DB = {
    _armorTocrystal: armorTocrystal;
    _avatarTocharacter: avatarTocharacter;
    _BackRelation: BackRelation;
    _campA: campA;
    _campB: campB;
    _characterToconsumable: characterToconsumable;
    _crystalTooption: crystalTooption;
    _crystalToplayer_armor: crystalToplayer_armor;
    _crystalToplayer_option: crystalToplayer_option;
    _crystalToplayer_special: crystalToplayer_special;
    _crystalToplayer_weapon: crystalToplayer_weapon;
    _crystalTospecial: crystalTospecial;
    _crystalToweapon: crystalToweapon;
    _FrontRelation: FrontRelation;
    _mobTozone: mobTozone;
    account: account;
    account_create_data: account_create_data;
    account_update_data: account_update_data;
    activity: activity;
    address: address;
    armor: armor;
    avatar: avatar;
    character: character;
    character_skill: character_skill;
    combo: combo;
    combo_step: combo_step;
    consumable: consumable;
    crystal: crystal;
    drop_item: drop_item;
    image: image;
    item: item;
    material: material;
    member: member;
    mercenary: mercenary;
    mob: mob;
    npc: npc;
    option: option;
    player: player;
    player_armor: player_armor;
    player_option: player_option;
    player_pet: player_pet;
    player_special: player_special;
    player_weapon: player_weapon;
    post: post;
    recipe: recipe;
    recipe_ingredient: recipe_ingredient;
    reward: reward;
    session: session;
    simulator: simulator;
    skill: skill;
    skill_effect: skill_effect;
    special: special;
    statistic: statistic;
    task: task;
    task_collect_require: task_collect_require;
    task_kill_requirement: task_kill_requirement;
    team: team;
    user: user;
    verification_token: VerificationToken;
    weapon: weapon;
    world: world;
    zone: zone;
};
