/**
 * @file migrateSkillVariantBehavior.ts
 * @description 将旧 skill_variant 行为字段迁移为三组行为 DSL 与 behavior_tree 表。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	ActiveSkillBehaviorSchema,
	AttributeSlotDeclarationListSchema,
	PassiveSkillBehaviorSchema,
	RegisteredSkillBehaviorSchema,
} from "../schema/jsons";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

const skillVariantCsvPath = path.join(projectRoot, "db/backups/skill_variant.csv");
const behaviorTreeCsvPath = path.join(projectRoot, "db/backups/behavior_tree.csv");
const reportPath = path.join(projectRoot, "db/backups/migration-reports/skill_variant_behavior_report.json");
const skillVariantBackupPath = path.join(projectRoot, "db/backups/skill_variant.pre-behavior-migration.csv");
const defaultSkillsJsonPath =
	process.platform === "win32"
		? "C:/Users/KiaClouth2/Downloads/toram-skills.json"
		: "/mnt/c/Users/KiaClouth2/Downloads/toram-skills.json";

const newSkillVariantHeaders = [
	"id",
	"targetMainWeaponType",
	"targetSubWeaponType",
	"targetArmorAbilityType",
	"hpCost",
	"mpCost",
	"description",
	"activeBehavior",
	"passiveBehavior",
	"registeredBehavior",
	"details",
	"belongToskillId",
] as const;

const behaviorTreeHeaders = [
	"id",
	"name",
	"definition",
	"agent",
	"attributeSlots",
	"activeOwnerId",
	"passiveOwnerId",
	"registeredOwnerId",
] as const;

type CsvRow = Record<string, string>;
type NewSkillVariantHeader = (typeof newSkillVariantHeaders)[number];
type BehaviorTreeHeader = (typeof behaviorTreeHeaders)[number];
type NewSkillVariantRow = Record<NewSkillVariantHeader, string>;
type BehaviorTreeRow = Record<BehaviorTreeHeader, string>;

const skillVariantQuotedEmptyHeaders = new Set<NewSkillVariantHeader>(["description"]);
const behaviorTreeQuotedEmptyHeaders = new Set<BehaviorTreeHeader>(["definition", "agent"]);

type LegacyTree = {
	name?: string;
	definition?: string;
	agent?: string;
	memberType?: string;
	attributeSlots?: unknown[];
};

type Branch = {
	id?: number;
	name?: string;
	attributes?: Array<{ name?: string; value?: string; extra?: unknown }>;
};

type MigrationReport = {
	mode: "dry-run" | "write";
	alreadyMigrated: boolean;
	inputs: {
		skillVariantCsv: string;
		skillsJson: string;
		skillsJsonLoaded: boolean;
	};
	outputs: {
		skillVariantCsv: string;
		behaviorTreeCsv: string;
		report: string;
	};
	totalRows: number;
	outputRows: number;
	behaviorTreeRows: number;
	activeBehaviorRows: number;
	passiveBehaviorRows: number;
	registeredBehaviorRows: number;
	registeredTreeRows: number;
	legacyPassiveBtRows: number;
	exSkippedRows: Array<{ id: string; skillType: string | null; reason: string }>;
	lowConfidenceRows: Array<{ id: string; reasons: string[] }>;
	customBtRows: Array<{ id: string; owner: "active" | "passive" | "registered"; behaviorTreeId: string }>;
	behaviorKindCounts: Record<string, number>;
	validationErrors: Array<{ id: string; field: string; message: string }>;
	legacySkillTypeCounts: Record<string, number>;
};

function parseArgs(): { mode: "dry-run" | "write"; skillsJsonPath: string; rebuildFromBackup: boolean } {
	const args = process.argv.slice(2);
	const mode = args.includes("--write") ? "write" : "dry-run";
	const rebuildFromBackup = args.includes("--rebuild-from-backup");
	const skillsJsonArgIndex = args.indexOf("--skills-json");
	const skillsJsonPath = skillsJsonArgIndex >= 0 ? args[skillsJsonArgIndex + 1] : defaultSkillsJsonPath;
	return { mode, skillsJsonPath: normalizePath(skillsJsonPath), rebuildFromBackup };
}

function normalizePath(inputPath: string): string {
	if (process.platform !== "win32") {
		const windowsDriveMatch = inputPath.match(/^([A-Za-z]):[\\/](.*)$/);
		if (windowsDriveMatch) {
			return `/mnt/${windowsDriveMatch[1].toLowerCase()}/${windowsDriveMatch[2].replace(/\\/g, "/")}`;
		}
	}
	return inputPath;
}

function parseCsv(content: string): CsvRow[] {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = "";
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
			row.push(field);
			field = "";
			continue;
		}
		if (char === "\n") {
			row.push(field);
			rows.push(row);
			row = [];
			field = "";
			continue;
		}
		if (char !== "\r") {
			field += char;
		}
	}

	if (field.length > 0 || row.length > 0) {
		row.push(field);
		rows.push(row);
	}

	const [headers, ...dataRows] = rows;
	if (!headers) return [];
	return dataRows
		.filter((dataRow) => dataRow.length > 1 || dataRow[0] !== "")
		.map((dataRow) => {
			const record: CsvRow = {};
			headers.forEach((header, index) => {
				record[header] = dataRow[index] ?? "";
			});
			return record;
		});
}

function toCsvValue(value: string, quoteEmptyString = false): string {
	if (value === "" && quoteEmptyString) return '""';
	if (!/[",\r\n]/.test(value)) return value;
	return `"${value.replace(/"/g, '""')}"`;
}

function writeCsv<THeader extends string>(
	headers: readonly THeader[],
	rows: Array<Record<THeader, string>>,
	quotedEmptyHeaders: ReadonlySet<THeader> = new Set(),
): string {
	const lines = [headers.join(",")];
	for (const row of rows) {
		lines.push(headers.map((header) => toCsvValue(row[header] ?? "", quotedEmptyHeaders.has(header))).join(","));
	}
	return `${lines.join("\n")}\n`;
}

function parseJson(value: string): unknown {
	const trimmed = value.trim();
	if (!trimmed || trimmed === "null") return null;
	try {
		return JSON.parse(trimmed);
	} catch {
		return null;
	}
}

function parseTree(value: string): LegacyTree | null {
	const parsed = parseJson(value);
	if (!isRecord(parsed)) return null;
	return parsed as LegacyTree;
}

function parsePgJsonArray(value: string): LegacyTree[] {
	const trimmed = value.trim();
	if (!trimmed || trimmed === "{}") return [];
	if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return [];

	const inner = trimmed.slice(1, -1);
	const items: string[] = [];
	let i = 0;
	while (i < inner.length) {
		while (inner[i] === " " || inner[i] === ",") i++;
		if (i >= inner.length) break;

		let item = "";
		if (inner[i] === '"') {
			i++;
			while (i < inner.length) {
				const char = inner[i];
				const next = inner[i + 1];
				if (char === "\\") {
					item += next ?? "";
					i += 2;
					continue;
				}
				if (char === '"' && next === '"') {
					item += '"';
					i += 2;
					continue;
				}
				if (char === '"') {
					i++;
					break;
				}
				item += char;
				i++;
			}
		} else {
			while (i < inner.length && inner[i] !== ",") {
				item += inner[i];
				i++;
			}
			item = item.trim();
		}
		if (item && item !== "NULL") {
			items.push(item);
		}
		while (inner[i] === " " || inner[i] === ",") i++;
	}

	return items
		.map((item) => parseJson(item))
		.filter(isRecord)
		.map((item) => item as LegacyTree);
}

function toPgJsonArray(values: unknown[]): string {
	if (values.length === 0) return "{}";
	const items = values.map((value) => {
		const json = JSON.stringify(value);
		return `"${json.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
	});
	return `{${items.join(",")}}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMeaningfulTree(tree: LegacyTree | null): tree is LegacyTree {
	if (!tree) return false;
	const definition = String(tree.definition ?? "").trim();
	const agent = String(tree.agent ?? "").trim();
	if (!definition && !agent) return false;

	const normalizedDefinition = definition.replace(/\s+/g, " ");
	const normalizedAgent = agent.replace(/\s+/g, " ");
	const emptyDefinition = ["root { sequence { } }", "root { selector { } }", "root { }"].includes(normalizedDefinition);
	const emptyAgent = !normalizedAgent || /^class Agent\s*\{\s*\}$/.test(normalizedAgent);
	return !(emptyDefinition && emptyAgent);
}

function getDetails(row: CsvRow): Record<string, unknown> | null {
	const parsed = parseJson(row.details ?? "");
	return isRecord(parsed) ? parsed : null;
}

function getEffect(details: Record<string, unknown> | null): Record<string, unknown> | null {
	const mergedEffect = details?.mergedEffect;
	if (isRecord(mergedEffect)) return mergedEffect;
	const rawEffect = details?.rawEffect;
	if (isRecord(rawEffect)) return rawEffect;
	return details;
}

function getBranches(effect: Record<string, unknown> | null): Branch[] {
	const branches = effect?.branches;
	if (!Array.isArray(branches)) return [];
	return branches.filter(isRecord).map((branch) => branch as Branch);
}

function getSkillType(effect: Record<string, unknown> | null, row: CsvRow): string | null {
	const skillType = effect?.skillType;
	if (typeof skillType === "string" && skillType.trim()) return skillType.trim();
	const match = row.description?.match(/类型:([^；;]+)/);
	return match?.[1]?.trim() ?? null;
}

function countRecordValue(record: Record<string, number>, key: string): void {
	record[key] = (record[key] ?? 0) + 1;
}

function branchAttributes(branch: Branch): Record<string, string> {
	const attributes: Record<string, string> = {};
	for (const attr of branch.attributes ?? []) {
		if (!attr.name) continue;
		attributes[attr.name] = attr.value ?? "";
	}
	return attributes;
}

function normalizeExpression(value: string | undefined, fallback = "0"): string {
	const trimmed = value?.trim();
	return trimmed ? trimmed : fallback;
}

function buildLifecycle(row: CsvRow) {
	return {
		startupMs: normalizeExpression(row.startupMs),
		actionFixedMs: normalizeExpression(row.actionFixedMs),
		actionModifiedMs: normalizeExpression(row.actionModifiedMs),
		chantingFixedMs: normalizeExpression(row.chantingFixedMs),
		chantingModifiedMs: normalizeExpression(row.chantingModifiedMs),
		chargingFixedMs: normalizeExpression(row.chargingFixedMs),
		chargingModifiedMs: normalizeExpression(row.chargingModifiedMs),
		targeting: {
			castingRange: normalizeExpression(row.castingRange),
		},
	};
}

function inferRangeType(attrs: Record<string, string>, effectiveRange: string): string {
	if (normalizeExpression(attrs.range_damage, "0") === "1") return "Range";
	const rangeNumber = Number(normalizeExpression(effectiveRange, "0"));
	return Number.isFinite(rangeNumber) && rangeNumber > 0 ? "Range" : "Single";
}

function buildDamageBehavior(row: CsvRow, branches: Branch[]) {
	const damageBranches = branches.filter((branch) => branch.name === "damage");
	const damageEvents = damageBranches.map((branch, index) => {
		const attrs = branchAttributes(branch);
		const effectiveRange = normalizeExpression(attrs.range ?? row.effectiveRange);
		return {
			name: normalizeExpression(attrs.name, `damage-${index + 1}`),
			formula: {
				constant: normalizeExpression(attrs.constant),
				multiplier: normalizeExpression(attrs.multiplier, "100"),
				base: normalizeExpression(attrs.base, ""),
				element: {
					expression: normalizeExpression(row.elementLogic, "self.mainWeapon.element"),
				},
				damageType: attrs.damage_type,
			},
			delivery: {
				rangeType: inferRangeType(attrs, effectiveRange),
				effectiveRange,
			},
			timing: {
				delayMs: normalizeExpression(attrs.delay_ms ?? attrs.delayMs),
				durationMs: attrs.duration_ms ?? attrs.durationMs,
				intervalMs: attrs.interval_ms ?? attrs.intervalMs,
				repeatCount: attrs.hit_count ?? attrs.repeatCount,
			},
			ailments: [],
			rawBranch: branch,
		};
	});

	return {
		behaviorKind: "DamageAction",
		behaviorParams: {
			lifecycle: buildLifecycle(row),
			damageEvents,
			rawBranches: branches,
		},
	};
}

function buildStatusBehavior(row: CsvRow, branches: Branch[]) {
	return {
		behaviorKind: "StatusAction",
		behaviorParams: {
			lifecycle: buildLifecycle(row),
			effects: branches.filter((branch) => branch.name === "effect" || branch.name === "status").map(branchAttributes),
			rawBranches: branches,
		},
	};
}

function buildRecoveryBehavior(row: CsvRow, branches: Branch[]) {
	return {
		behaviorKind: "RecoveryAction",
		behaviorParams: {
			lifecycle: buildLifecycle(row),
			recoveries: branches
				.filter((branch) => branch.name === "heal" || branch.name === "recovery")
				.map(branchAttributes),
			rawBranches: branches,
		},
	};
}

function buildLifecycleCarrierBehavior(row: CsvRow) {
	return {
		behaviorKind: "StatusAction",
		behaviorParams: {
			lifecycle: buildLifecycle(row),
			effects: [],
			rawBranches: [],
			migrationPurpose: "LifecycleCarrierForCustomActiveBehaviorTree",
		},
	};
}

function buildPassiveBehavior(branches: Branch[]) {
	return {
		behaviorKind: "PassiveRule",
		behaviorParams: {
			modifiers: [],
			runtimeAttachments: [],
			attributeSlots: [],
			rawBranches: branches,
		},
	};
}

function hasComplexBranch(branches: Branch[]): boolean {
	const complexNames = new Set([
		"stack",
		"next",
		"damage_stat",
		"condition_next",
		"condition_damage",
		"resource",
		"penalty",
		"counter",
		"state",
	]);
	return branches.some((branch) => complexNames.has(branch.name ?? ""));
}

function classifyBehavior(row: CsvRow, skillType: string | null, branches: Branch[]) {
	const branchNames = new Set(branches.map((branch) => branch.name ?? ""));
	if (skillType === "EX技能") return { kind: "EX" as const, reasons: ["EX技能本轮不生成行为"] };
	if (hasComplexBranch(branches))
		return { kind: "Complex" as const, reasons: ["包含 stack/next/damage_stat/条件续发/复杂资源惩罚分支"] };
	if (branchNames.has("damage")) return { kind: "DamageAction" as const, behavior: buildDamageBehavior(row, branches) };
	if (branchNames.has("heal") || branchNames.has("recovery")) {
		return { kind: "RecoveryAction" as const, behavior: buildRecoveryBehavior(row, branches) };
	}
	if (branchNames.has("effect") || branchNames.has("status")) {
		return { kind: "StatusAction" as const, behavior: buildStatusBehavior(row, branches) };
	}
	if (skillType?.includes("被动") || skillType?.toLowerCase().includes("passive")) {
		return { kind: "PassiveRule" as const, behavior: buildPassiveBehavior(branches) };
	}
	return { kind: "Unknown" as const, reasons: ["未识别到 damage/heal/effect/passive 分支"] };
}

function createBehaviorTreeRow(
	id: string,
	tree: LegacyTree,
	owner: "active" | "passive" | "registered",
	ownerId: string,
): BehaviorTreeRow {
	return {
		id,
		name: String(tree.name ?? id),
		definition: String(tree.definition ?? ""),
		agent: String(tree.agent ?? ""),
		attributeSlots: JSON.stringify(Array.isArray(tree.attributeSlots) ? tree.attributeSlots : []),
		activeOwnerId: owner === "active" ? ownerId : "",
		passiveOwnerId: owner === "passive" ? ownerId : "",
		registeredOwnerId: owner === "registered" ? ownerId : "",
	};
}

function createMergedPassiveTree(id: string, trees: LegacyTree[], ownerId: string): BehaviorTreeRow {
	return {
		id,
		name: `${ownerId}:legacy-passive-group`,
		definition: JSON.stringify({ kind: "LegacyPassiveBehaviorTreeGroup", trees }, null, 2),
		agent: "",
		attributeSlots: JSON.stringify(
			trees.flatMap((tree) => (Array.isArray(tree.attributeSlots) ? tree.attributeSlots : [])),
		),
		activeOwnerId: "",
		passiveOwnerId: ownerId,
		registeredOwnerId: "",
	};
}

function appendLowConfidenceDetails(row: CsvRow, reasons: string[]): string {
	const details = getDetails(row) ?? {};
	return JSON.stringify({
		...details,
		behaviorMigration: {
			status: "lowConfidence",
			reasons,
			legacyFields: {
				activeEffect: parseJson(row.activeEffect ?? ""),
				passiveEffects: parsePgJsonArray(row.passiveEffects ?? ""),
				buffs: parsePgJsonArray(row.buffs ?? ""),
				elementLogic: row.elementLogic ?? "",
				castingRange: row.castingRange ?? "",
				effectiveRange: row.effectiveRange ?? "",
				startupMs: row.startupMs ?? "",
				actionFixedMs: row.actionFixedMs ?? "",
				actionModifiedMs: row.actionModifiedMs ?? "",
				chantingFixedMs: row.chantingFixedMs ?? "",
				chantingModifiedMs: row.chantingModifiedMs ?? "",
				chargingFixedMs: row.chargingFixedMs ?? "",
				chargingModifiedMs: row.chargingModifiedMs ?? "",
			},
		},
	});
}

function validateOutputRow(row: NewSkillVariantRow, report: MigrationReport): void {
	const activeBehavior = parseJson(row.activeBehavior);
	if (activeBehavior !== null) {
		const result = ActiveSkillBehaviorSchema.safeParse(activeBehavior);
		if (!result.success) {
			report.validationErrors.push({ id: row.id, field: "activeBehavior", message: result.error.message });
		}
	}

	for (const behavior of parsePgJsonArrayLikeUnknown(row.passiveBehavior)) {
		const result = PassiveSkillBehaviorSchema.safeParse(behavior);
		if (!result.success) {
			report.validationErrors.push({ id: row.id, field: "passiveBehavior", message: result.error.message });
		}
	}

	for (const behavior of parsePgJsonArrayLikeUnknown(row.registeredBehavior)) {
		const result = RegisteredSkillBehaviorSchema.safeParse(behavior);
		if (!result.success) {
			report.validationErrors.push({ id: row.id, field: "registeredBehavior", message: result.error.message });
		}
	}
}

function parsePgJsonArrayLikeUnknown(value: string): unknown[] {
	const trees = parsePgJsonArray(value);
	if (trees.length > 0) return trees;
	if (value.trim() === "{}" || !value.trim()) return [];

	const parsed = parseJson(value);
	return Array.isArray(parsed) ? parsed : [];
}

function validateBehaviorTreeRow(row: BehaviorTreeRow, report: MigrationReport): void {
	const parsed = parseJson(row.attributeSlots);
	const result = AttributeSlotDeclarationListSchema.safeParse(parsed);
	if (!result.success) {
		report.validationErrors.push({ id: row.id, field: "attributeSlots", message: result.error.message });
	}
}

function loadSkillsJson(skillsJsonPath: string): boolean {
	if (!fs.existsSync(skillsJsonPath)) return false;
	try {
		JSON.parse(fs.readFileSync(skillsJsonPath, "utf-8"));
		return true;
	} catch {
		return false;
	}
}

function migrateRows(rows: CsvRow[], mode: "dry-run" | "write", skillsJsonPath: string) {
	const report: MigrationReport = {
		mode,
		alreadyMigrated: false,
		inputs: {
			skillVariantCsv: skillVariantCsvPath,
			skillsJson: skillsJsonPath,
			skillsJsonLoaded: loadSkillsJson(skillsJsonPath),
		},
		outputs: {
			skillVariantCsv: skillVariantCsvPath,
			behaviorTreeCsv: behaviorTreeCsvPath,
			report: reportPath,
		},
		totalRows: rows.length,
		outputRows: 0,
		behaviorTreeRows: 0,
		activeBehaviorRows: 0,
		passiveBehaviorRows: 0,
		registeredBehaviorRows: 0,
		registeredTreeRows: 0,
		legacyPassiveBtRows: 0,
		exSkippedRows: [],
		lowConfidenceRows: [],
		customBtRows: [],
		behaviorKindCounts: {},
		validationErrors: [],
		legacySkillTypeCounts: {},
	};

	const skillVariantRows: NewSkillVariantRow[] = [];
	const behaviorTreeRows: BehaviorTreeRow[] = [];

	for (const row of rows) {
		const details = getDetails(row);
		const effect = getEffect(details);
		const branches = getBranches(effect);
		const skillType = getSkillType(effect, row);
		if (skillType) countRecordValue(report.legacySkillTypeCounts, skillType);

		const activeTree = parseTree(row.activeEffect ?? "");
		const passiveTrees = parsePgJsonArray(row.passiveEffects ?? "").filter(isMeaningfulTree);
		const registeredTrees = parsePgJsonArray(row.buffs ?? "").filter(isMeaningfulTree);
		if (passiveTrees.length > 0) report.legacyPassiveBtRows++;

		let activeBehavior: unknown | null = null;
		let passiveBehavior: unknown[] = [];
		const registeredBehavior: unknown[] = [];
		let detailsOut = row.details ?? "";

		if (skillType === "EX技能") {
			report.exSkippedRows.push({ id: row.id, skillType, reason: "EX技能本轮只迁移行结构" });
		} else if (isMeaningfulTree(activeTree)) {
			const behaviorTreeId = `${row.id}__active_bt`;
			behaviorTreeRows.push(createBehaviorTreeRow(behaviorTreeId, activeTree, "active", row.id));
			report.customBtRows.push({ id: row.id, owner: "active", behaviorTreeId });
			activeBehavior = buildLifecycleCarrierBehavior(row);
		} else {
			const classification = classifyBehavior(row, skillType, branches);
			if ("behavior" in classification) {
				if (classification.kind === "PassiveRule") {
					passiveBehavior = [classification.behavior];
					report.passiveBehaviorRows++;
				} else {
					activeBehavior = classification.behavior;
					report.activeBehaviorRows++;
				}
				countRecordValue(report.behaviorKindCounts, classification.kind);
			} else if (classification.kind !== "EX") {
				report.lowConfidenceRows.push({ id: row.id, reasons: classification.reasons });
				detailsOut = appendLowConfidenceDetails(row, classification.reasons);
			}
		}

		if (passiveTrees.length === 1) {
			const behaviorTreeId = `${row.id}__passive_bt`;
			behaviorTreeRows.push(createBehaviorTreeRow(behaviorTreeId, passiveTrees[0], "passive", row.id));
			report.customBtRows.push({ id: row.id, owner: "passive", behaviorTreeId });
		} else if (passiveTrees.length > 1) {
			const behaviorTreeId = `${row.id}__passive_bt`;
			behaviorTreeRows.push(createMergedPassiveTree(behaviorTreeId, passiveTrees, row.id));
			report.customBtRows.push({ id: row.id, owner: "passive", behaviorTreeId });
		}

		registeredTrees.forEach((tree, index) => {
			const behaviorTreeId = `${row.id}__registered_bt_${index + 1}`;
			behaviorTreeRows.push(createBehaviorTreeRow(behaviorTreeId, tree, "registered", row.id));
			report.customBtRows.push({ id: row.id, owner: "registered", behaviorTreeId });
			report.registeredTreeRows++;
		});

		const outputRow: NewSkillVariantRow = {
			id: row.id,
			targetMainWeaponType: row.targetMainWeaponType,
			targetSubWeaponType: row.targetSubWeaponType,
			targetArmorAbilityType: row.targetArmorAbilityType,
			hpCost: row.hpCost,
			mpCost: row.mpCost,
			description: row.description,
			activeBehavior: activeBehavior === null ? "" : JSON.stringify(activeBehavior),
			passiveBehavior: toPgJsonArray(passiveBehavior),
			registeredBehavior: toPgJsonArray(registeredBehavior),
			details: detailsOut,
			belongToskillId: row.belongToskillId,
		};

		validateOutputRow(outputRow, report);
		skillVariantRows.push(outputRow);
	}

	for (const row of behaviorTreeRows) {
		validateBehaviorTreeRow(row, report);
	}
	report.outputRows = skillVariantRows.length;
	report.behaviorTreeRows = behaviorTreeRows.length;
	report.activeBehaviorRows = skillVariantRows.filter((row) => row.activeBehavior.trim()).length;
	report.registeredBehaviorRows = skillVariantRows.filter((row) => row.registeredBehavior !== "{}").length;

	return { skillVariantRows, behaviorTreeRows, report };
}

function buildAlreadyMigratedReport(
	rows: CsvRow[],
	mode: "dry-run" | "write",
	skillsJsonPath: string,
): MigrationReport {
	// 已迁移 CSV 不再携带旧字段，历史分类统计只能从迁移前备份重建，避免重复 dry-run 覆盖验收信息。
	const legacyReport = fs.existsSync(skillVariantBackupPath)
		? migrateRows(parseCsv(fs.readFileSync(skillVariantBackupPath, "utf-8")), mode, skillsJsonPath).report
		: null;
	const report: MigrationReport = {
		mode,
		alreadyMigrated: true,
		inputs: {
			skillVariantCsv: skillVariantCsvPath,
			skillsJson: skillsJsonPath,
			skillsJsonLoaded: loadSkillsJson(skillsJsonPath),
		},
		outputs: {
			skillVariantCsv: skillVariantCsvPath,
			behaviorTreeCsv: behaviorTreeCsvPath,
			report: reportPath,
		},
		totalRows: rows.length,
		outputRows: rows.length,
		behaviorTreeRows: 0,
		activeBehaviorRows: rows.filter((row) => row.activeBehavior.trim()).length,
		passiveBehaviorRows: rows.filter((row) => row.passiveBehavior.trim() && row.passiveBehavior.trim() !== "{}").length,
		registeredBehaviorRows: rows.filter(
			(row) => row.registeredBehavior.trim() && row.registeredBehavior.trim() !== "{}",
		).length,
		registeredTreeRows: 0,
		legacyPassiveBtRows: legacyReport?.legacyPassiveBtRows ?? 0,
		exSkippedRows: legacyReport?.exSkippedRows ?? [],
		lowConfidenceRows: legacyReport?.lowConfidenceRows ?? [],
		customBtRows: [],
		behaviorKindCounts: legacyReport?.behaviorKindCounts ?? {},
		validationErrors: [],
		legacySkillTypeCounts: legacyReport?.legacySkillTypeCounts ?? {},
	};

	for (const row of rows) {
		validateOutputRow(row as NewSkillVariantRow, report);
	}

	if (fs.existsSync(behaviorTreeCsvPath)) {
		const behaviorTreeRows = parseCsv(fs.readFileSync(behaviorTreeCsvPath, "utf-8")) as BehaviorTreeRow[];
		report.behaviorTreeRows = behaviorTreeRows.length;
		report.registeredTreeRows = behaviorTreeRows.filter((row) => row.registeredOwnerId.trim()).length;
		for (const row of behaviorTreeRows) {
			validateBehaviorTreeRow(row, report);
			const owner = row.activeOwnerId ? "active" : row.passiveOwnerId ? "passive" : "registered";
			const ownerId = row.activeOwnerId || row.passiveOwnerId || row.registeredOwnerId;
			if (ownerId) {
				report.customBtRows.push({ id: ownerId, owner, behaviorTreeId: row.id });
			}
		}
	}

	return report;
}

function printReportSummary(report: MigrationReport): void {
	console.log(
		JSON.stringify(
			{
				mode: report.mode,
				alreadyMigrated: report.alreadyMigrated,
				totalRows: report.totalRows,
				outputRows: report.outputRows,
				behaviorTreeRows: report.behaviorTreeRows,
				activeBehaviorRows: report.activeBehaviorRows,
				passiveBehaviorRows: report.passiveBehaviorRows,
				registeredBehaviorRows: report.registeredBehaviorRows,
				registeredTreeRows: report.registeredTreeRows,
				legacyPassiveBtRows: report.legacyPassiveBtRows,
				exSkippedRows: report.exSkippedRows.length,
				lowConfidenceRows: report.lowConfidenceRows.length,
				validationErrors: report.validationErrors.length,
				reportPath,
			},
			null,
			2,
		),
	);
}

function main(): void {
	const { mode, skillsJsonPath, rebuildFromBackup } = parseArgs();
	const sourceCsvPath = rebuildFromBackup ? skillVariantBackupPath : skillVariantCsvPath;
	if (!fs.existsSync(sourceCsvPath)) {
		throw new Error(`未找到 skill_variant.csv: ${sourceCsvPath}`);
	}

	const sourceCsv = fs.readFileSync(sourceCsvPath, "utf-8");
	const firstLine = sourceCsv.split(/\r?\n/, 1)[0] ?? "";
	const alreadyMigrated = !rebuildFromBackup && firstLine.trim() === newSkillVariantHeaders.join(",");
	const rows = parseCsv(sourceCsv);
	let migration: ReturnType<typeof migrateRows> | null = null;
	let report: MigrationReport;
	if (alreadyMigrated) {
		report = buildAlreadyMigratedReport(rows, mode, skillsJsonPath);
	} else {
		migration = migrateRows(rows, mode, skillsJsonPath);
		report = migration.report;
	}
	const reportJson = `${JSON.stringify(report, null, 2)}\n`;

	fs.mkdirSync(path.dirname(reportPath), { recursive: true });
	fs.writeFileSync(reportPath, reportJson, "utf-8");

	if (mode === "write" && migration) {
		if (!fs.existsSync(skillVariantBackupPath)) {
			fs.writeFileSync(skillVariantBackupPath, sourceCsv, "utf-8");
		}
		fs.writeFileSync(
			skillVariantCsvPath,
			writeCsv(newSkillVariantHeaders, migration.skillVariantRows, skillVariantQuotedEmptyHeaders),
			"utf-8",
		);
		fs.writeFileSync(
			behaviorTreeCsvPath,
			writeCsv(behaviorTreeHeaders, migration.behaviorTreeRows, behaviorTreeQuotedEmptyHeaders),
			"utf-8",
		);
	}

	printReportSummary(report);
}

const argv1 = process.argv[1];
const normalizedArgv1Path = argv1 ? path.resolve(argv1.startsWith("file://") ? fileURLToPath(argv1) : argv1) : "";
if (normalizedArgv1Path === path.resolve(__filename)) {
	main();
}
