import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "~/../drizzle/schema";
import { live } from "@electric-sql/pglite/live";
import { electricSync } from "@electric-sql/pglite-sync";

export const pg = new PGlite({
  dataDir: "idb://ToramCalculator-DB",
  relaxedDurability: true,
  extensions: {
    live,
    electric: electricSync({}),
  },
});

await pg.exec(
  `
DO $$ BEGIN
 CREATE TYPE "public"."BodyArmorType" AS ENUM('NORMAL', 'LIGHT', 'HEAVY');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."CharacterType" AS ENUM('Tank', 'Mage', 'Ranger', 'Marksman');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."ComboType" AS ENUM('NULL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."CrystalType" AS ENUM('GENERAL', 'WEAPONCRYSTAL', 'BODYCRYSTAL', 'ADDITIONALCRYSTAL', 'SPECIALCRYSTAL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."DurationType" AS ENUM('FRAME', 'SKILL', 'UNLIMITED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."Element" AS ENUM('NO_ELEMENT', 'LIGHT', 'DARK', 'WATER', 'FIRE', 'EARTH', 'WIND');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."MainWeaponType" AS ENUM('NO_WEAPON', 'ONE_HAND_SWORD', 'TWO_HANDS_SWORD', 'BOW', 'BOWGUN', 'STAFF', 'MAGIC_DEVICE', 'KNUCKLE', 'HALBERD', 'KATANA');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."ModifiersName" AS ENUM('STR', 'INT', 'VIT', 'AGI', 'DEX', 'MAX_MP', 'AGGRO', 'WEAPON_RANGE', 'HP_REGEN', 'MP_REGEN', 'PHYSICAL_ATK', 'MAGICAL_ATK', 'WEAPON_ATK', 'UNSHEATHE_ATK', 'PHYSICAL_PIERCE', 'MAGICAL_PIERCE', 'CRITICAL_RATE', 'CRITICAL_DAMAGE', 'MAGIC_CRT_CONVERSION_RATE', 'MAGIC_CRT_DAMAGE_CONVERSION_RATE', 'SHORT_RANGE_DAMAGE', 'LONG_RANGE_DAMAGE', 'STRONGER_AGAINST_NETURAL', 'STRONGER_AGAINST_LIGHT', 'STRONGER_AGAINST_DARK', 'STRONGER_AGAINST_WATER', 'STRONGER_AGAINST_FIRE', 'STRONGER_AGAINST_EARTH', 'STRONGER_AGAINST_WIND', 'STABILITY', 'ACCURACY', 'ADDITIONAL_PHYSICS', 'ADDITIONAL_MAGIC', 'ANTICIPATE', 'GUARD_BREAK', 'REFLECT', 'ABSOLUTA_ACCURACY', 'ATK_UP_STR', 'ATK_UP_INT', 'ATK_UP_VIT', 'ATK_UP_AGI', 'ATK_UP_DEX', 'MATK_UP_STR', 'MATK_UP_INT', 'MATK_UP_VIT', 'MATK_UP_AGI', 'MATK_UP_DEX', 'ATK_DOWN_STR', 'ATK_DOWN_INT', 'ATK_DOWN_VIT', 'ATK_DOWN_AGI', 'ATK_DOWN_DEX', 'MATK_DOWN_STR', 'MATK_DOWN_INT', 'MATK_DOWN_VIT', 'MATK_DOWN_AGI', 'MATK_DOWN_DEX', 'MAX_HP', 'PHYSICAL_DEF', 'MAGICAL_DEF', 'PHYSICAL_RESISTANCE', 'MAGICAL_RESISTANCE', 'NEUTRAL_RESISTANCE', 'LIGHT_RESISTANCE', 'DARK_RESISTANCE', 'WATER_RESISTANCE', 'FIRE_RESISTANCE', 'EARTH_RESISTANCE', 'WIND_RESISTANCE', 'DODGE', 'AILMENT_RESISTANCE', 'BASE_GUARD_POWER', 'GUARD_POWER', 'BASE_GUARD_RECHARGE', 'GUARD_RECHANGE', 'EVASION_RECHARGE', 'PHYSICAL_BARRIER', 'MAGICAL_BARRIER', 'FRACTIONAL_BARRIER', 'BARRIER_COOLDOWN', 'REDUCE_DMG_FLOOR', 'REDUCE_DMG_METEOR', 'REDUCE_DMG_PLAYER_EPICENTER', 'REDUCE_DMG_FOE_EPICENTER', 'REDUCE_DMG_BOWLING', 'REDUCE_DMG_BULLET', 'REDUCE_DMG_STRAIGHT_LINE', 'REDUCE_DMG_CHARGE', 'ABSOLUTE_DODGE', 'ASPD', 'CSPD', 'MSPD', 'DROP_RATE', 'REVIVE_TIME', 'FLINCH_UNAVAILABLE', 'TUMBLE_UNAVAILABLE', 'STUN_UNAVAILABLE', 'INVINCIBLE_AID', 'EXP_RATE', 'PET_EXP', 'ITEM_COOLDOWN', 'RECOIL_DAMAGE', 'GEM_POWDER_DROP');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."MonsterType" AS ENUM('COMMON_MOBS', 'COMMON_MINI_BOSS', 'COMMON_BOSS', 'EVENT_MOBS', 'EVENT_MINI_BOSS', 'EVENT_BOSS');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."SkillExtraActionType" AS ENUM('None', 'Chanting', 'Charging');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."SkillTreeName" AS ENUM('BLADE', 'SHOT', 'MAGIC', 'MARTIAL', 'DUALSWORD', 'HALBERD', 'MONONOFU', 'CRUSHER', 'SPRITE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."SkillType" AS ENUM('ACTIVE_SKILL', 'PASSIVE_SKILL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."SpecialAbiType" AS ENUM('NULL', 'LUK', 'CRI', 'TEC', 'MEN');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."SubWeaponType" AS ENUM('NO_WEAPON', 'ONE_HAND_SWORD', 'MAGIC_DEVICE', 'KNUCKLE', 'KATANA', 'ARROW', 'DAGGER', 'NINJUTSUSCROLL', 'SHIELD');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."UserRole" AS ENUM('USER', 'ADMIN');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."YieldType" AS ENUM('PersistentEffect', 'ImmediateEffect');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	"userId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "additional_equipment" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"refinement" integer NOT NULL,
	"modifiersListId" text NOT NULL,
	"extraDetails" text,
	"dataSources" text,
	"updatedAt" timestamp (3) NOT NULL,
	"createdAt" timestamp (3) NOT NULL,
	"updatedByUserId" text,
	"createdByUserId" text,
	"statisticsId" text NOT NULL,
	CONSTRAINT "additional_equipment_statisticsId_unique" UNIQUE("statisticsId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "_additional_equipmentTocrystal" (
	"A" text NOT NULL,
	"B" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analyzer" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"monsterId" text,
	"characterId" text,
	"extraDetails" text,
	"updatedAt" timestamp (3) NOT NULL,
	"createdAt" timestamp (3) NOT NULL,
	"updatedByUserId" text,
	"createdByUserId" text,
	"statisticsId" text NOT NULL,
	CONSTRAINT "analyzer_statisticsId_unique" UNIQUE("statisticsId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "body_armor" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"bodyArmorType" "BodyArmorType" NOT NULL,
	"refinement" integer NOT NULL,
	"baseDef" integer NOT NULL,
	"modifiersListId" text NOT NULL,
	"extraDetails" text,
	"dataSources" text,
	"updatedAt" timestamp (3) NOT NULL,
	"createdAt" timestamp (3) NOT NULL,
	"updatedByUserId" text,
	"createdByUserId" text,
	"statisticsId" text NOT NULL,
	CONSTRAINT "body_armor_statisticsId_unique" UNIQUE("statisticsId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "_body_armorTocrystal" (
	"A" text NOT NULL,
	"B" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "character" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"characterType" "CharacterType" NOT NULL,
	"lv" integer NOT NULL,
	"baseStr" integer NOT NULL,
	"baseInt" integer NOT NULL,
	"baseVit" integer NOT NULL,
	"baseAgi" integer NOT NULL,
	"baseDex" integer NOT NULL,
	"specialAbiType" "SpecialAbiType" NOT NULL,
	"specialAbiValue" integer NOT NULL,
	"mainWeaponId" text NOT NULL,
	"subWeaponId" text NOT NULL,
	"bodyArmorId" text NOT NULL,
	"additionalEquipmentId" text NOT NULL,
	"specialEquipmentId" text NOT NULL,
	"fashionModifiersListId" text NOT NULL,
	"CuisineModifiersListId" text NOT NULL,
	"petId" text NOT NULL,
	"modifiersListId" text NOT NULL,
	"extraDetails" text,
	"updatedAt" timestamp (3) NOT NULL,
	"createdAt" timestamp (3) NOT NULL,
	"updatedByUserId" text,
	"createdByUserId" text,
	"statisticsId" text NOT NULL,
	CONSTRAINT "character_fashionModifiersListId_unique" UNIQUE("fashionModifiersListId"),
	CONSTRAINT "character_CuisineModifiersListId_unique" UNIQUE("CuisineModifiersListId"),
	CONSTRAINT "character_modifiersListId_unique" UNIQUE("modifiersListId"),
	CONSTRAINT "character_statisticsId_unique" UNIQUE("statisticsId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "combo" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"userCreateUserId" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "combo_step" (
	"id" text PRIMARY KEY NOT NULL,
	"order" integer NOT NULL,
	"comboType" "ComboType" NOT NULL,
	"skillId" text NOT NULL,
	"comboId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "consumable" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"modifiersListId" text NOT NULL,
	"extraDetails" text,
	"dataSources" text,
	"updatedAt" timestamp (3) NOT NULL,
	"createdAt" timestamp (3) NOT NULL,
	"updatedByUserId" text,
	"createdByUserId" text,
	"statisticsId" text NOT NULL,
	CONSTRAINT "consumable_statisticsId_unique" UNIQUE("statisticsId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crystal" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"crystalType" "CrystalType" NOT NULL,
	"front" integer NOT NULL,
	"modifiersListId" text NOT NULL,
	"extraDetails" text,
	"dataSources" text,
	"updatedAt" timestamp (3) NOT NULL,
	"createdAt" timestamp (3) NOT NULL,
	"updatedByUserId" text,
	"createdByUserId" text,
	"statisticsId" text NOT NULL,
	CONSTRAINT "crystal_statisticsId_unique" UNIQUE("statisticsId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "_crystalTomain_weapon" (
	"A" text NOT NULL,
	"B" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "_crystalTospecial_equipment" (
	"A" text NOT NULL,
	"B" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "main_weapon" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"mainWeaponType" "MainWeaponType" NOT NULL,
	"baseAtk" integer NOT NULL,
	"refinement" integer NOT NULL,
	"stability" integer NOT NULL,
	"element" "Element" NOT NULL,
	"modifiersListId" text NOT NULL,
	"extraDetails" text,
	"dataSources" text,
	"updatedAt" timestamp (3) NOT NULL,
	"createdAt" timestamp (3) NOT NULL,
	"updatedByUserId" text,
	"createdByUserId" text,
	"statisticsId" text NOT NULL,
	CONSTRAINT "main_weapon_statisticsId_unique" UNIQUE("statisticsId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "modifier" (
	"id" text PRIMARY KEY NOT NULL,
	"formula" text NOT NULL,
	"belongToModifiersListId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "modifiers_list" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "monster" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"monsterType" "MonsterType" NOT NULL,
	"baseLv" integer,
	"experience" integer,
	"address" text,
	"element" "Element" NOT NULL,
	"radius" integer,
	"maxhp" integer,
	"physicalDefense" integer,
	"physicalResistance" integer,
	"magicalDefense" integer,
	"magicalResistance" integer,
	"criticalResistance" integer,
	"avoidance" integer,
	"dodge" integer,
	"block" integer,
	"normalAttackResistanceModifier" integer,
	"physicalAttackResistanceModifier" integer,
	"magicalAttackResistanceModifier" integer,
	"difficultyOfTank" integer NOT NULL,
	"difficultyOfMelee" integer NOT NULL,
	"difficultyOfRanged" integer NOT NULL,
	"possibilityOfRunningAround" integer NOT NULL,
	"extraDetails" text,
	"dataSources" text,
	"updatedAt" timestamp (3) NOT NULL,
	"createdAt" timestamp (3) NOT NULL,
	"updatedByUserId" text,
	"createdByUserId" text,
	"statisticsId" text NOT NULL,
	CONSTRAINT "monster_statisticsId_unique" UNIQUE("statisticsId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pet" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"extraDetails" text,
	"dataSources" text,
	"updatedAt" timestamp (3) NOT NULL,
	"createdAt" timestamp (3) NOT NULL,
	"updatedByUserId" text,
	"createdByUserId" text,
	"statisticsId" text NOT NULL,
	CONSTRAINT "pet_statisticsId_unique" UNIQUE("statisticsId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "post" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"createdAt" timestamp (3) NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"createdById" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "process" (
	"id" text PRIMARY KEY NOT NULL,
	"analyzerId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rate" (
	"id" text PRIMARY KEY NOT NULL,
	"rate" integer NOT NULL,
	"userId" text NOT NULL,
	"statisticsId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
	"id" text PRIMARY KEY NOT NULL,
	"sessionToken" text NOT NULL,
	"expires" timestamp (3) NOT NULL,
	"userId" text NOT NULL,
	CONSTRAINT "session_sessionToken_unique" UNIQUE("sessionToken")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skill" (
	"id" text PRIMARY KEY NOT NULL,
	"skillTreeName" "SkillTreeName" NOT NULL,
	"name" text NOT NULL,
	"skillType" "SkillType" NOT NULL,
	"weaponElementDependencyType" boolean NOT NULL,
	"element" "Element" NOT NULL,
	"skillDescription" text,
	"extraDetails" text,
	"dataSources" text,
	"updatedAt" timestamp (3) NOT NULL,
	"createdAt" timestamp (3) NOT NULL,
	"updatedByUserId" text,
	"createdByUserId" text,
	"statisticsId" text NOT NULL,
	CONSTRAINT "skill_statisticsId_unique" UNIQUE("statisticsId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skill_cost" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"costFormula" text NOT NULL,
	"skillEffectId" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skill_effect" (
	"id" text PRIMARY KEY NOT NULL,
	"condition" text NOT NULL,
	"description" text,
	"actionBaseDurationFormula" text NOT NULL,
	"actionModifiableDurationFormula" text NOT NULL,
	"skillExtraActionType" "SkillExtraActionType" NOT NULL,
	"chantingBaseDurationFormula" text NOT NULL,
	"chantingModifiableDurationFormula" text NOT NULL,
	"chargingBaseDurationFormula" text NOT NULL,
	"chargingModifiableDurationFormula" text NOT NULL,
	"skillStartupFramesFormula" text,
	"belongToskillId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skill_yield" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"yieldType" "YieldType" NOT NULL,
	"yieldFormula" text NOT NULL,
	"mutationTimingFormula" text,
	"skillEffectId" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "special_equipment" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"modifiersListId" text NOT NULL,
	"extraDetails" text,
	"dataSources" text,
	"updatedAt" timestamp (3) NOT NULL,
	"createdAt" timestamp (3) NOT NULL,
	"updatedByUserId" text,
	"createdByUserId" text,
	"statisticsId" text NOT NULL,
	CONSTRAINT "special_equipment_statisticsId_unique" UNIQUE("statisticsId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "statistics" (
	"id" text PRIMARY KEY NOT NULL,
	"monsterId" text,
	"crystalId" text,
	"mainWeaponId" text,
	"subWeaponId" text,
	"bodyArmorId" text,
	"additionalEquipmentId" text,
	"specialEquipmentId" text,
	"skillId" text,
	"petId" text,
	"consumableId" text,
	"characterId" text,
	"analyzerId" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "step" (
	"id" text PRIMARY KEY NOT NULL,
	"order" integer NOT NULL,
	"skillId" text NOT NULL,
	"processId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sub_weapon" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"subWeaponType" "SubWeaponType" NOT NULL,
	"baseAtk" integer NOT NULL,
	"refinement" integer NOT NULL,
	"stability" integer NOT NULL,
	"element" "Element" NOT NULL,
	"modifiersListId" text NOT NULL,
	"extraDetails" text,
	"dataSources" text,
	"updatedAt" timestamp (3) NOT NULL,
	"createdAt" timestamp (3) NOT NULL,
	"updatedByUserId" text,
	"createdByUserId" text,
	"statisticsId" text NOT NULL,
	CONSTRAINT "sub_weapon_statisticsId_unique" UNIQUE("statisticsId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usage_timestamp" (
	"timestamp" timestamp (3) PRIMARY KEY NOT NULL,
	"statisticsId" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp (3),
	"image" text,
	"userRole" "UserRole" NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_create_data" (
	"userId" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_update_data" (
	"userId" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification_token" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp (3) NOT NULL,
	CONSTRAINT "verification_token_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "view_timestamp" (
	"timestamp" timestamp (3) PRIMARY KEY NOT NULL,
	"statisticsId" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "additional_equipment" ADD CONSTRAINT "additional_equipment_modifiersListId_modifiers_list_id_fk" FOREIGN KEY ("modifiersListId") REFERENCES "public"."modifiers_list"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "additional_equipment" ADD CONSTRAINT "additional_equipment_updatedByUserId_user_update_data_userId_fk" FOREIGN KEY ("updatedByUserId") REFERENCES "public"."user_update_data"("userId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "additional_equipment" ADD CONSTRAINT "additional_equipment_createdByUserId_user_create_data_userId_fk" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user_create_data"("userId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "additional_equipment" ADD CONSTRAINT "additional_equipment_statisticsId_statistics_id_fk" FOREIGN KEY ("statisticsId") REFERENCES "public"."statistics"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "_additional_equipmentTocrystal" ADD CONSTRAINT "_additional_equipmentTocrystal_A_crystal_id_fk" FOREIGN KEY ("A") REFERENCES "public"."crystal"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "_additional_equipmentTocrystal" ADD CONSTRAINT "_additional_equipmentTocrystal_B_additional_equipment_id_fk" FOREIGN KEY ("B") REFERENCES "public"."additional_equipment"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analyzer" ADD CONSTRAINT "analyzer_monsterId_monster_id_fk" FOREIGN KEY ("monsterId") REFERENCES "public"."monster"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analyzer" ADD CONSTRAINT "analyzer_characterId_character_id_fk" FOREIGN KEY ("characterId") REFERENCES "public"."character"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analyzer" ADD CONSTRAINT "analyzer_updatedByUserId_user_update_data_userId_fk" FOREIGN KEY ("updatedByUserId") REFERENCES "public"."user_update_data"("userId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analyzer" ADD CONSTRAINT "analyzer_createdByUserId_user_create_data_userId_fk" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user_create_data"("userId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analyzer" ADD CONSTRAINT "analyzer_statisticsId_statistics_id_fk" FOREIGN KEY ("statisticsId") REFERENCES "public"."statistics"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "body_armor" ADD CONSTRAINT "body_armor_modifiersListId_modifiers_list_id_fk" FOREIGN KEY ("modifiersListId") REFERENCES "public"."modifiers_list"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "body_armor" ADD CONSTRAINT "body_armor_updatedByUserId_user_update_data_userId_fk" FOREIGN KEY ("updatedByUserId") REFERENCES "public"."user_update_data"("userId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "body_armor" ADD CONSTRAINT "body_armor_createdByUserId_user_create_data_userId_fk" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user_create_data"("userId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "body_armor" ADD CONSTRAINT "body_armor_statisticsId_statistics_id_fk" FOREIGN KEY ("statisticsId") REFERENCES "public"."statistics"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "_body_armorTocrystal" ADD CONSTRAINT "_body_armorTocrystal_A_crystal_id_fk" FOREIGN KEY ("A") REFERENCES "public"."crystal"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "_body_armorTocrystal" ADD CONSTRAINT "_body_armorTocrystal_B_body_armor_id_fk" FOREIGN KEY ("B") REFERENCES "public"."body_armor"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "character" ADD CONSTRAINT "character_mainWeaponId_main_weapon_id_fk" FOREIGN KEY ("mainWeaponId") REFERENCES "public"."main_weapon"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "character" ADD CONSTRAINT "character_subWeaponId_sub_weapon_id_fk" FOREIGN KEY ("subWeaponId") REFERENCES "public"."sub_weapon"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "character" ADD CONSTRAINT "character_bodyArmorId_body_armor_id_fk" FOREIGN KEY ("bodyArmorId") REFERENCES "public"."body_armor"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "character" ADD CONSTRAINT "character_additionalEquipmentId_additional_equipment_id_fk" FOREIGN KEY ("additionalEquipmentId") REFERENCES "public"."additional_equipment"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "character" ADD CONSTRAINT "character_specialEquipmentId_special_equipment_id_fk" FOREIGN KEY ("specialEquipmentId") REFERENCES "public"."special_equipment"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "character" ADD CONSTRAINT "character_fashionModifiersListId_modifiers_list_id_fk" FOREIGN KEY ("fashionModifiersListId") REFERENCES "public"."modifiers_list"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "character" ADD CONSTRAINT "character_CuisineModifiersListId_modifiers_list_id_fk" FOREIGN KEY ("CuisineModifiersListId") REFERENCES "public"."modifiers_list"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "character" ADD CONSTRAINT "character_petId_pet_id_fk" FOREIGN KEY ("petId") REFERENCES "public"."pet"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "character" ADD CONSTRAINT "character_modifiersListId_modifiers_list_id_fk" FOREIGN KEY ("modifiersListId") REFERENCES "public"."modifiers_list"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "character" ADD CONSTRAINT "character_updatedByUserId_user_update_data_userId_fk" FOREIGN KEY ("updatedByUserId") REFERENCES "public"."user_update_data"("userId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "character" ADD CONSTRAINT "character_createdByUserId_user_create_data_userId_fk" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user_create_data"("userId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "character" ADD CONSTRAINT "character_statisticsId_statistics_id_fk" FOREIGN KEY ("statisticsId") REFERENCES "public"."statistics"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "combo" ADD CONSTRAINT "combo_userCreateUserId_user_create_data_userId_fk" FOREIGN KEY ("userCreateUserId") REFERENCES "public"."user_create_data"("userId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "combo_step" ADD CONSTRAINT "combo_step_skillId_skill_id_fk" FOREIGN KEY ("skillId") REFERENCES "public"."skill"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "combo_step" ADD CONSTRAINT "combo_step_comboId_combo_id_fk" FOREIGN KEY ("comboId") REFERENCES "public"."combo"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "consumable" ADD CONSTRAINT "consumable_modifiersListId_modifiers_list_id_fk" FOREIGN KEY ("modifiersListId") REFERENCES "public"."modifiers_list"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "consumable" ADD CONSTRAINT "consumable_updatedByUserId_user_update_data_userId_fk" FOREIGN KEY ("updatedByUserId") REFERENCES "public"."user_update_data"("userId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "consumable" ADD CONSTRAINT "consumable_createdByUserId_user_create_data_userId_fk" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user_create_data"("userId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "consumable" ADD CONSTRAINT "consumable_statisticsId_statistics_id_fk" FOREIGN KEY ("statisticsId") REFERENCES "public"."statistics"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crystal" ADD CONSTRAINT "crystal_modifiersListId_modifiers_list_id_fk" FOREIGN KEY ("modifiersListId") REFERENCES "public"."modifiers_list"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crystal" ADD CONSTRAINT "crystal_updatedByUserId_user_update_data_userId_fk" FOREIGN KEY ("updatedByUserId") REFERENCES "public"."user_update_data"("userId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crystal" ADD CONSTRAINT "crystal_createdByUserId_user_create_data_userId_fk" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user_create_data"("userId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crystal" ADD CONSTRAINT "crystal_statisticsId_statistics_id_fk" FOREIGN KEY ("statisticsId") REFERENCES "public"."statistics"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "_crystalTomain_weapon" ADD CONSTRAINT "_crystalTomain_weapon_A_main_weapon_id_fk" FOREIGN KEY ("A") REFERENCES "public"."main_weapon"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "_crystalTomain_weapon" ADD CONSTRAINT "_crystalTomain_weapon_B_crystal_id_fk" FOREIGN KEY ("B") REFERENCES "public"."crystal"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "_crystalTospecial_equipment" ADD CONSTRAINT "_crystalTospecial_equipment_A_special_equipment_id_fk" FOREIGN KEY ("A") REFERENCES "public"."special_equipment"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "_crystalTospecial_equipment" ADD CONSTRAINT "_crystalTospecial_equipment_B_crystal_id_fk" FOREIGN KEY ("B") REFERENCES "public"."crystal"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "main_weapon" ADD CONSTRAINT "main_weapon_modifiersListId_modifiers_list_id_fk" FOREIGN KEY ("modifiersListId") REFERENCES "public"."modifiers_list"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "main_weapon" ADD CONSTRAINT "main_weapon_updatedByUserId_user_update_data_userId_fk" FOREIGN KEY ("updatedByUserId") REFERENCES "public"."user_update_data"("userId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "main_weapon" ADD CONSTRAINT "main_weapon_createdByUserId_user_create_data_userId_fk" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user_create_data"("userId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "main_weapon" ADD CONSTRAINT "main_weapon_statisticsId_statistics_id_fk" FOREIGN KEY ("statisticsId") REFERENCES "public"."statistics"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "modifier" ADD CONSTRAINT "modifier_belongToModifiersListId_modifiers_list_id_fk" FOREIGN KEY ("belongToModifiersListId") REFERENCES "public"."modifiers_list"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "monster" ADD CONSTRAINT "monster_updatedByUserId_user_update_data_userId_fk" FOREIGN KEY ("updatedByUserId") REFERENCES "public"."user_update_data"("userId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "monster" ADD CONSTRAINT "monster_createdByUserId_user_create_data_userId_fk" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user_create_data"("userId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "monster" ADD CONSTRAINT "monster_statisticsId_statistics_id_fk" FOREIGN KEY ("statisticsId") REFERENCES "public"."statistics"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pet" ADD CONSTRAINT "pet_updatedByUserId_user_update_data_userId_fk" FOREIGN KEY ("updatedByUserId") REFERENCES "public"."user_update_data"("userId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pet" ADD CONSTRAINT "pet_createdByUserId_user_create_data_userId_fk" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user_create_data"("userId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pet" ADD CONSTRAINT "pet_statisticsId_statistics_id_fk" FOREIGN KEY ("statisticsId") REFERENCES "public"."statistics"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post" ADD CONSTRAINT "post_createdById_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "process" ADD CONSTRAINT "process_analyzerId_analyzer_id_fk" FOREIGN KEY ("analyzerId") REFERENCES "public"."analyzer"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rate" ADD CONSTRAINT "rate_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rate" ADD CONSTRAINT "rate_statisticsId_statistics_id_fk" FOREIGN KEY ("statisticsId") REFERENCES "public"."statistics"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "skill" ADD CONSTRAINT "skill_updatedByUserId_user_update_data_userId_fk" FOREIGN KEY ("updatedByUserId") REFERENCES "public"."user_update_data"("userId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "skill" ADD CONSTRAINT "skill_createdByUserId_user_create_data_userId_fk" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user_create_data"("userId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "skill" ADD CONSTRAINT "skill_statisticsId_statistics_id_fk" FOREIGN KEY ("statisticsId") REFERENCES "public"."statistics"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "skill_cost" ADD CONSTRAINT "skill_cost_skillEffectId_skill_effect_id_fk" FOREIGN KEY ("skillEffectId") REFERENCES "public"."skill_effect"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "skill_effect" ADD CONSTRAINT "skill_effect_belongToskillId_skill_id_fk" FOREIGN KEY ("belongToskillId") REFERENCES "public"."skill"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "skill_yield" ADD CONSTRAINT "skill_yield_skillEffectId_skill_effect_id_fk" FOREIGN KEY ("skillEffectId") REFERENCES "public"."skill_effect"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "special_equipment" ADD CONSTRAINT "special_equipment_modifiersListId_modifiers_list_id_fk" FOREIGN KEY ("modifiersListId") REFERENCES "public"."modifiers_list"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "special_equipment" ADD CONSTRAINT "special_equipment_updatedByUserId_user_update_data_userId_fk" FOREIGN KEY ("updatedByUserId") REFERENCES "public"."user_update_data"("userId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "special_equipment" ADD CONSTRAINT "special_equipment_createdByUserId_user_create_data_userId_fk" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user_create_data"("userId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "special_equipment" ADD CONSTRAINT "special_equipment_statisticsId_statistics_id_fk" FOREIGN KEY ("statisticsId") REFERENCES "public"."statistics"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "step" ADD CONSTRAINT "step_skillId_skill_id_fk" FOREIGN KEY ("skillId") REFERENCES "public"."skill"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "step" ADD CONSTRAINT "step_processId_process_id_fk" FOREIGN KEY ("processId") REFERENCES "public"."process"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sub_weapon" ADD CONSTRAINT "sub_weapon_modifiersListId_modifiers_list_id_fk" FOREIGN KEY ("modifiersListId") REFERENCES "public"."modifiers_list"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sub_weapon" ADD CONSTRAINT "sub_weapon_updatedByUserId_user_update_data_userId_fk" FOREIGN KEY ("updatedByUserId") REFERENCES "public"."user_update_data"("userId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sub_weapon" ADD CONSTRAINT "sub_weapon_createdByUserId_user_create_data_userId_fk" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user_create_data"("userId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sub_weapon" ADD CONSTRAINT "sub_weapon_statisticsId_statistics_id_fk" FOREIGN KEY ("statisticsId") REFERENCES "public"."statistics"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "usage_timestamp" ADD CONSTRAINT "usage_timestamp_statisticsId_statistics_id_fk" FOREIGN KEY ("statisticsId") REFERENCES "public"."statistics"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_create_data" ADD CONSTRAINT "user_create_data_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_update_data" ADD CONSTRAINT "user_update_data_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "view_timestamp" ADD CONSTRAINT "view_timestamp_statisticsId_statistics_id_fk" FOREIGN KEY ("statisticsId") REFERENCES "public"."statistics"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "account_provider_providerAccountId_key" ON "account" USING btree ("provider","providerAccountId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "verification_token_identifier_token_key" ON "verification_token" USING btree ("identifier","token");
`,
);

export const db = drizzle(pg, { schema });
