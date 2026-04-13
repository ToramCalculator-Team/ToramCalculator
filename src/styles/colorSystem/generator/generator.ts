import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * 独立二维颜色系统生成器。
 *
 * 运行方式：
 * - `pnpm generate:color-system`
 * - `tsx src/styles/colorSystem/generator/generator.ts`
 *
 * 运行逻辑：
 * 1. 读取 `tokens/Token/*.json` 作为 primitive 风格版本层。
 * 2. 读取 `tokens/Style/*.json` 作为 semantic 明暗主题层。
 * 3. 解析 Tokens Studio 的 `{path.to.token}` 引用。
 * 4. 对缺失引用、循环引用、重复规范化键名直接失败，不做 fallback。
 * 5. 生成 TS / CSS / preload 三份产物。
 *
 * 输出原则：
 * - 生成器只输出中立颜色投影，不输出 Babylon 这类具体运行时类实例。
 * - 为图形世界额外提供 `rgb01`，让 WebGL / Canvas / Babylon 能直接消费 0..1 浮点颜色。
 */

type ThemeMode = "light" | "dark";
type ThemeVersion = "v1" | "v2" | "v3";

type TokenLeaf = {
	path: string[];
	fullPath: string;
	type: string;
	value: unknown;
};

type ColorValue = {
	rgb: [number, number, number];
	rgb01: [number, number, number];
	alpha: number;
	cssRgb: string;
	hex: string;
};

const THEME_MODES = ["light", "dark"] as const satisfies readonly ThemeMode[];
const THEME_VERSIONS = ["v1", "v2", "v3"] as const satisfies readonly ThemeVersion[];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const colorSystemDir = path.resolve(__dirname, "..");
const tokensDir = path.join(colorSystemDir, "tokens");
const generatedDir = path.join(colorSystemDir, "generated");
const publicDir = path.resolve(colorSystemDir, "..", "..", "..", "public");

const outputTsFile = path.join(generatedDir, "colorSystem.generated.ts");
const outputCssFile = path.join(generatedDir, "colorSystem.generated.css");

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTokenLeaf(value: unknown): value is { value: unknown; type: string } {
	return isPlainObject(value) && "value" in value && "type" in value;
}

function walkTokens(node: unknown, prefix: string[] = [], leaves: TokenLeaf[] = []): TokenLeaf[] {
	if (!isPlainObject(node)) {
		return leaves;
	}

	for (const [key, value] of Object.entries(node)) {
		if (key.startsWith("$")) {
			continue;
		}

		if (isTokenLeaf(value)) {
			leaves.push({
				path: [...prefix, key],
				fullPath: [...prefix, key].join("."),
				type: value.type,
				value: value.value,
			});
			continue;
		}

		walkTokens(value, [...prefix, key], leaves);
	}

	return leaves;
}

async function readJsonFile(filePath: string): Promise<unknown> {
	const content = await readFile(filePath, "utf8");
	return JSON.parse(content) as unknown;
}

function parseReference(raw: string): string | null {
	const match = raw.trim().match(/^\{(.+)\}$/);
	return match ? match[1] ?? null : null;
}

function resolveTokenValue(
	tokenPath: string,
	sourceMap: Map<string, TokenLeaf>,
	fallbackMaps: Map<string, TokenLeaf>[],
	stack: string[] = [],
): unknown {
	if (stack.includes(tokenPath)) {
		throw new Error(`Circular token reference detected: ${[...stack, tokenPath].join(" -> ")}`);
	}

	const token = sourceMap.get(tokenPath) ?? fallbackMaps.map((map) => map.get(tokenPath)).find(Boolean);
	if (!token) {
		throw new Error(`Missing token reference "${tokenPath}"`);
	}

	const nextStack = [...stack, tokenPath];
	const reference = typeof token.value === "string" ? parseReference(token.value) : null;
	if (!reference) {
		return token.value;
	}

	if (sourceMap.has(reference)) {
		return resolveTokenValue(reference, sourceMap, fallbackMaps, nextStack);
	}

	for (const fallbackMap of fallbackMaps) {
		if (fallbackMap.has(reference)) {
			return resolveTokenValue(reference, fallbackMap, fallbackMaps.filter((item) => item !== fallbackMap), nextStack);
		}
	}

	throw new Error(`Missing token reference "${reference}" from "${tokenPath}"`);
}

function roundAlpha(alpha: number): number {
	if (Math.abs(alpha - 1) < 0.0005) {
		return 1;
	}
	return Math.round(alpha * 1000) / 1000;
}

function formatAlpha(alpha: number): string {
	return String(roundAlpha(alpha));
}

