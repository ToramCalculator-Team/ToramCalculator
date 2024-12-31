import { z } from 'zod';
import { Prisma } from '@prisma/client';

/////////////////////////////////////////
// HELPER FUNCTIONS
/////////////////////////////////////////

// JSON
//------------------------------------------------------

export type NullableJsonInput = Prisma.JsonValue | null | 'JsonNull' | 'DbNull' | Prisma.NullTypes.DbNull | Prisma.NullTypes.JsonNull;

export const transformJsonNull = (v?: NullableJsonInput) => {
  if (!v || v === 'DbNull') return Prisma.DbNull;
  if (v === 'JsonNull') return Prisma.JsonNull;
  return v;
};

export const JsonValueSchema: z.ZodType<Prisma.JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.literal(null),
    z.record(z.lazy(() => JsonValueSchema.optional())),
    z.array(z.lazy(() => JsonValueSchema)),
  ])
);

export type JsonValueType = z.infer<typeof JsonValueSchema>;

export const NullableJsonValue = z
  .union([JsonValueSchema, z.literal('DbNull'), z.literal('JsonNull')])
  .nullable()
  .transform((v) => transformJsonNull(v));

export type NullableJsonValueType = z.infer<typeof NullableJsonValue>;

export const InputJsonValueSchema: z.ZodType<Prisma.InputJsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.object({ toJSON: z.function(z.tuple([]), z.any()) }),
    z.record(z.lazy(() => z.union([InputJsonValueSchema, z.literal(null)]))),
    z.array(z.lazy(() => z.union([InputJsonValueSchema, z.literal(null)]))),
  ])
);

export type InputJsonValueType = z.infer<typeof InputJsonValueSchema>;


/////////////////////////////////////////
// ENUMS
/////////////////////////////////////////

export const TransactionIsolationLevelSchema = z.enum(['ReadUncommitted','ReadCommitted','RepeatableRead','Serializable']);

export const UserScalarFieldEnumSchema = z.enum(['id','name','email','emailVerified','image','userRole']);

export const RelationLoadStrategySchema = z.enum(['query','join']);

export const AccountScalarFieldEnumSchema = z.enum(['id','type','provider','providerAccountId','refresh_token','access_token','expires_at','token_type','scope','id_token','session_state','userId']);

export const SessionScalarFieldEnumSchema = z.enum(['id','sessionToken','expires','accountId']);

export const Verification_tokenScalarFieldEnumSchema = z.enum(['identifier','token','expires']);

export const PostScalarFieldEnumSchema = z.enum(['id','name','createdAt','updatedAt','createdById']);

export const Account_create_dataScalarFieldEnumSchema = z.enum(['accountId']);

export const Account_update_dataScalarFieldEnumSchema = z.enum(['accountId']);

export const WorldScalarFieldEnumSchema = z.enum(['id','name']);

export const ActivityScalarFieldEnumSchema = z.enum(['id','name']);

export const AddressScalarFieldEnumSchema = z.enum(['id','name','type','x','y','worldId']);

export const ZoneScalarFieldEnumSchema = z.enum(['id','name','linkZone','rewardNodes','activityId','addressId']);

export const NpcScalarFieldEnumSchema = z.enum(['id','name','imageId','zoneId']);

export const ItemScalarFieldEnumSchema = z.enum(['id','name','dataSources','details','statisticId','updatedByAccountId','createdByAccountId']);

export const Recipe_ingredientScalarFieldEnumSchema = z.enum(['id','type','count','itemId','recipeId']);

export const RecipeScalarFieldEnumSchema = z.enum(['id','weaponId','armorId','addEquipId','speEquipId','consumableId','activityId']);

export const TaskScalarFieldEnumSchema = z.enum(['id','lv','name','type','description','npcId']);

export const Kill_requirementScalarFieldEnumSchema = z.enum(['id','mobId','count','taskId']);

export const Task_requireScalarFieldEnumSchema = z.enum(['id','type','count','itemId','taskId']);

export const RewardScalarFieldEnumSchema = z.enum(['id','type','value','probability','itemId','taskId']);

export const MaterialScalarFieldEnumSchema = z.enum(['name','itemId','material','ptValue','price']);

