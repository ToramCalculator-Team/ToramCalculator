/**
 * 颜色系统稳定契约。
 *
 * 设计目的：把主题枚举、默认状态和 resolved 数据形状放在手写源文件里，生成器只负责产出 token 解析后的数据。
 * 原理：类型结构变化需要人工审查；颜色值、CSS 变量和 token 投影由生成器根据设计 token 重建。
 */

// const 断言保留运行时数组的字面量成员，ThemeMode/ThemeVersion 从这两个常量反推。
export const themeModes = ["light", "dark"] as const;
export const themeVersions = ["v1", "v2", "v3"] as const;

export type ThemeMode = (typeof themeModes)[number];
export type ThemeVersion = (typeof themeVersions)[number];
export type ColorSystemId = `${ThemeMode}.${ThemeVersion}`;

export type ColorSystemState = { mode: ThemeMode; version: ThemeVersion };

// const 断言保留默认主题的精确值，satisfies 负责校验它仍满足公开状态契约。
export const defaultColorSystemState = { mode: "light", version: "v2" } as const satisfies ColorSystemState;

export type ResolvedColorValue = {
	rgb: [number, number, number];
	rgb01: [number, number, number];
	alpha: number;
	cssRgb: string;
	hex: string;
};

export type ResolvedColorSystem = {
	id: ColorSystemId;
	mode: ThemeMode;
	version: ThemeVersion;
	colors: {
		primitive: Record<string, ResolvedColorValue>;
		semantic: Record<string, ResolvedColorValue>;
	};
	numbers: Record<string, number>;
	cssVars: Record<string, string>;
};
