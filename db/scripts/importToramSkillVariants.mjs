import fs from "node:fs";
import path from "node:path";
import { createId } from "@paralleldrive/cuid2";

const repoRoot = process.cwd();
const defaultSource = "/mnt/c/Users/KiaClouth2/Downloads/toram-skills.json";
const sourceArgIndex = process.argv.indexOf("--source");
const sourcePath = sourceArgIndex >= 0 ? process.argv[sourceArgIndex + 1] : defaultSource;
const shouldWrite = process.argv.includes("--write");

const skillCsvPath = path.join(repoRoot, "db/backups/skill.csv");
const skillVariantCsvPath = path.join(repoRoot, "db/backups/skill_variant.csv");

const treeTypeByJsonName = new Map([
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

const magicSkillNameByJsonName = new Map([
	["法術/飛箭", "法术/飞箭"],
	["法術/長槍", "法术/长枪"],
	["法術/魔法槍", "法术/魔法枪"],
	["法術/衝擊波", "法术/冲击波"],
	["法術/終結", "法术/终结"],
	["法術/障壁", "法术/障壁"],
	["法術/引爆", "法术/引爆"],
	["法術/暴風", "法术/暴风"],
	["法術/爆能", "法术/爆能"],
	["魔法要領", "魔法要领"],
	["魔力充填", "魔力充填"],
	["縮時詠唱", "缩时咏唱"],
	["強射", "强射"],
	["魔力灌充", "魔力灌充"],
	["法術/光護", "法术/光护"],
	["變時神術", "变时神术"],
	["法術/魔法砲", "法术/魔法炮"],
	["法術/毀滅", "法术/毁灭"],
	["急速充填", "急速充填"],
	["法術結界", "法术结界"],
	["魔法小刀", "魔法小刀"],
	["不遺餘力", "不遗余力"],
	["法術/雷射", "法术/镭射"],
	["咒法調律", "咒法调律"],
]);

const mainWeaponTargetByJsonName = new Map([
	["單手劍", { main: "OneHandSword", sub: "Any" }],
	["雙手劍", { main: "TwoHandSword", sub: "Any" }],
	["弓", { main: "Bow", sub: "Any" }],
	["弩", { main: "Bowgun", sub: "Any" }],
	["法杖", { main: "Rod", sub: "Any" }],
	["魔導具", { main: "Magictool", sub: "Any" }],
	["拳套", { main: "Knuckle", sub: "Any" }],
	["旋風槍", { main: "Halberd", sub: "Any" }],
	["拔刀劍", { main: "Katana", sub: "Any" }],
	["空手", { main: "None", sub: "Any" }],
	["雙劍", { main: "OneHandSword", sub: "OneHandSword" }],
]);

const subWeaponTargetByJsonName = new Map([
	["箭矢", "Arrow"],
	["小刀", "ShortSword"],
	["忍術卷軸", "NinjutsuScroll"],
	["盾牌", "Shield"],
	["單手劍", "OneHandSword"],
	["魔導具", "Magictool"],
	["拳套", "Knuckle"],
	["拔刀劍", "Katana"],
	["無裝備", "None"],
]);

const armorTargetByJsonName = new Map([
	["重量化", "Heavy"],
	["輕量化", "Light"],
]);

const castTimeTypeByJsonName = new Map([
	["瞬發", "Instant"],
	["須詠唱", "Chanting"],
	["須蓄力", "Charging"],
]);

const comboCompatibleByJsonName = new Map([
	["可以放入連擊", "t"],
	["不可放入連擊的第一招", "t"],
	["無法放入連擊", "f"],
]);

const actionTimeOrder = ["極慢", "慢", "稍慢", "一般", "稍快", "快", "極快"];
const actionTimeByJsonName = new Map(
	actionTimeOrder.map((name, index) => {
		const ratio = index / (actionTimeOrder.length - 1);
		return [
			name,
			{
				fixed: formatNumber(1 - 0.5 * ratio),
				modified: formatNumber(2 - 2 * ratio),
			},
		];
	}),
);

const parseCsv = (content) => {
	const rows = [];
	let row = [];
	let value = "";
	let raw = "";
	let inQuotes = false;

	const pushCell = () => {
		row.push({ value, raw });
		value = "";
		raw = "";
	};

	const pushRow = () => {
		pushCell();
		rows.push(row);
		row = [];
	};

	for (let index = 0; index < content.length; index += 1) {
		const char = content[index];

		if (inQuotes) {
			raw += char;
			if (char === '"') {
				if (content[index + 1] === '"') {
					value += '"';
					raw += '"';
					index += 1;
				} else {
					inQuotes = false;
				}
			} else {
				value += char;
			}
			continue;
		}

		if (char === '"') {
			inQuotes = true;
			raw += char;
			continue;
		}

		if (char === ",") {
			pushCell();
			continue;
		}

		if (char === "\n") {
			pushRow();
			continue;
		}

		if (char === "\r") {
			if (content[index + 1] === "\n") {
				index += 1;
			}
			pushRow();
			continue;
		}

		value += char;
		raw += char;
	}

	if (value !== "" || raw !== "" || row.length > 0) {
		pushRow();
	}

	return rows;
};

const readCsvRecords = (filePath) => {
	const rows = parseCsv(fs.readFileSync(filePath, "utf8"));
	const headerCells = rows[0];
	const headers = headerCells.map((cell) => cell.value);
	const records = rows.slice(1).map((cells, rowIndex) => {
		const record = {
			__index: rowIndex,
			__cells: new Map(),
		};
		headers.forEach((header, cellIndex) => {
			const cell = cells[cellIndex] ?? { value: "", raw: "" };
			record[header] = cell.value;
			record.__cells.set(header, { value: cell.value, raw: cell.raw });
		});
		return record;
	});

	return { headers, headerCells, records };
};

const writeCsvRecords = (headers, headerCells, records) => {
	const lines = [headerCells.map((cell) => cell.raw).join(",")];
	for (const record of records) {
		lines.push(
			headers.map((header) => record.__cells.get(header)?.raw ?? formatCsvCell(record[header] ?? "")).join(","),
		);
	}
	return `${lines.join("\n")}\n`;
};

const cloneRecord = (record) => {
	const cloned = { __index: record.__index, __cells: new Map() };
	for (const [key, cell] of record.__cells.entries()) {
		cloned[key] = cell.value;
		cloned.__cells.set(key, { value: cell.value, raw: cell.raw });
	}
	return cloned;
};

const setCell = (record, header, value) => {
	const normalizedValue = value == null ? "" : String(value);
	record[header] = normalizedValue;
	record.__cells.set(header, { value: normalizedValue, raw: formatCsvCell(normalizedValue) });
};

const formatCsvCell = (value) => {
	if (value === "") {
		return "";
	}
	if (/["\n\r,]/.test(value) || value.trim() !== value) {
		return `"${value.replaceAll('"', '""')}"`;
	}
	return value;
};

function formatNumber(value) {
	return value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

const trimOptional = (value) => {
	if (value == null) {
		return "";
	}
	return String(value).trim();
};

const buildSkillIndexes = (skillRecords) => {
	const byCoordinate = new Map();
	const byName = new Map();

	for (const record of skillRecords) {
		const posX = Number(record.posX);
		const posY = Number(record.posY);
		if (Number.isInteger(posX) && Number.isInteger(posY)) {
			byCoordinate.set(`${record.treeType}|${posX}|${posY}`, record);
		}
		byName.set(`${record.treeType}|${record.name}`, record);
	}

	return { byCoordinate, byName };
};

const resolveSkillRecord = (jsonTree, jsonSkill, skillIndexes) => {
	const treeType = treeTypeByJsonName.get(jsonTree.name);
	if (!treeType) {
		return { reason: "unmappedTree" };
	}

	if (treeType === "MagicSkill") {
		// 魔法技能在现有 skill.csv 中使用了非 5 列网格坐标，按技能名显式映射能避免 drawTreeOrder 误连。
		const csvName = magicSkillNameByJsonName.get(jsonSkill.name);
		return {
			record: csvName ? skillIndexes.byName.get(`${treeType}|${csvName}`) : undefined,
			reason: csvName ? "magicName" : "missingMagicName",
		};
	}

	const posX = jsonSkill.drawTreeOrder % 5;
	const posY = Math.floor(jsonSkill.drawTreeOrder / 5);
	return {
		record: skillIndexes.byCoordinate.get(`${treeType}|${posX}|${posY}`),
		reason: "coordinate",
	};
};

const inheritEffectData = (effect, defaultEffect) => ({
	mpCost: effect.mpCost ?? defaultEffect?.mpCost ?? null,
	range: effect.range ?? defaultEffect?.range ?? null,
	skillType: effect.skillType ?? defaultEffect?.skillType ?? null,
	inCombo: effect.inCombo ?? defaultEffect?.inCombo ?? null,
	actionTime: effect.actionTime ?? defaultEffect?.actionTime ?? null,
	castingTime: effect.castingTime ?? defaultEffect?.castingTime ?? null,
});

const buildTargets = (effect) => {
	const armor = effect.bodyArmor == null ? "Any" : armorTargetByJsonName.get(effect.bodyArmor);
	if (!armor) {
		throw new Error(`未知防具条件：${effect.bodyArmor}`);
	}

	const mainTarget = effect.mainWeapon == null ? undefined : mainWeaponTargetByJsonName.get(effect.mainWeapon);
	if (effect.mainWeapon != null && !mainTarget) {
		throw new Error(`未知主手条件：${effect.mainWeapon}`);
	}

	const subTarget = effect.subWeapon == null ? undefined : subWeaponTargetByJsonName.get(effect.subWeapon);
	if (effect.subWeapon != null && !subTarget) {
		throw new Error(`未知副手条件：${effect.subWeapon}`);
	}

	const createBase = () => ({ main: "Any", sub: "Any", armor });
	const applyMain = (target) => {
		if (mainTarget) {
			target.main = mainTarget.main;
			target.sub = mainTarget.sub;
		}
		return target;
	};
	const applySub = (target) => {
		if (subTarget) {
			target.sub = subTarget;
		}
		return target;
	};

	const targets =
		mainTarget && subTarget && !effect.equipmentOperatorAnd
			? [applyMain(createBase()), applySub(createBase())]
			: [applySub(applyMain(createBase()))];

	const seen = new Set();
	return targets.filter((target) => {
		const key = `${target.main}|${target.sub}|${target.armor}`;
		if (seen.has(key)) {
			return false;
		}
		seen.add(key);
		return true;
	});
};

const updateVariantRow = (row, data, target) => {
	setCell(row, "targetMainWeaponType", target.main);
	setCell(row, "targetSubWeaponType", target.sub);
	setCell(row, "targetArmorAbilityType", target.armor);
	setCell(row, "hpCost", "");
	setCell(row, "mpCost", trimOptional(data.mpCost));
	setCell(row, "range", trimOptional(data.range));

	const castTimeType = castTimeTypeByJsonName.get(data.skillType);
	if (!castTimeType) {
		throw new Error(`未知技能读条类型：${data.skillType}`);
	}
	setCell(row, "castTimeType", castTimeType);
	setCell(row, "chantingFixedMs", "");
	setCell(row, "chantingModifiedMs", castTimeType === "Chanting" ? trimOptional(data.castingTime) : "");
	setCell(row, "chargingFixedMs", "");
	setCell(row, "chargingModifiedMs", castTimeType === "Charging" ? trimOptional(data.castingTime) : "");

	const comboCompatible = comboCompatibleByJsonName.get(data.inCombo);
	if (comboCompatible) {
		setCell(row, "comboCompatible", comboCompatible);
	}

	const actionTime = actionTimeByJsonName.get(data.actionTime);
	if (actionTime) {
		setCell(row, "actionFixedMs", actionTime.fixed);
		setCell(row, "actionModifiedMs", actionTime.modified);
	}
};

const nextCuid = (usedIds) => {
	let id = createId();
	while (usedIds.has(id)) {
		id = createId();
	}
	usedIds.add(id);
	return id;
};

const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const skillCsv = readCsvRecords(skillCsvPath);
const variantCsv = readCsvRecords(skillVariantCsvPath);
const skillIndexes = buildSkillIndexes(skillCsv.records);
const variantRowsBySkillId = new Map();
const usedVariantIds = new Set();

for (const row of variantCsv.records) {
	usedVariantIds.add(row.id);
	const rows = variantRowsBySkillId.get(row.belongToskillId) ?? [];
	rows.push(row);
	variantRowsBySkillId.set(row.belongToskillId, rows);
}

const updatesBySkillId = new Map();
const summary = {
	sourceSkills: 0,
	sourceEffects: 0,
	activeEffects: 0,
	updatedExistingRows: 0,
	insertedRows: 0,
	skippedPassiveEffects: 0,
	skippedExEffects: 0,
	skippedUnmappedTreeSkills: 0,
	unresolvedSkills: [],
	countMismatches: [],
};

for (const category of source.categories) {
	for (const jsonTree of category.skillTrees ?? []) {
		for (const jsonSkill of jsonTree.skills ?? []) {
			summary.sourceSkills += 1;
			const resolvedSkill = resolveSkillRecord(jsonTree, jsonSkill, skillIndexes);
			if (!resolvedSkill.record) {
				if (resolvedSkill.reason === "unmappedTree") {
					summary.skippedUnmappedTreeSkills += 1;
				} else {
					summary.unresolvedSkills.push(`${jsonTree.name}/${jsonSkill.name}/${resolvedSkill.reason}`);
				}
				continue;
			}

			const defaultEffect = jsonSkill.effects?.find((effect) => effect.isDefault);
			const updates = [];
			for (const effect of jsonSkill.effects ?? []) {
				summary.sourceEffects += 1;
				if (effect.isHistory) {
					continue;
				}

				const data = inheritEffectData(effect, defaultEffect);
				if (data.skillType === "被動") {
					summary.skippedPassiveEffects += 1;
					continue;
				}
				if (data.skillType === "EX技能") {
					summary.skippedExEffects += 1;
					continue;
				}

				updates.push({ data, targets: buildTargets(effect) });
				summary.activeEffects += 1;
			}

			if (updates.length > 0) {
				updatesBySkillId.set(resolvedSkill.record.id, updates);
			}
		}
	}
}

const rowAdditionsByOriginalIndex = new Map();

for (const [skillId, updates] of updatesBySkillId.entries()) {
	const rows = variantRowsBySkillId.get(skillId) ?? [];
	const expandedRowCount = updates.reduce((total, update) => total + update.targets.length, 0);
	const legacyRowCount = updates.length;

	if (rows.length !== legacyRowCount && rows.length !== expandedRowCount) {
		summary.countMismatches.push(
			`${skillId}: csv=${rows.length}, legacy=${legacyRowCount}, expanded=${expandedRowCount}`,
		);
		continue;
	}

	let rowCursor = 0;
	for (const update of updates) {
		if (rows.length === expandedRowCount) {
			for (const target of update.targets) {
				updateVariantRow(rows[rowCursor], update.data, target);
				summary.updatedExistingRows += 1;
				rowCursor += 1;
			}
			continue;
		}

		const baseRow = rows[rowCursor];
		updateVariantRow(baseRow, update.data, update.targets[0]);
		summary.updatedExistingRows += 1;
		rowCursor += 1;

		const additions = rowAdditionsByOriginalIndex.get(baseRow.__index) ?? [];
		for (const target of update.targets.slice(1)) {
			const inserted = cloneRecord(baseRow);
			setCell(inserted, "id", nextCuid(usedVariantIds));
			updateVariantRow(inserted, update.data, target);
			additions.push(inserted);
			summary.insertedRows += 1;
		}
		rowAdditionsByOriginalIndex.set(baseRow.__index, additions);
	}
}

if (summary.countMismatches.length > 0 || summary.unresolvedSkills.length > 0) {
	console.log(JSON.stringify(summary, null, 2));
	throw new Error("导入前置校验失败，未写入 skill_variant.csv。");
}

const outputRows = [];
for (const row of variantCsv.records) {
	outputRows.push(row);
	for (const inserted of rowAdditionsByOriginalIndex.get(row.__index) ?? []) {
		outputRows.push(inserted);
	}
}

if (shouldWrite) {
	fs.writeFileSync(skillVariantCsvPath, writeCsvRecords(variantCsv.headers, variantCsv.headerCells, outputRows));
}

console.log(JSON.stringify({ mode: shouldWrite ? "write" : "dry-run", ...summary }, null, 2));
