-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Element" AS ENUM ('NO_ELEMENT', 'LIGHT', 'DARK', 'WATER', 'FIRE', 'EARTH', 'WIND');

-- CreateEnum
CREATE TYPE "MonsterType" AS ENUM ('COMMON_MOBS', 'COMMON_MINI_BOSS', 'COMMON_BOSS', 'EVENT_MOBS', 'EVENT_MINI_BOSS', 'EVENT_BOSS');

-- CreateEnum
CREATE TYPE "ModifiersName" AS ENUM ('STR', 'INT', 'VIT', 'AGI', 'DEX', 'MAX_MP', 'AGGRO', 'WEAPON_RANGE', 'HP_REGEN', 'MP_REGEN', 'PHYSICAL_ATK', 'MAGICAL_ATK', 'WEAPON_ATK', 'UNSHEATHE_ATK', 'PHYSICAL_PIERCE', 'MAGICAL_PIERCE', 'CRITICAL_RATE', 'CRITICAL_DAMAGE', 'MAGIC_CRT_CONVERSION_RATE', 'MAGIC_CRT_DAMAGE_CONVERSION_RATE', 'SHORT_RANGE_DAMAGE', 'LONG_RANGE_DAMAGE', 'STRONGER_AGAINST_NETURAL', 'STRONGER_AGAINST_LIGHT', 'STRONGER_AGAINST_DARK', 'STRONGER_AGAINST_WATER', 'STRONGER_AGAINST_FIRE', 'STRONGER_AGAINST_EARTH', 'STRONGER_AGAINST_WIND', 'STABILITY', 'ACCURACY', 'ADDITIONAL_PHYSICS', 'ADDITIONAL_MAGIC', 'ANTICIPATE', 'GUARD_BREAK', 'REFLECT', 'ABSOLUTA_ACCURACY', 'ATK_UP_STR', 'ATK_UP_INT', 'ATK_UP_VIT', 'ATK_UP_AGI', 'ATK_UP_DEX', 'MATK_UP_STR', 'MATK_UP_INT', 'MATK_UP_VIT', 'MATK_UP_AGI', 'MATK_UP_DEX', 'ATK_DOWN_STR', 'ATK_DOWN_INT', 'ATK_DOWN_VIT', 'ATK_DOWN_AGI', 'ATK_DOWN_DEX', 'MATK_DOWN_STR', 'MATK_DOWN_INT', 'MATK_DOWN_VIT', 'MATK_DOWN_AGI', 'MATK_DOWN_DEX', 'MAX_HP', 'PHYSICAL_DEF', 'MAGICAL_DEF', 'PHYSICAL_RESISTANCE', 'MAGICAL_RESISTANCE', 'NEUTRAL_RESISTANCE', 'LIGHT_RESISTANCE', 'DARK_RESISTANCE', 'WATER_RESISTANCE', 'FIRE_RESISTANCE', 'EARTH_RESISTANCE', 'WIND_RESISTANCE', 'DODGE', 'AILMENT_RESISTANCE', 'BASE_GUARD_POWER', 'GUARD_POWER', 'BASE_GUARD_RECHARGE', 'GUARD_RECHANGE', 'EVASION_RECHARGE', 'PHYSICAL_BARRIER', 'MAGICAL_BARRIER', 'FRACTIONAL_BARRIER', 'BARRIER_COOLDOWN', 'REDUCE_DMG_FLOOR', 'REDUCE_DMG_METEOR', 'REDUCE_DMG_PLAYER_EPICENTER', 'REDUCE_DMG_FOE_EPICENTER', 'REDUCE_DMG_BOWLING', 'REDUCE_DMG_BULLET', 'REDUCE_DMG_STRAIGHT_LINE', 'REDUCE_DMG_CHARGE', 'ABSOLUTE_DODGE', 'ASPD', 'CSPD', 'MSPD', 'DROP_RATE', 'REVIVE_TIME', 'FLINCH_UNAVAILABLE', 'TUMBLE_UNAVAILABLE', 'STUN_UNAVAILABLE', 'INVINCIBLE_AID', 'EXP_RATE', 'PET_EXP', 'ITEM_COOLDOWN', 'RECOIL_DAMAGE', 'GEM_POWDER_DROP');

