import {
	DB_SCHEMA_VERSION,
	MIN_COMPATIBLE_DB_SCHEMA_VERSION,
	MIN_COMPATIBLE_STORE_SCHEMA_VERSION,
	STORE_SCHEMA_VERSION,
} from "./schema";
import type { ReleaseManifest } from "./types";

declare const __APP_RELEASE_ID__: string | undefined;
declare const __APP_ASSET_VERSION__: string | undefined;
declare const __APP_SW_VERSION__: string | undefined;
declare const __APP_GENERATED_AT__: string | undefined;

const fallbackReleaseId = `dev-${STORE_SCHEMA_VERSION}-${DB_SCHEMA_VERSION}`;

export function getCurrentReleaseManifest(): ReleaseManifest {
	const releaseId = typeof __APP_RELEASE_ID__ === "string" ? __APP_RELEASE_ID__ : fallbackReleaseId;

	return {
		releaseId,
		assetVersion: typeof __APP_ASSET_VERSION__ === "string" ? __APP_ASSET_VERSION__ : releaseId,
		swVersion: typeof __APP_SW_VERSION__ === "string" ? __APP_SW_VERSION__ : releaseId,
		storeSchemaVersion: STORE_SCHEMA_VERSION,
		dbSchemaVersion: DB_SCHEMA_VERSION,
		minCompatibleStoreSchemaVersion: MIN_COMPATIBLE_STORE_SCHEMA_VERSION,
		minCompatibleDbSchemaVersion: MIN_COMPATIBLE_DB_SCHEMA_VERSION,
		generatedAt: typeof __APP_GENERATED_AT__ === "string" ? __APP_GENERATED_AT__ : new Date(0).toISOString(),
	};
}