export const MobScalarFieldEnumSchema = z.enum(['id','name','mobType','captureable','baseLv','experience','partsExperience','element','radius','maxhp','physicalDefense','physicalResistance','magicalDefense','magicalResistance','criticalResistance','avoidance','dodge','block','normalAttackResistanceModifier','physicalAttackResistanceModifier','magicalAttackResistanceModifier','actions','details','dataSources','statisticId','imageId','updatedByAccountId','createdByAccountId']);

export const Drop_itemScalarFieldEnumSchema = z.enum(['id','itemId','probability','relatedPart','relatedPartInfo','breakReward','dropById']);

export const CrystalScalarFieldEnumSchema = z.enum(['name','crystalType','modifiers','itemId']);

export const WeaponScalarFieldEnumSchema = z.enum(['name','type','baseAbi','stability','modifiers','colorA','colorB','colorC','itemId']);

export const ArmorScalarFieldEnumSchema = z.enum(['name','baseDef','modifiers','colorA','colorB','colorC','itemId']);

export const Armor_enchantment_attributesScalarFieldEnumSchema = z.enum(['id','name','flow','details','dataSources','statisticId','updatedByAccountId','createdByAccountId']);

export const Additional_equipmentScalarFieldEnumSchema = z.enum(['name','baseDef','modifiers','colorA','colorB','colorC','itemId']);

export const Special_equipmentScalarFieldEnumSchema = z.enum(['name','baseDef','modifiers','itemId']);

export const SkillScalarFieldEnumSchema = z.enum(['id','treeName','posX','posY','tier','name','isPassive','element','chargingType','distanceResist','details','dataSources','statisticId','updatedByAccountId','createdByAccountId']);

export const Skill_effectScalarFieldEnumSchema = z.enum(['id','mainHand','subHand','armor','description','motionFixed','motionModified','chantingFixed','chantingModified','reservoirFixed','reservoirModified','startupFrames','cost','details','belongToskillId']);

export const ConsumableScalarFieldEnumSchema = z.enum(['name','itemId','type','effectDuration','effects']);

export const Custom_weaponScalarFieldEnumSchema = z.enum(['id','name','extraAbi','templateId','refinement','enchantmentAttributesId','masterId']);

export const Weapon_enchantment_attributesScalarFieldEnumSchema = z.enum(['id','name','flow','details','dataSources','statisticId','updatedByAccountId','createdByAccountId']);

export const Custom_armorScalarFieldEnumSchema = z.enum(['id','name','def','armorType','templateId','refinement','enchantmentAttributesId','masterId']);

export const Custom_additional_equipmentScalarFieldEnumSchema = z.enum(['id','name','def','templateId','refinement','masterId']);

export const Custom_special_equipmentScalarFieldEnumSchema = z.enum(['id','name','def','templateId','refinement','masterId']);

export const Character_skillScalarFieldEnumSchema = z.enum(['id','lv','templateId']);

export const Custom_petScalarFieldEnumSchema = z.enum(['id','templateId','pStr','pInt','pVit','pAgi','pDex','str','int','vit','agi','dex','weaponType','persona','type','weaponAtk','masterId']);

export const ComboScalarFieldEnumSchema = z.enum(['id','name','combo']);

export const AvatarScalarFieldEnumSchema = z.enum(['id','name','type','modifiers','playerId']);

export const CharacterScalarFieldEnumSchema = z.enum(['id','name','lv','str','int','vit','agi','dex','personalityType','personalityValue','weaponId','subWeaponId','armorId','addEquipId','speEquipId','cooking','modifiers','partnerSkillA','partnerSkillAType','partnerSkillB','partnerSkillBType','masterId','details','statisticId','imageId']);

export const MercenaryScalarFieldEnumSchema = z.enum(['type','templateId','skillAId','skillAType','skillBId','skillBType']);

export const PlayerScalarFieldEnumSchema = z.enum(['id','name','useIn','actions','accountId']);

export const MemberScalarFieldEnumSchema = z.enum(['id','playerId','partnerId','mercenaryId','mobId','mobDifficultyFlag']);

export const TeamScalarFieldEnumSchema = z.enum(['id','name','gems']);

