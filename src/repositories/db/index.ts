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

export const PlayerScalarFieldEnumSchema = z.enum(['id','name','accountId']);

export const WorldScalarFieldEnumSchema = z.enum(['id','name']);

export const ActivityScalarFieldEnumSchema = z.enum(['id','name']);

export const AddressScalarFieldEnumSchema = z.enum(['id','name','type','x','y','worldId']);

export const ZoneScalarFieldEnumSchema = z.enum(['id','name','linkZone','rewardNodes','activityId','addressId']);

export const NpcScalarFieldEnumSchema = z.enum(['id','name','zoneId']);

export const ItemScalarFieldEnumSchema = z.enum(['id','name','dataSources','extraDetails','updatedAt','createdAt','statisticsId','updatedByAccountId','createdByAccountId']);

export const Recipe_ingredientScalarFieldEnumSchema = z.enum(['id','type','count','itemId','recipeId']);

export const RecipeScalarFieldEnumSchema = z.enum(['id','weaponId','armorId','addEquipId','speEquipId','consumableId','activityId']);

export const TaskScalarFieldEnumSchema = z.enum(['id','lv','name','npcId']);

export const RewardScalarFieldEnumSchema = z.enum(['id','type','value','probability','itemId','taskId']);

export const MaterialScalarFieldEnumSchema = z.enum(['name','itemId','material','ptValue','price']);

export const MobScalarFieldEnumSchema = z.enum(['id','name','mobType','baseLv','experience','partsExperience','address','element','radius','maxhp','physicalDefense','physicalResistance','magicalDefense','magicalResistance','criticalResistance','avoidance','dodge','block','normalAttackResistanceModifier','physicalAttackResistanceModifier','magicalAttackResistanceModifier','flow','difficultyOfTank','difficultyOfMelee','difficultyOfRanged','possibilityOfRunningAround','extraDetails','dataSources','updatedAt','createdAt','statisticsId','imageId','updatedByAccountId','createdByAccountId']);

export const Drop_itemScalarFieldEnumSchema = z.enum(['id','itemId','probability','relatedPart','relatedPartInfo','breakReward','dropById']);

export const Weapon_enchantment_attributesScalarFieldEnumSchema = z.enum(['id','name','flow','extraDetails','dataSources','updatedAt','createdAt','statisticsId','updatedByAccountId','createdByAccountId']);

export const Armor_enchantment_attributesScalarFieldEnumSchema = z.enum(['id','name','flow','extraDetails','dataSources','updatedAt','createdAt','statisticsId','updatedByAccountId','createdByAccountId']);

export const CrystalScalarFieldEnumSchema = z.enum(['name','crystalType','modifiers','itemId']);

export const WeaponScalarFieldEnumSchema = z.enum(['name','type','baseAbi','stability','modifiers','colorA','colorB','colorC','itemId']);

export const Custom_weaponScalarFieldEnumSchema = z.enum(['id','name','extraAbi','templateId','refinement','enchantmentAttributesId','masterId','updatedAt','createdAt','extraDetails']);

export const ArmorScalarFieldEnumSchema = z.enum(['name','baseDef','modifiers','colorA','colorB','colorC','itemId']);

export const Custom_armorScalarFieldEnumSchema = z.enum(['id','name','def','armorType','templateId','refinement','enchantmentAttributesId','masterId','updatedAt','createdAt','extraDetails']);

export const Additional_equipmentScalarFieldEnumSchema = z.enum(['name','baseDef','modifiers','colorA','colorB','colorC','itemId']);

export const Custom_additional_equipmentScalarFieldEnumSchema = z.enum(['id','name','def','templateId','refinement','masterId','updatedAt','createdAt','extraDetails']);

export const Special_equipmentScalarFieldEnumSchema = z.enum(['name','baseDef','modifiers','itemId']);

export const Custom_special_equipmentScalarFieldEnumSchema = z.enum(['id','name','def','templateId','refinement','masterId','updatedAt','createdAt','extraDetails']);

export const SkillScalarFieldEnumSchema = z.enum(['id','treeName','posX','posY','tier','name','isPassive','element','chargingType','distanceResist','extraDetails','dataSources','updatedAt','createdAt','statisticsId','updatedByAccountId','createdByAccountId']);

export const Character_skillScalarFieldEnumSchema = z.enum(['id','lv','templateId']);

