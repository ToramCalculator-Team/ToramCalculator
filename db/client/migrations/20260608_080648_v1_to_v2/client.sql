-- sync_heartbeat

-- sync_heartbeat
CREATE TABLE IF NOT EXISTS "sync_heartbeat_synced" (
  "id" TEXT NOT NULL,
  "seq" BIGINT NOT NULL,
  "emitted_at" TIMESTAMP(3) NOT NULL,
  "write_id" UUID,
  CONSTRAINT "sync_heartbeat_synced_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "sync_heartbeat_local" (
  "id" TEXT,
  "seq" BIGINT,
  "emitted_at" TIMESTAMP(3),
  "changed_columns" TEXT[],
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "write_id" UUID NOT NULL,
  CONSTRAINT "sync_heartbeat_local_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE VIEW "sync_heartbeat" AS
  SELECT
     COALESCE(local."id", synced."id") AS "id",
   CASE
    WHEN 'seq' = ANY(local.changed_columns)
      THEN local."seq"
      ELSE synced."seq"
    END AS "seq",
   CASE
    WHEN 'emitted_at' = ANY(local.changed_columns)
      THEN local."emitted_at"
      ELSE synced."emitted_at"
    END AS "emitted_at"
  FROM "sync_heartbeat_synced" AS synced
  FULL OUTER JOIN "sync_heartbeat_local" AS local
  ON synced."id" = local."id"
  WHERE (local."id" IS NULL OR local."is_deleted" = FALSE);

CREATE OR REPLACE FUNCTION sync_heartbeat_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
    changed_cols TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if id already exists
    IF EXISTS (SELECT 1 FROM "sync_heartbeat_synced" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the synced table';
    END IF;
    IF EXISTS (SELECT 1 FROM "sync_heartbeat_local" WHERE "id" = NEW."id") THEN
        RAISE EXCEPTION 'Cannot insert: id already exists in the local table';
    END IF;

    -- Add all non-primary key columns to changed_columns
    changed_cols := array_append(changed_cols, 'seq');
    changed_cols := array_append(changed_cols, 'emitted_at');

    INSERT INTO "sync_heartbeat_local" (
    "id", "seq", "emitted_at",
    changed_columns,
    is_deleted,
    write_id
    )
    VALUES (
    NEW."id", NEW."seq", NEW."emitted_at",
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
    'sync_heartbeat',
    'insert',
    jsonb_build_object(
        'id', NEW."id",
      'seq', NEW."seq",
      'emitted_at', NEW."emitted_at"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_heartbeat_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    synced "sync_heartbeat_synced"%ROWTYPE;
    local "sync_heartbeat_local"%ROWTYPE;
    changed_cols TEXT[] := ARRAY[]::TEXT[];
    local_write_id UUID := gen_random_uuid();
BEGIN
    SELECT * INTO synced FROM "sync_heartbeat_synced" WHERE "id" = NEW."id";
    SELECT * INTO local FROM "sync_heartbeat_local" WHERE "id" = NEW."id";
    
    IF NEW."seq" IS DISTINCT FROM synced."seq" THEN
      changed_cols := array_append(changed_cols, 'seq');
    END IF;
    IF NEW."emitted_at" IS DISTINCT FROM synced."emitted_at" THEN
      changed_cols := array_append(changed_cols, 'emitted_at');
    END IF;
    -- FOUND 来自 local 查询：视图 UPDATE 需要按是否已有本地覆盖行决定 INSERT 或 UPDATE。
    IF NOT FOUND THEN
    INSERT INTO "sync_heartbeat_local" (
        "id", "seq", "emitted_at",
        changed_columns,
        write_id
    )
    VALUES (
        NEW."id", NEW."seq", NEW."emitted_at",
        changed_cols,
        local_write_id
    );
    ELSE
    UPDATE "sync_heartbeat_local"
    SET
        
    "seq" = NEW."seq",
    "emitted_at" = NEW."emitted_at",
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
    'sync_heartbeat',
    'update',
    jsonb_build_object(
        'id', NEW."id",
      'seq', NEW."seq",
      'emitted_at', NEW."emitted_at"
    ),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_heartbeat_delete_trigger()
RETURNS TRIGGER AS $$
DECLARE
    local_write_id UUID := gen_random_uuid();
BEGIN
    IF EXISTS (SELECT 1 FROM "sync_heartbeat_local" WHERE "id" = OLD."id") THEN
    UPDATE "sync_heartbeat_local"
    SET is_deleted = TRUE,
        write_id = local_write_id
    WHERE "id" = OLD."id";
    ELSE
    INSERT INTO "sync_heartbeat_local" (
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
    'sync_heartbeat',
    'delete',
    jsonb_build_object('id', OLD."id"),
    local_write_id,
    pg_current_xact_id()
    );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER sync_heartbeat_insert
INSTEAD OF INSERT ON "sync_heartbeat"
FOR EACH ROW EXECUTE FUNCTION sync_heartbeat_insert_trigger();

CREATE OR REPLACE TRIGGER sync_heartbeat_update
INSTEAD OF UPDATE ON "sync_heartbeat"
FOR EACH ROW EXECUTE FUNCTION sync_heartbeat_update_trigger();

CREATE OR REPLACE TRIGGER sync_heartbeat_delete
INSTEAD OF DELETE ON "sync_heartbeat"
FOR EACH ROW EXECUTE FUNCTION sync_heartbeat_delete_trigger();


CREATE OR REPLACE FUNCTION sync_heartbeat_delete_local_on_synced_insert_and_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "sync_heartbeat_local"
  WHERE "id" = NEW."id"
    AND write_id IS NOT NULL
    AND write_id = NEW.write_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION sync_heartbeat_delete_local_on_synced_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM "sync_heartbeat_local"
  WHERE "id" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE TRIGGER delete_local_on_synced_insert
AFTER INSERT OR UPDATE ON "sync_heartbeat_synced"
FOR EACH ROW EXECUTE FUNCTION sync_heartbeat_delete_local_on_synced_insert_and_update_trigger();

CREATE OR REPLACE TRIGGER delete_local_on_synced_delete
AFTER DELETE ON "sync_heartbeat_synced"
FOR EACH ROW EXECUTE FUNCTION sync_heartbeat_delete_local_on_synced_delete_trigger();