function parseHexColor(input: string): ColorValue {
	const normalized = input.trim();
	if (!/^#([\da-fA-F]{6}|[\da-fA-F]{8})$/.test(normalized)) {
		throw new Error(`Unsupported color value "${input}"`);
	}

	const value = normalized.slice(1);
	const hasAlpha = value.length === 8;
	const r = Number.parseInt(value.slice(0, 2), 16);
	const g = Number.parseInt(value.slice(2, 4), 16);
	const b = Number.parseInt(value.slice(4, 6), 16);
	const alpha = hasAlpha ? roundAlpha(Number.parseInt(value.slice(6, 8), 16) / 255) : 1;
	const hex = `#${value.slice(0, 6).toLowerCase()}`;
	const cssRgb = alpha === 1 ? `${r} ${g} ${b}` : `${r} ${g} ${b} / ${formatAlpha(alpha)}`;

	return {
		rgb: [r, g, b],
		rgb01: [r / 255, g / 255, b / 255],
		alpha,
		cssRgb,
		hex,
	};
}

function toKebabCase(input: string): string {
	return input
		.replace(/([a-z\d])([A-Z])/g, "$1-$2")
		.replace(/[\s_./]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "")
		.toLowerCase();
}

function toCamelCase(input: string): string {
	const kebab = toKebabCase(input);
	return kebab.replace(/-([a-z\d])/g, (_, char: string) => char.toUpperCase());
}

function assertUniqueKey(
	groupName: string,
	entryLabel: string,
	key: string,
	existing: Map<string, string>,
) {
	const previous = existing.get(key);
	if (previous) {
		throw new Error(`Duplicate ${groupName} key "${key}" from "${previous}" and "${entryLabel}"`);
	}
	existing.set(key, entryLabel);
}

function serializeForTs(value: unknown): string {
	return JSON.stringify(value, null, 2);
}

function extractRadiusKey(tokenPath: string): string {
	const match = tokenPath.match(/(\d+)(?!.*\d)/);
	if (match?.[1]) {
		return `radius${match[1]}`;
	}
	return toCamelCase(tokenPath);
}

function extractRadiusCssVar(tokenPath: string): string {
	const match = tokenPath.match(/(\d+)(?!.*\d)/);
	if (match?.[1]) {
		return `radius-${match[1]}`;
	}
	return toKebabCase(tokenPath);
}