export const Skill_effectScalarFieldEnumSchema = z.enum(['id','mainHand','subHand','armor','description','motionFixed','motionModified','chantingFixed','chantingModified','ReservoirFixed','ReservoirModified','startupFrames','cost','belongToskillId']);

export const Skill_yieldScalarFieldEnumSchema = z.enum(['id','yieldType','yieldFormula','mutationTimingFormula','skillEffectId']);

export const PetScalarFieldEnumSchema = z.enum(['id','name','maxLv','extraDetails','dataSources','updatedAt','createdAt','statisticsId','updatedByAccountId','createdByAccountId']);

export const Custom_petScalarFieldEnumSchema = z.enum(['id','templateId','pStr','pInt','pVit','pAgi','pDex','str','int','vit','agi','dex','weaponType','persona','type','weaponAtk','masterId']);

export const ConsumableScalarFieldEnumSchema = z.enum(['name','itemId','type','effectDuration','effects']);

export const ComboScalarFieldEnumSchema = z.enum(['id','name','combo']);

export const AvatarScalarFieldEnumSchema = z.enum(['id','name','type','modifiers','playerId']);

export const CharacterScalarFieldEnumSchema = z.enum(['id','name','characterType','lv','baseStr','baseInt','baseVit','baseAgi','baseDex','specialAbiType','specialAbiValue','weaponId','subWeaponId','armorId','addEquipId','speEquipId','cuisine','ExtraAttrs','partnerSkillA','partnerSkillAType','partnerSkillB','partnerSkillBType','masterId','extraDetails','updatedAt','createdAt','statisticsId','imageId']);

export const MercenaryScalarFieldEnumSchema = z.enum(['type','templateId','masterId','skillAId','skillAType','skillBId','skillBType']);

export const MemberScalarFieldEnumSchema = z.enum(['id','flow','characterId','partnerId','mercenaryId','mobId','mobDifficultyFlag']);

export const TeamScalarFieldEnumSchema = z.enum(['id','name','gems']);

export const SimulatorScalarFieldEnumSchema = z.enum(['id','name','visibility','extraDetails','updatedAt','createdAt','statisticsId','updatedByAccountId','createdByAccountId']);

export const StatisticsScalarFieldEnumSchema = z.enum(['id']);

export const ImageScalarFieldEnumSchema = z.enum(['id','dataUrl','npcId']);

export const RateScalarFieldEnumSchema = z.enum(['id','rate','accountId','statisticsId']);

export const Usage_timestampScalarFieldEnumSchema = z.enum(['timestamp','statisticsId']);

export const View_timestampScalarFieldEnumSchema = z.enum(['timestamp','statisticsId']);

export const SortOrderSchema = z.enum(['asc','desc']);

export const JsonNullValueInputSchema = z.enum(['JsonNull',]).transform((value) => (value === 'JsonNull' ? Prisma.JsonNull : value));

export const QueryModeSchema = z.enum(['default','insensitive']);

export const NullsOrderSchema = z.enum(['first','last']);

export const JsonNullValueFilterSchema = z.enum(['DbNull','JsonNull','AnyNull',]).transform((value) => value === 'JsonNull' ? Prisma.JsonNull : value === 'DbNull' ? Prisma.JsonNull : value === 'AnyNull' ? Prisma.AnyNull : value);

export const UserRoleSchema = z.enum(['USER','ADMIN']);

export type UserRoleType = `${z.infer<typeof UserRoleSchema>}`

export const ElementSchema = z.enum(['Normal','Light','Dark','Water','Fire','Earth','Wind']);

export type ElementType = `${z.infer<typeof ElementSchema>}`

export const MobTypeSchema = z.enum(['Mob','MiniBoss','Boss']);

export type MobTypeType = `${z.infer<typeof MobTypeSchema>}`

export const SpecialAbiTypeSchema = z.enum(['None','Luk','Cri','Tec','Men']);

export type SpecialAbiTypeType = `${z.infer<typeof SpecialAbiTypeSchema>}`

export const ArmorTypeSchema = z.enum(['Normal','Light','Heavy']);

export type ArmorTypeType = `${z.infer<typeof ArmorTypeSchema>}`

export const SkillTargetTypeSchema = z.enum(['None','Self','Player','Enemy']);

export type SkillTargetTypeType = `${z.infer<typeof SkillTargetTypeSchema>}`

export const SkillChargingTypeSchema = z.enum(['None','Chanting','Reservoir']);

