/// <reference lib="webworker" />

import { PGlite } from "@electric-sql/pglite";
import { electricSync } from "@electric-sql/pglite-sync";
import { live } from "@electric-sql/pglite/live";
import { worker } from "@electric-sql/pglite/worker";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "~/../db/schema";
import { createId } from "@paralleldrive/cuid2";

worker({
  async init() {
    const pg = await PGlite.create({
      // dataDir: "idb://toram-calculator-db",
      relaxedDurability: true,
      //   debug: 5,
      extensions: {
        live,
        electric: electricSync({ debug: false }),
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
      "extraDetails" text NOT NULL,
      "dataSources" text NOT NULL,
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
      "name" text NOT NULL,
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
      "extraDetails" text NOT NULL,
      "dataSources" text NOT NULL,
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
      "extraDetails" text NOT NULL,
      "updatedAt" timestamp (3) NOT NULL,
      "createdAt" timestamp (3) NOT NULL,
      "updatedByUserId" text,
      "createdByUserId" text,
      "statisticsId" text NOT NULL,
      "imageId" text NOT NULL,
      CONSTRAINT "character_fashionModifiersListId_unique" UNIQUE("fashionModifiersListId"),
      CONSTRAINT "character_CuisineModifiersListId_unique" UNIQUE("CuisineModifiersListId"),
      CONSTRAINT "character_modifiersListId_unique" UNIQUE("modifiersListId"),
      CONSTRAINT "character_statisticsId_unique" UNIQUE("statisticsId"),
      CONSTRAINT "character_imageId_unique" UNIQUE("imageId")
    );
    --> statement-breakpoint
    CREATE TABLE IF NOT EXISTS "combo" (
      "id" text PRIMARY KEY NOT NULL,
      "name" text NOT NULL,
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
      "extraDetails" text NOT NULL,
      "dataSources" text NOT NULL,
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
    CREATE TABLE IF NOT EXISTS "image" (
      "id" text PRIMARY KEY NOT NULL,
      "dataUrl" text NOT NULL,
      "main_weaponId" text,
      "sub_weaponId" text,
      "body_armorId" text,
      "additional_equipmentId" text,
      "special_equipmentId" text
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
      "extraDetails" text NOT NULL,
      "dataSources" text NOT NULL,
      "updatedAt" timestamp (3) NOT NULL,
      "createdAt" timestamp (3) NOT NULL,
      "updatedByUserId" text,
      "createdByUserId" text,
      "statisticsId" text NOT NULL,
      CONSTRAINT "main_weapon_statisticsId_unique" UNIQUE("statisticsId")
    );
    --> statement-breakpoint
    CREATE TABLE IF NOT EXISTS "memeber" (
      "id" text PRIMARY KEY NOT NULL,
      "characterId" text NOT NULL,
      "flow" jsonb NOT NULL
    );
    --> statement-breakpoint
    CREATE TABLE IF NOT EXISTS "mob" (
      "id" text PRIMARY KEY NOT NULL,
      "monsterId" text NOT NULL,
      "star" integer NOT NULL,
      "flow" text NOT NULL
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
      "name" text NOT NULL
    );
    --> statement-breakpoint
    CREATE TABLE IF NOT EXISTS "monster" (
      "id" text PRIMARY KEY NOT NULL,
      "name" text NOT NULL,
      "monsterType" "MonsterType" NOT NULL,
      "baseLv" integer NOT NULL,
      "experience" integer NOT NULL,
      "address" text NOT NULL,
      "element" "Element" NOT NULL,
      "radius" integer NOT NULL,
      "maxhp" integer NOT NULL,
      "physicalDefense" integer NOT NULL,
      "physicalResistance" integer NOT NULL,
      "magicalDefense" integer NOT NULL,
      "magicalResistance" integer NOT NULL,
      "criticalResistance" integer NOT NULL,
      "avoidance" integer NOT NULL,
      "dodge" integer NOT NULL,
      "block" integer NOT NULL,
      "normalAttackResistanceModifier" integer NOT NULL,
      "physicalAttackResistanceModifier" integer NOT NULL,
      "magicalAttackResistanceModifier" integer NOT NULL,
      "difficultyOfTank" integer NOT NULL,
      "difficultyOfMelee" integer NOT NULL,
      "difficultyOfRanged" integer NOT NULL,
      "possibilityOfRunningAround" integer NOT NULL,
      "extraDetails" text NOT NULL,
      "dataSources" text NOT NULL,
      "updatedAt" timestamp (3) NOT NULL,
      "createdAt" timestamp (3) NOT NULL,
      "updatedByUserId" text,
      "createdByUserId" text,
      "statisticsId" text NOT NULL,
      "imageId" text NOT NULL,
      CONSTRAINT "monster_statisticsId_unique" UNIQUE("statisticsId")
    );
    --> statement-breakpoint
    CREATE TABLE IF NOT EXISTS "pet" (
      "id" text PRIMARY KEY NOT NULL,
      "name" text NOT NULL,
      "extraDetails" text NOT NULL,
      "dataSources" text NOT NULL,
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
      "id" text PRIMARY KEY NOT NULL
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
      "extraDetails" text NOT NULL,
      "dataSources" text NOT NULL,
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
      "description" text NOT NULL,
      "actionBaseDurationFormula" text NOT NULL,
      "actionModifiableDurationFormula" text NOT NULL,
      "skillExtraActionType" "SkillExtraActionType" NOT NULL,
      "chantingBaseDurationFormula" text NOT NULL,
      "chantingModifiableDurationFormula" text NOT NULL,
      "chargingBaseDurationFormula" text NOT NULL,
      "chargingModifiableDurationFormula" text NOT NULL,
      "skillStartupFramesFormula" text NOT NULL,
      "belongToskillId" text NOT NULL
    );
    --> statement-breakpoint
    CREATE TABLE IF NOT EXISTS "skill_yield" (
      "id" text PRIMARY KEY NOT NULL,
      "name" text NOT NULL,
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
      "extraDetails" text NOT NULL,
      "dataSources" text NOT NULL,
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
      "extraDetails" text NOT NULL,
      "dataSources" text NOT NULL,
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
     ALTER TABLE "account" ADD CONSTRAINT "account_user_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "additional_equipment" ADD CONSTRAINT "additional_equipment_modifiersList_fkey" FOREIGN KEY ("modifiersListId") REFERENCES "public"."modifiers_list"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "additional_equipment" ADD CONSTRAINT "additional_equipment_updatedBy_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "public"."user_update_data"("userId") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "additional_equipment" ADD CONSTRAINT "additional_equipment_createdBy_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user_create_data"("userId") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "additional_equipment" ADD CONSTRAINT "additional_equipment_statistics_fkey" FOREIGN KEY ("statisticsId") REFERENCES "public"."statistics"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "_additional_equipmentTocrystal" ADD CONSTRAINT "_additional_equipmentTocrystal_crystal_fkey" FOREIGN KEY ("A") REFERENCES "public"."crystal"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "_additional_equipmentTocrystal" ADD CONSTRAINT "_additional_equipmentTocrystal_additional_equipment_fkey" FOREIGN KEY ("B") REFERENCES "public"."additional_equipment"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "analyzer" ADD CONSTRAINT "analyzer_updatedBy_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "public"."user_update_data"("userId") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "analyzer" ADD CONSTRAINT "analyzer_createdBy_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user_create_data"("userId") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "analyzer" ADD CONSTRAINT "analyzer_statistics_fkey" FOREIGN KEY ("statisticsId") REFERENCES "public"."statistics"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "body_armor" ADD CONSTRAINT "body_armor_modifiersList_fkey" FOREIGN KEY ("modifiersListId") REFERENCES "public"."modifiers_list"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "body_armor" ADD CONSTRAINT "body_armor_updatedBy_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "public"."user_update_data"("userId") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "body_armor" ADD CONSTRAINT "body_armor_createdBy_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user_create_data"("userId") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "body_armor" ADD CONSTRAINT "body_armor_statistics_fkey" FOREIGN KEY ("statisticsId") REFERENCES "public"."statistics"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "_body_armorTocrystal" ADD CONSTRAINT "_body_armorTocrystal_crystal_fkey" FOREIGN KEY ("A") REFERENCES "public"."crystal"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "_body_armorTocrystal" ADD CONSTRAINT "_body_armorTocrystal_body_armor_fkey" FOREIGN KEY ("B") REFERENCES "public"."body_armor"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "character" ADD CONSTRAINT "character_mainWeapon_fkey" FOREIGN KEY ("mainWeaponId") REFERENCES "public"."main_weapon"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "character" ADD CONSTRAINT "character_subWeapon_fkey" FOREIGN KEY ("subWeaponId") REFERENCES "public"."sub_weapon"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "character" ADD CONSTRAINT "character_bodyArmor_fkey" FOREIGN KEY ("bodyArmorId") REFERENCES "public"."body_armor"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "character" ADD CONSTRAINT "character_additionalEquipment_fkey" FOREIGN KEY ("additionalEquipmentId") REFERENCES "public"."additional_equipment"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "character" ADD CONSTRAINT "character_specialEquipment_fkey" FOREIGN KEY ("specialEquipmentId") REFERENCES "public"."special_equipment"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "character" ADD CONSTRAINT "character_fashion_fkey" FOREIGN KEY ("fashionModifiersListId") REFERENCES "public"."modifiers_list"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "character" ADD CONSTRAINT "character_cuisine_fkey" FOREIGN KEY ("CuisineModifiersListId") REFERENCES "public"."modifiers_list"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "character" ADD CONSTRAINT "character_pet_fkey" FOREIGN KEY ("petId") REFERENCES "public"."pet"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "character" ADD CONSTRAINT "character_modifiersList_fkey" FOREIGN KEY ("modifiersListId") REFERENCES "public"."modifiers_list"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "character" ADD CONSTRAINT "character_updatedBy_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "public"."user_update_data"("userId") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "character" ADD CONSTRAINT "character_createdBy_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user_create_data"("userId") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "character" ADD CONSTRAINT "character_statistics_fkey" FOREIGN KEY ("statisticsId") REFERENCES "public"."statistics"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "character" ADD CONSTRAINT "character_image_fkey" FOREIGN KEY ("imageId") REFERENCES "public"."image"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "combo" ADD CONSTRAINT "combo_user_create_data_fkey" FOREIGN KEY ("userCreateUserId") REFERENCES "public"."user_create_data"("userId") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "combo_step" ADD CONSTRAINT "combo_step_skill_fkey" FOREIGN KEY ("skillId") REFERENCES "public"."skill"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "combo_step" ADD CONSTRAINT "combo_step_belongToCombo_fkey" FOREIGN KEY ("comboId") REFERENCES "public"."combo"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "consumable" ADD CONSTRAINT "consumable_modifiersList_fkey" FOREIGN KEY ("modifiersListId") REFERENCES "public"."modifiers_list"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "consumable" ADD CONSTRAINT "consumable_updatedBy_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "public"."user_update_data"("userId") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "consumable" ADD CONSTRAINT "consumable_createdBy_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user_create_data"("userId") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "consumable" ADD CONSTRAINT "consumable_statistics_fkey" FOREIGN KEY ("statisticsId") REFERENCES "public"."statistics"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "crystal" ADD CONSTRAINT "crystal_modifiersList_fkey" FOREIGN KEY ("modifiersListId") REFERENCES "public"."modifiers_list"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "crystal" ADD CONSTRAINT "crystal_updatedBy_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "public"."user_update_data"("userId") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "crystal" ADD CONSTRAINT "crystal_createdBy_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user_create_data"("userId") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "crystal" ADD CONSTRAINT "crystal_statistics_fkey" FOREIGN KEY ("statisticsId") REFERENCES "public"."statistics"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "_crystalTomain_weapon" ADD CONSTRAINT "_crystalTomain_weapon_main_weapon_fkey" FOREIGN KEY ("A") REFERENCES "public"."main_weapon"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "_crystalTomain_weapon" ADD CONSTRAINT "_crystalTomain_weapon_crystal_fkey" FOREIGN KEY ("B") REFERENCES "public"."crystal"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "_crystalTospecial_equipment" ADD CONSTRAINT "_crystalTospecial_equipment_special_equipment_fkey" FOREIGN KEY ("A") REFERENCES "public"."special_equipment"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "_crystalTospecial_equipment" ADD CONSTRAINT "_crystalTospecial_equipment_crystal_fkey" FOREIGN KEY ("B") REFERENCES "public"."crystal"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "image" ADD CONSTRAINT "image_belongToMainWeapon_fkey" FOREIGN KEY ("main_weaponId") REFERENCES "public"."main_weapon"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "image" ADD CONSTRAINT "image_belongToSubWeapon_fkey" FOREIGN KEY ("sub_weaponId") REFERENCES "public"."sub_weapon"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "image" ADD CONSTRAINT "image_belongToBodyArmor_fkey" FOREIGN KEY ("body_armorId") REFERENCES "public"."body_armor"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "image" ADD CONSTRAINT "image_belongToAdditionalEquipment_fkey" FOREIGN KEY ("additional_equipmentId") REFERENCES "public"."additional_equipment"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "image" ADD CONSTRAINT "image_belongToSpecialEquipment_fkey" FOREIGN KEY ("special_equipmentId") REFERENCES "public"."special_equipment"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "main_weapon" ADD CONSTRAINT "main_weapon_modifiersList_fkey" FOREIGN KEY ("modifiersListId") REFERENCES "public"."modifiers_list"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "main_weapon" ADD CONSTRAINT "main_weapon_updatedBy_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "public"."user_update_data"("userId") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "main_weapon" ADD CONSTRAINT "main_weapon_createdBy_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user_create_data"("userId") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "main_weapon" ADD CONSTRAINT "main_weapon_statistics_fkey" FOREIGN KEY ("statisticsId") REFERENCES "public"."statistics"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "memeber" ADD CONSTRAINT "memeber_character_fkey" FOREIGN KEY ("characterId") REFERENCES "public"."character"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "mob" ADD CONSTRAINT "mob_monster_fkey" FOREIGN KEY ("monsterId") REFERENCES "public"."monster"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "modifier" ADD CONSTRAINT "modifier_belongToModifiersList_fkey" FOREIGN KEY ("belongToModifiersListId") REFERENCES "public"."modifiers_list"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "monster" ADD CONSTRAINT "monster_updatedBy_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "public"."user_update_data"("userId") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "monster" ADD CONSTRAINT "monster_createdBy_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user_create_data"("userId") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "monster" ADD CONSTRAINT "monster_statistics_fkey" FOREIGN KEY ("statisticsId") REFERENCES "public"."statistics"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "monster" ADD CONSTRAINT "monster_image_fkey" FOREIGN KEY ("imageId") REFERENCES "public"."image"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "pet" ADD CONSTRAINT "pet_updatedBy_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "public"."user_update_data"("userId") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "pet" ADD CONSTRAINT "pet_createdBy_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user_create_data"("userId") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "pet" ADD CONSTRAINT "pet_statistics_fkey" FOREIGN KEY ("statisticsId") REFERENCES "public"."statistics"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "post" ADD CONSTRAINT "post_createdBy_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "rate" ADD CONSTRAINT "rate_belongToUser_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "rate" ADD CONSTRAINT "rate_belongToStatistics_fkey" FOREIGN KEY ("statisticsId") REFERENCES "public"."statistics"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "session" ADD CONSTRAINT "session_user_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "skill" ADD CONSTRAINT "skill_updatedBy_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "public"."user_update_data"("userId") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "skill" ADD CONSTRAINT "skill_createdBy_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user_create_data"("userId") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "skill" ADD CONSTRAINT "skill_statistics_fkey" FOREIGN KEY ("statisticsId") REFERENCES "public"."statistics"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "skill_cost" ADD CONSTRAINT "skill_cost_belongToSkillEffect_fkey" FOREIGN KEY ("skillEffectId") REFERENCES "public"."skill_effect"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "skill_effect" ADD CONSTRAINT "skill_effect_belongToSkill_fkey" FOREIGN KEY ("belongToskillId") REFERENCES "public"."skill"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "skill_yield" ADD CONSTRAINT "skill_yield_belongToSkillEffect_fkey" FOREIGN KEY ("skillEffectId") REFERENCES "public"."skill_effect"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "special_equipment" ADD CONSTRAINT "special_equipment_modifiersList_fkey" FOREIGN KEY ("modifiersListId") REFERENCES "public"."modifiers_list"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "special_equipment" ADD CONSTRAINT "special_equipment_updatedBy_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "public"."user_update_data"("userId") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "special_equipment" ADD CONSTRAINT "special_equipment_createdBy_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user_create_data"("userId") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "special_equipment" ADD CONSTRAINT "special_equipment_statistics_fkey" FOREIGN KEY ("statisticsId") REFERENCES "public"."statistics"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "step" ADD CONSTRAINT "step_skill_fkey" FOREIGN KEY ("skillId") REFERENCES "public"."skill"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "step" ADD CONSTRAINT "step_belongToProcess_fkey" FOREIGN KEY ("processId") REFERENCES "public"."process"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "sub_weapon" ADD CONSTRAINT "sub_weapon_modifiersList_fkey" FOREIGN KEY ("modifiersListId") REFERENCES "public"."modifiers_list"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "sub_weapon" ADD CONSTRAINT "sub_weapon_updatedBy_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "public"."user_update_data"("userId") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "sub_weapon" ADD CONSTRAINT "sub_weapon_createdBy_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."user_create_data"("userId") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "sub_weapon" ADD CONSTRAINT "sub_weapon_statistics_fkey" FOREIGN KEY ("statisticsId") REFERENCES "public"."statistics"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "usage_timestamp" ADD CONSTRAINT "usage_timestamp_usedByStatistics_fkey" FOREIGN KEY ("statisticsId") REFERENCES "public"."statistics"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "user_create_data" ADD CONSTRAINT "user_create_data_belongToUser_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "user_update_data" ADD CONSTRAINT "user_update_data_belongToUser_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    DO $$ BEGIN
     ALTER TABLE "view_timestamp" ADD CONSTRAINT "view_timestamp_usedByStatistics_fkey" FOREIGN KEY ("statisticsId") REFERENCES "public"."statistics"("id") ON DELETE cascade ON UPDATE cascade;
    EXCEPTION
     WHEN duplicate_object THEN null;
    END $$;
    --> statement-breakpoint
    CREATE UNIQUE INDEX IF NOT EXISTS "account_provider_providerAccountId_key" ON "account" USING btree ("provider","providerAccountId");--> statement-breakpoint
    CREATE UNIQUE INDEX IF NOT EXISTS "verification_token_identifier_token_key" ON "verification_token" USING btree ("identifier","token");
    `,
    );
    await pg.electric.syncShapeToTable({
      url: "https://test.kiaclouth.com/v1/shape/user",
      table: "user",
      shapeId: "user",
      primaryKey: ["id"],
    });
    await pg.electric.syncShapeToTable({
      url: "https://test.kiaclouth.com/v1/shape/user_create_data",
      table: "user_create_data",
      shapeId: "user_create_data",
      primaryKey: ["userId"],
    });
    await pg.electric.syncShapeToTable({
      url: "https://test.kiaclouth.com/v1/shape/user_update_data",
      table: "user_update_data",
      shapeId: "user_update_data",
      primaryKey: ["userId"],
    });
    await pg.electric.syncShapeToTable({
      url: "https://test.kiaclouth.com/v1/shape/statistics",
      table: "statistics",
      shapeId: "statistics",
      primaryKey: ["id"],
    });
    await pg.electric.syncShapeToTable({
      url: "https://test.kiaclouth.com/v1/shape/image",
      table: "image",
      shapeId: "image",
      primaryKey: ["id"],
    });
    await pg.electric.syncShapeToTable({
      url: "https://test.kiaclouth.com/v1/shape/monster",
      table: "monster",
      shapeId: "monster",
      primaryKey: ["id"],
    });
    // const db = drizzle(pg, { schema });
    // const sql = db.query.monster.findMany().toSQL().sql;
    // pg.live.query(sql, [], (res) => {
    //   console.log("live query result:", res);
    // });

    return pg;
  },
});
