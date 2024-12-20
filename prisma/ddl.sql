-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Element" AS ENUM ('Normal', 'Light', 'Dark', 'Water', 'Fire', 'Earth', 'Wind');

-- CreateEnum
CREATE TYPE "MobType" AS ENUM ('Mob', 'MiniBoss', 'Boss');

-- CreateEnum
CREATE TYPE "SpecialAbiType" AS ENUM ('None', 'Luk', 'Cri', 'Tec', 'Men');

-- CreateEnum
CREATE TYPE "ArmorType" AS ENUM ('Normal', 'Light', 'Heavy');

-- CreateEnum
CREATE TYPE "SkillType" AS ENUM ('Active', 'Passive');

-- CreateEnum
CREATE TYPE "SkillTargetType" AS ENUM ('None', 'Self', 'Player', 'Enemy');

-- CreateEnum
CREATE TYPE "SkillChargingType" AS ENUM ('None', 'Chanting', 'Reservoir');

-- CreateEnum
CREATE TYPE "YieldType" AS ENUM ('PersistentEffect', 'ImmediateEffect');

-- CreateEnum
CREATE TYPE "DurationType" AS ENUM ('FRAME', 'SKILL', 'UNLIMITED');

-- CreateEnum
CREATE TYPE "MobDifficultyFlag" AS ENUM ('Easy', 'Normal', 'Hard', 'Lunatic', 'Ultimate');

-- CreateEnum
CREATE TYPE "MobDamageType" AS ENUM ('Physics', 'Magic', 'CurrentRate', 'MaxRate');

-- CreateEnum
CREATE TYPE "ComboType" AS ENUM ('NULL');

-- CreateEnum
CREATE TYPE "CharacterType" AS ENUM ('Tank', 'Mage', 'Ranger', 'Marksman');

-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('Normal', 'Limited');

-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('Metal', 'Cloth', 'Beast', 'Wood', 'Drug', 'Magic');

-- CreateEnum
CREATE TYPE "PartBreakReward" AS ENUM ('None', 'CanDrop', 'DropUp');

-- CreateEnum
CREATE TYPE "MobPart" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "AvailabilityType" AS ENUM ('permanent', 'event');

-- CreateEnum
CREATE TYPE "AcquisitionMethodType" AS ENUM ('Drop', 'Craft');

-- CreateEnum
CREATE TYPE "SkillDistanceResistType" AS ENUM ('None', 'Long', 'Short', 'Both');

-- CreateEnum
CREATE TYPE "Persona" AS ENUM ('Fervent', 'Intelligent', 'Mild', 'Swift', 'Justice', 'Devoted', 'Impulsive', 'Calm', 'Sly', 'Timid', 'Brave', 'Active', 'Sturdy', 'Steady', 'Max');

-- CreateEnum
CREATE TYPE "PetType" AS ENUM ('AllTrades', 'PhysicalAttack', 'MagicAttack', 'PhysicalDefense', 'MagicDefensem', 'Avoidance', 'Hit', 'SkillsEnhancement', 'Genius');

-- CreateEnum
CREATE TYPE "MercenaryType" AS ENUM ('Tank', 'Dps');

-- CreateEnum
CREATE TYPE "MercenarySkillType" AS ENUM ('Active', 'Passive');

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
    "accountId" TEXT NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "accountId" TEXT NOT NULL,

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
CREATE TABLE "account_create_data" (
    "accountId" TEXT NOT NULL,

    CONSTRAINT "account_create_data_pkey" PRIMARY KEY ("accountId")
);

-- CreateTable
CREATE TABLE "account_update_data" (
    "accountId" TEXT NOT NULL,

    CONSTRAINT "account_update_data_pkey" PRIMARY KEY ("accountId")
);