export const SimulatorScalarFieldEnumSchema = z.enum(['id','name','visibility','details','statisticId','updatedByAccountId','createdByAccountId']);

export const StatisticScalarFieldEnumSchema = z.enum(['id','updatedAt','createdAt','usageTimestamps','viewTimestamps']);

export const ImageScalarFieldEnumSchema = z.enum(['id','dataUrl']);

export const SortOrderSchema = z.enum(['asc','desc']);

export const JsonNullValueInputSchema = z.enum(['JsonNull',]).transform((value) => (value === 'JsonNull' ? Prisma.JsonNull : value));

export const NullableJsonNullValueInputSchema = z.enum(['DbNull','JsonNull',]).transform((value) => value === 'JsonNull' ? Prisma.JsonNull : value === 'DbNull' ? Prisma.DbNull : value);

export const QueryModeSchema = z.enum(['default','insensitive']);

export const NullsOrderSchema = z.enum(['first','last']);

export const JsonNullValueFilterSchema = z.enum(['DbNull','JsonNull','AnyNull',]).transform((value) => value === 'JsonNull' ? Prisma.JsonNull : value === 'DbNull' ? Prisma.JsonNull : value === 'AnyNull' ? Prisma.AnyNull : value);
/////////////////////////////////////////
// MODELS
/////////////////////////////////////////

/////////////////////////////////////////
// USER SCHEMA
/////////////////////////////////////////

export const userSchema = z.object({
  id: z.string(),
  name: z.string().min(2, { message: "最少2个字符" }).nullable(),
  email: z.string().nullable(),
  emailVerified: z.coerce.date().nullable(),
  image: z.string().nullable(),
  userRole: z.string(),
})

export type user = z.infer<typeof userSchema>

/////////////////////////////////////////
// ACCOUNT SCHEMA
/////////////////////////////////////////

export const accountSchema = z.object({
  id: z.string(),
  type: z.string(),
  provider: z.string(),
  providerAccountId: z.string(),
  refresh_token: z.string().nullable(),
  access_token: z.string().nullable(),
  expires_at: z.number().int().nullable(),
  token_type: z.string().nullable(),
  scope: z.string().nullable(),
  id_token: z.string().nullable(),
  session_state: z.string().nullable(),
  userId: z.string(),
})

export type account = z.infer<typeof accountSchema>

/////////////////////////////////////////
// SESSION SCHEMA
/////////////////////////////////////////

export const sessionSchema = z.object({
  id: z.string(),
  sessionToken: z.string(),
  expires: z.coerce.date(),
  accountId: z.string(),
})

export type session = z.infer<typeof sessionSchema>

/////////////////////////////////////////
// VERIFICATION TOKEN SCHEMA
/////////////////////////////////////////

export const verification_tokenSchema = z.object({
  identifier: z.string(),
  token: z.string(),
  expires: z.coerce.date(),
})

export type verification_token = z.infer<typeof verification_tokenSchema>

/////////////////////////////////////////
// POST SCHEMA
/////////////////////////////////////////

export const postSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdById: z.string(),
})

export type post = z.infer<typeof postSchema>

/////////////////////////////////////////
// ACCOUNT CREATE DATA SCHEMA
/////////////////////////////////////////

export const account_create_dataSchema = z.object({
  accountId: z.string(),
})

export type account_create_data = z.infer<typeof account_create_dataSchema>

/////////////////////////////////////////
// ACCOUNT UPDATE DATA SCHEMA
/////////////////////////////////////////

export const account_update_dataSchema = z.object({
  accountId: z.string(),
})

export type account_update_data = z.infer<typeof account_update_dataSchema>

/////////////////////////////////////////
// WORLD SCHEMA
/////////////////////////////////////////

export const worldSchema = z.object({
  id: z.string(),
  name: JsonValueSchema,
})

export type world = z.infer<typeof worldSchema>

/////////////////////////////////////////
// ACTIVITY SCHEMA
/////////////////////////////////////////

export const activitySchema = z.object({
  id: z.string(),
  name: JsonValueSchema,
})

export type activity = z.infer<typeof activitySchema>

/////////////////////////////////////////
// ADDRESS SCHEMA
/////////////////////////////////////////