export type SkillChargingTypeType = `${z.infer<typeof SkillChargingTypeSchema>}`

export const YieldTypeSchema = z.enum(['PersistentEffect','ImmediateEffect']);

export type YieldTypeType = `${z.infer<typeof YieldTypeSchema>}`

export const DurationTypeSchema = z.enum(['FRAME','SKILL','UNLIMITED']);

export type DurationTypeType = `${z.infer<typeof DurationTypeSchema>}`

export const MobDifficultyFlagSchema = z.enum(['Easy','Normal','Hard','Lunatic','Ultimate']);

export type MobDifficultyFlagType = `${z.infer<typeof MobDifficultyFlagSchema>}`

export const MobDamageTypeSchema = z.enum(['Physics','Magic','CurrentRate','MaxRate']);

export type MobDamageTypeType = `${z.infer<typeof MobDamageTypeSchema>}`

export const ComboTypeSchema = z.enum(['NULL']);

export type ComboTypeType = `${z.infer<typeof ComboTypeSchema>}`

export const CharacterTypeSchema = z.enum(['Tank','Mage','Ranger','Marksman']);

export type CharacterTypeType = `${z.infer<typeof CharacterTypeSchema>}`

export const AddressTypeSchema = z.enum(['Normal','Limited']);

export type AddressTypeType = `${z.infer<typeof AddressTypeSchema>}`

export const MaterialTypeSchema = z.enum(['Metal','Cloth','Beast','Wood','Drug','Magic']);

export type MaterialTypeType = `${z.infer<typeof MaterialTypeSchema>}`

export const PartBreakRewardSchema = z.enum(['None','CanDrop','DropUp']);

export type PartBreakRewardType = `${z.infer<typeof PartBreakRewardSchema>}`

export const MobPartSchema = z.enum(['A','B','C']);

export type MobPartType = `${z.infer<typeof MobPartSchema>}`

export const AvailabilityTypeSchema = z.enum(['permanent','event']);

export type AvailabilityTypeType = `${z.infer<typeof AvailabilityTypeSchema>}`

export const AcquisitionMethodTypeSchema = z.enum(['Drop','Craft']);

export type AcquisitionMethodTypeType = `${z.infer<typeof AcquisitionMethodTypeSchema>}`

export const SkillDistanceResistTypeSchema = z.enum(['None','Long','Short','Both']);

export type SkillDistanceResistTypeType = `${z.infer<typeof SkillDistanceResistTypeSchema>}`

export const PersonaSchema = z.enum(['Fervent','Intelligent','Mild','Swift','Justice','Devoted','Impulsive','Calm','Sly','Timid','Brave','Active','Sturdy','Steady','Max']);

export type PersonaType = `${z.infer<typeof PersonaSchema>}`

export const PetTypeSchema = z.enum(['AllTrades','PhysicalAttack','MagicAttack','PhysicalDefense','MagicDefensem','Avoidance','Hit','SkillsEnhancement','Genius']);

export type PetTypeType = `${z.infer<typeof PetTypeSchema>}`

export const MercenaryTypeSchema = z.enum(['Tank','Dps']);

export type MercenaryTypeType = `${z.infer<typeof MercenaryTypeSchema>}`

export const MercenarySkillTypeSchema = z.enum(['Active','Passive']);

export type MercenarySkillTypeType = `${z.infer<typeof MercenarySkillTypeSchema>}`

export const VisibilitySchema = z.enum(['Public','Private']);

export type VisibilityType = `${z.infer<typeof VisibilitySchema>}`

/////////////////////////////////////////
// MODELS
/////////////////////////////////////////

/////////////////////////////////////////
// USER SCHEMA
/////////////////////////////////////////