async function main() {
	const metadata = (await readJsonFile(path.join(tokensDir, "$metadata.json"))) as { tokenSetOrder?: string[] };
	if (!Array.isArray(metadata.tokenSetOrder)) {
		throw new Error("Tokens metadata is missing tokenSetOrder");
	}

	const primitiveByVersion = new Map<ThemeVersion, Map<string, TokenLeaf>>();
	for (const version of THEME_VERSIONS) {
		const tokenFile = path.join(tokensDir, "Token", `${version}.json`);
		const tokenLeaves = walkTokens(await readJsonFile(tokenFile));
		primitiveByVersion.set(
			version,
			new Map(tokenLeaves.map((leaf) => [leaf.fullPath, leaf])),
		);
	}

	const styleByMode = new Map<ThemeMode, Map<string, TokenLeaf>>();
	for (const mode of THEME_MODES) {
		const styleFile = path.join(tokensDir, "Style", `${mode}.json`);
		const styleLeaves = walkTokens(await readJsonFile(styleFile));
		styleByMode.set(
			mode,
			new Map(styleLeaves.map((leaf) => [leaf.fullPath, leaf])),
		);
	}

	const resolvedColorSystems: Record<ThemeMode, Record<ThemeVersion, unknown>> = {
		light: { v1: null, v2: null, v3: null },
		dark: { v1: null, v2: null, v3: null },
	};

	const cssRules: string[] = [
		"/* This file is auto-generated by src/styles/colorSystem/generator/generator.ts */",
	];

	for (const mode of THEME_MODES) {
		for (const version of THEME_VERSIONS) {
			const primitiveMap = primitiveByVersion.get(version);
			const styleMap = styleByMode.get(mode);
			if (!primitiveMap || !styleMap) {
				throw new Error(`Missing token set for ${mode}.${version}`);
			}

			const primitiveColors: Record<string, ColorValue> = {};
			const semanticColors: Record<string, ColorValue> = {};
			const numberTokens: Record<string, number> = {};
			const primitiveCssVars: Record<string, string> = {};
			const semanticCssVars: Record<string, string> = {};
			const numberCssVars: Record<string, string> = {};

			const primitiveTsKeyRegistry = new Map<string, string>();
			const primitiveCssVarRegistry = new Map<string, string>();
			for (const leaf of [...primitiveMap.values()].sort((left, right) => left.fullPath.localeCompare(right.fullPath))) {
				if (leaf.type !== "color") {
					continue;
				}

				const resolvedValue = resolveTokenValue(leaf.fullPath, primitiveMap, []);
				if (typeof resolvedValue !== "string") {
					throw new Error(`Primitive token "${leaf.fullPath}" must resolve to a color string`);
				}

				const leafName = leaf.path.at(-1);
				if (!leafName) {
					throw new Error(`Invalid primitive token path "${leaf.fullPath}"`);
				}

				const tsKey = toCamelCase(leafName);
				const cssVarName = leafName;
				assertUniqueKey("primitive color", leaf.fullPath, tsKey, primitiveTsKeyRegistry);
				assertUniqueKey("primitive CSS variable", leaf.fullPath, cssVarName, primitiveCssVarRegistry);

				const parsedColor = parseHexColor(resolvedValue);
				primitiveColors[tsKey] = parsedColor;
				primitiveCssVars[cssVarName] = parsedColor.cssRgb;
			}

			const semanticTsKeyRegistry = new Map<string, string>();
			const semanticCssVarRegistry = new Map<string, string>();
			for (const leaf of [...styleMap.values()].sort((left, right) => left.fullPath.localeCompare(right.fullPath))) {
				if (leaf.path[0] === "Colors" && leaf.type === "color") {
					const resolvedValue = resolveTokenValue(leaf.fullPath, styleMap, [primitiveMap]);
					if (typeof resolvedValue !== "string") {
						throw new Error(`Semantic token "${leaf.fullPath}" must resolve to a color string`);
					}

					const leafName = leaf.path.at(-1);
					if (!leafName) {
						throw new Error(`Invalid semantic token path "${leaf.fullPath}"`);
					}

					const tsKey = toCamelCase(leafName);
					const cssVarName = toKebabCase(leafName);
					assertUniqueKey("semantic color", leaf.fullPath, tsKey, semanticTsKeyRegistry);
					assertUniqueKey("semantic CSS variable", leaf.fullPath, cssVarName, semanticCssVarRegistry);

					const parsedColor = parseHexColor(resolvedValue);
					semanticColors[tsKey] = parsedColor;
					semanticCssVars[cssVarName] = parsedColor.cssRgb;
					continue;
				}

				if (leaf.path[0] === "Sizes" && leaf.type === "number") {
					const resolvedValue = resolveTokenValue(leaf.fullPath, styleMap, [primitiveMap]);
					if (typeof resolvedValue !== "number") {
						throw new Error(`Number token "${leaf.fullPath}" must resolve to a numeric value`);
					}

					const tsKey = extractRadiusKey(leaf.fullPath);
					const cssVarName = extractRadiusCssVar(leaf.fullPath);
					numberTokens[tsKey] = resolvedValue;
					numberCssVars[cssVarName] = `${resolvedValue}px`;
				}
			}

			const cssVars = {
				...Object.fromEntries(Object.entries(primitiveCssVars).sort(([left], [right]) => left.localeCompare(right))),
				...Object.fromEntries(Object.entries(semanticCssVars).sort(([left], [right]) => left.localeCompare(right))),
				...Object.fromEntries(Object.entries(numberCssVars).sort(([left], [right]) => left.localeCompare(right))),
			};

			const resolvedColorSystem = {
				id: `${mode}.${version}`,
				mode,
				version,
				colors: {
					primitive: primitiveColors,
					semantic: semanticColors,
				},
				numbers: numberTokens,
				cssVars,
			};

			resolvedColorSystems[mode][version] = resolvedColorSystem;

			const cssVarLines = Object.entries(cssVars)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([name, value]) => `  --${name}: ${value};`);

			cssRules.push(
				`:root[data-theme-mode="${mode}"][data-theme-version="${version}"] {`,
				...cssVarLines,
				"}",
				"",
			);
		}
	}

	const tsOutput = `/* This file is auto-generated by src/styles/colorSystem/generator/generator.ts */\n` +
		`export type ThemeMode = "light" | "dark";\n` +
		`export type ThemeVersion = "v1" | "v2" | "v3";\n` +
		`export type ColorSystemState = { mode: ThemeMode; version: ThemeVersion };\n` +
		`export type ResolvedColorValue = {\n` +
		`  rgb: [number, number, number];\n` +
		`  rgb01: [number, number, number];\n` +
		`  alpha: number;\n` +
		`  cssRgb: string;\n` +
		`  hex: string;\n` +
		`};\n` +
		`export type ResolvedColorSystem = {\n` +
		`  id: \`\${ThemeMode}.\${ThemeVersion}\`;\n` +
		`  mode: ThemeMode;\n` +
		`  version: ThemeVersion;\n` +
		`  colors: {\n` +
		`    primitive: Record<string, ResolvedColorValue>;\n` +
		`    semantic: Record<string, ResolvedColorValue>;\n` +
		`  };\n` +
		`  numbers: Record<string, number>;\n` +
		`  cssVars: Record<string, string>;\n` +
		`};\n` +
		`export const availableThemeModes = ${serializeForTs(THEME_MODES)} as const;\n` +
		`export const availableThemeVersions = ${serializeForTs(THEME_VERSIONS)} as const;\n` +
		`export const defaultColorSystemState = ${serializeForTs({ mode: "light", version: "v2" })} as const satisfies ColorSystemState;\n` +
		`export const resolvedColorSystems = ${serializeForTs(resolvedColorSystems)} as const satisfies Record<ThemeMode, Record<ThemeVersion, ResolvedColorSystem>>;\n`;

	await mkdir(generatedDir, { recursive: true });
	await mkdir(publicDir, { recursive: true });
	await writeFile(outputTsFile, tsOutput, "utf8");
	await writeFile(outputCssFile, `${cssRules.join("\n").trim()}\n`, "utf8");
}

// 脚本入口：任何解析或生成失败都直接让进程以失败状态结束，避免产出半残废结果。
void main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
