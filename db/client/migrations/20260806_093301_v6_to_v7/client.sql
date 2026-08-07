-- Drop client sync objects for sync_heartbeat

DROP VIEW IF EXISTS "sync_heartbeat" CASCADE;
DROP FUNCTION IF EXISTS sync_heartbeat_insert_trigger() CASCADE;
DROP FUNCTION IF EXISTS sync_heartbeat_update_trigger() CASCADE;
DROP FUNCTION IF EXISTS sync_heartbeat_delete_trigger() CASCADE;
DROP TABLE IF EXISTS "sync_heartbeat_local" CASCADE;
DROP TABLE IF EXISTS "sync_heartbeat_synced" CASCADE;