-- CreateEnum
CREATE TYPE "SpecialAbiType" AS ENUM ('NOSPECIALABI', 'LUK', 'CRI', 'TEC', 'MEN');

-- CreateEnum
CREATE TYPE "CrystalType" AS ENUM ('GENERAL', 'WEAPONCRYSTAL', 'BODYCRYSTAL', 'ADDITIONALCRYSTAL', 'SPECIALCRYSTAL');

-- CreateEnum
CREATE TYPE "MainWeaponType" AS ENUM ('NO_WEAPON', 'ONE_HAND_SWORD', 'TWO_HANDS_SWORD', 'BOW', 'BOWGUN', 'STAFF', 'MAGIC_DEVICE', 'KNUCKLE', 'HALBERD', 'KATANA');

-- CreateEnum
CREATE TYPE "SubWeaponType" AS ENUM ('NO_WEAPON', 'ONE_HAND_SWORD', 'MAGIC_DEVICE', 'KNUCKLE', 'KATANA', 'ARROW', 'DAGGER', 'NINJUTSUSCROLL', 'SHIELD');

-- CreateEnum
CREATE TYPE "BodyArmorType" AS ENUM ('NORMAL', 'LIGHT', 'HEAVY');

-- CreateEnum
CREATE TYPE "SkillTreeName" AS ENUM ('BLADE', 'SHOT', 'MAGIC', 'MARTIAL', 'DUALSWORD', 'HALBERD', 'MONONOFU', 'CRUSHER', 'SPRITE');

-- CreateEnum
CREATE TYPE "SkillType" AS ENUM ('ACTIVE_SKILL', 'PASSIVE_SKILL');

-- CreateEnum
CREATE TYPE "SkillExtraActionType" AS ENUM ('None', 'Chanting', 'Charging');

-- CreateEnum
CREATE TYPE "YieldType" AS ENUM ('PersistentEffect', 'ImmediateEffect');

-- CreateEnum
CREATE TYPE "DurationType" AS ENUM ('FRAME', 'SKILL', 'UNLIMITED');

-- CreateEnum
CREATE TYPE "WeaponElementDependencyType" AS ENUM ('EXTEND', 'UNEXTEND');

-- CreateEnum
CREATE TYPE "ComboType" AS ENUM ('NULL');

