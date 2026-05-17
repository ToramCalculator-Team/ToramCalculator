/**
 * @file importCySkillsToBackups.ts
 * @description 将 cy-grimoire 技能资料追加写入备份 CSV。
 *
 * 设计目标：
 * - 只做资料级导入，先把外部技能树、装备条件、公式和分支原样保真落到备份文件。
 * - 不尝试在此阶段把 branches 自动翻译成可执行 BT，避免错误运行化污染战斗逻辑。
 * - 使用稳定 cy.* 前缀 id，让脚本可以重复运行并通过重复 id 跳过已有导入结果。
 */

import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { createId } = require("@paralleldrive/cuid2") as typeof import("@paralleldrive/cuid2");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_SOURCE_PATH = "C:/Users/mayun/Downloads/toram-skills.json";
const DEFAULT_BACKUP_DIR = path.join(__dirname, "../backups");
const CY_SOURCE = "cy-grimoire";

const SKILL_HEADER = [
	"id",
	"treeType",
	"posX",
	"posY",
	"tier",
	"name",
	"isPassive",
	"chargingType",
	"distanceType",
	"targetType",
	"details",
	"dataSources",
	"statisticId",
	"preSkillId",
	"updatedByAccountId",
	"createdByAccountId",
] as const;

const SKILL_VARIANT_HEADER = [
	"id",
	"targetMainWeaponType",
	"targetSubWeaponType",
	"targetArmorAbilityType",
	"hpCost",
	"mpCost",
	"description",
	"activeEffect",
	"passiveEffects",
	"buffs",
	"elementLogic",
	"castingRange",
	"effectiveRange",
	"actionFixedMs",
	"actionModifiedMs",
	"chantingFixedMs",
	"chantingModifiedMs",
	"chargingFixedMs",
	"chargingModifiedMs",
	"startupMs",
	"details",
	"belongToskillId",
] as const;

const STATISTIC_HEADER = ["id", "updatedAt", "createdAt", "usageTimestamps", "viewTimestamps"] as const;

const TREE_TYPE_MAP = new Map<string, string>([
	["劍術技能", "BladeSkill"],
	["射擊技能", "ShootSkill"],
	["魔法技能", "MagicSkill"],
	["格鬥技能", "MarshallSkill"],
	["雙劍技能", "DualSwordSkill"],
	["斧槍技能", "HalberdSkill"],
	["武士技能", "MononofuSkill"],
	["粉碎者技能", "CrusherSkill"],
	["靈魂技能", "FeatheringSkill"],
	["防衛技能", "GuardSkill"],
	["防護技能", "ShieldSkill"],
	["刀術技能", "KnifeSkill"],
	["騎士精神", "KnightSkill"],
	["狩獵技能", "HunterSkill"],
	["祭司技能", "PriestSkill"],
	["暗殺技能", "AssassinSkill"],
	["巫師技能", "WizardSkill"],
	["輔助技能", "SupportSkill"],
	["好戰份子", "BattleSkill"],
	["生存本能", "SurvivalSkill"],
	["鍛冶大師", "SmithSkill"],
	["鍊金術士", "AlchemySkill"],
	["馴獸天分", "TamerSkill"],
	["暗黑之力", "DarkPowerSkill"],
	["魔劍技能", "MagicBladeSkill"],
	["舞者", "DancerSkill"],
	["吟遊詩人", "MinstrelSkill"],
	["徒手戰鬥", "BareHandSkill"],
	["忍者技能", "NinjaSkill"],
	["游擊隊技能", "PartisanSkill"],
	["死靈法術", "NecromancerSkill"],
	["魔像技能", "GolemSkill"],
	["寵物技能", "PetSkill"],
]);

const MAIN_WEAPON_MAP = new Map<string, string>([
	["單手劍", "OneHandSword"],
	["雙手劍", "TwoHandSword"],
	["弓", "Bow"],
	["弩", "Bowgun"],
	["法杖", "Rod"],
	["魔導具", "Magictool"],
	["拳套", "Knuckle"],
	["旋風槍", "Halberd"],
	["拔刀劍", "Katana"],
	["空手", "None"],
	["雙劍", "OneHandSword"],
]);

