import type { Store } from "~/store";

export type ReleaseManifest = {
	releaseId: string;
	assetVersion: string;
	swVersion: string;
	storeSchemaVersion: number;
	dbSchemaVersion: number;
	minCompatibleStoreSchemaVersion: number;
	minCompatibleDbSchemaVersion: number;
	generatedAt: string;
};

export type LocalReleaseState = {
	releaseId: string;
	assetVersion: string;
	storeSchemaVersion: number;
	dbSchemaVersion: number;
	lastSuccessfulBootAt: string;
};

export type StartupGateResult = {
	release: ReleaseManifest;
	localReleaseState?: LocalReleaseState;
	hadPersistedStore: boolean;
	store: Store;
};