-- CreateEnum
CREATE TYPE "CharacterType" AS ENUM ('Tank', 'Mage', 'Ranger', 'Marksman');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "userRole" "UserRole" NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_token" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "post" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_create_data" (
    "userId" TEXT NOT NULL,

    CONSTRAINT "user_create_data_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "user_update_data" (
    "userId" TEXT NOT NULL,

    CONSTRAINT "user_update_data_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "monster" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monsterType" "MonsterType" NOT NULL,
    "baseLv" INTEGER NOT NULL,
    "experience" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "element" "Element" NOT NULL,
    "radius" INTEGER NOT NULL,
    "maxhp" INTEGER NOT NULL,
    "physicalDefense" INTEGER NOT NULL,
    "physicalResistance" INTEGER NOT NULL,
    "magicalDefense" INTEGER NOT NULL,
    "magicalResistance" INTEGER NOT NULL,
    "criticalResistance" INTEGER NOT NULL,
    "avoidance" INTEGER NOT NULL,
    "dodge" INTEGER NOT NULL,
    "block" INTEGER NOT NULL,
    "normalAttackResistanceModifier" INTEGER NOT NULL,
    "physicalAttackResistanceModifier" INTEGER NOT NULL,
    "magicalAttackResistanceModifier" INTEGER NOT NULL,
    "difficultyOfTank" INTEGER NOT NULL,
    "difficultyOfMelee" INTEGER NOT NULL,
    "difficultyOfRanged" INTEGER NOT NULL,
    "possibilityOfRunningAround" INTEGER NOT NULL,
    "extraDetails" TEXT NOT NULL,
    "dataSources" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "statisticsId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "updatedByUserId" TEXT,
    "createdByUserId" TEXT,

    CONSTRAINT "monster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modifier" (
    "id" TEXT NOT NULL,
    "formula" TEXT NOT NULL,
    "belongToModifierListId" TEXT NOT NULL,

    CONSTRAINT "modifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modifier_list" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "modifier_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crystal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "crystalType" "CrystalType" NOT NULL,
    "front" INTEGER NOT NULL,
    "modifierListId" TEXT NOT NULL,
    "extraDetails" TEXT,
    "dataSources" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "statisticsId" TEXT NOT NULL,
    "updatedByUserId" TEXT,
    "createdByUserId" TEXT,

    CONSTRAINT "crystal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "main_weapon" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mainWeaponType" "MainWeaponType" NOT NULL,
    "baseAtk" INTEGER NOT NULL,
    "refinement" INTEGER NOT NULL,
    "stability" INTEGER NOT NULL,
    "element" "Element" NOT NULL,
    "modifierListId" TEXT NOT NULL,
    "extraDetails" TEXT NOT NULL,
    "dataSources" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "statisticsId" TEXT NOT NULL,
    "updatedByUserId" TEXT,
    "createdByUserId" TEXT,

    CONSTRAINT "main_weapon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_weapon" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subWeaponType" "SubWeaponType" NOT NULL,
    "baseAtk" INTEGER NOT NULL,
    "refinement" INTEGER NOT NULL,
    "stability" INTEGER NOT NULL,
    "element" "Element" NOT NULL,
    "modifierListId" TEXT NOT NULL,
    "extraDetails" TEXT NOT NULL,
    "dataSources" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "statisticsId" TEXT NOT NULL,
    "updatedByUserId" TEXT,
    "createdByUserId" TEXT,

    CONSTRAINT "sub_weapon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "body_armor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bodyArmorType" "BodyArmorType" NOT NULL,
    "refinement" INTEGER NOT NULL,
    "baseDef" INTEGER NOT NULL,
    "modifierListId" TEXT NOT NULL,
    "extraDetails" TEXT NOT NULL,
    "dataSources" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "statisticsId" TEXT NOT NULL,
    "updatedByUserId" TEXT,
    "createdByUserId" TEXT,

    CONSTRAINT "body_armor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "additional_equipment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "refinement" INTEGER NOT NULL,
    "modifierListId" TEXT NOT NULL,
    "extraDetails" TEXT NOT NULL,
    "dataSources" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "statisticsId" TEXT NOT NULL,
    "updatedByUserId" TEXT,
    "createdByUserId" TEXT,

    CONSTRAINT "additional_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "special_equipment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "modifierListId" TEXT NOT NULL,
    "extraDetails" TEXT NOT NULL,
    "dataSources" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "statisticsId" TEXT NOT NULL,
    "updatedByUserId" TEXT,
    "createdByUserId" TEXT,

    CONSTRAINT "special_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill" (
    "id" TEXT NOT NULL,
    "skillTreeName" "SkillTreeName" NOT NULL,
    "name" TEXT NOT NULL,
    "skillType" "SkillType" NOT NULL,
    "weaponElementDependencyType" "WeaponElementDependencyType" NOT NULL,
    "element" "Element" NOT NULL,
    "skillDescription" TEXT,
    "extraDetails" TEXT NOT NULL,
    "dataSources" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "statisticsId" TEXT NOT NULL,
    "updatedByUserId" TEXT,
    "createdByUserId" TEXT,

    CONSTRAINT "skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_effect" (
    "id" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "actionBaseDurationFormula" TEXT NOT NULL,
    "actionModifiableDurationFormula" TEXT NOT NULL,
    "skillExtraActionType" "SkillExtraActionType" NOT NULL,
    "chantingBaseDurationFormula" TEXT NOT NULL,
    "chantingModifiableDurationFormula" TEXT NOT NULL,
    "chargingBaseDurationFormula" TEXT NOT NULL,
    "chargingModifiableDurationFormula" TEXT NOT NULL,
    "skillStartupFramesFormula" TEXT NOT NULL,
    "belongToskillId" TEXT NOT NULL,

    CONSTRAINT "skill_effect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_cost" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "costFormula" TEXT NOT NULL,
    "skillEffectId" TEXT,

    CONSTRAINT "skill_cost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_yield" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "yieldType" "YieldType" NOT NULL,
    "yieldFormula" TEXT NOT NULL,
    "mutationTimingFormula" TEXT,
    "skillEffectId" TEXT,

    CONSTRAINT "skill_yield_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "extraDetails" TEXT NOT NULL,
    "dataSources" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "statisticsId" TEXT NOT NULL,
    "updatedByUserId" TEXT,
    "createdByUserId" TEXT,

    CONSTRAINT "pet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumable" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "modifierListId" TEXT NOT NULL,
    "extraDetails" TEXT NOT NULL,
    "dataSources" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "statisticsId" TEXT NOT NULL,
    "updatedByUserId" TEXT,
    "createdByUserId" TEXT,

    CONSTRAINT "consumable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdByUserId" TEXT,

    CONSTRAINT "combo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo_step" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "comboType" "ComboType" NOT NULL,
    "skillId" TEXT NOT NULL,
    "comboId" TEXT NOT NULL,

    CONSTRAINT "combo_step_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "characterType" "CharacterType" NOT NULL,
    "lv" INTEGER NOT NULL,
    "baseStr" INTEGER NOT NULL,
    "baseInt" INTEGER NOT NULL,
    "baseVit" INTEGER NOT NULL,
    "baseAgi" INTEGER NOT NULL,
    "baseDex" INTEGER NOT NULL,
    "specialAbiType" "SpecialAbiType" NOT NULL,
    "specialAbiValue" INTEGER NOT NULL,
    "mainWeaponId" TEXT NOT NULL,
    "subWeaponId" TEXT NOT NULL,
    "bodyArmorId" TEXT NOT NULL,
    "additionalEquipmentId" TEXT NOT NULL,
    "specialEquipmentId" TEXT NOT NULL,
    "fashionModifierListId" TEXT NOT NULL,
    "cuisineModifierListId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "modifierListId" TEXT NOT NULL,
    "extraDetails" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "statisticsId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "updatedByUserId" TEXT,
    "createdByUserId" TEXT,

    CONSTRAINT "character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "flow" JSONB NOT NULL,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mob" (
    "id" TEXT NOT NULL,
    "monsterId" TEXT NOT NULL,
    "star" INTEGER NOT NULL,
    "flow" TEXT NOT NULL,

    CONSTRAINT "mob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analyzer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "extraDetails" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "statisticsId" TEXT NOT NULL,
    "updatedByUserId" TEXT,
    "createdByUserId" TEXT,

    CONSTRAINT "analyzer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "process" (
    "id" TEXT NOT NULL,

    CONSTRAINT "process_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "step" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "skillId" TEXT NOT NULL,
    "processId" TEXT NOT NULL,

    CONSTRAINT "step_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statistics" (
    "id" TEXT NOT NULL,
    "monsterId" TEXT,
    "crystalId" TEXT,
    "mainWeaponId" TEXT,
    "subWeaponId" TEXT,
    "bodyArmorId" TEXT,
    "additionalEquipmentId" TEXT,
    "specialEquipmentId" TEXT,
    "skillId" TEXT,
    "petId" TEXT,
    "consumableId" TEXT,
    "characterId" TEXT,
    "analyzerId" TEXT,

    CONSTRAINT "statistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image" (
    "id" TEXT NOT NULL,
    "dataUrl" TEXT NOT NULL,
    "main_weaponId" TEXT,
    "sub_weaponId" TEXT,
    "body_armorId" TEXT,
    "additional_equipmentId" TEXT,
    "special_equipmentId" TEXT,

    CONSTRAINT "image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate" (
    "id" TEXT NOT NULL,
    "rate" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "statisticsId" TEXT NOT NULL,

    CONSTRAINT "rate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_timestamp" (
    "timestamp" TIMESTAMP(3) NOT NULL,
    "statisticsId" TEXT,

    CONSTRAINT "usage_timestamp_pkey" PRIMARY KEY ("timestamp")
);

-- CreateTable
CREATE TABLE "view_timestamp" (
    "timestamp" TIMESTAMP(3) NOT NULL,
    "statisticsId" TEXT,

    CONSTRAINT "view_timestamp_pkey" PRIMARY KEY ("timestamp")
);

-- CreateTable
CREATE TABLE "_crystalTomain_weapon" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_crystalTospecial_equipment" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_body_armorTocrystal" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_additional_equipmentTocrystal" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_characterToskill" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_characterToconsumable" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_characterTocombo" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_analyzerTomob" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_analyzerTomember" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "account_provider_providerAccountId_key" ON "account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "session_sessionToken_key" ON "session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_token_token_key" ON "verification_token"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_token_identifier_token_key" ON "verification_token"("identifier", "token");

-- CreateIndex
CREATE INDEX "post_name_idx" ON "post"("name");

-- CreateIndex
CREATE UNIQUE INDEX "monster_statisticsId_key" ON "monster"("statisticsId");

-- CreateIndex
CREATE UNIQUE INDEX "crystal_statisticsId_key" ON "crystal"("statisticsId");

-- CreateIndex
CREATE UNIQUE INDEX "main_weapon_statisticsId_key" ON "main_weapon"("statisticsId");

-- CreateIndex
CREATE UNIQUE INDEX "sub_weapon_statisticsId_key" ON "sub_weapon"("statisticsId");

-- CreateIndex
CREATE UNIQUE INDEX "body_armor_statisticsId_key" ON "body_armor"("statisticsId");

-- CreateIndex
CREATE UNIQUE INDEX "additional_equipment_statisticsId_key" ON "additional_equipment"("statisticsId");

-- CreateIndex
CREATE UNIQUE INDEX "special_equipment_statisticsId_key" ON "special_equipment"("statisticsId");

-- CreateIndex
CREATE UNIQUE INDEX "skill_statisticsId_key" ON "skill"("statisticsId");

-- CreateIndex
CREATE UNIQUE INDEX "pet_statisticsId_key" ON "pet"("statisticsId");

-- CreateIndex
CREATE UNIQUE INDEX "consumable_statisticsId_key" ON "consumable"("statisticsId");

-- CreateIndex
CREATE UNIQUE INDEX "character_fashionModifierListId_key" ON "character"("fashionModifierListId");

-- CreateIndex
CREATE UNIQUE INDEX "character_cuisineModifierListId_key" ON "character"("cuisineModifierListId");

-- CreateIndex
CREATE UNIQUE INDEX "character_modifierListId_key" ON "character"("modifierListId");

-- CreateIndex
CREATE UNIQUE INDEX "character_statisticsId_key" ON "character"("statisticsId");

-- CreateIndex
CREATE UNIQUE INDEX "character_imageId_key" ON "character"("imageId");

-- CreateIndex
CREATE UNIQUE INDEX "analyzer_statisticsId_key" ON "analyzer"("statisticsId");

-- CreateIndex
CREATE UNIQUE INDEX "_crystalTomain_weapon_AB_unique" ON "_crystalTomain_weapon"("A", "B");

-- CreateIndex
CREATE INDEX "_crystalTomain_weapon_B_index" ON "_crystalTomain_weapon"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_crystalTospecial_equipment_AB_unique" ON "_crystalTospecial_equipment"("A", "B");

-- CreateIndex
CREATE INDEX "_crystalTospecial_equipment_B_index" ON "_crystalTospecial_equipment"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_body_armorTocrystal_AB_unique" ON "_body_armorTocrystal"("A", "B");

-- CreateIndex
CREATE INDEX "_body_armorTocrystal_B_index" ON "_body_armorTocrystal"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_additional_equipmentTocrystal_AB_unique" ON "_additional_equipmentTocrystal"("A", "B");

-- CreateIndex
CREATE INDEX "_additional_equipmentTocrystal_B_index" ON "_additional_equipmentTocrystal"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_characterToskill_AB_unique" ON "_characterToskill"("A", "B");

-- CreateIndex
CREATE INDEX "_characterToskill_B_index" ON "_characterToskill"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_characterToconsumable_AB_unique" ON "_characterToconsumable"("A", "B");

-- CreateIndex
CREATE INDEX "_characterToconsumable_B_index" ON "_characterToconsumable"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_characterTocombo_AB_unique" ON "_characterTocombo"("A", "B");

-- CreateIndex
CREATE INDEX "_characterTocombo_B_index" ON "_characterTocombo"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_analyzerTomob_AB_unique" ON "_analyzerTomob"("A", "B");

-- CreateIndex
CREATE INDEX "_analyzerTomob_B_index" ON "_analyzerTomob"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_analyzerTomember_AB_unique" ON "_analyzerTomember"("A", "B");

-- CreateIndex
CREATE INDEX "_analyzerTomember_B_index" ON "_analyzerTomember"("B");