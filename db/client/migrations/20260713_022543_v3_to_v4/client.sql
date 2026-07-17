-- CreateEnum
CREATE TYPE "SimulatorCamp" AS ENUM ('A', 'B');

-- Alter client columns for simulator

DROP VIEW IF EXISTS "simulator" CASCADE;
DROP FUNCTION IF EXISTS simulator_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS simulator_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS simulator_delete_trigger() CASCADE;

ALTER TABLE "simulator_synced"
ADD COLUMN "logicHz" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN "primaryMemberId" TEXT,
ADD COLUMN "randomSeed" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "simulator_local"
ADD COLUMN "logicHz" INTEGER,
ADD COLUMN "primaryMemberId" TEXT,
ADD COLUMN "randomSeed" INTEGER;

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
    changed_cols := array_append(changed_cols, 'randomSeed');
    changed_cols := array_append(changed_cols, 'logicHz');
    changed_cols := array_append(changed_cols, 'primaryMemberId');
    changed_cols := array_append(changed_cols, 'details');
    changed_cols := array_append(changed_cols, 'statisticId');
    changed_cols := array_append(changed_cols, 'updatedByAccountId');
    changed_cols := array_append(changed_cols, 'createdByAccountId');

    INSERT INTO "simulator_local" (
    "id", "name", "randomSeed", "logicHz", "primaryMemberId", "details", "statisticId", "updatedByAccountId", "createdByAccountId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."name", NEW."randomSeed", NEW."logicHz", NEW."primaryMemberId", NEW."details", NEW."statisticId", NEW."updatedByAccountId", NEW."createdByAccountId",
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
        "id", "name", "randomSeed", "logicHz", "primaryMemberId", "details", "statisticId", "updatedByAccountId", "createdByAccountId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."name", NEW."randomSeed", NEW."logicHz", NEW."primaryMemberId", NEW."details", NEW."statisticId", NEW."updatedByAccountId", NEW."createdByAccountId",
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
      'randomSeed', NEW."randomSeed",
      'logicHz', NEW."logicHz",
      'primaryMemberId', NEW."primaryMemberId",
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

-- Alter client columns for team

DROP VIEW IF EXISTS "team" CASCADE;
DROP FUNCTION IF EXISTS team_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS team_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS team_delete_trigger() CASCADE;

ALTER TABLE "team_synced"
ADD COLUMN "belongToSimulatorId" TEXT NOT NULL,
ADD COLUMN "camp" "SimulatorCamp" NOT NULL;

ALTER TABLE "team_local"
ADD COLUMN "belongToSimulatorId" TEXT,
ADD COLUMN "camp" "SimulatorCamp";

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
    END AS "gems",
   CASE
    WHEN 'camp' = ANY(local.changed_columns)
      THEN local."camp"
      ELSE synced."camp"
    END AS "camp",
   CASE
    WHEN 'belongToSimulatorId' = ANY(local.changed_columns)
      THEN local."belongToSimulatorId"
      ELSE synced."belongToSimulatorId"
    END AS "belongToSimulatorId"
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
    changed_cols := array_append(changed_cols, 'camp');
    changed_cols := array_append(changed_cols, 'belongToSimulatorId');

    INSERT INTO "team_local" (
    "id", "name", "gems", "camp", "belongToSimulatorId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."name", NEW."gems", NEW."camp", NEW."belongToSimulatorId",
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
      'gems', NEW."gems",
      'camp', NEW."camp",
      'belongToSimulatorId', NEW."belongToSimulatorId"
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
    IF NEW."camp" IS DISTINCT FROM synced."camp" THEN
      changed_cols := array_append(changed_cols, 'camp');
    END IF;
    IF NEW."belongToSimulatorId" IS DISTINCT FROM synced."belongToSimulatorId" THEN
      changed_cols := array_append(changed_cols, 'belongToSimulatorId');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "team_local" (
        "id", "name", "gems", "camp", "belongToSimulatorId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."name", NEW."gems", NEW."camp", NEW."belongToSimulatorId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "team_local"
    SET

    "name" = NEW."name",
    "gems" = NEW."gems",
    "camp" = NEW."camp",
    "belongToSimulatorId" = NEW."belongToSimulatorId",
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
      'gems', NEW."gems",
      'camp', NEW."camp",
      'belongToSimulatorId', NEW."belongToSimulatorId"
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

-- Alter client columns for member

DROP VIEW IF EXISTS "member" CASCADE;
DROP FUNCTION IF EXISTS member_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS member_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS member_delete_trigger() CASCADE;

ALTER TABLE "member_synced"
DROP COLUMN "playerId",
ADD COLUMN "characterId" TEXT,
ALTER COLUMN "mobDifficultyFlag" DROP NOT NULL,
ALTER COLUMN "behavior" DROP NOT NULL;

ALTER TABLE "member_local"
DROP COLUMN "playerId",
ADD COLUMN "characterId" TEXT,
ALTER COLUMN "mobDifficultyFlag" DROP NOT NULL,
ALTER COLUMN "behavior" DROP NOT NULL;

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
    WHEN 'characterId' = ANY(local.changed_columns)
      THEN local."characterId"
      ELSE synced."characterId"
    END AS "characterId",
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
    changed_cols := array_append(changed_cols, 'characterId');
    changed_cols := array_append(changed_cols, 'partnerId');
    changed_cols := array_append(changed_cols, 'mercenaryId');
    changed_cols := array_append(changed_cols, 'mobId');
    changed_cols := array_append(changed_cols, 'mobDifficultyFlag');
    changed_cols := array_append(changed_cols, 'behavior');
    changed_cols := array_append(changed_cols, 'belongToTeamId');

    INSERT INTO "member_local" (
    "id", "name", "formationOrder", "type", "characterId", "partnerId", "mercenaryId", "mobId", "mobDifficultyFlag", "behavior", "belongToTeamId",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."name", NEW."formationOrder", NEW."type", NEW."characterId", NEW."partnerId", NEW."mercenaryId", NEW."mobId", NEW."mobDifficultyFlag", NEW."behavior", NEW."belongToTeamId",
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
      'characterId', NEW."characterId",
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
    IF NEW."characterId" IS DISTINCT FROM synced."characterId" THEN
      changed_cols := array_append(changed_cols, 'characterId');
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
        "id", "name", "formationOrder", "type", "characterId", "partnerId", "mercenaryId", "mobId", "mobDifficultyFlag", "behavior", "belongToTeamId",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."name", NEW."formationOrder", NEW."type", NEW."characterId", NEW."partnerId", NEW."mercenaryId", NEW."mobId", NEW."mobDifficultyFlag", NEW."behavior", NEW."belongToTeamId",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "member_local"
    SET

    "name" = NEW."name",
    "formationOrder" = NEW."formationOrder",
    "type" = NEW."type",
    "characterId" = NEW."characterId",
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
      'characterId', NEW."characterId",
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

-- Drop client sync objects for _campA

DROP VIEW IF EXISTS "_campA" CASCADE;
DROP FUNCTION IF EXISTS _campA_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS _campA_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS _campA_delete_trigger() CASCADE;
DROP TABLE IF EXISTS "_campA_local" CASCADE;
DROP TABLE IF EXISTS "_campA_synced" CASCADE;

-- Drop client sync objects for _campB

DROP VIEW IF EXISTS "_campB" CASCADE;
DROP FUNCTION IF EXISTS _campB_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS _campB_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS _campB_delete_trigger() CASCADE;
DROP TABLE IF EXISTS "_campB_local" CASCADE;
DROP TABLE IF EXISTS "_campB_synced" CASCADE;

-- _simulatorAnalysisSources

-- _simulatorAnalysisSources
CREATE TABLE IF NOT EXISTS "_simulatorAnalysisSources_synced" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "_simulatorAnalysisSources_synced_pkey" PRIMARY KEY ("A","B")
);
CREATE TABLE IF NOT EXISTS "_simulatorAnalysisSources_local" (
  "A" TEXT,
  "B" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "_simulatorAnalysisSources_local_pkey" PRIMARY KEY ("A","B")
);

CREATE OR REPLACE VIEW "_simulatorAnalysisSources" AS
  SELECT
     COALESCE(local."A", synced."A") AS "A",
   COALESCE(local."B", synced."B") AS "B"
  FROM "_simulatorAnalysisSources_synced" AS synced
  FULL OUTER JOIN "_simulatorAnalysisSources_local" AS local
  ON synced."A" = local."A" AND synced."B" = local."B"
  WHERE (local."A" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION _simulatorAnalysisSources_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "_simulatorAnalysisSources_synced" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "_simulatorAnalysisSources_local" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns


    INSERT INTO "_simulatorAnalysisSources_local" (
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
    '_simulatorAnalysisSources',
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

CREATE OR REPLACE FUNCTION _simulatorAnalysisSources_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "_simulatorAnalysisSources_synced"%ROWTYPE;
    local "_simulatorAnalysisSources_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "_simulatorAnalysisSources_synced" WHERE "A" = NEW."A" AND "B" = NEW."B";
    SELECT * INTO local FROM "_simulatorAnalysisSources_local" WHERE "A" = NEW."A" AND "B" = NEW."B";
    -- no non-pk fields to track
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "_simulatorAnalysisSources_local" (
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
    UPDATE "_simulatorAnalysisSources_local"
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
    '_simulatorAnalysisSources',
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

CREATE OR REPLACE FUNCTION _simulatorAnalysisSources_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "_simulatorAnalysisSources_local" WHERE "A" = OLD."A" AND "B" = OLD."B") THEN
    UPDATE "_simulatorAnalysisSources_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "A" = OLD."A" AND "B" = OLD."B";
    ELSE
    INSERT INTO "_simulatorAnalysisSources_local" (
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
    '_simulatorAnalysisSources',
    'delete',
    jsonb_build_object('A', OLD."A", 'B', OLD."B"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER _simulatorAnalysisSources_insert
INSTEAD OF INSERT ON "_simulatorAnalysisSources"
FOR EACH ROW EXECUTE FUNCTION _simulatorAnalysisSources_insert_trigger();

CREATE OR REPLACE TRIGGER _simulatorAnalysisSources_update
INSTEAD OF UPDATE ON "_simulatorAnalysisSources"
FOR EACH ROW EXECUTE FUNCTION _simulatorAnalysisSources_update_trigger();

CREATE OR REPLACE TRIGGER _simulatorAnalysisSources_delete
INSTEAD OF DELETE ON "_simulatorAnalysisSources"
FOR EACH ROW EXECUTE FUNCTION _simulatorAnalysisSources_delete_trigger();


CREATE OR REPLACE FUNCTION _simulatorAnalysisSources_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_simulatorAnalysisSources_local"
  WHERE "A" = NEW."A" AND "B" = NEW."B"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION _simulatorAnalysisSources_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_simulatorAnalysisSources_local"
  WHERE "A" = OLD."A" AND "B" = OLD."B";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "_simulatorAnalysisSources_synced"
FOR EACH ROW EXECUTE FUNCTION _simulatorAnalysisSources_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "_simulatorAnalysisSources_synced"
FOR EACH ROW EXECUTE FUNCTION _simulatorAnalysisSources_delete_local_on_synced_delete_trigger();

-- _simulatorAnalysisTargets

-- _simulatorAnalysisTargets
CREATE TABLE IF NOT EXISTS "_simulatorAnalysisTargets_synced" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  "write_id" UUID,
  CONSTRAINT "_simulatorAnalysisTargets_synced_pkey" PRIMARY KEY ("A","B")
);
CREATE TABLE IF NOT EXISTS "_simulatorAnalysisTargets_local" (
  "A" TEXT,
  "B" TEXT,
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "_simulatorAnalysisTargets_local_pkey" PRIMARY KEY ("A","B")
);

CREATE OR REPLACE VIEW "_simulatorAnalysisTargets" AS
  SELECT
     COALESCE(local."A", synced."A") AS "A",
   COALESCE(local."B", synced."B") AS "B"
  FROM "_simulatorAnalysisTargets_synced" AS synced
  FULL OUTER JOIN "_simulatorAnalysisTargets_local" AS local
  ON synced."A" = local."A" AND synced."B" = local."B"
  WHERE (local."A" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION _simulatorAnalysisTargets_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "_simulatorAnalysisTargets_synced" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "_simulatorAnalysisTargets_local" WHERE "A" = NEW."A" AND "B" = NEW."B") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns


    INSERT INTO "_simulatorAnalysisTargets_local" (
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
    '_simulatorAnalysisTargets',
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

CREATE OR REPLACE FUNCTION _simulatorAnalysisTargets_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "_simulatorAnalysisTargets_synced"%ROWTYPE;
    local "_simulatorAnalysisTargets_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "_simulatorAnalysisTargets_synced" WHERE "A" = NEW."A" AND "B" = NEW."B";
    SELECT * INTO local FROM "_simulatorAnalysisTargets_local" WHERE "A" = NEW."A" AND "B" = NEW."B";
    -- no non-pk fields to track
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "_simulatorAnalysisTargets_local" (
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
    UPDATE "_simulatorAnalysisTargets_local"
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
    '_simulatorAnalysisTargets',
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

CREATE OR REPLACE FUNCTION _simulatorAnalysisTargets_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "_simulatorAnalysisTargets_local" WHERE "A" = OLD."A" AND "B" = OLD."B") THEN
    UPDATE "_simulatorAnalysisTargets_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "A" = OLD."A" AND "B" = OLD."B";
    ELSE
    INSERT INTO "_simulatorAnalysisTargets_local" (
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
    '_simulatorAnalysisTargets',
    'delete',
    jsonb_build_object('A', OLD."A", 'B', OLD."B"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER _simulatorAnalysisTargets_insert
INSTEAD OF INSERT ON "_simulatorAnalysisTargets"
FOR EACH ROW EXECUTE FUNCTION _simulatorAnalysisTargets_insert_trigger();

CREATE OR REPLACE TRIGGER _simulatorAnalysisTargets_update
INSTEAD OF UPDATE ON "_simulatorAnalysisTargets"
FOR EACH ROW EXECUTE FUNCTION _simulatorAnalysisTargets_update_trigger();

CREATE OR REPLACE TRIGGER _simulatorAnalysisTargets_delete
INSTEAD OF DELETE ON "_simulatorAnalysisTargets"
FOR EACH ROW EXECUTE FUNCTION _simulatorAnalysisTargets_delete_trigger();


CREATE OR REPLACE FUNCTION _simulatorAnalysisTargets_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_simulatorAnalysisTargets_local"
  WHERE "A" = NEW."A" AND "B" = NEW."B"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION _simulatorAnalysisTargets_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "_simulatorAnalysisTargets_local"
  WHERE "A" = OLD."A" AND "B" = OLD."B";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "_simulatorAnalysisTargets_synced"
FOR EACH ROW EXECUTE FUNCTION _simulatorAnalysisTargets_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "_simulatorAnalysisTargets_synced"
FOR EACH ROW EXECUTE FUNCTION _simulatorAnalysisTargets_delete_local_on_synced_delete_trigger();

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