export const addressSchema = z.object({
  id: z.string(),
  name: JsonValueSchema,
  type: z.string(),
  x: z.number().int(),
  y: z.number().int(),
  worldId: z.string(),
})

export type address = z.infer<typeof addressSchema>

/////////////////////////////////////////
// ZONE SCHEMA
/////////////////////////////////////////

export const zoneSchema = z.object({
  id: z.string(),
  name: JsonValueSchema.nullable(),
  linkZone: z.string().array(),
  rewardNodes: z.number().int(),
  activityId: z.string().nullable(),
  addressId: z.string(),
})

export type zone = z.infer<typeof zoneSchema>

/////////////////////////////////////////
// NPC SCHEMA
/////////////////////////////////////////

export const npcSchema = z.object({
  id: z.string(),
  name: JsonValueSchema,
  imageId: z.string(),
  zoneId: z.string(),
})

export type npc = z.infer<typeof npcSchema>

/////////////////////////////////////////
// ITEM SCHEMA
/////////////////////////////////////////

export const itemSchema = z.object({
  id: z.string(),
  name: JsonValueSchema,
  dataSources: z.string(),
  details: z.string(),
  statisticId: z.string(),
  updatedByAccountId: z.string().nullable(),
  createdByAccountId: z.string().nullable(),
})

export type item = z.infer<typeof itemSchema>

/////////////////////////////////////////
// RECIPE INGREDIENT SCHEMA
/////////////////////////////////////////

export const recipe_ingredientSchema = z.object({
  id: z.string(),
  type: z.string(),
  count: z.number().int(),
  itemId: z.string().nullable(),
  recipeId: z.string(),
})

export type recipe_ingredient = z.infer<typeof recipe_ingredientSchema>

/////////////////////////////////////////
// RECIPE SCHEMA
/////////////////////////////////////////

export const recipeSchema = z.object({
  id: z.string(),
  weaponId: z.string().nullable(),
  armorId: z.string().nullable(),
  addEquipId: z.string().nullable(),
  speEquipId: z.string().nullable(),
  consumableId: z.string().nullable(),
  activityId: z.string().nullable(),
})

export type recipe = z.infer<typeof recipeSchema>

/////////////////////////////////////////
// TASK SCHEMA
/////////////////////////////////////////

export const taskSchema = z.object({
  id: z.string(),
  lv: z.number().int(),
  name: JsonValueSchema,
  type: z.string(),
  description: JsonValueSchema,
  npcId: z.string(),
})

export type task = z.infer<typeof taskSchema>

/////////////////////////////////////////
// KILL REQUIREMENT SCHEMA
/////////////////////////////////////////

export const kill_requirementSchema = z.object({
  id: z.string(),
  mobId: z.string(),
  count: z.number().int(),
  taskId: z.string(),
})

export type kill_requirement = z.infer<typeof kill_requirementSchema>

/////////////////////////////////////////
// TASK REQUIRE SCHEMA
/////////////////////////////////////////

export const task_requireSchema = z.object({
  id: z.string(),
  type: z.string(),
  count: z.number().int(),
  itemId: z.string().nullable(),
  taskId: z.string(),
})

export type task_require = z.infer<typeof task_requireSchema>

/////////////////////////////////////////
// REWARD SCHEMA
/////////////////////////////////////////

export const rewardSchema = z.object({
  id: z.string(),
  type: z.string(),
  value: z.number().int(),
  probability: z.number().int(),
  itemId: z.string().nullable(),
  taskId: z.string(),
})

export type reward = z.infer<typeof rewardSchema>

/////////////////////////////////////////
// MATERIAL SCHEMA
/////////////////////////////////////////

export const materialSchema = z.object({
  name: JsonValueSchema,
  itemId: z.string(),
  material: z.string(),
  ptValue: z.number().int(),
  price: z.number().int(),
})

export type material = z.infer<typeof materialSchema>

/////////////////////////////////////////
// MOB SCHEMA
/////////////////////////////////////////

