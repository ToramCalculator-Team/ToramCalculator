import { getActStore } from "~/store";
import { getCurrentReleaseManifest } from "./release";
import type { LocalReleaseState, ReleaseManifest, StartupGateResult } from "./types";

export const LOCAL_RELEASE_STATE_KEY = "app:release-state";

let startupGatePromise: Promise<StartupGateResult> | undefined;
let startupGateResult: StartupGateResult | undefined;

const safeParse = (value: string | null): unknown => {
	if (!value) return undefined;
	try {
		return JSON.parse(value);
	} catch {
		return undefined;
	}
};

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object";

const readLocalReleaseState = (): LocalReleaseState | undefined => {
	const parsed = safeParse(localStorage.getItem(LOCAL_RELEASE_STATE_KEY));
	if (!isRecord(parsed)) return undefined;
	const releaseId = parsed.releaseId;
	const assetVersion = parsed.assetVersion;
	const storeSchemaVersion = parsed.storeSchemaVersion;
	const dbSchemaVersion = parsed.dbSchemaVersion;
	const lastSuccessfulBootAt = parsed.lastSuccessfulBootAt;

	if (
		typeof releaseId !== "string" ||
		typeof assetVersion !== "string" ||
		typeof storeSchemaVersion !== "number" ||
		typeof dbSchemaVersion !== "number" ||
		typeof lastSuccessfulBootAt !== "string"
	) {
		return undefined;
	}

	return { releaseId, assetVersion, storeSchemaVersion, dbSchemaVersion, lastSuccessfulBootAt };
};

const createOfflineRelease = (state: LocalReleaseState): ReleaseManifest => ({
	releaseId: state.releaseId,
	assetVersion: state.assetVersion,
	swVersion: state.releaseId,
	storeSchemaVersion: state.storeSchemaVersion,
	dbSchemaVersion: state.dbSchemaVersion,
	minCompatibleStoreSchemaVersion: state.storeSchemaVersion,
	minCompatibleDbSchemaVersion: state.dbSchemaVersion,
	generatedAt: state.lastSuccessfulBootAt,
});

const fetchReleaseManifest = async (): Promise<ReleaseManifest | undefined> => {
	try {
		const response = await fetch("/api/release", { cache: "no-store" });
		if (!response.ok) return undefined;
		return (await response.json()) as ReleaseManifest;
	} catch {
		return undefined;
	}
};

const writeLocalReleaseState = (release: ReleaseManifest) => {
	const state: LocalReleaseState = {
		releaseId: release.releaseId,
		assetVersion: release.assetVersion,
		storeSchemaVersion: release.storeSchemaVersion,
		dbSchemaVersion: release.dbSchemaVersion,
		lastSuccessfulBootAt: new Date().toISOString(),
	};
	localStorage.setItem(LOCAL_RELEASE_STATE_KEY, JSON.stringify(state));
};

async function runStartupGateImpl(): Promise<StartupGateResult> {
	const hadPersistedStore = !!localStorage.getItem("store");
	const localReleaseState = readLocalReleaseState();
	const fetchedRelease = await fetchReleaseManifest();
	const release =
		fetchedRelease ?? (localReleaseState ? createOfflineRelease(localReleaseState) : getCurrentReleaseManifest());

	// 设计说明：release gate 在完整应用挂载前修正 store，避免业务组件读到旧运行时状态。
	const store = getActStore();
	writeLocalReleaseState(release);

	return { release, localReleaseState, hadPersistedStore, store };
}

export function runStartupGate(): Promise<StartupGateResult> {
	if (!startupGatePromise) {
		startupGatePromise = runStartupGateImpl().then((result) => {
			startupGateResult = result;
			return result;
		});
	}
	return startupGatePromise;
}

export function getStartupGateResult(): StartupGateResult | undefined {
	return startupGateResult;
}
