import {
	type ColorSystemState,
	defaultColorSystemState,
	type ResolvedColorSystem,
	resolvedColorSystems,
	type ThemeMode,
	type ThemeVersion,
} from "./generated/colorSystem.generated";

type ColorSystemListener = (colorSystem: ResolvedColorSystem) => void;

const listeners = new Set<ColorSystemListener>();
let currentState: ColorSystemState = { ...defaultColorSystemState };

const THEME_MODES = new Set<ThemeMode>(["light", "dark"]);
const THEME_VERSIONS = new Set<ThemeVersion>(["v1", "v2", "v3"]);

function isThemeMode(value: string | undefined): value is ThemeMode {
	return !!value && THEME_MODES.has(value as ThemeMode);
}

function isThemeVersion(value: string | undefined): value is ThemeVersion {
	return !!value && THEME_VERSIONS.has(value as ThemeVersion);
}

function normalizeColorSystemState(state: Partial<ColorSystemState>): ColorSystemState {
	return {
		mode: isThemeMode(state.mode) ? state.mode : defaultColorSystemState.mode,
		version: isThemeVersion(state.version) ? state.version : defaultColorSystemState.version,
	};
}

function syncThemeColor(themeColor: string) {
	if (typeof document === "undefined") {
		return;
	}

	const themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
	if (themeColorMeta) {
		themeColorMeta.setAttribute("content", themeColor);
	}
}

function getSemanticColorOrThrow(colorSystem: ResolvedColorSystem, key: string): string {
	const color = colorSystem.colors.semantic[key];
	if (!color) {
		throw new Error(`Missing semantic color "${key}" in resolved color system "${colorSystem.id}"`);
	}
	return color.hex;
}

function notifyListeners(colorSystem: ResolvedColorSystem) {
	for (const listener of listeners) {
		listener(colorSystem);
	}
}

export type { ColorSystemState, ResolvedColorSystem, ThemeMode, ThemeVersion };

export function resolveColorSystem(mode: ThemeMode, version: ThemeVersion): ResolvedColorSystem {
	return resolvedColorSystems[mode][version];
}

export function getColorSystemThemeColor(colorSystem: ResolvedColorSystem): string {
	// 浏览器壳层 theme-color 当前明确跟随 semantic.primary。
	return getSemanticColorOrThrow(colorSystem, "primary");
}

export function applyColorSystem(state: ColorSystemState): void {
	currentState = normalizeColorSystemState(state);
	const colorSystem = resolveColorSystem(currentState.mode, currentState.version);

	if (typeof document !== "undefined") {
		const root = document.documentElement;
		root.dataset.themeMode = currentState.mode;
		root.dataset.themeVersion = currentState.version;
		syncThemeColor(getColorSystemThemeColor(colorSystem));
	}

	notifyListeners(colorSystem);
}

export function getCurrentColorSystem(): ResolvedColorSystem {
	if (typeof document === "undefined") {
		return resolveColorSystem(currentState.mode, currentState.version);
	}

	const root = document.documentElement;
	const nextState = normalizeColorSystemState({
		mode: isThemeMode(root.dataset.themeMode)
			? root.dataset.themeMode
			: defaultColorSystemState.mode,
		version: isThemeVersion(root.dataset.themeVersion) ? root.dataset.themeVersion : defaultColorSystemState.version,
	});

	currentState = nextState;
	return resolveColorSystem(currentState.mode, currentState.version);
}

export function subscribeColorSystem(listener: ColorSystemListener): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}
