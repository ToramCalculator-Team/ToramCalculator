-- Alter client columns for skill_variant

DROP VIEW IF EXISTS "skill_variant" CASCADE;
DROP FUNCTION IF EXISTS skill_variant_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS skill_variant_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS skill_variant_delete_trigger() CASCADE;

ALTER TABLE "skill_variant_synced"
DROP COLUMN "targetMainWeaponType",
ADD COLUMN "targetMainWeaponType" TEXT NOT NULL,
DROP COLUMN "targetSubWeaponType",
ADD COLUMN "targetSubWeaponType" TEXT NOT NULL,
DROP COLUMN "targetArmorAbilityType",
ADD COLUMN "targetArmorAbilityType" TEXT NOT NULL;

ALTER TABLE "skill_variant_local"
DROP COLUMN "targetMainWeaponType",
ADD COLUMN "targetMainWeaponType" TEXT,
DROP COLUMN "targetSubWeaponType",
ADD COLUMN "targetSubWeaponType" TEXT,
DROP COLUMN "targetArmorAbilityType",
ADD COLUMN "targetArmorAbilityType" TEXT;

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