export const userSchema = z.object({
  userRole: UserRoleSchema,
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  emailVerified: z.coerce.date().nullable(),
  image: z.string().nullable(),
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
// PLAYER SCHEMA
/////////////////////////////////////////

export const playerSchema = z.object({
  id: z.string(),
  name: z.string(),
  accountId: z.string(),
})

export type player = z.infer<typeof playerSchema>

/////////////////////////////////////////
// WORLD SCHEMA
/////////////////////////////////////////

export const worldSchema = z.object({
  id: z.string(),
  name: z.string(),
})

export type world = z.infer<typeof worldSchema>

/////////////////////////////////////////
// ACTIVITY SCHEMA
/////////////////////////////////////////

export const activitySchema = z.object({
  id: z.string(),
  name: z.string(),
})

export type activity = z.infer<typeof activitySchema>

/////////////////////////////////////////
// ADDRESS SCHEMA
/////////////////////////////////////////

export const addressSchema = z.object({
  type: AddressTypeSchema,
  id: z.string(),
  name: z.string(),
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
  name: z.string().nullable(),
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
  name: z.string(),
  zoneId: z.string(),
})

export type npc = z.infer<typeof npcSchema>

/////////////////////////////////////////
// ITEM SCHEMA
/////////////////////////////////////////

export const itemSchema = z.object({
  id: z.string(),
  name: z.string(),
  dataSources: z.string(),
  extraDetails: z.string(),
  updatedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  statisticsId: z.string(),
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
  name: z.string(),
  npcId: z.string(),
})

export type task = z.infer<typeof taskSchema>

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
  material: MaterialTypeSchema,
  name: z.string(),
  itemId: z.string(),
  ptValue: z.number().int(),
  price: z.number().int(),
})

export type material = z.infer<typeof materialSchema>

/////////////////////////////////////////
// MOB SCHEMA
/////////////////////////////////////////

export const mobSchema = z.object({
  mobType: MobTypeSchema,
  element: ElementSchema,
  id: z.string(),
  name: z.string().min(2, { message: "最少2个字符" }),
  baseLv: z.number().int(),
  experience: z.number().int(),
  partsExperience: z.number().int(),
  address: z.string(),
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
  flow: z.string(),
  difficultyOfTank: z.number().int(),
  difficultyOfMelee: z.number().int(),
  difficultyOfRanged: z.number().int(),
  possibilityOfRunningAround: z.number().int(),
  extraDetails: z.string(),
  dataSources: z.string(),
  updatedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  statisticsId: z.string(),
  imageId: z.string(),
  updatedByAccountId: z.string().nullable(),
  createdByAccountId: z.string().nullable(),
})

export type mob = z.infer<typeof mobSchema>

/////////////////////////////////////////
// DROP ITEM SCHEMA
/////////////////////////////////////////

export const drop_itemSchema = z.object({
  relatedPart: MobPartSchema,
  breakReward: PartBreakRewardSchema,
  id: z.string(),
  itemId: z.string(),
  probability: z.number().int(),
  relatedPartInfo: z.string(),
  dropById: z.string(),
})

export type drop_item = z.infer<typeof drop_itemSchema>

/////////////////////////////////////////
// WEAPON ENCHANTMENT ATTRIBUTES SCHEMA
/////////////////////////////////////////

export const weapon_enchantment_attributesSchema = z.object({
  id: z.string(),
  name: z.string(),
  flow: JsonValueSchema,
  extraDetails: z.string().nullable(),
  dataSources: z.string().nullable(),
  updatedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  statisticsId: z.string(),
  updatedByAccountId: z.string().nullable(),
  createdByAccountId: z.string().nullable(),
})

export type weapon_enchantment_attributes = z.infer<typeof weapon_enchantment_attributesSchema>

/////////////////////////////////////////
// ARMOR ENCHANTMENT ATTRIBUTES SCHEMA
/////////////////////////////////////////

export const armor_enchantment_attributesSchema = z.object({
  id: z.string(),
  name: z.string(),
  flow: JsonValueSchema,
  extraDetails: z.string().nullable(),
  dataSources: z.string().nullable(),
  updatedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  statisticsId: z.string(),
  updatedByAccountId: z.string().nullable(),
  createdByAccountId: z.string().nullable(),
})

export type armor_enchantment_attributes = z.infer<typeof armor_enchantment_attributesSchema>

/////////////////////////////////////////
// CRYSTAL SCHEMA
/////////////////////////////////////////

export const crystalSchema = z.object({
  name: z.string(),
  crystalType: z.string(),
  modifiers: z.string().array(),
  itemId: z.string(),
})

export type crystal = z.infer<typeof crystalSchema>

/////////////////////////////////////////
// WEAPON SCHEMA
/////////////////////////////////////////

