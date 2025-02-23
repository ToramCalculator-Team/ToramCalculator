-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "userRole" TEXT NOT NULL,

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
    "accountId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "activity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "address" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
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
    "activityId" TEXT,
    "addressId" TEXT NOT NULL,

    CONSTRAINT "zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "npc" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,

    CONSTRAINT "npc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item" (
    "id" TEXT NOT NULL,
    "dataSources" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "statisticId" TEXT NOT NULL,
    "updatedByAccountId" TEXT,
    "createdByAccountId" TEXT,

    CONSTRAINT "item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredient" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "itemId" TEXT,
    "recipeId" TEXT NOT NULL,

    CONSTRAINT "recipe_ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe" (
    "id" TEXT NOT NULL,
    "weaponId" TEXT,
    "armorId" TEXT,
    "addEquipId" TEXT,
    "speEquipId" TEXT,
    "consumableId" TEXT,
    "activityId" TEXT,

    CONSTRAINT "recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task" (
    "id" TEXT NOT NULL,
    "lv" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "npcId" TEXT NOT NULL,

    CONSTRAINT "task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kill_requirement" (
    "id" TEXT NOT NULL,
    "mobId" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "taskId" TEXT NOT NULL,

    CONSTRAINT "kill_requirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_require" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "itemId" TEXT,
    "taskId" TEXT NOT NULL,

    CONSTRAINT "task_require_pkey" PRIMARY KEY ("id")
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
    "name" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "ptValue" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,

    CONSTRAINT "material_pkey" PRIMARY KEY ("itemId")
);

-- CreateTable
CREATE TABLE "mob" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobType" TEXT NOT NULL,
    "captureable" BOOLEAN NOT NULL,
    "baseLv" INTEGER NOT NULL,
    "experience" INTEGER NOT NULL,
    "partsExperience" INTEGER NOT NULL,
    "element" TEXT NOT NULL,
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
    "actions" JSONB NOT NULL,
    "details" TEXT NOT NULL,
    "dataSources" TEXT NOT NULL,
    "statisticId" TEXT NOT NULL,
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
    "relatedPart" TEXT NOT NULL,
    "relatedPartInfo" TEXT NOT NULL,
    "breakReward" TEXT NOT NULL,
    "dropById" TEXT NOT NULL,

    CONSTRAINT "drop_item_pkey" PRIMARY KEY ("id")
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
    "baseAbi" INTEGER NOT NULL,
    "stability" INTEGER NOT NULL,
    "modifiers" TEXT[],
    "colorA" INTEGER NOT NULL,
    "colorB" INTEGER NOT NULL,
    "colorC" INTEGER NOT NULL,
    "element" TEXT,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "weapon_pkey" PRIMARY KEY ("itemId")
);

-- CreateTable
CREATE TABLE "armor" (
    "name" TEXT NOT NULL,
    "baseDef" INTEGER NOT NULL,
    "modifiers" TEXT[],
    "colorA" INTEGER NOT NULL,
    "colorB" INTEGER NOT NULL,
    "colorC" INTEGER NOT NULL,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "armor_pkey" PRIMARY KEY ("itemId")
);

-- CreateTable
CREATE TABLE "armor_enchantment_attributes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "modifiers" TEXT[],
    "details" TEXT,
    "dataSources" TEXT,
    "statisticId" TEXT NOT NULL,
    "updatedByAccountId" TEXT,
    "createdByAccountId" TEXT,

    CONSTRAINT "armor_enchantment_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "additional_equipment" (
    "name" TEXT NOT NULL,
    "baseDef" INTEGER NOT NULL,
    "modifiers" TEXT[],
    "colorA" INTEGER NOT NULL,
    "colorB" INTEGER NOT NULL,
    "colorC" INTEGER NOT NULL,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "additional_equipment_pkey" PRIMARY KEY ("itemId")
);

-- CreateTable
CREATE TABLE "special_equipment" (
    "name" TEXT NOT NULL,
    "baseDef" INTEGER NOT NULL,
    "modifiers" TEXT[],
    "itemId" TEXT NOT NULL,

    CONSTRAINT "special_equipment_pkey" PRIMARY KEY ("itemId")
);

-- CreateTable
CREATE TABLE "skill" (
    "id" TEXT NOT NULL,
    "treeName" TEXT NOT NULL,
    "posX" INTEGER NOT NULL,
    "posY" INTEGER NOT NULL,
    "tier" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "isPassive" BOOLEAN NOT NULL,
    "element" TEXT NOT NULL,
    "chargingType" TEXT NOT NULL,
    "distanceResist" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "dataSources" TEXT NOT NULL,
    "statisticId" TEXT NOT NULL,
    "updatedByAccountId" TEXT,
    "createdByAccountId" TEXT,

    CONSTRAINT "skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_effect" (
    "id" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "castingRange" INTEGER NOT NULL,
    "effectiveRange" INTEGER NOT NULL,
    "motionFixed" TEXT NOT NULL,
    "motionModified" TEXT NOT NULL,
    "chantingFixed" TEXT NOT NULL,
    "chantingModified" TEXT NOT NULL,
    "reservoirFixed" TEXT NOT NULL,
    "reservoirModified" TEXT NOT NULL,
    "startupFrames" TEXT NOT NULL,
    "cost" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "belongToskillId" TEXT NOT NULL,

    CONSTRAINT "skill_effect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumable" (
    "name" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "effectDuration" INTEGER NOT NULL,
    "effects" TEXT[],

    CONSTRAINT "consumable_pkey" PRIMARY KEY ("itemId")
);

-- CreateTable
CREATE TABLE "custom_weapon" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "baseAbi" INTEGER NOT NULL,
    "stability" INTEGER NOT NULL,
    "extraAbi" INTEGER NOT NULL,
    "templateId" TEXT,
    "refinement" INTEGER NOT NULL,
    "enchantmentAttributesId" TEXT,
    "masterId" TEXT NOT NULL,

    CONSTRAINT "custom_weapon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weapon_enchantment_attributes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "modifiers" TEXT[],
    "details" TEXT,
    "dataSources" TEXT,
    "statisticId" TEXT NOT NULL,
    "updatedByAccountId" TEXT,
    "createdByAccountId" TEXT,

    CONSTRAINT "weapon_enchantment_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_armor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "def" INTEGER NOT NULL,
    "armorType" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "refinement" INTEGER NOT NULL,
    "enchantmentAttributesId" TEXT,
    "masterId" TEXT NOT NULL,

    CONSTRAINT "custom_armor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_additional_equipment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "def" INTEGER NOT NULL,
    "templateId" TEXT NOT NULL,
    "refinement" INTEGER NOT NULL,
    "masterId" TEXT NOT NULL,

    CONSTRAINT "custom_additional_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_special_equipment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "def" INTEGER NOT NULL,
    "templateId" TEXT NOT NULL,
    "refinement" INTEGER NOT NULL,
    "masterId" TEXT NOT NULL,

    CONSTRAINT "custom_special_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_skill" (
    "id" TEXT NOT NULL,
    "lv" INTEGER NOT NULL,
    "isStarGem" BOOLEAN NOT NULL,
    "templateId" TEXT NOT NULL,

    CONSTRAINT "character_skill_pkey" PRIMARY KEY ("id")
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
    "persona" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "weaponAtk" INTEGER NOT NULL,
    "generation" INTEGER NOT NULL,
    "maxLv" INTEGER NOT NULL,
    "masterId" TEXT NOT NULL,

    CONSTRAINT "custom_pet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "combo" JSONB NOT NULL,

    CONSTRAINT "combo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avatar" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "modifiers" TEXT[],
    "playerId" TEXT NOT NULL,

    CONSTRAINT "avatar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lv" INTEGER NOT NULL,
    "str" INTEGER NOT NULL,
    "int" INTEGER NOT NULL,
    "vit" INTEGER NOT NULL,
    "agi" INTEGER NOT NULL,
    "dex" INTEGER NOT NULL,
    "personalityType" TEXT NOT NULL,
    "personalityValue" INTEGER NOT NULL,
    "weaponId" TEXT NOT NULL,
    "subWeaponId" TEXT NOT NULL,
    "armorId" TEXT NOT NULL,
    "addEquipId" TEXT NOT NULL,
    "speEquipId" TEXT NOT NULL,
    "cooking" TEXT[],
    "modifiers" TEXT[],
    "partnerSkillA" TEXT NOT NULL,
    "partnerSkillAType" TEXT NOT NULL,
    "partnerSkillB" TEXT NOT NULL,
    "partnerSkillBType" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "statisticId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,

    CONSTRAINT "character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mercenary" (
    "type" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "skillAId" TEXT NOT NULL,
    "skillAType" TEXT NOT NULL,
    "skillBId" TEXT NOT NULL,
    "skillBType" TEXT NOT NULL,

    CONSTRAINT "mercenary_pkey" PRIMARY KEY ("templateId")
);

-- CreateTable
CREATE TABLE "player" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "useIn" TEXT NOT NULL,
    "actions" JSONB NOT NULL,
    "accountId" TEXT NOT NULL,

    CONSTRAINT "player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "playerId" TEXT,
    "partnerId" TEXT,
    "mercenaryId" TEXT,
    "mobId" TEXT,
    "mobDifficultyFlag" TEXT NOT NULL,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "order" INTEGER NOT NULL,
    "gems" TEXT[],

    CONSTRAINT "team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "visibility" TEXT NOT NULL,
    "details" TEXT,
    "statisticId" TEXT NOT NULL,
    "updatedByAccountId" TEXT,
    "createdByAccountId" TEXT,

    CONSTRAINT "simulator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statistic" (
    "id" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "usageTimestamps" TIMESTAMP(3)[],
    "viewTimestamps" TIMESTAMP(3)[],

    CONSTRAINT "statistic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image" (
    "id" TEXT NOT NULL,
    "dataUrl" TEXT NOT NULL,

    CONSTRAINT "image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_mobTozone" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_mobTozone_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_FrontRelation" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_FrontRelation_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_BackRelation" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BackRelation_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_crystalToweapon" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_crystalToweapon_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_crystalTocustom_weapon" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_crystalTocustom_weapon_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_crystalTocustom_armor" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_crystalTocustom_armor_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_crystalTocustom_additional_equipment" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_crystalTocustom_additional_equipment_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_crystalTospecial_equipment" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_crystalTospecial_equipment_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_crystalTocustom_special_equipment" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_crystalTocustom_special_equipment_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_armorTocrystal" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_armorTocrystal_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_armorToimage" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_armorToimage_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_additional_equipmentTocrystal" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_additional_equipmentTocrystal_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_additional_equipmentToimage" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_additional_equipmentToimage_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_avatarTocharacter" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_avatarTocharacter_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_characterTocharacter_skill" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_characterTocharacter_skill_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_characterToconsumable" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_characterToconsumable_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_characterTocombo" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_characterTocombo_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_memberToteam" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_memberToteam_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_simulatorToteam" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_simulatorToteam_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_imageToweapon" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_imageToweapon_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "account_provider_providerAccountId_key" ON "account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "session_sessionToken_key" ON "session"("sessionToken");

-- CreateIndex
CREATE INDEX "post_name_idx" ON "post"("name");

-- CreateIndex
CREATE UNIQUE INDEX "item_statisticId_key" ON "item"("statisticId");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_weaponId_key" ON "recipe"("weaponId");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_armorId_key" ON "recipe"("armorId");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_addEquipId_key" ON "recipe"("addEquipId");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_speEquipId_key" ON "recipe"("speEquipId");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_consumableId_key" ON "recipe"("consumableId");

-- CreateIndex
CREATE UNIQUE INDEX "mob_statisticId_key" ON "mob"("statisticId");

-- CreateIndex
CREATE UNIQUE INDEX "armor_enchantment_attributes_statisticId_key" ON "armor_enchantment_attributes"("statisticId");

-- CreateIndex
CREATE UNIQUE INDEX "skill_statisticId_key" ON "skill"("statisticId");

-- CreateIndex
CREATE UNIQUE INDEX "weapon_enchantment_attributes_statisticId_key" ON "weapon_enchantment_attributes"("statisticId");

-- CreateIndex
CREATE UNIQUE INDEX "character_statisticId_key" ON "character"("statisticId");

-- CreateIndex
CREATE UNIQUE INDEX "character_imageId_key" ON "character"("imageId");

-- CreateIndex
CREATE UNIQUE INDEX "simulator_statisticId_key" ON "simulator"("statisticId");

-- CreateIndex
CREATE INDEX "_mobTozone_B_index" ON "_mobTozone"("B");

-- CreateIndex
CREATE INDEX "_FrontRelation_B_index" ON "_FrontRelation"("B");

-- CreateIndex
CREATE INDEX "_BackRelation_B_index" ON "_BackRelation"("B");

-- CreateIndex
CREATE INDEX "_crystalToweapon_B_index" ON "_crystalToweapon"("B");

-- CreateIndex
CREATE INDEX "_crystalTocustom_weapon_B_index" ON "_crystalTocustom_weapon"("B");

-- CreateIndex
CREATE INDEX "_crystalTocustom_armor_B_index" ON "_crystalTocustom_armor"("B");

-- CreateIndex
CREATE INDEX "_crystalTocustom_additional_equipment_B_index" ON "_crystalTocustom_additional_equipment"("B");

-- CreateIndex
CREATE INDEX "_crystalTospecial_equipment_B_index" ON "_crystalTospecial_equipment"("B");

-- CreateIndex
CREATE INDEX "_crystalTocustom_special_equipment_B_index" ON "_crystalTocustom_special_equipment"("B");

-- CreateIndex
CREATE INDEX "_armorTocrystal_B_index" ON "_armorTocrystal"("B");

-- CreateIndex
CREATE INDEX "_armorToimage_B_index" ON "_armorToimage"("B");

-- CreateIndex
CREATE INDEX "_additional_equipmentTocrystal_B_index" ON "_additional_equipmentTocrystal"("B");

-- CreateIndex
CREATE INDEX "_additional_equipmentToimage_B_index" ON "_additional_equipmentToimage"("B");

-- CreateIndex
CREATE INDEX "_avatarTocharacter_B_index" ON "_avatarTocharacter"("B");

-- CreateIndex
CREATE INDEX "_characterTocharacter_skill_B_index" ON "_characterTocharacter_skill"("B");

-- CreateIndex
CREATE INDEX "_characterToconsumable_B_index" ON "_characterToconsumable"("B");

-- CreateIndex
CREATE INDEX "_characterTocombo_B_index" ON "_characterTocombo"("B");

-- CreateIndex
CREATE INDEX "_memberToteam_B_index" ON "_memberToteam"("B");

-- CreateIndex
CREATE INDEX "_simulatorToteam_B_index" ON "_simulatorToteam"("B");

-- CreateIndex
CREATE INDEX "_imageToweapon_B_index" ON "_imageToweapon"("B");