const SUB_WEAPON_MAP = new Map<string, string>([
	["箭矢", "Arrow"],
	["小刀", "ShortSword"],
	["忍術卷軸", "NinjutsuScroll"],
	["盾牌", "Shield"],
	["魔導具", "Magictool"],
	["拳套", "Knuckle"],
	["拔刀劍", "Katana"],
	["無裝備", "None"],
]);

const ARMOR_MAP = new Map<string, string>([
	["輕量化", "Light"],
	["重量化", "Heavy"],
]);

type CsvValue = string | null;
type CsvRow = Record<string, CsvValue>;

interface CySkillFile {
	meta: {
		source?: string;
		dataSource?: Record<string, string>;
		fetchedAt?: string;
		language?: string;
		counts?: Record<string, number>;
	};
	categories: CyCategory[];
}

interface CyCategory {
	id: number;
	name: string;
	skillTrees: CySkillTree[];
}

interface CySkillTree {
	id: number;
	name: string;
	simulatorFlag: boolean;
	drawTreeCode: string;
	skills: CySkill[];
}

interface CySkill {
	id: number;
	name: string;
	previousSkillId: number;
	drawTreeOrder: number;
	history?: unknown;
	effects: CyEffect[];
}

interface CyEffect {
	mainWeapon: string | null;
	subWeapon: string | null;
	bodyArmor: string | null;
	isDefault: boolean;
	equipmentOperatorAnd: boolean;
	isHistory: boolean;
	historyTargetEffectId: number | null;
	historyDate: string | null;
	mpCost: string | null;
	range: string | null;
	skillType: string | null;
	inCombo: string | null;
	actionTime: string | null;
	castingTime: string | null;
	branches: CyBranch[];
}

interface CyBranch {
	id: number;
	name: string;
	attributes: CyAttribute[];
}

interface CyAttribute {
	name: string;
	value: string | null;
	extra: string | null;
}

interface CliOptions {
	sourcePath: string;
	backupDir: string;
	dryRun: boolean;
}

interface ImportReport {
	plannedSkills: number;
	plannedVariants: number;
	writtenSkills: number;
	writtenVariants: number;
	writtenStatistics: number;
	duplicateSkillsSkipped: number;
	duplicateVariantsSkipped: number;
	duplicateStatisticsSkipped: number;
	skippedSkills: number;
	skippedVariants: number;
	skippedTrees: Map<string, { skills: number; variants: number }>;
	unknownValues: Map<string, Set<string>>;
	defaultEffectErrors: string[];
	existingImportedSkillsSkipped: number;
	existingImportedVariantsSkipped: number;
	inheritance: {
		effectsInheritedFromDefault: number;
		fieldsInherited: Record<string, number>;
		branchOverridesMerged: number;
		attributeOverridesMerged: number;
	};
}

interface PreparedRows {
	skillRows: CsvRow[];
	variantRows: CsvRow[];
	statisticRows: CsvRow[];
	report: ImportReport;
}

interface EquipmentMapping {
	main: string;
	sub: string;
	armor: string;
}

function createReport(): ImportReport {
	return {
		plannedSkills: 0,
		plannedVariants: 0,
		writtenSkills: 0,
		writtenVariants: 0,
		writtenStatistics: 0,
		duplicateSkillsSkipped: 0,
		duplicateVariantsSkipped: 0,
		duplicateStatisticsSkipped: 0,
		skippedSkills: 0,
		skippedVariants: 0,
		skippedTrees: new Map(),
		unknownValues: new Map(),
		defaultEffectErrors: [],
		existingImportedSkillsSkipped: 0,
		existingImportedVariantsSkipped: 0,
		inheritance: {
			effectsInheritedFromDefault: 0,
			fieldsInherited: {},
			branchOverridesMerged: 0,
			attributeOverridesMerged: 0,
		},
	};
}

function parseCliOptions(argv: string[]): CliOptions {
	const options: CliOptions = {
		sourcePath: DEFAULT_SOURCE_PATH,
		backupDir: DEFAULT_BACKUP_DIR,
		dryRun: false,
	};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--source") {
			const value = argv[i + 1];
			if (!value) throw new Error("--source 需要提供文件路径");
			options.sourcePath = value;
			i++;
			continue;
		}
		if (arg === "--backup-dir") {
			const value = argv[i + 1];
			if (!value) throw new Error("--backup-dir 需要提供目录路径");
			options.backupDir = value;
			i++;
			continue;
		}
		if (arg === "--dry-run") {
			options.dryRun = true;
			continue;
		}
		throw new Error(`未知参数: ${arg}`);
	}

	return options;
}

