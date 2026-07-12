-- Alter client columns for character

DROP VIEW IF EXISTS "character" CASCADE;
DROP FUNCTION IF EXISTS character_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS character_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS character_delete_trigger() CASCADE;

ALTER TABLE "character_synced"
DROP COLUMN "actions";

ALTER TABLE "character_local"
DROP COLUMN "actions";

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
    changed_cols := array_append(changed_cols, 'belongToPlayerId');
    changed_cols := array_append(changed_cols, 'details');
    changed_cols := array_append(changed_cols, 'statisticId');

    INSERT INTO "character_local" (
    "id", "name", "lv", "str", "int", "vit", "agi", "dex", "personalityType", "personalityValue", "weaponId", "subWeaponId", "armorId", "optionId", "specialId", "cooking", "modifiers", "partnerSkillAId", "partnerSkillAType", "partnerSkillBId", "partnerSkillBType", "belongToPlayerId", "details", "statisticId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."name", NEW."lv", NEW."str", NEW."int", NEW."vit", NEW."agi", NEW."dex", NEW."personalityType", NEW."personalityValue", NEW."weaponId", NEW."subWeaponId", NEW."armorId", NEW."optionId", NEW."specialId", NEW."cooking", NEW."modifiers", NEW."partnerSkillAId", NEW."partnerSkillAType", NEW."partnerSkillBId", NEW."partnerSkillBType", NEW."belongToPlayerId", NEW."details", NEW."statisticId",
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
        "id", "name", "lv", "str", "int", "vit", "agi", "dex", "personalityType", "personalityValue", "weaponId", "subWeaponId", "armorId", "optionId", "specialId", "cooking", "modifiers", "partnerSkillAId", "partnerSkillAType", "partnerSkillBId", "partnerSkillBType", "belongToPlayerId", "details", "statisticId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."name", NEW."lv", NEW."str", NEW."int", NEW."vit", NEW."agi", NEW."dex", NEW."personalityType", NEW."personalityValue", NEW."weaponId", NEW."subWeaponId", NEW."armorId", NEW."optionId", NEW."specialId", NEW."cooking", NEW."modifiers", NEW."partnerSkillAId", NEW."partnerSkillAType", NEW."partnerSkillBId", NEW."partnerSkillBType", NEW."belongToPlayerId", NEW."details", NEW."statisticId",
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

-- Alter client columns for member

DROP VIEW IF EXISTS "member" CASCADE;
DROP FUNCTION IF EXISTS member_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS member_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS member_delete_trigger() CASCADE;

ALTER TABLE "member_synced"
DROP COLUMN "sequence",
ADD COLUMN "behavior" JSONB NOT NULL,
ADD COLUMN "formationOrder" INTEGER NOT NULL;

ALTER TABLE "member_local"
DROP COLUMN "sequence",
ADD COLUMN "behavior" JSONB,
ADD COLUMN "formationOrder" INTEGER;

CREATE OR REPLACE VIEW "member" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'name' = ANY(local.changed_columns)
      THEN local."name"
      ELSE synced."name"
    END AS "name",
   CASE
    WHEN 'formationOrder' = ANY(local.changed_columns)
      THEN local."formationOrder"
      ELSE synced."formationOrder"
    END AS "formationOrder",
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
    WHEN 'behavior' = ANY(local.changed_columns)
      THEN local."behavior"
      ELSE synced."behavior"
    END AS "behavior",
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
    changed_cols := array_append(changed_cols, 'formationOrder');
    changed_cols := array_append(changed_cols, 'type');
    changed_cols := array_append(changed_cols, 'playerId');
    changed_cols := array_append(changed_cols, 'partnerId');
    changed_cols := array_append(changed_cols, 'mercenaryId');
    changed_cols := array_append(changed_cols, 'mobId');
    changed_cols := array_append(changed_cols, 'mobDifficultyFlag');
    changed_cols := array_append(changed_cols, 'behavior');
    changed_cols := array_append(changed_cols, 'belongToTeamId');

    INSERT INTO "member_local" (
    "id", "name", "formationOrder", "type", "playerId", "partnerId", "mercenaryId", "mobId", "mobDifficultyFlag", "behavior", "belongToTeamId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."name", NEW."formationOrder", NEW."type", NEW."playerId", NEW."partnerId", NEW."mercenaryId", NEW."mobId", NEW."mobDifficultyFlag", NEW."behavior", NEW."belongToTeamId",
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
      'formationOrder', NEW."formationOrder",
      'type', NEW."type",
      'playerId', NEW."playerId",
      'partnerId', NEW."partnerId",
      'mercenaryId', NEW."mercenaryId",
      'mobId', NEW."mobId",
      'mobDifficultyFlag', NEW."mobDifficultyFlag",
      'behavior', NEW."behavior",
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
    IF NEW."formationOrder" IS DISTINCT FROM synced."formationOrder" THEN
      changed_cols := array_append(changed_cols, 'formationOrder');
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
    IF NEW."behavior" IS DISTINCT FROM synced."behavior" THEN
      changed_cols := array_append(changed_cols, 'behavior');
    END IF;
    IF NEW."belongToTeamId" IS DISTINCT FROM synced."belongToTeamId" THEN
      changed_cols := array_append(changed_cols, 'belongToTeamId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "member_local" (
        "id", "name", "formationOrder", "type", "playerId", "partnerId", "mercenaryId", "mobId", "mobDifficultyFlag", "behavior", "belongToTeamId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."name", NEW."formationOrder", NEW."type", NEW."playerId", NEW."partnerId", NEW."mercenaryId", NEW."mobId", NEW."mobDifficultyFlag", NEW."behavior", NEW."belongToTeamId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "member_local"
    SET
        
    "name" = NEW."name",
    "formationOrder" = NEW."formationOrder",
    "type" = NEW."type",
    "playerId" = NEW."playerId",
    "partnerId" = NEW."partnerId",
    "mercenaryId" = NEW."mercenaryId",
    "mobId" = NEW."mobId",
    "mobDifficultyFlag" = NEW."mobDifficultyFlag",
    "behavior" = NEW."behavior",
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
      'formationOrder', NEW."formationOrder",
      'type', NEW."type",
      'playerId', NEW."playerId",
      'partnerId', NEW."partnerId",
      'mercenaryId', NEW."mercenaryId",
      'mobId', NEW."mobId",
      'mobDifficultyFlag', NEW."mobDifficultyFlag",
      'behavior', NEW."behavior",
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
