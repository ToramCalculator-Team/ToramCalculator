import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	type ColorSystemId,
	type ResolvedColorSystem,
	type ResolvedColorValue,
	type ThemeMode,
	type ThemeVersion,
	themeModes,
	themeVersions,
} from "../colorSystemTypes";

/**
 * 独立二维颜色系统生成器。
 *
 * 运行方式：
 * - `pnpm generate:colorSystem`
 * - `tsx src/styles/colorSystem/generator/generator.ts`
 *
 * 输入来源：
 * - figma插件：Tokens Studio for Figma
 *
 * 运行逻辑：
 * 1. 读取 `tokens/Token/*.json` 作为 primitive 风格版本层。
 * 2. 读取 `tokens/Style/*.json` 作为 semantic 明暗主题层。
 * 3. 解析 Tokens Studio 的 `{path.to.token}` 引用。
 * 4. 对缺失引用、循环引用、重复规范化键名直接失败，不做 fallback。
 * 5. 生成 TS / CSS 两份产物。
 *
 * 输出原则：
 * - 生成器只输出中立颜色投影，不输出 Babylon 这类具体运行时类实例。
 * - 为图形世界额外提供 `rgb01`，让 WebGL / Canvas / Babylon 能直接消费 0..1 浮点颜色。
 */

type TokenLeaf = {
	path: string[];
	fullPath: string;
	type: string;
	value: unknown;
};

type TokenLeafValue = {
	type: string;
	value: unknown;
};

type ColorValue = ResolvedColorValue;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const colorSystemDir = path.resolve(__dirname, "..");
const tokensDir = path.join(colorSystemDir, "tokens");
const generatedDir = path.join(colorSystemDir, "generated");

const outputTsFile = path.join(generatedDir, "colorSystem.generated.ts");
const outputCssFile = path.join(generatedDir, "colorSystem.generated.css");

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readTokenLeaf(value: unknown): TokenLeafValue | null {
	if (!isPlainObject(value)) return null;

	// Tokens Studio 新导出默认使用 DTCG `$type/$value`；旧导出使用 `type/value`，这里统一成内部 leaf 形状。
	if (typeof value.$type === "string" && "$value" in value) {
		return { type: value.$type, value: value.$value };
	}
	if (typeof value.type === "string" && "value" in value) {
		return { type: value.type, value: value.value };
	}
	return null;
}