export const weaponSchema = z.object({
  name: z.string(),
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
// CUSTOM WEAPON SCHEMA
/////////////////////////////////////////

export const custom_weaponSchema = z.object({
  id: z.string(),
  name: z.string(),
  extraAbi: z.number().int(),
  templateId: z.string(),
  refinement: z.number().int(),
  enchantmentAttributesId: z.string(),
  masterId: z.string(),
  updatedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  extraDetails: z.string(),
})

export type custom_weapon = z.infer<typeof custom_weaponSchema>

/////////////////////////////////////////
// ARMOR SCHEMA
/////////////////////////////////////////

export const armorSchema = z.object({
  name: z.string(),
  baseDef: z.number().int(),
  modifiers: z.string().array(),
  colorA: z.number().int(),
  colorB: z.number().int(),
  colorC: z.number().int(),
  itemId: z.string(),
})

export type armor = z.infer<typeof armorSchema>

/////////////////////////////////////////
// CUSTOM ARMOR SCHEMA
/////////////////////////////////////////

export const custom_armorSchema = z.object({
  armorType: ArmorTypeSchema,
  id: z.string(),
  name: z.string(),
  def: z.number().int(),
  templateId: z.string(),
  refinement: z.number().int(),
  enchantmentAttributesId: z.string(),
  masterId: z.string(),
  updatedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  extraDetails: z.string(),
})

export type custom_armor = z.infer<typeof custom_armorSchema>

/////////////////////////////////////////
// ADDITIONAL EQUIPMENT SCHEMA
/////////////////////////////////////////

export const additional_equipmentSchema = z.object({
  name: z.string(),
  baseDef: z.number().int(),
  modifiers: z.string().array(),
  colorA: z.number().int(),
  colorB: z.number().int(),
  colorC: z.number().int(),
  itemId: z.string(),
})

export type additional_equipment = z.infer<typeof additional_equipmentSchema>

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
  updatedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  extraDetails: z.string(),
})

export type custom_additional_equipment = z.infer<typeof custom_additional_equipmentSchema>

/////////////////////////////////////////
// SPECIAL EQUIPMENT SCHEMA
/////////////////////////////////////////

export const special_equipmentSchema = z.object({
  name: z.string(),
  baseDef: z.number().int(),
  modifiers: z.string().array(),
  itemId: z.string(),
})

export type special_equipment = z.infer<typeof special_equipmentSchema>

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
  updatedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  extraDetails: z.string(),
})

export type custom_special_equipment = z.infer<typeof custom_special_equipmentSchema>

/////////////////////////////////////////
// SKILL SCHEMA
/////////////////////////////////////////

export const skillSchema = z.object({
  chargingType: SkillChargingTypeSchema,
  distanceResist: SkillDistanceResistTypeSchema,
  id: z.string(),
  treeName: z.string(),
  posX: z.number().int(),
  posY: z.number().int(),
  tier: z.number().int(),
  name: z.string(),
  isPassive: z.boolean(),
  element: z.string(),
  extraDetails: z.string(),
  dataSources: z.string(),
  updatedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  statisticsId: z.string(),
  updatedByAccountId: z.string().nullable(),
  createdByAccountId: z.string().nullable(),
})

export type skill = z.infer<typeof skillSchema>

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
// SKILL EFFECT SCHEMA
/////////////////////////////////////////

export const skill_effectSchema = z.object({
  id: z.string(),
  mainHand: z.string(),
  subHand: z.string(),
  armor: z.string(),
  description: z.string(),
  motionFixed: z.string(),
  motionModified: z.string(),
  chantingFixed: z.string(),
  chantingModified: z.string(),
  ReservoirFixed: z.string(),
  ReservoirModified: z.string(),
  startupFrames: z.string(),
  cost: z.string(),
  belongToskillId: z.string(),
})

export type skill_effect = z.infer<typeof skill_effectSchema>

/////////////////////////////////////////
// SKILL YIELD SCHEMA
/////////////////////////////////////////

export const skill_yieldSchema = z.object({
  yieldType: YieldTypeSchema,
  id: z.string(),
  yieldFormula: z.string(),
  mutationTimingFormula: z.string().nullable(),
  skillEffectId: z.string().nullable(),
})

export type skill_yield = z.infer<typeof skill_yieldSchema>

/////////////////////////////////////////
// PET SCHEMA
/////////////////////////////////////////

export const petSchema = z.object({
  id: z.string(),
  name: z.string(),
  maxLv: z.number().int(),
  extraDetails: z.string(),
  dataSources: z.string(),
  updatedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  statisticsId: z.string(),
  updatedByAccountId: z.string().nullable(),
  createdByAccountId: z.string().nullable(),
})

