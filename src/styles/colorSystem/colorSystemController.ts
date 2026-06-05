import {
	type ColorSystemState,
	defaultColorSystemState,
	type ResolvedColorSystem,
	type ThemeMode,
	type ThemeVersion,
	themeModes,
	themeVersions,
} from "./colorSystemTypes";
import { resolvedColorSystems } from "./generated/colorSystem.generated";

/**
 * 颜色系统运行时控制层。
 *
 * 设计目的：把生成期产物投射成应用运行时可读写的主题状态，并把 DOM 上的主题标记作为 CSS 变量选择器入口。
 * 原理：颜色值本身来自 generated 产物，本模块只负责状态归一化、document dataset 同步、浏览器壳层色同步和订阅广播。
 */
type ColorSystemListener = (colorSystem: ResolvedColorSystem) => void;

const listeners = new Set<ColorSystemListener>();
// currentState 服务无 document 的执行环境；浏览器环境会从 document.dataset 恢复状态，避免运行时内存和 DOM 标记分叉。
let currentState: ColorSystemState = { ...defaultColorSystemState };

// 白名单来自手写主题契约，外部传入未知值时回落到默认主题。
const THEME_MODES = new Set<ThemeMode>(themeModes);
const THEME_VERSIONS = new Set<ThemeVersion>(themeVersions);

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
	// theme-color 属于浏览器壳层状态；无 document 环境直接跳过，保持颜色解析函数可在非 DOM 侧复用。
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
		// semantic key 是主题契约；缺失时让调用点失败，避免浏览器壳层颜色静默退回到错误值。
		throw new Error(`Missing semantic color "${key}" in resolved color system "${colorSystem.id}"`);
	}
	return color.hex;
}

function notifyListeners(colorSystem: ResolvedColorSystem) {
	// 监听者只接收已提交的颜色系统，状态写入和 DOM dataset 同步必须先完成。
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
		// dataset 是 CSS 与 JS 共享的主题状态边界；CSS 只依赖这两个属性选择生成的变量表。
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

	// document.dataset 可能由预加载脚本先写入；读取当前颜色系统时以 DOM 标记为浏览器侧状态源。
	const root = document.documentElement;
	const nextState = normalizeColorSystemState({
		mode: isThemeMode(root.dataset.themeMode) ? root.dataset.themeMode : defaultColorSystemState.mode,
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