-- CreateTable
CREATE TABLE "world" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "world_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "address" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AddressType" NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "worldId" TEXT NOT NULL,

    CONSTRAINT "address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zone" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "linkZone" TEXT[],
    "rewardNodes" INTEGER NOT NULL,
    "addressId" TEXT NOT NULL,

    CONSTRAINT "zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "npc" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,

    CONSTRAINT "npc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dataSources" TEXT NOT NULL,
    "extraDetails" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "statisticsId" TEXT NOT NULL,
    "updatedByAccountId" TEXT,
    "createdByAccountId" TEXT,

    CONSTRAINT "item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipeIngredient" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "itemId" TEXT,
    "belongToItemId" TEXT NOT NULL,

    CONSTRAINT "recipeIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task" (
    "id" TEXT NOT NULL,
    "lv" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "npcId" TEXT NOT NULL,

    CONSTRAINT "task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "probability" INTEGER NOT NULL,
    "itemId" TEXT,
    "taskId" TEXT NOT NULL,

    CONSTRAINT "reward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "material" "MaterialType" NOT NULL,
    "ptValue" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,

    CONSTRAINT "material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mob" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobType" "MobType" NOT NULL,
    "baseLv" INTEGER NOT NULL,
    "experience" INTEGER NOT NULL,
    "partsExperience" INTEGER NOT NULL,
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
    "flow" TEXT NOT NULL,
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
    "updatedByAccountId" TEXT,
    "createdByAccountId" TEXT,

    CONSTRAINT "mob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drop_item" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "probability" INTEGER NOT NULL,
    "relatedPart" "MobPart" NOT NULL,
    "relatedPartInfo" TEXT NOT NULL,
    "breakReward" "PartBreakReward" NOT NULL,
    "dropById" TEXT NOT NULL,

    CONSTRAINT "drop_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weapon_enchantment_attributes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "flow" JSONB NOT NULL,
    "extraDetails" TEXT,
    "dataSources" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "statisticsId" TEXT NOT NULL,
    "updatedByAccountId" TEXT,
    "createdByAccountId" TEXT,

    CONSTRAINT "weapon_enchantment_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "armor_enchantment_attributes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "flow" JSONB NOT NULL,
    "extraDetails" TEXT,
    "dataSources" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "statisticsId" TEXT NOT NULL,
    "updatedByAccountId" TEXT,
    "createdByAccountId" TEXT,

    CONSTRAINT "armor_enchantment_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crystal" (
    "name" TEXT NOT NULL,
    "crystalType" TEXT NOT NULL,
    "modifiers" TEXT[],
    "itemId" TEXT NOT NULL,

    CONSTRAINT "crystal_pkey" PRIMARY KEY ("itemId")
);

-- CreateTable
CREATE TABLE "weapon" (
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "availability" "AvailabilityType" NOT NULL,
    "acquisitionMethod" "AcquisitionMethodType" NOT NULL,
    "baseAbi" INTEGER NOT NULL,
    "stability" INTEGER NOT NULL,
    "modifiers" TEXT[],
    "colorA" INTEGER NOT NULL,
    "colorB" INTEGER NOT NULL,
    "colorC" INTEGER NOT NULL,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "weapon_pkey" PRIMARY KEY ("itemId")
);

-- CreateTable
CREATE TABLE "custom_weapon" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "extraAbi" INTEGER NOT NULL,
    "templateId" TEXT NOT NULL,
    "refinement" INTEGER NOT NULL,
    "enchantmentAttributesId" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "extraDetails" TEXT NOT NULL,

    CONSTRAINT "custom_weapon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "armor" (
    "name" TEXT NOT NULL,
    "baseDef" INTEGER NOT NULL,
    "availability" "AvailabilityType" NOT NULL,
    "acquisitionMethod" "AcquisitionMethodType" NOT NULL,
    "modifiers" TEXT[],
    "colorA" INTEGER NOT NULL,
    "colorB" INTEGER NOT NULL,
    "colorC" INTEGER NOT NULL,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "armor_pkey" PRIMARY KEY ("itemId")
);

-- CreateTable
CREATE TABLE "custom_armor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "def" INTEGER NOT NULL,
    "armorType" "ArmorType" NOT NULL,
    "templateId" TEXT NOT NULL,
    "refinement" INTEGER NOT NULL,
    "enchantmentAttributesId" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "extraDetails" TEXT NOT NULL,

    CONSTRAINT "custom_armor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "additional_equipment" (
    "name" TEXT NOT NULL,
    "baseDef" INTEGER NOT NULL,
    "availability" "AvailabilityType" NOT NULL,
    "acquisitionMethod" "AcquisitionMethodType" NOT NULL,
    "modifiers" TEXT[],
    "colorA" INTEGER NOT NULL,
    "colorB" INTEGER NOT NULL,
    "colorC" INTEGER NOT NULL,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "additional_equipment_pkey" PRIMARY KEY ("itemId")
);

-- CreateTable
CREATE TABLE "custom_additional_equipment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "def" INTEGER NOT NULL,
    "templateId" TEXT NOT NULL,
    "refinement" INTEGER NOT NULL,
    "masterId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "extraDetails" TEXT NOT NULL,

    CONSTRAINT "custom_additional_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "special_equipment" (
    "name" TEXT NOT NULL,
    "baseDef" INTEGER NOT NULL,
    "availability" "AvailabilityType" NOT NULL,
    "acquisitionMethod" "AcquisitionMethodType" NOT NULL,
    "modifiers" TEXT[],
    "itemId" TEXT NOT NULL,

    CONSTRAINT "special_equipment_pkey" PRIMARY KEY ("itemId")
);

