-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";
-- CreateEnum
CREATE TYPE "AbnormalType" AS ENUM ('MagicFlinch', 'None', 'Flinch', 'Tumble', 'Stun', 'KnockBack', 'Poison', 'PoisonLevel1', 'PoisonLevel2', 'Paralysis', 'Blindness', 'Ignition', 'Freeze', 'Breaking', 'Slow', 'Stop', 'Fear', 'Dizzy', 'Weak', 'Collapse', 'Confusion', 'Silent', 'Bleed', 'Sleep', 'Rage', 'Tiredness', 'Blessing', 'SystemInvincibility', 'BestState', 'Invincibility', 'Suction', 'Taming', 'Curse', 'Flash', 'Runaway', 'MagicalExplosion', 'Sick', 'Malgravity', 'Dispel', 'Inversion', 'Mineralization', 'NoTools', 'Enhance', 'ComboInvincibility', 'DeathTorqueShot', 'SystemAddHate', 'Recovery');
-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('User', 'Admin');
-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('Normal', 'Limited');
-- CreateEnum
CREATE TYPE "AssistSkillGroup" AS ENUM ('SupportSkill', 'BattleSkill', 'SurvivalSkill');
-- CreateEnum
CREATE TYPE "AvatarType" AS ENUM ('Decoration', 'Top', 'Bottom');
-- CreateEnum
CREATE TYPE "BossPartBreakRewardType" AS ENUM ('None', 'CanDrop', 'DropUp');
-- CreateEnum
CREATE TYPE "BossPartType" AS ENUM ('A', 'B', 'C');
-- CreateEnum
CREATE TYPE "BuffSkillGroup" AS ENUM ('GuardSkill', 'ShieldSkill', 'KnifeSkill', 'KnightSkill', 'HunterSkill', 'PriestSkill', 'AssassinSkill', 'WizardSkill');
-- CreateEnum
CREATE TYPE "CharacterPersonalityType" AS ENUM ('None', 'Luk', 'Cri', 'Tec', 'Men');
-- CreateEnum
CREATE TYPE "ComboStepType" AS ENUM ('None', 'Start', 'Rengeki', 'ThirdEye', 'Filling', 'Quick', 'HardHit', 'Tenacity', 'Invincible', 'BloodSucking', 'Tough', 'AMomentaryWalk', 'Reflection', 'Illusion', 'Max');
-- CreateEnum
CREATE TYPE "ConsumableType" AS ENUM ('MaxHp', 'MaxMp', 'pAtk', 'mAtk', 'Aspd', 'Cspd', 'Hit', 'Flee', 'EleStro', 'EleRes', 'pRes', 'mRes');
-- CreateEnum
CREATE TYPE "ControlEffect" AS ENUM ('None', 'Cowardly', 'Turn', 'Dizzy');
-- CreateEnum
CREATE TYPE "CrystalType" AS ENUM ('NormalCrystal', 'WeaponCrystal', 'ArmorCrystal', 'OptionCrystal', 'SpecialCrystal');
-- CreateEnum
CREATE TYPE "DamageRangeType" AS ENUM ('Single', 'None', 'Range', 'Enemy', 'MoveAttack', 'Line', 'Ground', 'Bullet', 'GroundFixed', 'Meteor', 'Explosion', 'Attraction');
-- CreateEnum
CREATE TYPE "ElementType" AS ENUM ('Normal', 'Light', 'Dark', 'Water', 'Fire', 'Earth', 'Wind');
-- CreateEnum
CREATE TYPE "EquipType" AS ENUM ('OneHandSword', 'TwoHandSword', 'Bow', 'Bowgun', 'Rod', 'Magictool', 'Knuckle', 'Halberd', 'Katana', 'Arrow', 'ShortSword', 'NinjutsuScroll', 'Shield', 'Armor', 'Option', 'Special');
-- CreateEnum
CREATE TYPE "ItemSourceType" AS ENUM ('Mob', 'Task', 'BlacksmithShop', 'Player');
-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('Weapon', 'Armor', 'Option', 'Special', 'Crystal', 'Consumable', 'Material');
-- CreateEnum
CREATE TYPE "MainHandType" AS ENUM ('OneHandSword', 'TwoHandSword', 'Bow', 'Bowgun', 'Rod', 'Magictool', 'Knuckle', 'Halberd', 'Katana', 'None');
-- CreateEnum
CREATE TYPE "MainHandTypeLimit" AS ENUM ('OneHandSword', 'TwoHandSword', 'Bow', 'Bowgun', 'Rod', 'Magictool', 'Knuckle', 'Halberd', 'Katana', 'None', 'Any');
-- CreateEnum
CREATE TYPE "MainWeaponType" AS ENUM ('OneHandSword', 'TwoHandSword', 'Bow', 'Bowgun', 'Rod', 'Magictool', 'Knuckle', 'Halberd', 'Katana');
-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('Metal', 'Cloth', 'Beast', 'Wood', 'Drug', 'Magic');
-- CreateEnum
CREATE TYPE "MemberType" AS ENUM ('Player', 'Partner', 'Mercenary', 'Mob');
-- CreateEnum
CREATE TYPE "MercenaryType" AS ENUM ('Tank', 'Dps');
-- CreateEnum
CREATE TYPE "MobDifficultyFlag" AS ENUM ('Easy', 'Normal', 'Hard', 'Lunatic', 'Ultimate');
-- CreateEnum
CREATE TYPE "MobType" AS ENUM ('Mob', 'MiniBoss', 'Boss');
-- CreateEnum
CREATE TYPE "OtherSkillGroup" AS ENUM ('LuckSkill', 'MerchantSkill', 'PetSkill');
-- CreateEnum
CREATE TYPE "PartnerSkillType" AS ENUM ('Passive', 'Active');
-- CreateEnum
CREATE TYPE "PetPersonaType" AS ENUM ('Fervent', 'Intelligent', 'Mild', 'Swift', 'Justice', 'Devoted', 'Impulsive', 'Calm', 'Sly', 'Timid', 'Brave', 'Active', 'Sturdy', 'Steady', 'Max');
-- CreateEnum
CREATE TYPE "PetType" AS ENUM ('AllTrades', 'PhysicalAttack', 'MagicAttack', 'PhysicalDefense', 'MagicDefense', 'Avoidance', 'Hit', 'SkillsEnhancement', 'Genius');
-- CreateEnum
CREATE TYPE "PlayerArmorAbilityType" AS ENUM ('Normal', 'Light', 'Heavy');
-- CreateEnum
CREATE TYPE "PlayerArmorAbilityTypeLimit" AS ENUM ('Normal', 'Light', 'Heavy', 'Any');
-- CreateEnum
CREATE TYPE "ProduceSkillGroup" AS ENUM ('SmithSkill', 'AlchemySkill', 'TamerSkill');
-- CreateEnum
CREATE TYPE "RecipeIngredientType" AS ENUM ('Gold', 'Metal', 'Cloth', 'Beast', 'Wood', 'Drug', 'Magic', 'Item');
-- CreateEnum
CREATE TYPE "RegisletType" AS ENUM ('Nil', 'AtkUp', 'MAtkUp', 'MaxHpUp', 'MaxMpUp', 'DefUp', 'MDefUp', 'HitUp', 'FleeUp', 'AspdUp', 'CspdUp', 'PursuitResist', 'PoisonRecovery', 'BurningFightingSpirit', 'NeuralControl', 'CatEye', 'Hyperthermia', 'Temporaryrepairs', 'Spike', 'StandingWithArmsCrossed', 'BloodyWarrior', 'SilentRecharge', 'ShortSleeper', 'MagicalNonExplosion', 'MonsterHunt', 'CoffeeBreak', 'Practitioner', 'PetOfAttacker', 'PetOfTanker', 'EmergencyHpRecovery', 'EmergencyMpRecovery', 'MagicalBash', 'SavingTechnique', 'LastHero', 'Lonely', 'StartDash', 'BaskInTheSun', 'TheSameBoat', 'LastResistance', 'BackwardWarning', 'Saviour', 'Panic', 'Transfer', 'HideCombo', 'NothingStyle', 'FailTrapper', 'Guitarist', 'QuickDance', 'SeoulConnect', 'ExtremeSurvival', 'AvoidSet', 'LongStep', 'TeleportStep', 'FireTalent', 'WaterTalent', 'WindTalent', 'LandTalent', 'LightTalent', 'DarkTalent', 'CriticalCare', 'NoneNow', 'TargetDeclaration', 'LeavingWorkNotification', 'DamageCheck', 'PoisonBooster', 'FlameBooster', 'WeaknessBlade', 'PreparationPoison', 'HardHitEnhance', 'AccelBladeExtension', 'PowerShootSharp', 'OneWheelEnhance', 'MagicArrowPursuit', 'MagicWallEnhance', 'SmashEnhance', 'SonicWaveEnhance');
-- CreateEnum
CREATE TYPE "SkillAttackTyp" AS ENUM ('None', 'Physical', 'Magic', 'SkillNormal');
-- CreateEnum
CREATE TYPE "SkillBookGroup" AS ENUM ('DarkPowerSkill', 'MagicBladeSkill', 'DancerSkill', 'MinstrelSkill', 'BareHandSkill', 'NinjaSkill', 'PartisanSkill', 'NecromancerSkill', 'GolemSkill');
-- CreateEnum
CREATE TYPE "SkillCastTimeType" AS ENUM ('Instant', 'Chanting', 'Charging');
-- CreateEnum
CREATE TYPE "SkillDistanceType" AS ENUM ('None', 'Long', 'Short', 'Both');
-- CreateEnum
CREATE TYPE "SkillTargetType" AS ENUM ('None', 'Self', 'Player', 'Enemy');
-- CreateEnum
CREATE TYPE "SkillTreeGroupType" AS ENUM ('WeaponSkillGroup', 'BuffSkillGroup', 'AssistSkillGroup', 'ProduceSkillGroup', 'SkillBookGroup', 'OtherSkillGroup');
-- CreateEnum
CREATE TYPE "SkillTreeType" AS ENUM ('BladeSkill', 'ShootSkill', 'MagicSkill', 'MarshallSkill', 'DualSwordSkill', 'HalberdSkill', 'MononofuSkill', 'CrusherSkill', 'FeatheringSkill', 'GuardSkill', 'ShieldSkill', 'KnifeSkill', 'KnightSkill', 'HunterSkill', 'PriestSkill', 'AssassinSkill', 'WizardSkill', 'SupportSkill', 'BattleSkill', 'SurvivalSkill', 'SmithSkill', 'AlchemySkill', 'TamerSkill', 'DarkPowerSkill', 'MagicBladeSkill', 'DancerSkill', 'MinstrelSkill', 'BareHandSkill', 'NinjaSkill', 'PartisanSkill', 'NecromancerSkill', 'GolemSkill', 'LuckSkill', 'MerchantSkill', 'PetSkill');
-- CreateEnum
CREATE TYPE "SubHandType" AS ENUM ('Arrow', 'ShortSword', 'NinjutsuScroll', 'Shield', 'OneHandSword', 'Magictool', 'Knuckle', 'Katana', 'None');
-- CreateEnum
CREATE TYPE "SubHandTypeLimit" AS ENUM ('Arrow', 'ShortSword', 'NinjutsuScroll', 'Shield', 'OneHandSword', 'Magictool', 'Knuckle', 'Katana', 'None', 'Any');
-- CreateEnum
CREATE TYPE "SubWeaponType" AS ENUM ('Arrow', 'ShortSword', 'NinjutsuScroll', 'Shield');
-- CreateEnum
CREATE TYPE "TaskRewardType" AS ENUM ('Exp', 'Money', 'Item');
-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('Collect', 'Defeat', 'Both', 'Other');
-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('Public', 'Private');
-- CreateEnum
CREATE TYPE "WeaponSkillGroup" AS ENUM ('BladeSkill', 'ShootSkill', 'MagicSkill', 'MarshallSkill', 'DualSwordSkill', 'HalberdSkill', 'MononofuSkill', 'CrusherSkill', 'FeatheringSkill');
-- CreateEnum
CREATE TYPE "WeaponType" AS ENUM ('OneHandSword', 'TwoHandSword', 'Bow', 'Bowgun', 'Rod', 'Magictool', 'Knuckle', 'Halberd', 'Katana', 'Arrow', 'ShortSword', 'NinjutsuScroll', 'Shield');
-- CreateTable
-- world
CREATE TABLE IF NOT EXISTS "world_synced" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "statisticId" TEXT NOT NULL,
  "updatedByAccountId" TEXT,
  "createdByAccountId" TEXT,
  "write_id" UUID,
  CONSTRAINT "world_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "world_local" (
  "id" TEXT,
  "name" TEXT,
  "statisticId" TEXT,
  "updatedByAccountId" TEXT,
  "createdByAccountId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "world_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "world" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'name' = ANY(local.changed_columns)
      THEN local."name"
      ELSE synced."name"
    END AS "name",
   CASE
    WHEN 'statisticId' = ANY(local.changed_columns)
      THEN local."statisticId"
      ELSE synced."statisticId"
    END AS "statisticId",
   CASE
    WHEN 'updatedByAccountId' = ANY(local.changed_columns)
      THEN local."updatedByAccountId"
      ELSE synced."updatedByAccountId"
    END AS "updatedByAccountId",
   CASE
    WHEN 'createdByAccountId' = ANY(local.changed_columns)
      THEN local."createdByAccountId"
      ELSE synced."createdByAccountId"
    END AS "createdByAccountId"
  FROM "world_synced" AS synced
  FULL OUTER JOIN "world_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION world_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "world_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "world_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'name');
    changed_cols := array_append(changed_cols, 'statisticId');
    changed_cols := array_append(changed_cols, 'updatedByAccountId');
    changed_cols := array_append(changed_cols, 'createdByAccountId');

    INSERT INTO "world_local" (
    "id", "name", "statisticId", "updatedByAccountId", "createdByAccountId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."name", NEW."statisticId", NEW."updatedByAccountId", NEW."createdByAccountId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'world',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'statisticId', NEW."statisticId",
      'updatedByAccountId', NEW."updatedByAccountId",
      'createdByAccountId', NEW."createdByAccountId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION world_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "world_synced"%ROWTYPE;
    local "world_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "world_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "world_local" WHERE "id" = NEW."id";
    
    IF NEW."name" IS DISTINCT FROM synced."name" THEN
      changed_cols := array_append(changed_cols, 'name');
    END IF;
    IF NEW."statisticId" IS DISTINCT FROM synced."statisticId" THEN
      changed_cols := array_append(changed_cols, 'statisticId');
    END IF;
    IF NEW."updatedByAccountId" IS DISTINCT FROM synced."updatedByAccountId" THEN
      changed_cols := array_append(changed_cols, 'updatedByAccountId');
    END IF;
    IF NEW."createdByAccountId" IS DISTINCT FROM synced."createdByAccountId" THEN
      changed_cols := array_append(changed_cols, 'createdByAccountId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "world_local" (
        "id", "name", "statisticId", "updatedByAccountId", "createdByAccountId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."name", NEW."statisticId", NEW."updatedByAccountId", NEW."createdByAccountId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "world_local"
    SET
        
    "name" = NEW."name",
    "statisticId" = NEW."statisticId",
    "updatedByAccountId" = NEW."updatedByAccountId",
    "createdByAccountId" = NEW."createdByAccountId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'world',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'statisticId', NEW."statisticId",
      'updatedByAccountId', NEW."updatedByAccountId",
      'createdByAccountId', NEW."createdByAccountId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION world_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "world_local" WHERE "id" = OLD."id") THEN
    UPDATE "world_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "world_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'world',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER world_insert
INSTEAD OF INSERT ON "world"
FOR EACH ROW EXECUTE FUNCTION world_insert_trigger();

CREATE OR REPLACE TRIGGER world_update
INSTEAD OF UPDATE ON "world"
FOR EACH ROW EXECUTE FUNCTION world_update_trigger();

CREATE OR REPLACE TRIGGER world_delete
INSTEAD OF DELETE ON "world"
FOR EACH ROW EXECUTE FUNCTION world_delete_trigger();


CREATE OR REPLACE FUNCTION world_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "world_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION world_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "world_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "world_synced"
FOR EACH ROW EXECUTE FUNCTION world_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "world_synced"
FOR EACH ROW EXECUTE FUNCTION world_delete_local_on_synced_delete_trigger();

-- CreateTable
-- address
CREATE TABLE IF NOT EXISTS "address_synced" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "AddressType" NOT NULL,
  "posX" INTEGER NOT NULL,
  "posY" INTEGER NOT NULL,
  "worldId" TEXT NOT NULL,
  "statisticId" TEXT NOT NULL,
  "updatedByAccountId" TEXT,
  "createdByAccountId" TEXT,
  "write_id" UUID,
  CONSTRAINT "address_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "address_local" (
  "id" TEXT,
  "name" TEXT,
  "type" "AddressType",
  "posX" INTEGER,
  "posY" INTEGER,
  "worldId" TEXT,
  "statisticId" TEXT,
  "updatedByAccountId" TEXT,
  "createdByAccountId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "address_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "address" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'name' = ANY(local.changed_columns)
      THEN local."name"
      ELSE synced."name"
    END AS "name",
   CASE
    WHEN 'type' = ANY(local.changed_columns)
      THEN local."type"
      ELSE synced."type"
    END AS "type",
   CASE
    WHEN 'posX' = ANY(local.changed_columns)
      THEN local."posX"
      ELSE synced."posX"
    END AS "posX",
   CASE
    WHEN 'posY' = ANY(local.changed_columns)
      THEN local."posY"
      ELSE synced."posY"
    END AS "posY",
   CASE
    WHEN 'worldId' = ANY(local.changed_columns)
      THEN local."worldId"
      ELSE synced."worldId"
    END AS "worldId",
   CASE
    WHEN 'statisticId' = ANY(local.changed_columns)
      THEN local."statisticId"
      ELSE synced."statisticId"
    END AS "statisticId",
   CASE
    WHEN 'updatedByAccountId' = ANY(local.changed_columns)
      THEN local."updatedByAccountId"
      ELSE synced."updatedByAccountId"
    END AS "updatedByAccountId",
   CASE
    WHEN 'createdByAccountId' = ANY(local.changed_columns)
      THEN local."createdByAccountId"
      ELSE synced."createdByAccountId"
    END AS "createdByAccountId"
  FROM "address_synced" AS synced
  FULL OUTER JOIN "address_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION address_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "address_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "address_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'name');
    changed_cols := array_append(changed_cols, 'type');
    changed_cols := array_append(changed_cols, 'posX');
    changed_cols := array_append(changed_cols, 'posY');
    changed_cols := array_append(changed_cols, 'worldId');
    changed_cols := array_append(changed_cols, 'statisticId');
    changed_cols := array_append(changed_cols, 'updatedByAccountId');
    changed_cols := array_append(changed_cols, 'createdByAccountId');

    INSERT INTO "address_local" (
    "id", "name", "type", "posX", "posY", "worldId", "statisticId", "updatedByAccountId", "createdByAccountId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."name", NEW."type", NEW."posX", NEW."posY", NEW."worldId", NEW."statisticId", NEW."updatedByAccountId", NEW."createdByAccountId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'address',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'type', NEW."type",
      'posX', NEW."posX",
      'posY', NEW."posY",
      'worldId', NEW."worldId",
      'statisticId', NEW."statisticId",
      'updatedByAccountId', NEW."updatedByAccountId",
      'createdByAccountId', NEW."createdByAccountId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION address_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "address_synced"%ROWTYPE;
    local "address_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "address_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "address_local" WHERE "id" = NEW."id";
    
    IF NEW."name" IS DISTINCT FROM synced."name" THEN
      changed_cols := array_append(changed_cols, 'name');
    END IF;
    IF NEW."type" IS DISTINCT FROM synced."type" THEN
      changed_cols := array_append(changed_cols, 'type');
    END IF;
    IF NEW."posX" IS DISTINCT FROM synced."posX" THEN
      changed_cols := array_append(changed_cols, 'posX');
    END IF;
    IF NEW."posY" IS DISTINCT FROM synced."posY" THEN
      changed_cols := array_append(changed_cols, 'posY');
    END IF;
    IF NEW."worldId" IS DISTINCT FROM synced."worldId" THEN
      changed_cols := array_append(changed_cols, 'worldId');
    END IF;
    IF NEW."statisticId" IS DISTINCT FROM synced."statisticId" THEN
      changed_cols := array_append(changed_cols, 'statisticId');
    END IF;
    IF NEW."updatedByAccountId" IS DISTINCT FROM synced."updatedByAccountId" THEN
      changed_cols := array_append(changed_cols, 'updatedByAccountId');
    END IF;
    IF NEW."createdByAccountId" IS DISTINCT FROM synced."createdByAccountId" THEN
      changed_cols := array_append(changed_cols, 'createdByAccountId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "address_local" (
        "id", "name", "type", "posX", "posY", "worldId", "statisticId", "updatedByAccountId", "createdByAccountId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."name", NEW."type", NEW."posX", NEW."posY", NEW."worldId", NEW."statisticId", NEW."updatedByAccountId", NEW."createdByAccountId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "address_local"
    SET
        
    "name" = NEW."name",
    "type" = NEW."type",
    "posX" = NEW."posX",
    "posY" = NEW."posY",
    "worldId" = NEW."worldId",
    "statisticId" = NEW."statisticId",
    "updatedByAccountId" = NEW."updatedByAccountId",
    "createdByAccountId" = NEW."createdByAccountId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'address',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'type', NEW."type",
      'posX', NEW."posX",
      'posY', NEW."posY",
      'worldId', NEW."worldId",
      'statisticId', NEW."statisticId",
      'updatedByAccountId', NEW."updatedByAccountId",
      'createdByAccountId', NEW."createdByAccountId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION address_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "address_local" WHERE "id" = OLD."id") THEN
    UPDATE "address_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "address_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'address',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER address_insert
INSTEAD OF INSERT ON "address"
FOR EACH ROW EXECUTE FUNCTION address_insert_trigger();

CREATE OR REPLACE TRIGGER address_update
INSTEAD OF UPDATE ON "address"
FOR EACH ROW EXECUTE FUNCTION address_update_trigger();

CREATE OR REPLACE TRIGGER address_delete
INSTEAD OF DELETE ON "address"
FOR EACH ROW EXECUTE FUNCTION address_delete_trigger();


CREATE OR REPLACE FUNCTION address_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "address_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION address_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "address_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "address_synced"
FOR EACH ROW EXECUTE FUNCTION address_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "address_synced"
FOR EACH ROW EXECUTE FUNCTION address_delete_local_on_synced_delete_trigger();

-- CreateTable
-- activity
CREATE TABLE IF NOT EXISTS "activity_synced" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "statisticId" TEXT NOT NULL,
  "updatedByAccountId" TEXT,
  "createdByAccountId" TEXT,
  "write_id" UUID,
  CONSTRAINT "activity_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "activity_local" (
  "id" TEXT,
  "name" TEXT,
  "statisticId" TEXT,
  "updatedByAccountId" TEXT,
  "createdByAccountId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "activity_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "activity" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'name' = ANY(local.changed_columns)
      THEN local."name"
      ELSE synced."name"
    END AS "name",
   CASE
    WHEN 'statisticId' = ANY(local.changed_columns)
      THEN local."statisticId"
      ELSE synced."statisticId"
    END AS "statisticId",
   CASE
    WHEN 'updatedByAccountId' = ANY(local.changed_columns)
      THEN local."updatedByAccountId"
      ELSE synced."updatedByAccountId"
    END AS "updatedByAccountId",
   CASE
    WHEN 'createdByAccountId' = ANY(local.changed_columns)
      THEN local."createdByAccountId"
      ELSE synced."createdByAccountId"
    END AS "createdByAccountId"
  FROM "activity_synced" AS synced
  FULL OUTER JOIN "activity_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION activity_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "activity_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "activity_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'name');
    changed_cols := array_append(changed_cols, 'statisticId');
    changed_cols := array_append(changed_cols, 'updatedByAccountId');
    changed_cols := array_append(changed_cols, 'createdByAccountId');

    INSERT INTO "activity_local" (
    "id", "name", "statisticId", "updatedByAccountId", "createdByAccountId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."name", NEW."statisticId", NEW."updatedByAccountId", NEW."createdByAccountId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'activity',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'statisticId', NEW."statisticId",
      'updatedByAccountId', NEW."updatedByAccountId",
      'createdByAccountId', NEW."createdByAccountId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION activity_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "activity_synced"%ROWTYPE;
    local "activity_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "activity_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "activity_local" WHERE "id" = NEW."id";
    
    IF NEW."name" IS DISTINCT FROM synced."name" THEN
      changed_cols := array_append(changed_cols, 'name');
    END IF;
    IF NEW."statisticId" IS DISTINCT FROM synced."statisticId" THEN
      changed_cols := array_append(changed_cols, 'statisticId');
    END IF;
    IF NEW."updatedByAccountId" IS DISTINCT FROM synced."updatedByAccountId" THEN
      changed_cols := array_append(changed_cols, 'updatedByAccountId');
    END IF;
    IF NEW."createdByAccountId" IS DISTINCT FROM synced."createdByAccountId" THEN
      changed_cols := array_append(changed_cols, 'createdByAccountId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "activity_local" (
        "id", "name", "statisticId", "updatedByAccountId", "createdByAccountId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."name", NEW."statisticId", NEW."updatedByAccountId", NEW."createdByAccountId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "activity_local"
    SET
        
    "name" = NEW."name",
    "statisticId" = NEW."statisticId",
    "updatedByAccountId" = NEW."updatedByAccountId",
    "createdByAccountId" = NEW."createdByAccountId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'activity',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'statisticId', NEW."statisticId",
      'updatedByAccountId', NEW."updatedByAccountId",
      'createdByAccountId', NEW."createdByAccountId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION activity_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "activity_local" WHERE "id" = OLD."id") THEN
    UPDATE "activity_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "activity_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'activity',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER activity_insert
INSTEAD OF INSERT ON "activity"
FOR EACH ROW EXECUTE FUNCTION activity_insert_trigger();

CREATE OR REPLACE TRIGGER activity_update
INSTEAD OF UPDATE ON "activity"
FOR EACH ROW EXECUTE FUNCTION activity_update_trigger();

CREATE OR REPLACE TRIGGER activity_delete
INSTEAD OF DELETE ON "activity"
FOR EACH ROW EXECUTE FUNCTION activity_delete_trigger();


CREATE OR REPLACE FUNCTION activity_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "activity_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION activity_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "activity_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "activity_synced"
FOR EACH ROW EXECUTE FUNCTION activity_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "activity_synced"
FOR EACH ROW EXECUTE FUNCTION activity_delete_local_on_synced_delete_trigger();

-- CreateTable
-- zone
CREATE TABLE IF NOT EXISTS "zone_synced" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "rewardNodes" INTEGER,
  "activityId" TEXT,
  "addressId" TEXT NOT NULL,
  "statisticId" TEXT NOT NULL,
  "updatedByAccountId" TEXT,
  "createdByAccountId" TEXT,
  "write_id" UUID,
  CONSTRAINT "zone_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "zone_local" (
  "id" TEXT,
  "name" TEXT,
  "rewardNodes" INTEGER,
  "activityId" TEXT,
  "addressId" TEXT,
  "statisticId" TEXT,
  "updatedByAccountId" TEXT,
  "createdByAccountId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "zone_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "zone" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'name' = ANY(local.changed_columns)
      THEN local."name"
      ELSE synced."name"
    END AS "name",
   CASE
    WHEN 'rewardNodes' = ANY(local.changed_columns)
      THEN local."rewardNodes"
      ELSE synced."rewardNodes"
    END AS "rewardNodes",
   CASE
    WHEN 'activityId' = ANY(local.changed_columns)
      THEN local."activityId"
      ELSE synced."activityId"
    END AS "activityId",
   CASE
    WHEN 'addressId' = ANY(local.changed_columns)
      THEN local."addressId"
      ELSE synced."addressId"
    END AS "addressId",
   CASE
    WHEN 'statisticId' = ANY(local.changed_columns)
      THEN local."statisticId"
      ELSE synced."statisticId"
    END AS "statisticId",
   CASE
    WHEN 'updatedByAccountId' = ANY(local.changed_columns)
      THEN local."updatedByAccountId"
      ELSE synced."updatedByAccountId"
    END AS "updatedByAccountId",
   CASE
    WHEN 'createdByAccountId' = ANY(local.changed_columns)
      THEN local."createdByAccountId"
      ELSE synced."createdByAccountId"
    END AS "createdByAccountId"
  FROM "zone_synced" AS synced
  FULL OUTER JOIN "zone_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION zone_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "zone_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "zone_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'name');
    changed_cols := array_append(changed_cols, 'rewardNodes');
    changed_cols := array_append(changed_cols, 'activityId');
    changed_cols := array_append(changed_cols, 'addressId');
    changed_cols := array_append(changed_cols, 'statisticId');
    changed_cols := array_append(changed_cols, 'updatedByAccountId');
    changed_cols := array_append(changed_cols, 'createdByAccountId');

    INSERT INTO "zone_local" (
    "id", "name", "rewardNodes", "activityId", "addressId", "statisticId", "updatedByAccountId", "createdByAccountId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."name", NEW."rewardNodes", NEW."activityId", NEW."addressId", NEW."statisticId", NEW."updatedByAccountId", NEW."createdByAccountId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'zone',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'rewardNodes', NEW."rewardNodes",
      'activityId', NEW."activityId",
      'addressId', NEW."addressId",
      'statisticId', NEW."statisticId",
      'updatedByAccountId', NEW."updatedByAccountId",
      'createdByAccountId', NEW."createdByAccountId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION zone_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "zone_synced"%ROWTYPE;
    local "zone_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "zone_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "zone_local" WHERE "id" = NEW."id";
    
    IF NEW."name" IS DISTINCT FROM synced."name" THEN
      changed_cols := array_append(changed_cols, 'name');
    END IF;
    IF NEW."rewardNodes" IS DISTINCT FROM synced."rewardNodes" THEN
      changed_cols := array_append(changed_cols, 'rewardNodes');
    END IF;
    IF NEW."activityId" IS DISTINCT FROM synced."activityId" THEN
      changed_cols := array_append(changed_cols, 'activityId');
    END IF;
    IF NEW."addressId" IS DISTINCT FROM synced."addressId" THEN
      changed_cols := array_append(changed_cols, 'addressId');
    END IF;
    IF NEW."statisticId" IS DISTINCT FROM synced."statisticId" THEN
      changed_cols := array_append(changed_cols, 'statisticId');
    END IF;
    IF NEW."updatedByAccountId" IS DISTINCT FROM synced."updatedByAccountId" THEN
      changed_cols := array_append(changed_cols, 'updatedByAccountId');
    END IF;
    IF NEW."createdByAccountId" IS DISTINCT FROM synced."createdByAccountId" THEN
      changed_cols := array_append(changed_cols, 'createdByAccountId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "zone_local" (
        "id", "name", "rewardNodes", "activityId", "addressId", "statisticId", "updatedByAccountId", "createdByAccountId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."name", NEW."rewardNodes", NEW."activityId", NEW."addressId", NEW."statisticId", NEW."updatedByAccountId", NEW."createdByAccountId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "zone_local"
    SET
        
    "name" = NEW."name",
    "rewardNodes" = NEW."rewardNodes",
    "activityId" = NEW."activityId",
    "addressId" = NEW."addressId",
    "statisticId" = NEW."statisticId",
    "updatedByAccountId" = NEW."updatedByAccountId",
    "createdByAccountId" = NEW."createdByAccountId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'zone',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'rewardNodes', NEW."rewardNodes",
      'activityId', NEW."activityId",
      'addressId', NEW."addressId",
      'statisticId', NEW."statisticId",
      'updatedByAccountId', NEW."updatedByAccountId",
      'createdByAccountId', NEW."createdByAccountId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION zone_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "zone_local" WHERE "id" = OLD."id") THEN
    UPDATE "zone_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "zone_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'zone',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER zone_insert
INSTEAD OF INSERT ON "zone"
FOR EACH ROW EXECUTE FUNCTION zone_insert_trigger();

CREATE OR REPLACE TRIGGER zone_update
INSTEAD OF UPDATE ON "zone"
FOR EACH ROW EXECUTE FUNCTION zone_update_trigger();

CREATE OR REPLACE TRIGGER zone_delete
INSTEAD OF DELETE ON "zone"
FOR EACH ROW EXECUTE FUNCTION zone_delete_trigger();


CREATE OR REPLACE FUNCTION zone_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "zone_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION zone_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "zone_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "zone_synced"
FOR EACH ROW EXECUTE FUNCTION zone_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "zone_synced"
FOR EACH ROW EXECUTE FUNCTION zone_delete_local_on_synced_delete_trigger();

-- CreateTable
-- image
CREATE TABLE IF NOT EXISTS "image_synced" (
  "id" TEXT NOT NULL,
  "dataUrl" TEXT NOT NULL,
  "belongToNpcId" TEXT,
  "weaponId" TEXT,
  "armorId" TEXT,
  "optionId" TEXT,
  "mobId" TEXT,
  "write_id" UUID,
  CONSTRAINT "image_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "image_local" (
  "id" TEXT,
  "dataUrl" TEXT,
  "belongToNpcId" TEXT,
  "weaponId" TEXT,
  "armorId" TEXT,
  "optionId" TEXT,
  "mobId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "image_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "image" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'dataUrl' = ANY(local.changed_columns)
      THEN local."dataUrl"
      ELSE synced."dataUrl"
    END AS "dataUrl",
   CASE
    WHEN 'belongToNpcId' = ANY(local.changed_columns)
      THEN local."belongToNpcId"
      ELSE synced."belongToNpcId"
    END AS "belongToNpcId",
   CASE
    WHEN 'weaponId' = ANY(local.changed_columns)
      THEN local."weaponId"
      ELSE synced."weaponId"
    END AS "weaponId",
   CASE
    WHEN 'armorId' = ANY(local.changed_columns)
      THEN local."armorId"
      ELSE synced."armorId"
    END AS "armorId",
   CASE
    WHEN 'optionId' = ANY(local.changed_columns)
      THEN local."optionId"
      ELSE synced."optionId"
    END AS "optionId",
   CASE
    WHEN 'mobId' = ANY(local.changed_columns)
      THEN local."mobId"
      ELSE synced."mobId"
    END AS "mobId"
  FROM "image_synced" AS synced
  FULL OUTER JOIN "image_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION image_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "image_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "image_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'dataUrl');
    changed_cols := array_append(changed_cols, 'belongToNpcId');
    changed_cols := array_append(changed_cols, 'weaponId');
    changed_cols := array_append(changed_cols, 'armorId');
    changed_cols := array_append(changed_cols, 'optionId');
    changed_cols := array_append(changed_cols, 'mobId');

    INSERT INTO "image_local" (
    "id", "dataUrl", "belongToNpcId", "weaponId", "armorId", "optionId", "mobId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."dataUrl", NEW."belongToNpcId", NEW."weaponId", NEW."armorId", NEW."optionId", NEW."mobId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'image',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'dataUrl', NEW."dataUrl",
      'belongToNpcId', NEW."belongToNpcId",
      'weaponId', NEW."weaponId",
      'armorId', NEW."armorId",
      'optionId', NEW."optionId",
      'mobId', NEW."mobId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION image_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "image_synced"%ROWTYPE;
    local "image_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "image_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "image_local" WHERE "id" = NEW."id";
    
    IF NEW."dataUrl" IS DISTINCT FROM synced."dataUrl" THEN
      changed_cols := array_append(changed_cols, 'dataUrl');
    END IF;
    IF NEW."belongToNpcId" IS DISTINCT FROM synced."belongToNpcId" THEN
      changed_cols := array_append(changed_cols, 'belongToNpcId');
    END IF;
    IF NEW."weaponId" IS DISTINCT FROM synced."weaponId" THEN
      changed_cols := array_append(changed_cols, 'weaponId');
    END IF;
    IF NEW."armorId" IS DISTINCT FROM synced."armorId" THEN
      changed_cols := array_append(changed_cols, 'armorId');
    END IF;
    IF NEW."optionId" IS DISTINCT FROM synced."optionId" THEN
      changed_cols := array_append(changed_cols, 'optionId');
    END IF;
    IF NEW."mobId" IS DISTINCT FROM synced."mobId" THEN
      changed_cols := array_append(changed_cols, 'mobId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "image_local" (
        "id", "dataUrl", "belongToNpcId", "weaponId", "armorId", "optionId", "mobId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."dataUrl", NEW."belongToNpcId", NEW."weaponId", NEW."armorId", NEW."optionId", NEW."mobId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "image_local"
    SET
        
    "dataUrl" = NEW."dataUrl",
    "belongToNpcId" = NEW."belongToNpcId",
    "weaponId" = NEW."weaponId",
    "armorId" = NEW."armorId",
    "optionId" = NEW."optionId",
    "mobId" = NEW."mobId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'image',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'dataUrl', NEW."dataUrl",
      'belongToNpcId', NEW."belongToNpcId",
      'weaponId', NEW."weaponId",
      'armorId', NEW."armorId",
      'optionId', NEW."optionId",
      'mobId', NEW."mobId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION image_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "image_local" WHERE "id" = OLD."id") THEN
    UPDATE "image_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "image_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'image',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER image_insert
INSTEAD OF INSERT ON "image"
FOR EACH ROW EXECUTE FUNCTION image_insert_trigger();

CREATE OR REPLACE TRIGGER image_update
INSTEAD OF UPDATE ON "image"
FOR EACH ROW EXECUTE FUNCTION image_update_trigger();

CREATE OR REPLACE TRIGGER image_delete
INSTEAD OF DELETE ON "image"
FOR EACH ROW EXECUTE FUNCTION image_delete_trigger();


CREATE OR REPLACE FUNCTION image_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "image_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION image_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "image_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "image_synced"
FOR EACH ROW EXECUTE FUNCTION image_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "image_synced"
FOR EACH ROW EXECUTE FUNCTION image_delete_local_on_synced_delete_trigger();

-- CreateTable
-- statistic
CREATE TABLE IF NOT EXISTS "statistic_synced" (
  "id" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL,
  "usageTimestamps" TEXT[],
  "viewTimestamps" TEXT[],
  "write_id" UUID,
  CONSTRAINT "statistic_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "statistic_local" (
  "id" TEXT,
  "updatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3),
  "usageTimestamps" TEXT[],
  "viewTimestamps" TEXT[],
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "statistic_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "statistic" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'updatedAt' = ANY(local.changed_columns)
      THEN local."updatedAt"
      ELSE synced."updatedAt"
    END AS "updatedAt",
   CASE
    WHEN 'createdAt' = ANY(local.changed_columns)
      THEN local."createdAt"
      ELSE synced."createdAt"
    END AS "createdAt",
   CASE
    WHEN 'usageTimestamps' = ANY(local.changed_columns)
      THEN local."usageTimestamps"
      ELSE synced."usageTimestamps"
    END AS "usageTimestamps",
   CASE
    WHEN 'viewTimestamps' = ANY(local.changed_columns)
      THEN local."viewTimestamps"
      ELSE synced."viewTimestamps"
    END AS "viewTimestamps"
  FROM "statistic_synced" AS synced
  FULL OUTER JOIN "statistic_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION statistic_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "statistic_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "statistic_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'updatedAt');
    changed_cols := array_append(changed_cols, 'createdAt');
    changed_cols := array_append(changed_cols, 'usageTimestamps');
    changed_cols := array_append(changed_cols, 'viewTimestamps');

    INSERT INTO "statistic_local" (
    "id", "updatedAt", "createdAt", "usageTimestamps", "viewTimestamps",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."updatedAt", NEW."createdAt", NEW."usageTimestamps", NEW."viewTimestamps",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'statistic',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'updatedAt', NEW."updatedAt",
      'createdAt', NEW."createdAt",
      'usageTimestamps', NEW."usageTimestamps",
      'viewTimestamps', NEW."viewTimestamps"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION statistic_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "statistic_synced"%ROWTYPE;
    local "statistic_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "statistic_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "statistic_local" WHERE "id" = NEW."id";
    
    IF NEW."updatedAt" IS DISTINCT FROM synced."updatedAt" THEN
      changed_cols := array_append(changed_cols, 'updatedAt');
    END IF;
    IF NEW."createdAt" IS DISTINCT FROM synced."createdAt" THEN
      changed_cols := array_append(changed_cols, 'createdAt');
    END IF;
    IF NEW."usageTimestamps" IS DISTINCT FROM synced."usageTimestamps" THEN
      changed_cols := array_append(changed_cols, 'usageTimestamps');
    END IF;
    IF NEW."viewTimestamps" IS DISTINCT FROM synced."viewTimestamps" THEN
      changed_cols := array_append(changed_cols, 'viewTimestamps');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "statistic_local" (
        "id", "updatedAt", "createdAt", "usageTimestamps", "viewTimestamps",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."updatedAt", NEW."createdAt", NEW."usageTimestamps", NEW."viewTimestamps",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "statistic_local"
    SET
        
    "updatedAt" = NEW."updatedAt",
    "createdAt" = NEW."createdAt",
    "usageTimestamps" = NEW."usageTimestamps",
    "viewTimestamps" = NEW."viewTimestamps",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'statistic',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'updatedAt', NEW."updatedAt",
      'createdAt', NEW."createdAt",
      'usageTimestamps', NEW."usageTimestamps",
      'viewTimestamps', NEW."viewTimestamps"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION statistic_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "statistic_local" WHERE "id" = OLD."id") THEN
    UPDATE "statistic_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "statistic_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'statistic',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER statistic_insert
INSTEAD OF INSERT ON "statistic"
FOR EACH ROW EXECUTE FUNCTION statistic_insert_trigger();

CREATE OR REPLACE TRIGGER statistic_update
INSTEAD OF UPDATE ON "statistic"
FOR EACH ROW EXECUTE FUNCTION statistic_update_trigger();

CREATE OR REPLACE TRIGGER statistic_delete
INSTEAD OF DELETE ON "statistic"
FOR EACH ROW EXECUTE FUNCTION statistic_delete_trigger();


CREATE OR REPLACE FUNCTION statistic_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "statistic_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION statistic_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "statistic_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "statistic_synced"
FOR EACH ROW EXECUTE FUNCTION statistic_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "statistic_synced"
FOR EACH ROW EXECUTE FUNCTION statistic_delete_local_on_synced_delete_trigger();

-- CreateTable
-- mob
CREATE TABLE IF NOT EXISTS "mob_synced" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "MobType" NOT NULL,
  "captureable" BOOLEAN NOT NULL,
  "baseLv" INTEGER NOT NULL,
  "experience" INTEGER NOT NULL,
  "partsExperience" INTEGER NOT NULL,
  "initialElement" "ElementType" NOT NULL,
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
  "normalDefExp" INTEGER NOT NULL,
  "physicDefExp" INTEGER NOT NULL,
  "magicDefExp" INTEGER NOT NULL,
  "actions" JSONB NOT NULL,
  "details" TEXT,
  "dataSources" TEXT NOT NULL,
  "statisticId" TEXT NOT NULL,
  "updatedByAccountId" TEXT,
  "createdByAccountId" TEXT,
  "write_id" UUID,
  CONSTRAINT "mob_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "mob_local" (
  "id" TEXT,
  "name" TEXT,
  "type" "MobType",
  "captureable" BOOLEAN,
  "baseLv" INTEGER,
  "experience" INTEGER,
  "partsExperience" INTEGER,
  "initialElement" "ElementType",
  "radius" INTEGER,
  "maxhp" INTEGER,
  "physicalDefense" INTEGER,
  "physicalResistance" INTEGER,
  "magicalDefense" INTEGER,
  "magicalResistance" INTEGER,
  "criticalResistance" INTEGER,
  "avoidance" INTEGER,
  "dodge" INTEGER,
  "block" INTEGER,
  "normalDefExp" INTEGER,
  "physicDefExp" INTEGER,
  "magicDefExp" INTEGER,
  "actions" JSONB,
  "details" TEXT,
  "dataSources" TEXT,
  "statisticId" TEXT,
  "updatedByAccountId" TEXT,
  "createdByAccountId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "mob_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "mob" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'name' = ANY(local.changed_columns)
      THEN local."name"
      ELSE synced."name"
    END AS "name",
   CASE
    WHEN 'type' = ANY(local.changed_columns)
      THEN local."type"
      ELSE synced."type"
    END AS "type",
   CASE
    WHEN 'captureable' = ANY(local.changed_columns)
      THEN local."captureable"
      ELSE synced."captureable"
    END AS "captureable",
   CASE
    WHEN 'baseLv' = ANY(local.changed_columns)
      THEN local."baseLv"
      ELSE synced."baseLv"
    END AS "baseLv",
   CASE
    WHEN 'experience' = ANY(local.changed_columns)
      THEN local."experience"
      ELSE synced."experience"
    END AS "experience",
   CASE
    WHEN 'partsExperience' = ANY(local.changed_columns)
      THEN local."partsExperience"
      ELSE synced."partsExperience"
    END AS "partsExperience",
   CASE
    WHEN 'initialElement' = ANY(local.changed_columns)
      THEN local."initialElement"
      ELSE synced."initialElement"
    END AS "initialElement",
   CASE
    WHEN 'radius' = ANY(local.changed_columns)
      THEN local."radius"
      ELSE synced."radius"
    END AS "radius",
   CASE
    WHEN 'maxhp' = ANY(local.changed_columns)
      THEN local."maxhp"
      ELSE synced."maxhp"
    END AS "maxhp",
   CASE
    WHEN 'physicalDefense' = ANY(local.changed_columns)
      THEN local."physicalDefense"
      ELSE synced."physicalDefense"
    END AS "physicalDefense",
   CASE
    WHEN 'physicalResistance' = ANY(local.changed_columns)
      THEN local."physicalResistance"
      ELSE synced."physicalResistance"
    END AS "physicalResistance",
   CASE
    WHEN 'magicalDefense' = ANY(local.changed_columns)
      THEN local."magicalDefense"
      ELSE synced."magicalDefense"
    END AS "magicalDefense",
   CASE
    WHEN 'magicalResistance' = ANY(local.changed_columns)
      THEN local."magicalResistance"
      ELSE synced."magicalResistance"
    END AS "magicalResistance",
   CASE
    WHEN 'criticalResistance' = ANY(local.changed_columns)
      THEN local."criticalResistance"
      ELSE synced."criticalResistance"
    END AS "criticalResistance",
   CASE
    WHEN 'avoidance' = ANY(local.changed_columns)
      THEN local."avoidance"
      ELSE synced."avoidance"
    END AS "avoidance",
   CASE
    WHEN 'dodge' = ANY(local.changed_columns)
      THEN local."dodge"
      ELSE synced."dodge"
    END AS "dodge",
   CASE
    WHEN 'block' = ANY(local.changed_columns)
      THEN local."block"
      ELSE synced."block"
    END AS "block",
   CASE
    WHEN 'normalDefExp' = ANY(local.changed_columns)
      THEN local."normalDefExp"
      ELSE synced."normalDefExp"
    END AS "normalDefExp",
   CASE
    WHEN 'physicDefExp' = ANY(local.changed_columns)
      THEN local."physicDefExp"
      ELSE synced."physicDefExp"
    END AS "physicDefExp",
   CASE
    WHEN 'magicDefExp' = ANY(local.changed_columns)
      THEN local."magicDefExp"
      ELSE synced."magicDefExp"
    END AS "magicDefExp",
   CASE
    WHEN 'actions' = ANY(local.changed_columns)
      THEN local."actions"
      ELSE synced."actions"
    END AS "actions",
   CASE
    WHEN 'details' = ANY(local.changed_columns)
      THEN local."details"
      ELSE synced."details"
    END AS "details",
   CASE
    WHEN 'dataSources' = ANY(local.changed_columns)
      THEN local."dataSources"
      ELSE synced."dataSources"
    END AS "dataSources",
   CASE
    WHEN 'statisticId' = ANY(local.changed_columns)
      THEN local."statisticId"
      ELSE synced."statisticId"
    END AS "statisticId",
   CASE
    WHEN 'updatedByAccountId' = ANY(local.changed_columns)
      THEN local."updatedByAccountId"
      ELSE synced."updatedByAccountId"
    END AS "updatedByAccountId",
   CASE
    WHEN 'createdByAccountId' = ANY(local.changed_columns)
      THEN local."createdByAccountId"
      ELSE synced."createdByAccountId"
    END AS "createdByAccountId"
  FROM "mob_synced" AS synced
  FULL OUTER JOIN "mob_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION mob_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "mob_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "mob_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'name');
    changed_cols := array_append(changed_cols, 'type');
    changed_cols := array_append(changed_cols, 'captureable');
    changed_cols := array_append(changed_cols, 'baseLv');
    changed_cols := array_append(changed_cols, 'experience');
    changed_cols := array_append(changed_cols, 'partsExperience');
    changed_cols := array_append(changed_cols, 'initialElement');
    changed_cols := array_append(changed_cols, 'radius');
    changed_cols := array_append(changed_cols, 'maxhp');
    changed_cols := array_append(changed_cols, 'physicalDefense');
    changed_cols := array_append(changed_cols, 'physicalResistance');
    changed_cols := array_append(changed_cols, 'magicalDefense');
    changed_cols := array_append(changed_cols, 'magicalResistance');
    changed_cols := array_append(changed_cols, 'criticalResistance');
    changed_cols := array_append(changed_cols, 'avoidance');
    changed_cols := array_append(changed_cols, 'dodge');
    changed_cols := array_append(changed_cols, 'block');
    changed_cols := array_append(changed_cols, 'normalDefExp');
    changed_cols := array_append(changed_cols, 'physicDefExp');
    changed_cols := array_append(changed_cols, 'magicDefExp');
    changed_cols := array_append(changed_cols, 'actions');
    changed_cols := array_append(changed_cols, 'details');
    changed_cols := array_append(changed_cols, 'dataSources');
    changed_cols := array_append(changed_cols, 'statisticId');
    changed_cols := array_append(changed_cols, 'updatedByAccountId');
    changed_cols := array_append(changed_cols, 'createdByAccountId');

    INSERT INTO "mob_local" (
    "id", "name", "type", "captureable", "baseLv", "experience", "partsExperience", "initialElement", "radius", "maxhp", "physicalDefense", "physicalResistance", "magicalDefense", "magicalResistance", "criticalResistance", "avoidance", "dodge", "block", "normalDefExp", "physicDefExp", "magicDefExp", "actions", "details", "dataSources", "statisticId", "updatedByAccountId", "createdByAccountId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."name", NEW."type", NEW."captureable", NEW."baseLv", NEW."experience", NEW."partsExperience", NEW."initialElement", NEW."radius", NEW."maxhp", NEW."physicalDefense", NEW."physicalResistance", NEW."magicalDefense", NEW."magicalResistance", NEW."criticalResistance", NEW."avoidance", NEW."dodge", NEW."block", NEW."normalDefExp", NEW."physicDefExp", NEW."magicDefExp", NEW."actions", NEW."details", NEW."dataSources", NEW."statisticId", NEW."updatedByAccountId", NEW."createdByAccountId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'mob',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'type', NEW."type",
      'captureable', NEW."captureable",
      'baseLv', NEW."baseLv",
      'experience', NEW."experience",
      'partsExperience', NEW."partsExperience",
      'initialElement', NEW."initialElement",
      'radius', NEW."radius",
      'maxhp', NEW."maxhp",
      'physicalDefense', NEW."physicalDefense",
      'physicalResistance', NEW."physicalResistance",
      'magicalDefense', NEW."magicalDefense",
      'magicalResistance', NEW."magicalResistance",
      'criticalResistance', NEW."criticalResistance",
      'avoidance', NEW."avoidance",
      'dodge', NEW."dodge",
      'block', NEW."block",
      'normalDefExp', NEW."normalDefExp",
      'physicDefExp', NEW."physicDefExp",
      'magicDefExp', NEW."magicDefExp",
      'actions', NEW."actions",
      'details', NEW."details",
      'dataSources', NEW."dataSources",
      'statisticId', NEW."statisticId",
      'updatedByAccountId', NEW."updatedByAccountId",
      'createdByAccountId', NEW."createdByAccountId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION mob_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "mob_synced"%ROWTYPE;
    local "mob_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "mob_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "mob_local" WHERE "id" = NEW."id";
    
    IF NEW."name" IS DISTINCT FROM synced."name" THEN
      changed_cols := array_append(changed_cols, 'name');
    END IF;
    IF NEW."type" IS DISTINCT FROM synced."type" THEN
      changed_cols := array_append(changed_cols, 'type');
    END IF;
    IF NEW."captureable" IS DISTINCT FROM synced."captureable" THEN
      changed_cols := array_append(changed_cols, 'captureable');
    END IF;
    IF NEW."baseLv" IS DISTINCT FROM synced."baseLv" THEN
      changed_cols := array_append(changed_cols, 'baseLv');
    END IF;
    IF NEW."experience" IS DISTINCT FROM synced."experience" THEN
      changed_cols := array_append(changed_cols, 'experience');
    END IF;
    IF NEW."partsExperience" IS DISTINCT FROM synced."partsExperience" THEN
      changed_cols := array_append(changed_cols, 'partsExperience');
    END IF;
    IF NEW."initialElement" IS DISTINCT FROM synced."initialElement" THEN
      changed_cols := array_append(changed_cols, 'initialElement');
    END IF;
    IF NEW."radius" IS DISTINCT FROM synced."radius" THEN
      changed_cols := array_append(changed_cols, 'radius');
    END IF;
    IF NEW."maxhp" IS DISTINCT FROM synced."maxhp" THEN
      changed_cols := array_append(changed_cols, 'maxhp');
    END IF;
    IF NEW."physicalDefense" IS DISTINCT FROM synced."physicalDefense" THEN
      changed_cols := array_append(changed_cols, 'physicalDefense');
    END IF;
    IF NEW."physicalResistance" IS DISTINCT FROM synced."physicalResistance" THEN
      changed_cols := array_append(changed_cols, 'physicalResistance');
    END IF;
    IF NEW."magicalDefense" IS DISTINCT FROM synced."magicalDefense" THEN
      changed_cols := array_append(changed_cols, 'magicalDefense');
    END IF;
    IF NEW."magicalResistance" IS DISTINCT FROM synced."magicalResistance" THEN
      changed_cols := array_append(changed_cols, 'magicalResistance');
    END IF;
    IF NEW."criticalResistance" IS DISTINCT FROM synced."criticalResistance" THEN
      changed_cols := array_append(changed_cols, 'criticalResistance');
    END IF;
    IF NEW."avoidance" IS DISTINCT FROM synced."avoidance" THEN
      changed_cols := array_append(changed_cols, 'avoidance');
    END IF;
    IF NEW."dodge" IS DISTINCT FROM synced."dodge" THEN
      changed_cols := array_append(changed_cols, 'dodge');
    END IF;
    IF NEW."block" IS DISTINCT FROM synced."block" THEN
      changed_cols := array_append(changed_cols, 'block');
    END IF;
    IF NEW."normalDefExp" IS DISTINCT FROM synced."normalDefExp" THEN
      changed_cols := array_append(changed_cols, 'normalDefExp');
    END IF;
    IF NEW."physicDefExp" IS DISTINCT FROM synced."physicDefExp" THEN
      changed_cols := array_append(changed_cols, 'physicDefExp');
    END IF;
    IF NEW."magicDefExp" IS DISTINCT FROM synced."magicDefExp" THEN
      changed_cols := array_append(changed_cols, 'magicDefExp');
    END IF;
    IF NEW."actions" IS DISTINCT FROM synced."actions" THEN
      changed_cols := array_append(changed_cols, 'actions');
    END IF;
    IF NEW."details" IS DISTINCT FROM synced."details" THEN
      changed_cols := array_append(changed_cols, 'details');
    END IF;
    IF NEW."dataSources" IS DISTINCT FROM synced."dataSources" THEN
      changed_cols := array_append(changed_cols, 'dataSources');
    END IF;
    IF NEW."statisticId" IS DISTINCT FROM synced."statisticId" THEN
      changed_cols := array_append(changed_cols, 'statisticId');
    END IF;
    IF NEW."updatedByAccountId" IS DISTINCT FROM synced."updatedByAccountId" THEN
      changed_cols := array_append(changed_cols, 'updatedByAccountId');
    END IF;
    IF NEW."createdByAccountId" IS DISTINCT FROM synced."createdByAccountId" THEN
      changed_cols := array_append(changed_cols, 'createdByAccountId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "mob_local" (
        "id", "name", "type", "captureable", "baseLv", "experience", "partsExperience", "initialElement", "radius", "maxhp", "physicalDefense", "physicalResistance", "magicalDefense", "magicalResistance", "criticalResistance", "avoidance", "dodge", "block", "normalDefExp", "physicDefExp", "magicDefExp", "actions", "details", "dataSources", "statisticId", "updatedByAccountId", "createdByAccountId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."name", NEW."type", NEW."captureable", NEW."baseLv", NEW."experience", NEW."partsExperience", NEW."initialElement", NEW."radius", NEW."maxhp", NEW."physicalDefense", NEW."physicalResistance", NEW."magicalDefense", NEW."magicalResistance", NEW."criticalResistance", NEW."avoidance", NEW."dodge", NEW."block", NEW."normalDefExp", NEW."physicDefExp", NEW."magicDefExp", NEW."actions", NEW."details", NEW."dataSources", NEW."statisticId", NEW."updatedByAccountId", NEW."createdByAccountId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "mob_local"
    SET
        
    "name" = NEW."name",
    "type" = NEW."type",
    "captureable" = NEW."captureable",
    "baseLv" = NEW."baseLv",
    "experience" = NEW."experience",
    "partsExperience" = NEW."partsExperience",
    "initialElement" = NEW."initialElement",
    "radius" = NEW."radius",
    "maxhp" = NEW."maxhp",
    "physicalDefense" = NEW."physicalDefense",
    "physicalResistance" = NEW."physicalResistance",
    "magicalDefense" = NEW."magicalDefense",
    "magicalResistance" = NEW."magicalResistance",
    "criticalResistance" = NEW."criticalResistance",
    "avoidance" = NEW."avoidance",
    "dodge" = NEW."dodge",
    "block" = NEW."block",
    "normalDefExp" = NEW."normalDefExp",
    "physicDefExp" = NEW."physicDefExp",
    "magicDefExp" = NEW."magicDefExp",
    "actions" = NEW."actions",
    "details" = NEW."details",
    "dataSources" = NEW."dataSources",
    "statisticId" = NEW."statisticId",
    "updatedByAccountId" = NEW."updatedByAccountId",
    "createdByAccountId" = NEW."createdByAccountId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'mob',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'type', NEW."type",
      'captureable', NEW."captureable",
      'baseLv', NEW."baseLv",
      'experience', NEW."experience",
      'partsExperience', NEW."partsExperience",
      'initialElement', NEW."initialElement",
      'radius', NEW."radius",
      'maxhp', NEW."maxhp",
      'physicalDefense', NEW."physicalDefense",
      'physicalResistance', NEW."physicalResistance",
      'magicalDefense', NEW."magicalDefense",
      'magicalResistance', NEW."magicalResistance",
      'criticalResistance', NEW."criticalResistance",
      'avoidance', NEW."avoidance",
      'dodge', NEW."dodge",
      'block', NEW."block",
      'normalDefExp', NEW."normalDefExp",
      'physicDefExp', NEW."physicDefExp",
      'magicDefExp', NEW."magicDefExp",
      'actions', NEW."actions",
      'details', NEW."details",
      'dataSources', NEW."dataSources",
      'statisticId', NEW."statisticId",
      'updatedByAccountId', NEW."updatedByAccountId",
      'createdByAccountId', NEW."createdByAccountId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION mob_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "mob_local" WHERE "id" = OLD."id") THEN
    UPDATE "mob_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "mob_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'mob',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER mob_insert
INSTEAD OF INSERT ON "mob"
FOR EACH ROW EXECUTE FUNCTION mob_insert_trigger();

CREATE OR REPLACE TRIGGER mob_update
INSTEAD OF UPDATE ON "mob"
FOR EACH ROW EXECUTE FUNCTION mob_update_trigger();

CREATE OR REPLACE TRIGGER mob_delete
INSTEAD OF DELETE ON "mob"
FOR EACH ROW EXECUTE FUNCTION mob_delete_trigger();


CREATE OR REPLACE FUNCTION mob_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "mob_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION mob_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "mob_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "mob_synced"
FOR EACH ROW EXECUTE FUNCTION mob_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "mob_synced"
FOR EACH ROW EXECUTE FUNCTION mob_delete_local_on_synced_delete_trigger();

-- CreateTable
-- item
CREATE TABLE IF NOT EXISTS "item_synced" (
  "id" TEXT NOT NULL,
  "itemType" "ItemType" NOT NULL,
  "itemSourceType" "ItemSourceType" NOT NULL,
  "name" TEXT NOT NULL,
  "dataSources" TEXT NOT NULL,
  "details" TEXT,
  "statisticId" TEXT NOT NULL,
  "updatedByAccountId" TEXT,
  "createdByAccountId" TEXT,
  "write_id" UUID,
  CONSTRAINT "item_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "item_local" (
  "id" TEXT,
  "itemType" "ItemType",
  "itemSourceType" "ItemSourceType",
  "name" TEXT,
  "dataSources" TEXT,
  "details" TEXT,
  "statisticId" TEXT,
  "updatedByAccountId" TEXT,
  "createdByAccountId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "item_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "item" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'itemType' = ANY(local.changed_columns)
      THEN local."itemType"
      ELSE synced."itemType"
    END AS "itemType",
   CASE
    WHEN 'itemSourceType' = ANY(local.changed_columns)
      THEN local."itemSourceType"
      ELSE synced."itemSourceType"
    END AS "itemSourceType",
   CASE
    WHEN 'name' = ANY(local.changed_columns)
      THEN local."name"
      ELSE synced."name"
    END AS "name",
   CASE
    WHEN 'dataSources' = ANY(local.changed_columns)
      THEN local."dataSources"
      ELSE synced."dataSources"
    END AS "dataSources",
   CASE
    WHEN 'details' = ANY(local.changed_columns)
      THEN local."details"
      ELSE synced."details"
    END AS "details",
   CASE
    WHEN 'statisticId' = ANY(local.changed_columns)
      THEN local."statisticId"
      ELSE synced."statisticId"
    END AS "statisticId",
   CASE
    WHEN 'updatedByAccountId' = ANY(local.changed_columns)
      THEN local."updatedByAccountId"
      ELSE synced."updatedByAccountId"
    END AS "updatedByAccountId",
   CASE
    WHEN 'createdByAccountId' = ANY(local.changed_columns)
      THEN local."createdByAccountId"
      ELSE synced."createdByAccountId"
    END AS "createdByAccountId"
  FROM "item_synced" AS synced
  FULL OUTER JOIN "item_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION item_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "item_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "item_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'itemType');
    changed_cols := array_append(changed_cols, 'itemSourceType');
    changed_cols := array_append(changed_cols, 'name');
    changed_cols := array_append(changed_cols, 'dataSources');
    changed_cols := array_append(changed_cols, 'details');
    changed_cols := array_append(changed_cols, 'statisticId');
    changed_cols := array_append(changed_cols, 'updatedByAccountId');
    changed_cols := array_append(changed_cols, 'createdByAccountId');

    INSERT INTO "item_local" (
    "id", "itemType", "itemSourceType", "name", "dataSources", "details", "statisticId", "updatedByAccountId", "createdByAccountId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."itemType", NEW."itemSourceType", NEW."name", NEW."dataSources", NEW."details", NEW."statisticId", NEW."updatedByAccountId", NEW."createdByAccountId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'item',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'itemType', NEW."itemType",
      'itemSourceType', NEW."itemSourceType",
      'name', NEW."name",
      'dataSources', NEW."dataSources",
      'details', NEW."details",
      'statisticId', NEW."statisticId",
      'updatedByAccountId', NEW."updatedByAccountId",
      'createdByAccountId', NEW."createdByAccountId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION item_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "item_synced"%ROWTYPE;
    local "item_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "item_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "item_local" WHERE "id" = NEW."id";
    
    IF NEW."itemType" IS DISTINCT FROM synced."itemType" THEN
      changed_cols := array_append(changed_cols, 'itemType');
    END IF;
    IF NEW."itemSourceType" IS DISTINCT FROM synced."itemSourceType" THEN
      changed_cols := array_append(changed_cols, 'itemSourceType');
    END IF;
    IF NEW."name" IS DISTINCT FROM synced."name" THEN
      changed_cols := array_append(changed_cols, 'name');
    END IF;
    IF NEW."dataSources" IS DISTINCT FROM synced."dataSources" THEN
      changed_cols := array_append(changed_cols, 'dataSources');
    END IF;
    IF NEW."details" IS DISTINCT FROM synced."details" THEN
      changed_cols := array_append(changed_cols, 'details');
    END IF;
    IF NEW."statisticId" IS DISTINCT FROM synced."statisticId" THEN
      changed_cols := array_append(changed_cols, 'statisticId');
    END IF;
    IF NEW."updatedByAccountId" IS DISTINCT FROM synced."updatedByAccountId" THEN
      changed_cols := array_append(changed_cols, 'updatedByAccountId');
    END IF;
    IF NEW."createdByAccountId" IS DISTINCT FROM synced."createdByAccountId" THEN
      changed_cols := array_append(changed_cols, 'createdByAccountId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "item_local" (
        "id", "itemType", "itemSourceType", "name", "dataSources", "details", "statisticId", "updatedByAccountId", "createdByAccountId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."itemType", NEW."itemSourceType", NEW."name", NEW."dataSources", NEW."details", NEW."statisticId", NEW."updatedByAccountId", NEW."createdByAccountId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "item_local"
    SET
        
    "itemType" = NEW."itemType",
    "itemSourceType" = NEW."itemSourceType",
    "name" = NEW."name",
    "dataSources" = NEW."dataSources",
    "details" = NEW."details",
    "statisticId" = NEW."statisticId",
    "updatedByAccountId" = NEW."updatedByAccountId",
    "createdByAccountId" = NEW."createdByAccountId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'item',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'itemType', NEW."itemType",
      'itemSourceType', NEW."itemSourceType",
      'name', NEW."name",
      'dataSources', NEW."dataSources",
      'details', NEW."details",
      'statisticId', NEW."statisticId",
      'updatedByAccountId', NEW."updatedByAccountId",
      'createdByAccountId', NEW."createdByAccountId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION item_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "item_local" WHERE "id" = OLD."id") THEN
    UPDATE "item_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "item_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'item',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER item_insert
INSTEAD OF INSERT ON "item"
FOR EACH ROW EXECUTE FUNCTION item_insert_trigger();

CREATE OR REPLACE TRIGGER item_update
INSTEAD OF UPDATE ON "item"
FOR EACH ROW EXECUTE FUNCTION item_update_trigger();

CREATE OR REPLACE TRIGGER item_delete
INSTEAD OF DELETE ON "item"
FOR EACH ROW EXECUTE FUNCTION item_delete_trigger();


CREATE OR REPLACE FUNCTION item_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "item_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION item_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "item_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "item_synced"
FOR EACH ROW EXECUTE FUNCTION item_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "item_synced"
FOR EACH ROW EXECUTE FUNCTION item_delete_local_on_synced_delete_trigger();

-- CreateTable
-- material
CREATE TABLE IF NOT EXISTS "material_synced" (
  "name" TEXT NOT NULL,
  "type" "MaterialType" NOT NULL,
  "ptValue" INTEGER NOT NULL,
  "price" INTEGER NOT NULL,
  "itemId" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "material_synced_pkey" PRIMARY KEY ("itemId")
);
CREATE TABLE IF NOT EXISTS "material_local" (
  "name" TEXT,
  "type" "MaterialType",
  "ptValue" INTEGER,
  "price" INTEGER,
  "itemId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "material_local_pkey" PRIMARY KEY ("itemId")
);

CREATE OR REPLACE VIEW "material" AS
  SELECT
     CASE
    WHEN 'name' = ANY(local.changed_columns)
      THEN local."name"
      ELSE synced."name"
    END AS "name",
   CASE
    WHEN 'type' = ANY(local.changed_columns)
      THEN local."type"
      ELSE synced."type"
    END AS "type",
   CASE
    WHEN 'ptValue' = ANY(local.changed_columns)
      THEN local."ptValue"
      ELSE synced."ptValue"
    END AS "ptValue",
   CASE
    WHEN 'price' = ANY(local.changed_columns)
      THEN local."price"
      ELSE synced."price"
    END AS "price",
   COALESCE(local."itemId", synced."itemId") AS "itemId"
  FROM "material_synced" AS synced
  FULL OUTER JOIN "material_local" AS local
  ON synced."itemId" = local."itemId"
  WHERE (local."itemId" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION material_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "material_synced" WHERE "itemId" = NEW."itemId") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "material_local" WHERE "itemId" = NEW."itemId") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'name');
    changed_cols := array_append(changed_cols, 'type');
    changed_cols := array_append(changed_cols, 'ptValue');
    changed_cols := array_append(changed_cols, 'price');

    INSERT INTO "material_local" (
    "name", "type", "ptValue", "price", "itemId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."name", NEW."type", NEW."ptValue", NEW."price", NEW."itemId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'material',
    'insert',
    jsonb_build_object(
        'name', NEW."name",
      'type', NEW."type",
      'ptValue', NEW."ptValue",
      'price', NEW."price",
      'itemId', NEW."itemId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION material_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "material_synced"%ROWTYPE;
    local "material_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "material_synced" WHERE "itemId" = NEW."itemId";
    SELECT * INTO local FROM "material_local" WHERE "itemId" = NEW."itemId";
    
    IF NEW."name" IS DISTINCT FROM synced."name" THEN
      changed_cols := array_append(changed_cols, 'name');
    END IF;
    IF NEW."type" IS DISTINCT FROM synced."type" THEN
      changed_cols := array_append(changed_cols, 'type');
    END IF;
    IF NEW."ptValue" IS DISTINCT FROM synced."ptValue" THEN
      changed_cols := array_append(changed_cols, 'ptValue');
    END IF;
    IF NEW."price" IS DISTINCT FROM synced."price" THEN
      changed_cols := array_append(changed_cols, 'price');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "material_local" (
        "name", "type", "ptValue", "price", "itemId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."name", NEW."type", NEW."ptValue", NEW."price", NEW."itemId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "material_local"
    SET
        
    "name" = NEW."name",
    "type" = NEW."type",
    "ptValue" = NEW."ptValue",
    "price" = NEW."price",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "itemId" = NEW."itemId";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'material',
    'update',
    jsonb_build_object(
        'name', NEW."name",
      'type', NEW."type",
      'ptValue', NEW."ptValue",
      'price', NEW."price",
      'itemId', NEW."itemId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION material_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "material_local" WHERE "itemId" = OLD."itemId") THEN
    UPDATE "material_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "itemId" = OLD."itemId";
    ELSE
    INSERT INTO "material_local" (
        "itemId",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."itemId",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'material',
    'delete',
    jsonb_build_object('itemId', OLD."itemId"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER material_insert
INSTEAD OF INSERT ON "material"
FOR EACH ROW EXECUTE FUNCTION material_insert_trigger();

CREATE OR REPLACE TRIGGER material_update
INSTEAD OF UPDATE ON "material"
FOR EACH ROW EXECUTE FUNCTION material_update_trigger();

CREATE OR REPLACE TRIGGER material_delete
INSTEAD OF DELETE ON "material"
FOR EACH ROW EXECUTE FUNCTION material_delete_trigger();


CREATE OR REPLACE FUNCTION material_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "material_local"
  WHERE "itemId" = NEW."itemId"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION material_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "material_local"
  WHERE "itemId" = OLD."itemId";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "material_synced"
FOR EACH ROW EXECUTE FUNCTION material_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "material_synced"
FOR EACH ROW EXECUTE FUNCTION material_delete_local_on_synced_delete_trigger();

-- CreateTable
-- consumable
CREATE TABLE IF NOT EXISTS "consumable_synced" (
  "name" TEXT NOT NULL,
  "type" "ConsumableType" NOT NULL,
  "effectDuration" INTEGER NOT NULL,
  "effects" TEXT[],
  "itemId" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "consumable_synced_pkey" PRIMARY KEY ("itemId")
);
CREATE TABLE IF NOT EXISTS "consumable_local" (
  "name" TEXT,
  "type" "ConsumableType",
  "effectDuration" INTEGER,
  "effects" TEXT[],
  "itemId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "consumable_local_pkey" PRIMARY KEY ("itemId")
);

CREATE OR REPLACE VIEW "consumable" AS
  SELECT
     CASE
    WHEN 'name' = ANY(local.changed_columns)
      THEN local."name"
      ELSE synced."name"
    END AS "name",
   CASE
    WHEN 'type' = ANY(local.changed_columns)
      THEN local."type"
      ELSE synced."type"
    END AS "type",
   CASE
    WHEN 'effectDuration' = ANY(local.changed_columns)
      THEN local."effectDuration"
      ELSE synced."effectDuration"
    END AS "effectDuration",
   CASE
    WHEN 'effects' = ANY(local.changed_columns)
      THEN local."effects"
      ELSE synced."effects"
    END AS "effects",
   COALESCE(local."itemId", synced."itemId") AS "itemId"
  FROM "consumable_synced" AS synced
  FULL OUTER JOIN "consumable_local" AS local
  ON synced."itemId" = local."itemId"
  WHERE (local."itemId" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION consumable_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "consumable_synced" WHERE "itemId" = NEW."itemId") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "consumable_local" WHERE "itemId" = NEW."itemId") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'name');
    changed_cols := array_append(changed_cols, 'type');
    changed_cols := array_append(changed_cols, 'effectDuration');
    changed_cols := array_append(changed_cols, 'effects');

    INSERT INTO "consumable_local" (
    "name", "type", "effectDuration", "effects", "itemId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."name", NEW."type", NEW."effectDuration", NEW."effects", NEW."itemId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'consumable',
    'insert',
    jsonb_build_object(
        'name', NEW."name",
      'type', NEW."type",
      'effectDuration', NEW."effectDuration",
      'effects', NEW."effects",
      'itemId', NEW."itemId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION consumable_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "consumable_synced"%ROWTYPE;
    local "consumable_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "consumable_synced" WHERE "itemId" = NEW."itemId";
    SELECT * INTO local FROM "consumable_local" WHERE "itemId" = NEW."itemId";
    
    IF NEW."name" IS DISTINCT FROM synced."name" THEN
      changed_cols := array_append(changed_cols, 'name');
    END IF;
    IF NEW."type" IS DISTINCT FROM synced."type" THEN
      changed_cols := array_append(changed_cols, 'type');
    END IF;
    IF NEW."effectDuration" IS DISTINCT FROM synced."effectDuration" THEN
      changed_cols := array_append(changed_cols, 'effectDuration');
    END IF;
    IF NEW."effects" IS DISTINCT FROM synced."effects" THEN
      changed_cols := array_append(changed_cols, 'effects');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "consumable_local" (
        "name", "type", "effectDuration", "effects", "itemId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."name", NEW."type", NEW."effectDuration", NEW."effects", NEW."itemId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "consumable_local"
    SET
        
    "name" = NEW."name",
    "type" = NEW."type",
    "effectDuration" = NEW."effectDuration",
    "effects" = NEW."effects",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "itemId" = NEW."itemId";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'consumable',
    'update',
    jsonb_build_object(
        'name', NEW."name",
      'type', NEW."type",
      'effectDuration', NEW."effectDuration",
      'effects', NEW."effects",
      'itemId', NEW."itemId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION consumable_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "consumable_local" WHERE "itemId" = OLD."itemId") THEN
    UPDATE "consumable_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "itemId" = OLD."itemId";
    ELSE
    INSERT INTO "consumable_local" (
        "itemId",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."itemId",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'consumable',
    'delete',
    jsonb_build_object('itemId', OLD."itemId"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER consumable_insert
INSTEAD OF INSERT ON "consumable"
FOR EACH ROW EXECUTE FUNCTION consumable_insert_trigger();

CREATE OR REPLACE TRIGGER consumable_update
INSTEAD OF UPDATE ON "consumable"
FOR EACH ROW EXECUTE FUNCTION consumable_update_trigger();

CREATE OR REPLACE TRIGGER consumable_delete
INSTEAD OF DELETE ON "consumable"
FOR EACH ROW EXECUTE FUNCTION consumable_delete_trigger();


CREATE OR REPLACE FUNCTION consumable_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "consumable_local"
  WHERE "itemId" = NEW."itemId"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION consumable_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "consumable_local"
  WHERE "itemId" = OLD."itemId";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "consumable_synced"
FOR EACH ROW EXECUTE FUNCTION consumable_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "consumable_synced"
FOR EACH ROW EXECUTE FUNCTION consumable_delete_local_on_synced_delete_trigger();

-- CreateTable
-- crystal
CREATE TABLE IF NOT EXISTS "crystal_synced" (
  "name" TEXT NOT NULL,
  "type" "CrystalType" NOT NULL,
  "modifiers" TEXT[],
  "itemId" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "crystal_synced_pkey" PRIMARY KEY ("itemId")
);
CREATE TABLE IF NOT EXISTS "crystal_local" (
  "name" TEXT,
  "type" "CrystalType",
  "modifiers" TEXT[],
  "itemId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "crystal_local_pkey" PRIMARY KEY ("itemId")
);

CREATE OR REPLACE VIEW "crystal" AS
  SELECT
     CASE
    WHEN 'name' = ANY(local.changed_columns)
      THEN local."name"
      ELSE synced."name"
    END AS "name",
   CASE
    WHEN 'type' = ANY(local.changed_columns)
      THEN local."type"
      ELSE synced."type"
    END AS "type",
   CASE
    WHEN 'modifiers' = ANY(local.changed_columns)
      THEN local."modifiers"
      ELSE synced."modifiers"
    END AS "modifiers",
   COALESCE(local."itemId", synced."itemId") AS "itemId"
  FROM "crystal_synced" AS synced
  FULL OUTER JOIN "crystal_local" AS local
  ON synced."itemId" = local."itemId"
  WHERE (local."itemId" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION crystal_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "crystal_synced" WHERE "itemId" = NEW."itemId") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "crystal_local" WHERE "itemId" = NEW."itemId") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'name');
    changed_cols := array_append(changed_cols, 'type');
    changed_cols := array_append(changed_cols, 'modifiers');

    INSERT INTO "crystal_local" (
    "name", "type", "modifiers", "itemId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."name", NEW."type", NEW."modifiers", NEW."itemId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'crystal',
    'insert',
    jsonb_build_object(
        'name', NEW."name",
      'type', NEW."type",
      'modifiers', NEW."modifiers",
      'itemId', NEW."itemId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION crystal_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "crystal_synced"%ROWTYPE;
    local "crystal_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "crystal_synced" WHERE "itemId" = NEW."itemId";
    SELECT * INTO local FROM "crystal_local" WHERE "itemId" = NEW."itemId";
    
    IF NEW."name" IS DISTINCT FROM synced."name" THEN
      changed_cols := array_append(changed_cols, 'name');
    END IF;
    IF NEW."type" IS DISTINCT FROM synced."type" THEN
      changed_cols := array_append(changed_cols, 'type');
    END IF;
    IF NEW."modifiers" IS DISTINCT FROM synced."modifiers" THEN
      changed_cols := array_append(changed_cols, 'modifiers');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "crystal_local" (
        "name", "type", "modifiers", "itemId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."name", NEW."type", NEW."modifiers", NEW."itemId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "crystal_local"
    SET
        
    "name" = NEW."name",
    "type" = NEW."type",
    "modifiers" = NEW."modifiers",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "itemId" = NEW."itemId";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'crystal',
    'update',
    jsonb_build_object(
        'name', NEW."name",
      'type', NEW."type",
      'modifiers', NEW."modifiers",
      'itemId', NEW."itemId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION crystal_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "crystal_local" WHERE "itemId" = OLD."itemId") THEN
    UPDATE "crystal_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "itemId" = OLD."itemId";
    ELSE
    INSERT INTO "crystal_local" (
        "itemId",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."itemId",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'crystal',
    'delete',
    jsonb_build_object('itemId', OLD."itemId"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER crystal_insert
INSTEAD OF INSERT ON "crystal"
FOR EACH ROW EXECUTE FUNCTION crystal_insert_trigger();

CREATE OR REPLACE TRIGGER crystal_update
INSTEAD OF UPDATE ON "crystal"
FOR EACH ROW EXECUTE FUNCTION crystal_update_trigger();

CREATE OR REPLACE TRIGGER crystal_delete
INSTEAD OF DELETE ON "crystal"
FOR EACH ROW EXECUTE FUNCTION crystal_delete_trigger();


CREATE OR REPLACE FUNCTION crystal_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "crystal_local"
  WHERE "itemId" = NEW."itemId"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION crystal_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "crystal_local"
  WHERE "itemId" = OLD."itemId";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "crystal_synced"
FOR EACH ROW EXECUTE FUNCTION crystal_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "crystal_synced"
FOR EACH ROW EXECUTE FUNCTION crystal_delete_local_on_synced_delete_trigger();

-- CreateTable
-- weapon
CREATE TABLE IF NOT EXISTS "weapon_synced" (
  "name" TEXT NOT NULL,
  "type" "WeaponType" NOT NULL,
  "elementType" "ElementType" NOT NULL,
  "baseAbi" INTEGER NOT NULL,
  "stability" INTEGER NOT NULL,
  "modifiers" TEXT[],
  "colorA" INTEGER,
  "colorB" INTEGER,
  "colorC" INTEGER,
  "itemId" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "weapon_synced_pkey" PRIMARY KEY ("itemId")
);
CREATE TABLE IF NOT EXISTS "weapon_local" (
  "name" TEXT,
  "type" "WeaponType",
  "elementType" "ElementType",
  "baseAbi" INTEGER,
  "stability" INTEGER,
  "modifiers" TEXT[],
  "colorA" INTEGER,
  "colorB" INTEGER,
  "colorC" INTEGER,
  "itemId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "weapon_local_pkey" PRIMARY KEY ("itemId")
);

CREATE OR REPLACE VIEW "weapon" AS
  SELECT
     CASE
    WHEN 'name' = ANY(local.changed_columns)
      THEN local."name"
      ELSE synced."name"
    END AS "name",
   CASE
    WHEN 'type' = ANY(local.changed_columns)
      THEN local."type"
      ELSE synced."type"
    END AS "type",
   CASE
    WHEN 'elementType' = ANY(local.changed_columns)
      THEN local."elementType"
      ELSE synced."elementType"
    END AS "elementType",
   CASE
    WHEN 'baseAbi' = ANY(local.changed_columns)
      THEN local."baseAbi"
      ELSE synced."baseAbi"
    END AS "baseAbi",
   CASE
    WHEN 'stability' = ANY(local.changed_columns)
      THEN local."stability"
      ELSE synced."stability"
    END AS "stability",
   CASE
    WHEN 'modifiers' = ANY(local.changed_columns)
      THEN local."modifiers"
      ELSE synced."modifiers"
    END AS "modifiers",
   CASE
    WHEN 'colorA' = ANY(local.changed_columns)
      THEN local."colorA"
      ELSE synced."colorA"
    END AS "colorA",
   CASE
    WHEN 'colorB' = ANY(local.changed_columns)
      THEN local."colorB"
      ELSE synced."colorB"
    END AS "colorB",
   CASE
    WHEN 'colorC' = ANY(local.changed_columns)
      THEN local."colorC"
      ELSE synced."colorC"
    END AS "colorC",
   COALESCE(local."itemId", synced."itemId") AS "itemId"
  FROM "weapon_synced" AS synced
  FULL OUTER JOIN "weapon_local" AS local
  ON synced."itemId" = local."itemId"
  WHERE (local."itemId" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION weapon_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "weapon_synced" WHERE "itemId" = NEW."itemId") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "weapon_local" WHERE "itemId" = NEW."itemId") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'name');
    changed_cols := array_append(changed_cols, 'type');
    changed_cols := array_append(changed_cols, 'elementType');
    changed_cols := array_append(changed_cols, 'baseAbi');
    changed_cols := array_append(changed_cols, 'stability');
    changed_cols := array_append(changed_cols, 'modifiers');
    changed_cols := array_append(changed_cols, 'colorA');
    changed_cols := array_append(changed_cols, 'colorB');
    changed_cols := array_append(changed_cols, 'colorC');

    INSERT INTO "weapon_local" (
    "name", "type", "elementType", "baseAbi", "stability", "modifiers", "colorA", "colorB", "colorC", "itemId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."name", NEW."type", NEW."elementType", NEW."baseAbi", NEW."stability", NEW."modifiers", NEW."colorA", NEW."colorB", NEW."colorC", NEW."itemId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'weapon',
    'insert',
    jsonb_build_object(
        'name', NEW."name",
      'type', NEW."type",
      'elementType', NEW."elementType",
      'baseAbi', NEW."baseAbi",
      'stability', NEW."stability",
      'modifiers', NEW."modifiers",
      'colorA', NEW."colorA",
      'colorB', NEW."colorB",
      'colorC', NEW."colorC",
      'itemId', NEW."itemId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION weapon_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "weapon_synced"%ROWTYPE;
    local "weapon_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "weapon_synced" WHERE "itemId" = NEW."itemId";
    SELECT * INTO local FROM "weapon_local" WHERE "itemId" = NEW."itemId";
    
    IF NEW."name" IS DISTINCT FROM synced."name" THEN
      changed_cols := array_append(changed_cols, 'name');
    END IF;
    IF NEW."type" IS DISTINCT FROM synced."type" THEN
      changed_cols := array_append(changed_cols, 'type');
    END IF;
    IF NEW."elementType" IS DISTINCT FROM synced."elementType" THEN
      changed_cols := array_append(changed_cols, 'elementType');
    END IF;
    IF NEW."baseAbi" IS DISTINCT FROM synced."baseAbi" THEN
      changed_cols := array_append(changed_cols, 'baseAbi');
    END IF;
    IF NEW."stability" IS DISTINCT FROM synced."stability" THEN
      changed_cols := array_append(changed_cols, 'stability');
    END IF;
    IF NEW."modifiers" IS DISTINCT FROM synced."modifiers" THEN
      changed_cols := array_append(changed_cols, 'modifiers');
    END IF;
    IF NEW."colorA" IS DISTINCT FROM synced."colorA" THEN
      changed_cols := array_append(changed_cols, 'colorA');
    END IF;
    IF NEW."colorB" IS DISTINCT FROM synced."colorB" THEN
      changed_cols := array_append(changed_cols, 'colorB');
    END IF;
    IF NEW."colorC" IS DISTINCT FROM synced."colorC" THEN
      changed_cols := array_append(changed_cols, 'colorC');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "weapon_local" (
        "name", "type", "elementType", "baseAbi", "stability", "modifiers", "colorA", "colorB", "colorC", "itemId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."name", NEW."type", NEW."elementType", NEW."baseAbi", NEW."stability", NEW."modifiers", NEW."colorA", NEW."colorB", NEW."colorC", NEW."itemId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "weapon_local"
    SET
        
    "name" = NEW."name",
    "type" = NEW."type",
    "elementType" = NEW."elementType",
    "baseAbi" = NEW."baseAbi",
    "stability" = NEW."stability",
    "modifiers" = NEW."modifiers",
    "colorA" = NEW."colorA",
    "colorB" = NEW."colorB",
    "colorC" = NEW."colorC",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "itemId" = NEW."itemId";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'weapon',
    'update',
    jsonb_build_object(
        'name', NEW."name",
      'type', NEW."type",
      'elementType', NEW."elementType",
      'baseAbi', NEW."baseAbi",
      'stability', NEW."stability",
      'modifiers', NEW."modifiers",
      'colorA', NEW."colorA",
      'colorB', NEW."colorB",
      'colorC', NEW."colorC",
      'itemId', NEW."itemId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION weapon_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "weapon_local" WHERE "itemId" = OLD."itemId") THEN
    UPDATE "weapon_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "itemId" = OLD."itemId";
    ELSE
    INSERT INTO "weapon_local" (
        "itemId",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."itemId",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'weapon',
    'delete',
    jsonb_build_object('itemId', OLD."itemId"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER weapon_insert
INSTEAD OF INSERT ON "weapon"
FOR EACH ROW EXECUTE FUNCTION weapon_insert_trigger();

CREATE OR REPLACE TRIGGER weapon_update
INSTEAD OF UPDATE ON "weapon"
FOR EACH ROW EXECUTE FUNCTION weapon_update_trigger();

CREATE OR REPLACE TRIGGER weapon_delete
INSTEAD OF DELETE ON "weapon"
FOR EACH ROW EXECUTE FUNCTION weapon_delete_trigger();


CREATE OR REPLACE FUNCTION weapon_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "weapon_local"
  WHERE "itemId" = NEW."itemId"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION weapon_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "weapon_local"
  WHERE "itemId" = OLD."itemId";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "weapon_synced"
FOR EACH ROW EXECUTE FUNCTION weapon_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "weapon_synced"
FOR EACH ROW EXECUTE FUNCTION weapon_delete_local_on_synced_delete_trigger();

-- CreateTable
-- armor
CREATE TABLE IF NOT EXISTS "armor_synced" (
  "name" TEXT NOT NULL,
  "baseAbi" INTEGER NOT NULL,
  "modifiers" TEXT[],
  "colorA" INTEGER,
  "colorB" INTEGER,
  "colorC" INTEGER,
  "itemId" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "armor_synced_pkey" PRIMARY KEY ("itemId")
);
CREATE TABLE IF NOT EXISTS "armor_local" (
  "name" TEXT,
  "baseAbi" INTEGER,
  "modifiers" TEXT[],
  "colorA" INTEGER,
  "colorB" INTEGER,
  "colorC" INTEGER,
  "itemId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "armor_local_pkey" PRIMARY KEY ("itemId")
);

CREATE OR REPLACE VIEW "armor" AS
  SELECT
     CASE
    WHEN 'name' = ANY(local.changed_columns)
      THEN local."name"
      ELSE synced."name"
    END AS "name",
   CASE
    WHEN 'baseAbi' = ANY(local.changed_columns)
      THEN local."baseAbi"
      ELSE synced."baseAbi"
    END AS "baseAbi",
   CASE
    WHEN 'modifiers' = ANY(local.changed_columns)
      THEN local."modifiers"
      ELSE synced."modifiers"
    END AS "modifiers",
   CASE
    WHEN 'colorA' = ANY(local.changed_columns)
      THEN local."colorA"
      ELSE synced."colorA"
    END AS "colorA",
   CASE
    WHEN 'colorB' = ANY(local.changed_columns)
      THEN local."colorB"
      ELSE synced."colorB"
    END AS "colorB",
   CASE
    WHEN 'colorC' = ANY(local.changed_columns)
      THEN local."colorC"
      ELSE synced."colorC"
    END AS "colorC",
   COALESCE(local."itemId", synced."itemId") AS "itemId"
  FROM "armor_synced" AS synced
  FULL OUTER JOIN "armor_local" AS local
  ON synced."itemId" = local."itemId"
  WHERE (local."itemId" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION armor_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "armor_synced" WHERE "itemId" = NEW."itemId") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "armor_local" WHERE "itemId" = NEW."itemId") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'name');
    changed_cols := array_append(changed_cols, 'baseAbi');
    changed_cols := array_append(changed_cols, 'modifiers');
    changed_cols := array_append(changed_cols, 'colorA');
    changed_cols := array_append(changed_cols, 'colorB');
    changed_cols := array_append(changed_cols, 'colorC');

    INSERT INTO "armor_local" (
    "name", "baseAbi", "modifiers", "colorA", "colorB", "colorC", "itemId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."name", NEW."baseAbi", NEW."modifiers", NEW."colorA", NEW."colorB", NEW."colorC", NEW."itemId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'armor',
    'insert',
    jsonb_build_object(
        'name', NEW."name",
      'baseAbi', NEW."baseAbi",
      'modifiers', NEW."modifiers",
      'colorA', NEW."colorA",
      'colorB', NEW."colorB",
      'colorC', NEW."colorC",
      'itemId', NEW."itemId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION armor_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "armor_synced"%ROWTYPE;
    local "armor_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "armor_synced" WHERE "itemId" = NEW."itemId";
    SELECT * INTO local FROM "armor_local" WHERE "itemId" = NEW."itemId";
    
    IF NEW."name" IS DISTINCT FROM synced."name" THEN
      changed_cols := array_append(changed_cols, 'name');
    END IF;
    IF NEW."baseAbi" IS DISTINCT FROM synced."baseAbi" THEN
      changed_cols := array_append(changed_cols, 'baseAbi');
    END IF;
    IF NEW."modifiers" IS DISTINCT FROM synced."modifiers" THEN
      changed_cols := array_append(changed_cols, 'modifiers');
    END IF;
    IF NEW."colorA" IS DISTINCT FROM synced."colorA" THEN
      changed_cols := array_append(changed_cols, 'colorA');
    END IF;
    IF NEW."colorB" IS DISTINCT FROM synced."colorB" THEN
      changed_cols := array_append(changed_cols, 'colorB');
    END IF;
    IF NEW."colorC" IS DISTINCT FROM synced."colorC" THEN
      changed_cols := array_append(changed_cols, 'colorC');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "armor_local" (
        "name", "baseAbi", "modifiers", "colorA", "colorB", "colorC", "itemId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."name", NEW."baseAbi", NEW."modifiers", NEW."colorA", NEW."colorB", NEW."colorC", NEW."itemId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "armor_local"
    SET
        
    "name" = NEW."name",
    "baseAbi" = NEW."baseAbi",
    "modifiers" = NEW."modifiers",
    "colorA" = NEW."colorA",
    "colorB" = NEW."colorB",
    "colorC" = NEW."colorC",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "itemId" = NEW."itemId";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'armor',
    'update',
    jsonb_build_object(
        'name', NEW."name",
      'baseAbi', NEW."baseAbi",
      'modifiers', NEW."modifiers",
      'colorA', NEW."colorA",
      'colorB', NEW."colorB",
      'colorC', NEW."colorC",
      'itemId', NEW."itemId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION armor_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "armor_local" WHERE "itemId" = OLD."itemId") THEN
    UPDATE "armor_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "itemId" = OLD."itemId";
    ELSE
    INSERT INTO "armor_local" (
        "itemId",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."itemId",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'armor',
    'delete',
    jsonb_build_object('itemId', OLD."itemId"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER armor_insert
INSTEAD OF INSERT ON "armor"
FOR EACH ROW EXECUTE FUNCTION armor_insert_trigger();

CREATE OR REPLACE TRIGGER armor_update
INSTEAD OF UPDATE ON "armor"
FOR EACH ROW EXECUTE FUNCTION armor_update_trigger();

CREATE OR REPLACE TRIGGER armor_delete
INSTEAD OF DELETE ON "armor"
FOR EACH ROW EXECUTE FUNCTION armor_delete_trigger();


CREATE OR REPLACE FUNCTION armor_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "armor_local"
  WHERE "itemId" = NEW."itemId"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION armor_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "armor_local"
  WHERE "itemId" = OLD."itemId";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "armor_synced"
FOR EACH ROW EXECUTE FUNCTION armor_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "armor_synced"
FOR EACH ROW EXECUTE FUNCTION armor_delete_local_on_synced_delete_trigger();

-- CreateTable
-- option
CREATE TABLE IF NOT EXISTS "option_synced" (
  "name" TEXT NOT NULL,
  "baseAbi" INTEGER NOT NULL,
  "modifiers" TEXT[],
  "colorA" INTEGER,
  "colorB" INTEGER,
  "colorC" INTEGER,
  "itemId" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "option_synced_pkey" PRIMARY KEY ("itemId")
);
CREATE TABLE IF NOT EXISTS "option_local" (
  "name" TEXT,
  "baseAbi" INTEGER,
  "modifiers" TEXT[],
  "colorA" INTEGER,
  "colorB" INTEGER,
  "colorC" INTEGER,
  "itemId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "option_local_pkey" PRIMARY KEY ("itemId")
);

CREATE OR REPLACE VIEW "option" AS
  SELECT
     CASE
    WHEN 'name' = ANY(local.changed_columns)
      THEN local."name"
      ELSE synced."name"
    END AS "name",
   CASE
    WHEN 'baseAbi' = ANY(local.changed_columns)
      THEN local."baseAbi"
      ELSE synced."baseAbi"
    END AS "baseAbi",
   CASE
    WHEN 'modifiers' = ANY(local.changed_columns)
      THEN local."modifiers"
      ELSE synced."modifiers"
    END AS "modifiers",
   CASE
    WHEN 'colorA' = ANY(local.changed_columns)
      THEN local."colorA"
      ELSE synced."colorA"
    END AS "colorA",
   CASE
    WHEN 'colorB' = ANY(local.changed_columns)
      THEN local."colorB"
      ELSE synced."colorB"
    END AS "colorB",
   CASE
    WHEN 'colorC' = ANY(local.changed_columns)
      THEN local."colorC"
      ELSE synced."colorC"
    END AS "colorC",
   COALESCE(local."itemId", synced."itemId") AS "itemId"
  FROM "option_synced" AS synced
  FULL OUTER JOIN "option_local" AS local
  ON synced."itemId" = local."itemId"
  WHERE (local."itemId" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION option_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "option_synced" WHERE "itemId" = NEW."itemId") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "option_local" WHERE "itemId" = NEW."itemId") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'name');
    changed_cols := array_append(changed_cols, 'baseAbi');
    changed_cols := array_append(changed_cols, 'modifiers');
    changed_cols := array_append(changed_cols, 'colorA');
    changed_cols := array_append(changed_cols, 'colorB');
    changed_cols := array_append(changed_cols, 'colorC');

    INSERT INTO "option_local" (
    "name", "baseAbi", "modifiers", "colorA", "colorB", "colorC", "itemId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."name", NEW."baseAbi", NEW."modifiers", NEW."colorA", NEW."colorB", NEW."colorC", NEW."itemId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'option',
    'insert',
    jsonb_build_object(
        'name', NEW."name",
      'baseAbi', NEW."baseAbi",
      'modifiers', NEW."modifiers",
      'colorA', NEW."colorA",
      'colorB', NEW."colorB",
      'colorC', NEW."colorC",
      'itemId', NEW."itemId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION option_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "option_synced"%ROWTYPE;
    local "option_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "option_synced" WHERE "itemId" = NEW."itemId";
    SELECT * INTO local FROM "option_local" WHERE "itemId" = NEW."itemId";
    
    IF NEW."name" IS DISTINCT FROM synced."name" THEN
      changed_cols := array_append(changed_cols, 'name');
    END IF;
    IF NEW."baseAbi" IS DISTINCT FROM synced."baseAbi" THEN
      changed_cols := array_append(changed_cols, 'baseAbi');
    END IF;
    IF NEW."modifiers" IS DISTINCT FROM synced."modifiers" THEN
      changed_cols := array_append(changed_cols, 'modifiers');
    END IF;
    IF NEW."colorA" IS DISTINCT FROM synced."colorA" THEN
      changed_cols := array_append(changed_cols, 'colorA');
    END IF;
    IF NEW."colorB" IS DISTINCT FROM synced."colorB" THEN
      changed_cols := array_append(changed_cols, 'colorB');
    END IF;
    IF NEW."colorC" IS DISTINCT FROM synced."colorC" THEN
      changed_cols := array_append(changed_cols, 'colorC');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "option_local" (
        "name", "baseAbi", "modifiers", "colorA", "colorB", "colorC", "itemId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."name", NEW."baseAbi", NEW."modifiers", NEW."colorA", NEW."colorB", NEW."colorC", NEW."itemId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "option_local"
    SET
        
    "name" = NEW."name",
    "baseAbi" = NEW."baseAbi",
    "modifiers" = NEW."modifiers",
    "colorA" = NEW."colorA",
    "colorB" = NEW."colorB",
    "colorC" = NEW."colorC",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "itemId" = NEW."itemId";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'option',
    'update',
    jsonb_build_object(
        'name', NEW."name",
      'baseAbi', NEW."baseAbi",
      'modifiers', NEW."modifiers",
      'colorA', NEW."colorA",
      'colorB', NEW."colorB",
      'colorC', NEW."colorC",
      'itemId', NEW."itemId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION option_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "option_local" WHERE "itemId" = OLD."itemId") THEN
    UPDATE "option_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "itemId" = OLD."itemId";
    ELSE
    INSERT INTO "option_local" (
        "itemId",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."itemId",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'option',
    'delete',
    jsonb_build_object('itemId', OLD."itemId"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER option_insert
INSTEAD OF INSERT ON "option"
FOR EACH ROW EXECUTE FUNCTION option_insert_trigger();

CREATE OR REPLACE TRIGGER option_update
INSTEAD OF UPDATE ON "option"
FOR EACH ROW EXECUTE FUNCTION option_update_trigger();

CREATE OR REPLACE TRIGGER option_delete
INSTEAD OF DELETE ON "option"
FOR EACH ROW EXECUTE FUNCTION option_delete_trigger();


CREATE OR REPLACE FUNCTION option_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "option_local"
  WHERE "itemId" = NEW."itemId"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION option_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "option_local"
  WHERE "itemId" = OLD."itemId";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "option_synced"
FOR EACH ROW EXECUTE FUNCTION option_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "option_synced"
FOR EACH ROW EXECUTE FUNCTION option_delete_local_on_synced_delete_trigger();

-- CreateTable
-- special
CREATE TABLE IF NOT EXISTS "special_synced" (
  "name" TEXT NOT NULL,
  "baseAbi" INTEGER NOT NULL,
  "modifiers" TEXT[],
  "itemId" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "special_synced_pkey" PRIMARY KEY ("itemId")
);
CREATE TABLE IF NOT EXISTS "special_local" (
  "name" TEXT,
  "baseAbi" INTEGER,
  "modifiers" TEXT[],
  "itemId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "special_local_pkey" PRIMARY KEY ("itemId")
);

CREATE OR REPLACE VIEW "special" AS
  SELECT
     CASE
    WHEN 'name' = ANY(local.changed_columns)
      THEN local."name"
      ELSE synced."name"
    END AS "name",
   CASE
    WHEN 'baseAbi' = ANY(local.changed_columns)
      THEN local."baseAbi"
      ELSE synced."baseAbi"
    END AS "baseAbi",
   CASE
    WHEN 'modifiers' = ANY(local.changed_columns)
      THEN local."modifiers"
      ELSE synced."modifiers"
    END AS "modifiers",
   COALESCE(local."itemId", synced."itemId") AS "itemId"
  FROM "special_synced" AS synced
  FULL OUTER JOIN "special_local" AS local
  ON synced."itemId" = local."itemId"
  WHERE (local."itemId" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION special_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "special_synced" WHERE "itemId" = NEW."itemId") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "special_local" WHERE "itemId" = NEW."itemId") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'name');
    changed_cols := array_append(changed_cols, 'baseAbi');
    changed_cols := array_append(changed_cols, 'modifiers');

    INSERT INTO "special_local" (
    "name", "baseAbi", "modifiers", "itemId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."name", NEW."baseAbi", NEW."modifiers", NEW."itemId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'special',
    'insert',
    jsonb_build_object(
        'name', NEW."name",
      'baseAbi', NEW."baseAbi",
      'modifiers', NEW."modifiers",
      'itemId', NEW."itemId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION special_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "special_synced"%ROWTYPE;
    local "special_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "special_synced" WHERE "itemId" = NEW."itemId";
    SELECT * INTO local FROM "special_local" WHERE "itemId" = NEW."itemId";
    
    IF NEW."name" IS DISTINCT FROM synced."name" THEN
      changed_cols := array_append(changed_cols, 'name');
    END IF;
    IF NEW."baseAbi" IS DISTINCT FROM synced."baseAbi" THEN
      changed_cols := array_append(changed_cols, 'baseAbi');
    END IF;
    IF NEW."modifiers" IS DISTINCT FROM synced."modifiers" THEN
      changed_cols := array_append(changed_cols, 'modifiers');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "special_local" (
        "name", "baseAbi", "modifiers", "itemId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."name", NEW."baseAbi", NEW."modifiers", NEW."itemId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "special_local"
    SET
        
    "name" = NEW."name",
    "baseAbi" = NEW."baseAbi",
    "modifiers" = NEW."modifiers",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "itemId" = NEW."itemId";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'special',
    'update',
    jsonb_build_object(
        'name', NEW."name",
      'baseAbi', NEW."baseAbi",
      'modifiers', NEW."modifiers",
      'itemId', NEW."itemId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION special_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "special_local" WHERE "itemId" = OLD."itemId") THEN
    UPDATE "special_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "itemId" = OLD."itemId";
    ELSE
    INSERT INTO "special_local" (
        "itemId",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."itemId",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'special',
    'delete',
    jsonb_build_object('itemId', OLD."itemId"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER special_insert
INSTEAD OF INSERT ON "special"
FOR EACH ROW EXECUTE FUNCTION special_insert_trigger();

CREATE OR REPLACE TRIGGER special_update
INSTEAD OF UPDATE ON "special"
FOR EACH ROW EXECUTE FUNCTION special_update_trigger();

CREATE OR REPLACE TRIGGER special_delete
INSTEAD OF DELETE ON "special"
FOR EACH ROW EXECUTE FUNCTION special_delete_trigger();


CREATE OR REPLACE FUNCTION special_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "special_local"
  WHERE "itemId" = NEW."itemId"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION special_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "special_local"
  WHERE "itemId" = OLD."itemId";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "special_synced"
FOR EACH ROW EXECUTE FUNCTION special_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "special_synced"
FOR EACH ROW EXECUTE FUNCTION special_delete_local_on_synced_delete_trigger();

-- CreateTable
-- recipe
CREATE TABLE IF NOT EXISTS "recipe_synced" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "activityId" TEXT,
  "statisticId" TEXT NOT NULL,
  "updatedByAccountId" TEXT,
  "createdByAccountId" TEXT,
  "write_id" UUID,
  CONSTRAINT "recipe_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "recipe_local" (
  "id" TEXT,
  "itemId" TEXT,
  "activityId" TEXT,
  "statisticId" TEXT,
  "updatedByAccountId" TEXT,
  "createdByAccountId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "recipe_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "recipe" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'itemId' = ANY(local.changed_columns)
      THEN local."itemId"
      ELSE synced."itemId"
    END AS "itemId",
   CASE
    WHEN 'activityId' = ANY(local.changed_columns)
      THEN local."activityId"
      ELSE synced."activityId"
    END AS "activityId",
   CASE
    WHEN 'statisticId' = ANY(local.changed_columns)
      THEN local."statisticId"
      ELSE synced."statisticId"
    END AS "statisticId",
   CASE
    WHEN 'updatedByAccountId' = ANY(local.changed_columns)
      THEN local."updatedByAccountId"
      ELSE synced."updatedByAccountId"
    END AS "updatedByAccountId",
   CASE
    WHEN 'createdByAccountId' = ANY(local.changed_columns)
      THEN local."createdByAccountId"
      ELSE synced."createdByAccountId"
    END AS "createdByAccountId"
  FROM "recipe_synced" AS synced
  FULL OUTER JOIN "recipe_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION recipe_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "recipe_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "recipe_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'itemId');
    changed_cols := array_append(changed_cols, 'activityId');
    changed_cols := array_append(changed_cols, 'statisticId');
    changed_cols := array_append(changed_cols, 'updatedByAccountId');
    changed_cols := array_append(changed_cols, 'createdByAccountId');

    INSERT INTO "recipe_local" (
    "id", "itemId", "activityId", "statisticId", "updatedByAccountId", "createdByAccountId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."itemId", NEW."activityId", NEW."statisticId", NEW."updatedByAccountId", NEW."createdByAccountId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'recipe',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'itemId', NEW."itemId",
      'activityId', NEW."activityId",
      'statisticId', NEW."statisticId",
      'updatedByAccountId', NEW."updatedByAccountId",
      'createdByAccountId', NEW."createdByAccountId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION recipe_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "recipe_synced"%ROWTYPE;
    local "recipe_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "recipe_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "recipe_local" WHERE "id" = NEW."id";
    
    IF NEW."itemId" IS DISTINCT FROM synced."itemId" THEN
      changed_cols := array_append(changed_cols, 'itemId');
    END IF;
    IF NEW."activityId" IS DISTINCT FROM synced."activityId" THEN
      changed_cols := array_append(changed_cols, 'activityId');
    END IF;
    IF NEW."statisticId" IS DISTINCT FROM synced."statisticId" THEN
      changed_cols := array_append(changed_cols, 'statisticId');
    END IF;
    IF NEW."updatedByAccountId" IS DISTINCT FROM synced."updatedByAccountId" THEN
      changed_cols := array_append(changed_cols, 'updatedByAccountId');
    END IF;
    IF NEW."createdByAccountId" IS DISTINCT FROM synced."createdByAccountId" THEN
      changed_cols := array_append(changed_cols, 'createdByAccountId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "recipe_local" (
        "id", "itemId", "activityId", "statisticId", "updatedByAccountId", "createdByAccountId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."itemId", NEW."activityId", NEW."statisticId", NEW."updatedByAccountId", NEW."createdByAccountId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "recipe_local"
    SET
        
    "itemId" = NEW."itemId",
    "activityId" = NEW."activityId",
    "statisticId" = NEW."statisticId",
    "updatedByAccountId" = NEW."updatedByAccountId",
    "createdByAccountId" = NEW."createdByAccountId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'recipe',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'itemId', NEW."itemId",
      'activityId', NEW."activityId",
      'statisticId', NEW."statisticId",
      'updatedByAccountId', NEW."updatedByAccountId",
      'createdByAccountId', NEW."createdByAccountId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION recipe_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "recipe_local" WHERE "id" = OLD."id") THEN
    UPDATE "recipe_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "recipe_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'recipe',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER recipe_insert
INSTEAD OF INSERT ON "recipe"
FOR EACH ROW EXECUTE FUNCTION recipe_insert_trigger();

CREATE OR REPLACE TRIGGER recipe_update
INSTEAD OF UPDATE ON "recipe"
FOR EACH ROW EXECUTE FUNCTION recipe_update_trigger();

CREATE OR REPLACE TRIGGER recipe_delete
INSTEAD OF DELETE ON "recipe"
FOR EACH ROW EXECUTE FUNCTION recipe_delete_trigger();


CREATE OR REPLACE FUNCTION recipe_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "recipe_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION recipe_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "recipe_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "recipe_synced"
FOR EACH ROW EXECUTE FUNCTION recipe_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "recipe_synced"
FOR EACH ROW EXECUTE FUNCTION recipe_delete_local_on_synced_delete_trigger();

-- CreateTable
-- recipe_ingredient
CREATE TABLE IF NOT EXISTS "recipe_ingredient_synced" (
  "id" TEXT NOT NULL,
  "count" INTEGER NOT NULL,
  "type" "RecipeIngredientType" NOT NULL,
  "itemId" TEXT,
  "recipeId" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "recipe_ingredient_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "recipe_ingredient_local" (
  "id" TEXT,
  "count" INTEGER,
  "type" "RecipeIngredientType",
  "itemId" TEXT,
  "recipeId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "recipe_ingredient_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "recipe_ingredient" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'count' = ANY(local.changed_columns)
      THEN local."count"
      ELSE synced."count"
    END AS "count",
   CASE
    WHEN 'type' = ANY(local.changed_columns)
      THEN local."type"
      ELSE synced."type"
    END AS "type",
   CASE
    WHEN 'itemId' = ANY(local.changed_columns)
      THEN local."itemId"
      ELSE synced."itemId"
    END AS "itemId",
   CASE
    WHEN 'recipeId' = ANY(local.changed_columns)
      THEN local."recipeId"
      ELSE synced."recipeId"
    END AS "recipeId"
  FROM "recipe_ingredient_synced" AS synced
  FULL OUTER JOIN "recipe_ingredient_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION recipe_ingredient_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "recipe_ingredient_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "recipe_ingredient_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'count');
    changed_cols := array_append(changed_cols, 'type');
    changed_cols := array_append(changed_cols, 'itemId');
    changed_cols := array_append(changed_cols, 'recipeId');

    INSERT INTO "recipe_ingredient_local" (
    "id", "count", "type", "itemId", "recipeId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."count", NEW."type", NEW."itemId", NEW."recipeId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'recipe_ingredient',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'count', NEW."count",
      'type', NEW."type",
      'itemId', NEW."itemId",
      'recipeId', NEW."recipeId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION recipe_ingredient_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "recipe_ingredient_synced"%ROWTYPE;
    local "recipe_ingredient_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "recipe_ingredient_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "recipe_ingredient_local" WHERE "id" = NEW."id";
    
    IF NEW."count" IS DISTINCT FROM synced."count" THEN
      changed_cols := array_append(changed_cols, 'count');
    END IF;
    IF NEW."type" IS DISTINCT FROM synced."type" THEN
      changed_cols := array_append(changed_cols, 'type');
    END IF;
    IF NEW."itemId" IS DISTINCT FROM synced."itemId" THEN
      changed_cols := array_append(changed_cols, 'itemId');
    END IF;
    IF NEW."recipeId" IS DISTINCT FROM synced."recipeId" THEN
      changed_cols := array_append(changed_cols, 'recipeId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "recipe_ingredient_local" (
        "id", "count", "type", "itemId", "recipeId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."count", NEW."type", NEW."itemId", NEW."recipeId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "recipe_ingredient_local"
    SET
        
    "count" = NEW."count",
    "type" = NEW."type",
    "itemId" = NEW."itemId",
    "recipeId" = NEW."recipeId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'recipe_ingredient',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'count', NEW."count",
      'type', NEW."type",
      'itemId', NEW."itemId",
      'recipeId', NEW."recipeId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION recipe_ingredient_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "recipe_ingredient_local" WHERE "id" = OLD."id") THEN
    UPDATE "recipe_ingredient_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "recipe_ingredient_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'recipe_ingredient',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER recipe_ingredient_insert
INSTEAD OF INSERT ON "recipe_ingredient"
FOR EACH ROW EXECUTE FUNCTION recipe_ingredient_insert_trigger();

CREATE OR REPLACE TRIGGER recipe_ingredient_update
INSTEAD OF UPDATE ON "recipe_ingredient"
FOR EACH ROW EXECUTE FUNCTION recipe_ingredient_update_trigger();

CREATE OR REPLACE TRIGGER recipe_ingredient_delete
INSTEAD OF DELETE ON "recipe_ingredient"
FOR EACH ROW EXECUTE FUNCTION recipe_ingredient_delete_trigger();


CREATE OR REPLACE FUNCTION recipe_ingredient_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "recipe_ingredient_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION recipe_ingredient_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "recipe_ingredient_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "recipe_ingredient_synced"
FOR EACH ROW EXECUTE FUNCTION recipe_ingredient_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "recipe_ingredient_synced"
FOR EACH ROW EXECUTE FUNCTION recipe_ingredient_delete_local_on_synced_delete_trigger();

-- CreateTable
-- drop_item
CREATE TABLE IF NOT EXISTS "drop_item_synced" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "probability" INTEGER NOT NULL,
  "relatedPartType" "BossPartType" NOT NULL,
  "relatedPartInfo" TEXT NOT NULL,
  "breakRewardType" "BossPartBreakRewardType" NOT NULL,
  "belongToMobId" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "drop_item_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "drop_item_local" (
  "id" TEXT,
  "itemId" TEXT,
  "probability" INTEGER,
  "relatedPartType" "BossPartType",
  "relatedPartInfo" TEXT,
  "breakRewardType" "BossPartBreakRewardType",
  "belongToMobId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "drop_item_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "drop_item" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'itemId' = ANY(local.changed_columns)
      THEN local."itemId"
      ELSE synced."itemId"
    END AS "itemId",
   CASE
    WHEN 'probability' = ANY(local.changed_columns)
      THEN local."probability"
      ELSE synced."probability"
    END AS "probability",
   CASE
    WHEN 'relatedPartType' = ANY(local.changed_columns)
      THEN local."relatedPartType"
      ELSE synced."relatedPartType"
    END AS "relatedPartType",
   CASE
    WHEN 'relatedPartInfo' = ANY(local.changed_columns)
      THEN local."relatedPartInfo"
      ELSE synced."relatedPartInfo"
    END AS "relatedPartInfo",
   CASE
    WHEN 'breakRewardType' = ANY(local.changed_columns)
      THEN local."breakRewardType"
      ELSE synced."breakRewardType"
    END AS "breakRewardType",
   CASE
    WHEN 'belongToMobId' = ANY(local.changed_columns)
      THEN local."belongToMobId"
      ELSE synced."belongToMobId"
    END AS "belongToMobId"
  FROM "drop_item_synced" AS synced
  FULL OUTER JOIN "drop_item_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION drop_item_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "drop_item_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "drop_item_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'itemId');
    changed_cols := array_append(changed_cols, 'probability');
    changed_cols := array_append(changed_cols, 'relatedPartType');
    changed_cols := array_append(changed_cols, 'relatedPartInfo');
    changed_cols := array_append(changed_cols, 'breakRewardType');
    changed_cols := array_append(changed_cols, 'belongToMobId');

    INSERT INTO "drop_item_local" (
    "id", "itemId", "probability", "relatedPartType", "relatedPartInfo", "breakRewardType", "belongToMobId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."itemId", NEW."probability", NEW."relatedPartType", NEW."relatedPartInfo", NEW."breakRewardType", NEW."belongToMobId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'drop_item',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'itemId', NEW."itemId",
      'probability', NEW."probability",
      'relatedPartType', NEW."relatedPartType",
      'relatedPartInfo', NEW."relatedPartInfo",
      'breakRewardType', NEW."breakRewardType",
      'belongToMobId', NEW."belongToMobId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION drop_item_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "drop_item_synced"%ROWTYPE;
    local "drop_item_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "drop_item_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "drop_item_local" WHERE "id" = NEW."id";
    
    IF NEW."itemId" IS DISTINCT FROM synced."itemId" THEN
      changed_cols := array_append(changed_cols, 'itemId');
    END IF;
    IF NEW."probability" IS DISTINCT FROM synced."probability" THEN
      changed_cols := array_append(changed_cols, 'probability');
    END IF;
    IF NEW."relatedPartType" IS DISTINCT FROM synced."relatedPartType" THEN
      changed_cols := array_append(changed_cols, 'relatedPartType');
    END IF;
    IF NEW."relatedPartInfo" IS DISTINCT FROM synced."relatedPartInfo" THEN
      changed_cols := array_append(changed_cols, 'relatedPartInfo');
    END IF;
    IF NEW."breakRewardType" IS DISTINCT FROM synced."breakRewardType" THEN
      changed_cols := array_append(changed_cols, 'breakRewardType');
    END IF;
    IF NEW."belongToMobId" IS DISTINCT FROM synced."belongToMobId" THEN
      changed_cols := array_append(changed_cols, 'belongToMobId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "drop_item_local" (
        "id", "itemId", "probability", "relatedPartType", "relatedPartInfo", "breakRewardType", "belongToMobId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."itemId", NEW."probability", NEW."relatedPartType", NEW."relatedPartInfo", NEW."breakRewardType", NEW."belongToMobId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "drop_item_local"
    SET
        
    "itemId" = NEW."itemId",
    "probability" = NEW."probability",
    "relatedPartType" = NEW."relatedPartType",
    "relatedPartInfo" = NEW."relatedPartInfo",
    "breakRewardType" = NEW."breakRewardType",
    "belongToMobId" = NEW."belongToMobId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'drop_item',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'itemId', NEW."itemId",
      'probability', NEW."probability",
      'relatedPartType', NEW."relatedPartType",
      'relatedPartInfo', NEW."relatedPartInfo",
      'breakRewardType', NEW."breakRewardType",
      'belongToMobId', NEW."belongToMobId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION drop_item_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "drop_item_local" WHERE "id" = OLD."id") THEN
    UPDATE "drop_item_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "drop_item_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'drop_item',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER drop_item_insert
INSTEAD OF INSERT ON "drop_item"
FOR EACH ROW EXECUTE FUNCTION drop_item_insert_trigger();

CREATE OR REPLACE TRIGGER drop_item_update
INSTEAD OF UPDATE ON "drop_item"
FOR EACH ROW EXECUTE FUNCTION drop_item_update_trigger();

CREATE OR REPLACE TRIGGER drop_item_delete
INSTEAD OF DELETE ON "drop_item"
FOR EACH ROW EXECUTE FUNCTION drop_item_delete_trigger();


CREATE OR REPLACE FUNCTION drop_item_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "drop_item_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION drop_item_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "drop_item_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "drop_item_synced"
FOR EACH ROW EXECUTE FUNCTION drop_item_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "drop_item_synced"
FOR EACH ROW EXECUTE FUNCTION drop_item_delete_local_on_synced_delete_trigger();

-- CreateTable
-- npc
CREATE TABLE IF NOT EXISTS "npc_synced" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "zoneId" TEXT NOT NULL,
  "statisticId" TEXT NOT NULL,
  "updatedByAccountId" TEXT,
  "createdByAccountId" TEXT,
  "write_id" UUID,
  CONSTRAINT "npc_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "npc_local" (
  "id" TEXT,
  "name" TEXT,
  "zoneId" TEXT,
  "statisticId" TEXT,
  "updatedByAccountId" TEXT,
  "createdByAccountId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "npc_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "npc" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'name' = ANY(local.changed_columns)
      THEN local."name"
      ELSE synced."name"
    END AS "name",
   CASE
    WHEN 'zoneId' = ANY(local.changed_columns)
      THEN local."zoneId"
      ELSE synced."zoneId"
    END AS "zoneId",
   CASE
    WHEN 'statisticId' = ANY(local.changed_columns)
      THEN local."statisticId"
      ELSE synced."statisticId"
    END AS "statisticId",
   CASE
    WHEN 'updatedByAccountId' = ANY(local.changed_columns)
      THEN local."updatedByAccountId"
      ELSE synced."updatedByAccountId"
    END AS "updatedByAccountId",
   CASE
    WHEN 'createdByAccountId' = ANY(local.changed_columns)
      THEN local."createdByAccountId"
      ELSE synced."createdByAccountId"
    END AS "createdByAccountId"
  FROM "npc_synced" AS synced
  FULL OUTER JOIN "npc_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION npc_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "npc_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "npc_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'name');
    changed_cols := array_append(changed_cols, 'zoneId');
    changed_cols := array_append(changed_cols, 'statisticId');
    changed_cols := array_append(changed_cols, 'updatedByAccountId');
    changed_cols := array_append(changed_cols, 'createdByAccountId');

    INSERT INTO "npc_local" (
    "id", "name", "zoneId", "statisticId", "updatedByAccountId", "createdByAccountId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."name", NEW."zoneId", NEW."statisticId", NEW."updatedByAccountId", NEW."createdByAccountId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'npc',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'zoneId', NEW."zoneId",
      'statisticId', NEW."statisticId",
      'updatedByAccountId', NEW."updatedByAccountId",
      'createdByAccountId', NEW."createdByAccountId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION npc_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "npc_synced"%ROWTYPE;
    local "npc_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "npc_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "npc_local" WHERE "id" = NEW."id";
    
    IF NEW."name" IS DISTINCT FROM synced."name" THEN
      changed_cols := array_append(changed_cols, 'name');
    END IF;
    IF NEW."zoneId" IS DISTINCT FROM synced."zoneId" THEN
      changed_cols := array_append(changed_cols, 'zoneId');
    END IF;
    IF NEW."statisticId" IS DISTINCT FROM synced."statisticId" THEN
      changed_cols := array_append(changed_cols, 'statisticId');
    END IF;
    IF NEW."updatedByAccountId" IS DISTINCT FROM synced."updatedByAccountId" THEN
      changed_cols := array_append(changed_cols, 'updatedByAccountId');
    END IF;
    IF NEW."createdByAccountId" IS DISTINCT FROM synced."createdByAccountId" THEN
      changed_cols := array_append(changed_cols, 'createdByAccountId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "npc_local" (
        "id", "name", "zoneId", "statisticId", "updatedByAccountId", "createdByAccountId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."name", NEW."zoneId", NEW."statisticId", NEW."updatedByAccountId", NEW."createdByAccountId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "npc_local"
    SET
        
    "name" = NEW."name",
    "zoneId" = NEW."zoneId",
    "statisticId" = NEW."statisticId",
    "updatedByAccountId" = NEW."updatedByAccountId",
    "createdByAccountId" = NEW."createdByAccountId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'npc',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'zoneId', NEW."zoneId",
      'statisticId', NEW."statisticId",
      'updatedByAccountId', NEW."updatedByAccountId",
      'createdByAccountId', NEW."createdByAccountId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION npc_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "npc_local" WHERE "id" = OLD."id") THEN
    UPDATE "npc_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "npc_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'npc',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER npc_insert
INSTEAD OF INSERT ON "npc"
FOR EACH ROW EXECUTE FUNCTION npc_insert_trigger();

CREATE OR REPLACE TRIGGER npc_update
INSTEAD OF UPDATE ON "npc"
FOR EACH ROW EXECUTE FUNCTION npc_update_trigger();

CREATE OR REPLACE TRIGGER npc_delete
INSTEAD OF DELETE ON "npc"
FOR EACH ROW EXECUTE FUNCTION npc_delete_trigger();


CREATE OR REPLACE FUNCTION npc_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "npc_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION npc_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "npc_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "npc_synced"
FOR EACH ROW EXECUTE FUNCTION npc_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "npc_synced"
FOR EACH ROW EXECUTE FUNCTION npc_delete_local_on_synced_delete_trigger();

-- CreateTable
-- task
CREATE TABLE IF NOT EXISTS "task_synced" (
  "id" TEXT NOT NULL,
  "lv" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "type" "TaskType" NOT NULL,
  "description" TEXT NOT NULL,
  "belongToNpcId" TEXT NOT NULL,
  "statisticId" TEXT NOT NULL,
  "updatedByAccountId" TEXT,
  "createdByAccountId" TEXT,
  "write_id" UUID,
  CONSTRAINT "task_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "task_local" (
  "id" TEXT,
  "lv" INTEGER,
  "name" TEXT,
  "type" "TaskType",
  "description" TEXT,
  "belongToNpcId" TEXT,
  "statisticId" TEXT,
  "updatedByAccountId" TEXT,
  "createdByAccountId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "task_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "task" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'lv' = ANY(local.changed_columns)
      THEN local."lv"
      ELSE synced."lv"
    END AS "lv",
   CASE
    WHEN 'name' = ANY(local.changed_columns)
      THEN local."name"
      ELSE synced."name"
    END AS "name",
   CASE
    WHEN 'type' = ANY(local.changed_columns)
      THEN local."type"
      ELSE synced."type"
    END AS "type",
   CASE
    WHEN 'description' = ANY(local.changed_columns)
      THEN local."description"
      ELSE synced."description"
    END AS "description",
   CASE
    WHEN 'belongToNpcId' = ANY(local.changed_columns)
      THEN local."belongToNpcId"
      ELSE synced."belongToNpcId"
    END AS "belongToNpcId",
   CASE
    WHEN 'statisticId' = ANY(local.changed_columns)
      THEN local."statisticId"
      ELSE synced."statisticId"
    END AS "statisticId",
   CASE
    WHEN 'updatedByAccountId' = ANY(local.changed_columns)
      THEN local."updatedByAccountId"
      ELSE synced."updatedByAccountId"
    END AS "updatedByAccountId",
   CASE
    WHEN 'createdByAccountId' = ANY(local.changed_columns)
      THEN local."createdByAccountId"
      ELSE synced."createdByAccountId"
    END AS "createdByAccountId"
  FROM "task_synced" AS synced
  FULL OUTER JOIN "task_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION task_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "task_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "task_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'lv');
    changed_cols := array_append(changed_cols, 'name');
    changed_cols := array_append(changed_cols, 'type');
    changed_cols := array_append(changed_cols, 'description');
    changed_cols := array_append(changed_cols, 'belongToNpcId');
    changed_cols := array_append(changed_cols, 'statisticId');
    changed_cols := array_append(changed_cols, 'updatedByAccountId');
    changed_cols := array_append(changed_cols, 'createdByAccountId');

    INSERT INTO "task_local" (
    "id", "lv", "name", "type", "description", "belongToNpcId", "statisticId", "updatedByAccountId", "createdByAccountId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."lv", NEW."name", NEW."type", NEW."description", NEW."belongToNpcId", NEW."statisticId", NEW."updatedByAccountId", NEW."createdByAccountId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'task',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'lv', NEW."lv",
      'name', NEW."name",
      'type', NEW."type",
      'description', NEW."description",
      'belongToNpcId', NEW."belongToNpcId",
      'statisticId', NEW."statisticId",
      'updatedByAccountId', NEW."updatedByAccountId",
      'createdByAccountId', NEW."createdByAccountId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION task_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "task_synced"%ROWTYPE;
    local "task_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "task_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "task_local" WHERE "id" = NEW."id";
    
    IF NEW."lv" IS DISTINCT FROM synced."lv" THEN
      changed_cols := array_append(changed_cols, 'lv');
    END IF;
    IF NEW."name" IS DISTINCT FROM synced."name" THEN
      changed_cols := array_append(changed_cols, 'name');
    END IF;
    IF NEW."type" IS DISTINCT FROM synced."type" THEN
      changed_cols := array_append(changed_cols, 'type');
    END IF;
    IF NEW."description" IS DISTINCT FROM synced."description" THEN
      changed_cols := array_append(changed_cols, 'description');
    END IF;
    IF NEW."belongToNpcId" IS DISTINCT FROM synced."belongToNpcId" THEN
      changed_cols := array_append(changed_cols, 'belongToNpcId');
    END IF;
    IF NEW."statisticId" IS DISTINCT FROM synced."statisticId" THEN
      changed_cols := array_append(changed_cols, 'statisticId');
    END IF;
    IF NEW."updatedByAccountId" IS DISTINCT FROM synced."updatedByAccountId" THEN
      changed_cols := array_append(changed_cols, 'updatedByAccountId');
    END IF;
    IF NEW."createdByAccountId" IS DISTINCT FROM synced."createdByAccountId" THEN
      changed_cols := array_append(changed_cols, 'createdByAccountId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "task_local" (
        "id", "lv", "name", "type", "description", "belongToNpcId", "statisticId", "updatedByAccountId", "createdByAccountId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."lv", NEW."name", NEW."type", NEW."description", NEW."belongToNpcId", NEW."statisticId", NEW."updatedByAccountId", NEW."createdByAccountId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "task_local"
    SET
        
    "lv" = NEW."lv",
    "name" = NEW."name",
    "type" = NEW."type",
    "description" = NEW."description",
    "belongToNpcId" = NEW."belongToNpcId",
    "statisticId" = NEW."statisticId",
    "updatedByAccountId" = NEW."updatedByAccountId",
    "createdByAccountId" = NEW."createdByAccountId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'task',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'lv', NEW."lv",
      'name', NEW."name",
      'type', NEW."type",
      'description', NEW."description",
      'belongToNpcId', NEW."belongToNpcId",
      'statisticId', NEW."statisticId",
      'updatedByAccountId', NEW."updatedByAccountId",
      'createdByAccountId', NEW."createdByAccountId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION task_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "task_local" WHERE "id" = OLD."id") THEN
    UPDATE "task_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "task_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'task',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER task_insert
INSTEAD OF INSERT ON "task"
FOR EACH ROW EXECUTE FUNCTION task_insert_trigger();

CREATE OR REPLACE TRIGGER task_update
INSTEAD OF UPDATE ON "task"
FOR EACH ROW EXECUTE FUNCTION task_update_trigger();

CREATE OR REPLACE TRIGGER task_delete
INSTEAD OF DELETE ON "task"
FOR EACH ROW EXECUTE FUNCTION task_delete_trigger();


CREATE OR REPLACE FUNCTION task_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "task_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION task_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "task_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "task_synced"
FOR EACH ROW EXECUTE FUNCTION task_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "task_synced"
FOR EACH ROW EXECUTE FUNCTION task_delete_local_on_synced_delete_trigger();

-- CreateTable
-- task_kill_requirement
CREATE TABLE IF NOT EXISTS "task_kill_requirement_synced" (
  "id" TEXT NOT NULL,
  "mobId" TEXT NOT NULL,
  "count" INTEGER NOT NULL,
  "belongToTaskId" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "task_kill_requirement_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "task_kill_requirement_local" (
  "id" TEXT,
  "mobId" TEXT,
  "count" INTEGER,
  "belongToTaskId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "task_kill_requirement_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "task_kill_requirement" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'mobId' = ANY(local.changed_columns)
      THEN local."mobId"
      ELSE synced."mobId"
    END AS "mobId",
   CASE
    WHEN 'count' = ANY(local.changed_columns)
      THEN local."count"
      ELSE synced."count"
    END AS "count",
   CASE
    WHEN 'belongToTaskId' = ANY(local.changed_columns)
      THEN local."belongToTaskId"
      ELSE synced."belongToTaskId"
    END AS "belongToTaskId"
  FROM "task_kill_requirement_synced" AS synced
  FULL OUTER JOIN "task_kill_requirement_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION task_kill_requirement_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "task_kill_requirement_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "task_kill_requirement_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'mobId');
    changed_cols := array_append(changed_cols, 'count');
    changed_cols := array_append(changed_cols, 'belongToTaskId');

    INSERT INTO "task_kill_requirement_local" (
    "id", "mobId", "count", "belongToTaskId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."mobId", NEW."count", NEW."belongToTaskId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'task_kill_requirement',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'mobId', NEW."mobId",
      'count', NEW."count",
      'belongToTaskId', NEW."belongToTaskId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION task_kill_requirement_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "task_kill_requirement_synced"%ROWTYPE;
    local "task_kill_requirement_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "task_kill_requirement_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "task_kill_requirement_local" WHERE "id" = NEW."id";
    
    IF NEW."mobId" IS DISTINCT FROM synced."mobId" THEN
      changed_cols := array_append(changed_cols, 'mobId');
    END IF;
    IF NEW."count" IS DISTINCT FROM synced."count" THEN
      changed_cols := array_append(changed_cols, 'count');
    END IF;
    IF NEW."belongToTaskId" IS DISTINCT FROM synced."belongToTaskId" THEN
      changed_cols := array_append(changed_cols, 'belongToTaskId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "task_kill_requirement_local" (
        "id", "mobId", "count", "belongToTaskId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."mobId", NEW."count", NEW."belongToTaskId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "task_kill_requirement_local"
    SET
        
    "mobId" = NEW."mobId",
    "count" = NEW."count",
    "belongToTaskId" = NEW."belongToTaskId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'task_kill_requirement',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'mobId', NEW."mobId",
      'count', NEW."count",
      'belongToTaskId', NEW."belongToTaskId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION task_kill_requirement_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "task_kill_requirement_local" WHERE "id" = OLD."id") THEN
    UPDATE "task_kill_requirement_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "task_kill_requirement_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'task_kill_requirement',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER task_kill_requirement_insert
INSTEAD OF INSERT ON "task_kill_requirement"
FOR EACH ROW EXECUTE FUNCTION task_kill_requirement_insert_trigger();

CREATE OR REPLACE TRIGGER task_kill_requirement_update
INSTEAD OF UPDATE ON "task_kill_requirement"
FOR EACH ROW EXECUTE FUNCTION task_kill_requirement_update_trigger();

CREATE OR REPLACE TRIGGER task_kill_requirement_delete
INSTEAD OF DELETE ON "task_kill_requirement"
FOR EACH ROW EXECUTE FUNCTION task_kill_requirement_delete_trigger();


CREATE OR REPLACE FUNCTION task_kill_requirement_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "task_kill_requirement_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION task_kill_requirement_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "task_kill_requirement_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "task_kill_requirement_synced"
FOR EACH ROW EXECUTE FUNCTION task_kill_requirement_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "task_kill_requirement_synced"
FOR EACH ROW EXECUTE FUNCTION task_kill_requirement_delete_local_on_synced_delete_trigger();

-- CreateTable
-- task_collect_require
CREATE TABLE IF NOT EXISTS "task_collect_require_synced" (
  "id" TEXT NOT NULL,
  "count" INTEGER NOT NULL,
  "itemId" TEXT NOT NULL,
  "belongToTaskId" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "task_collect_require_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "task_collect_require_local" (
  "id" TEXT,
  "count" INTEGER,
  "itemId" TEXT,
  "belongToTaskId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "task_collect_require_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "task_collect_require" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'count' = ANY(local.changed_columns)
      THEN local."count"
      ELSE synced."count"
    END AS "count",
   CASE
    WHEN 'itemId' = ANY(local.changed_columns)
      THEN local."itemId"
      ELSE synced."itemId"
    END AS "itemId",
   CASE
    WHEN 'belongToTaskId' = ANY(local.changed_columns)
      THEN local."belongToTaskId"
      ELSE synced."belongToTaskId"
    END AS "belongToTaskId"
  FROM "task_collect_require_synced" AS synced
  FULL OUTER JOIN "task_collect_require_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION task_collect_require_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "task_collect_require_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "task_collect_require_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'count');
    changed_cols := array_append(changed_cols, 'itemId');
    changed_cols := array_append(changed_cols, 'belongToTaskId');

    INSERT INTO "task_collect_require_local" (
    "id", "count", "itemId", "belongToTaskId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."count", NEW."itemId", NEW."belongToTaskId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'task_collect_require',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'count', NEW."count",
      'itemId', NEW."itemId",
      'belongToTaskId', NEW."belongToTaskId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION task_collect_require_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "task_collect_require_synced"%ROWTYPE;
    local "task_collect_require_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "task_collect_require_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "task_collect_require_local" WHERE "id" = NEW."id";
    
    IF NEW."count" IS DISTINCT FROM synced."count" THEN
      changed_cols := array_append(changed_cols, 'count');
    END IF;
    IF NEW."itemId" IS DISTINCT FROM synced."itemId" THEN
      changed_cols := array_append(changed_cols, 'itemId');
    END IF;
    IF NEW."belongToTaskId" IS DISTINCT FROM synced."belongToTaskId" THEN
      changed_cols := array_append(changed_cols, 'belongToTaskId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "task_collect_require_local" (
        "id", "count", "itemId", "belongToTaskId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."count", NEW."itemId", NEW."belongToTaskId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "task_collect_require_local"
    SET
        
    "count" = NEW."count",
    "itemId" = NEW."itemId",
    "belongToTaskId" = NEW."belongToTaskId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'task_collect_require',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'count', NEW."count",
      'itemId', NEW."itemId",
      'belongToTaskId', NEW."belongToTaskId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION task_collect_require_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "task_collect_require_local" WHERE "id" = OLD."id") THEN
    UPDATE "task_collect_require_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "task_collect_require_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'task_collect_require',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER task_collect_require_insert
INSTEAD OF INSERT ON "task_collect_require"
FOR EACH ROW EXECUTE FUNCTION task_collect_require_insert_trigger();

CREATE OR REPLACE TRIGGER task_collect_require_update
INSTEAD OF UPDATE ON "task_collect_require"
FOR EACH ROW EXECUTE FUNCTION task_collect_require_update_trigger();

CREATE OR REPLACE TRIGGER task_collect_require_delete
INSTEAD OF DELETE ON "task_collect_require"
FOR EACH ROW EXECUTE FUNCTION task_collect_require_delete_trigger();


CREATE OR REPLACE FUNCTION task_collect_require_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "task_collect_require_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION task_collect_require_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "task_collect_require_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "task_collect_require_synced"
FOR EACH ROW EXECUTE FUNCTION task_collect_require_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "task_collect_require_synced"
FOR EACH ROW EXECUTE FUNCTION task_collect_require_delete_local_on_synced_delete_trigger();

-- CreateTable
-- task_reward
CREATE TABLE IF NOT EXISTS "task_reward_synced" (
  "id" TEXT NOT NULL,
  "type" "TaskRewardType" NOT NULL,
  "value" INTEGER NOT NULL,
  "probability" INTEGER NOT NULL,
  "itemId" TEXT,
  "belongToTaskId" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "task_reward_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "task_reward_local" (
  "id" TEXT,
  "type" "TaskRewardType",
  "value" INTEGER,
  "probability" INTEGER,
  "itemId" TEXT,
  "belongToTaskId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "task_reward_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "task_reward" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'type' = ANY(local.changed_columns)
      THEN local."type"
      ELSE synced."type"
    END AS "type",
   CASE
    WHEN 'value' = ANY(local.changed_columns)
      THEN local."value"
      ELSE synced."value"
    END AS "value",
   CASE
    WHEN 'probability' = ANY(local.changed_columns)
      THEN local."probability"
      ELSE synced."probability"
    END AS "probability",
   CASE
    WHEN 'itemId' = ANY(local.changed_columns)
      THEN local."itemId"
      ELSE synced."itemId"
    END AS "itemId",
   CASE
    WHEN 'belongToTaskId' = ANY(local.changed_columns)
      THEN local."belongToTaskId"
      ELSE synced."belongToTaskId"
    END AS "belongToTaskId"
  FROM "task_reward_synced" AS synced
  FULL OUTER JOIN "task_reward_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION task_reward_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "task_reward_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "task_reward_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'type');
    changed_cols := array_append(changed_cols, 'value');
    changed_cols := array_append(changed_cols, 'probability');
    changed_cols := array_append(changed_cols, 'itemId');
    changed_cols := array_append(changed_cols, 'belongToTaskId');

    INSERT INTO "task_reward_local" (
    "id", "type", "value", "probability", "itemId", "belongToTaskId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."type", NEW."value", NEW."probability", NEW."itemId", NEW."belongToTaskId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'task_reward',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'type', NEW."type",
      'value', NEW."value",
      'probability', NEW."probability",
      'itemId', NEW."itemId",
      'belongToTaskId', NEW."belongToTaskId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION task_reward_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "task_reward_synced"%ROWTYPE;
    local "task_reward_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "task_reward_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "task_reward_local" WHERE "id" = NEW."id";
    
    IF NEW."type" IS DISTINCT FROM synced."type" THEN
      changed_cols := array_append(changed_cols, 'type');
    END IF;
    IF NEW."value" IS DISTINCT FROM synced."value" THEN
      changed_cols := array_append(changed_cols, 'value');
    END IF;
    IF NEW."probability" IS DISTINCT FROM synced."probability" THEN
      changed_cols := array_append(changed_cols, 'probability');
    END IF;
    IF NEW."itemId" IS DISTINCT FROM synced."itemId" THEN
      changed_cols := array_append(changed_cols, 'itemId');
    END IF;
    IF NEW."belongToTaskId" IS DISTINCT FROM synced."belongToTaskId" THEN
      changed_cols := array_append(changed_cols, 'belongToTaskId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "task_reward_local" (
        "id", "type", "value", "probability", "itemId", "belongToTaskId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."type", NEW."value", NEW."probability", NEW."itemId", NEW."belongToTaskId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "task_reward_local"
    SET
        
    "type" = NEW."type",
    "value" = NEW."value",
    "probability" = NEW."probability",
    "itemId" = NEW."itemId",
    "belongToTaskId" = NEW."belongToTaskId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'task_reward',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'type', NEW."type",
      'value', NEW."value",
      'probability', NEW."probability",
      'itemId', NEW."itemId",
      'belongToTaskId', NEW."belongToTaskId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION task_reward_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "task_reward_local" WHERE "id" = OLD."id") THEN
    UPDATE "task_reward_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "task_reward_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'task_reward',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER task_reward_insert
INSTEAD OF INSERT ON "task_reward"
FOR EACH ROW EXECUTE FUNCTION task_reward_insert_trigger();

CREATE OR REPLACE TRIGGER task_reward_update
INSTEAD OF UPDATE ON "task_reward"
FOR EACH ROW EXECUTE FUNCTION task_reward_update_trigger();

CREATE OR REPLACE TRIGGER task_reward_delete
INSTEAD OF DELETE ON "task_reward"
FOR EACH ROW EXECUTE FUNCTION task_reward_delete_trigger();


CREATE OR REPLACE FUNCTION task_reward_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "task_reward_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION task_reward_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "task_reward_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "task_reward_synced"
FOR EACH ROW EXECUTE FUNCTION task_reward_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "task_reward_synced"
FOR EACH ROW EXECUTE FUNCTION task_reward_delete_local_on_synced_delete_trigger();

-- CreateTable
-- skill
CREATE TABLE IF NOT EXISTS "skill_synced" (
  "id" TEXT NOT NULL,
  "treeType" "SkillTreeType" NOT NULL,
  "posX" INTEGER NOT NULL,
  "posY" INTEGER NOT NULL,
  "tier" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "details" TEXT NOT NULL,
  "dataSources" TEXT NOT NULL,
  "statisticId" TEXT NOT NULL,
  "preSkillId" TEXT,
  "updatedByAccountId" TEXT,
  "createdByAccountId" TEXT,
  "write_id" UUID,
  CONSTRAINT "skill_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "skill_local" (
  "id" TEXT,
  "treeType" "SkillTreeType",
  "posX" INTEGER,
  "posY" INTEGER,
  "tier" INTEGER,
  "name" TEXT,
  "details" TEXT,
  "dataSources" TEXT,
  "statisticId" TEXT,
  "preSkillId" TEXT,
  "updatedByAccountId" TEXT,
  "createdByAccountId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "skill_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "skill" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'treeType' = ANY(local.changed_columns)
      THEN local."treeType"
      ELSE synced."treeType"
    END AS "treeType",
   CASE
    WHEN 'posX' = ANY(local.changed_columns)
      THEN local."posX"
      ELSE synced."posX"
    END AS "posX",
   CASE
    WHEN 'posY' = ANY(local.changed_columns)
      THEN local."posY"
      ELSE synced."posY"
    END AS "posY",
   CASE
    WHEN 'tier' = ANY(local.changed_columns)
      THEN local."tier"
      ELSE synced."tier"
    END AS "tier",
   CASE
    WHEN 'name' = ANY(local.changed_columns)
      THEN local."name"
      ELSE synced."name"
    END AS "name",
   CASE
    WHEN 'details' = ANY(local.changed_columns)
      THEN local."details"
      ELSE synced."details"
    END AS "details",
   CASE
    WHEN 'dataSources' = ANY(local.changed_columns)
      THEN local."dataSources"
      ELSE synced."dataSources"
    END AS "dataSources",
   CASE
    WHEN 'statisticId' = ANY(local.changed_columns)
      THEN local."statisticId"
      ELSE synced."statisticId"
    END AS "statisticId",
   CASE
    WHEN 'preSkillId' = ANY(local.changed_columns)
      THEN local."preSkillId"
      ELSE synced."preSkillId"
    END AS "preSkillId",
   CASE
    WHEN 'updatedByAccountId' = ANY(local.changed_columns)
      THEN local."updatedByAccountId"
      ELSE synced."updatedByAccountId"
    END AS "updatedByAccountId",
   CASE
    WHEN 'createdByAccountId' = ANY(local.changed_columns)
      THEN local."createdByAccountId"
      ELSE synced."createdByAccountId"
    END AS "createdByAccountId"
  FROM "skill_synced" AS synced
  FULL OUTER JOIN "skill_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION skill_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "skill_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "skill_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'treeType');
    changed_cols := array_append(changed_cols, 'posX');
    changed_cols := array_append(changed_cols, 'posY');
    changed_cols := array_append(changed_cols, 'tier');
    changed_cols := array_append(changed_cols, 'name');
    changed_cols := array_append(changed_cols, 'details');
    changed_cols := array_append(changed_cols, 'dataSources');
    changed_cols := array_append(changed_cols, 'statisticId');
    changed_cols := array_append(changed_cols, 'preSkillId');
    changed_cols := array_append(changed_cols, 'updatedByAccountId');
    changed_cols := array_append(changed_cols, 'createdByAccountId');

    INSERT INTO "skill_local" (
    "id", "treeType", "posX", "posY", "tier", "name", "details", "dataSources", "statisticId", "preSkillId", "updatedByAccountId", "createdByAccountId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."treeType", NEW."posX", NEW."posY", NEW."tier", NEW."name", NEW."details", NEW."dataSources", NEW."statisticId", NEW."preSkillId", NEW."updatedByAccountId", NEW."createdByAccountId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'skill',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'treeType', NEW."treeType",
      'posX', NEW."posX",
      'posY', NEW."posY",
      'tier', NEW."tier",
      'name', NEW."name",
      'details', NEW."details",
      'dataSources', NEW."dataSources",
      'statisticId', NEW."statisticId",
      'preSkillId', NEW."preSkillId",
      'updatedByAccountId', NEW."updatedByAccountId",
      'createdByAccountId', NEW."createdByAccountId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION skill_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "skill_synced"%ROWTYPE;
    local "skill_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "skill_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "skill_local" WHERE "id" = NEW."id";
    
    IF NEW."treeType" IS DISTINCT FROM synced."treeType" THEN
      changed_cols := array_append(changed_cols, 'treeType');
    END IF;
    IF NEW."posX" IS DISTINCT FROM synced."posX" THEN
      changed_cols := array_append(changed_cols, 'posX');
    END IF;
    IF NEW."posY" IS DISTINCT FROM synced."posY" THEN
      changed_cols := array_append(changed_cols, 'posY');
    END IF;
    IF NEW."tier" IS DISTINCT FROM synced."tier" THEN
      changed_cols := array_append(changed_cols, 'tier');
    END IF;
    IF NEW."name" IS DISTINCT FROM synced."name" THEN
      changed_cols := array_append(changed_cols, 'name');
    END IF;
    IF NEW."details" IS DISTINCT FROM synced."details" THEN
      changed_cols := array_append(changed_cols, 'details');
    END IF;
    IF NEW."dataSources" IS DISTINCT FROM synced."dataSources" THEN
      changed_cols := array_append(changed_cols, 'dataSources');
    END IF;
    IF NEW."statisticId" IS DISTINCT FROM synced."statisticId" THEN
      changed_cols := array_append(changed_cols, 'statisticId');
    END IF;
    IF NEW."preSkillId" IS DISTINCT FROM synced."preSkillId" THEN
      changed_cols := array_append(changed_cols, 'preSkillId');
    END IF;
    IF NEW."updatedByAccountId" IS DISTINCT FROM synced."updatedByAccountId" THEN
      changed_cols := array_append(changed_cols, 'updatedByAccountId');
    END IF;
    IF NEW."createdByAccountId" IS DISTINCT FROM synced."createdByAccountId" THEN
      changed_cols := array_append(changed_cols, 'createdByAccountId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "skill_local" (
        "id", "treeType", "posX", "posY", "tier", "name", "details", "dataSources", "statisticId", "preSkillId", "updatedByAccountId", "createdByAccountId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."treeType", NEW."posX", NEW."posY", NEW."tier", NEW."name", NEW."details", NEW."dataSources", NEW."statisticId", NEW."preSkillId", NEW."updatedByAccountId", NEW."createdByAccountId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "skill_local"
    SET
        
    "treeType" = NEW."treeType",
    "posX" = NEW."posX",
    "posY" = NEW."posY",
    "tier" = NEW."tier",
    "name" = NEW."name",
    "details" = NEW."details",
    "dataSources" = NEW."dataSources",
    "statisticId" = NEW."statisticId",
    "preSkillId" = NEW."preSkillId",
    "updatedByAccountId" = NEW."updatedByAccountId",
    "createdByAccountId" = NEW."createdByAccountId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'skill',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'treeType', NEW."treeType",
      'posX', NEW."posX",
      'posY', NEW."posY",
      'tier', NEW."tier",
      'name', NEW."name",
      'details', NEW."details",
      'dataSources', NEW."dataSources",
      'statisticId', NEW."statisticId",
      'preSkillId', NEW."preSkillId",
      'updatedByAccountId', NEW."updatedByAccountId",
      'createdByAccountId', NEW."createdByAccountId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION skill_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "skill_local" WHERE "id" = OLD."id") THEN
    UPDATE "skill_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "skill_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'skill',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER skill_insert
INSTEAD OF INSERT ON "skill"
FOR EACH ROW EXECUTE FUNCTION skill_insert_trigger();

CREATE OR REPLACE TRIGGER skill_update
INSTEAD OF UPDATE ON "skill"
FOR EACH ROW EXECUTE FUNCTION skill_update_trigger();

CREATE OR REPLACE TRIGGER skill_delete
INSTEAD OF DELETE ON "skill"
FOR EACH ROW EXECUTE FUNCTION skill_delete_trigger();


CREATE OR REPLACE FUNCTION skill_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "skill_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION skill_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "skill_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "skill_synced"
FOR EACH ROW EXECUTE FUNCTION skill_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "skill_synced"
FOR EACH ROW EXECUTE FUNCTION skill_delete_local_on_synced_delete_trigger();

-- CreateTable
-- skill_variant
CREATE TABLE IF NOT EXISTS "skill_variant_synced" (
  "id" TEXT NOT NULL,
  "targetMainWeaponType" "MainHandTypeLimit" NOT NULL,
  "targetSubWeaponType" "SubHandTypeLimit" NOT NULL,
  "targetArmorAbilityType" "PlayerArmorAbilityTypeLimit" NOT NULL,
  "comboCompatible" BOOLEAN NOT NULL,
  "hpCost" TEXT,
  "mpCost" TEXT,
  "range" TEXT,
  "castTimeType" "SkillCastTimeType" NOT NULL,
  "distanceType" "SkillDistanceType" NOT NULL,
  "targetType" "SkillTargetType" NOT NULL,
  "chantingFixedMs" TEXT,
  "chantingModifiedMs" TEXT,
  "chargingFixedMs" TEXT,
  "chargingModifiedMs" TEXT,
  "actionFixedMs" TEXT NOT NULL,
  "actionModifiedMs" TEXT NOT NULL,
  "startupRatio" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "activeBehavior" JSONB,
  "passiveBehavior" JSONB[],
  "registeredBehavior" JSONB[],
  "details" TEXT,
  "belongToskillId" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "skill_variant_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "skill_variant_local" (
  "id" TEXT,
  "targetMainWeaponType" "MainHandTypeLimit",
  "targetSubWeaponType" "SubHandTypeLimit",
  "targetArmorAbilityType" "PlayerArmorAbilityTypeLimit",
  "comboCompatible" BOOLEAN,
  "hpCost" TEXT,
  "mpCost" TEXT,
  "range" TEXT,
  "castTimeType" "SkillCastTimeType",
  "distanceType" "SkillDistanceType",
  "targetType" "SkillTargetType",
  "chantingFixedMs" TEXT,
  "chantingModifiedMs" TEXT,
  "chargingFixedMs" TEXT,
  "chargingModifiedMs" TEXT,
  "actionFixedMs" TEXT,
  "actionModifiedMs" TEXT,
  "startupRatio" TEXT,
  "description" TEXT,
  "activeBehavior" JSONB,
  "passiveBehavior" JSONB[],
  "registeredBehavior" JSONB[],
  "details" TEXT,
  "belongToskillId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "skill_variant_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "skill_variant" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'targetMainWeaponType' = ANY(local.changed_columns)
      THEN local."targetMainWeaponType"
      ELSE synced."targetMainWeaponType"
    END AS "targetMainWeaponType",
   CASE
    WHEN 'targetSubWeaponType' = ANY(local.changed_columns)
      THEN local."targetSubWeaponType"
      ELSE synced."targetSubWeaponType"
    END AS "targetSubWeaponType",
   CASE
    WHEN 'targetArmorAbilityType' = ANY(local.changed_columns)
      THEN local."targetArmorAbilityType"
      ELSE synced."targetArmorAbilityType"
    END AS "targetArmorAbilityType",
   CASE
    WHEN 'comboCompatible' = ANY(local.changed_columns)
      THEN local."comboCompatible"
      ELSE synced."comboCompatible"
    END AS "comboCompatible",
   CASE
    WHEN 'hpCost' = ANY(local.changed_columns)
      THEN local."hpCost"
      ELSE synced."hpCost"
    END AS "hpCost",
   CASE
    WHEN 'mpCost' = ANY(local.changed_columns)
      THEN local."mpCost"
      ELSE synced."mpCost"
    END AS "mpCost",
   CASE
    WHEN 'range' = ANY(local.changed_columns)
      THEN local."range"
      ELSE synced."range"
    END AS "range",
   CASE
    WHEN 'castTimeType' = ANY(local.changed_columns)
      THEN local."castTimeType"
      ELSE synced."castTimeType"
    END AS "castTimeType",
   CASE
    WHEN 'distanceType' = ANY(local.changed_columns)
      THEN local."distanceType"
      ELSE synced."distanceType"
    END AS "distanceType",
   CASE
    WHEN 'targetType' = ANY(local.changed_columns)
      THEN local."targetType"
      ELSE synced."targetType"
    END AS "targetType",
   CASE
    WHEN 'chantingFixedMs' = ANY(local.changed_columns)
      THEN local."chantingFixedMs"
      ELSE synced."chantingFixedMs"
    END AS "chantingFixedMs",
   CASE
    WHEN 'chantingModifiedMs' = ANY(local.changed_columns)
      THEN local."chantingModifiedMs"
      ELSE synced."chantingModifiedMs"
    END AS "chantingModifiedMs",
   CASE
    WHEN 'chargingFixedMs' = ANY(local.changed_columns)
      THEN local."chargingFixedMs"
      ELSE synced."chargingFixedMs"
    END AS "chargingFixedMs",
   CASE
    WHEN 'chargingModifiedMs' = ANY(local.changed_columns)
      THEN local."chargingModifiedMs"
      ELSE synced."chargingModifiedMs"
    END AS "chargingModifiedMs",
   CASE
    WHEN 'actionFixedMs' = ANY(local.changed_columns)
      THEN local."actionFixedMs"
      ELSE synced."actionFixedMs"
    END AS "actionFixedMs",
   CASE
    WHEN 'actionModifiedMs' = ANY(local.changed_columns)
      THEN local."actionModifiedMs"
      ELSE synced."actionModifiedMs"
    END AS "actionModifiedMs",
   CASE
    WHEN 'startupRatio' = ANY(local.changed_columns)
      THEN local."startupRatio"
      ELSE synced."startupRatio"
    END AS "startupRatio",
   CASE
    WHEN 'description' = ANY(local.changed_columns)
      THEN local."description"
      ELSE synced."description"
    END AS "description",
   CASE
    WHEN 'activeBehavior' = ANY(local.changed_columns)
      THEN local."activeBehavior"
      ELSE synced."activeBehavior"
    END AS "activeBehavior",
   CASE
    WHEN 'passiveBehavior' = ANY(local.changed_columns)
      THEN local."passiveBehavior"
      ELSE synced."passiveBehavior"
    END AS "passiveBehavior",
   CASE
    WHEN 'registeredBehavior' = ANY(local.changed_columns)
      THEN local."registeredBehavior"
      ELSE synced."registeredBehavior"
    END AS "registeredBehavior",
   CASE
    WHEN 'details' = ANY(local.changed_columns)
      THEN local."details"
      ELSE synced."details"
    END AS "details",
   CASE
    WHEN 'belongToskillId' = ANY(local.changed_columns)
      THEN local."belongToskillId"
      ELSE synced."belongToskillId"
    END AS "belongToskillId"
  FROM "skill_variant_synced" AS synced
  FULL OUTER JOIN "skill_variant_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION skill_variant_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "skill_variant_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "skill_variant_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'targetMainWeaponType');
    changed_cols := array_append(changed_cols, 'targetSubWeaponType');
    changed_cols := array_append(changed_cols, 'targetArmorAbilityType');
    changed_cols := array_append(changed_cols, 'comboCompatible');
    changed_cols := array_append(changed_cols, 'hpCost');
    changed_cols := array_append(changed_cols, 'mpCost');
    changed_cols := array_append(changed_cols, 'range');
    changed_cols := array_append(changed_cols, 'castTimeType');
    changed_cols := array_append(changed_cols, 'distanceType');
    changed_cols := array_append(changed_cols, 'targetType');
    changed_cols := array_append(changed_cols, 'chantingFixedMs');
    changed_cols := array_append(changed_cols, 'chantingModifiedMs');
    changed_cols := array_append(changed_cols, 'chargingFixedMs');
    changed_cols := array_append(changed_cols, 'chargingModifiedMs');
    changed_cols := array_append(changed_cols, 'actionFixedMs');
    changed_cols := array_append(changed_cols, 'actionModifiedMs');
    changed_cols := array_append(changed_cols, 'startupRatio');
    changed_cols := array_append(changed_cols, 'description');
    changed_cols := array_append(changed_cols, 'activeBehavior');
    changed_cols := array_append(changed_cols, 'passiveBehavior');
    changed_cols := array_append(changed_cols, 'registeredBehavior');
    changed_cols := array_append(changed_cols, 'details');
    changed_cols := array_append(changed_cols, 'belongToskillId');

    INSERT INTO "skill_variant_local" (
    "id", "targetMainWeaponType", "targetSubWeaponType", "targetArmorAbilityType", "comboCompatible", "hpCost", "mpCost", "range", "castTimeType", "distanceType", "targetType", "chantingFixedMs", "chantingModifiedMs", "chargingFixedMs", "chargingModifiedMs", "actionFixedMs", "actionModifiedMs", "startupRatio", "description", "activeBehavior", "passiveBehavior", "registeredBehavior", "details", "belongToskillId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."targetMainWeaponType", NEW."targetSubWeaponType", NEW."targetArmorAbilityType", NEW."comboCompatible", NEW."hpCost", NEW."mpCost", NEW."range", NEW."castTimeType", NEW."distanceType", NEW."targetType", NEW."chantingFixedMs", NEW."chantingModifiedMs", NEW."chargingFixedMs", NEW."chargingModifiedMs", NEW."actionFixedMs", NEW."actionModifiedMs", NEW."startupRatio", NEW."description", NEW."activeBehavior", NEW."passiveBehavior", NEW."registeredBehavior", NEW."details", NEW."belongToskillId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'skill_variant',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'targetMainWeaponType', NEW."targetMainWeaponType",
      'targetSubWeaponType', NEW."targetSubWeaponType",
      'targetArmorAbilityType', NEW."targetArmorAbilityType",
      'comboCompatible', NEW."comboCompatible",
      'hpCost', NEW."hpCost",
      'mpCost', NEW."mpCost",
      'range', NEW."range",
      'castTimeType', NEW."castTimeType",
      'distanceType', NEW."distanceType",
      'targetType', NEW."targetType",
      'chantingFixedMs', NEW."chantingFixedMs",
      'chantingModifiedMs', NEW."chantingModifiedMs",
      'chargingFixedMs', NEW."chargingFixedMs",
      'chargingModifiedMs', NEW."chargingModifiedMs",
      'actionFixedMs', NEW."actionFixedMs",
      'actionModifiedMs', NEW."actionModifiedMs",
      'startupRatio', NEW."startupRatio",
      'description', NEW."description",
      'activeBehavior', NEW."activeBehavior",
      'passiveBehavior', NEW."passiveBehavior",
      'registeredBehavior', NEW."registeredBehavior",
      'details', NEW."details",
      'belongToskillId', NEW."belongToskillId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION skill_variant_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "skill_variant_synced"%ROWTYPE;
    local "skill_variant_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "skill_variant_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "skill_variant_local" WHERE "id" = NEW."id";
    
    IF NEW."targetMainWeaponType" IS DISTINCT FROM synced."targetMainWeaponType" THEN
      changed_cols := array_append(changed_cols, 'targetMainWeaponType');
    END IF;
    IF NEW."targetSubWeaponType" IS DISTINCT FROM synced."targetSubWeaponType" THEN
      changed_cols := array_append(changed_cols, 'targetSubWeaponType');
    END IF;
    IF NEW."targetArmorAbilityType" IS DISTINCT FROM synced."targetArmorAbilityType" THEN
      changed_cols := array_append(changed_cols, 'targetArmorAbilityType');
    END IF;
    IF NEW."comboCompatible" IS DISTINCT FROM synced."comboCompatible" THEN
      changed_cols := array_append(changed_cols, 'comboCompatible');
    END IF;
    IF NEW."hpCost" IS DISTINCT FROM synced."hpCost" THEN
      changed_cols := array_append(changed_cols, 'hpCost');
    END IF;
    IF NEW."mpCost" IS DISTINCT FROM synced."mpCost" THEN
      changed_cols := array_append(changed_cols, 'mpCost');
    END IF;
    IF NEW."range" IS DISTINCT FROM synced."range" THEN
      changed_cols := array_append(changed_cols, 'range');
    END IF;
    IF NEW."castTimeType" IS DISTINCT FROM synced."castTimeType" THEN
      changed_cols := array_append(changed_cols, 'castTimeType');
    END IF;
    IF NEW."distanceType" IS DISTINCT FROM synced."distanceType" THEN
      changed_cols := array_append(changed_cols, 'distanceType');
    END IF;
    IF NEW."targetType" IS DISTINCT FROM synced."targetType" THEN
      changed_cols := array_append(changed_cols, 'targetType');
    END IF;
    IF NEW."chantingFixedMs" IS DISTINCT FROM synced."chantingFixedMs" THEN
      changed_cols := array_append(changed_cols, 'chantingFixedMs');
    END IF;
    IF NEW."chantingModifiedMs" IS DISTINCT FROM synced."chantingModifiedMs" THEN
      changed_cols := array_append(changed_cols, 'chantingModifiedMs');
    END IF;
    IF NEW."chargingFixedMs" IS DISTINCT FROM synced."chargingFixedMs" THEN
      changed_cols := array_append(changed_cols, 'chargingFixedMs');
    END IF;
    IF NEW."chargingModifiedMs" IS DISTINCT FROM synced."chargingModifiedMs" THEN
      changed_cols := array_append(changed_cols, 'chargingModifiedMs');
    END IF;
    IF NEW."actionFixedMs" IS DISTINCT FROM synced."actionFixedMs" THEN
      changed_cols := array_append(changed_cols, 'actionFixedMs');
    END IF;
    IF NEW."actionModifiedMs" IS DISTINCT FROM synced."actionModifiedMs" THEN
      changed_cols := array_append(changed_cols, 'actionModifiedMs');
    END IF;
    IF NEW."startupRatio" IS DISTINCT FROM synced."startupRatio" THEN
      changed_cols := array_append(changed_cols, 'startupRatio');
    END IF;
    IF NEW."description" IS DISTINCT FROM synced."description" THEN
      changed_cols := array_append(changed_cols, 'description');
    END IF;
    IF NEW."activeBehavior" IS DISTINCT FROM synced."activeBehavior" THEN
      changed_cols := array_append(changed_cols, 'activeBehavior');
    END IF;
    IF NEW."passiveBehavior" IS DISTINCT FROM synced."passiveBehavior" THEN
      changed_cols := array_append(changed_cols, 'passiveBehavior');
    END IF;
    IF NEW."registeredBehavior" IS DISTINCT FROM synced."registeredBehavior" THEN
      changed_cols := array_append(changed_cols, 'registeredBehavior');
    END IF;
    IF NEW."details" IS DISTINCT FROM synced."details" THEN
      changed_cols := array_append(changed_cols, 'details');
    END IF;
    IF NEW."belongToskillId" IS DISTINCT FROM synced."belongToskillId" THEN
      changed_cols := array_append(changed_cols, 'belongToskillId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "skill_variant_local" (
        "id", "targetMainWeaponType", "targetSubWeaponType", "targetArmorAbilityType", "comboCompatible", "hpCost", "mpCost", "range", "castTimeType", "distanceType", "targetType", "chantingFixedMs", "chantingModifiedMs", "chargingFixedMs", "chargingModifiedMs", "actionFixedMs", "actionModifiedMs", "startupRatio", "description", "activeBehavior", "passiveBehavior", "registeredBehavior", "details", "belongToskillId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."targetMainWeaponType", NEW."targetSubWeaponType", NEW."targetArmorAbilityType", NEW."comboCompatible", NEW."hpCost", NEW."mpCost", NEW."range", NEW."castTimeType", NEW."distanceType", NEW."targetType", NEW."chantingFixedMs", NEW."chantingModifiedMs", NEW."chargingFixedMs", NEW."chargingModifiedMs", NEW."actionFixedMs", NEW."actionModifiedMs", NEW."startupRatio", NEW."description", NEW."activeBehavior", NEW."passiveBehavior", NEW."registeredBehavior", NEW."details", NEW."belongToskillId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "skill_variant_local"
    SET
        
    "targetMainWeaponType" = NEW."targetMainWeaponType",
    "targetSubWeaponType" = NEW."targetSubWeaponType",
    "targetArmorAbilityType" = NEW."targetArmorAbilityType",
    "comboCompatible" = NEW."comboCompatible",
    "hpCost" = NEW."hpCost",
    "mpCost" = NEW."mpCost",
    "range" = NEW."range",
    "castTimeType" = NEW."castTimeType",
    "distanceType" = NEW."distanceType",
    "targetType" = NEW."targetType",
    "chantingFixedMs" = NEW."chantingFixedMs",
    "chantingModifiedMs" = NEW."chantingModifiedMs",
    "chargingFixedMs" = NEW."chargingFixedMs",
    "chargingModifiedMs" = NEW."chargingModifiedMs",
    "actionFixedMs" = NEW."actionFixedMs",
    "actionModifiedMs" = NEW."actionModifiedMs",
    "startupRatio" = NEW."startupRatio",
    "description" = NEW."description",
    "activeBehavior" = NEW."activeBehavior",
    "passiveBehavior" = NEW."passiveBehavior",
    "registeredBehavior" = NEW."registeredBehavior",
    "details" = NEW."details",
    "belongToskillId" = NEW."belongToskillId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'skill_variant',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'targetMainWeaponType', NEW."targetMainWeaponType",
      'targetSubWeaponType', NEW."targetSubWeaponType",
      'targetArmorAbilityType', NEW."targetArmorAbilityType",
      'comboCompatible', NEW."comboCompatible",
      'hpCost', NEW."hpCost",
      'mpCost', NEW."mpCost",
      'range', NEW."range",
      'castTimeType', NEW."castTimeType",
      'distanceType', NEW."distanceType",
      'targetType', NEW."targetType",
      'chantingFixedMs', NEW."chantingFixedMs",
      'chantingModifiedMs', NEW."chantingModifiedMs",
      'chargingFixedMs', NEW."chargingFixedMs",
      'chargingModifiedMs', NEW."chargingModifiedMs",
      'actionFixedMs', NEW."actionFixedMs",
      'actionModifiedMs', NEW."actionModifiedMs",
      'startupRatio', NEW."startupRatio",
      'description', NEW."description",
      'activeBehavior', NEW."activeBehavior",
      'passiveBehavior', NEW."passiveBehavior",
      'registeredBehavior', NEW."registeredBehavior",
      'details', NEW."details",
      'belongToskillId', NEW."belongToskillId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION skill_variant_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "skill_variant_local" WHERE "id" = OLD."id") THEN
    UPDATE "skill_variant_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "skill_variant_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'skill_variant',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER skill_variant_insert
INSTEAD OF INSERT ON "skill_variant"
FOR EACH ROW EXECUTE FUNCTION skill_variant_insert_trigger();

CREATE OR REPLACE TRIGGER skill_variant_update
INSTEAD OF UPDATE ON "skill_variant"
FOR EACH ROW EXECUTE FUNCTION skill_variant_update_trigger();

CREATE OR REPLACE TRIGGER skill_variant_delete
INSTEAD OF DELETE ON "skill_variant"
FOR EACH ROW EXECUTE FUNCTION skill_variant_delete_trigger();


CREATE OR REPLACE FUNCTION skill_variant_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "skill_variant_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION skill_variant_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "skill_variant_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "skill_variant_synced"
FOR EACH ROW EXECUTE FUNCTION skill_variant_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "skill_variant_synced"
FOR EACH ROW EXECUTE FUNCTION skill_variant_delete_local_on_synced_delete_trigger();

-- CreateTable
-- behavior_tree
CREATE TABLE IF NOT EXISTS "behavior_tree_synced" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "definition" TEXT NOT NULL,
  "agent" TEXT NOT NULL,
  "attributeSlots" JSONB NOT NULL,
  "activeOwnerId" TEXT,
  "passiveOwnerId" TEXT,
  "registeredOwnerId" TEXT,
  "write_id" UUID,
  CONSTRAINT "behavior_tree_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "behavior_tree_local" (
  "id" TEXT,
  "name" TEXT,
  "definition" TEXT,
  "agent" TEXT,
  "attributeSlots" JSONB,
  "activeOwnerId" TEXT,
  "passiveOwnerId" TEXT,
  "registeredOwnerId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "behavior_tree_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "behavior_tree" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'name' = ANY(local.changed_columns)
      THEN local."name"
      ELSE synced."name"
    END AS "name",
   CASE
    WHEN 'definition' = ANY(local.changed_columns)
      THEN local."definition"
      ELSE synced."definition"
    END AS "definition",
   CASE
    WHEN 'agent' = ANY(local.changed_columns)
      THEN local."agent"
      ELSE synced."agent"
    END AS "agent",
   CASE
    WHEN 'attributeSlots' = ANY(local.changed_columns)
      THEN local."attributeSlots"
      ELSE synced."attributeSlots"
    END AS "attributeSlots",
   CASE
    WHEN 'activeOwnerId' = ANY(local.changed_columns)
      THEN local."activeOwnerId"
      ELSE synced."activeOwnerId"
    END AS "activeOwnerId",
   CASE
    WHEN 'passiveOwnerId' = ANY(local.changed_columns)
      THEN local."passiveOwnerId"
      ELSE synced."passiveOwnerId"
    END AS "passiveOwnerId",
   CASE
    WHEN 'registeredOwnerId' = ANY(local.changed_columns)
      THEN local."registeredOwnerId"
      ELSE synced."registeredOwnerId"
    END AS "registeredOwnerId"
  FROM "behavior_tree_synced" AS synced
  FULL OUTER JOIN "behavior_tree_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION behavior_tree_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "behavior_tree_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "behavior_tree_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'name');
    changed_cols := array_append(changed_cols, 'definition');
    changed_cols := array_append(changed_cols, 'agent');
    changed_cols := array_append(changed_cols, 'attributeSlots');
    changed_cols := array_append(changed_cols, 'activeOwnerId');
    changed_cols := array_append(changed_cols, 'passiveOwnerId');
    changed_cols := array_append(changed_cols, 'registeredOwnerId');

    INSERT INTO "behavior_tree_local" (
    "id", "name", "definition", "agent", "attributeSlots", "activeOwnerId", "passiveOwnerId", "registeredOwnerId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."name", NEW."definition", NEW."agent", NEW."attributeSlots", NEW."activeOwnerId", NEW."passiveOwnerId", NEW."registeredOwnerId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'behavior_tree',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'definition', NEW."definition",
      'agent', NEW."agent",
      'attributeSlots', NEW."attributeSlots",
      'activeOwnerId', NEW."activeOwnerId",
      'passiveOwnerId', NEW."passiveOwnerId",
      'registeredOwnerId', NEW."registeredOwnerId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION behavior_tree_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "behavior_tree_synced"%ROWTYPE;
    local "behavior_tree_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "behavior_tree_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "behavior_tree_local" WHERE "id" = NEW."id";
    
    IF NEW."name" IS DISTINCT FROM synced."name" THEN
      changed_cols := array_append(changed_cols, 'name');
    END IF;
    IF NEW."definition" IS DISTINCT FROM synced."definition" THEN
      changed_cols := array_append(changed_cols, 'definition');
    END IF;
    IF NEW."agent" IS DISTINCT FROM synced."agent" THEN
      changed_cols := array_append(changed_cols, 'agent');
    END IF;
    IF NEW."attributeSlots" IS DISTINCT FROM synced."attributeSlots" THEN
      changed_cols := array_append(changed_cols, 'attributeSlots');
    END IF;
    IF NEW."activeOwnerId" IS DISTINCT FROM synced."activeOwnerId" THEN
      changed_cols := array_append(changed_cols, 'activeOwnerId');
    END IF;
    IF NEW."passiveOwnerId" IS DISTINCT FROM synced."passiveOwnerId" THEN
      changed_cols := array_append(changed_cols, 'passiveOwnerId');
    END IF;
    IF NEW."registeredOwnerId" IS DISTINCT FROM synced."registeredOwnerId" THEN
      changed_cols := array_append(changed_cols, 'registeredOwnerId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "behavior_tree_local" (
        "id", "name", "definition", "agent", "attributeSlots", "activeOwnerId", "passiveOwnerId", "registeredOwnerId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."name", NEW."definition", NEW."agent", NEW."attributeSlots", NEW."activeOwnerId", NEW."passiveOwnerId", NEW."registeredOwnerId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "behavior_tree_local"
    SET
        
    "name" = NEW."name",
    "definition" = NEW."definition",
    "agent" = NEW."agent",
    "attributeSlots" = NEW."attributeSlots",
    "activeOwnerId" = NEW."activeOwnerId",
    "passiveOwnerId" = NEW."passiveOwnerId",
    "registeredOwnerId" = NEW."registeredOwnerId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'behavior_tree',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'definition', NEW."definition",
      'agent', NEW."agent",
      'attributeSlots', NEW."attributeSlots",
      'activeOwnerId', NEW."activeOwnerId",
      'passiveOwnerId', NEW."passiveOwnerId",
      'registeredOwnerId', NEW."registeredOwnerId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION behavior_tree_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "behavior_tree_local" WHERE "id" = OLD."id") THEN
    UPDATE "behavior_tree_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "behavior_tree_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'behavior_tree',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER behavior_tree_insert
INSTEAD OF INSERT ON "behavior_tree"
FOR EACH ROW EXECUTE FUNCTION behavior_tree_insert_trigger();

CREATE OR REPLACE TRIGGER behavior_tree_update
INSTEAD OF UPDATE ON "behavior_tree"
FOR EACH ROW EXECUTE FUNCTION behavior_tree_update_trigger();

CREATE OR REPLACE TRIGGER behavior_tree_delete
INSTEAD OF DELETE ON "behavior_tree"
FOR EACH ROW EXECUTE FUNCTION behavior_tree_delete_trigger();


CREATE OR REPLACE FUNCTION behavior_tree_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "behavior_tree_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION behavior_tree_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "behavior_tree_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "behavior_tree_synced"
FOR EACH ROW EXECUTE FUNCTION behavior_tree_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "behavior_tree_synced"
FOR EACH ROW EXECUTE FUNCTION behavior_tree_delete_local_on_synced_delete_trigger();

-- CreateTable
-- registlet
CREATE TABLE IF NOT EXISTS "registlet_synced" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "maxLevel" INTEGER NOT NULL,
  "attrModifiers" TEXT[],
  "pipelinePatches" JSONB[],
  "skillBranchActivators" JSONB[],
  "subscriptions" JSONB[],
  "thresholdWatchers" JSONB[],
  "updatedByAccountId" TEXT,
  "createdByAccountId" TEXT,
  "write_id" UUID,
  CONSTRAINT "registlet_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "registlet_local" (
  "id" TEXT,
  "name" TEXT,
  "maxLevel" INTEGER,
  "attrModifiers" TEXT[],
  "pipelinePatches" JSONB[],
  "skillBranchActivators" JSONB[],
  "subscriptions" JSONB[],
  "thresholdWatchers" JSONB[],
  "updatedByAccountId" TEXT,
  "createdByAccountId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "registlet_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "registlet" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'name' = ANY(local.changed_columns)
      THEN local."name"
      ELSE synced."name"
    END AS "name",
   CASE
    WHEN 'maxLevel' = ANY(local.changed_columns)
      THEN local."maxLevel"
      ELSE synced."maxLevel"
    END AS "maxLevel",
   CASE
    WHEN 'attrModifiers' = ANY(local.changed_columns)
      THEN local."attrModifiers"
      ELSE synced."attrModifiers"
    END AS "attrModifiers",
   CASE
    WHEN 'pipelinePatches' = ANY(local.changed_columns)
      THEN local."pipelinePatches"
      ELSE synced."pipelinePatches"
    END AS "pipelinePatches",
   CASE
    WHEN 'skillBranchActivators' = ANY(local.changed_columns)
      THEN local."skillBranchActivators"
      ELSE synced."skillBranchActivators"
    END AS "skillBranchActivators",
   CASE
    WHEN 'subscriptions' = ANY(local.changed_columns)
      THEN local."subscriptions"
      ELSE synced."subscriptions"
    END AS "subscriptions",
   CASE
    WHEN 'thresholdWatchers' = ANY(local.changed_columns)
      THEN local."thresholdWatchers"
      ELSE synced."thresholdWatchers"
    END AS "thresholdWatchers",
   CASE
    WHEN 'updatedByAccountId' = ANY(local.changed_columns)
      THEN local."updatedByAccountId"
      ELSE synced."updatedByAccountId"
    END AS "updatedByAccountId",
   CASE
    WHEN 'createdByAccountId' = ANY(local.changed_columns)
      THEN local."createdByAccountId"
      ELSE synced."createdByAccountId"
    END AS "createdByAccountId"
  FROM "registlet_synced" AS synced
  FULL OUTER JOIN "registlet_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION registlet_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "registlet_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "registlet_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'name');
    changed_cols := array_append(changed_cols, 'maxLevel');
    changed_cols := array_append(changed_cols, 'attrModifiers');
    changed_cols := array_append(changed_cols, 'pipelinePatches');
    changed_cols := array_append(changed_cols, 'skillBranchActivators');
    changed_cols := array_append(changed_cols, 'subscriptions');
    changed_cols := array_append(changed_cols, 'thresholdWatchers');
    changed_cols := array_append(changed_cols, 'updatedByAccountId');
    changed_cols := array_append(changed_cols, 'createdByAccountId');

    INSERT INTO "registlet_local" (
    "id", "name", "maxLevel", "attrModifiers", "pipelinePatches", "skillBranchActivators", "subscriptions", "thresholdWatchers", "updatedByAccountId", "createdByAccountId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."name", NEW."maxLevel", NEW."attrModifiers", NEW."pipelinePatches", NEW."skillBranchActivators", NEW."subscriptions", NEW."thresholdWatchers", NEW."updatedByAccountId", NEW."createdByAccountId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'registlet',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'maxLevel', NEW."maxLevel",
      'attrModifiers', NEW."attrModifiers",
      'pipelinePatches', NEW."pipelinePatches",
      'skillBranchActivators', NEW."skillBranchActivators",
      'subscriptions', NEW."subscriptions",
      'thresholdWatchers', NEW."thresholdWatchers",
      'updatedByAccountId', NEW."updatedByAccountId",
      'createdByAccountId', NEW."createdByAccountId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION registlet_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "registlet_synced"%ROWTYPE;
    local "registlet_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "registlet_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "registlet_local" WHERE "id" = NEW."id";
    
    IF NEW."name" IS DISTINCT FROM synced."name" THEN
      changed_cols := array_append(changed_cols, 'name');
    END IF;
    IF NEW."maxLevel" IS DISTINCT FROM synced."maxLevel" THEN
      changed_cols := array_append(changed_cols, 'maxLevel');
    END IF;
    IF NEW."attrModifiers" IS DISTINCT FROM synced."attrModifiers" THEN
      changed_cols := array_append(changed_cols, 'attrModifiers');
    END IF;
    IF NEW."pipelinePatches" IS DISTINCT FROM synced."pipelinePatches" THEN
      changed_cols := array_append(changed_cols, 'pipelinePatches');
    END IF;
    IF NEW."skillBranchActivators" IS DISTINCT FROM synced."skillBranchActivators" THEN
      changed_cols := array_append(changed_cols, 'skillBranchActivators');
    END IF;
    IF NEW."subscriptions" IS DISTINCT FROM synced."subscriptions" THEN
      changed_cols := array_append(changed_cols, 'subscriptions');
    END IF;
    IF NEW."thresholdWatchers" IS DISTINCT FROM synced."thresholdWatchers" THEN
      changed_cols := array_append(changed_cols, 'thresholdWatchers');
    END IF;
    IF NEW."updatedByAccountId" IS DISTINCT FROM synced."updatedByAccountId" THEN
      changed_cols := array_append(changed_cols, 'updatedByAccountId');
    END IF;
    IF NEW."createdByAccountId" IS DISTINCT FROM synced."createdByAccountId" THEN
      changed_cols := array_append(changed_cols, 'createdByAccountId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "registlet_local" (
        "id", "name", "maxLevel", "attrModifiers", "pipelinePatches", "skillBranchActivators", "subscriptions", "thresholdWatchers", "updatedByAccountId", "createdByAccountId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."name", NEW."maxLevel", NEW."attrModifiers", NEW."pipelinePatches", NEW."skillBranchActivators", NEW."subscriptions", NEW."thresholdWatchers", NEW."updatedByAccountId", NEW."createdByAccountId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "registlet_local"
    SET
        
    "name" = NEW."name",
    "maxLevel" = NEW."maxLevel",
    "attrModifiers" = NEW."attrModifiers",
    "pipelinePatches" = NEW."pipelinePatches",
    "skillBranchActivators" = NEW."skillBranchActivators",
    "subscriptions" = NEW."subscriptions",
    "thresholdWatchers" = NEW."thresholdWatchers",
    "updatedByAccountId" = NEW."updatedByAccountId",
    "createdByAccountId" = NEW."createdByAccountId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'registlet',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'maxLevel', NEW."maxLevel",
      'attrModifiers', NEW."attrModifiers",
      'pipelinePatches', NEW."pipelinePatches",
      'skillBranchActivators', NEW."skillBranchActivators",
      'subscriptions', NEW."subscriptions",
      'thresholdWatchers', NEW."thresholdWatchers",
      'updatedByAccountId', NEW."updatedByAccountId",
      'createdByAccountId', NEW."createdByAccountId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION registlet_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "registlet_local" WHERE "id" = OLD."id") THEN
    UPDATE "registlet_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "registlet_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'registlet',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER registlet_insert
INSTEAD OF INSERT ON "registlet"
FOR EACH ROW EXECUTE FUNCTION registlet_insert_trigger();

CREATE OR REPLACE TRIGGER registlet_update
INSTEAD OF UPDATE ON "registlet"
FOR EACH ROW EXECUTE FUNCTION registlet_update_trigger();

CREATE OR REPLACE TRIGGER registlet_delete
INSTEAD OF DELETE ON "registlet"
FOR EACH ROW EXECUTE FUNCTION registlet_delete_trigger();


CREATE OR REPLACE FUNCTION registlet_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "registlet_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION registlet_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "registlet_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "registlet_synced"
FOR EACH ROW EXECUTE FUNCTION registlet_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "registlet_synced"
FOR EACH ROW EXECUTE FUNCTION registlet_delete_local_on_synced_delete_trigger();

-- CreateTable
-- player
CREATE TABLE IF NOT EXISTS "player_synced" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "useIn" TEXT NOT NULL,
  "belongToAccountId" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "player_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "player_local" (
  "id" TEXT,
  "name" TEXT,
  "useIn" TEXT,
  "belongToAccountId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "player_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "player" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'name' = ANY(local.changed_columns)
      THEN local."name"
      ELSE synced."name"
    END AS "name",
   CASE
    WHEN 'useIn' = ANY(local.changed_columns)
      THEN local."useIn"
      ELSE synced."useIn"
    END AS "useIn",
   CASE
    WHEN 'belongToAccountId' = ANY(local.changed_columns)
      THEN local."belongToAccountId"
      ELSE synced."belongToAccountId"
    END AS "belongToAccountId"
  FROM "player_synced" AS synced
  FULL OUTER JOIN "player_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION player_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "player_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "player_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'name');
    changed_cols := array_append(changed_cols, 'useIn');
    changed_cols := array_append(changed_cols, 'belongToAccountId');

    INSERT INTO "player_local" (
    "id", "name", "useIn", "belongToAccountId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."name", NEW."useIn", NEW."belongToAccountId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'player',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'useIn', NEW."useIn",
      'belongToAccountId', NEW."belongToAccountId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION player_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "player_synced"%ROWTYPE;
    local "player_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "player_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "player_local" WHERE "id" = NEW."id";
    
    IF NEW."name" IS DISTINCT FROM synced."name" THEN
      changed_cols := array_append(changed_cols, 'name');
    END IF;
    IF NEW."useIn" IS DISTINCT FROM synced."useIn" THEN
      changed_cols := array_append(changed_cols, 'useIn');
    END IF;
    IF NEW."belongToAccountId" IS DISTINCT FROM synced."belongToAccountId" THEN
      changed_cols := array_append(changed_cols, 'belongToAccountId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "player_local" (
        "id", "name", "useIn", "belongToAccountId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."name", NEW."useIn", NEW."belongToAccountId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "player_local"
    SET
        
    "name" = NEW."name",
    "useIn" = NEW."useIn",
    "belongToAccountId" = NEW."belongToAccountId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'player',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'useIn', NEW."useIn",
      'belongToAccountId', NEW."belongToAccountId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION player_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "player_local" WHERE "id" = OLD."id") THEN
    UPDATE "player_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "player_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'player',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER player_insert
INSTEAD OF INSERT ON "player"
FOR EACH ROW EXECUTE FUNCTION player_insert_trigger();

CREATE OR REPLACE TRIGGER player_update
INSTEAD OF UPDATE ON "player"
FOR EACH ROW EXECUTE FUNCTION player_update_trigger();

CREATE OR REPLACE TRIGGER player_delete
INSTEAD OF DELETE ON "player"
FOR EACH ROW EXECUTE FUNCTION player_delete_trigger();


CREATE OR REPLACE FUNCTION player_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "player_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION player_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "player_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "player_synced"
FOR EACH ROW EXECUTE FUNCTION player_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "player_synced"
FOR EACH ROW EXECUTE FUNCTION player_delete_local_on_synced_delete_trigger();

-- CreateTable
-- player_weapon
CREATE TABLE IF NOT EXISTS "player_weapon_synced" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "WeaponType" NOT NULL,
  "elementType" "ElementType" NOT NULL,
  "baseAbi" INTEGER NOT NULL,
  "stability" INTEGER NOT NULL,
  "extraAbi" INTEGER NOT NULL,
  "templateId" TEXT,
  "refinement" INTEGER NOT NULL,
  "modifiers" TEXT[],
  "belongToPlayerId" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "player_weapon_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "player_weapon_local" (
  "id" TEXT,
  "name" TEXT,
  "type" "WeaponType",
  "elementType" "ElementType",
  "baseAbi" INTEGER,
  "stability" INTEGER,
  "extraAbi" INTEGER,
  "templateId" TEXT,
  "refinement" INTEGER,
  "modifiers" TEXT[],
  "belongToPlayerId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "player_weapon_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "player_weapon" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'name' = ANY(local.changed_columns)
      THEN local."name"
      ELSE synced."name"
    END AS "name",
   CASE
    WHEN 'type' = ANY(local.changed_columns)
      THEN local."type"
      ELSE synced."type"
    END AS "type",
   CASE
    WHEN 'elementType' = ANY(local.changed_columns)
      THEN local."elementType"
      ELSE synced."elementType"
    END AS "elementType",
   CASE
    WHEN 'baseAbi' = ANY(local.changed_columns)
      THEN local."baseAbi"
      ELSE synced."baseAbi"
    END AS "baseAbi",
   CASE
    WHEN 'stability' = ANY(local.changed_columns)
      THEN local."stability"
      ELSE synced."stability"
    END AS "stability",
   CASE
    WHEN 'extraAbi' = ANY(local.changed_columns)
      THEN local."extraAbi"
      ELSE synced."extraAbi"
    END AS "extraAbi",
   CASE
    WHEN 'templateId' = ANY(local.changed_columns)
      THEN local."templateId"
      ELSE synced."templateId"
    END AS "templateId",
   CASE
    WHEN 'refinement' = ANY(local.changed_columns)
      THEN local."refinement"
      ELSE synced."refinement"
    END AS "refinement",
   CASE
    WHEN 'modifiers' = ANY(local.changed_columns)
      THEN local."modifiers"
      ELSE synced."modifiers"
    END AS "modifiers",
   CASE
    WHEN 'belongToPlayerId' = ANY(local.changed_columns)
      THEN local."belongToPlayerId"
      ELSE synced."belongToPlayerId"
    END AS "belongToPlayerId"
  FROM "player_weapon_synced" AS synced
  FULL OUTER JOIN "player_weapon_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION player_weapon_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "player_weapon_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "player_weapon_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'name');
    changed_cols := array_append(changed_cols, 'type');
    changed_cols := array_append(changed_cols, 'elementType');
    changed_cols := array_append(changed_cols, 'baseAbi');
    changed_cols := array_append(changed_cols, 'stability');
    changed_cols := array_append(changed_cols, 'extraAbi');
    changed_cols := array_append(changed_cols, 'templateId');
    changed_cols := array_append(changed_cols, 'refinement');
    changed_cols := array_append(changed_cols, 'modifiers');
    changed_cols := array_append(changed_cols, 'belongToPlayerId');

    INSERT INTO "player_weapon_local" (
    "id", "name", "type", "elementType", "baseAbi", "stability", "extraAbi", "templateId", "refinement", "modifiers", "belongToPlayerId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."name", NEW."type", NEW."elementType", NEW."baseAbi", NEW."stability", NEW."extraAbi", NEW."templateId", NEW."refinement", NEW."modifiers", NEW."belongToPlayerId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'player_weapon',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'type', NEW."type",
      'elementType', NEW."elementType",
      'baseAbi', NEW."baseAbi",
      'stability', NEW."stability",
      'extraAbi', NEW."extraAbi",
      'templateId', NEW."templateId",
      'refinement', NEW."refinement",
      'modifiers', NEW."modifiers",
      'belongToPlayerId', NEW."belongToPlayerId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION player_weapon_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "player_weapon_synced"%ROWTYPE;
    local "player_weapon_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "player_weapon_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "player_weapon_local" WHERE "id" = NEW."id";
    
    IF NEW."name" IS DISTINCT FROM synced."name" THEN
      changed_cols := array_append(changed_cols, 'name');
    END IF;
    IF NEW."type" IS DISTINCT FROM synced."type" THEN
      changed_cols := array_append(changed_cols, 'type');
    END IF;
    IF NEW."elementType" IS DISTINCT FROM synced."elementType" THEN
      changed_cols := array_append(changed_cols, 'elementType');
    END IF;
    IF NEW."baseAbi" IS DISTINCT FROM synced."baseAbi" THEN
      changed_cols := array_append(changed_cols, 'baseAbi');
    END IF;
    IF NEW."stability" IS DISTINCT FROM synced."stability" THEN
      changed_cols := array_append(changed_cols, 'stability');
    END IF;
    IF NEW."extraAbi" IS DISTINCT FROM synced."extraAbi" THEN
      changed_cols := array_append(changed_cols, 'extraAbi');
    END IF;
    IF NEW."templateId" IS DISTINCT FROM synced."templateId" THEN
      changed_cols := array_append(changed_cols, 'templateId');
    END IF;
    IF NEW."refinement" IS DISTINCT FROM synced."refinement" THEN
      changed_cols := array_append(changed_cols, 'refinement');
    END IF;
    IF NEW."modifiers" IS DISTINCT FROM synced."modifiers" THEN
      changed_cols := array_append(changed_cols, 'modifiers');
    END IF;
    IF NEW."belongToPlayerId" IS DISTINCT FROM synced."belongToPlayerId" THEN
      changed_cols := array_append(changed_cols, 'belongToPlayerId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "player_weapon_local" (
        "id", "name", "type", "elementType", "baseAbi", "stability", "extraAbi", "templateId", "refinement", "modifiers", "belongToPlayerId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."name", NEW."type", NEW."elementType", NEW."baseAbi", NEW."stability", NEW."extraAbi", NEW."templateId", NEW."refinement", NEW."modifiers", NEW."belongToPlayerId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "player_weapon_local"
    SET
        
    "name" = NEW."name",
    "type" = NEW."type",
    "elementType" = NEW."elementType",
    "baseAbi" = NEW."baseAbi",
    "stability" = NEW."stability",
    "extraAbi" = NEW."extraAbi",
    "templateId" = NEW."templateId",
    "refinement" = NEW."refinement",
    "modifiers" = NEW."modifiers",
    "belongToPlayerId" = NEW."belongToPlayerId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'player_weapon',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'type', NEW."type",
      'elementType', NEW."elementType",
      'baseAbi', NEW."baseAbi",
      'stability', NEW."stability",
      'extraAbi', NEW."extraAbi",
      'templateId', NEW."templateId",
      'refinement', NEW."refinement",
      'modifiers', NEW."modifiers",
      'belongToPlayerId', NEW."belongToPlayerId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION player_weapon_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "player_weapon_local" WHERE "id" = OLD."id") THEN
    UPDATE "player_weapon_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "player_weapon_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'player_weapon',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER player_weapon_insert
INSTEAD OF INSERT ON "player_weapon"
FOR EACH ROW EXECUTE FUNCTION player_weapon_insert_trigger();

CREATE OR REPLACE TRIGGER player_weapon_update
INSTEAD OF UPDATE ON "player_weapon"
FOR EACH ROW EXECUTE FUNCTION player_weapon_update_trigger();

CREATE OR REPLACE TRIGGER player_weapon_delete
INSTEAD OF DELETE ON "player_weapon"
FOR EACH ROW EXECUTE FUNCTION player_weapon_delete_trigger();


CREATE OR REPLACE FUNCTION player_weapon_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "player_weapon_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION player_weapon_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "player_weapon_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "player_weapon_synced"
FOR EACH ROW EXECUTE FUNCTION player_weapon_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "player_weapon_synced"
FOR EACH ROW EXECUTE FUNCTION player_weapon_delete_local_on_synced_delete_trigger();

-- CreateTable
-- player_armor
CREATE TABLE IF NOT EXISTS "player_armor_synced" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "baseAbi" INTEGER NOT NULL,
  "extraAbi" INTEGER NOT NULL,
  "ability" "PlayerArmorAbilityType" NOT NULL,
  "templateId" TEXT,
  "refinement" INTEGER NOT NULL,
  "modifiers" TEXT[],
  "belongToPlayerId" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "player_armor_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "player_armor_local" (
  "id" TEXT,
  "name" TEXT,
  "baseAbi" INTEGER,
  "extraAbi" INTEGER,
  "ability" "PlayerArmorAbilityType",
  "templateId" TEXT,
  "refinement" INTEGER,
  "modifiers" TEXT[],
  "belongToPlayerId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "player_armor_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "player_armor" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'name' = ANY(local.changed_columns)
      THEN local."name"
      ELSE synced."name"
    END AS "name",
   CASE
    WHEN 'baseAbi' = ANY(local.changed_columns)
      THEN local."baseAbi"
      ELSE synced."baseAbi"
    END AS "baseAbi",
   CASE
    WHEN 'extraAbi' = ANY(local.changed_columns)
      THEN local."extraAbi"
      ELSE synced."extraAbi"
    END AS "extraAbi",
   CASE
    WHEN 'ability' = ANY(local.changed_columns)
      THEN local."ability"
      ELSE synced."ability"
    END AS "ability",
   CASE
    WHEN 'templateId' = ANY(local.changed_columns)
      THEN local."templateId"
      ELSE synced."templateId"
    END AS "templateId",
   CASE
    WHEN 'refinement' = ANY(local.changed_columns)
      THEN local."refinement"
      ELSE synced."refinement"
    END AS "refinement",
   CASE
    WHEN 'modifiers' = ANY(local.changed_columns)
      THEN local."modifiers"
      ELSE synced."modifiers"
    END AS "modifiers",
   CASE
    WHEN 'belongToPlayerId' = ANY(local.changed_columns)
      THEN local."belongToPlayerId"
      ELSE synced."belongToPlayerId"
    END AS "belongToPlayerId"
  FROM "player_armor_synced" AS synced
  FULL OUTER JOIN "player_armor_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION player_armor_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "player_armor_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "player_armor_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'name');
    changed_cols := array_append(changed_cols, 'baseAbi');
    changed_cols := array_append(changed_cols, 'extraAbi');
    changed_cols := array_append(changed_cols, 'ability');
    changed_cols := array_append(changed_cols, 'templateId');
    changed_cols := array_append(changed_cols, 'refinement');
    changed_cols := array_append(changed_cols, 'modifiers');
    changed_cols := array_append(changed_cols, 'belongToPlayerId');

    INSERT INTO "player_armor_local" (
    "id", "name", "baseAbi", "extraAbi", "ability", "templateId", "refinement", "modifiers", "belongToPlayerId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."name", NEW."baseAbi", NEW."extraAbi", NEW."ability", NEW."templateId", NEW."refinement", NEW."modifiers", NEW."belongToPlayerId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'player_armor',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'baseAbi', NEW."baseAbi",
      'extraAbi', NEW."extraAbi",
      'ability', NEW."ability",
      'templateId', NEW."templateId",
      'refinement', NEW."refinement",
      'modifiers', NEW."modifiers",
      'belongToPlayerId', NEW."belongToPlayerId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION player_armor_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "player_armor_synced"%ROWTYPE;
    local "player_armor_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "player_armor_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "player_armor_local" WHERE "id" = NEW."id";
    
    IF NEW."name" IS DISTINCT FROM synced."name" THEN
      changed_cols := array_append(changed_cols, 'name');
    END IF;
    IF NEW."baseAbi" IS DISTINCT FROM synced."baseAbi" THEN
      changed_cols := array_append(changed_cols, 'baseAbi');
    END IF;
    IF NEW."extraAbi" IS DISTINCT FROM synced."extraAbi" THEN
      changed_cols := array_append(changed_cols, 'extraAbi');
    END IF;
    IF NEW."ability" IS DISTINCT FROM synced."ability" THEN
      changed_cols := array_append(changed_cols, 'ability');
    END IF;
    IF NEW."templateId" IS DISTINCT FROM synced."templateId" THEN
      changed_cols := array_append(changed_cols, 'templateId');
    END IF;
    IF NEW."refinement" IS DISTINCT FROM synced."refinement" THEN
      changed_cols := array_append(changed_cols, 'refinement');
    END IF;
    IF NEW."modifiers" IS DISTINCT FROM synced."modifiers" THEN
      changed_cols := array_append(changed_cols, 'modifiers');
    END IF;
    IF NEW."belongToPlayerId" IS DISTINCT FROM synced."belongToPlayerId" THEN
      changed_cols := array_append(changed_cols, 'belongToPlayerId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "player_armor_local" (
        "id", "name", "baseAbi", "extraAbi", "ability", "templateId", "refinement", "modifiers", "belongToPlayerId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."name", NEW."baseAbi", NEW."extraAbi", NEW."ability", NEW."templateId", NEW."refinement", NEW."modifiers", NEW."belongToPlayerId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "player_armor_local"
    SET
        
    "name" = NEW."name",
    "baseAbi" = NEW."baseAbi",
    "extraAbi" = NEW."extraAbi",
    "ability" = NEW."ability",
    "templateId" = NEW."templateId",
    "refinement" = NEW."refinement",
    "modifiers" = NEW."modifiers",
    "belongToPlayerId" = NEW."belongToPlayerId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'player_armor',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'baseAbi', NEW."baseAbi",
      'extraAbi', NEW."extraAbi",
      'ability', NEW."ability",
      'templateId', NEW."templateId",
      'refinement', NEW."refinement",
      'modifiers', NEW."modifiers",
      'belongToPlayerId', NEW."belongToPlayerId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION player_armor_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "player_armor_local" WHERE "id" = OLD."id") THEN
    UPDATE "player_armor_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "player_armor_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'player_armor',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER player_armor_insert
INSTEAD OF INSERT ON "player_armor"
FOR EACH ROW EXECUTE FUNCTION player_armor_insert_trigger();

CREATE OR REPLACE TRIGGER player_armor_update
INSTEAD OF UPDATE ON "player_armor"
FOR EACH ROW EXECUTE FUNCTION player_armor_update_trigger();

CREATE OR REPLACE TRIGGER player_armor_delete
INSTEAD OF DELETE ON "player_armor"
FOR EACH ROW EXECUTE FUNCTION player_armor_delete_trigger();


CREATE OR REPLACE FUNCTION player_armor_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "player_armor_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION player_armor_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "player_armor_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "player_armor_synced"
FOR EACH ROW EXECUTE FUNCTION player_armor_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "player_armor_synced"
FOR EACH ROW EXECUTE FUNCTION player_armor_delete_local_on_synced_delete_trigger();

-- CreateTable
-- player_option
CREATE TABLE IF NOT EXISTS "player_option_synced" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "baseAbi" INTEGER NOT NULL,
  "extraAbi" INTEGER NOT NULL,
  "templateId" TEXT,
  "refinement" INTEGER NOT NULL,
  "modifiers" TEXT[],
  "belongToPlayerId" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "player_option_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "player_option_local" (
  "id" TEXT,
  "name" TEXT,
  "baseAbi" INTEGER,
  "extraAbi" INTEGER,
  "templateId" TEXT,
  "refinement" INTEGER,
  "modifiers" TEXT[],
  "belongToPlayerId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "player_option_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "player_option" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'name' = ANY(local.changed_columns)
      THEN local."name"
      ELSE synced."name"
    END AS "name",
   CASE
    WHEN 'baseAbi' = ANY(local.changed_columns)
      THEN local."baseAbi"
      ELSE synced."baseAbi"
    END AS "baseAbi",
   CASE
    WHEN 'extraAbi' = ANY(local.changed_columns)
      THEN local."extraAbi"
      ELSE synced."extraAbi"
    END AS "extraAbi",
   CASE
    WHEN 'templateId' = ANY(local.changed_columns)
      THEN local."templateId"
      ELSE synced."templateId"
    END AS "templateId",
   CASE
    WHEN 'refinement' = ANY(local.changed_columns)
      THEN local."refinement"
      ELSE synced."refinement"
    END AS "refinement",
   CASE
    WHEN 'modifiers' = ANY(local.changed_columns)
      THEN local."modifiers"
      ELSE synced."modifiers"
    END AS "modifiers",
   CASE
    WHEN 'belongToPlayerId' = ANY(local.changed_columns)
      THEN local."belongToPlayerId"
      ELSE synced."belongToPlayerId"
    END AS "belongToPlayerId"
  FROM "player_option_synced" AS synced
  FULL OUTER JOIN "player_option_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION player_option_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "player_option_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "player_option_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'name');
    changed_cols := array_append(changed_cols, 'baseAbi');
    changed_cols := array_append(changed_cols, 'extraAbi');
    changed_cols := array_append(changed_cols, 'templateId');
    changed_cols := array_append(changed_cols, 'refinement');
    changed_cols := array_append(changed_cols, 'modifiers');
    changed_cols := array_append(changed_cols, 'belongToPlayerId');

    INSERT INTO "player_option_local" (
    "id", "name", "baseAbi", "extraAbi", "templateId", "refinement", "modifiers", "belongToPlayerId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."name", NEW."baseAbi", NEW."extraAbi", NEW."templateId", NEW."refinement", NEW."modifiers", NEW."belongToPlayerId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'player_option',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'baseAbi', NEW."baseAbi",
      'extraAbi', NEW."extraAbi",
      'templateId', NEW."templateId",
      'refinement', NEW."refinement",
      'modifiers', NEW."modifiers",
      'belongToPlayerId', NEW."belongToPlayerId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION player_option_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "player_option_synced"%ROWTYPE;
    local "player_option_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "player_option_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "player_option_local" WHERE "id" = NEW."id";
    
    IF NEW."name" IS DISTINCT FROM synced."name" THEN
      changed_cols := array_append(changed_cols, 'name');
    END IF;
    IF NEW."baseAbi" IS DISTINCT FROM synced."baseAbi" THEN
      changed_cols := array_append(changed_cols, 'baseAbi');
    END IF;
    IF NEW."extraAbi" IS DISTINCT FROM synced."extraAbi" THEN
      changed_cols := array_append(changed_cols, 'extraAbi');
    END IF;
    IF NEW."templateId" IS DISTINCT FROM synced."templateId" THEN
      changed_cols := array_append(changed_cols, 'templateId');
    END IF;
    IF NEW."refinement" IS DISTINCT FROM synced."refinement" THEN
      changed_cols := array_append(changed_cols, 'refinement');
    END IF;
    IF NEW."modifiers" IS DISTINCT FROM synced."modifiers" THEN
      changed_cols := array_append(changed_cols, 'modifiers');
    END IF;
    IF NEW."belongToPlayerId" IS DISTINCT FROM synced."belongToPlayerId" THEN
      changed_cols := array_append(changed_cols, 'belongToPlayerId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "player_option_local" (
        "id", "name", "baseAbi", "extraAbi", "templateId", "refinement", "modifiers", "belongToPlayerId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."name", NEW."baseAbi", NEW."extraAbi", NEW."templateId", NEW."refinement", NEW."modifiers", NEW."belongToPlayerId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "player_option_local"
    SET
        
    "name" = NEW."name",
    "baseAbi" = NEW."baseAbi",
    "extraAbi" = NEW."extraAbi",
    "templateId" = NEW."templateId",
    "refinement" = NEW."refinement",
    "modifiers" = NEW."modifiers",
    "belongToPlayerId" = NEW."belongToPlayerId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'player_option',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'baseAbi', NEW."baseAbi",
      'extraAbi', NEW."extraAbi",
      'templateId', NEW."templateId",
      'refinement', NEW."refinement",
      'modifiers', NEW."modifiers",
      'belongToPlayerId', NEW."belongToPlayerId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION player_option_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "player_option_local" WHERE "id" = OLD."id") THEN
    UPDATE "player_option_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "player_option_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'player_option',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER player_option_insert
INSTEAD OF INSERT ON "player_option"
FOR EACH ROW EXECUTE FUNCTION player_option_insert_trigger();

CREATE OR REPLACE TRIGGER player_option_update
INSTEAD OF UPDATE ON "player_option"
FOR EACH ROW EXECUTE FUNCTION player_option_update_trigger();

CREATE OR REPLACE TRIGGER player_option_delete
INSTEAD OF DELETE ON "player_option"
FOR EACH ROW EXECUTE FUNCTION player_option_delete_trigger();


CREATE OR REPLACE FUNCTION player_option_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "player_option_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION player_option_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "player_option_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "player_option_synced"
FOR EACH ROW EXECUTE FUNCTION player_option_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "player_option_synced"
FOR EACH ROW EXECUTE FUNCTION player_option_delete_local_on_synced_delete_trigger();

-- CreateTable
-- player_special
CREATE TABLE IF NOT EXISTS "player_special_synced" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "baseAbi" INTEGER NOT NULL,
  "extraAbi" INTEGER NOT NULL,
  "templateId" TEXT,
  "modifiers" TEXT[],
  "belongToPlayerId" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "player_special_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "player_special_local" (
  "id" TEXT,
  "name" TEXT,
  "baseAbi" INTEGER,
  "extraAbi" INTEGER,
  "templateId" TEXT,
  "modifiers" TEXT[],
  "belongToPlayerId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "player_special_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "player_special" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'name' = ANY(local.changed_columns)
      THEN local."name"
      ELSE synced."name"
    END AS "name",
   CASE
    WHEN 'baseAbi' = ANY(local.changed_columns)
      THEN local."baseAbi"
      ELSE synced."baseAbi"
    END AS "baseAbi",
   CASE
    WHEN 'extraAbi' = ANY(local.changed_columns)
      THEN local."extraAbi"
      ELSE synced."extraAbi"
    END AS "extraAbi",
   CASE
    WHEN 'templateId' = ANY(local.changed_columns)
      THEN local."templateId"
      ELSE synced."templateId"
    END AS "templateId",
   CASE
    WHEN 'modifiers' = ANY(local.changed_columns)
      THEN local."modifiers"
      ELSE synced."modifiers"
    END AS "modifiers",
   CASE
    WHEN 'belongToPlayerId' = ANY(local.changed_columns)
      THEN local."belongToPlayerId"
      ELSE synced."belongToPlayerId"
    END AS "belongToPlayerId"
  FROM "player_special_synced" AS synced
  FULL OUTER JOIN "player_special_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION player_special_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "player_special_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "player_special_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'name');
    changed_cols := array_append(changed_cols, 'baseAbi');
    changed_cols := array_append(changed_cols, 'extraAbi');
    changed_cols := array_append(changed_cols, 'templateId');
    changed_cols := array_append(changed_cols, 'modifiers');
    changed_cols := array_append(changed_cols, 'belongToPlayerId');

    INSERT INTO "player_special_local" (
    "id", "name", "baseAbi", "extraAbi", "templateId", "modifiers", "belongToPlayerId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."name", NEW."baseAbi", NEW."extraAbi", NEW."templateId", NEW."modifiers", NEW."belongToPlayerId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'player_special',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'baseAbi', NEW."baseAbi",
      'extraAbi', NEW."extraAbi",
      'templateId', NEW."templateId",
      'modifiers', NEW."modifiers",
      'belongToPlayerId', NEW."belongToPlayerId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION player_special_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "player_special_synced"%ROWTYPE;
    local "player_special_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "player_special_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "player_special_local" WHERE "id" = NEW."id";
    
    IF NEW."name" IS DISTINCT FROM synced."name" THEN
      changed_cols := array_append(changed_cols, 'name');
    END IF;
    IF NEW."baseAbi" IS DISTINCT FROM synced."baseAbi" THEN
      changed_cols := array_append(changed_cols, 'baseAbi');
    END IF;
    IF NEW."extraAbi" IS DISTINCT FROM synced."extraAbi" THEN
      changed_cols := array_append(changed_cols, 'extraAbi');
    END IF;
    IF NEW."templateId" IS DISTINCT FROM synced."templateId" THEN
      changed_cols := array_append(changed_cols, 'templateId');
    END IF;
    IF NEW."modifiers" IS DISTINCT FROM synced."modifiers" THEN
      changed_cols := array_append(changed_cols, 'modifiers');
    END IF;
    IF NEW."belongToPlayerId" IS DISTINCT FROM synced."belongToPlayerId" THEN
      changed_cols := array_append(changed_cols, 'belongToPlayerId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "player_special_local" (
        "id", "name", "baseAbi", "extraAbi", "templateId", "modifiers", "belongToPlayerId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."name", NEW."baseAbi", NEW."extraAbi", NEW."templateId", NEW."modifiers", NEW."belongToPlayerId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "player_special_local"
    SET
        
    "name" = NEW."name",
    "baseAbi" = NEW."baseAbi",
    "extraAbi" = NEW."extraAbi",
    "templateId" = NEW."templateId",
    "modifiers" = NEW."modifiers",
    "belongToPlayerId" = NEW."belongToPlayerId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'player_special',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'baseAbi', NEW."baseAbi",
      'extraAbi', NEW."extraAbi",
      'templateId', NEW."templateId",
      'modifiers', NEW."modifiers",
      'belongToPlayerId', NEW."belongToPlayerId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION player_special_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "player_special_local" WHERE "id" = OLD."id") THEN
    UPDATE "player_special_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "player_special_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'player_special',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER player_special_insert
INSTEAD OF INSERT ON "player_special"
FOR EACH ROW EXECUTE FUNCTION player_special_insert_trigger();

CREATE OR REPLACE TRIGGER player_special_update
INSTEAD OF UPDATE ON "player_special"
FOR EACH ROW EXECUTE FUNCTION player_special_update_trigger();

CREATE OR REPLACE TRIGGER player_special_delete
INSTEAD OF DELETE ON "player_special"
FOR EACH ROW EXECUTE FUNCTION player_special_delete_trigger();


CREATE OR REPLACE FUNCTION player_special_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "player_special_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION player_special_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "player_special_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "player_special_synced"
FOR EACH ROW EXECUTE FUNCTION player_special_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "player_special_synced"
FOR EACH ROW EXECUTE FUNCTION player_special_delete_local_on_synced_delete_trigger();

-- CreateTable
-- player_pet
CREATE TABLE IF NOT EXISTS "player_pet_synced" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
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
  "weaponType" "MainWeaponType" NOT NULL,
  "personaType" "PetPersonaType" NOT NULL,
  "type" "PetType" NOT NULL,
  "weaponAtk" INTEGER NOT NULL,
  "generation" INTEGER NOT NULL,
  "maxLv" INTEGER NOT NULL,
  "belongToPlayerId" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "player_pet_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "player_pet_local" (
  "id" TEXT,
  "templateId" TEXT,
  "name" TEXT,
  "pStr" INTEGER,
  "pInt" INTEGER,
  "pVit" INTEGER,
  "pAgi" INTEGER,
  "pDex" INTEGER,
  "str" INTEGER,
  "int" INTEGER,
  "vit" INTEGER,
  "agi" INTEGER,
  "dex" INTEGER,
  "weaponType" "MainWeaponType",
  "personaType" "PetPersonaType",
  "type" "PetType",
  "weaponAtk" INTEGER,
  "generation" INTEGER,
  "maxLv" INTEGER,
  "belongToPlayerId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "player_pet_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "player_pet" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'templateId' = ANY(local.changed_columns)
      THEN local."templateId"
      ELSE synced."templateId"
    END AS "templateId",
   CASE
    WHEN 'name' = ANY(local.changed_columns)
      THEN local."name"
      ELSE synced."name"
    END AS "name",
   CASE
    WHEN 'pStr' = ANY(local.changed_columns)
      THEN local."pStr"
      ELSE synced."pStr"
    END AS "pStr",
   CASE
    WHEN 'pInt' = ANY(local.changed_columns)
      THEN local."pInt"
      ELSE synced."pInt"
    END AS "pInt",
   CASE
    WHEN 'pVit' = ANY(local.changed_columns)
      THEN local."pVit"
      ELSE synced."pVit"
    END AS "pVit",
   CASE
    WHEN 'pAgi' = ANY(local.changed_columns)
      THEN local."pAgi"
      ELSE synced."pAgi"
    END AS "pAgi",
   CASE
    WHEN 'pDex' = ANY(local.changed_columns)
      THEN local."pDex"
      ELSE synced."pDex"
    END AS "pDex",
   CASE
    WHEN 'str' = ANY(local.changed_columns)
      THEN local."str"
      ELSE synced."str"
    END AS "str",
   CASE
    WHEN 'int' = ANY(local.changed_columns)
      THEN local."int"
      ELSE synced."int"
    END AS "int",
   CASE
    WHEN 'vit' = ANY(local.changed_columns)
      THEN local."vit"
      ELSE synced."vit"
    END AS "vit",
   CASE
    WHEN 'agi' = ANY(local.changed_columns)
      THEN local."agi"
      ELSE synced."agi"
    END AS "agi",
   CASE
    WHEN 'dex' = ANY(local.changed_columns)
      THEN local."dex"
      ELSE synced."dex"
    END AS "dex",
   CASE
    WHEN 'weaponType' = ANY(local.changed_columns)
      THEN local."weaponType"
      ELSE synced."weaponType"
    END AS "weaponType",
   CASE
    WHEN 'personaType' = ANY(local.changed_columns)
      THEN local."personaType"
      ELSE synced."personaType"
    END AS "personaType",
   CASE
    WHEN 'type' = ANY(local.changed_columns)
      THEN local."type"
      ELSE synced."type"
    END AS "type",
   CASE
    WHEN 'weaponAtk' = ANY(local.changed_columns)
      THEN local."weaponAtk"
      ELSE synced."weaponAtk"
    END AS "weaponAtk",
   CASE
    WHEN 'generation' = ANY(local.changed_columns)
      THEN local."generation"
      ELSE synced."generation"
    END AS "generation",
   CASE
    WHEN 'maxLv' = ANY(local.changed_columns)
      THEN local."maxLv"
      ELSE synced."maxLv"
    END AS "maxLv",
   CASE
    WHEN 'belongToPlayerId' = ANY(local.changed_columns)
      THEN local."belongToPlayerId"
      ELSE synced."belongToPlayerId"
    END AS "belongToPlayerId"
  FROM "player_pet_synced" AS synced
  FULL OUTER JOIN "player_pet_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION player_pet_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "player_pet_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "player_pet_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'templateId');
    changed_cols := array_append(changed_cols, 'name');
    changed_cols := array_append(changed_cols, 'pStr');
    changed_cols := array_append(changed_cols, 'pInt');
    changed_cols := array_append(changed_cols, 'pVit');
    changed_cols := array_append(changed_cols, 'pAgi');
    changed_cols := array_append(changed_cols, 'pDex');
    changed_cols := array_append(changed_cols, 'str');
    changed_cols := array_append(changed_cols, 'int');
    changed_cols := array_append(changed_cols, 'vit');
    changed_cols := array_append(changed_cols, 'agi');
    changed_cols := array_append(changed_cols, 'dex');
    changed_cols := array_append(changed_cols, 'weaponType');
    changed_cols := array_append(changed_cols, 'personaType');
    changed_cols := array_append(changed_cols, 'type');
    changed_cols := array_append(changed_cols, 'weaponAtk');
    changed_cols := array_append(changed_cols, 'generation');
    changed_cols := array_append(changed_cols, 'maxLv');
    changed_cols := array_append(changed_cols, 'belongToPlayerId');

    INSERT INTO "player_pet_local" (
    "id", "templateId", "name", "pStr", "pInt", "pVit", "pAgi", "pDex", "str", "int", "vit", "agi", "dex", "weaponType", "personaType", "type", "weaponAtk", "generation", "maxLv", "belongToPlayerId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."templateId", NEW."name", NEW."pStr", NEW."pInt", NEW."pVit", NEW."pAgi", NEW."pDex", NEW."str", NEW."int", NEW."vit", NEW."agi", NEW."dex", NEW."weaponType", NEW."personaType", NEW."type", NEW."weaponAtk", NEW."generation", NEW."maxLv", NEW."belongToPlayerId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'player_pet',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'templateId', NEW."templateId",
      'name', NEW."name",
      'pStr', NEW."pStr",
      'pInt', NEW."pInt",
      'pVit', NEW."pVit",
      'pAgi', NEW."pAgi",
      'pDex', NEW."pDex",
      'str', NEW."str",
      'int', NEW."int",
      'vit', NEW."vit",
      'agi', NEW."agi",
      'dex', NEW."dex",
      'weaponType', NEW."weaponType",
      'personaType', NEW."personaType",
      'type', NEW."type",
      'weaponAtk', NEW."weaponAtk",
      'generation', NEW."generation",
      'maxLv', NEW."maxLv",
      'belongToPlayerId', NEW."belongToPlayerId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION player_pet_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "player_pet_synced"%ROWTYPE;
    local "player_pet_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "player_pet_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "player_pet_local" WHERE "id" = NEW."id";
    
    IF NEW."templateId" IS DISTINCT FROM synced."templateId" THEN
      changed_cols := array_append(changed_cols, 'templateId');
    END IF;
    IF NEW."name" IS DISTINCT FROM synced."name" THEN
      changed_cols := array_append(changed_cols, 'name');
    END IF;
    IF NEW."pStr" IS DISTINCT FROM synced."pStr" THEN
      changed_cols := array_append(changed_cols, 'pStr');
    END IF;
    IF NEW."pInt" IS DISTINCT FROM synced."pInt" THEN
      changed_cols := array_append(changed_cols, 'pInt');
    END IF;
    IF NEW."pVit" IS DISTINCT FROM synced."pVit" THEN
      changed_cols := array_append(changed_cols, 'pVit');
    END IF;
    IF NEW."pAgi" IS DISTINCT FROM synced."pAgi" THEN
      changed_cols := array_append(changed_cols, 'pAgi');
    END IF;
    IF NEW."pDex" IS DISTINCT FROM synced."pDex" THEN
      changed_cols := array_append(changed_cols, 'pDex');
    END IF;
    IF NEW."str" IS DISTINCT FROM synced."str" THEN
      changed_cols := array_append(changed_cols, 'str');
    END IF;
    IF NEW."int" IS DISTINCT FROM synced."int" THEN
      changed_cols := array_append(changed_cols, 'int');
    END IF;
    IF NEW."vit" IS DISTINCT FROM synced."vit" THEN
      changed_cols := array_append(changed_cols, 'vit');
    END IF;
    IF NEW."agi" IS DISTINCT FROM synced."agi" THEN
      changed_cols := array_append(changed_cols, 'agi');
    END IF;
    IF NEW."dex" IS DISTINCT FROM synced."dex" THEN
      changed_cols := array_append(changed_cols, 'dex');
    END IF;
    IF NEW."weaponType" IS DISTINCT FROM synced."weaponType" THEN
      changed_cols := array_append(changed_cols, 'weaponType');
    END IF;
    IF NEW."personaType" IS DISTINCT FROM synced."personaType" THEN
      changed_cols := array_append(changed_cols, 'personaType');
    END IF;
    IF NEW."type" IS DISTINCT FROM synced."type" THEN
      changed_cols := array_append(changed_cols, 'type');
    END IF;
    IF NEW."weaponAtk" IS DISTINCT FROM synced."weaponAtk" THEN
      changed_cols := array_append(changed_cols, 'weaponAtk');
    END IF;
    IF NEW."generation" IS DISTINCT FROM synced."generation" THEN
      changed_cols := array_append(changed_cols, 'generation');
    END IF;
    IF NEW."maxLv" IS DISTINCT FROM synced."maxLv" THEN
      changed_cols := array_append(changed_cols, 'maxLv');
    END IF;
    IF NEW."belongToPlayerId" IS DISTINCT FROM synced."belongToPlayerId" THEN
      changed_cols := array_append(changed_cols, 'belongToPlayerId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "player_pet_local" (
        "id", "templateId", "name", "pStr", "pInt", "pVit", "pAgi", "pDex", "str", "int", "vit", "agi", "dex", "weaponType", "personaType", "type", "weaponAtk", "generation", "maxLv", "belongToPlayerId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."templateId", NEW."name", NEW."pStr", NEW."pInt", NEW."pVit", NEW."pAgi", NEW."pDex", NEW."str", NEW."int", NEW."vit", NEW."agi", NEW."dex", NEW."weaponType", NEW."personaType", NEW."type", NEW."weaponAtk", NEW."generation", NEW."maxLv", NEW."belongToPlayerId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "player_pet_local"
    SET
        
    "templateId" = NEW."templateId",
    "name" = NEW."name",
    "pStr" = NEW."pStr",
    "pInt" = NEW."pInt",
    "pVit" = NEW."pVit",
    "pAgi" = NEW."pAgi",
    "pDex" = NEW."pDex",
    "str" = NEW."str",
    "int" = NEW."int",
    "vit" = NEW."vit",
    "agi" = NEW."agi",
    "dex" = NEW."dex",
    "weaponType" = NEW."weaponType",
    "personaType" = NEW."personaType",
    "type" = NEW."type",
    "weaponAtk" = NEW."weaponAtk",
    "generation" = NEW."generation",
    "maxLv" = NEW."maxLv",
    "belongToPlayerId" = NEW."belongToPlayerId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'player_pet',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'templateId', NEW."templateId",
      'name', NEW."name",
      'pStr', NEW."pStr",
      'pInt', NEW."pInt",
      'pVit', NEW."pVit",
      'pAgi', NEW."pAgi",
      'pDex', NEW."pDex",
      'str', NEW."str",
      'int', NEW."int",
      'vit', NEW."vit",
      'agi', NEW."agi",
      'dex', NEW."dex",
      'weaponType', NEW."weaponType",
      'personaType', NEW."personaType",
      'type', NEW."type",
      'weaponAtk', NEW."weaponAtk",
      'generation', NEW."generation",
      'maxLv', NEW."maxLv",
      'belongToPlayerId', NEW."belongToPlayerId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION player_pet_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "player_pet_local" WHERE "id" = OLD."id") THEN
    UPDATE "player_pet_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "player_pet_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'player_pet',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER player_pet_insert
INSTEAD OF INSERT ON "player_pet"
FOR EACH ROW EXECUTE FUNCTION player_pet_insert_trigger();

CREATE OR REPLACE TRIGGER player_pet_update
INSTEAD OF UPDATE ON "player_pet"
FOR EACH ROW EXECUTE FUNCTION player_pet_update_trigger();

CREATE OR REPLACE TRIGGER player_pet_delete
INSTEAD OF DELETE ON "player_pet"
FOR EACH ROW EXECUTE FUNCTION player_pet_delete_trigger();


CREATE OR REPLACE FUNCTION player_pet_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "player_pet_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION player_pet_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "player_pet_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "player_pet_synced"
FOR EACH ROW EXECUTE FUNCTION player_pet_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "player_pet_synced"
FOR EACH ROW EXECUTE FUNCTION player_pet_delete_local_on_synced_delete_trigger();

-- CreateTable
-- avatar
CREATE TABLE IF NOT EXISTS "avatar_synced" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "AvatarType" NOT NULL,
  "modifiers" TEXT[],
  "belongToPlayerId" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "avatar_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "avatar_local" (
  "id" TEXT,
  "name" TEXT,
  "type" "AvatarType",
  "modifiers" TEXT[],
  "belongToPlayerId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "avatar_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "avatar" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'name' = ANY(local.changed_columns)
      THEN local."name"
      ELSE synced."name"
    END AS "name",
   CASE
    WHEN 'type' = ANY(local.changed_columns)
      THEN local."type"
      ELSE synced."type"
    END AS "type",
   CASE
    WHEN 'modifiers' = ANY(local.changed_columns)
      THEN local."modifiers"
      ELSE synced."modifiers"
    END AS "modifiers",
   CASE
    WHEN 'belongToPlayerId' = ANY(local.changed_columns)
      THEN local."belongToPlayerId"
      ELSE synced."belongToPlayerId"
    END AS "belongToPlayerId"
  FROM "avatar_synced" AS synced
  FULL OUTER JOIN "avatar_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION avatar_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "avatar_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "avatar_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'name');
    changed_cols := array_append(changed_cols, 'type');
    changed_cols := array_append(changed_cols, 'modifiers');
    changed_cols := array_append(changed_cols, 'belongToPlayerId');

    INSERT INTO "avatar_local" (
    "id", "name", "type", "modifiers", "belongToPlayerId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."name", NEW."type", NEW."modifiers", NEW."belongToPlayerId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'avatar',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'type', NEW."type",
      'modifiers', NEW."modifiers",
      'belongToPlayerId', NEW."belongToPlayerId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION avatar_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "avatar_synced"%ROWTYPE;
    local "avatar_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "avatar_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "avatar_local" WHERE "id" = NEW."id";
    
    IF NEW."name" IS DISTINCT FROM synced."name" THEN
      changed_cols := array_append(changed_cols, 'name');
    END IF;
    IF NEW."type" IS DISTINCT FROM synced."type" THEN
      changed_cols := array_append(changed_cols, 'type');
    END IF;
    IF NEW."modifiers" IS DISTINCT FROM synced."modifiers" THEN
      changed_cols := array_append(changed_cols, 'modifiers');
    END IF;
    IF NEW."belongToPlayerId" IS DISTINCT FROM synced."belongToPlayerId" THEN
      changed_cols := array_append(changed_cols, 'belongToPlayerId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "avatar_local" (
        "id", "name", "type", "modifiers", "belongToPlayerId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."name", NEW."type", NEW."modifiers", NEW."belongToPlayerId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "avatar_local"
    SET
        
    "name" = NEW."name",
    "type" = NEW."type",
    "modifiers" = NEW."modifiers",
    "belongToPlayerId" = NEW."belongToPlayerId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'avatar',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'type', NEW."type",
      'modifiers', NEW."modifiers",
      'belongToPlayerId', NEW."belongToPlayerId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION avatar_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "avatar_local" WHERE "id" = OLD."id") THEN
    UPDATE "avatar_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "avatar_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'avatar',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER avatar_insert
INSTEAD OF INSERT ON "avatar"
FOR EACH ROW EXECUTE FUNCTION avatar_insert_trigger();

CREATE OR REPLACE TRIGGER avatar_update
INSTEAD OF UPDATE ON "avatar"
FOR EACH ROW EXECUTE FUNCTION avatar_update_trigger();

CREATE OR REPLACE TRIGGER avatar_delete
INSTEAD OF DELETE ON "avatar"
FOR EACH ROW EXECUTE FUNCTION avatar_delete_trigger();


CREATE OR REPLACE FUNCTION avatar_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "avatar_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION avatar_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "avatar_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "avatar_synced"
FOR EACH ROW EXECUTE FUNCTION avatar_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "avatar_synced"
FOR EACH ROW EXECUTE FUNCTION avatar_delete_local_on_synced_delete_trigger();

-- CreateTable
-- character
CREATE TABLE IF NOT EXISTS "character_synced" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "lv" INTEGER NOT NULL,
  "str" INTEGER NOT NULL,
  "int" INTEGER NOT NULL,
  "vit" INTEGER NOT NULL,
  "agi" INTEGER NOT NULL,
  "dex" INTEGER NOT NULL,
  "personalityType" "CharacterPersonalityType" NOT NULL,
  "personalityValue" INTEGER NOT NULL,
  "weaponId" TEXT,
  "subWeaponId" TEXT,
  "armorId" TEXT,
  "optionId" TEXT,
  "specialId" TEXT,
  "cooking" TEXT[],
  "modifiers" TEXT[],
  "partnerSkillAId" TEXT,
  "partnerSkillAType" "PartnerSkillType" NOT NULL,
  "partnerSkillBId" TEXT,
  "partnerSkillBType" "PartnerSkillType" NOT NULL,
  "actions" JSONB NOT NULL,
  "belongToPlayerId" TEXT NOT NULL,
  "details" TEXT,
  "statisticId" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "character_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "character_local" (
  "id" TEXT,
  "name" TEXT,
  "lv" INTEGER,
  "str" INTEGER,
  "int" INTEGER,
  "vit" INTEGER,
  "agi" INTEGER,
  "dex" INTEGER,
  "personalityType" "CharacterPersonalityType",
  "personalityValue" INTEGER,
  "weaponId" TEXT,
  "subWeaponId" TEXT,
  "armorId" TEXT,
  "optionId" TEXT,
  "specialId" TEXT,
  "cooking" TEXT[],
  "modifiers" TEXT[],
  "partnerSkillAId" TEXT,
  "partnerSkillAType" "PartnerSkillType",
  "partnerSkillBId" TEXT,
  "partnerSkillBType" "PartnerSkillType",
  "actions" JSONB,
  "belongToPlayerId" TEXT,
  "details" TEXT,
  "statisticId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "character_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "character" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'name' = ANY(local.changed_columns)
      THEN local."name"
      ELSE synced."name"
    END AS "name",
   CASE
    WHEN 'lv' = ANY(local.changed_columns)
      THEN local."lv"
      ELSE synced."lv"
    END AS "lv",
   CASE
    WHEN 'str' = ANY(local.changed_columns)
      THEN local."str"
      ELSE synced."str"
    END AS "str",
   CASE
    WHEN 'int' = ANY(local.changed_columns)
      THEN local."int"
      ELSE synced."int"
    END AS "int",
   CASE
    WHEN 'vit' = ANY(local.changed_columns)
      THEN local."vit"
      ELSE synced."vit"
    END AS "vit",
   CASE
    WHEN 'agi' = ANY(local.changed_columns)
      THEN local."agi"
      ELSE synced."agi"
    END AS "agi",
   CASE
    WHEN 'dex' = ANY(local.changed_columns)
      THEN local."dex"
      ELSE synced."dex"
    END AS "dex",
   CASE
    WHEN 'personalityType' = ANY(local.changed_columns)
      THEN local."personalityType"
      ELSE synced."personalityType"
    END AS "personalityType",
   CASE
    WHEN 'personalityValue' = ANY(local.changed_columns)
      THEN local."personalityValue"
      ELSE synced."personalityValue"
    END AS "personalityValue",
   CASE
    WHEN 'weaponId' = ANY(local.changed_columns)
      THEN local."weaponId"
      ELSE synced."weaponId"
    END AS "weaponId",
   CASE
    WHEN 'subWeaponId' = ANY(local.changed_columns)
      THEN local."subWeaponId"
      ELSE synced."subWeaponId"
    END AS "subWeaponId",
   CASE
    WHEN 'armorId' = ANY(local.changed_columns)
      THEN local."armorId"
      ELSE synced."armorId"
    END AS "armorId",
   CASE
    WHEN 'optionId' = ANY(local.changed_columns)
      THEN local."optionId"
      ELSE synced."optionId"
    END AS "optionId",
   CASE
    WHEN 'specialId' = ANY(local.changed_columns)
      THEN local."specialId"
      ELSE synced."specialId"
    END AS "specialId",
   CASE
    WHEN 'cooking' = ANY(local.changed_columns)
      THEN local."cooking"
      ELSE synced."cooking"
    END AS "cooking",
   CASE
    WHEN 'modifiers' = ANY(local.changed_columns)
      THEN local."modifiers"
      ELSE synced."modifiers"
    END AS "modifiers",
   CASE
    WHEN 'partnerSkillAId' = ANY(local.changed_columns)
      THEN local."partnerSkillAId"
      ELSE synced."partnerSkillAId"
    END AS "partnerSkillAId",
   CASE
    WHEN 'partnerSkillAType' = ANY(local.changed_columns)
      THEN local."partnerSkillAType"
      ELSE synced."partnerSkillAType"
    END AS "partnerSkillAType",
   CASE
    WHEN 'partnerSkillBId' = ANY(local.changed_columns)
      THEN local."partnerSkillBId"
      ELSE synced."partnerSkillBId"
    END AS "partnerSkillBId",
   CASE
    WHEN 'partnerSkillBType' = ANY(local.changed_columns)
      THEN local."partnerSkillBType"
      ELSE synced."partnerSkillBType"
    END AS "partnerSkillBType",
   CASE
    WHEN 'actions' = ANY(local.changed_columns)
      THEN local."actions"
      ELSE synced."actions"
    END AS "actions",
   CASE
    WHEN 'belongToPlayerId' = ANY(local.changed_columns)
      THEN local."belongToPlayerId"
      ELSE synced."belongToPlayerId"
    END AS "belongToPlayerId",
   CASE
    WHEN 'details' = ANY(local.changed_columns)
      THEN local."details"
      ELSE synced."details"
    END AS "details",
   CASE
    WHEN 'statisticId' = ANY(local.changed_columns)
      THEN local."statisticId"
      ELSE synced."statisticId"
    END AS "statisticId"
  FROM "character_synced" AS synced
  FULL OUTER JOIN "character_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION character_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "character_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "character_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'name');
    changed_cols := array_append(changed_cols, 'lv');
    changed_cols := array_append(changed_cols, 'str');
    changed_cols := array_append(changed_cols, 'int');
    changed_cols := array_append(changed_cols, 'vit');
    changed_cols := array_append(changed_cols, 'agi');
    changed_cols := array_append(changed_cols, 'dex');
    changed_cols := array_append(changed_cols, 'personalityType');
    changed_cols := array_append(changed_cols, 'personalityValue');
    changed_cols := array_append(changed_cols, 'weaponId');
    changed_cols := array_append(changed_cols, 'subWeaponId');
    changed_cols := array_append(changed_cols, 'armorId');
    changed_cols := array_append(changed_cols, 'optionId');
    changed_cols := array_append(changed_cols, 'specialId');
    changed_cols := array_append(changed_cols, 'cooking');
    changed_cols := array_append(changed_cols, 'modifiers');
    changed_cols := array_append(changed_cols, 'partnerSkillAId');
    changed_cols := array_append(changed_cols, 'partnerSkillAType');
    changed_cols := array_append(changed_cols, 'partnerSkillBId');
    changed_cols := array_append(changed_cols, 'partnerSkillBType');
    changed_cols := array_append(changed_cols, 'actions');
    changed_cols := array_append(changed_cols, 'belongToPlayerId');
    changed_cols := array_append(changed_cols, 'details');
    changed_cols := array_append(changed_cols, 'statisticId');

    INSERT INTO "character_local" (
    "id", "name", "lv", "str", "int", "vit", "agi", "dex", "personalityType", "personalityValue", "weaponId", "subWeaponId", "armorId", "optionId", "specialId", "cooking", "modifiers", "partnerSkillAId", "partnerSkillAType", "partnerSkillBId", "partnerSkillBType", "actions", "belongToPlayerId", "details", "statisticId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."name", NEW."lv", NEW."str", NEW."int", NEW."vit", NEW."agi", NEW."dex", NEW."personalityType", NEW."personalityValue", NEW."weaponId", NEW."subWeaponId", NEW."armorId", NEW."optionId", NEW."specialId", NEW."cooking", NEW."modifiers", NEW."partnerSkillAId", NEW."partnerSkillAType", NEW."partnerSkillBId", NEW."partnerSkillBType", NEW."actions", NEW."belongToPlayerId", NEW."details", NEW."statisticId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'character',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'lv', NEW."lv",
      'str', NEW."str",
      'int', NEW."int",
      'vit', NEW."vit",
      'agi', NEW."agi",
      'dex', NEW."dex",
      'personalityType', NEW."personalityType",
      'personalityValue', NEW."personalityValue",
      'weaponId', NEW."weaponId",
      'subWeaponId', NEW."subWeaponId",
      'armorId', NEW."armorId",
      'optionId', NEW."optionId",
      'specialId', NEW."specialId",
      'cooking', NEW."cooking",
      'modifiers', NEW."modifiers",
      'partnerSkillAId', NEW."partnerSkillAId",
      'partnerSkillAType', NEW."partnerSkillAType",
      'partnerSkillBId', NEW."partnerSkillBId",
      'partnerSkillBType', NEW."partnerSkillBType",
      'actions', NEW."actions",
      'belongToPlayerId', NEW."belongToPlayerId",
      'details', NEW."details",
      'statisticId', NEW."statisticId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION character_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "character_synced"%ROWTYPE;
    local "character_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "character_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "character_local" WHERE "id" = NEW."id";
    
    IF NEW."name" IS DISTINCT FROM synced."name" THEN
      changed_cols := array_append(changed_cols, 'name');
    END IF;
    IF NEW."lv" IS DISTINCT FROM synced."lv" THEN
      changed_cols := array_append(changed_cols, 'lv');
    END IF;
    IF NEW."str" IS DISTINCT FROM synced."str" THEN
      changed_cols := array_append(changed_cols, 'str');
    END IF;
    IF NEW."int" IS DISTINCT FROM synced."int" THEN
      changed_cols := array_append(changed_cols, 'int');
    END IF;
    IF NEW."vit" IS DISTINCT FROM synced."vit" THEN
      changed_cols := array_append(changed_cols, 'vit');
    END IF;
    IF NEW."agi" IS DISTINCT FROM synced."agi" THEN
      changed_cols := array_append(changed_cols, 'agi');
    END IF;
    IF NEW."dex" IS DISTINCT FROM synced."dex" THEN
      changed_cols := array_append(changed_cols, 'dex');
    END IF;
    IF NEW."personalityType" IS DISTINCT FROM synced."personalityType" THEN
      changed_cols := array_append(changed_cols, 'personalityType');
    END IF;
    IF NEW."personalityValue" IS DISTINCT FROM synced."personalityValue" THEN
      changed_cols := array_append(changed_cols, 'personalityValue');
    END IF;
    IF NEW."weaponId" IS DISTINCT FROM synced."weaponId" THEN
      changed_cols := array_append(changed_cols, 'weaponId');
    END IF;
    IF NEW."subWeaponId" IS DISTINCT FROM synced."subWeaponId" THEN
      changed_cols := array_append(changed_cols, 'subWeaponId');
    END IF;
    IF NEW."armorId" IS DISTINCT FROM synced."armorId" THEN
      changed_cols := array_append(changed_cols, 'armorId');
    END IF;
    IF NEW."optionId" IS DISTINCT FROM synced."optionId" THEN
      changed_cols := array_append(changed_cols, 'optionId');
    END IF;
    IF NEW."specialId" IS DISTINCT FROM synced."specialId" THEN
      changed_cols := array_append(changed_cols, 'specialId');
    END IF;
    IF NEW."cooking" IS DISTINCT FROM synced."cooking" THEN
      changed_cols := array_append(changed_cols, 'cooking');
    END IF;
    IF NEW."modifiers" IS DISTINCT FROM synced."modifiers" THEN
      changed_cols := array_append(changed_cols, 'modifiers');
    END IF;
    IF NEW."partnerSkillAId" IS DISTINCT FROM synced."partnerSkillAId" THEN
      changed_cols := array_append(changed_cols, 'partnerSkillAId');
    END IF;
    IF NEW."partnerSkillAType" IS DISTINCT FROM synced."partnerSkillAType" THEN
      changed_cols := array_append(changed_cols, 'partnerSkillAType');
    END IF;
    IF NEW."partnerSkillBId" IS DISTINCT FROM synced."partnerSkillBId" THEN
      changed_cols := array_append(changed_cols, 'partnerSkillBId');
    END IF;
    IF NEW."partnerSkillBType" IS DISTINCT FROM synced."partnerSkillBType" THEN
      changed_cols := array_append(changed_cols, 'partnerSkillBType');
    END IF;
    IF NEW."actions" IS DISTINCT FROM synced."actions" THEN
      changed_cols := array_append(changed_cols, 'actions');
    END IF;
    IF NEW."belongToPlayerId" IS DISTINCT FROM synced."belongToPlayerId" THEN
      changed_cols := array_append(changed_cols, 'belongToPlayerId');
    END IF;
    IF NEW."details" IS DISTINCT FROM synced."details" THEN
      changed_cols := array_append(changed_cols, 'details');
    END IF;
    IF NEW."statisticId" IS DISTINCT FROM synced."statisticId" THEN
      changed_cols := array_append(changed_cols, 'statisticId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "character_local" (
        "id", "name", "lv", "str", "int", "vit", "agi", "dex", "personalityType", "personalityValue", "weaponId", "subWeaponId", "armorId", "optionId", "specialId", "cooking", "modifiers", "partnerSkillAId", "partnerSkillAType", "partnerSkillBId", "partnerSkillBType", "actions", "belongToPlayerId", "details", "statisticId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."name", NEW."lv", NEW."str", NEW."int", NEW."vit", NEW."agi", NEW."dex", NEW."personalityType", NEW."personalityValue", NEW."weaponId", NEW."subWeaponId", NEW."armorId", NEW."optionId", NEW."specialId", NEW."cooking", NEW."modifiers", NEW."partnerSkillAId", NEW."partnerSkillAType", NEW."partnerSkillBId", NEW."partnerSkillBType", NEW."actions", NEW."belongToPlayerId", NEW."details", NEW."statisticId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "character_local"
    SET
        
    "name" = NEW."name",
    "lv" = NEW."lv",
    "str" = NEW."str",
    "int" = NEW."int",
    "vit" = NEW."vit",
    "agi" = NEW."agi",
    "dex" = NEW."dex",
    "personalityType" = NEW."personalityType",
    "personalityValue" = NEW."personalityValue",
    "weaponId" = NEW."weaponId",
    "subWeaponId" = NEW."subWeaponId",
    "armorId" = NEW."armorId",
    "optionId" = NEW."optionId",
    "specialId" = NEW."specialId",
    "cooking" = NEW."cooking",
    "modifiers" = NEW."modifiers",
    "partnerSkillAId" = NEW."partnerSkillAId",
    "partnerSkillAType" = NEW."partnerSkillAType",
    "partnerSkillBId" = NEW."partnerSkillBId",
    "partnerSkillBType" = NEW."partnerSkillBType",
    "actions" = NEW."actions",
    "belongToPlayerId" = NEW."belongToPlayerId",
    "details" = NEW."details",
    "statisticId" = NEW."statisticId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'character',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'lv', NEW."lv",
      'str', NEW."str",
      'int', NEW."int",
      'vit', NEW."vit",
      'agi', NEW."agi",
      'dex', NEW."dex",
      'personalityType', NEW."personalityType",
      'personalityValue', NEW."personalityValue",
      'weaponId', NEW."weaponId",
      'subWeaponId', NEW."subWeaponId",
      'armorId', NEW."armorId",
      'optionId', NEW."optionId",
      'specialId', NEW."specialId",
      'cooking', NEW."cooking",
      'modifiers', NEW."modifiers",
      'partnerSkillAId', NEW."partnerSkillAId",
      'partnerSkillAType', NEW."partnerSkillAType",
      'partnerSkillBId', NEW."partnerSkillBId",
      'partnerSkillBType', NEW."partnerSkillBType",
      'actions', NEW."actions",
      'belongToPlayerId', NEW."belongToPlayerId",
      'details', NEW."details",
      'statisticId', NEW."statisticId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION character_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "character_local" WHERE "id" = OLD."id") THEN
    UPDATE "character_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "character_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'character',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER character_insert
INSTEAD OF INSERT ON "character"
FOR EACH ROW EXECUTE FUNCTION character_insert_trigger();

CREATE OR REPLACE TRIGGER character_update
INSTEAD OF UPDATE ON "character"
FOR EACH ROW EXECUTE FUNCTION character_update_trigger();

CREATE OR REPLACE TRIGGER character_delete
INSTEAD OF DELETE ON "character"
FOR EACH ROW EXECUTE FUNCTION character_delete_trigger();


CREATE OR REPLACE FUNCTION character_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "character_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION character_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "character_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "character_synced"
FOR EACH ROW EXECUTE FUNCTION character_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "character_synced"
FOR EACH ROW EXECUTE FUNCTION character_delete_local_on_synced_delete_trigger();

-- CreateTable
-- character_skill
CREATE TABLE IF NOT EXISTS "character_skill_synced" (
  "id" TEXT NOT NULL,
  "lv" INTEGER NOT NULL,
  "isStarGem" BOOLEAN NOT NULL,
  "templateId" TEXT NOT NULL,
  "belongToCharacterId" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "character_skill_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "character_skill_local" (
  "id" TEXT,
  "lv" INTEGER,
  "isStarGem" BOOLEAN,
  "templateId" TEXT,
  "belongToCharacterId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "character_skill_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "character_skill" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'lv' = ANY(local.changed_columns)
      THEN local."lv"
      ELSE synced."lv"
    END AS "lv",
   CASE
    WHEN 'isStarGem' = ANY(local.changed_columns)
      THEN local."isStarGem"
      ELSE synced."isStarGem"
    END AS "isStarGem",
   CASE
    WHEN 'templateId' = ANY(local.changed_columns)
      THEN local."templateId"
      ELSE synced."templateId"
    END AS "templateId",
   CASE
    WHEN 'belongToCharacterId' = ANY(local.changed_columns)
      THEN local."belongToCharacterId"
      ELSE synced."belongToCharacterId"
    END AS "belongToCharacterId"
  FROM "character_skill_synced" AS synced
  FULL OUTER JOIN "character_skill_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION character_skill_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "character_skill_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "character_skill_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'lv');
    changed_cols := array_append(changed_cols, 'isStarGem');
    changed_cols := array_append(changed_cols, 'templateId');
    changed_cols := array_append(changed_cols, 'belongToCharacterId');

    INSERT INTO "character_skill_local" (
    "id", "lv", "isStarGem", "templateId", "belongToCharacterId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."lv", NEW."isStarGem", NEW."templateId", NEW."belongToCharacterId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'character_skill',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'lv', NEW."lv",
      'isStarGem', NEW."isStarGem",
      'templateId', NEW."templateId",
      'belongToCharacterId', NEW."belongToCharacterId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION character_skill_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "character_skill_synced"%ROWTYPE;
    local "character_skill_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "character_skill_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "character_skill_local" WHERE "id" = NEW."id";
    
    IF NEW."lv" IS DISTINCT FROM synced."lv" THEN
      changed_cols := array_append(changed_cols, 'lv');
    END IF;
    IF NEW."isStarGem" IS DISTINCT FROM synced."isStarGem" THEN
      changed_cols := array_append(changed_cols, 'isStarGem');
    END IF;
    IF NEW."templateId" IS DISTINCT FROM synced."templateId" THEN
      changed_cols := array_append(changed_cols, 'templateId');
    END IF;
    IF NEW."belongToCharacterId" IS DISTINCT FROM synced."belongToCharacterId" THEN
      changed_cols := array_append(changed_cols, 'belongToCharacterId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "character_skill_local" (
        "id", "lv", "isStarGem", "templateId", "belongToCharacterId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."lv", NEW."isStarGem", NEW."templateId", NEW."belongToCharacterId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "character_skill_local"
    SET
        
    "lv" = NEW."lv",
    "isStarGem" = NEW."isStarGem",
    "templateId" = NEW."templateId",
    "belongToCharacterId" = NEW."belongToCharacterId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'character_skill',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'lv', NEW."lv",
      'isStarGem', NEW."isStarGem",
      'templateId', NEW."templateId",
      'belongToCharacterId', NEW."belongToCharacterId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION character_skill_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "character_skill_local" WHERE "id" = OLD."id") THEN
    UPDATE "character_skill_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "character_skill_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'character_skill',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER character_skill_insert
INSTEAD OF INSERT ON "character_skill"
FOR EACH ROW EXECUTE FUNCTION character_skill_insert_trigger();

CREATE OR REPLACE TRIGGER character_skill_update
INSTEAD OF UPDATE ON "character_skill"
FOR EACH ROW EXECUTE FUNCTION character_skill_update_trigger();

CREATE OR REPLACE TRIGGER character_skill_delete
INSTEAD OF DELETE ON "character_skill"
FOR EACH ROW EXECUTE FUNCTION character_skill_delete_trigger();


CREATE OR REPLACE FUNCTION character_skill_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "character_skill_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION character_skill_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "character_skill_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "character_skill_synced"
FOR EACH ROW EXECUTE FUNCTION character_skill_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "character_skill_synced"
FOR EACH ROW EXECUTE FUNCTION character_skill_delete_local_on_synced_delete_trigger();

-- CreateTable
-- character_registlet
CREATE TABLE IF NOT EXISTS "character_registlet_synced" (
  "id" TEXT NOT NULL,
  "level" INTEGER NOT NULL,
  "templateId" TEXT NOT NULL,
  "belongToCharacterId" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "character_registlet_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "character_registlet_local" (
  "id" TEXT,
  "level" INTEGER,
  "templateId" TEXT,
  "belongToCharacterId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "character_registlet_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "character_registlet" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'level' = ANY(local.changed_columns)
      THEN local."level"
      ELSE synced."level"
    END AS "level",
   CASE
    WHEN 'templateId' = ANY(local.changed_columns)
      THEN local."templateId"
      ELSE synced."templateId"
    END AS "templateId",
   CASE
    WHEN 'belongToCharacterId' = ANY(local.changed_columns)
      THEN local."belongToCharacterId"
      ELSE synced."belongToCharacterId"
    END AS "belongToCharacterId"
  FROM "character_registlet_synced" AS synced
  FULL OUTER JOIN "character_registlet_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION character_registlet_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "character_registlet_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "character_registlet_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'level');
    changed_cols := array_append(changed_cols, 'templateId');
    changed_cols := array_append(changed_cols, 'belongToCharacterId');

    INSERT INTO "character_registlet_local" (
    "id", "level", "templateId", "belongToCharacterId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."level", NEW."templateId", NEW."belongToCharacterId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'character_registlet',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'level', NEW."level",
      'templateId', NEW."templateId",
      'belongToCharacterId', NEW."belongToCharacterId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION character_registlet_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "character_registlet_synced"%ROWTYPE;
    local "character_registlet_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "character_registlet_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "character_registlet_local" WHERE "id" = NEW."id";
    
    IF NEW."level" IS DISTINCT FROM synced."level" THEN
      changed_cols := array_append(changed_cols, 'level');
    END IF;
    IF NEW."templateId" IS DISTINCT FROM synced."templateId" THEN
      changed_cols := array_append(changed_cols, 'templateId');
    END IF;
    IF NEW."belongToCharacterId" IS DISTINCT FROM synced."belongToCharacterId" THEN
      changed_cols := array_append(changed_cols, 'belongToCharacterId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "character_registlet_local" (
        "id", "level", "templateId", "belongToCharacterId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."level", NEW."templateId", NEW."belongToCharacterId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "character_registlet_local"
    SET
        
    "level" = NEW."level",
    "templateId" = NEW."templateId",
    "belongToCharacterId" = NEW."belongToCharacterId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'character_registlet',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'level', NEW."level",
      'templateId', NEW."templateId",
      'belongToCharacterId', NEW."belongToCharacterId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION character_registlet_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "character_registlet_local" WHERE "id" = OLD."id") THEN
    UPDATE "character_registlet_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "character_registlet_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'character_registlet',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER character_registlet_insert
INSTEAD OF INSERT ON "character_registlet"
FOR EACH ROW EXECUTE FUNCTION character_registlet_insert_trigger();

CREATE OR REPLACE TRIGGER character_registlet_update
INSTEAD OF UPDATE ON "character_registlet"
FOR EACH ROW EXECUTE FUNCTION character_registlet_update_trigger();

CREATE OR REPLACE TRIGGER character_registlet_delete
INSTEAD OF DELETE ON "character_registlet"
FOR EACH ROW EXECUTE FUNCTION character_registlet_delete_trigger();


CREATE OR REPLACE FUNCTION character_registlet_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "character_registlet_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION character_registlet_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "character_registlet_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "character_registlet_synced"
FOR EACH ROW EXECUTE FUNCTION character_registlet_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "character_registlet_synced"
FOR EACH ROW EXECUTE FUNCTION character_registlet_delete_local_on_synced_delete_trigger();

-- CreateTable
-- combo
CREATE TABLE IF NOT EXISTS "combo_synced" (
  "id" TEXT NOT NULL,
  "disable" BOOLEAN NOT NULL,
  "name" TEXT NOT NULL,
  "belongToCharacterId" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "combo_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "combo_local" (
  "id" TEXT,
  "disable" BOOLEAN,
  "name" TEXT,
  "belongToCharacterId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "combo_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "combo" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'disable' = ANY(local.changed_columns)
      THEN local."disable"
      ELSE synced."disable"
    END AS "disable",
   CASE
    WHEN 'name' = ANY(local.changed_columns)
      THEN local."name"
      ELSE synced."name"
    END AS "name",
   CASE
    WHEN 'belongToCharacterId' = ANY(local.changed_columns)
      THEN local."belongToCharacterId"
      ELSE synced."belongToCharacterId"
    END AS "belongToCharacterId"
  FROM "combo_synced" AS synced
  FULL OUTER JOIN "combo_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION combo_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "combo_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "combo_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'disable');
    changed_cols := array_append(changed_cols, 'name');
    changed_cols := array_append(changed_cols, 'belongToCharacterId');

    INSERT INTO "combo_local" (
    "id", "disable", "name", "belongToCharacterId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."disable", NEW."name", NEW."belongToCharacterId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'combo',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'disable', NEW."disable",
      'name', NEW."name",
      'belongToCharacterId', NEW."belongToCharacterId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION combo_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "combo_synced"%ROWTYPE;
    local "combo_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "combo_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "combo_local" WHERE "id" = NEW."id";
    
    IF NEW."disable" IS DISTINCT FROM synced."disable" THEN
      changed_cols := array_append(changed_cols, 'disable');
    END IF;
    IF NEW."name" IS DISTINCT FROM synced."name" THEN
      changed_cols := array_append(changed_cols, 'name');
    END IF;
    IF NEW."belongToCharacterId" IS DISTINCT FROM synced."belongToCharacterId" THEN
      changed_cols := array_append(changed_cols, 'belongToCharacterId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "combo_local" (
        "id", "disable", "name", "belongToCharacterId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."disable", NEW."name", NEW."belongToCharacterId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "combo_local"
    SET
        
    "disable" = NEW."disable",
    "name" = NEW."name",
    "belongToCharacterId" = NEW."belongToCharacterId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'combo',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'disable', NEW."disable",
      'name', NEW."name",
      'belongToCharacterId', NEW."belongToCharacterId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION combo_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "combo_local" WHERE "id" = OLD."id") THEN
    UPDATE "combo_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "combo_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'combo',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER combo_insert
INSTEAD OF INSERT ON "combo"
FOR EACH ROW EXECUTE FUNCTION combo_insert_trigger();

CREATE OR REPLACE TRIGGER combo_update
INSTEAD OF UPDATE ON "combo"
FOR EACH ROW EXECUTE FUNCTION combo_update_trigger();

CREATE OR REPLACE TRIGGER combo_delete
INSTEAD OF DELETE ON "combo"
FOR EACH ROW EXECUTE FUNCTION combo_delete_trigger();


CREATE OR REPLACE FUNCTION combo_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "combo_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION combo_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "combo_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "combo_synced"
FOR EACH ROW EXECUTE FUNCTION combo_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "combo_synced"
FOR EACH ROW EXECUTE FUNCTION combo_delete_local_on_synced_delete_trigger();

-- CreateTable
-- combo_step
CREATE TABLE IF NOT EXISTS "combo_step_synced" (
  "id" TEXT NOT NULL,
  "type" "ComboStepType" NOT NULL,
  "characterSkillId" TEXT NOT NULL,
  "belongToComboId" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "combo_step_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "combo_step_local" (
  "id" TEXT,
  "type" "ComboStepType",
  "characterSkillId" TEXT,
  "belongToComboId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "combo_step_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "combo_step" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'type' = ANY(local.changed_columns)
      THEN local."type"
      ELSE synced."type"
    END AS "type",
   CASE
    WHEN 'characterSkillId' = ANY(local.changed_columns)
      THEN local."characterSkillId"
      ELSE synced."characterSkillId"
    END AS "characterSkillId",
   CASE
    WHEN 'belongToComboId' = ANY(local.changed_columns)
      THEN local."belongToComboId"
      ELSE synced."belongToComboId"
    END AS "belongToComboId"
  FROM "combo_step_synced" AS synced
  FULL OUTER JOIN "combo_step_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION combo_step_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "combo_step_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "combo_step_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'type');
    changed_cols := array_append(changed_cols, 'characterSkillId');
    changed_cols := array_append(changed_cols, 'belongToComboId');

    INSERT INTO "combo_step_local" (
    "id", "type", "characterSkillId", "belongToComboId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."type", NEW."characterSkillId", NEW."belongToComboId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'combo_step',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'type', NEW."type",
      'characterSkillId', NEW."characterSkillId",
      'belongToComboId', NEW."belongToComboId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION combo_step_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "combo_step_synced"%ROWTYPE;
    local "combo_step_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "combo_step_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "combo_step_local" WHERE "id" = NEW."id";
    
    IF NEW."type" IS DISTINCT FROM synced."type" THEN
      changed_cols := array_append(changed_cols, 'type');
    END IF;
    IF NEW."characterSkillId" IS DISTINCT FROM synced."characterSkillId" THEN
      changed_cols := array_append(changed_cols, 'characterSkillId');
    END IF;
    IF NEW."belongToComboId" IS DISTINCT FROM synced."belongToComboId" THEN
      changed_cols := array_append(changed_cols, 'belongToComboId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "combo_step_local" (
        "id", "type", "characterSkillId", "belongToComboId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."type", NEW."characterSkillId", NEW."belongToComboId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "combo_step_local"
    SET
        
    "type" = NEW."type",
    "characterSkillId" = NEW."characterSkillId",
    "belongToComboId" = NEW."belongToComboId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'combo_step',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'type', NEW."type",
      'characterSkillId', NEW."characterSkillId",
      'belongToComboId', NEW."belongToComboId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION combo_step_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "combo_step_local" WHERE "id" = OLD."id") THEN
    UPDATE "combo_step_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "combo_step_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'combo_step',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER combo_step_insert
INSTEAD OF INSERT ON "combo_step"
FOR EACH ROW EXECUTE FUNCTION combo_step_insert_trigger();

CREATE OR REPLACE TRIGGER combo_step_update
INSTEAD OF UPDATE ON "combo_step"
FOR EACH ROW EXECUTE FUNCTION combo_step_update_trigger();

CREATE OR REPLACE TRIGGER combo_step_delete
INSTEAD OF DELETE ON "combo_step"
FOR EACH ROW EXECUTE FUNCTION combo_step_delete_trigger();


CREATE OR REPLACE FUNCTION combo_step_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "combo_step_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION combo_step_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "combo_step_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "combo_step_synced"
FOR EACH ROW EXECUTE FUNCTION combo_step_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "combo_step_synced"
FOR EACH ROW EXECUTE FUNCTION combo_step_delete_local_on_synced_delete_trigger();

-- CreateTable
-- mercenary
CREATE TABLE IF NOT EXISTS "mercenary_synced" (
  "type" "MercenaryType" NOT NULL,
  "templateId" TEXT NOT NULL,
  "skillAId" TEXT NOT NULL,
  "skillAType" "PartnerSkillType" NOT NULL,
  "skillBId" TEXT NOT NULL,
  "skillBType" "PartnerSkillType" NOT NULL,
  "write_id" UUID,
  CONSTRAINT "mercenary_synced_pkey" PRIMARY KEY ("templateId")
);
CREATE TABLE IF NOT EXISTS "mercenary_local" (
  "type" "MercenaryType",
  "templateId" TEXT,
  "skillAId" TEXT,
  "skillAType" "PartnerSkillType",
  "skillBId" TEXT,
  "skillBType" "PartnerSkillType",
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "mercenary_local_pkey" PRIMARY KEY ("templateId")
);

CREATE OR REPLACE VIEW "mercenary" AS
  SELECT
     CASE
    WHEN 'type' = ANY(local.changed_columns)
      THEN local."type"
      ELSE synced."type"
    END AS "type",
   COALESCE(local."templateId", synced."templateId") AS "templateId",
   CASE
    WHEN 'skillAId' = ANY(local.changed_columns)
      THEN local."skillAId"
      ELSE synced."skillAId"
    END AS "skillAId",
   CASE
    WHEN 'skillAType' = ANY(local.changed_columns)
      THEN local."skillAType"
      ELSE synced."skillAType"
    END AS "skillAType",
   CASE
    WHEN 'skillBId' = ANY(local.changed_columns)
      THEN local."skillBId"
      ELSE synced."skillBId"
    END AS "skillBId",
   CASE
    WHEN 'skillBType' = ANY(local.changed_columns)
      THEN local."skillBType"
      ELSE synced."skillBType"
    END AS "skillBType"
  FROM "mercenary_synced" AS synced
  FULL OUTER JOIN "mercenary_local" AS local
  ON synced."templateId" = local."templateId"
  WHERE (local."templateId" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION mercenary_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "mercenary_synced" WHERE "templateId" = NEW."templateId") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "mercenary_local" WHERE "templateId" = NEW."templateId") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'type');
    changed_cols := array_append(changed_cols, 'skillAId');
    changed_cols := array_append(changed_cols, 'skillAType');
    changed_cols := array_append(changed_cols, 'skillBId');
    changed_cols := array_append(changed_cols, 'skillBType');

    INSERT INTO "mercenary_local" (
    "type", "templateId", "skillAId", "skillAType", "skillBId", "skillBType",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."type", NEW."templateId", NEW."skillAId", NEW."skillAType", NEW."skillBId", NEW."skillBType",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'mercenary',
    'insert',
    jsonb_build_object(
        'type', NEW."type",
      'templateId', NEW."templateId",
      'skillAId', NEW."skillAId",
      'skillAType', NEW."skillAType",
      'skillBId', NEW."skillBId",
      'skillBType', NEW."skillBType"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION mercenary_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "mercenary_synced"%ROWTYPE;
    local "mercenary_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "mercenary_synced" WHERE "templateId" = NEW."templateId";
    SELECT * INTO local FROM "mercenary_local" WHERE "templateId" = NEW."templateId";
    
    IF NEW."type" IS DISTINCT FROM synced."type" THEN
      changed_cols := array_append(changed_cols, 'type');
    END IF;
    IF NEW."skillAId" IS DISTINCT FROM synced."skillAId" THEN
      changed_cols := array_append(changed_cols, 'skillAId');
    END IF;
    IF NEW."skillAType" IS DISTINCT FROM synced."skillAType" THEN
      changed_cols := array_append(changed_cols, 'skillAType');
    END IF;
    IF NEW."skillBId" IS DISTINCT FROM synced."skillBId" THEN
      changed_cols := array_append(changed_cols, 'skillBId');
    END IF;
    IF NEW."skillBType" IS DISTINCT FROM synced."skillBType" THEN
      changed_cols := array_append(changed_cols, 'skillBType');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "mercenary_local" (
        "type", "templateId", "skillAId", "skillAType", "skillBId", "skillBType",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."type", NEW."templateId", NEW."skillAId", NEW."skillAType", NEW."skillBId", NEW."skillBType",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "mercenary_local"
    SET
        
    "type" = NEW."type",
    "skillAId" = NEW."skillAId",
    "skillAType" = NEW."skillAType",
    "skillBId" = NEW."skillBId",
    "skillBType" = NEW."skillBType",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "templateId" = NEW."templateId";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'mercenary',
    'update',
    jsonb_build_object(
        'type', NEW."type",
      'templateId', NEW."templateId",
      'skillAId', NEW."skillAId",
      'skillAType', NEW."skillAType",
      'skillBId', NEW."skillBId",
      'skillBType', NEW."skillBType"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION mercenary_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "mercenary_local" WHERE "templateId" = OLD."templateId") THEN
    UPDATE "mercenary_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "templateId" = OLD."templateId";
    ELSE
    INSERT INTO "mercenary_local" (
        "templateId",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."templateId",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'mercenary',
    'delete',
    jsonb_build_object('templateId', OLD."templateId"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER mercenary_insert
INSTEAD OF INSERT ON "mercenary"
FOR EACH ROW EXECUTE FUNCTION mercenary_insert_trigger();

CREATE OR REPLACE TRIGGER mercenary_update
INSTEAD OF UPDATE ON "mercenary"
FOR EACH ROW EXECUTE FUNCTION mercenary_update_trigger();

CREATE OR REPLACE TRIGGER mercenary_delete
INSTEAD OF DELETE ON "mercenary"
FOR EACH ROW EXECUTE FUNCTION mercenary_delete_trigger();


CREATE OR REPLACE FUNCTION mercenary_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "mercenary_local"
  WHERE "templateId" = NEW."templateId"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION mercenary_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "mercenary_local"
  WHERE "templateId" = OLD."templateId";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "mercenary_synced"
FOR EACH ROW EXECUTE FUNCTION mercenary_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "mercenary_synced"
FOR EACH ROW EXECUTE FUNCTION mercenary_delete_local_on_synced_delete_trigger();

-- CreateTable
-- simulator
CREATE TABLE IF NOT EXISTS "simulator_synced" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "details" TEXT,
  "statisticId" TEXT NOT NULL,
  "updatedByAccountId" TEXT,
  "createdByAccountId" TEXT,
  "write_id" UUID,
  CONSTRAINT "simulator_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "simulator_local" (
  "id" TEXT,
  "name" TEXT,
  "details" TEXT,
  "statisticId" TEXT,
  "updatedByAccountId" TEXT,
  "createdByAccountId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "simulator_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "simulator" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'name' = ANY(local.changed_columns)
      THEN local."name"
      ELSE synced."name"
    END AS "name",
   CASE
    WHEN 'details' = ANY(local.changed_columns)
      THEN local."details"
      ELSE synced."details"
    END AS "details",
   CASE
    WHEN 'statisticId' = ANY(local.changed_columns)
      THEN local."statisticId"
      ELSE synced."statisticId"
    END AS "statisticId",
   CASE
    WHEN 'updatedByAccountId' = ANY(local.changed_columns)
      THEN local."updatedByAccountId"
      ELSE synced."updatedByAccountId"
    END AS "updatedByAccountId",
   CASE
    WHEN 'createdByAccountId' = ANY(local.changed_columns)
      THEN local."createdByAccountId"
      ELSE synced."createdByAccountId"
    END AS "createdByAccountId"
  FROM "simulator_synced" AS synced
  FULL OUTER JOIN "simulator_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION simulator_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "simulator_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "simulator_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'name');
    changed_cols := array_append(changed_cols, 'details');
    changed_cols := array_append(changed_cols, 'statisticId');
    changed_cols := array_append(changed_cols, 'updatedByAccountId');
    changed_cols := array_append(changed_cols, 'createdByAccountId');

    INSERT INTO "simulator_local" (
    "id", "name", "details", "statisticId", "updatedByAccountId", "createdByAccountId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."name", NEW."details", NEW."statisticId", NEW."updatedByAccountId", NEW."createdByAccountId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'simulator',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'details', NEW."details",
      'statisticId', NEW."statisticId",
      'updatedByAccountId', NEW."updatedByAccountId",
      'createdByAccountId', NEW."createdByAccountId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION simulator_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "simulator_synced"%ROWTYPE;
    local "simulator_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "simulator_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "simulator_local" WHERE "id" = NEW."id";
    
    IF NEW."name" IS DISTINCT FROM synced."name" THEN
      changed_cols := array_append(changed_cols, 'name');
    END IF;
    IF NEW."details" IS DISTINCT FROM synced."details" THEN
      changed_cols := array_append(changed_cols, 'details');
    END IF;
    IF NEW."statisticId" IS DISTINCT FROM synced."statisticId" THEN
      changed_cols := array_append(changed_cols, 'statisticId');
    END IF;
    IF NEW."updatedByAccountId" IS DISTINCT FROM synced."updatedByAccountId" THEN
      changed_cols := array_append(changed_cols, 'updatedByAccountId');
    END IF;
    IF NEW."createdByAccountId" IS DISTINCT FROM synced."createdByAccountId" THEN
      changed_cols := array_append(changed_cols, 'createdByAccountId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "simulator_local" (
        "id", "name", "details", "statisticId", "updatedByAccountId", "createdByAccountId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."name", NEW."details", NEW."statisticId", NEW."updatedByAccountId", NEW."createdByAccountId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "simulator_local"
    SET
        
    "name" = NEW."name",
    "details" = NEW."details",
    "statisticId" = NEW."statisticId",
    "updatedByAccountId" = NEW."updatedByAccountId",
    "createdByAccountId" = NEW."createdByAccountId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'simulator',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'details', NEW."details",
      'statisticId', NEW."statisticId",
      'updatedByAccountId', NEW."updatedByAccountId",
      'createdByAccountId', NEW."createdByAccountId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION simulator_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "simulator_local" WHERE "id" = OLD."id") THEN
    UPDATE "simulator_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "simulator_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'simulator',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER simulator_insert
INSTEAD OF INSERT ON "simulator"
FOR EACH ROW EXECUTE FUNCTION simulator_insert_trigger();

CREATE OR REPLACE TRIGGER simulator_update
INSTEAD OF UPDATE ON "simulator"
FOR EACH ROW EXECUTE FUNCTION simulator_update_trigger();

CREATE OR REPLACE TRIGGER simulator_delete
INSTEAD OF DELETE ON "simulator"
FOR EACH ROW EXECUTE FUNCTION simulator_delete_trigger();


CREATE OR REPLACE FUNCTION simulator_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "simulator_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION simulator_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "simulator_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "simulator_synced"
FOR EACH ROW EXECUTE FUNCTION simulator_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "simulator_synced"
FOR EACH ROW EXECUTE FUNCTION simulator_delete_local_on_synced_delete_trigger();

-- CreateTable
-- team
CREATE TABLE IF NOT EXISTS "team_synced" (
  "id" TEXT NOT NULL,
  "name" TEXT,
  "gems" TEXT[],
  "write_id" UUID,
  CONSTRAINT "team_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "team_local" (
  "id" TEXT,
  "name" TEXT,
  "gems" TEXT[],
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "team_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "team" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'name' = ANY(local.changed_columns)
      THEN local."name"
      ELSE synced."name"
    END AS "name",
   CASE
    WHEN 'gems' = ANY(local.changed_columns)
      THEN local."gems"
      ELSE synced."gems"
    END AS "gems"
  FROM "team_synced" AS synced
  FULL OUTER JOIN "team_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION team_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "team_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "team_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'name');
    changed_cols := array_append(changed_cols, 'gems');

    INSERT INTO "team_local" (
    "id", "name", "gems",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."name", NEW."gems",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'team',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'gems', NEW."gems"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION team_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "team_synced"%ROWTYPE;
    local "team_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "team_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "team_local" WHERE "id" = NEW."id";
    
    IF NEW."name" IS DISTINCT FROM synced."name" THEN
      changed_cols := array_append(changed_cols, 'name');
    END IF;
    IF NEW."gems" IS DISTINCT FROM synced."gems" THEN
      changed_cols := array_append(changed_cols, 'gems');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "team_local" (
        "id", "name", "gems",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."name", NEW."gems",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "team_local"
    SET
        
    "name" = NEW."name",
    "gems" = NEW."gems",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'team',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'gems', NEW."gems"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION team_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "team_local" WHERE "id" = OLD."id") THEN
    UPDATE "team_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "team_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'team',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER team_insert
INSTEAD OF INSERT ON "team"
FOR EACH ROW EXECUTE FUNCTION team_insert_trigger();

CREATE OR REPLACE TRIGGER team_update
INSTEAD OF UPDATE ON "team"
FOR EACH ROW EXECUTE FUNCTION team_update_trigger();

CREATE OR REPLACE TRIGGER team_delete
INSTEAD OF DELETE ON "team"
FOR EACH ROW EXECUTE FUNCTION team_delete_trigger();


CREATE OR REPLACE FUNCTION team_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "team_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION team_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "team_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "team_synced"
FOR EACH ROW EXECUTE FUNCTION team_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "team_synced"
FOR EACH ROW EXECUTE FUNCTION team_delete_local_on_synced_delete_trigger();

-- CreateTable
-- member
CREATE TABLE IF NOT EXISTS "member_synced" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "type" "MemberType" NOT NULL,
  "playerId" TEXT,
  "partnerId" TEXT,
  "mercenaryId" TEXT,
  "mobId" TEXT,
  "mobDifficultyFlag" "MobDifficultyFlag" NOT NULL,
  "belongToTeamId" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "member_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "member_local" (
  "id" TEXT,
  "name" TEXT,
  "sequence" INTEGER,
  "type" "MemberType",
  "playerId" TEXT,
  "partnerId" TEXT,
  "mercenaryId" TEXT,
  "mobId" TEXT,
  "mobDifficultyFlag" "MobDifficultyFlag",
  "belongToTeamId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "member_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "member" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'name' = ANY(local.changed_columns)
      THEN local."name"
      ELSE synced."name"
    END AS "name",
   CASE
    WHEN 'sequence' = ANY(local.changed_columns)
      THEN local."sequence"
      ELSE synced."sequence"
    END AS "sequence",
   CASE
    WHEN 'type' = ANY(local.changed_columns)
      THEN local."type"
      ELSE synced."type"
    END AS "type",
   CASE
    WHEN 'playerId' = ANY(local.changed_columns)
      THEN local."playerId"
      ELSE synced."playerId"
    END AS "playerId",
   CASE
    WHEN 'partnerId' = ANY(local.changed_columns)
      THEN local."partnerId"
      ELSE synced."partnerId"
    END AS "partnerId",
   CASE
    WHEN 'mercenaryId' = ANY(local.changed_columns)
      THEN local."mercenaryId"
      ELSE synced."mercenaryId"
    END AS "mercenaryId",
   CASE
    WHEN 'mobId' = ANY(local.changed_columns)
      THEN local."mobId"
      ELSE synced."mobId"
    END AS "mobId",
   CASE
    WHEN 'mobDifficultyFlag' = ANY(local.changed_columns)
      THEN local."mobDifficultyFlag"
      ELSE synced."mobDifficultyFlag"
    END AS "mobDifficultyFlag",
   CASE
    WHEN 'belongToTeamId' = ANY(local.changed_columns)
      THEN local."belongToTeamId"
      ELSE synced."belongToTeamId"
    END AS "belongToTeamId"
  FROM "member_synced" AS synced
  FULL OUTER JOIN "member_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION member_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "member_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "member_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'name');
    changed_cols := array_append(changed_cols, 'sequence');
    changed_cols := array_append(changed_cols, 'type');
    changed_cols := array_append(changed_cols, 'playerId');
    changed_cols := array_append(changed_cols, 'partnerId');
    changed_cols := array_append(changed_cols, 'mercenaryId');
    changed_cols := array_append(changed_cols, 'mobId');
    changed_cols := array_append(changed_cols, 'mobDifficultyFlag');
    changed_cols := array_append(changed_cols, 'belongToTeamId');

    INSERT INTO "member_local" (
    "id", "name", "sequence", "type", "playerId", "partnerId", "mercenaryId", "mobId", "mobDifficultyFlag", "belongToTeamId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."name", NEW."sequence", NEW."type", NEW."playerId", NEW."partnerId", NEW."mercenaryId", NEW."mobId", NEW."mobDifficultyFlag", NEW."belongToTeamId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'member',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'sequence', NEW."sequence",
      'type', NEW."type",
      'playerId', NEW."playerId",
      'partnerId', NEW."partnerId",
      'mercenaryId', NEW."mercenaryId",
      'mobId', NEW."mobId",
      'mobDifficultyFlag', NEW."mobDifficultyFlag",
      'belongToTeamId', NEW."belongToTeamId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION member_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "member_synced"%ROWTYPE;
    local "member_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "member_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "member_local" WHERE "id" = NEW."id";
    
    IF NEW."name" IS DISTINCT FROM synced."name" THEN
      changed_cols := array_append(changed_cols, 'name');
    END IF;
    IF NEW."sequence" IS DISTINCT FROM synced."sequence" THEN
      changed_cols := array_append(changed_cols, 'sequence');
    END IF;
    IF NEW."type" IS DISTINCT FROM synced."type" THEN
      changed_cols := array_append(changed_cols, 'type');
    END IF;
    IF NEW."playerId" IS DISTINCT FROM synced."playerId" THEN
      changed_cols := array_append(changed_cols, 'playerId');
    END IF;
    IF NEW."partnerId" IS DISTINCT FROM synced."partnerId" THEN
      changed_cols := array_append(changed_cols, 'partnerId');
    END IF;
    IF NEW."mercenaryId" IS DISTINCT FROM synced."mercenaryId" THEN
      changed_cols := array_append(changed_cols, 'mercenaryId');
    END IF;
    IF NEW."mobId" IS DISTINCT FROM synced."mobId" THEN
      changed_cols := array_append(changed_cols, 'mobId');
    END IF;
    IF NEW."mobDifficultyFlag" IS DISTINCT FROM synced."mobDifficultyFlag" THEN
      changed_cols := array_append(changed_cols, 'mobDifficultyFlag');
    END IF;
    IF NEW."belongToTeamId" IS DISTINCT FROM synced."belongToTeamId" THEN
      changed_cols := array_append(changed_cols, 'belongToTeamId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "member_local" (
        "id", "name", "sequence", "type", "playerId", "partnerId", "mercenaryId", "mobId", "mobDifficultyFlag", "belongToTeamId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."name", NEW."sequence", NEW."type", NEW."playerId", NEW."partnerId", NEW."mercenaryId", NEW."mobId", NEW."mobDifficultyFlag", NEW."belongToTeamId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "member_local"
    SET
        
    "name" = NEW."name",
    "sequence" = NEW."sequence",
    "type" = NEW."type",
    "playerId" = NEW."playerId",
    "partnerId" = NEW."partnerId",
    "mercenaryId" = NEW."mercenaryId",
    "mobId" = NEW."mobId",
    "mobDifficultyFlag" = NEW."mobDifficultyFlag",
    "belongToTeamId" = NEW."belongToTeamId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'member',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'sequence', NEW."sequence",
      'type', NEW."type",
      'playerId', NEW."playerId",
      'partnerId', NEW."partnerId",
      'mercenaryId', NEW."mercenaryId",
      'mobId', NEW."mobId",
      'mobDifficultyFlag', NEW."mobDifficultyFlag",
      'belongToTeamId', NEW."belongToTeamId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION member_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "member_local" WHERE "id" = OLD."id") THEN
    UPDATE "member_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "member_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'member',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER member_insert
INSTEAD OF INSERT ON "member"
FOR EACH ROW EXECUTE FUNCTION member_insert_trigger();

CREATE OR REPLACE TRIGGER member_update
INSTEAD OF UPDATE ON "member"
FOR EACH ROW EXECUTE FUNCTION member_update_trigger();

CREATE OR REPLACE TRIGGER member_delete
INSTEAD OF DELETE ON "member"
FOR EACH ROW EXECUTE FUNCTION member_delete_trigger();


CREATE OR REPLACE FUNCTION member_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "member_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION member_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "member_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "member_synced"
FOR EACH ROW EXECUTE FUNCTION member_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "member_synced"
FOR EACH ROW EXECUTE FUNCTION member_delete_local_on_synced_delete_trigger();

-- CreateTable
-- user
CREATE TABLE IF NOT EXISTS "user_synced" (
  "id" TEXT NOT NULL,
  "name" TEXT,
  "email" TEXT,
  "emailVerified" TIMESTAMP(3),
  "password" TEXT,
  "image" TEXT,
  "write_id" UUID,
  CONSTRAINT "user_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "user_local" (
  "id" TEXT,
  "name" TEXT,
  "email" TEXT,
  "emailVerified" TIMESTAMP(3),
  "password" TEXT,
  "image" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "user_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "user" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'name' = ANY(local.changed_columns)
      THEN local."name"
      ELSE synced."name"
    END AS "name",
   CASE
    WHEN 'email' = ANY(local.changed_columns)
      THEN local."email"
      ELSE synced."email"
    END AS "email",
   CASE
    WHEN 'emailVerified' = ANY(local.changed_columns)
      THEN local."emailVerified"
      ELSE synced."emailVerified"
    END AS "emailVerified",
   CASE
    WHEN 'password' = ANY(local.changed_columns)
      THEN local."password"
      ELSE synced."password"
    END AS "password",
   CASE
    WHEN 'image' = ANY(local.changed_columns)
      THEN local."image"
      ELSE synced."image"
    END AS "image"
  FROM "user_synced" AS synced
  FULL OUTER JOIN "user_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION user_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "user_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "user_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'name');
    changed_cols := array_append(changed_cols, 'email');
    changed_cols := array_append(changed_cols, 'emailVerified');
    changed_cols := array_append(changed_cols, 'password');
    changed_cols := array_append(changed_cols, 'image');

    INSERT INTO "user_local" (
    "id", "name", "email", "emailVerified", "password", "image",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."name", NEW."email", NEW."emailVerified", NEW."password", NEW."image",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'user',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'email', NEW."email",
      'emailVerified', NEW."emailVerified",
      'password', NEW."password",
      'image', NEW."image"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION user_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "user_synced"%ROWTYPE;
    local "user_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "user_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "user_local" WHERE "id" = NEW."id";
    
    IF NEW."name" IS DISTINCT FROM synced."name" THEN
      changed_cols := array_append(changed_cols, 'name');
    END IF;
    IF NEW."email" IS DISTINCT FROM synced."email" THEN
      changed_cols := array_append(changed_cols, 'email');
    END IF;
    IF NEW."emailVerified" IS DISTINCT FROM synced."emailVerified" THEN
      changed_cols := array_append(changed_cols, 'emailVerified');
    END IF;
    IF NEW."password" IS DISTINCT FROM synced."password" THEN
      changed_cols := array_append(changed_cols, 'password');
    END IF;
    IF NEW."image" IS DISTINCT FROM synced."image" THEN
      changed_cols := array_append(changed_cols, 'image');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "user_local" (
        "id", "name", "email", "emailVerified", "password", "image",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."name", NEW."email", NEW."emailVerified", NEW."password", NEW."image",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "user_local"
    SET
        
    "name" = NEW."name",
    "email" = NEW."email",
    "emailVerified" = NEW."emailVerified",
    "password" = NEW."password",
    "image" = NEW."image",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'user',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'email', NEW."email",
      'emailVerified', NEW."emailVerified",
      'password', NEW."password",
      'image', NEW."image"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION user_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "user_local" WHERE "id" = OLD."id") THEN
    UPDATE "user_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "user_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'user',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER user_insert
INSTEAD OF INSERT ON "user"
FOR EACH ROW EXECUTE FUNCTION user_insert_trigger();

CREATE OR REPLACE TRIGGER user_update
INSTEAD OF UPDATE ON "user"
FOR EACH ROW EXECUTE FUNCTION user_update_trigger();

CREATE OR REPLACE TRIGGER user_delete
INSTEAD OF DELETE ON "user"
FOR EACH ROW EXECUTE FUNCTION user_delete_trigger();


CREATE OR REPLACE FUNCTION user_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "user_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION user_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "user_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "user_synced"
FOR EACH ROW EXECUTE FUNCTION user_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "user_synced"
FOR EACH ROW EXECUTE FUNCTION user_delete_local_on_synced_delete_trigger();

-- CreateTable
-- account
CREATE TABLE IF NOT EXISTS "account_synced" (
  "id" TEXT NOT NULL,
  "type" "AccountType" NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  "userId" TEXT,
  "write_id" UUID,
  CONSTRAINT "account_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "account_local" (
  "id" TEXT,
  "type" "AccountType",
  "provider" TEXT,
  "providerAccountId" TEXT,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  "userId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "account_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "account" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'type' = ANY(local.changed_columns)
      THEN local."type"
      ELSE synced."type"
    END AS "type",
   CASE
    WHEN 'provider' = ANY(local.changed_columns)
      THEN local."provider"
      ELSE synced."provider"
    END AS "provider",
   CASE
    WHEN 'providerAccountId' = ANY(local.changed_columns)
      THEN local."providerAccountId"
      ELSE synced."providerAccountId"
    END AS "providerAccountId",
   CASE
    WHEN 'refresh_token' = ANY(local.changed_columns)
      THEN local."refresh_token"
      ELSE synced."refresh_token"
    END AS "refresh_token",
   CASE
    WHEN 'access_token' = ANY(local.changed_columns)
      THEN local."access_token"
      ELSE synced."access_token"
    END AS "access_token",
   CASE
    WHEN 'expires_at' = ANY(local.changed_columns)
      THEN local."expires_at"
      ELSE synced."expires_at"
    END AS "expires_at",
   CASE
    WHEN 'token_type' = ANY(local.changed_columns)
      THEN local."token_type"
      ELSE synced."token_type"
    END AS "token_type",
   CASE
    WHEN 'scope' = ANY(local.changed_columns)
      THEN local."scope"
      ELSE synced."scope"
    END AS "scope",
   CASE
    WHEN 'id_token' = ANY(local.changed_columns)
      THEN local."id_token"
      ELSE synced."id_token"
    END AS "id_token",
   CASE
    WHEN 'session_state' = ANY(local.changed_columns)
      THEN local."session_state"
      ELSE synced."session_state"
    END AS "session_state",
   CASE
    WHEN 'userId' = ANY(local.changed_columns)
      THEN local."userId"
      ELSE synced."userId"
    END AS "userId"
  FROM "account_synced" AS synced
  FULL OUTER JOIN "account_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION account_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "account_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "account_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'type');
    changed_cols := array_append(changed_cols, 'provider');
    changed_cols := array_append(changed_cols, 'providerAccountId');
    changed_cols := array_append(changed_cols, 'refresh_token');
    changed_cols := array_append(changed_cols, 'access_token');
    changed_cols := array_append(changed_cols, 'expires_at');
    changed_cols := array_append(changed_cols, 'token_type');
    changed_cols := array_append(changed_cols, 'scope');
    changed_cols := array_append(changed_cols, 'id_token');
    changed_cols := array_append(changed_cols, 'session_state');
    changed_cols := array_append(changed_cols, 'userId');

    INSERT INTO "account_local" (
    "id", "type", "provider", "providerAccountId", "refresh_token", "access_token", "expires_at", "token_type", "scope", "id_token", "session_state", "userId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."type", NEW."provider", NEW."providerAccountId", NEW."refresh_token", NEW."access_token", NEW."expires_at", NEW."token_type", NEW."scope", NEW."id_token", NEW."session_state", NEW."userId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'account',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'type', NEW."type",
      'provider', NEW."provider",
      'providerAccountId', NEW."providerAccountId",
      'refresh_token', NEW."refresh_token",
      'access_token', NEW."access_token",
      'expires_at', NEW."expires_at",
      'token_type', NEW."token_type",
      'scope', NEW."scope",
      'id_token', NEW."id_token",
      'session_state', NEW."session_state",
      'userId', NEW."userId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION account_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "account_synced"%ROWTYPE;
    local "account_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "account_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "account_local" WHERE "id" = NEW."id";
    
    IF NEW."type" IS DISTINCT FROM synced."type" THEN
      changed_cols := array_append(changed_cols, 'type');
    END IF;
    IF NEW."provider" IS DISTINCT FROM synced."provider" THEN
      changed_cols := array_append(changed_cols, 'provider');
    END IF;
    IF NEW."providerAccountId" IS DISTINCT FROM synced."providerAccountId" THEN
      changed_cols := array_append(changed_cols, 'providerAccountId');
    END IF;
    IF NEW."refresh_token" IS DISTINCT FROM synced."refresh_token" THEN
      changed_cols := array_append(changed_cols, 'refresh_token');
    END IF;
    IF NEW."access_token" IS DISTINCT FROM synced."access_token" THEN
      changed_cols := array_append(changed_cols, 'access_token');
    END IF;
    IF NEW."expires_at" IS DISTINCT FROM synced."expires_at" THEN
      changed_cols := array_append(changed_cols, 'expires_at');
    END IF;
    IF NEW."token_type" IS DISTINCT FROM synced."token_type" THEN
      changed_cols := array_append(changed_cols, 'token_type');
    END IF;
    IF NEW."scope" IS DISTINCT FROM synced."scope" THEN
      changed_cols := array_append(changed_cols, 'scope');
    END IF;
    IF NEW."id_token" IS DISTINCT FROM synced."id_token" THEN
      changed_cols := array_append(changed_cols, 'id_token');
    END IF;
    IF NEW."session_state" IS DISTINCT FROM synced."session_state" THEN
      changed_cols := array_append(changed_cols, 'session_state');
    END IF;
    IF NEW."userId" IS DISTINCT FROM synced."userId" THEN
      changed_cols := array_append(changed_cols, 'userId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "account_local" (
        "id", "type", "provider", "providerAccountId", "refresh_token", "access_token", "expires_at", "token_type", "scope", "id_token", "session_state", "userId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."type", NEW."provider", NEW."providerAccountId", NEW."refresh_token", NEW."access_token", NEW."expires_at", NEW."token_type", NEW."scope", NEW."id_token", NEW."session_state", NEW."userId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "account_local"
    SET
        
    "type" = NEW."type",
    "provider" = NEW."provider",
    "providerAccountId" = NEW."providerAccountId",
    "refresh_token" = NEW."refresh_token",
    "access_token" = NEW."access_token",
    "expires_at" = NEW."expires_at",
    "token_type" = NEW."token_type",
    "scope" = NEW."scope",
    "id_token" = NEW."id_token",
    "session_state" = NEW."session_state",
    "userId" = NEW."userId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'account',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'type', NEW."type",
      'provider', NEW."provider",
      'providerAccountId', NEW."providerAccountId",
      'refresh_token', NEW."refresh_token",
      'access_token', NEW."access_token",
      'expires_at', NEW."expires_at",
      'token_type', NEW."token_type",
      'scope', NEW."scope",
      'id_token', NEW."id_token",
      'session_state', NEW."session_state",
      'userId', NEW."userId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION account_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "account_local" WHERE "id" = OLD."id") THEN
    UPDATE "account_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "account_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'account',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER account_insert
INSTEAD OF INSERT ON "account"
FOR EACH ROW EXECUTE FUNCTION account_insert_trigger();

CREATE OR REPLACE TRIGGER account_update
INSTEAD OF UPDATE ON "account"
FOR EACH ROW EXECUTE FUNCTION account_update_trigger();

CREATE OR REPLACE TRIGGER account_delete
INSTEAD OF DELETE ON "account"
FOR EACH ROW EXECUTE FUNCTION account_delete_trigger();


CREATE OR REPLACE FUNCTION account_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "account_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION account_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "account_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "account_synced"
FOR EACH ROW EXECUTE FUNCTION account_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "account_synced"
FOR EACH ROW EXECUTE FUNCTION account_delete_local_on_synced_delete_trigger();

-- CreateTable
-- session
CREATE TABLE IF NOT EXISTS "session_synced" (
  "id" TEXT NOT NULL,
  "sessionToken" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  "userId" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "session_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "session_local" (
  "id" TEXT,
  "sessionToken" TEXT,
  "expires" TIMESTAMP(3),
  "userId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "session_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "session" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'sessionToken' = ANY(local.changed_columns)
      THEN local."sessionToken"
      ELSE synced."sessionToken"
    END AS "sessionToken",
   CASE
    WHEN 'expires' = ANY(local.changed_columns)
      THEN local."expires"
      ELSE synced."expires"
    END AS "expires",
   CASE
    WHEN 'userId' = ANY(local.changed_columns)
      THEN local."userId"
      ELSE synced."userId"
    END AS "userId"
  FROM "session_synced" AS synced
  FULL OUTER JOIN "session_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION session_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "session_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "session_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'sessionToken');
    changed_cols := array_append(changed_cols, 'expires');
    changed_cols := array_append(changed_cols, 'userId');

    INSERT INTO "session_local" (
    "id", "sessionToken", "expires", "userId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."sessionToken", NEW."expires", NEW."userId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'session',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'sessionToken', NEW."sessionToken",
      'expires', NEW."expires",
      'userId', NEW."userId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION session_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "session_synced"%ROWTYPE;
    local "session_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "session_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "session_local" WHERE "id" = NEW."id";
    
    IF NEW."sessionToken" IS DISTINCT FROM synced."sessionToken" THEN
      changed_cols := array_append(changed_cols, 'sessionToken');
    END IF;
    IF NEW."expires" IS DISTINCT FROM synced."expires" THEN
      changed_cols := array_append(changed_cols, 'expires');
    END IF;
    IF NEW."userId" IS DISTINCT FROM synced."userId" THEN
      changed_cols := array_append(changed_cols, 'userId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "session_local" (
        "id", "sessionToken", "expires", "userId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."sessionToken", NEW."expires", NEW."userId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "session_local"
    SET
        
    "sessionToken" = NEW."sessionToken",
    "expires" = NEW."expires",
    "userId" = NEW."userId",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'session',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'sessionToken', NEW."sessionToken",
      'expires', NEW."expires",
      'userId', NEW."userId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION session_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "session_local" WHERE "id" = OLD."id") THEN
    UPDATE "session_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "session_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'session',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER session_insert
INSTEAD OF INSERT ON "session"
FOR EACH ROW EXECUTE FUNCTION session_insert_trigger();

CREATE OR REPLACE TRIGGER session_update
INSTEAD OF UPDATE ON "session"
FOR EACH ROW EXECUTE FUNCTION session_update_trigger();

CREATE OR REPLACE TRIGGER session_delete
INSTEAD OF DELETE ON "session"
FOR EACH ROW EXECUTE FUNCTION session_delete_trigger();


CREATE OR REPLACE FUNCTION session_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "session_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION session_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "session_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "session_synced"
FOR EACH ROW EXECUTE FUNCTION session_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "session_synced"
FOR EACH ROW EXECUTE FUNCTION session_delete_local_on_synced_delete_trigger();

-- CreateTable
-- verification_token
CREATE TABLE IF NOT EXISTS "verification_token_synced" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  "write_id" UUID
);
CREATE TABLE IF NOT EXISTS "verification_token_local" (
  "identifier" TEXT,
  "token" TEXT,
  "expires" TIMESTAMP(3),
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL
);

CREATE OR REPLACE VIEW "verification_token" AS
  SELECT
     synced."identifier" AS "identifier",
   synced."token" AS "token",
   synced."expires" AS "expires"
  FROM "verification_token_synced" AS synced
  UNION ALL
  SELECT
     local."identifier" AS "identifier",
   local."token" AS "token",
   local."expires" AS "expires"
  FROM "verification_token_local" AS local
  WHERE local."is_deleted" = FALSE;
-- CreateTable
-- post
CREATE TABLE IF NOT EXISTS "post_synced" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdById" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "post_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "post_local" (
  "id" TEXT,
  "name" TEXT,
  "createdAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "post_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "post" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'name' = ANY(local.changed_columns)
      THEN local."name"
      ELSE synced."name"
    END AS "name",
   CASE
    WHEN 'createdAt' = ANY(local.changed_columns)
      THEN local."createdAt"
      ELSE synced."createdAt"
    END AS "createdAt",
   CASE
    WHEN 'updatedAt' = ANY(local.changed_columns)
      THEN local."updatedAt"
      ELSE synced."updatedAt"
    END AS "updatedAt",
   CASE
    WHEN 'createdById' = ANY(local.changed_columns)
      THEN local."createdById"
      ELSE synced."createdById"
    END AS "createdById"
  FROM "post_synced" AS synced
  FULL OUTER JOIN "post_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION post_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "post_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "post_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'name');
    changed_cols := array_append(changed_cols, 'createdAt');
    changed_cols := array_append(changed_cols, 'updatedAt');
    changed_cols := array_append(changed_cols, 'createdById');

    INSERT INTO "post_local" (
    "id", "name", "createdAt", "updatedAt", "createdById",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."name", NEW."createdAt", NEW."updatedAt", NEW."createdById",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'post',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'createdAt', NEW."createdAt",
      'updatedAt', NEW."updatedAt",
      'createdById', NEW."createdById"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION post_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "post_synced"%ROWTYPE;
    local "post_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "post_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "post_local" WHERE "id" = NEW."id";
    
    IF NEW."name" IS DISTINCT FROM synced."name" THEN
      changed_cols := array_append(changed_cols, 'name');
    END IF;
    IF NEW."createdAt" IS DISTINCT FROM synced."createdAt" THEN
      changed_cols := array_append(changed_cols, 'createdAt');
    END IF;
    IF NEW."updatedAt" IS DISTINCT FROM synced."updatedAt" THEN
      changed_cols := array_append(changed_cols, 'updatedAt');
    END IF;
    IF NEW."createdById" IS DISTINCT FROM synced."createdById" THEN
      changed_cols := array_append(changed_cols, 'createdById');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "post_local" (
        "id", "name", "createdAt", "updatedAt", "createdById",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."name", NEW."createdAt", NEW."updatedAt", NEW."createdById",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "post_local"
    SET
        
    "name" = NEW."name",
    "createdAt" = NEW."createdAt",
    "updatedAt" = NEW."updatedAt",
    "createdById" = NEW."createdById",
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "id" = NEW."id";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'post',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'name', NEW."name",
      'createdAt', NEW."createdAt",
      'updatedAt', NEW."updatedAt",
      'createdById', NEW."createdById"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION post_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "post_local" WHERE "id" = OLD."id") THEN
    UPDATE "post_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "post_local" (
        "id",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."id",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'post',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER post_insert
INSTEAD OF INSERT ON "post"
FOR EACH ROW EXECUTE FUNCTION post_insert_trigger();

CREATE OR REPLACE TRIGGER post_update
INSTEAD OF UPDATE ON "post"
FOR EACH ROW EXECUTE FUNCTION post_update_trigger();

CREATE OR REPLACE TRIGGER post_delete
INSTEAD OF DELETE ON "post"
FOR EACH ROW EXECUTE FUNCTION post_delete_trigger();


CREATE OR REPLACE FUNCTION post_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "post_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION post_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "post_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "post_synced"
FOR EACH ROW EXECUTE FUNCTION post_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "post_synced"
FOR EACH ROW EXECUTE FUNCTION post_delete_local_on_synced_delete_trigger();

-- CreateTable
-- account_create_data
CREATE TABLE IF NOT EXISTS "account_create_data_synced" (
  "accountId" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "account_create_data_synced_pkey" PRIMARY KEY ("accountId")
);
CREATE TABLE IF NOT EXISTS "account_create_data_local" (
  "accountId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "account_create_data_local_pkey" PRIMARY KEY ("accountId")
);

CREATE OR REPLACE VIEW "account_create_data" AS
  SELECT
     COALESCE(local."accountId", synced."accountId") AS "accountId"
  FROM "account_create_data_synced" AS synced
  FULL OUTER JOIN "account_create_data_local" AS local
  ON synced."accountId" = local."accountId"
  WHERE (local."accountId" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION account_create_data_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "account_create_data_synced" WHERE "accountId" = NEW."accountId") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "account_create_data_local" WHERE "accountId" = NEW."accountId") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    

    INSERT INTO "account_create_data_local" (
    "accountId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."accountId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'account_create_data',
    'insert',
    jsonb_build_object(
        'accountId', NEW."accountId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION account_create_data_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "account_create_data_synced"%ROWTYPE;
    local "account_create_data_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "account_create_data_synced" WHERE "accountId" = NEW."accountId";
    SELECT * INTO local FROM "account_create_data_local" WHERE "accountId" = NEW."accountId";
    -- no non-pk fields to track
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "account_create_data_local" (
        "accountId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."accountId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "account_create_data_local"
    SET
        -- no non-pk fields,
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "accountId" = NEW."accountId";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'account_create_data',
    'update',
    jsonb_build_object(
        'accountId', NEW."accountId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION account_create_data_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "account_create_data_local" WHERE "accountId" = OLD."accountId") THEN
    UPDATE "account_create_data_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "accountId" = OLD."accountId";
    ELSE
    INSERT INTO "account_create_data_local" (
        "accountId",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."accountId",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'account_create_data',
    'delete',
    jsonb_build_object('accountId', OLD."accountId"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER account_create_data_insert
INSTEAD OF INSERT ON "account_create_data"
FOR EACH ROW EXECUTE FUNCTION account_create_data_insert_trigger();

CREATE OR REPLACE TRIGGER account_create_data_update
INSTEAD OF UPDATE ON "account_create_data"
FOR EACH ROW EXECUTE FUNCTION account_create_data_update_trigger();

CREATE OR REPLACE TRIGGER account_create_data_delete
INSTEAD OF DELETE ON "account_create_data"
FOR EACH ROW EXECUTE FUNCTION account_create_data_delete_trigger();


CREATE OR REPLACE FUNCTION account_create_data_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "account_create_data_local"
  WHERE "accountId" = NEW."accountId"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION account_create_data_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "account_create_data_local"
  WHERE "accountId" = OLD."accountId";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "account_create_data_synced"
FOR EACH ROW EXECUTE FUNCTION account_create_data_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "account_create_data_synced"
FOR EACH ROW EXECUTE FUNCTION account_create_data_delete_local_on_synced_delete_trigger();

-- CreateTable
-- account_update_data
CREATE TABLE IF NOT EXISTS "account_update_data_synced" (
  "accountId" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "account_update_data_synced_pkey" PRIMARY KEY ("accountId")
);
CREATE TABLE IF NOT EXISTS "account_update_data_local" (
  "accountId" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "account_update_data_local_pkey" PRIMARY KEY ("accountId")
);

CREATE OR REPLACE VIEW "account_update_data" AS
  SELECT
     COALESCE(local."accountId", synced."accountId") AS "accountId"
  FROM "account_update_data_synced" AS synced
  FULL OUTER JOIN "account_update_data_local" AS local
  ON synced."accountId" = local."accountId"
  WHERE (local."accountId" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION account_update_data_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "account_update_data_synced" WHERE "accountId" = NEW."accountId") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "account_update_data_local" WHERE "accountId" = NEW."accountId") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    

    INSERT INTO "account_update_data_local" (
    "accountId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."accountId",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'account_update_data',
    'insert',
    jsonb_build_object(
        'accountId', NEW."accountId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION account_update_data_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "account_update_data_synced"%ROWTYPE;
    local "account_update_data_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "account_update_data_synced" WHERE "accountId" = NEW."accountId";
    SELECT * INTO local FROM "account_update_data_local" WHERE "accountId" = NEW."accountId";
    -- no non-pk fields to track
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "account_update_data_local" (
        "accountId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."accountId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "account_update_data_local"
    SET
        -- no non-pk fields,
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "accountId" = NEW."accountId";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'account_update_data',
    'update',
    jsonb_build_object(
        'accountId', NEW."accountId"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION account_update_data_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "account_update_data_local" WHERE "accountId" = OLD."accountId") THEN
    UPDATE "account_update_data_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "accountId" = OLD."accountId";
    ELSE
    INSERT INTO "account_update_data_local" (
        "accountId",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."accountId",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    'account_update_data',
    'delete',
    jsonb_build_object('accountId', OLD."accountId"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER account_update_data_insert
INSTEAD OF INSERT ON "account_update_data"
FOR EACH ROW EXECUTE FUNCTION account_update_data_insert_trigger();

CREATE OR REPLACE TRIGGER account_update_data_update
INSTEAD OF UPDATE ON "account_update_data"
FOR EACH ROW EXECUTE FUNCTION account_update_data_update_trigger();

CREATE OR REPLACE TRIGGER account_update_data_delete
INSTEAD OF DELETE ON "account_update_data"
FOR EACH ROW EXECUTE FUNCTION account_update_data_delete_trigger();


CREATE OR REPLACE FUNCTION account_update_data_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "account_update_data_local"
  WHERE "accountId" = NEW."accountId"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION account_update_data_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "account_update_data_local"
  WHERE "accountId" = OLD."accountId";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "account_update_data_synced"
FOR EACH ROW EXECUTE FUNCTION account_update_data_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "account_update_data_synced"
FOR EACH ROW EXECUTE FUNCTION account_update_data_delete_local_on_synced_delete_trigger();

-- CreateTable
-- _linkZones
CREATE TABLE IF NOT EXISTS "_linkZones_synced" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "_linkZones_synced_pkey" PRIMARY KEY ("A","B")
);
CREATE TABLE IF NOT EXISTS "_linkZones_local" (
  "A" TEXT,
  "B" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "_linkZones_local_pkey" PRIMARY KEY ("A","B")
);

CREATE OR REPLACE VIEW "_linkZones" AS
  SELECT
     COALESCE(local."A", synced."A") AS "A",
   COALESCE(local."B", synced."B") AS "B"
  FROM "_linkZones_synced" AS synced
  FULL OUTER JOIN "_linkZones_local" AS local
  ON synced."A" = local."A" AND synced."B" = local."B"
  WHERE (local."A" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION _linkZones_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "_linkZones_synced" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "_linkZones_local" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    

    INSERT INTO "_linkZones_local" (
    "A", "B",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."A", NEW."B",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_linkZones',
    'insert',
    jsonb_build_object(
        'A', NEW."A",
      'B', NEW."B"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _linkZones_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "_linkZones_synced"%ROWTYPE;
    local "_linkZones_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "_linkZones_synced" WHERE "A" = NEW."A" AND "B" = NEW."B";
    SELECT * INTO local FROM "_linkZones_local" WHERE "A" = NEW."A" AND "B" = NEW."B";
    -- no non-pk fields to track
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "_linkZones_local" (
        "A", "B",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."A", NEW."B",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "_linkZones_local"
    SET
        -- no non-pk fields,
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "A" = NEW."A" AND "B" = NEW."B";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_linkZones',
    'update',
    jsonb_build_object(
        'A', NEW."A",
      'B', NEW."B"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _linkZones_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "_linkZones_local" WHERE "A" = OLD."A" AND "B" = OLD."B") THEN
    UPDATE "_linkZones_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "A" = OLD."A" AND "B" = OLD."B";
    ELSE
    INSERT INTO "_linkZones_local" (
        "A", "B",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."A", OLD."B",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_linkZones',
    'delete',
    jsonb_build_object('A', OLD."A", 'B', OLD."B"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER _linkZones_insert
INSTEAD OF INSERT ON "_linkZones"
FOR EACH ROW EXECUTE FUNCTION _linkZones_insert_trigger();

CREATE OR REPLACE TRIGGER _linkZones_update
INSTEAD OF UPDATE ON "_linkZones"
FOR EACH ROW EXECUTE FUNCTION _linkZones_update_trigger();

CREATE OR REPLACE TRIGGER _linkZones_delete
INSTEAD OF DELETE ON "_linkZones"
FOR EACH ROW EXECUTE FUNCTION _linkZones_delete_trigger();


CREATE OR REPLACE FUNCTION _linkZones_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_linkZones_local"
  WHERE "A" = NEW."A" AND "B" = NEW."B"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION _linkZones_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_linkZones_local"
  WHERE "A" = OLD."A" AND "B" = OLD."B";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "_linkZones_synced"
FOR EACH ROW EXECUTE FUNCTION _linkZones_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "_linkZones_synced"
FOR EACH ROW EXECUTE FUNCTION _linkZones_delete_local_on_synced_delete_trigger();

-- CreateTable
-- _mobTozone
CREATE TABLE IF NOT EXISTS "_mobTozone_synced" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "_mobTozone_synced_pkey" PRIMARY KEY ("A","B")
);
CREATE TABLE IF NOT EXISTS "_mobTozone_local" (
  "A" TEXT,
  "B" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "_mobTozone_local_pkey" PRIMARY KEY ("A","B")
);

CREATE OR REPLACE VIEW "_mobTozone" AS
  SELECT
     COALESCE(local."A", synced."A") AS "A",
   COALESCE(local."B", synced."B") AS "B"
  FROM "_mobTozone_synced" AS synced
  FULL OUTER JOIN "_mobTozone_local" AS local
  ON synced."A" = local."A" AND synced."B" = local."B"
  WHERE (local."A" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION _mobTozone_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "_mobTozone_synced" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "_mobTozone_local" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    

    INSERT INTO "_mobTozone_local" (
    "A", "B",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."A", NEW."B",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_mobTozone',
    'insert',
    jsonb_build_object(
        'A', NEW."A",
      'B', NEW."B"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _mobTozone_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "_mobTozone_synced"%ROWTYPE;
    local "_mobTozone_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "_mobTozone_synced" WHERE "A" = NEW."A" AND "B" = NEW."B";
    SELECT * INTO local FROM "_mobTozone_local" WHERE "A" = NEW."A" AND "B" = NEW."B";
    -- no non-pk fields to track
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "_mobTozone_local" (
        "A", "B",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."A", NEW."B",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "_mobTozone_local"
    SET
        -- no non-pk fields,
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "A" = NEW."A" AND "B" = NEW."B";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_mobTozone',
    'update',
    jsonb_build_object(
        'A', NEW."A",
      'B', NEW."B"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _mobTozone_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "_mobTozone_local" WHERE "A" = OLD."A" AND "B" = OLD."B") THEN
    UPDATE "_mobTozone_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "A" = OLD."A" AND "B" = OLD."B";
    ELSE
    INSERT INTO "_mobTozone_local" (
        "A", "B",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."A", OLD."B",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_mobTozone',
    'delete',
    jsonb_build_object('A', OLD."A", 'B', OLD."B"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER _mobTozone_insert
INSTEAD OF INSERT ON "_mobTozone"
FOR EACH ROW EXECUTE FUNCTION _mobTozone_insert_trigger();

CREATE OR REPLACE TRIGGER _mobTozone_update
INSTEAD OF UPDATE ON "_mobTozone"
FOR EACH ROW EXECUTE FUNCTION _mobTozone_update_trigger();

CREATE OR REPLACE TRIGGER _mobTozone_delete
INSTEAD OF DELETE ON "_mobTozone"
FOR EACH ROW EXECUTE FUNCTION _mobTozone_delete_trigger();


CREATE OR REPLACE FUNCTION _mobTozone_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_mobTozone_local"
  WHERE "A" = NEW."A" AND "B" = NEW."B"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION _mobTozone_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_mobTozone_local"
  WHERE "A" = OLD."A" AND "B" = OLD."B";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "_mobTozone_synced"
FOR EACH ROW EXECUTE FUNCTION _mobTozone_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "_mobTozone_synced"
FOR EACH ROW EXECUTE FUNCTION _mobTozone_delete_local_on_synced_delete_trigger();

-- CreateTable
-- _frontRelation
CREATE TABLE IF NOT EXISTS "_frontRelation_synced" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "_frontRelation_synced_pkey" PRIMARY KEY ("A","B")
);
CREATE TABLE IF NOT EXISTS "_frontRelation_local" (
  "A" TEXT,
  "B" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "_frontRelation_local_pkey" PRIMARY KEY ("A","B")
);

CREATE OR REPLACE VIEW "_frontRelation" AS
  SELECT
     COALESCE(local."A", synced."A") AS "A",
   COALESCE(local."B", synced."B") AS "B"
  FROM "_frontRelation_synced" AS synced
  FULL OUTER JOIN "_frontRelation_local" AS local
  ON synced."A" = local."A" AND synced."B" = local."B"
  WHERE (local."A" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION _frontRelation_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "_frontRelation_synced" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "_frontRelation_local" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    

    INSERT INTO "_frontRelation_local" (
    "A", "B",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."A", NEW."B",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_frontRelation',
    'insert',
    jsonb_build_object(
        'A', NEW."A",
      'B', NEW."B"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _frontRelation_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "_frontRelation_synced"%ROWTYPE;
    local "_frontRelation_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "_frontRelation_synced" WHERE "A" = NEW."A" AND "B" = NEW."B";
    SELECT * INTO local FROM "_frontRelation_local" WHERE "A" = NEW."A" AND "B" = NEW."B";
    -- no non-pk fields to track
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "_frontRelation_local" (
        "A", "B",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."A", NEW."B",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "_frontRelation_local"
    SET
        -- no non-pk fields,
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "A" = NEW."A" AND "B" = NEW."B";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_frontRelation',
    'update',
    jsonb_build_object(
        'A', NEW."A",
      'B', NEW."B"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _frontRelation_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "_frontRelation_local" WHERE "A" = OLD."A" AND "B" = OLD."B") THEN
    UPDATE "_frontRelation_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "A" = OLD."A" AND "B" = OLD."B";
    ELSE
    INSERT INTO "_frontRelation_local" (
        "A", "B",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."A", OLD."B",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_frontRelation',
    'delete',
    jsonb_build_object('A', OLD."A", 'B', OLD."B"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER _frontRelation_insert
INSTEAD OF INSERT ON "_frontRelation"
FOR EACH ROW EXECUTE FUNCTION _frontRelation_insert_trigger();

CREATE OR REPLACE TRIGGER _frontRelation_update
INSTEAD OF UPDATE ON "_frontRelation"
FOR EACH ROW EXECUTE FUNCTION _frontRelation_update_trigger();

CREATE OR REPLACE TRIGGER _frontRelation_delete
INSTEAD OF DELETE ON "_frontRelation"
FOR EACH ROW EXECUTE FUNCTION _frontRelation_delete_trigger();


CREATE OR REPLACE FUNCTION _frontRelation_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_frontRelation_local"
  WHERE "A" = NEW."A" AND "B" = NEW."B"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION _frontRelation_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_frontRelation_local"
  WHERE "A" = OLD."A" AND "B" = OLD."B";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "_frontRelation_synced"
FOR EACH ROW EXECUTE FUNCTION _frontRelation_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "_frontRelation_synced"
FOR EACH ROW EXECUTE FUNCTION _frontRelation_delete_local_on_synced_delete_trigger();

-- CreateTable
-- _backRelation
CREATE TABLE IF NOT EXISTS "_backRelation_synced" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "_backRelation_synced_pkey" PRIMARY KEY ("A","B")
);
CREATE TABLE IF NOT EXISTS "_backRelation_local" (
  "A" TEXT,
  "B" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "_backRelation_local_pkey" PRIMARY KEY ("A","B")
);

CREATE OR REPLACE VIEW "_backRelation" AS
  SELECT
     COALESCE(local."A", synced."A") AS "A",
   COALESCE(local."B", synced."B") AS "B"
  FROM "_backRelation_synced" AS synced
  FULL OUTER JOIN "_backRelation_local" AS local
  ON synced."A" = local."A" AND synced."B" = local."B"
  WHERE (local."A" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION _backRelation_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "_backRelation_synced" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "_backRelation_local" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    

    INSERT INTO "_backRelation_local" (
    "A", "B",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."A", NEW."B",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_backRelation',
    'insert',
    jsonb_build_object(
        'A', NEW."A",
      'B', NEW."B"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _backRelation_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "_backRelation_synced"%ROWTYPE;
    local "_backRelation_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "_backRelation_synced" WHERE "A" = NEW."A" AND "B" = NEW."B";
    SELECT * INTO local FROM "_backRelation_local" WHERE "A" = NEW."A" AND "B" = NEW."B";
    -- no non-pk fields to track
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "_backRelation_local" (
        "A", "B",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."A", NEW."B",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "_backRelation_local"
    SET
        -- no non-pk fields,
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "A" = NEW."A" AND "B" = NEW."B";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_backRelation',
    'update',
    jsonb_build_object(
        'A', NEW."A",
      'B', NEW."B"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _backRelation_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "_backRelation_local" WHERE "A" = OLD."A" AND "B" = OLD."B") THEN
    UPDATE "_backRelation_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "A" = OLD."A" AND "B" = OLD."B";
    ELSE
    INSERT INTO "_backRelation_local" (
        "A", "B",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."A", OLD."B",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_backRelation',
    'delete',
    jsonb_build_object('A', OLD."A", 'B', OLD."B"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER _backRelation_insert
INSTEAD OF INSERT ON "_backRelation"
FOR EACH ROW EXECUTE FUNCTION _backRelation_insert_trigger();

CREATE OR REPLACE TRIGGER _backRelation_update
INSTEAD OF UPDATE ON "_backRelation"
FOR EACH ROW EXECUTE FUNCTION _backRelation_update_trigger();

CREATE OR REPLACE TRIGGER _backRelation_delete
INSTEAD OF DELETE ON "_backRelation"
FOR EACH ROW EXECUTE FUNCTION _backRelation_delete_trigger();


CREATE OR REPLACE FUNCTION _backRelation_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_backRelation_local"
  WHERE "A" = NEW."A" AND "B" = NEW."B"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION _backRelation_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_backRelation_local"
  WHERE "A" = OLD."A" AND "B" = OLD."B";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "_backRelation_synced"
FOR EACH ROW EXECUTE FUNCTION _backRelation_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "_backRelation_synced"
FOR EACH ROW EXECUTE FUNCTION _backRelation_delete_local_on_synced_delete_trigger();

-- CreateTable
-- _crystalToweapon
CREATE TABLE IF NOT EXISTS "_crystalToweapon_synced" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "_crystalToweapon_synced_pkey" PRIMARY KEY ("A","B")
);
CREATE TABLE IF NOT EXISTS "_crystalToweapon_local" (
  "A" TEXT,
  "B" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "_crystalToweapon_local_pkey" PRIMARY KEY ("A","B")
);

CREATE OR REPLACE VIEW "_crystalToweapon" AS
  SELECT
     COALESCE(local."A", synced."A") AS "A",
   COALESCE(local."B", synced."B") AS "B"
  FROM "_crystalToweapon_synced" AS synced
  FULL OUTER JOIN "_crystalToweapon_local" AS local
  ON synced."A" = local."A" AND synced."B" = local."B"
  WHERE (local."A" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION _crystalToweapon_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "_crystalToweapon_synced" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "_crystalToweapon_local" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    

    INSERT INTO "_crystalToweapon_local" (
    "A", "B",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."A", NEW."B",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_crystalToweapon',
    'insert',
    jsonb_build_object(
        'A', NEW."A",
      'B', NEW."B"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _crystalToweapon_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "_crystalToweapon_synced"%ROWTYPE;
    local "_crystalToweapon_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "_crystalToweapon_synced" WHERE "A" = NEW."A" AND "B" = NEW."B";
    SELECT * INTO local FROM "_crystalToweapon_local" WHERE "A" = NEW."A" AND "B" = NEW."B";
    -- no non-pk fields to track
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "_crystalToweapon_local" (
        "A", "B",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."A", NEW."B",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "_crystalToweapon_local"
    SET
        -- no non-pk fields,
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "A" = NEW."A" AND "B" = NEW."B";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_crystalToweapon',
    'update',
    jsonb_build_object(
        'A', NEW."A",
      'B', NEW."B"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _crystalToweapon_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "_crystalToweapon_local" WHERE "A" = OLD."A" AND "B" = OLD."B") THEN
    UPDATE "_crystalToweapon_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "A" = OLD."A" AND "B" = OLD."B";
    ELSE
    INSERT INTO "_crystalToweapon_local" (
        "A", "B",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."A", OLD."B",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_crystalToweapon',
    'delete',
    jsonb_build_object('A', OLD."A", 'B', OLD."B"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER _crystalToweapon_insert
INSTEAD OF INSERT ON "_crystalToweapon"
FOR EACH ROW EXECUTE FUNCTION _crystalToweapon_insert_trigger();

CREATE OR REPLACE TRIGGER _crystalToweapon_update
INSTEAD OF UPDATE ON "_crystalToweapon"
FOR EACH ROW EXECUTE FUNCTION _crystalToweapon_update_trigger();

CREATE OR REPLACE TRIGGER _crystalToweapon_delete
INSTEAD OF DELETE ON "_crystalToweapon"
FOR EACH ROW EXECUTE FUNCTION _crystalToweapon_delete_trigger();


CREATE OR REPLACE FUNCTION _crystalToweapon_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_crystalToweapon_local"
  WHERE "A" = NEW."A" AND "B" = NEW."B"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION _crystalToweapon_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_crystalToweapon_local"
  WHERE "A" = OLD."A" AND "B" = OLD."B";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "_crystalToweapon_synced"
FOR EACH ROW EXECUTE FUNCTION _crystalToweapon_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "_crystalToweapon_synced"
FOR EACH ROW EXECUTE FUNCTION _crystalToweapon_delete_local_on_synced_delete_trigger();

-- CreateTable
-- _crystalToplayer_weapon
CREATE TABLE IF NOT EXISTS "_crystalToplayer_weapon_synced" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "_crystalToplayer_weapon_synced_pkey" PRIMARY KEY ("A","B")
);
CREATE TABLE IF NOT EXISTS "_crystalToplayer_weapon_local" (
  "A" TEXT,
  "B" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "_crystalToplayer_weapon_local_pkey" PRIMARY KEY ("A","B")
);

CREATE OR REPLACE VIEW "_crystalToplayer_weapon" AS
  SELECT
     COALESCE(local."A", synced."A") AS "A",
   COALESCE(local."B", synced."B") AS "B"
  FROM "_crystalToplayer_weapon_synced" AS synced
  FULL OUTER JOIN "_crystalToplayer_weapon_local" AS local
  ON synced."A" = local."A" AND synced."B" = local."B"
  WHERE (local."A" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION _crystalToplayer_weapon_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "_crystalToplayer_weapon_synced" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "_crystalToplayer_weapon_local" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    

    INSERT INTO "_crystalToplayer_weapon_local" (
    "A", "B",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."A", NEW."B",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_crystalToplayer_weapon',
    'insert',
    jsonb_build_object(
        'A', NEW."A",
      'B', NEW."B"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _crystalToplayer_weapon_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "_crystalToplayer_weapon_synced"%ROWTYPE;
    local "_crystalToplayer_weapon_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "_crystalToplayer_weapon_synced" WHERE "A" = NEW."A" AND "B" = NEW."B";
    SELECT * INTO local FROM "_crystalToplayer_weapon_local" WHERE "A" = NEW."A" AND "B" = NEW."B";
    -- no non-pk fields to track
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "_crystalToplayer_weapon_local" (
        "A", "B",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."A", NEW."B",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "_crystalToplayer_weapon_local"
    SET
        -- no non-pk fields,
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "A" = NEW."A" AND "B" = NEW."B";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_crystalToplayer_weapon',
    'update',
    jsonb_build_object(
        'A', NEW."A",
      'B', NEW."B"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _crystalToplayer_weapon_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "_crystalToplayer_weapon_local" WHERE "A" = OLD."A" AND "B" = OLD."B") THEN
    UPDATE "_crystalToplayer_weapon_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "A" = OLD."A" AND "B" = OLD."B";
    ELSE
    INSERT INTO "_crystalToplayer_weapon_local" (
        "A", "B",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."A", OLD."B",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_crystalToplayer_weapon',
    'delete',
    jsonb_build_object('A', OLD."A", 'B', OLD."B"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER _crystalToplayer_weapon_insert
INSTEAD OF INSERT ON "_crystalToplayer_weapon"
FOR EACH ROW EXECUTE FUNCTION _crystalToplayer_weapon_insert_trigger();

CREATE OR REPLACE TRIGGER _crystalToplayer_weapon_update
INSTEAD OF UPDATE ON "_crystalToplayer_weapon"
FOR EACH ROW EXECUTE FUNCTION _crystalToplayer_weapon_update_trigger();

CREATE OR REPLACE TRIGGER _crystalToplayer_weapon_delete
INSTEAD OF DELETE ON "_crystalToplayer_weapon"
FOR EACH ROW EXECUTE FUNCTION _crystalToplayer_weapon_delete_trigger();


CREATE OR REPLACE FUNCTION _crystalToplayer_weapon_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_crystalToplayer_weapon_local"
  WHERE "A" = NEW."A" AND "B" = NEW."B"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION _crystalToplayer_weapon_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_crystalToplayer_weapon_local"
  WHERE "A" = OLD."A" AND "B" = OLD."B";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "_crystalToplayer_weapon_synced"
FOR EACH ROW EXECUTE FUNCTION _crystalToplayer_weapon_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "_crystalToplayer_weapon_synced"
FOR EACH ROW EXECUTE FUNCTION _crystalToplayer_weapon_delete_local_on_synced_delete_trigger();

-- CreateTable
-- _crystalToplayer_armor
CREATE TABLE IF NOT EXISTS "_crystalToplayer_armor_synced" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "_crystalToplayer_armor_synced_pkey" PRIMARY KEY ("A","B")
);
CREATE TABLE IF NOT EXISTS "_crystalToplayer_armor_local" (
  "A" TEXT,
  "B" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "_crystalToplayer_armor_local_pkey" PRIMARY KEY ("A","B")
);

CREATE OR REPLACE VIEW "_crystalToplayer_armor" AS
  SELECT
     COALESCE(local."A", synced."A") AS "A",
   COALESCE(local."B", synced."B") AS "B"
  FROM "_crystalToplayer_armor_synced" AS synced
  FULL OUTER JOIN "_crystalToplayer_armor_local" AS local
  ON synced."A" = local."A" AND synced."B" = local."B"
  WHERE (local."A" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION _crystalToplayer_armor_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "_crystalToplayer_armor_synced" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "_crystalToplayer_armor_local" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    

    INSERT INTO "_crystalToplayer_armor_local" (
    "A", "B",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."A", NEW."B",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_crystalToplayer_armor',
    'insert',
    jsonb_build_object(
        'A', NEW."A",
      'B', NEW."B"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _crystalToplayer_armor_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "_crystalToplayer_armor_synced"%ROWTYPE;
    local "_crystalToplayer_armor_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "_crystalToplayer_armor_synced" WHERE "A" = NEW."A" AND "B" = NEW."B";
    SELECT * INTO local FROM "_crystalToplayer_armor_local" WHERE "A" = NEW."A" AND "B" = NEW."B";
    -- no non-pk fields to track
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "_crystalToplayer_armor_local" (
        "A", "B",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."A", NEW."B",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "_crystalToplayer_armor_local"
    SET
        -- no non-pk fields,
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "A" = NEW."A" AND "B" = NEW."B";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_crystalToplayer_armor',
    'update',
    jsonb_build_object(
        'A', NEW."A",
      'B', NEW."B"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _crystalToplayer_armor_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "_crystalToplayer_armor_local" WHERE "A" = OLD."A" AND "B" = OLD."B") THEN
    UPDATE "_crystalToplayer_armor_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "A" = OLD."A" AND "B" = OLD."B";
    ELSE
    INSERT INTO "_crystalToplayer_armor_local" (
        "A", "B",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."A", OLD."B",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_crystalToplayer_armor',
    'delete',
    jsonb_build_object('A', OLD."A", 'B', OLD."B"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER _crystalToplayer_armor_insert
INSTEAD OF INSERT ON "_crystalToplayer_armor"
FOR EACH ROW EXECUTE FUNCTION _crystalToplayer_armor_insert_trigger();

CREATE OR REPLACE TRIGGER _crystalToplayer_armor_update
INSTEAD OF UPDATE ON "_crystalToplayer_armor"
FOR EACH ROW EXECUTE FUNCTION _crystalToplayer_armor_update_trigger();

CREATE OR REPLACE TRIGGER _crystalToplayer_armor_delete
INSTEAD OF DELETE ON "_crystalToplayer_armor"
FOR EACH ROW EXECUTE FUNCTION _crystalToplayer_armor_delete_trigger();


CREATE OR REPLACE FUNCTION _crystalToplayer_armor_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_crystalToplayer_armor_local"
  WHERE "A" = NEW."A" AND "B" = NEW."B"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION _crystalToplayer_armor_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_crystalToplayer_armor_local"
  WHERE "A" = OLD."A" AND "B" = OLD."B";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "_crystalToplayer_armor_synced"
FOR EACH ROW EXECUTE FUNCTION _crystalToplayer_armor_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "_crystalToplayer_armor_synced"
FOR EACH ROW EXECUTE FUNCTION _crystalToplayer_armor_delete_local_on_synced_delete_trigger();

-- CreateTable
-- _crystalTooption
CREATE TABLE IF NOT EXISTS "_crystalTooption_synced" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "_crystalTooption_synced_pkey" PRIMARY KEY ("A","B")
);
CREATE TABLE IF NOT EXISTS "_crystalTooption_local" (
  "A" TEXT,
  "B" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "_crystalTooption_local_pkey" PRIMARY KEY ("A","B")
);

CREATE OR REPLACE VIEW "_crystalTooption" AS
  SELECT
     COALESCE(local."A", synced."A") AS "A",
   COALESCE(local."B", synced."B") AS "B"
  FROM "_crystalTooption_synced" AS synced
  FULL OUTER JOIN "_crystalTooption_local" AS local
  ON synced."A" = local."A" AND synced."B" = local."B"
  WHERE (local."A" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION _crystalTooption_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "_crystalTooption_synced" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "_crystalTooption_local" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    

    INSERT INTO "_crystalTooption_local" (
    "A", "B",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."A", NEW."B",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_crystalTooption',
    'insert',
    jsonb_build_object(
        'A', NEW."A",
      'B', NEW."B"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _crystalTooption_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "_crystalTooption_synced"%ROWTYPE;
    local "_crystalTooption_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "_crystalTooption_synced" WHERE "A" = NEW."A" AND "B" = NEW."B";
    SELECT * INTO local FROM "_crystalTooption_local" WHERE "A" = NEW."A" AND "B" = NEW."B";
    -- no non-pk fields to track
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "_crystalTooption_local" (
        "A", "B",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."A", NEW."B",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "_crystalTooption_local"
    SET
        -- no non-pk fields,
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "A" = NEW."A" AND "B" = NEW."B";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_crystalTooption',
    'update',
    jsonb_build_object(
        'A', NEW."A",
      'B', NEW."B"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _crystalTooption_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "_crystalTooption_local" WHERE "A" = OLD."A" AND "B" = OLD."B") THEN
    UPDATE "_crystalTooption_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "A" = OLD."A" AND "B" = OLD."B";
    ELSE
    INSERT INTO "_crystalTooption_local" (
        "A", "B",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."A", OLD."B",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_crystalTooption',
    'delete',
    jsonb_build_object('A', OLD."A", 'B', OLD."B"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER _crystalTooption_insert
INSTEAD OF INSERT ON "_crystalTooption"
FOR EACH ROW EXECUTE FUNCTION _crystalTooption_insert_trigger();

CREATE OR REPLACE TRIGGER _crystalTooption_update
INSTEAD OF UPDATE ON "_crystalTooption"
FOR EACH ROW EXECUTE FUNCTION _crystalTooption_update_trigger();

CREATE OR REPLACE TRIGGER _crystalTooption_delete
INSTEAD OF DELETE ON "_crystalTooption"
FOR EACH ROW EXECUTE FUNCTION _crystalTooption_delete_trigger();


CREATE OR REPLACE FUNCTION _crystalTooption_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_crystalTooption_local"
  WHERE "A" = NEW."A" AND "B" = NEW."B"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION _crystalTooption_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_crystalTooption_local"
  WHERE "A" = OLD."A" AND "B" = OLD."B";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "_crystalTooption_synced"
FOR EACH ROW EXECUTE FUNCTION _crystalTooption_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "_crystalTooption_synced"
FOR EACH ROW EXECUTE FUNCTION _crystalTooption_delete_local_on_synced_delete_trigger();

-- CreateTable
-- _crystalToplayer_option
CREATE TABLE IF NOT EXISTS "_crystalToplayer_option_synced" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "_crystalToplayer_option_synced_pkey" PRIMARY KEY ("A","B")
);
CREATE TABLE IF NOT EXISTS "_crystalToplayer_option_local" (
  "A" TEXT,
  "B" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "_crystalToplayer_option_local_pkey" PRIMARY KEY ("A","B")
);

CREATE OR REPLACE VIEW "_crystalToplayer_option" AS
  SELECT
     COALESCE(local."A", synced."A") AS "A",
   COALESCE(local."B", synced."B") AS "B"
  FROM "_crystalToplayer_option_synced" AS synced
  FULL OUTER JOIN "_crystalToplayer_option_local" AS local
  ON synced."A" = local."A" AND synced."B" = local."B"
  WHERE (local."A" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION _crystalToplayer_option_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "_crystalToplayer_option_synced" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "_crystalToplayer_option_local" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    

    INSERT INTO "_crystalToplayer_option_local" (
    "A", "B",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."A", NEW."B",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_crystalToplayer_option',
    'insert',
    jsonb_build_object(
        'A', NEW."A",
      'B', NEW."B"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _crystalToplayer_option_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "_crystalToplayer_option_synced"%ROWTYPE;
    local "_crystalToplayer_option_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "_crystalToplayer_option_synced" WHERE "A" = NEW."A" AND "B" = NEW."B";
    SELECT * INTO local FROM "_crystalToplayer_option_local" WHERE "A" = NEW."A" AND "B" = NEW."B";
    -- no non-pk fields to track
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "_crystalToplayer_option_local" (
        "A", "B",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."A", NEW."B",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "_crystalToplayer_option_local"
    SET
        -- no non-pk fields,
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "A" = NEW."A" AND "B" = NEW."B";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_crystalToplayer_option',
    'update',
    jsonb_build_object(
        'A', NEW."A",
      'B', NEW."B"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _crystalToplayer_option_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "_crystalToplayer_option_local" WHERE "A" = OLD."A" AND "B" = OLD."B") THEN
    UPDATE "_crystalToplayer_option_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "A" = OLD."A" AND "B" = OLD."B";
    ELSE
    INSERT INTO "_crystalToplayer_option_local" (
        "A", "B",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."A", OLD."B",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_crystalToplayer_option',
    'delete',
    jsonb_build_object('A', OLD."A", 'B', OLD."B"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER _crystalToplayer_option_insert
INSTEAD OF INSERT ON "_crystalToplayer_option"
FOR EACH ROW EXECUTE FUNCTION _crystalToplayer_option_insert_trigger();

CREATE OR REPLACE TRIGGER _crystalToplayer_option_update
INSTEAD OF UPDATE ON "_crystalToplayer_option"
FOR EACH ROW EXECUTE FUNCTION _crystalToplayer_option_update_trigger();

CREATE OR REPLACE TRIGGER _crystalToplayer_option_delete
INSTEAD OF DELETE ON "_crystalToplayer_option"
FOR EACH ROW EXECUTE FUNCTION _crystalToplayer_option_delete_trigger();


CREATE OR REPLACE FUNCTION _crystalToplayer_option_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_crystalToplayer_option_local"
  WHERE "A" = NEW."A" AND "B" = NEW."B"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION _crystalToplayer_option_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_crystalToplayer_option_local"
  WHERE "A" = OLD."A" AND "B" = OLD."B";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "_crystalToplayer_option_synced"
FOR EACH ROW EXECUTE FUNCTION _crystalToplayer_option_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "_crystalToplayer_option_synced"
FOR EACH ROW EXECUTE FUNCTION _crystalToplayer_option_delete_local_on_synced_delete_trigger();

-- CreateTable
-- _crystalTospecial
CREATE TABLE IF NOT EXISTS "_crystalTospecial_synced" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "_crystalTospecial_synced_pkey" PRIMARY KEY ("A","B")
);
CREATE TABLE IF NOT EXISTS "_crystalTospecial_local" (
  "A" TEXT,
  "B" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "_crystalTospecial_local_pkey" PRIMARY KEY ("A","B")
);

CREATE OR REPLACE VIEW "_crystalTospecial" AS
  SELECT
     COALESCE(local."A", synced."A") AS "A",
   COALESCE(local."B", synced."B") AS "B"
  FROM "_crystalTospecial_synced" AS synced
  FULL OUTER JOIN "_crystalTospecial_local" AS local
  ON synced."A" = local."A" AND synced."B" = local."B"
  WHERE (local."A" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION _crystalTospecial_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "_crystalTospecial_synced" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "_crystalTospecial_local" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    

    INSERT INTO "_crystalTospecial_local" (
    "A", "B",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."A", NEW."B",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_crystalTospecial',
    'insert',
    jsonb_build_object(
        'A', NEW."A",
      'B', NEW."B"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _crystalTospecial_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "_crystalTospecial_synced"%ROWTYPE;
    local "_crystalTospecial_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "_crystalTospecial_synced" WHERE "A" = NEW."A" AND "B" = NEW."B";
    SELECT * INTO local FROM "_crystalTospecial_local" WHERE "A" = NEW."A" AND "B" = NEW."B";
    -- no non-pk fields to track
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "_crystalTospecial_local" (
        "A", "B",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."A", NEW."B",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "_crystalTospecial_local"
    SET
        -- no non-pk fields,
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "A" = NEW."A" AND "B" = NEW."B";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_crystalTospecial',
    'update',
    jsonb_build_object(
        'A', NEW."A",
      'B', NEW."B"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _crystalTospecial_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "_crystalTospecial_local" WHERE "A" = OLD."A" AND "B" = OLD."B") THEN
    UPDATE "_crystalTospecial_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "A" = OLD."A" AND "B" = OLD."B";
    ELSE
    INSERT INTO "_crystalTospecial_local" (
        "A", "B",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."A", OLD."B",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_crystalTospecial',
    'delete',
    jsonb_build_object('A', OLD."A", 'B', OLD."B"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER _crystalTospecial_insert
INSTEAD OF INSERT ON "_crystalTospecial"
FOR EACH ROW EXECUTE FUNCTION _crystalTospecial_insert_trigger();

CREATE OR REPLACE TRIGGER _crystalTospecial_update
INSTEAD OF UPDATE ON "_crystalTospecial"
FOR EACH ROW EXECUTE FUNCTION _crystalTospecial_update_trigger();

CREATE OR REPLACE TRIGGER _crystalTospecial_delete
INSTEAD OF DELETE ON "_crystalTospecial"
FOR EACH ROW EXECUTE FUNCTION _crystalTospecial_delete_trigger();


CREATE OR REPLACE FUNCTION _crystalTospecial_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_crystalTospecial_local"
  WHERE "A" = NEW."A" AND "B" = NEW."B"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION _crystalTospecial_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_crystalTospecial_local"
  WHERE "A" = OLD."A" AND "B" = OLD."B";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "_crystalTospecial_synced"
FOR EACH ROW EXECUTE FUNCTION _crystalTospecial_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "_crystalTospecial_synced"
FOR EACH ROW EXECUTE FUNCTION _crystalTospecial_delete_local_on_synced_delete_trigger();

-- CreateTable
-- _crystalToplayer_special
CREATE TABLE IF NOT EXISTS "_crystalToplayer_special_synced" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "_crystalToplayer_special_synced_pkey" PRIMARY KEY ("A","B")
);
CREATE TABLE IF NOT EXISTS "_crystalToplayer_special_local" (
  "A" TEXT,
  "B" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "_crystalToplayer_special_local_pkey" PRIMARY KEY ("A","B")
);

CREATE OR REPLACE VIEW "_crystalToplayer_special" AS
  SELECT
     COALESCE(local."A", synced."A") AS "A",
   COALESCE(local."B", synced."B") AS "B"
  FROM "_crystalToplayer_special_synced" AS synced
  FULL OUTER JOIN "_crystalToplayer_special_local" AS local
  ON synced."A" = local."A" AND synced."B" = local."B"
  WHERE (local."A" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION _crystalToplayer_special_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "_crystalToplayer_special_synced" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "_crystalToplayer_special_local" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    

    INSERT INTO "_crystalToplayer_special_local" (
    "A", "B",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."A", NEW."B",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_crystalToplayer_special',
    'insert',
    jsonb_build_object(
        'A', NEW."A",
      'B', NEW."B"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _crystalToplayer_special_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "_crystalToplayer_special_synced"%ROWTYPE;
    local "_crystalToplayer_special_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "_crystalToplayer_special_synced" WHERE "A" = NEW."A" AND "B" = NEW."B";
    SELECT * INTO local FROM "_crystalToplayer_special_local" WHERE "A" = NEW."A" AND "B" = NEW."B";
    -- no non-pk fields to track
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "_crystalToplayer_special_local" (
        "A", "B",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."A", NEW."B",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "_crystalToplayer_special_local"
    SET
        -- no non-pk fields,
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "A" = NEW."A" AND "B" = NEW."B";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_crystalToplayer_special',
    'update',
    jsonb_build_object(
        'A', NEW."A",
      'B', NEW."B"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _crystalToplayer_special_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "_crystalToplayer_special_local" WHERE "A" = OLD."A" AND "B" = OLD."B") THEN
    UPDATE "_crystalToplayer_special_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "A" = OLD."A" AND "B" = OLD."B";
    ELSE
    INSERT INTO "_crystalToplayer_special_local" (
        "A", "B",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."A", OLD."B",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_crystalToplayer_special',
    'delete',
    jsonb_build_object('A', OLD."A", 'B', OLD."B"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER _crystalToplayer_special_insert
INSTEAD OF INSERT ON "_crystalToplayer_special"
FOR EACH ROW EXECUTE FUNCTION _crystalToplayer_special_insert_trigger();

CREATE OR REPLACE TRIGGER _crystalToplayer_special_update
INSTEAD OF UPDATE ON "_crystalToplayer_special"
FOR EACH ROW EXECUTE FUNCTION _crystalToplayer_special_update_trigger();

CREATE OR REPLACE TRIGGER _crystalToplayer_special_delete
INSTEAD OF DELETE ON "_crystalToplayer_special"
FOR EACH ROW EXECUTE FUNCTION _crystalToplayer_special_delete_trigger();


CREATE OR REPLACE FUNCTION _crystalToplayer_special_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_crystalToplayer_special_local"
  WHERE "A" = NEW."A" AND "B" = NEW."B"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION _crystalToplayer_special_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_crystalToplayer_special_local"
  WHERE "A" = OLD."A" AND "B" = OLD."B";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "_crystalToplayer_special_synced"
FOR EACH ROW EXECUTE FUNCTION _crystalToplayer_special_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "_crystalToplayer_special_synced"
FOR EACH ROW EXECUTE FUNCTION _crystalToplayer_special_delete_local_on_synced_delete_trigger();

-- CreateTable
-- _armorTocrystal
CREATE TABLE IF NOT EXISTS "_armorTocrystal_synced" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "_armorTocrystal_synced_pkey" PRIMARY KEY ("A","B")
);
CREATE TABLE IF NOT EXISTS "_armorTocrystal_local" (
  "A" TEXT,
  "B" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "_armorTocrystal_local_pkey" PRIMARY KEY ("A","B")
);

CREATE OR REPLACE VIEW "_armorTocrystal" AS
  SELECT
     COALESCE(local."A", synced."A") AS "A",
   COALESCE(local."B", synced."B") AS "B"
  FROM "_armorTocrystal_synced" AS synced
  FULL OUTER JOIN "_armorTocrystal_local" AS local
  ON synced."A" = local."A" AND synced."B" = local."B"
  WHERE (local."A" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION _armorTocrystal_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "_armorTocrystal_synced" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "_armorTocrystal_local" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    

    INSERT INTO "_armorTocrystal_local" (
    "A", "B",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."A", NEW."B",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_armorTocrystal',
    'insert',
    jsonb_build_object(
        'A', NEW."A",
      'B', NEW."B"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _armorTocrystal_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "_armorTocrystal_synced"%ROWTYPE;
    local "_armorTocrystal_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "_armorTocrystal_synced" WHERE "A" = NEW."A" AND "B" = NEW."B";
    SELECT * INTO local FROM "_armorTocrystal_local" WHERE "A" = NEW."A" AND "B" = NEW."B";
    -- no non-pk fields to track
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "_armorTocrystal_local" (
        "A", "B",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."A", NEW."B",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "_armorTocrystal_local"
    SET
        -- no non-pk fields,
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "A" = NEW."A" AND "B" = NEW."B";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_armorTocrystal',
    'update',
    jsonb_build_object(
        'A', NEW."A",
      'B', NEW."B"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _armorTocrystal_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "_armorTocrystal_local" WHERE "A" = OLD."A" AND "B" = OLD."B") THEN
    UPDATE "_armorTocrystal_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "A" = OLD."A" AND "B" = OLD."B";
    ELSE
    INSERT INTO "_armorTocrystal_local" (
        "A", "B",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."A", OLD."B",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_armorTocrystal',
    'delete',
    jsonb_build_object('A', OLD."A", 'B', OLD."B"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER _armorTocrystal_insert
INSTEAD OF INSERT ON "_armorTocrystal"
FOR EACH ROW EXECUTE FUNCTION _armorTocrystal_insert_trigger();

CREATE OR REPLACE TRIGGER _armorTocrystal_update
INSTEAD OF UPDATE ON "_armorTocrystal"
FOR EACH ROW EXECUTE FUNCTION _armorTocrystal_update_trigger();

CREATE OR REPLACE TRIGGER _armorTocrystal_delete
INSTEAD OF DELETE ON "_armorTocrystal"
FOR EACH ROW EXECUTE FUNCTION _armorTocrystal_delete_trigger();


CREATE OR REPLACE FUNCTION _armorTocrystal_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_armorTocrystal_local"
  WHERE "A" = NEW."A" AND "B" = NEW."B"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION _armorTocrystal_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_armorTocrystal_local"
  WHERE "A" = OLD."A" AND "B" = OLD."B";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "_armorTocrystal_synced"
FOR EACH ROW EXECUTE FUNCTION _armorTocrystal_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "_armorTocrystal_synced"
FOR EACH ROW EXECUTE FUNCTION _armorTocrystal_delete_local_on_synced_delete_trigger();

-- CreateTable
-- _avatarTocharacter
CREATE TABLE IF NOT EXISTS "_avatarTocharacter_synced" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "_avatarTocharacter_synced_pkey" PRIMARY KEY ("A","B")
);
CREATE TABLE IF NOT EXISTS "_avatarTocharacter_local" (
  "A" TEXT,
  "B" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "_avatarTocharacter_local_pkey" PRIMARY KEY ("A","B")
);

CREATE OR REPLACE VIEW "_avatarTocharacter" AS
  SELECT
     COALESCE(local."A", synced."A") AS "A",
   COALESCE(local."B", synced."B") AS "B"
  FROM "_avatarTocharacter_synced" AS synced
  FULL OUTER JOIN "_avatarTocharacter_local" AS local
  ON synced."A" = local."A" AND synced."B" = local."B"
  WHERE (local."A" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION _avatarTocharacter_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "_avatarTocharacter_synced" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "_avatarTocharacter_local" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    

    INSERT INTO "_avatarTocharacter_local" (
    "A", "B",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."A", NEW."B",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_avatarTocharacter',
    'insert',
    jsonb_build_object(
        'A', NEW."A",
      'B', NEW."B"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _avatarTocharacter_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "_avatarTocharacter_synced"%ROWTYPE;
    local "_avatarTocharacter_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "_avatarTocharacter_synced" WHERE "A" = NEW."A" AND "B" = NEW."B";
    SELECT * INTO local FROM "_avatarTocharacter_local" WHERE "A" = NEW."A" AND "B" = NEW."B";
    -- no non-pk fields to track
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "_avatarTocharacter_local" (
        "A", "B",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."A", NEW."B",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "_avatarTocharacter_local"
    SET
        -- no non-pk fields,
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "A" = NEW."A" AND "B" = NEW."B";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_avatarTocharacter',
    'update',
    jsonb_build_object(
        'A', NEW."A",
      'B', NEW."B"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _avatarTocharacter_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "_avatarTocharacter_local" WHERE "A" = OLD."A" AND "B" = OLD."B") THEN
    UPDATE "_avatarTocharacter_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "A" = OLD."A" AND "B" = OLD."B";
    ELSE
    INSERT INTO "_avatarTocharacter_local" (
        "A", "B",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."A", OLD."B",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_avatarTocharacter',
    'delete',
    jsonb_build_object('A', OLD."A", 'B', OLD."B"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER _avatarTocharacter_insert
INSTEAD OF INSERT ON "_avatarTocharacter"
FOR EACH ROW EXECUTE FUNCTION _avatarTocharacter_insert_trigger();

CREATE OR REPLACE TRIGGER _avatarTocharacter_update
INSTEAD OF UPDATE ON "_avatarTocharacter"
FOR EACH ROW EXECUTE FUNCTION _avatarTocharacter_update_trigger();

CREATE OR REPLACE TRIGGER _avatarTocharacter_delete
INSTEAD OF DELETE ON "_avatarTocharacter"
FOR EACH ROW EXECUTE FUNCTION _avatarTocharacter_delete_trigger();


CREATE OR REPLACE FUNCTION _avatarTocharacter_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_avatarTocharacter_local"
  WHERE "A" = NEW."A" AND "B" = NEW."B"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION _avatarTocharacter_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_avatarTocharacter_local"
  WHERE "A" = OLD."A" AND "B" = OLD."B";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "_avatarTocharacter_synced"
FOR EACH ROW EXECUTE FUNCTION _avatarTocharacter_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "_avatarTocharacter_synced"
FOR EACH ROW EXECUTE FUNCTION _avatarTocharacter_delete_local_on_synced_delete_trigger();

-- CreateTable
-- _characterToconsumable
CREATE TABLE IF NOT EXISTS "_characterToconsumable_synced" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "_characterToconsumable_synced_pkey" PRIMARY KEY ("A","B")
);
CREATE TABLE IF NOT EXISTS "_characterToconsumable_local" (
  "A" TEXT,
  "B" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "_characterToconsumable_local_pkey" PRIMARY KEY ("A","B")
);

CREATE OR REPLACE VIEW "_characterToconsumable" AS
  SELECT
     COALESCE(local."A", synced."A") AS "A",
   COALESCE(local."B", synced."B") AS "B"
  FROM "_characterToconsumable_synced" AS synced
  FULL OUTER JOIN "_characterToconsumable_local" AS local
  ON synced."A" = local."A" AND synced."B" = local."B"
  WHERE (local."A" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION _characterToconsumable_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "_characterToconsumable_synced" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "_characterToconsumable_local" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    

    INSERT INTO "_characterToconsumable_local" (
    "A", "B",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."A", NEW."B",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_characterToconsumable',
    'insert',
    jsonb_build_object(
        'A', NEW."A",
      'B', NEW."B"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _characterToconsumable_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "_characterToconsumable_synced"%ROWTYPE;
    local "_characterToconsumable_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "_characterToconsumable_synced" WHERE "A" = NEW."A" AND "B" = NEW."B";
    SELECT * INTO local FROM "_characterToconsumable_local" WHERE "A" = NEW."A" AND "B" = NEW."B";
    -- no non-pk fields to track
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "_characterToconsumable_local" (
        "A", "B",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."A", NEW."B",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "_characterToconsumable_local"
    SET
        -- no non-pk fields,
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "A" = NEW."A" AND "B" = NEW."B";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_characterToconsumable',
    'update',
    jsonb_build_object(
        'A', NEW."A",
      'B', NEW."B"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _characterToconsumable_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "_characterToconsumable_local" WHERE "A" = OLD."A" AND "B" = OLD."B") THEN
    UPDATE "_characterToconsumable_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "A" = OLD."A" AND "B" = OLD."B";
    ELSE
    INSERT INTO "_characterToconsumable_local" (
        "A", "B",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."A", OLD."B",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_characterToconsumable',
    'delete',
    jsonb_build_object('A', OLD."A", 'B', OLD."B"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER _characterToconsumable_insert
INSTEAD OF INSERT ON "_characterToconsumable"
FOR EACH ROW EXECUTE FUNCTION _characterToconsumable_insert_trigger();

CREATE OR REPLACE TRIGGER _characterToconsumable_update
INSTEAD OF UPDATE ON "_characterToconsumable"
FOR EACH ROW EXECUTE FUNCTION _characterToconsumable_update_trigger();

CREATE OR REPLACE TRIGGER _characterToconsumable_delete
INSTEAD OF DELETE ON "_characterToconsumable"
FOR EACH ROW EXECUTE FUNCTION _characterToconsumable_delete_trigger();


CREATE OR REPLACE FUNCTION _characterToconsumable_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_characterToconsumable_local"
  WHERE "A" = NEW."A" AND "B" = NEW."B"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION _characterToconsumable_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_characterToconsumable_local"
  WHERE "A" = OLD."A" AND "B" = OLD."B";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "_characterToconsumable_synced"
FOR EACH ROW EXECUTE FUNCTION _characterToconsumable_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "_characterToconsumable_synced"
FOR EACH ROW EXECUTE FUNCTION _characterToconsumable_delete_local_on_synced_delete_trigger();

-- CreateTable
-- _campA
CREATE TABLE IF NOT EXISTS "_campA_synced" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "_campA_synced_pkey" PRIMARY KEY ("A","B")
);
CREATE TABLE IF NOT EXISTS "_campA_local" (
  "A" TEXT,
  "B" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "_campA_local_pkey" PRIMARY KEY ("A","B")
);

CREATE OR REPLACE VIEW "_campA" AS
  SELECT
     COALESCE(local."A", synced."A") AS "A",
   COALESCE(local."B", synced."B") AS "B"
  FROM "_campA_synced" AS synced
  FULL OUTER JOIN "_campA_local" AS local
  ON synced."A" = local."A" AND synced."B" = local."B"
  WHERE (local."A" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION _campA_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "_campA_synced" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "_campA_local" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    

    INSERT INTO "_campA_local" (
    "A", "B",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."A", NEW."B",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_campA',
    'insert',
    jsonb_build_object(
        'A', NEW."A",
      'B', NEW."B"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _campA_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "_campA_synced"%ROWTYPE;
    local "_campA_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "_campA_synced" WHERE "A" = NEW."A" AND "B" = NEW."B";
    SELECT * INTO local FROM "_campA_local" WHERE "A" = NEW."A" AND "B" = NEW."B";
    -- no non-pk fields to track
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "_campA_local" (
        "A", "B",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."A", NEW."B",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "_campA_local"
    SET
        -- no non-pk fields,
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "A" = NEW."A" AND "B" = NEW."B";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_campA',
    'update',
    jsonb_build_object(
        'A', NEW."A",
      'B', NEW."B"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _campA_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "_campA_local" WHERE "A" = OLD."A" AND "B" = OLD."B") THEN
    UPDATE "_campA_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "A" = OLD."A" AND "B" = OLD."B";
    ELSE
    INSERT INTO "_campA_local" (
        "A", "B",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."A", OLD."B",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_campA',
    'delete',
    jsonb_build_object('A', OLD."A", 'B', OLD."B"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER _campA_insert
INSTEAD OF INSERT ON "_campA"
FOR EACH ROW EXECUTE FUNCTION _campA_insert_trigger();

CREATE OR REPLACE TRIGGER _campA_update
INSTEAD OF UPDATE ON "_campA"
FOR EACH ROW EXECUTE FUNCTION _campA_update_trigger();

CREATE OR REPLACE TRIGGER _campA_delete
INSTEAD OF DELETE ON "_campA"
FOR EACH ROW EXECUTE FUNCTION _campA_delete_trigger();


CREATE OR REPLACE FUNCTION _campA_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_campA_local"
  WHERE "A" = NEW."A" AND "B" = NEW."B"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION _campA_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_campA_local"
  WHERE "A" = OLD."A" AND "B" = OLD."B";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "_campA_synced"
FOR EACH ROW EXECUTE FUNCTION _campA_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "_campA_synced"
FOR EACH ROW EXECUTE FUNCTION _campA_delete_local_on_synced_delete_trigger();

-- CreateTable
-- _campB
CREATE TABLE IF NOT EXISTS "_campB_synced" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "_campB_synced_pkey" PRIMARY KEY ("A","B")
);
CREATE TABLE IF NOT EXISTS "_campB_local" (
  "A" TEXT,
  "B" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "_campB_local_pkey" PRIMARY KEY ("A","B")
);

CREATE OR REPLACE VIEW "_campB" AS
  SELECT
     COALESCE(local."A", synced."A") AS "A",
   COALESCE(local."B", synced."B") AS "B"
  FROM "_campB_synced" AS synced
  FULL OUTER JOIN "_campB_local" AS local
  ON synced."A" = local."A" AND synced."B" = local."B"
  WHERE (local."A" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION _campB_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "_campB_synced" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "_campB_local" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    

    INSERT INTO "_campB_local" (
    "A", "B",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."A", NEW."B",
    changed_cols,
    FALSE,
    local_write_id
    );

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_campB',
    'insert',
    jsonb_build_object(
        'A', NEW."A",
      'B', NEW."B"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _campB_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "_campB_synced"%ROWTYPE;
    local "_campB_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "_campB_synced" WHERE "A" = NEW."A" AND "B" = NEW."B";
    SELECT * INTO local FROM "_campB_local" WHERE "A" = NEW."A" AND "B" = NEW."B";
    -- no non-pk fields to track
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "_campB_local" (
        "A", "B",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."A", NEW."B",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "_campB_local"
    SET
        -- no non-pk fields,
        -- changed_columns 表示 local 相对 synced 的当前差异集合，重算可移除已回到 synced 值的字段。
        changed_columns = changed_cols,
        write_id = local_write_id
    WHERE "A" = NEW."A" AND "B" = NEW."B";
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_campB',
    'update',
    jsonb_build_object(
        'A', NEW."A",
      'B', NEW."B"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _campB_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "_campB_local" WHERE "A" = OLD."A" AND "B" = OLD."B") THEN
    UPDATE "_campB_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "A" = OLD."A" AND "B" = OLD."B";
    ELSE
    INSERT INTO "_campB_local" (
        "A", "B",
        "is_deleted",
        "write_id"
    )
    VALUES (
        OLD."A", OLD."B",
        TRUE,
        local_write_id
    );
    END IF;

    INSERT INTO changes (
    table_name,
    operation,
    value,
    write_id,
    transaction_id
    )
    VALUES (
    '_campB',
    'delete',
    jsonb_build_object('A', OLD."A", 'B', OLD."B"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER _campB_insert
INSTEAD OF INSERT ON "_campB"
FOR EACH ROW EXECUTE FUNCTION _campB_insert_trigger();

CREATE OR REPLACE TRIGGER _campB_update
INSTEAD OF UPDATE ON "_campB"
FOR EACH ROW EXECUTE FUNCTION _campB_update_trigger();

CREATE OR REPLACE TRIGGER _campB_delete
INSTEAD OF DELETE ON "_campB"
FOR EACH ROW EXECUTE FUNCTION _campB_delete_trigger();


CREATE OR REPLACE FUNCTION _campB_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_campB_local"
  WHERE "A" = NEW."A" AND "B" = NEW."B"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION _campB_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_campB_local"
  WHERE "A" = OLD."A" AND "B" = OLD."B";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "_campB_synced"
FOR EACH ROW EXECUTE FUNCTION _campB_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "_campB_synced"
FOR EACH ROW EXECUTE FUNCTION _campB_delete_local_on_synced_delete_trigger();

CREATE TABLE IF NOT EXISTS changes (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  value JSONB NOT NULL,
  write_id UUID NOT NULL,
  transaction_id XID8 NOT NULL
);

CREATE OR REPLACE FUNCTION changes_notify_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NOTIFY changes;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER changes_notify
AFTER INSERT ON changes
FOR EACH ROW
EXECUTE FUNCTION changes_notify_trigger();