export const mobSchema = z.object({
  id: z.string(),
  name: JsonValueSchema,
  mobType: z.string(),
  captureable: z.boolean(),
  baseLv: z.number().int(),
  experience: z.number().int(),
  partsExperience: z.number().int(),
  element: z.string(),
  radius: z.number().int(),
  maxhp: z.number().int(),
  physicalDefense: z.number().int(),
  physicalResistance: z.number().int(),
  magicalDefense: z.number().int(),
  magicalResistance: z.number().int(),
  criticalResistance: z.number().int(),
  avoidance: z.number().int(),
  dodge: z.number().int(),
  block: z.number().int(),
  normalAttackResistanceModifier: z.number().int(),
  physicalAttackResistanceModifier: z.number().int(),
  magicalAttackResistanceModifier: z.number().int(),
  actions: JsonValueSchema,
  details: z.string(),
  dataSources: z.string(),
  statisticId: z.string(),
  imageId: z.string(),
  updatedByAccountId: z.string().nullable(),
  createdByAccountId: z.string().nullable(),
})

export type mob = z.infer<typeof mobSchema>

/////////////////////////////////////////
// DROP ITEM SCHEMA
/////////////////////////////////////////

export const drop_itemSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  probability: z.number().int(),
  relatedPart: z.string(),
  relatedPartInfo: z.string(),
  breakReward: z.string(),
  dropById: z.string(),
})

export type drop_item = z.infer<typeof drop_itemSchema>

/////////////////////////////////////////
// CRYSTAL SCHEMA
/////////////////////////////////////////

export const crystalSchema = z.object({
  name: JsonValueSchema,
  crystalType: z.string(),
  modifiers: z.string().array(),
  itemId: z.string(),
})

export type crystal = z.infer<typeof crystalSchema>

/////////////////////////////////////////
// WEAPON SCHEMA
/////////////////////////////////////////

export const weaponSchema = z.object({
  name: JsonValueSchema,
  type: z.string(),
  baseAbi: z.number().int(),
  stability: z.number().int(),
  modifiers: z.string().array(),
  colorA: z.number().int(),
  colorB: z.number().int(),
  colorC: z.number().int(),
  itemId: z.string(),
})

export type weapon = z.infer<typeof weaponSchema>

/////////////////////////////////////////
// ARMOR SCHEMA
/////////////////////////////////////////

export const armorSchema = z.object({
  name: JsonValueSchema,
  baseDef: z.number().int(),
  modifiers: z.string().array(),
  colorA: z.number().int(),
  colorB: z.number().int(),
  colorC: z.number().int(),
  itemId: z.string(),
})

export type armor = z.infer<typeof armorSchema>

/////////////////////////////////////////
// ARMOR ENCHANTMENT ATTRIBUTES SCHEMA
/////////////////////////////////////////

export const armor_enchantment_attributesSchema = z.object({
  id: z.string(),
  name: z.string(),
  flow: JsonValueSchema,
  details: z.string().nullable(),
  dataSources: z.string().nullable(),
  statisticId: z.string(),
  updatedByAccountId: z.string().nullable(),
  createdByAccountId: z.string().nullable(),
})

export type armor_enchantment_attributes = z.infer<typeof armor_enchantment_attributesSchema>

/////////////////////////////////////////
// ADDITIONAL EQUIPMENT SCHEMA
/////////////////////////////////////////

export const additional_equipmentSchema = z.object({
  name: JsonValueSchema,
  baseDef: z.number().int(),
  modifiers: z.string().array(),
  colorA: z.number().int(),
  colorB: z.number().int(),
  colorC: z.number().int(),
  itemId: z.string(),
})

export type additional_equipment = z.infer<typeof additional_equipmentSchema>

/////////////////////////////////////////
// SPECIAL EQUIPMENT SCHEMA
/////////////////////////////////////////

export const special_equipmentSchema = z.object({
  name: JsonValueSchema,
  baseDef: z.number().int(),
  modifiers: z.string().array(),
  itemId: z.string(),
})

export type special_equipment = z.infer<typeof special_equipmentSchema>

/////////////////////////////////////////
// SKILL SCHEMA
/////////////////////////////////////////