-- CreateTable
CREATE TABLE "custom_special_equipment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "def" INTEGER NOT NULL,
    "templateId" TEXT NOT NULL,
    "refinement" INTEGER NOT NULL,
    "masterId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "extraDetails" TEXT NOT NULL,

    CONSTRAINT "custom_special_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill" (
    "id" TEXT NOT NULL,
    "skillTreeName" TEXT NOT NULL,
    "posX" INTEGER NOT NULL,
    "posY" INTEGER NOT NULL,
    "tier" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "skillType" "SkillType" NOT NULL,
    "weaponElementDependencyType" BOOLEAN NOT NULL,
    "defaultElement" "Element",
    "chargingType" "SkillChargingType" NOT NULL,
    "distanceResist" "SkillDistanceResistType" NOT NULL,
    "skillDescription" TEXT,
    "extraDetails" TEXT NOT NULL,
    "dataSources" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "statisticsId" TEXT NOT NULL,
    "updatedByAccountId" TEXT,
    "createdByAccountId" TEXT,

    CONSTRAINT "skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_skill" (
    "id" TEXT NOT NULL,
    "lv" INTEGER NOT NULL,
    "templateId" TEXT NOT NULL,

    CONSTRAINT "character_skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_effect" (
    "id" TEXT NOT NULL,
    "mainHand" TEXT NOT NULL,
    "subHand" TEXT NOT NULL,
    "armor" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "motionBaseDurationFormula" TEXT NOT NULL,
    "motionModifiableDurationFormula" TEXT NOT NULL,
    "chantingBaseDurationFormula" TEXT NOT NULL,
    "chantingModifiableDurationFormula" TEXT NOT NULL,
    "ReservoirBaseDurationFormula" TEXT NOT NULL,
    "ReservoirModifiableDurationFormula" TEXT NOT NULL,
    "skillStartupFramesFormula" TEXT NOT NULL,
    "costFormula" TEXT NOT NULL,
    "belongToskillId" TEXT NOT NULL,

    CONSTRAINT "skill_effect_pkey" PRIMARY KEY ("id")
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
    "maxLv" INTEGER NOT NULL,
    "extraDetails" TEXT NOT NULL,
    "dataSources" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "statisticsId" TEXT NOT NULL,
    "updatedByAccountId" TEXT,
    "createdByAccountId" TEXT,

    CONSTRAINT "pet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_pet" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "pStr" INTEGER NOT NULL,
    "pInt" INTEGER NOT NULL,
    "pVit" INTEGER NOT NULL,
    "pAgi" INTEGER NOT NULL,
    "pDex" INTEGER NOT NULL,
    "str" INTEGER NOT NULL,
    "int" INTEGER NOT NULL,
    "vit" INTEGER NOT NULL,
    "agi" INTEGER NOT NULL,
    "dex" INTEGER NOT NULL,
    "weaponType" TEXT NOT NULL,
    "persona" "Persona" NOT NULL,
    "type" "PetType" NOT NULL,
    "weaponAtk" INTEGER NOT NULL,
    "masterId" TEXT NOT NULL,

    CONSTRAINT "custom_pet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumable" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "modifiers" TEXT[],

    CONSTRAINT "consumable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "combo" JSONB NOT NULL,

    CONSTRAINT "combo_pkey" PRIMARY KEY ("id")
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
    "weaponId" TEXT NOT NULL,
    "subWeaponId" TEXT NOT NULL,
    "armorId" TEXT NOT NULL,
    "addEquipId" TEXT NOT NULL,
    "speEquipId" TEXT NOT NULL,
    "fashion" TEXT[],
    "cuisine" TEXT[],
    "ExtraAttrs" TEXT[],
    "masterId" TEXT NOT NULL,
    "extraDetails" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "statisticsId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,

    CONSTRAINT "character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mercenary" (
    "id" TEXT NOT NULL,
    "type" "MercenaryType" NOT NULL,
    "templateId" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "skillAId" TEXT NOT NULL,
    "skillAType" "MercenarySkillType" NOT NULL,
    "skillBId" TEXT NOT NULL,
    "skillBType" "MercenarySkillType" NOT NULL,

    CONSTRAINT "mercenary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member" (
    "id" TEXT NOT NULL,
    "flow" JSONB NOT NULL,
    "characterId" TEXT NOT NULL,
    "mobId" TEXT NOT NULL,
    "mobDifficultyFlag" "MobDifficultyFlag" NOT NULL,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "extraDetails" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "statisticsId" TEXT NOT NULL,
    "updatedByAccountId" TEXT,
    "createdByAccountId" TEXT,

    CONSTRAINT "simulator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statistics" (
    "id" TEXT NOT NULL,

    CONSTRAINT "statistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image" (
    "id" TEXT NOT NULL,
    "dataUrl" TEXT NOT NULL,
    "npcId" TEXT,

    CONSTRAINT "image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate" (
    "id" TEXT NOT NULL,
    "rate" INTEGER NOT NULL,
    "accountId" TEXT NOT NULL,
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
CREATE TABLE "_mobTozone" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_crystalToweapon" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_crystalTocustom_weapon" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_crystalTocustom_armor" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_crystalTocustom_additional_equipment" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_crystalTospecial_equipment" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_crystalTocustom_special_equipment" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_armorTocrystal" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_additional_equipmentTocrystal" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_characterTocharacter_skill" (
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
CREATE TABLE "_memberTosimulator" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_imageToitem" (
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
CREATE UNIQUE INDEX "item_statisticsId_key" ON "item"("statisticsId");

-- CreateIndex
CREATE UNIQUE INDEX "mob_statisticsId_key" ON "mob"("statisticsId");

-- CreateIndex
CREATE UNIQUE INDEX "weapon_enchantment_attributes_statisticsId_key" ON "weapon_enchantment_attributes"("statisticsId");

-- CreateIndex
CREATE UNIQUE INDEX "armor_enchantment_attributes_statisticsId_key" ON "armor_enchantment_attributes"("statisticsId");

-- CreateIndex
CREATE UNIQUE INDEX "skill_statisticsId_key" ON "skill"("statisticsId");

-- CreateIndex
CREATE UNIQUE INDEX "pet_statisticsId_key" ON "pet"("statisticsId");

-- CreateIndex
CREATE UNIQUE INDEX "character_statisticsId_key" ON "character"("statisticsId");

-- CreateIndex
CREATE UNIQUE INDEX "character_imageId_key" ON "character"("imageId");

-- CreateIndex
CREATE UNIQUE INDEX "simulator_statisticsId_key" ON "simulator"("statisticsId");

-- CreateIndex
CREATE UNIQUE INDEX "image_npcId_key" ON "image"("npcId");

-- CreateIndex
CREATE UNIQUE INDEX "_mobTozone_AB_unique" ON "_mobTozone"("A", "B");

-- CreateIndex
CREATE INDEX "_mobTozone_B_index" ON "_mobTozone"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_crystalToweapon_AB_unique" ON "_crystalToweapon"("A", "B");

-- CreateIndex
CREATE INDEX "_crystalToweapon_B_index" ON "_crystalToweapon"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_crystalTocustom_weapon_AB_unique" ON "_crystalTocustom_weapon"("A", "B");

-- CreateIndex
CREATE INDEX "_crystalTocustom_weapon_B_index" ON "_crystalTocustom_weapon"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_crystalTocustom_armor_AB_unique" ON "_crystalTocustom_armor"("A", "B");

-- CreateIndex
CREATE INDEX "_crystalTocustom_armor_B_index" ON "_crystalTocustom_armor"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_crystalTocustom_additional_equipment_AB_unique" ON "_crystalTocustom_additional_equipment"("A", "B");

-- CreateIndex
CREATE INDEX "_crystalTocustom_additional_equipment_B_index" ON "_crystalTocustom_additional_equipment"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_crystalTospecial_equipment_AB_unique" ON "_crystalTospecial_equipment"("A", "B");

-- CreateIndex
CREATE INDEX "_crystalTospecial_equipment_B_index" ON "_crystalTospecial_equipment"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_crystalTocustom_special_equipment_AB_unique" ON "_crystalTocustom_special_equipment"("A", "B");

-- CreateIndex
CREATE INDEX "_crystalTocustom_special_equipment_B_index" ON "_crystalTocustom_special_equipment"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_armorTocrystal_AB_unique" ON "_armorTocrystal"("A", "B");

-- CreateIndex
CREATE INDEX "_armorTocrystal_B_index" ON "_armorTocrystal"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_additional_equipmentTocrystal_AB_unique" ON "_additional_equipmentTocrystal"("A", "B");

-- CreateIndex
CREATE INDEX "_additional_equipmentTocrystal_B_index" ON "_additional_equipmentTocrystal"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_characterTocharacter_skill_AB_unique" ON "_characterTocharacter_skill"("A", "B");

-- CreateIndex
CREATE INDEX "_characterTocharacter_skill_B_index" ON "_characterTocharacter_skill"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_characterToconsumable_AB_unique" ON "_characterToconsumable"("A", "B");

-- CreateIndex
CREATE INDEX "_characterToconsumable_B_index" ON "_characterToconsumable"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_characterTocombo_AB_unique" ON "_characterTocombo"("A", "B");

-- CreateIndex
CREATE INDEX "_characterTocombo_B_index" ON "_characterTocombo"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_memberTosimulator_AB_unique" ON "_memberTosimulator"("A", "B");

-- CreateIndex
CREATE INDEX "_memberTosimulator_B_index" ON "_memberTosimulator"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_imageToitem_AB_unique" ON "_imageToitem"("A", "B");

-- CreateIndex
CREATE INDEX "_imageToitem_B_index" ON "_imageToitem"("B");