export type pet = z.infer<typeof petSchema>

/////////////////////////////////////////
// CUSTOM PET SCHEMA
/////////////////////////////////////////

export const custom_petSchema = z.object({
  persona: PersonaSchema,
  type: PetTypeSchema,
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
  weaponAtk: z.number().int(),
  masterId: z.string(),
})

export type custom_pet = z.infer<typeof custom_petSchema>

/////////////////////////////////////////
// CONSUMABLE SCHEMA
/////////////////////////////////////////

export const consumableSchema = z.object({
  name: z.string(),
  itemId: z.string(),
  type: z.string(),
  effectDuration: z.number().int(),
  effects: z.string().array(),
})

export type consumable = z.infer<typeof consumableSchema>

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
  characterType: CharacterTypeSchema,
  specialAbiType: SpecialAbiTypeSchema,
  partnerSkillAType: MercenarySkillTypeSchema,
  partnerSkillBType: MercenarySkillTypeSchema,
  id: z.string(),
  name: z.string(),
  lv: z.number().int(),
  baseStr: z.number().int(),
  baseInt: z.number().int(),
  baseVit: z.number().int(),
  baseAgi: z.number().int(),
  baseDex: z.number().int(),
  specialAbiValue: z.number().int(),
  weaponId: z.string(),
  subWeaponId: z.string(),
  armorId: z.string(),
  addEquipId: z.string(),
  speEquipId: z.string(),
  cuisine: z.string().array(),
  ExtraAttrs: z.string().array(),
  partnerSkillA: z.string(),
  partnerSkillB: z.string(),
  masterId: z.string(),
  extraDetails: z.string(),
  updatedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  statisticsId: z.string(),
  imageId: z.string(),
})

export type character = z.infer<typeof characterSchema>

/////////////////////////////////////////
// MERCENARY SCHEMA
/////////////////////////////////////////

export const mercenarySchema = z.object({
  type: MercenaryTypeSchema,
  skillAType: MercenarySkillTypeSchema,
  skillBType: MercenarySkillTypeSchema,
  templateId: z.string(),
  masterId: z.string(),
  skillAId: z.string(),
  skillBId: z.string(),
})

export type mercenary = z.infer<typeof mercenarySchema>

/////////////////////////////////////////
// MEMBER SCHEMA
/////////////////////////////////////////

export const memberSchema = z.object({
  mobDifficultyFlag: MobDifficultyFlagSchema,
  id: z.string(),
  flow: JsonValueSchema,
  characterId: z.string().nullable(),
  partnerId: z.string().nullable(),
  mercenaryId: z.string().nullable(),
  mobId: z.string().nullable(),
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
  visibility: VisibilitySchema,
  id: z.string(),
  name: z.string(),
  extraDetails: z.string().nullable(),
  updatedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  statisticsId: z.string(),
  updatedByAccountId: z.string().nullable(),
  createdByAccountId: z.string().nullable(),
})

export type simulator = z.infer<typeof simulatorSchema>

/////////////////////////////////////////
// STATISTICS SCHEMA
/////////////////////////////////////////

export const statisticsSchema = z.object({
  id: z.string(),
})

export type statistics = z.infer<typeof statisticsSchema>

/////////////////////////////////////////
// IMAGE SCHEMA
/////////////////////////////////////////

export const imageSchema = z.object({
  id: z.string(),
  dataUrl: z.string(),
  npcId: z.string().nullable(),
})

export type image = z.infer<typeof imageSchema>

/////////////////////////////////////////
// RATE SCHEMA
/////////////////////////////////////////

export const rateSchema = z.object({
  id: z.string(),
  rate: z.number().int(),
  accountId: z.string(),
  statisticsId: z.string(),
})

export type rate = z.infer<typeof rateSchema>

/////////////////////////////////////////
// USAGE TIMESTAMP SCHEMA
/////////////////////////////////////////

export const usage_timestampSchema = z.object({
  timestamp: z.coerce.date(),
  statisticsId: z.string().nullable(),
})

export type usage_timestamp = z.infer<typeof usage_timestampSchema>

/////////////////////////////////////////
// VIEW TIMESTAMP SCHEMA
/////////////////////////////////////////

export const view_timestampSchema = z.object({
  timestamp: z.coerce.date(),
  statisticsId: z.string().nullable(),
})

export type view_timestamp = z.infer<typeof view_timestampSchema>