export const skillSchema = z.object({
  id: z.string(),
  treeName: JsonValueSchema,
  posX: z.number().int(),
  posY: z.number().int(),
  tier: z.number().int(),
  name: JsonValueSchema,
  isPassive: z.boolean(),
  element: z.string(),
  chargingType: z.string(),
  distanceResist: z.string(),
  details: z.string(),
  dataSources: z.string(),
  statisticId: z.string(),
  updatedByAccountId: z.string().nullable(),
  createdByAccountId: z.string().nullable(),
})

export type skill = z.infer<typeof skillSchema>

/////////////////////////////////////////
// SKILL EFFECT SCHEMA
/////////////////////////////////////////

export const skill_effectSchema = z.object({
  id: z.string(),
  mainHand: z.string(),
  subHand: z.string(),
  armor: z.string(),
  description: JsonValueSchema,
  motionFixed: z.string(),
  motionModified: z.string(),
  chantingFixed: z.string(),
  chantingModified: z.string(),
  reservoirFixed: z.string(),
  reservoirModified: z.string(),
  startupFrames: z.string(),
  cost: z.string(),
  details: JsonValueSchema,
  belongToskillId: z.string(),
})

export type skill_effect = z.infer<typeof skill_effectSchema>

/////////////////////////////////////////
// CONSUMABLE SCHEMA
/////////////////////////////////////////

export const consumableSchema = z.object({
  name: JsonValueSchema,
  itemId: z.string(),
  type: z.string(),
  effectDuration: z.number().int(),
  effects: z.string().array(),
})

export type consumable = z.infer<typeof consumableSchema>

/////////////////////////////////////////
// CUSTOM WEAPON SCHEMA
/////////////////////////////////////////

export const custom_weaponSchema = z.object({
  id: z.string(),
  name: z.string(),
  extraAbi: z.number().int(),
  templateId: z.string(),
  refinement: z.number().int(),
  enchantmentAttributesId: z.string().nullable(),
  masterId: z.string(),
})

export type custom_weapon = z.infer<typeof custom_weaponSchema>

/////////////////////////////////////////
// WEAPON ENCHANTMENT ATTRIBUTES SCHEMA
/////////////////////////////////////////

export const weapon_enchantment_attributesSchema = z.object({
  id: z.string(),
  name: z.string(),
  flow: JsonValueSchema,
  details: z.string().nullable(),
  dataSources: z.string().nullable(),
  statisticId: z.string(),
  updatedByAccountId: z.string().nullable(),
  createdByAccountId: z.string().nullable(),
})

export type weapon_enchantment_attributes = z.infer<typeof weapon_enchantment_attributesSchema>

/////////////////////////////////////////
// CUSTOM ARMOR SCHEMA
/////////////////////////////////////////

export const custom_armorSchema = z.object({
  id: z.string(),
  name: z.string(),
  def: z.number().int(),
  armorType: z.string(),
  templateId: z.string(),
  refinement: z.number().int(),
  enchantmentAttributesId: z.string().nullable(),
  masterId: z.string(),
})

export type custom_armor = z.infer<typeof custom_armorSchema>

/////////////////////////////////////////
// CUSTOM ADDITIONAL EQUIPMENT SCHEMA
/////////////////////////////////////////

export const custom_additional_equipmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  def: z.number().int(),
  templateId: z.string(),
  refinement: z.number().int(),
  masterId: z.string(),
})

export type custom_additional_equipment = z.infer<typeof custom_additional_equipmentSchema>

/////////////////////////////////////////
// CUSTOM SPECIAL EQUIPMENT SCHEMA
/////////////////////////////////////////

export const custom_special_equipmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  def: z.number().int(),
  templateId: z.string(),
  refinement: z.number().int(),
  masterId: z.string(),
})

export type custom_special_equipment = z.infer<typeof custom_special_equipmentSchema>

/////////////////////////////////////////
// CHARACTER SKILL SCHEMA
/////////////////////////////////////////

export const character_skillSchema = z.object({
  id: z.string(),
  lv: z.number().int(),
  templateId: z.string(),
})

export type character_skill = z.infer<typeof character_skillSchema>

/////////////////////////////////////////
// CUSTOM PET SCHEMA
/////////////////////////////////////////

