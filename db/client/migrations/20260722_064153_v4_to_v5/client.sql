-- Alter client columns for world

DROP VIEW IF EXISTS "world" CASCADE;
DROP FUNCTION IF EXISTS world_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS world_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS world_delete_trigger() CASCADE;

ALTER TABLE "world_synced"
DROP COLUMN "statisticId",
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "world_local"
DROP COLUMN "statisticId",
ADD COLUMN "createdAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3);

CREATE OR REPLACE VIEW "world" AS
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
    changed_cols := array_append(changed_cols, 'createdAt');
    changed_cols := array_append(changed_cols, 'updatedAt');
    changed_cols := array_append(changed_cols, 'updatedByAccountId');
    changed_cols := array_append(changed_cols, 'createdByAccountId');

    INSERT INTO "world_local" (
    "id", "name", "createdAt", "updatedAt", "updatedByAccountId", "createdByAccountId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."name", NEW."createdAt", NEW."updatedAt", NEW."updatedByAccountId", NEW."createdByAccountId",
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
      'createdAt', NEW."createdAt",
      'updatedAt', NEW."updatedAt",
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
    IF NEW."createdAt" IS DISTINCT FROM synced."createdAt" THEN
      changed_cols := array_append(changed_cols, 'createdAt');
    END IF;
    IF NEW."updatedAt" IS DISTINCT FROM synced."updatedAt" THEN
      changed_cols := array_append(changed_cols, 'updatedAt');
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
        "id", "name", "createdAt", "updatedAt", "updatedByAccountId", "createdByAccountId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."name", NEW."createdAt", NEW."updatedAt", NEW."updatedByAccountId", NEW."createdByAccountId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "world_local"
    SET
        
    "name" = NEW."name",
    "createdAt" = NEW."createdAt",
    "updatedAt" = NEW."updatedAt",
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
      'createdAt', NEW."createdAt",
      'updatedAt', NEW."updatedAt",
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

-- Alter client columns for address

DROP VIEW IF EXISTS "address" CASCADE;
DROP FUNCTION IF EXISTS address_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS address_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS address_delete_trigger() CASCADE;

ALTER TABLE "address_synced"
DROP COLUMN "statisticId",
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "address_local"
DROP COLUMN "statisticId",
ADD COLUMN "createdAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3);

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
    changed_cols := array_append(changed_cols, 'createdAt');
    changed_cols := array_append(changed_cols, 'updatedAt');
    changed_cols := array_append(changed_cols, 'updatedByAccountId');
    changed_cols := array_append(changed_cols, 'createdByAccountId');

    INSERT INTO "address_local" (
    "id", "name", "type", "posX", "posY", "worldId", "createdAt", "updatedAt", "updatedByAccountId", "createdByAccountId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."name", NEW."type", NEW."posX", NEW."posY", NEW."worldId", NEW."createdAt", NEW."updatedAt", NEW."updatedByAccountId", NEW."createdByAccountId",
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
      'createdAt', NEW."createdAt",
      'updatedAt', NEW."updatedAt",
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
    IF NEW."createdAt" IS DISTINCT FROM synced."createdAt" THEN
      changed_cols := array_append(changed_cols, 'createdAt');
    END IF;
    IF NEW."updatedAt" IS DISTINCT FROM synced."updatedAt" THEN
      changed_cols := array_append(changed_cols, 'updatedAt');
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
        "id", "name", "type", "posX", "posY", "worldId", "createdAt", "updatedAt", "updatedByAccountId", "createdByAccountId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."name", NEW."type", NEW."posX", NEW."posY", NEW."worldId", NEW."createdAt", NEW."updatedAt", NEW."updatedByAccountId", NEW."createdByAccountId",
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
    "createdAt" = NEW."createdAt",
    "updatedAt" = NEW."updatedAt",
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
      'createdAt', NEW."createdAt",
      'updatedAt', NEW."updatedAt",
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

-- Alter client columns for activity

DROP VIEW IF EXISTS "activity" CASCADE;
DROP FUNCTION IF EXISTS activity_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS activity_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS activity_delete_trigger() CASCADE;

ALTER TABLE "activity_synced"
DROP COLUMN "statisticId",
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "activity_local"
DROP COLUMN "statisticId",
ADD COLUMN "createdAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3);

CREATE OR REPLACE VIEW "activity" AS
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
    changed_cols := array_append(changed_cols, 'createdAt');
    changed_cols := array_append(changed_cols, 'updatedAt');
    changed_cols := array_append(changed_cols, 'updatedByAccountId');
    changed_cols := array_append(changed_cols, 'createdByAccountId');

    INSERT INTO "activity_local" (
    "id", "name", "createdAt", "updatedAt", "updatedByAccountId", "createdByAccountId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."name", NEW."createdAt", NEW."updatedAt", NEW."updatedByAccountId", NEW."createdByAccountId",
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
      'createdAt', NEW."createdAt",
      'updatedAt', NEW."updatedAt",
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
    IF NEW."createdAt" IS DISTINCT FROM synced."createdAt" THEN
      changed_cols := array_append(changed_cols, 'createdAt');
    END IF;
    IF NEW."updatedAt" IS DISTINCT FROM synced."updatedAt" THEN
      changed_cols := array_append(changed_cols, 'updatedAt');
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
        "id", "name", "createdAt", "updatedAt", "updatedByAccountId", "createdByAccountId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."name", NEW."createdAt", NEW."updatedAt", NEW."updatedByAccountId", NEW."createdByAccountId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "activity_local"
    SET
        
    "name" = NEW."name",
    "createdAt" = NEW."createdAt",
    "updatedAt" = NEW."updatedAt",
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
      'createdAt', NEW."createdAt",
      'updatedAt', NEW."updatedAt",
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

-- Alter client columns for zone

DROP VIEW IF EXISTS "zone" CASCADE;
DROP FUNCTION IF EXISTS zone_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS zone_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS zone_delete_trigger() CASCADE;

ALTER TABLE "zone_synced"
DROP COLUMN "statisticId",
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "zone_local"
DROP COLUMN "statisticId",
ADD COLUMN "createdAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3);

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
    changed_cols := array_append(changed_cols, 'createdAt');
    changed_cols := array_append(changed_cols, 'updatedAt');
    changed_cols := array_append(changed_cols, 'updatedByAccountId');
    changed_cols := array_append(changed_cols, 'createdByAccountId');

    INSERT INTO "zone_local" (
    "id", "name", "rewardNodes", "activityId", "addressId", "createdAt", "updatedAt", "updatedByAccountId", "createdByAccountId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."name", NEW."rewardNodes", NEW."activityId", NEW."addressId", NEW."createdAt", NEW."updatedAt", NEW."updatedByAccountId", NEW."createdByAccountId",
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
      'createdAt', NEW."createdAt",
      'updatedAt', NEW."updatedAt",
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
    IF NEW."createdAt" IS DISTINCT FROM synced."createdAt" THEN
      changed_cols := array_append(changed_cols, 'createdAt');
    END IF;
    IF NEW."updatedAt" IS DISTINCT FROM synced."updatedAt" THEN
      changed_cols := array_append(changed_cols, 'updatedAt');
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
        "id", "name", "rewardNodes", "activityId", "addressId", "createdAt", "updatedAt", "updatedByAccountId", "createdByAccountId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."name", NEW."rewardNodes", NEW."activityId", NEW."addressId", NEW."createdAt", NEW."updatedAt", NEW."updatedByAccountId", NEW."createdByAccountId",
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
    "createdAt" = NEW."createdAt",
    "updatedAt" = NEW."updatedAt",
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
      'createdAt', NEW."createdAt",
      'updatedAt', NEW."updatedAt",
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

-- Alter client columns for mob

DROP VIEW IF EXISTS "mob" CASCADE;
DROP FUNCTION IF EXISTS mob_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS mob_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS mob_delete_trigger() CASCADE;

ALTER TABLE "mob_synced"
DROP COLUMN "statisticId",
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "mob_local"
DROP COLUMN "statisticId",
ADD COLUMN "createdAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3);

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
    changed_cols := array_append(changed_cols, 'createdAt');
    changed_cols := array_append(changed_cols, 'updatedAt');
    changed_cols := array_append(changed_cols, 'updatedByAccountId');
    changed_cols := array_append(changed_cols, 'createdByAccountId');

    INSERT INTO "mob_local" (
    "id", "name", "type", "captureable", "baseLv", "experience", "partsExperience", "initialElement", "radius", "maxhp", "physicalDefense", "physicalResistance", "magicalDefense", "magicalResistance", "criticalResistance", "avoidance", "dodge", "block", "normalDefExp", "physicDefExp", "magicDefExp", "actions", "details", "dataSources", "createdAt", "updatedAt", "updatedByAccountId", "createdByAccountId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."name", NEW."type", NEW."captureable", NEW."baseLv", NEW."experience", NEW."partsExperience", NEW."initialElement", NEW."radius", NEW."maxhp", NEW."physicalDefense", NEW."physicalResistance", NEW."magicalDefense", NEW."magicalResistance", NEW."criticalResistance", NEW."avoidance", NEW."dodge", NEW."block", NEW."normalDefExp", NEW."physicDefExp", NEW."magicDefExp", NEW."actions", NEW."details", NEW."dataSources", NEW."createdAt", NEW."updatedAt", NEW."updatedByAccountId", NEW."createdByAccountId",
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
      'createdAt', NEW."createdAt",
      'updatedAt', NEW."updatedAt",
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
    IF NEW."createdAt" IS DISTINCT FROM synced."createdAt" THEN
      changed_cols := array_append(changed_cols, 'createdAt');
    END IF;
    IF NEW."updatedAt" IS DISTINCT FROM synced."updatedAt" THEN
      changed_cols := array_append(changed_cols, 'updatedAt');
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
        "id", "name", "type", "captureable", "baseLv", "experience", "partsExperience", "initialElement", "radius", "maxhp", "physicalDefense", "physicalResistance", "magicalDefense", "magicalResistance", "criticalResistance", "avoidance", "dodge", "block", "normalDefExp", "physicDefExp", "magicDefExp", "actions", "details", "dataSources", "createdAt", "updatedAt", "updatedByAccountId", "createdByAccountId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."name", NEW."type", NEW."captureable", NEW."baseLv", NEW."experience", NEW."partsExperience", NEW."initialElement", NEW."radius", NEW."maxhp", NEW."physicalDefense", NEW."physicalResistance", NEW."magicalDefense", NEW."magicalResistance", NEW."criticalResistance", NEW."avoidance", NEW."dodge", NEW."block", NEW."normalDefExp", NEW."physicDefExp", NEW."magicDefExp", NEW."actions", NEW."details", NEW."dataSources", NEW."createdAt", NEW."updatedAt", NEW."updatedByAccountId", NEW."createdByAccountId",
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
    "createdAt" = NEW."createdAt",
    "updatedAt" = NEW."updatedAt",
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
      'createdAt', NEW."createdAt",
      'updatedAt', NEW."updatedAt",
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

-- Alter client columns for item

DROP VIEW IF EXISTS "item" CASCADE;
DROP FUNCTION IF EXISTS item_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS item_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS item_delete_trigger() CASCADE;

ALTER TABLE "item_synced"
DROP COLUMN "statisticId",
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "item_local"
DROP COLUMN "statisticId",
ADD COLUMN "createdAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3);

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
    changed_cols := array_append(changed_cols, 'createdAt');
    changed_cols := array_append(changed_cols, 'updatedAt');
    changed_cols := array_append(changed_cols, 'updatedByAccountId');
    changed_cols := array_append(changed_cols, 'createdByAccountId');

    INSERT INTO "item_local" (
    "id", "itemType", "itemSourceType", "name", "dataSources", "details", "createdAt", "updatedAt", "updatedByAccountId", "createdByAccountId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."itemType", NEW."itemSourceType", NEW."name", NEW."dataSources", NEW."details", NEW."createdAt", NEW."updatedAt", NEW."updatedByAccountId", NEW."createdByAccountId",
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
      'createdAt', NEW."createdAt",
      'updatedAt', NEW."updatedAt",
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
    IF NEW."createdAt" IS DISTINCT FROM synced."createdAt" THEN
      changed_cols := array_append(changed_cols, 'createdAt');
    END IF;
    IF NEW."updatedAt" IS DISTINCT FROM synced."updatedAt" THEN
      changed_cols := array_append(changed_cols, 'updatedAt');
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
        "id", "itemType", "itemSourceType", "name", "dataSources", "details", "createdAt", "updatedAt", "updatedByAccountId", "createdByAccountId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."itemType", NEW."itemSourceType", NEW."name", NEW."dataSources", NEW."details", NEW."createdAt", NEW."updatedAt", NEW."updatedByAccountId", NEW."createdByAccountId",
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
    "createdAt" = NEW."createdAt",
    "updatedAt" = NEW."updatedAt",
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
      'createdAt', NEW."createdAt",
      'updatedAt', NEW."updatedAt",
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

-- Alter client columns for recipe

DROP VIEW IF EXISTS "recipe" CASCADE;
DROP FUNCTION IF EXISTS recipe_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS recipe_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS recipe_delete_trigger() CASCADE;

ALTER TABLE "recipe_synced"
DROP COLUMN "statisticId",
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "recipe_local"
DROP COLUMN "statisticId",
ADD COLUMN "createdAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3);

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
    changed_cols := array_append(changed_cols, 'createdAt');
    changed_cols := array_append(changed_cols, 'updatedAt');
    changed_cols := array_append(changed_cols, 'updatedByAccountId');
    changed_cols := array_append(changed_cols, 'createdByAccountId');

    INSERT INTO "recipe_local" (
    "id", "itemId", "activityId", "createdAt", "updatedAt", "updatedByAccountId", "createdByAccountId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."itemId", NEW."activityId", NEW."createdAt", NEW."updatedAt", NEW."updatedByAccountId", NEW."createdByAccountId",
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
      'createdAt', NEW."createdAt",
      'updatedAt', NEW."updatedAt",
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
    IF NEW."createdAt" IS DISTINCT FROM synced."createdAt" THEN
      changed_cols := array_append(changed_cols, 'createdAt');
    END IF;
    IF NEW."updatedAt" IS DISTINCT FROM synced."updatedAt" THEN
      changed_cols := array_append(changed_cols, 'updatedAt');
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
        "id", "itemId", "activityId", "createdAt", "updatedAt", "updatedByAccountId", "createdByAccountId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."itemId", NEW."activityId", NEW."createdAt", NEW."updatedAt", NEW."updatedByAccountId", NEW."createdByAccountId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "recipe_local"
    SET
        
    "itemId" = NEW."itemId",
    "activityId" = NEW."activityId",
    "createdAt" = NEW."createdAt",
    "updatedAt" = NEW."updatedAt",
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
      'createdAt', NEW."createdAt",
      'updatedAt', NEW."updatedAt",
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

-- Alter client columns for npc

DROP VIEW IF EXISTS "npc" CASCADE;
DROP FUNCTION IF EXISTS npc_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS npc_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS npc_delete_trigger() CASCADE;

ALTER TABLE "npc_synced"
DROP COLUMN "statisticId",
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "npc_local"
DROP COLUMN "statisticId",
ADD COLUMN "createdAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3);

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
    changed_cols := array_append(changed_cols, 'createdAt');
    changed_cols := array_append(changed_cols, 'updatedAt');
    changed_cols := array_append(changed_cols, 'updatedByAccountId');
    changed_cols := array_append(changed_cols, 'createdByAccountId');

    INSERT INTO "npc_local" (
    "id", "name", "zoneId", "createdAt", "updatedAt", "updatedByAccountId", "createdByAccountId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."name", NEW."zoneId", NEW."createdAt", NEW."updatedAt", NEW."updatedByAccountId", NEW."createdByAccountId",
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
      'createdAt', NEW."createdAt",
      'updatedAt', NEW."updatedAt",
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
    IF NEW."createdAt" IS DISTINCT FROM synced."createdAt" THEN
      changed_cols := array_append(changed_cols, 'createdAt');
    END IF;
    IF NEW."updatedAt" IS DISTINCT FROM synced."updatedAt" THEN
      changed_cols := array_append(changed_cols, 'updatedAt');
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
        "id", "name", "zoneId", "createdAt", "updatedAt", "updatedByAccountId", "createdByAccountId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."name", NEW."zoneId", NEW."createdAt", NEW."updatedAt", NEW."updatedByAccountId", NEW."createdByAccountId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "npc_local"
    SET
        
    "name" = NEW."name",
    "zoneId" = NEW."zoneId",
    "createdAt" = NEW."createdAt",
    "updatedAt" = NEW."updatedAt",
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
      'createdAt', NEW."createdAt",
      'updatedAt', NEW."updatedAt",
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

-- Alter client columns for task

DROP VIEW IF EXISTS "task" CASCADE;
DROP FUNCTION IF EXISTS task_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS task_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS task_delete_trigger() CASCADE;

ALTER TABLE "task_synced"
DROP COLUMN "statisticId",
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "task_local"
DROP COLUMN "statisticId",
ADD COLUMN "createdAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3);

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
    changed_cols := array_append(changed_cols, 'createdAt');
    changed_cols := array_append(changed_cols, 'updatedAt');
    changed_cols := array_append(changed_cols, 'updatedByAccountId');
    changed_cols := array_append(changed_cols, 'createdByAccountId');

    INSERT INTO "task_local" (
    "id", "lv", "name", "type", "description", "belongToNpcId", "createdAt", "updatedAt", "updatedByAccountId", "createdByAccountId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."lv", NEW."name", NEW."type", NEW."description", NEW."belongToNpcId", NEW."createdAt", NEW."updatedAt", NEW."updatedByAccountId", NEW."createdByAccountId",
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
      'createdAt', NEW."createdAt",
      'updatedAt', NEW."updatedAt",
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
    IF NEW."createdAt" IS DISTINCT FROM synced."createdAt" THEN
      changed_cols := array_append(changed_cols, 'createdAt');
    END IF;
    IF NEW."updatedAt" IS DISTINCT FROM synced."updatedAt" THEN
      changed_cols := array_append(changed_cols, 'updatedAt');
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
        "id", "lv", "name", "type", "description", "belongToNpcId", "createdAt", "updatedAt", "updatedByAccountId", "createdByAccountId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."lv", NEW."name", NEW."type", NEW."description", NEW."belongToNpcId", NEW."createdAt", NEW."updatedAt", NEW."updatedByAccountId", NEW."createdByAccountId",
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
    "createdAt" = NEW."createdAt",
    "updatedAt" = NEW."updatedAt",
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
      'createdAt', NEW."createdAt",
      'updatedAt', NEW."updatedAt",
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

-- Alter client columns for skill

DROP VIEW IF EXISTS "skill" CASCADE;
DROP FUNCTION IF EXISTS skill_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS skill_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS skill_delete_trigger() CASCADE;

ALTER TABLE "skill_synced"
DROP COLUMN "statisticId",
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "skill_local"
DROP COLUMN "statisticId",
ADD COLUMN "createdAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3);

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
    changed_cols := array_append(changed_cols, 'createdAt');
    changed_cols := array_append(changed_cols, 'updatedAt');
    changed_cols := array_append(changed_cols, 'preSkillId');
    changed_cols := array_append(changed_cols, 'updatedByAccountId');
    changed_cols := array_append(changed_cols, 'createdByAccountId');

    INSERT INTO "skill_local" (
    "id", "treeType", "posX", "posY", "tier", "name", "details", "dataSources", "createdAt", "updatedAt", "preSkillId", "updatedByAccountId", "createdByAccountId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."treeType", NEW."posX", NEW."posY", NEW."tier", NEW."name", NEW."details", NEW."dataSources", NEW."createdAt", NEW."updatedAt", NEW."preSkillId", NEW."updatedByAccountId", NEW."createdByAccountId",
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
      'createdAt', NEW."createdAt",
      'updatedAt', NEW."updatedAt",
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
    IF NEW."createdAt" IS DISTINCT FROM synced."createdAt" THEN
      changed_cols := array_append(changed_cols, 'createdAt');
    END IF;
    IF NEW."updatedAt" IS DISTINCT FROM synced."updatedAt" THEN
      changed_cols := array_append(changed_cols, 'updatedAt');
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
        "id", "treeType", "posX", "posY", "tier", "name", "details", "dataSources", "createdAt", "updatedAt", "preSkillId", "updatedByAccountId", "createdByAccountId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."treeType", NEW."posX", NEW."posY", NEW."tier", NEW."name", NEW."details", NEW."dataSources", NEW."createdAt", NEW."updatedAt", NEW."preSkillId", NEW."updatedByAccountId", NEW."createdByAccountId",
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
    "createdAt" = NEW."createdAt",
    "updatedAt" = NEW."updatedAt",
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
      'createdAt', NEW."createdAt",
      'updatedAt', NEW."updatedAt",
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

-- Alter client columns for character

DROP VIEW IF EXISTS "character" CASCADE;
DROP FUNCTION IF EXISTS character_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS character_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS character_delete_trigger() CASCADE;

ALTER TABLE "character_synced"
DROP COLUMN "statisticId",
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "character_local"
DROP COLUMN "statisticId",
ADD COLUMN "createdAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3);

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
    WHEN 'createdAt' = ANY(local.changed_columns)
      THEN local."createdAt"
      ELSE synced."createdAt"
    END AS "createdAt",
   CASE
    WHEN 'updatedAt' = ANY(local.changed_columns)
      THEN local."updatedAt"
      ELSE synced."updatedAt"
    END AS "updatedAt"
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
    changed_cols := array_append(changed_cols, 'createdAt');
    changed_cols := array_append(changed_cols, 'updatedAt');

    INSERT INTO "character_local" (
    "id", "name", "lv", "str", "int", "vit", "agi", "dex", "personalityType", "personalityValue", "weaponId", "subWeaponId", "armorId", "optionId", "specialId", "cooking", "modifiers", "partnerSkillAId", "partnerSkillAType", "partnerSkillBId", "partnerSkillBType", "belongToPlayerId", "details", "createdAt", "updatedAt",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."name", NEW."lv", NEW."str", NEW."int", NEW."vit", NEW."agi", NEW."dex", NEW."personalityType", NEW."personalityValue", NEW."weaponId", NEW."subWeaponId", NEW."armorId", NEW."optionId", NEW."specialId", NEW."cooking", NEW."modifiers", NEW."partnerSkillAId", NEW."partnerSkillAType", NEW."partnerSkillBId", NEW."partnerSkillBType", NEW."belongToPlayerId", NEW."details", NEW."createdAt", NEW."updatedAt",
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
      'createdAt', NEW."createdAt",
      'updatedAt', NEW."updatedAt"
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
    IF NEW."createdAt" IS DISTINCT FROM synced."createdAt" THEN
      changed_cols := array_append(changed_cols, 'createdAt');
    END IF;
    IF NEW."updatedAt" IS DISTINCT FROM synced."updatedAt" THEN
      changed_cols := array_append(changed_cols, 'updatedAt');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "character_local" (
        "id", "name", "lv", "str", "int", "vit", "agi", "dex", "personalityType", "personalityValue", "weaponId", "subWeaponId", "armorId", "optionId", "specialId", "cooking", "modifiers", "partnerSkillAId", "partnerSkillAType", "partnerSkillBId", "partnerSkillBType", "belongToPlayerId", "details", "createdAt", "updatedAt",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."name", NEW."lv", NEW."str", NEW."int", NEW."vit", NEW."agi", NEW."dex", NEW."personalityType", NEW."personalityValue", NEW."weaponId", NEW."subWeaponId", NEW."armorId", NEW."optionId", NEW."specialId", NEW."cooking", NEW."modifiers", NEW."partnerSkillAId", NEW."partnerSkillAType", NEW."partnerSkillBId", NEW."partnerSkillBType", NEW."belongToPlayerId", NEW."details", NEW."createdAt", NEW."updatedAt",
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
    "createdAt" = NEW."createdAt",
    "updatedAt" = NEW."updatedAt",
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
      'createdAt', NEW."createdAt",
      'updatedAt', NEW."updatedAt"
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

-- Alter client columns for simulator

DROP VIEW IF EXISTS "simulator" CASCADE;
DROP FUNCTION IF EXISTS simulator_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS simulator_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS simulator_delete_trigger() CASCADE;

ALTER TABLE "simulator_synced"
DROP COLUMN "statisticId",
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "simulator_local"
DROP COLUMN "statisticId",
ADD COLUMN "createdAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3);

CREATE OR REPLACE VIEW "simulator" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'name' = ANY(local.changed_columns)
      THEN local."name"
      ELSE synced."name"
    END AS "name",
   CASE
    WHEN 'randomSeed' = ANY(local.changed_columns)
      THEN local."randomSeed"
      ELSE synced."randomSeed"
    END AS "randomSeed",
   CASE
    WHEN 'logicHz' = ANY(local.changed_columns)
      THEN local."logicHz"
      ELSE synced."logicHz"
    END AS "logicHz",
   CASE
    WHEN 'primaryMemberId' = ANY(local.changed_columns)
      THEN local."primaryMemberId"
      ELSE synced."primaryMemberId"
    END AS "primaryMemberId",
   CASE
    WHEN 'details' = ANY(local.changed_columns)
      THEN local."details"
      ELSE synced."details"
    END AS "details",
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
    changed_cols := array_append(changed_cols, 'randomSeed');
    changed_cols := array_append(changed_cols, 'logicHz');
    changed_cols := array_append(changed_cols, 'primaryMemberId');
    changed_cols := array_append(changed_cols, 'details');
    changed_cols := array_append(changed_cols, 'createdAt');
    changed_cols := array_append(changed_cols, 'updatedAt');
    changed_cols := array_append(changed_cols, 'updatedByAccountId');
    changed_cols := array_append(changed_cols, 'createdByAccountId');

    INSERT INTO "simulator_local" (
    "id", "name", "randomSeed", "logicHz", "primaryMemberId", "details", "createdAt", "updatedAt", "updatedByAccountId", "createdByAccountId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."name", NEW."randomSeed", NEW."logicHz", NEW."primaryMemberId", NEW."details", NEW."createdAt", NEW."updatedAt", NEW."updatedByAccountId", NEW."createdByAccountId",
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
      'randomSeed', NEW."randomSeed",
      'logicHz', NEW."logicHz",
      'primaryMemberId', NEW."primaryMemberId",
      'details', NEW."details",
      'createdAt', NEW."createdAt",
      'updatedAt', NEW."updatedAt",
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
    IF NEW."randomSeed" IS DISTINCT FROM synced."randomSeed" THEN
      changed_cols := array_append(changed_cols, 'randomSeed');
    END IF;
    IF NEW."logicHz" IS DISTINCT FROM synced."logicHz" THEN
      changed_cols := array_append(changed_cols, 'logicHz');
    END IF;
    IF NEW."primaryMemberId" IS DISTINCT FROM synced."primaryMemberId" THEN
      changed_cols := array_append(changed_cols, 'primaryMemberId');
    END IF;
    IF NEW."details" IS DISTINCT FROM synced."details" THEN
      changed_cols := array_append(changed_cols, 'details');
    END IF;
    IF NEW."createdAt" IS DISTINCT FROM synced."createdAt" THEN
      changed_cols := array_append(changed_cols, 'createdAt');
    END IF;
    IF NEW."updatedAt" IS DISTINCT FROM synced."updatedAt" THEN
      changed_cols := array_append(changed_cols, 'updatedAt');
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
        "id", "name", "randomSeed", "logicHz", "primaryMemberId", "details", "createdAt", "updatedAt", "updatedByAccountId", "createdByAccountId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."name", NEW."randomSeed", NEW."logicHz", NEW."primaryMemberId", NEW."details", NEW."createdAt", NEW."updatedAt", NEW."updatedByAccountId", NEW."createdByAccountId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "simulator_local"
    SET
        
    "name" = NEW."name",
    "randomSeed" = NEW."randomSeed",
    "logicHz" = NEW."logicHz",
    "primaryMemberId" = NEW."primaryMemberId",
    "details" = NEW."details",
    "createdAt" = NEW."createdAt",
    "updatedAt" = NEW."updatedAt",
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
      'randomSeed', NEW."randomSeed",
      'logicHz', NEW."logicHz",
      'primaryMemberId', NEW."primaryMemberId",
      'details', NEW."details",
      'createdAt', NEW."createdAt",
      'updatedAt', NEW."updatedAt",
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

-- Drop client sync objects for statistic

DROP VIEW IF EXISTS "statistic" CASCADE;
DROP FUNCTION IF EXISTS statistic_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS statistic_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS statistic_delete_trigger() CASCADE;
DROP TABLE IF EXISTS "statistic_local" CASCADE;
DROP TABLE IF EXISTS "statistic_synced" CASCADE;