function walkTokens(node: unknown, prefix: string[] = [], leaves: TokenLeaf[] = []): TokenLeaf[] {
	if (!isPlainObject(node)) {
		return leaves;
	}

	for (const [key, value] of Object.entries(node)) {
		if (key.startsWith("$")) {
			continue;
		}

		const leaf = readTokenLeaf(value);
		if (leaf) {
			leaves.push({
				path: [...prefix, key],
				fullPath: [...prefix, key].join("."),
				type: leaf.type,
				value: leaf.value,
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
	return match ? (match[1] ?? null) : null;
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
			return resolveTokenValue(
				reference,
				fallbackMap,
				fallbackMaps.filter((item) => item !== fallbackMap),
				nextStack,
			);
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

function assertUniqueKey(groupName: string, entryLabel: string, key: string, existing: Map<string, string>) {
	const previous = existing.get(key);
	if (previous) {
		throw new Error(`Duplicate ${groupName} key "${key}" from "${previous}" and "${entryLabel}"`);
	}
	existing.set(key, entryLabel);
}

function logGenerate(message: string) {
	console.log(`[color-system] ${message}`);
}

function summarizeTokenTypes(leaves: TokenLeaf[]): string {
	const counts = new Map<string, number>();
	for (const leaf of leaves) {
		counts.set(leaf.type, (counts.get(leaf.type) ?? 0) + 1);
	}
	return [...counts.entries()]
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([type, count]) => `${type}=${count}`)
		.join(", ");
}

function assertTokenLeaves(fileLabel: string, leaves: TokenLeaf[]) {
	if (leaves.length > 0) return;
	throw new Error(`Token file "${fileLabel}" produced 0 token leaves; check token format and export settings`);
}

function assertResolvedThemeHasContent(
	mode: ThemeMode,
	version: ThemeVersion,
	primitiveColors: Record<string, ColorValue>,
	semanticColors: Record<string, ColorValue>,
	cssVars: Record<string, string>,
) {
	if (Object.keys(primitiveColors).length === 0) {
		throw new Error(`Resolved color system "${mode}.${version}" has 0 primitive colors`);
	}
	if (Object.keys(semanticColors).length === 0) {
		throw new Error(`Resolved color system "${mode}.${version}" has 0 semantic colors`);
	}
	if (!semanticColors.primary) {
		throw new Error(`Resolved color system "${mode}.${version}" is missing semantic color "primary"`);
	}
	if (Object.keys(cssVars).length === 0) {
		throw new Error(`Resolved color system "${mode}.${version}" has 0 CSS variables`);
	}
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
	logGenerate(`metadata tokenSetOrder=${metadata.tokenSetOrder.join(", ")}`);

	const expectedTokenSets = [
		...themeVersions.map((version) => `Token/${version}`),
		...themeModes.map((mode) => `Style/${mode}`),
	];
	const missingExpectedTokenSets = expectedTokenSets.filter((tokenSet) => !metadata.tokenSetOrder?.includes(tokenSet));
	if (missingExpectedTokenSets.length > 0) {
		throw new Error(`Tokens metadata is missing expected token sets: ${missingExpectedTokenSets.join(", ")}`);
	}
	const skippedTokenSets = metadata.tokenSetOrder.filter((tokenSet) => !expectedTokenSets.includes(tokenSet));
	if (skippedTokenSets.length > 0) {
		logGenerate(`skip token sets outside color system=${skippedTokenSets.join(", ")}`);
	}

	const primitiveByVersion = new Map<ThemeVersion, Map<string, TokenLeaf>>();
	for (const version of themeVersions) {
		const tokenFile = path.join(tokensDir, "Token", `${version}.json`);
		const tokenLeaves = walkTokens(await readJsonFile(tokenFile));
		assertTokenLeaves(`Token/${version}`, tokenLeaves);
		logGenerate(`read Token/${version}: tokens=${tokenLeaves.length} (${summarizeTokenTypes(tokenLeaves)})`);
		primitiveByVersion.set(version, new Map(tokenLeaves.map((leaf) => [leaf.fullPath, leaf])));
	}

	const styleByMode = new Map<ThemeMode, Map<string, TokenLeaf>>();
	for (const mode of themeModes) {
		const styleFile = path.join(tokensDir, "Style", `${mode}.json`);
		const styleLeaves = walkTokens(await readJsonFile(styleFile));
		assertTokenLeaves(`Style/${mode}`, styleLeaves);
		logGenerate(`read Style/${mode}: tokens=${styleLeaves.length} (${summarizeTokenTypes(styleLeaves)})`);
		styleByMode.set(mode, new Map(styleLeaves.map((leaf) => [leaf.fullPath, leaf])));
	}

	// 类型说明：Object.fromEntries 会丢失 themeModes/themeVersions 的字面量键；运行时键由同一组手写常量生成。
	const resolvedColorSystems = Object.fromEntries(
		themeModes.map((mode) => [mode, Object.fromEntries(themeVersions.map((version) => [version, null]))]),
	) as Record<ThemeMode, Record<ThemeVersion, ResolvedColorSystem | null>>;

	const cssRules: string[] = ["/* This file is auto-generated by src/styles/colorSystem/generator/generator.ts */"];

	for (const mode of themeModes) {
		for (const version of themeVersions) {
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
			for (const leaf of [...primitiveMap.values()].sort((left, right) =>
				left.fullPath.localeCompare(right.fullPath),
			)) {
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
			assertResolvedThemeHasContent(mode, version, primitiveColors, semanticColors, cssVars);
			logGenerate(
				`resolve ${mode}.${version}: primitive=${Object.keys(primitiveColors).length}, semantic=${Object.keys(semanticColors).length}, numbers=${Object.keys(numberTokens).length}, cssVars=${Object.keys(cssVars).length}`,
			);

			const id: ColorSystemId = `${mode}.${version}`;
			const resolvedColorSystem: ResolvedColorSystem = {
				id,
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

			cssRules.push(`:root[data-theme-mode="${mode}"][data-theme-version="${version}"] {`, ...cssVarLines, "}", "");
		}
	}

	const tsOutput =
		`/* This file is auto-generated by src/styles/colorSystem/generator/generator.ts */\n` +
		`import type { ResolvedColorSystem, ThemeMode, ThemeVersion } from "../colorSystemTypes";\n` +
		`export type { ColorSystemId, ColorSystemState, ResolvedColorSystem, ResolvedColorValue, ThemeMode, ThemeVersion } from "../colorSystemTypes";\n` +
		`export { defaultColorSystemState, themeModes as availableThemeModes, themeVersions as availableThemeVersions } from "../colorSystemTypes";\n` +
		`export const resolvedColorSystems = ${serializeForTs(resolvedColorSystems)} as const satisfies Record<ThemeMode, Record<ThemeVersion, ResolvedColorSystem>>;\n`;

	await mkdir(generatedDir, { recursive: true });
	await writeFile(outputTsFile, tsOutput, "utf8");
	await writeFile(outputCssFile, `${cssRules.join("\n").trim()}\n`, "utf8");
	logGenerate(`write ${path.relative(process.cwd(), outputTsFile)}`);
	logGenerate(`write ${path.relative(process.cwd(), outputCssFile)}`);
}

// 脚本入口：任何解析或生成失败都直接让进程以失败状态结束，避免产出半残废结果。
void main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