export const custom_petSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  pStr: z.number().int(),
  pInt: z.number().int(),
  pVit: z.number().int(),
  pAgi: z.number().int(),
  pDex: z.number().int(),
  str: z.number().int(),
  int: z.number().int(),
  vit: z.number().int(),
  agi: z.number().int(),
  dex: z.number().int(),
  weaponType: z.string(),
  persona: z.string(),
  type: z.string(),
  weaponAtk: z.number().int(),
  masterId: z.string(),
})

export type custom_pet = z.infer<typeof custom_petSchema>

/////////////////////////////////////////
// COMBO SCHEMA
/////////////////////////////////////////

export const comboSchema = z.object({
  id: z.string(),
  name: z.string(),
  combo: JsonValueSchema,
})

export type combo = z.infer<typeof comboSchema>

/////////////////////////////////////////
// AVATAR SCHEMA
/////////////////////////////////////////

export const avatarSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  modifiers: z.string().array(),
  playerId: z.string(),
})

export type avatar = z.infer<typeof avatarSchema>

/////////////////////////////////////////
// CHARACTER SCHEMA
/////////////////////////////////////////

export const characterSchema = z.object({
  id: z.string(),
  name: z.string(),
  lv: z.number().int(),
  str: z.number().int(),
  int: z.number().int(),
  vit: z.number().int(),
  agi: z.number().int(),
  dex: z.number().int(),
  personalityType: z.string(),
  personalityValue: z.number().int(),
  weaponId: z.string(),
  subWeaponId: z.string(),
  armorId: z.string(),
  addEquipId: z.string(),
  speEquipId: z.string(),
  cooking: z.string().array(),
  modifiers: z.string().array(),
  partnerSkillA: z.string(),
  partnerSkillAType: z.string(),
  partnerSkillB: z.string(),
  partnerSkillBType: z.string(),
  masterId: z.string(),
  details: z.string(),
  statisticId: z.string(),
  imageId: z.string(),
})

export type character = z.infer<typeof characterSchema>

/////////////////////////////////////////
// MERCENARY SCHEMA
/////////////////////////////////////////

export const mercenarySchema = z.object({
  type: z.string(),
  templateId: z.string(),
  skillAId: z.string(),
  skillAType: z.string(),
  skillBId: z.string(),
  skillBType: z.string(),
})

export type mercenary = z.infer<typeof mercenarySchema>

/////////////////////////////////////////
// PLAYER SCHEMA
/////////////////////////////////////////

export const playerSchema = z.object({
  id: z.string(),
  name: z.string(),
  useIn: z.string(),
  actions: JsonValueSchema,
  accountId: z.string(),
})

export type player = z.infer<typeof playerSchema>

/////////////////////////////////////////
// MEMBER SCHEMA
/////////////////////////////////////////

export const memberSchema = z.object({
  id: z.string(),
  playerId: z.string().nullable(),
  partnerId: z.string().nullable(),
  mercenaryId: z.string().nullable(),
  mobId: z.string().nullable(),
  mobDifficultyFlag: z.string(),
})

export type member = z.infer<typeof memberSchema>

/////////////////////////////////////////
// TEAM SCHEMA
/////////////////////////////////////////

export const teamSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  gems: z.string().array(),
})

export type team = z.infer<typeof teamSchema>

/////////////////////////////////////////
// SIMULATOR SCHEMA
/////////////////////////////////////////

export const simulatorSchema = z.object({
  id: z.string(),
  name: z.string(),
  visibility: z.string(),
  details: z.string().nullable(),
  statisticId: z.string(),
  updatedByAccountId: z.string().nullable(),
  createdByAccountId: z.string().nullable(),
})

export type simulator = z.infer<typeof simulatorSchema>

/////////////////////////////////////////
// STATISTIC SCHEMA
/////////////////////////////////////////

export const statisticSchema = z.object({
  id: z.string(),
  updatedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  usageTimestamps: z.coerce.date().array(),
  viewTimestamps: z.coerce.date().array(),
})

export type statistic = z.infer<typeof statisticSchema>

/////////////////////////////////////////
// IMAGE SCHEMA
/////////////////////////////////////////

export const imageSchema = z.object({
  id: z.string(),
  dataUrl: z.string(),
})

export type image = z.infer<typeof imageSchema>