function readJsonFile(filePath: string): CySkillFile {
	if (!fs.existsSync(filePath)) {
		throw new Error(`找不到源文件: ${filePath}`);
	}
	return JSON.parse(fs.readFileSync(filePath, "utf-8")) as CySkillFile;
}

function csvEscape(value: unknown): string {
	if (value == null) return "";
	const text = String(value);
	if (text === "") return "\"\"";
	if (!/[",\r\n]/.test(text)) return text;
	return `"${text.replace(/"/g, '""')}"`;
}

function csvLine(header: readonly string[], row: CsvRow): string {
	return header.map((field) => csvEscape(row[field])).join(",");
}

/**
 * 解析现有备份 CSV 的 id 列。
 *
 * 职责：
 * - 只读取首列 id，用于追加模式下识别重复数据。
 * - 不承担完整 CSV 语义解析，避免把大型 JSON 字段展开成无用结构。
 */
function readExistingIds(csvPath: string): Set<string> {
	const content = fs.readFileSync(csvPath, "utf-8");
	const records = parseCsvRecords(content);
	const ids = new Set<string>();
	for (const record of records.slice(1)) {
		const id = record[0];
		if (id) ids.add(id);
	}
	return ids;
}

function parseCsvRecords(content: string): string[][] {
	const records: string[][] = [];
	let field = "";
	let record: string[] = [];
	let inQuotes = false;

	for (let i = 0; i < content.length; i++) {
		const char = content[i];
		const next = content[i + 1];

		if (inQuotes) {
			if (char === '"' && next === '"') {
				field += '"';
				i++;
				continue;
			}
			if (char === '"') {
				inQuotes = false;
				continue;
			}
			field += char;
			continue;
		}

		if (char === '"') {
			inQuotes = true;
			continue;
		}
		if (char === ",") {
			record.push(field);
			field = "";
			continue;
		}
		if (char === "\n") {
			record.push(field);
			records.push(record);
			field = "";
			record = [];
			continue;
		}
		if (char === "\r") {
			continue;
		}
		field += char;
	}

	if (field.length > 0 || record.length > 0) {
		record.push(field);
		records.push(record);
	}

	return records;
}

function assertHeader(csvPath: string, expected: readonly string[]): void {
	const content = fs.readFileSync(csvPath, "utf-8");
	const [header] = parseCsvRecords(content);
	const actual = header?.join(",");
	const expectedText = expected.join(",");
	if (actual !== expectedText) {
		throw new Error(`CSV 表头不匹配: ${csvPath}\n实际: ${actual}\n期望: ${expectedText}`);
	}
}

function appendRows(csvPath: string, header: readonly string[], rows: CsvRow[]): void {
	if (rows.length === 0) return;
	const content = fs.readFileSync(csvPath, "utf-8");
	const lineEnding = content.includes("\r\n") ? "\r\n" : "\n";
	const needsLeadingNewline = content.length > 0 && !content.endsWith("\n");
	const text = `${needsLeadingNewline ? lineEnding : ""}${rows.map((row) => csvLine(header, row)).join(lineEnding)}${lineEnding}`;
	fs.appendFileSync(csvPath, text, "utf-8");
}

function addUnknown(report: ImportReport, kind: string, value: string): void {
	let values = report.unknownValues.get(kind);
	if (!values) {
		values = new Set();
		report.unknownValues.set(kind, values);
	}
	values.add(value);
}

function addSkippedTree(report: ImportReport, treeName: string, skill: CySkill): void {
	const current = report.skippedTrees.get(treeName) ?? { skills: 0, variants: 0 };
	current.skills += 1;
	current.variants += skill.effects.length;
	report.skippedTrees.set(treeName, current);
	report.skippedSkills += 1;
	report.skippedVariants += skill.effects.length;
}

function mapSkillTypeToChargingType(skillType: string | null): string {
	if (skillType === "須詠唱") return "Chanting";
	if (skillType === "須蓄力") return "Reservoir";
	return "None";
}

function toPostgresTimestamp(value: string | undefined): string {
	const date = value ? new Date(value) : new Date();
	if (Number.isNaN(date.getTime())) return "2026-05-15 00:00:00.000";
	return date.toISOString().replace("T", " ").replace("Z", "");
}

function stringifyJson(value: unknown): string {
	return JSON.stringify(value);
}

function mapEquipment(effect: CyEffect, report: ImportReport): EquipmentMapping {
	let main = "Any";
	let sub = "Any";
	let armor = "Any";

	if (effect.mainWeapon) {
		const mapped = MAIN_WEAPON_MAP.get(effect.mainWeapon);
		if (mapped) {
			main = mapped;
			if (effect.mainWeapon === "雙劍") sub = "OneHandSword";
		} else {
			addUnknown(report, "mainWeapon", effect.mainWeapon);
		}
	}

	if (effect.subWeapon) {
		const mapped = SUB_WEAPON_MAP.get(effect.subWeapon);
		if (mapped) {
			sub = mapped;
		} else {
			addUnknown(report, "subWeapon", effect.subWeapon);
		}
	}

	if (effect.bodyArmor) {
		const mapped = ARMOR_MAP.get(effect.bodyArmor);
		if (mapped) {
			armor = mapped;
		} else {
			addUnknown(report, "bodyArmor", effect.bodyArmor);
		}
	}

	return { main, sub, armor };
}

function mergeEffect(defaultEffect: CyEffect, effect: CyEffect, report: ImportReport): CyEffect {
	if (effect.isDefault) return structuredClone(effect);

	report.inheritance.effectsInheritedFromDefault += 1;

	const merged: CyEffect = {
		...structuredClone(defaultEffect),
		...structuredClone(effect),
		branches: mergeBranches(defaultEffect.branches, effect.branches, report),
	};

	for (const key of Object.keys(defaultEffect) as Array<keyof CyEffect>) {
		if (key === "branches") continue;
		if (effect[key] == null) {
			(merged as Record<string, unknown>)[key] = defaultEffect[key];
			report.inheritance.fieldsInherited[String(key)] = (report.inheritance.fieldsInherited[String(key)] ?? 0) + 1;
		}
	}

	return merged;
}

/**
 * 合并默认 effect 与装备差分 effect 的 branches。
 *
 * 原理：
 * - cy-grimoire 的非默认 effect 常只写“相对默认效果的差分”。
 * - 空 name 的 branch 通常仍然借用同 id 默认 branch 的语义，因此优先按 id 找默认分支。
 * - attributes 以 name 为稳定键，同名覆盖、不同名追加，保证公式差分不会丢掉默认分支的其它字段。
 */
function mergeBranches(defaultBranches: CyBranch[], overrideBranches: CyBranch[], report: ImportReport): CyBranch[] {
	const result = structuredClone(defaultBranches);

	for (const overrideBranch of overrideBranches) {
		const index = findBranchIndex(result, overrideBranch);
		if (index === -1) {
			result.push(structuredClone(overrideBranch));
			continue;
		}

		report.inheritance.branchOverridesMerged += 1;
		const baseBranch = result[index];
		result[index] = {
			...baseBranch,
			...structuredClone(overrideBranch),
			name: overrideBranch.name || baseBranch.name,
			attributes: mergeAttributes(baseBranch.attributes, overrideBranch.attributes, report),
		};
	}

	return result;
}

function findBranchIndex(branches: CyBranch[], overrideBranch: CyBranch): number {
	const exactIndex = branches.findIndex((branch) => branch.id === overrideBranch.id && branch.name === overrideBranch.name);
	if (exactIndex !== -1) return exactIndex;
	return branches.findIndex((branch) => branch.id === overrideBranch.id);
}

function mergeAttributes(defaultAttributes: CyAttribute[], overrideAttributes: CyAttribute[], report: ImportReport): CyAttribute[] {
	const result = structuredClone(defaultAttributes);
	for (const overrideAttribute of overrideAttributes) {
		const index = result.findIndex((attribute) => attribute.name === overrideAttribute.name);
		if (index === -1) {
			result.push(structuredClone(overrideAttribute));
			continue;
		}
		report.inheritance.attributeOverridesMerged += 1;
		result[index] = structuredClone(overrideAttribute);
	}
	return result;
}

function getDefaultEffect(skill: CySkill, treeName: string, report: ImportReport): CyEffect | undefined {
	const defaults = skill.effects.filter((effect) => effect.isDefault);
	if (defaults.length !== 1) {
		report.defaultEffectErrors.push(`${treeName}/${skill.name}(${skill.id}) 默认 effect 数量=${defaults.length}`);
		return undefined;
	}
	return defaults[0];
}

function toMsExpression(castingTime: string | null): string {
	const trimmed = castingTime?.trim();
	if (!trimmed) return "";
	return `(${trimmed})*1000`;
}

function buildDescription(effect: CyEffect, equipment: EquipmentMapping): string {
	const parts = [
		`主手:${equipment.main}`,
		`副手:${equipment.sub}`,
		`防具:${equipment.armor}`,
		effect.skillType ? `类型:${effect.skillType}` : "",
		effect.inCombo ? `连击:${effect.inCombo}` : "",
	].filter(Boolean);
	return parts.join("；");
}

function buildSkillRow(params: {
	category: CyCategory;
	tree: CySkillTree;
	skill: CySkill;
	treeType: string;
	defaultEffect: CyEffect;
	meta: CySkillFile["meta"];
	timestamp: string;
	skillId: string;
	statisticId: string;
	preSkillId: string;
}): CsvRow {
	const { category, tree, skill, treeType, defaultEffect, meta, skillId, statisticId, preSkillId } = params;
	const posX = skill.drawTreeOrder % 5;
	const posY = Math.floor(skill.drawTreeOrder / 5);
	const isPassive = defaultEffect.skillType === "被動";

	return {
		id: skillId,
		treeType,
		posX: String(posX),
		posY: String(posY),
		tier: String(posY),
		name: skill.name,
		isPassive: isPassive ? "t" : "f",
		chargingType: mapSkillTypeToChargingType(defaultEffect.skillType),
		distanceType: "Both",
		targetType: isPassive ? "Self" : "Enemy",
		details: stringifyJson({
			source: "cy-grimoire",
			externalCategoryId: category.id,
			externalCategoryName: category.name,
			externalTreeId: tree.id,
			externalTreeName: tree.name,
			externalSkillId: skill.id,
			drawTreeOrder: skill.drawTreeOrder,
			importMode: "data-only",
			runtimeNote: "第一阶段只导入资料；activeEffect 使用占位 BT，真实 branches 保存在 skill_variant.details。",
		}),
		dataSources: "",
		statisticId,
		preSkillId,
		updatedByAccountId: null,
		createdByAccountId: null,
	};
}

function buildStatisticRow(statisticId: string, timestamp: string): CsvRow {
	return {
		id: statisticId,
		updatedAt: timestamp,
		createdAt: timestamp,
		usageTimestamps: "{}",
		viewTimestamps: "{}",
	};
}

function buildVariantRow(params: {
	category: CyCategory;
	tree: CySkillTree;
	skill: CySkill;
	effect: CyEffect;
	mergedEffect: CyEffect;
	effectIndex: number;
	equipment: EquipmentMapping;
	variantId: string;
	belongToSkillId: string;
}): CsvRow {
	const { category, tree, skill, effect, mergedEffect, effectIndex, equipment, variantId, belongToSkillId } = params;
	const castingMs = toMsExpression(mergedEffect.castingTime);
	const chargingType = mapSkillTypeToChargingType(mergedEffect.skillType);
	const range = mergedEffect.range?.trim() ?? "";

	return {
		id: variantId,
		targetMainWeaponType: equipment.main,
		targetSubWeaponType: equipment.sub,
		targetArmorAbilityType: equipment.armor,
		hpCost: null,
		mpCost: mergedEffect.mpCost ?? "",
		description: buildDescription(mergedEffect, equipment),
		activeEffect: stringifyJson({
			name: `cy:${skill.name}`,
			agent: "class Agent {}",
			definition: "root { sequence { } }",
			memberType: "Player",
		}),
		passiveEffects: "{}",
		buffs: "{}",
		elementLogic: "",
		castingRange: range,
		effectiveRange: range,
		actionFixedMs: "",
		actionModifiedMs: "",
		chantingFixedMs: chargingType === "Chanting" ? castingMs : "",
		chantingModifiedMs: "",
		chargingFixedMs: chargingType === "Reservoir" ? castingMs : "",
		chargingModifiedMs: "",
		startupMs: "",
		details: stringifyJson({
			source: CY_SOURCE,
			externalCategoryId: category.id,
			externalTreeId: tree.id,
			externalTreeName: tree.name,
			externalSkillId: skill.id,
			variantIndex: effectIndex,
			isDefault: effect.isDefault,
			equipmentOperatorAnd: mergedEffect.equipmentOperatorAnd,
			inCombo: mergedEffect.inCombo,
			actionTime: mergedEffect.actionTime,
			rawEffect: effect,
			mergedEffect,
			branches: mergedEffect.branches,
		}),
		belongToskillId: belongToSkillId,
	};
}

function prepareRows(data: CySkillFile, existingIds: ExistingIds): PreparedRows {
	const report = createReport();
	const skillRows: CsvRow[] = [];
	const variantRows: CsvRow[] = [];
	const statisticRows: CsvRow[] = [];
	const timestamp = toPostgresTimestamp(data.meta.fetchedAt);
	const generatedSkillIds = new Map<string, string>();
	const generatedStatisticIds = new Map<string, string>();

	// 先为本次可导入技能分配 cuid2，保证前置技能引用不依赖遍历顺序。
	for (const category of data.categories) {
		for (const tree of category.skillTrees) {
			const treeType = TREE_TYPE_MAP.get(tree.name);
			if (!treeType) continue;
			for (const skill of tree.skills) {
				const key = externalSkillKey(category.id, tree.id, skill.id);
				const existingSkillId = existingIds.importedSkills.get(key);
				const existingStatisticId = existingIds.importedSkillStatistics.get(key);
				generatedSkillIds.set(key, existingSkillId ?? createId());
				generatedStatisticIds.set(key, existingStatisticId ?? createId());
			}
		}
	}

	for (const category of data.categories) {
		for (const tree of category.skillTrees) {
			const treeType = TREE_TYPE_MAP.get(tree.name);
			for (const skill of tree.skills) {
				if (!treeType) {
					addSkippedTree(report, tree.name, skill);
					continue;
				}

				const defaultEffect = getDefaultEffect(skill, tree.name, report);
				if (!defaultEffect) {
					addSkippedTree(report, tree.name, skill);
					continue;
				}

				report.plannedSkills += 1;
				report.plannedVariants += skill.effects.length;

				const skillKey = externalSkillKey(category.id, tree.id, skill.id);
				const skillId = generatedSkillIds.get(skillKey);
				const statisticId = generatedStatisticIds.get(skillKey);
				if (!skillId || !statisticId) throw new Error(`未分配导入 id: ${skillKey}`);
				const preSkillId =
					skill.previousSkillId === -1
						? ""
						: (generatedSkillIds.get(externalSkillKey(category.id, tree.id, skill.previousSkillId)) ?? "");

				if (existingIds.skills.has(skillId)) {
					report.duplicateSkillsSkipped += 1;
				} else if (existingIds.importedSkills.has(skillKey)) {
					report.existingImportedSkillsSkipped += 1;
				} else {
					skillRows.push({
						...buildSkillRow({
							category,
							tree,
							skill,
							treeType,
							defaultEffect,
							meta: data.meta,
							timestamp,
							skillId,
							statisticId,
							preSkillId,
						}),
					});
				}

				if (existingIds.statistics.has(statisticId)) {
					report.duplicateStatisticsSkipped += 1;
				} else {
					statisticRows.push(buildStatisticRow(statisticId, timestamp));
				}

				skill.effects.forEach((effect, effectIndex) => {
					const variantKey = externalVariantKey(category.id, tree.id, skill.id, effectIndex);
					const variantId = existingIds.importedVariants.get(variantKey) ?? createId();
					if (existingIds.variants.has(variantId)) {
						report.duplicateVariantsSkipped += 1;
						return;
					}
					if (existingIds.importedVariants.has(variantKey)) {
						report.existingImportedVariantsSkipped += 1;
						return;
					}
					const mergedEffect = mergeEffect(defaultEffect, effect, report);
					const equipment = mapEquipment(mergedEffect, report);
					variantRows.push(
						buildVariantRow({
							category,
							tree,
							skill,
							effect,
							mergedEffect,
							effectIndex,
							equipment,
							variantId,
							belongToSkillId: skillId,
						}),
					);
				});
			}
		}
	}

	report.writtenSkills = skillRows.length;
	report.writtenVariants = variantRows.length;
	report.writtenStatistics = statisticRows.length;

	return { skillRows, variantRows, statisticRows, report };
}

interface ExistingIds {
	skills: Set<string>;
	variants: Set<string>;
	statistics: Set<string>;
	importedSkills: Map<string, string>;
	importedSkillStatistics: Map<string, string>;
	importedVariants: Map<string, string>;
}

function readExistingBackupIds(backupDir: string): ExistingIds {
	const skillPath = path.join(backupDir, "skill.csv");
	const variantPath = path.join(backupDir, "skill_variant.csv");
	const statisticPath = path.join(backupDir, "statistic.csv");

	for (const filePath of [skillPath, variantPath, statisticPath]) {
		if (!fs.existsSync(filePath)) throw new Error(`找不到备份文件: ${filePath}`);
	}

	assertHeader(skillPath, SKILL_HEADER);
	assertHeader(variantPath, SKILL_VARIANT_HEADER);
	assertHeader(statisticPath, STATISTIC_HEADER);

	return {
		skills: readExistingIds(skillPath),
		variants: readExistingIds(variantPath),
		statistics: readExistingIds(statisticPath),
		...readExistingImportedRows(skillPath, variantPath),
	};
}

function externalSkillKey(categoryId: number, treeId: number, skillId: number): string {
	return `${categoryId}:${treeId}:${skillId}`;
}

function externalVariantKey(categoryId: number, treeId: number, skillId: number, variantIndex: number): string {
	return `${externalSkillKey(categoryId, treeId, skillId)}:${variantIndex}`;
}

/**
 * 通过 details 中的外部坐标识别已经导入过的 cy-grimoire 行。
 *
 * 职责：
 * - id 已改为 cuid2，不能再用 id 前缀判断导入来源。
 * - details 是导入资料的可追溯元数据，因此用它保证脚本重复运行不会重复追加。
 */
function readExistingImportedRows(
	skillPath: string,
	variantPath: string,
): Pick<ExistingIds, "importedSkills" | "importedSkillStatistics" | "importedVariants"> {
	const importedSkills = new Map<string, string>();
	const importedSkillStatistics = new Map<string, string>();
	const importedVariants = new Map<string, string>();

	for (const record of parseCsvRecords(fs.readFileSync(skillPath, "utf-8")).slice(1)) {
		const detailsText = record[10];
		if (!detailsText) continue;
		try {
			const details = JSON.parse(detailsText) as Record<string, unknown>;
			if (details.source !== CY_SOURCE) continue;
			const categoryId = Number(details.externalCategoryId);
			const treeId = Number(details.externalTreeId);
			const skillId = Number(details.externalSkillId);
			if (![categoryId, treeId, skillId].every(Number.isFinite)) continue;
			const key = externalSkillKey(categoryId, treeId, skillId);
			importedSkills.set(key, record[0]);
			importedSkillStatistics.set(key, record[12]);
		} catch {
			continue;
		}
	}

	for (const record of parseCsvRecords(fs.readFileSync(variantPath, "utf-8")).slice(1)) {
		const detailsText = record[20];
		if (!detailsText) continue;
		try {
			const details = JSON.parse(detailsText) as Record<string, unknown>;
			if (details.source !== CY_SOURCE) continue;
			const categoryId = Number(details.externalCategoryId);
			const treeId = Number(details.externalTreeId);
			const skillId = Number(details.externalSkillId);
			const variantIndex = Number(details.variantIndex);
			if (![categoryId, treeId, skillId, variantIndex].every(Number.isFinite)) continue;
			importedVariants.set(externalVariantKey(categoryId, treeId, skillId, variantIndex), record[0]);
		} catch {
			continue;
		}
	}

	return { importedSkills, importedSkillStatistics, importedVariants };
}

function writeRows(backupDir: string, rows: PreparedRows): void {
	appendRows(path.join(backupDir, "statistic.csv"), STATISTIC_HEADER, rows.statisticRows);
	appendRows(path.join(backupDir, "skill.csv"), SKILL_HEADER, rows.skillRows);
	appendRows(path.join(backupDir, "skill_variant.csv"), SKILL_VARIANT_HEADER, rows.variantRows);
}

function formatMapOfSets(map: Map<string, Set<string>>): Record<string, string[]> {
	return Object.fromEntries([...map.entries()].map(([key, values]) => [key, [...values].sort()]));
}

function formatSkippedTrees(map: Map<string, { skills: number; variants: number }>): Record<string, { skills: number; variants: number }> {
	return Object.fromEntries([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function printReport(report: ImportReport, dryRun: boolean): void {
	console.log(
		JSON.stringify(
			{
				mode: dryRun ? "dry-run" : "write",
				planned: {
					skills: report.plannedSkills,
					variants: report.plannedVariants,
				},
				written: {
					statistics: report.writtenStatistics,
					skills: report.writtenSkills,
					variants: report.writtenVariants,
				},
				duplicatesSkipped: {
					statistics: report.duplicateStatisticsSkipped,
					skills: report.duplicateSkillsSkipped,
					variants: report.duplicateVariantsSkipped,
				},
				existingImportedSkipped: {
					skills: report.existingImportedSkillsSkipped,
					variants: report.existingImportedVariantsSkipped,
				},
				skipped: {
					skills: report.skippedSkills,
					variants: report.skippedVariants,
					trees: formatSkippedTrees(report.skippedTrees),
				},
				unknownValues: formatMapOfSets(report.unknownValues),
				defaultEffectErrors: report.defaultEffectErrors,
				inheritance: report.inheritance,
			},
			null,
			2,
		),
	);
}

function validatePreparedRows(rows: PreparedRows, existingIds: ExistingIds): void {
	const skillIds = new Set([...existingIds.skills, ...rows.skillRows.map((row) => row.id)]);
	const statisticIds = new Set([...existingIds.statistics, ...rows.statisticRows.map((row) => row.id)]);

	for (const row of rows.skillRows) {
		if (!statisticIds.has(row.statisticId)) {
			throw new Error(`skill.statisticId 找不到对应 statistic: ${row.id} -> ${row.statisticId}`);
		}
		if (row.preSkillId && !skillIds.has(row.preSkillId)) {
			throw new Error(`skill.preSkillId 找不到对应 skill: ${row.id} -> ${row.preSkillId}`);
		}
		JSON.parse(row.details);
	}

	for (const row of rows.variantRows) {
		if (!skillIds.has(row.belongToskillId)) {
			throw new Error(`skill_variant.belongToskillId 找不到对应 skill: ${row.id} -> ${row.belongToskillId}`);
		}
		const activeEffect = JSON.parse(row.activeEffect) as Record<string, unknown>;
		for (const key of ["name", "agent", "definition", "memberType"]) {
			if (typeof activeEffect[key] !== "string") throw new Error(`activeEffect 缺少 ${key}: ${row.id}`);
		}
		JSON.parse(row.details);
	}
}

export function main(): void {
	const options = parseCliOptions(process.argv.slice(2));
	const source = readJsonFile(options.sourcePath);
	const existingIds = readExistingBackupIds(options.backupDir);
	const rows = prepareRows(source, existingIds);
	validatePreparedRows(rows, existingIds);

	if (!options.dryRun) {
		writeRows(options.backupDir, rows);
	}

	printReport(rows.report, options.dryRun);
}

const argv1 = process.argv[1];
let argv1Path = argv1 ?? "";

if (argv1Path.startsWith("file://")) {
	argv1Path = fileURLToPath(argv1Path);
}

const selfPath = path.resolve(__filename);
const normalizedArgv1Path = argv1Path ? path.resolve(argv1Path) : "";

if (normalizedArgv1Path && normalizedArgv1Path === selfPath) {
	main();
}
