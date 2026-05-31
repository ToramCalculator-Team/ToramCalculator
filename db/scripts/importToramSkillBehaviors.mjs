import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const defaultSource = "/mnt/c/Users/KiaClouth2/Downloads/toram-skills.json";
const sourceArgIndex = process.argv.indexOf("--source");
const sourcePath = sourceArgIndex >= 0 ? process.argv[sourceArgIndex + 1] : defaultSource;
const shouldWrite = process.argv.includes("--write");
const verbose = process.argv.includes("--verbose");

const skillCsvPath = path.join(repoRoot, "db/backups/skill.csv");
const skillVariantCsvPath = path.join(repoRoot, "db/backups/skill_variant.csv");
const behaviorTreeCsvPath = path.join(repoRoot, "db/backups/behavior_tree.csv");

const GENERATED_PASSIVE_MARKER = "toram-skill-import:passive-attribute-v1";
const GENERATED_ACTIVE_DAMAGE_MARKER = "toram-skill-import:active-damage-v1";
const LEGACY_IMPORTED_PASSIVE_MODIFIER_KIND = "toramPassiveModifiers";

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

const passiveAttributeMap = new Map([
	["atk", "atk.p"],
	["matk", "atk.m"],
	["weapon_atk", "weaponAtk.p"],
	["max_hp", "hp.max"],
	["max_mp", "mp.max"],
	["aspd", "aspd"],
	["cspd", "cspd"],
	["critical_rate", "c.rate.p"],
	["critical_damage", "c.dmg.p"],
	["accuracy", "accuracy"],
	["dodge", "avoid"],
	["attack_mp_recovery", "ampr"],
	["def", "def.p"],
	["mdef", "def.m"],
	["aggro", "aggro.rate"],
	["evasion_regenerate", "dodge.recharge"],
	["guard_regenerate", "guard.recharge"],
	["guard_power", "guard.power"],
	["natural_hp_regen_s", "hp.recovery"],
	["natural_hp_regen_b", "hp.recovery"],
	["natural_mp_regen_s", "mp.recovery"],
	["natural_mp_regen_b", "mp.recovery"],
	["physical_pierce", "pie.p"],
	["physical_resistance", "red.p"],
	["magic_resistance", "red.m"],
	["drop_rate", "drop.rate"],
	["exp_rate", "exp.rate"],
	["unsheathe_attack_multiplier", "unsheatheAtk"],
	["magic_crt_percentage", "conv.pcrToMcr"],
	["magic_cd_percentage", "conv.pcdToMcd"],
]);

const passiveMetadataAttributeNames = new Set([
	"caption",
	"is_mark",
	"mark",
	"name",
	"skill",
	"branch",
	"condition",
	"stack_id",
	"skill_tree",
	"text",
	"total_damage_A",
	"total_damage_A.conditionValue",
	"total_damage_A.displayTitle",
	"total_skill_multiplier",
	"total_skill_multiplier.conditionValue",
	"total_skill_multiplier.displayTitle",
]);

const unsupportedExpressionPattern = /(?:^|[^A-Za-z0-9_])(?:stack|extra)\s*\[|\$/;
const skillLevelSourceIdentifierPattern = /\b(?:SLv|sLv)\b/;
const skillLevelSourceIdentifierGlobalPattern = /\b(?:SLv|sLv)\b/g;
const characterLevelSourceIdentifierGlobalPattern = /\bCLv\b/g;
const mathMethods = new Set(["abs", "ceil", "floor", "max", "min", "pow", "round", "trunc"]);
const allowedStandaloneIdentifiers = new Set(["skillLv", "lv", "Math"]);

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
			if (content[index + 1] === "\n") index += 1;
			pushRow();
			continue;
		}

		value += char;
		raw += char;
	}

	if (value !== "" || raw !== "" || row.length > 0) pushRow();
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

const formatCsvCell = (value) => {
	if (value === "") return "";
	if (/["\n\r,]/.test(value) || value.trim() !== value) {
		return `"${value.replaceAll('"', '""')}"`;
	}
	return value;
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

const setCell = (record, header, value) => {
	const normalizedValue = value == null ? "" : String(value);
	record[header] = normalizedValue;
	record.__cells.set(header, { value: normalizedValue, raw: formatCsvCell(normalizedValue) });
};

/** 对 NOT NULL 文本列，空值写为 "" (quoted empty) 而非裸空（COPY 会解释为 NULL）。 */
const setCellNotNull = (record, header, value) => {
	const normalizedValue = value == null ? "" : String(value);
	record[header] = normalizedValue;
	const raw = normalizedValue === "" ? '""' : formatCsvCell(normalizedValue);
	record.__cells.set(header, { value: normalizedValue, raw });
};

const createRecord = (headers, values = {}) => {
	const record = { __index: -1, __cells: new Map() };
	for (const header of headers) setCell(record, header, values[header] ?? "");
	return record;
};

const addCount = (map, key) => {
	map.set(key, (map.get(key) ?? 0) + 1);
};

const pushExample = (map, key, example, limit = 8) => {
	const list = map.get(key) ?? [];
	if (list.length < limit) list.push(example);
	map.set(key, list);
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
	if (!treeType) return { reason: "unmappedTree" };

	if (treeType === "MagicSkill") {
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

const buildTargets = (effect) => {
	const armor = effect.bodyArmor == null ? "Any" : armorTargetByJsonName.get(effect.bodyArmor);
	if (!armor) throw new Error(`未知防具条件：${effect.bodyArmor}`);

	const mainTarget = effect.mainWeapon == null ? undefined : mainWeaponTargetByJsonName.get(effect.mainWeapon);
	if (effect.mainWeapon != null && !mainTarget) throw new Error(`未知主手条件：${effect.mainWeapon}`);

	const subTarget = effect.subWeapon == null ? undefined : subWeaponTargetByJsonName.get(effect.subWeapon);
	if (effect.subWeapon != null && !subTarget) throw new Error(`未知副手条件：${effect.subWeapon}`);

	const createBase = () => ({ main: "Any", sub: "Any", armor });
	const applyMain = (target) => {
		if (mainTarget) {
			target.main = mainTarget.main;
			target.sub = mainTarget.sub;
		}
		return target;
	};
	const applySub = (target) => {
		if (subTarget) target.sub = subTarget;
		return target;
	};

	const targets =
		mainTarget && subTarget && !effect.equipmentOperatorAnd
			? [applyMain(createBase()), applySub(createBase())]
			: [applySub(applyMain(createBase()))];

	const seen = new Set();
	return targets.filter((target) => {
		const key = `${target.main}|${target.sub}|${target.armor}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
};

const targetMatchesRow = (target, row) =>
	row.targetMainWeaponType === target.main &&
	row.targetSubWeaponType === target.sub &&
	row.targetArmorAbilityType === target.armor;

const isLegacyImportedPassiveDefinition = (definition) => {
	if (!definition) return false;
	try {
		const parsed = JSON.parse(definition);
		return parsed?.kind === LEGACY_IMPORTED_PASSIVE_MODIFIER_KIND && parsed?.version === 1;
	} catch {
		return false;
	}
};

const isGeneratedPassiveDefinition = (definition) =>
	typeof definition === "string" &&
	(definition.includes(GENERATED_PASSIVE_MARKER) || isLegacyImportedPassiveDefinition(definition));

const buildBehaviorTreeIndexes = (records) => {
	const byId = new Map();
	const passiveByOwnerId = new Map();
	const activeByOwnerId = new Map();
	for (const row of records) {
		byId.set(row.id, row);
		if (row.passiveOwnerId) passiveByOwnerId.set(row.passiveOwnerId, row);
		if (row.activeOwnerId) activeByOwnerId.set(row.activeOwnerId, row);
	}
	return { byId, passiveByOwnerId, activeByOwnerId };
};

const toMdslString = (value) => JSON.stringify(String(value));

const isSupportedNumericExpression = (expression) => {
	if (!/^[\d\s+\-*/%().,A-Za-z_]+$/.test(expression)) {
		return { ok: false, reason: "unsupportedCharacters" };
	}

	for (const match of expression.matchAll(/\b[A-Za-z_][A-Za-z0-9_]*\b/g)) {
		const identifier = match[0];
		if (allowedStandaloneIdentifiers.has(identifier)) continue;
		if (mathMethods.has(identifier) && expression.slice(Math.max(0, match.index - 5), match.index) === "Math.") {
			continue;
		}
		return { ok: false, reason: `unsupportedIdentifier:${identifier}` };
	}

	return { ok: true };
};

const normalizePassiveExpression = (attr, context, summary) => {
	const value = String(attr.value ?? "").trim();
	if (value === "") {
		summary.skippedEmptyValues += 1;
		return null;
	}
	if (unsupportedExpressionPattern.test(value)) {
		addCount(summary.unsupportedExpressionCounts, attr.name);
		pushExample(summary.unsupportedExpressionExamples, attr.name, { ...context, value, reason: "runtimeCollection" });
		return null;
	}

	let expression = value.replace(skillLevelSourceIdentifierGlobalPattern, "skillLv");
	expression = expression.replace(characterLevelSourceIdentifierGlobalPattern, "lv");
	if (skillLevelSourceIdentifierPattern.test(value)) summary.normalizedSkillLvExpressions += 1;

	const supported = isSupportedNumericExpression(expression);
	if (!supported.ok) {
		addCount(summary.unsupportedExpressionCounts, attr.name);
		pushExample(summary.unsupportedExpressionExamples, attr.name, {
			...context,
			value,
			expression,
			reason: supported.reason,
		});
		return null;
	}

	return expression;
};

const toPassiveModifyAttributeAction = (attr, internalAttr, context, summary) => {
	const expression = normalizePassiveExpression(attr, context, summary);
	if (!expression) return null;

	if (attr.extra && attr.extra !== "%") {
		addCount(summary.unsupportedExtraCounts, attr.extra);
		pushExample(summary.unsupportedExtraExamples, attr.extra, { ...context, attr: attr.name, value: attr.value });
		return null;
	}

	const modifierType = attr.extra === "%" ? "staticPercentage" : "staticFixed";
	if (attr.extra === "%") {
		summary.percentItems.push({
			...context,
			externalAttr: attr.name,
			internalAttr,
			sourceValue: String(attr.value ?? "").trim(),
			expression,
			modifierType,
		});
	}

	return {
		externalAttr: attr.name,
		internalAttr,
		expression,
		modifierType,
	};
};

const buildPassiveModifyAttributeActions = (jsonTree, jsonSkill, effect, summary) => {
	const actions = [];
	for (const branch of effect.branches ?? []) {
		if (branch.name !== "passive") continue;
		for (const attr of branch.attributes ?? []) {
			const context = {
				tree: jsonTree.name,
				skill: jsonSkill.name,
				branch: branch.name,
				branchId: branch.id,
			};
			const internalAttr = passiveAttributeMap.get(attr.name);
			if (!internalAttr) {
				if (!passiveMetadataAttributeNames.has(attr.name) && !attr.name.endsWith(".display")) {
					addCount(summary.unmappedPassiveAttributeCounts, attr.name);
					pushExample(summary.unmappedPassiveAttributeExamples, attr.name, { ...context, value: attr.value });
				}
				continue;
			}

			const action = toPassiveModifyAttributeAction(attr, internalAttr, context, summary);
			if (action) actions.push(action);
		}
	}
	return actions;
};

const buildPassiveDefinition = (variantId, jsonTree, jsonSkill, actions) => {
	const lines = [
		"root {",
		`\t/* ${GENERATED_PASSIVE_MARKER}; sourceTree=${jsonTree.name}; sourceSkill=${jsonSkill.name} */`,
		"\tsequence {",
	];
	actions.forEach((action) => {
		// sourceId/sourceName/sourceType 由 per-tree 注入的 context.skill 自动提供
		const args = [
			"\t\taction [modifyAttribute",
			toMdslString(action.internalAttr),
			toMdslString(action.expression),
			toMdslString(action.modifierType),
		];
		lines.push(`${args.join(", ")}]`);
	});
	lines.push("\t}", "}");
	return lines.join("\n");
};

// ==================== Active Damage v1 ====================

// 中文异常名 → AbnormalType (db/schema/enums.ts)
const ailmentNameMap = {
	膽怯: "Flinch",
	翻覆: "Tumble",
	降防: "Breaking",
	逼退: "KnockBack",
	昏厥: "Stun",
	麻痺: "Paralysis",
	停止: "Stop",
	衰弱: "Weak",
	著火: "Ignition",
	盲目: "Blindness",
	乏力: "Collapse",
	遲緩: "Slow",
	沉默: "Silent",
	眩暈: "Dizzy",
	冰凍: "Freeze",
	出血: "Bleed",
	疲勞: "Tiredness",
	閃光: "Flash",
	猛毒: "Poison",
	睡眠: "Sleep",
	魅惑: "Confusion",
	畏懼: "Fear",
};

const vAtkFormulas = {
	physical: "((self.lv - target.lv + self.atk.p) * (1 - target.red.p) - target.def.p * (1 - self.pie.p))",
	magic: "((self.lv - target.lv + self.atk.m) * (1 - target.red.m) - target.def.m * (1 - self.pie.m))",
	normal_attack: "((self.lv - target.lv + self.atk.p) * (1 - target.red.p) - target.def.p * (1 - self.pie.p))",
};

const prorationToExpTypes = {
	physical: { application: "physical", resolution: "physical" },
	magic: { application: "magic", resolution: "magic" },
	normal_attack: { application: "normal", resolution: "physical" },
};

const isGeneratedActiveDefinition = (definition) =>
	typeof definition === "string" && definition.includes(GENERATED_ACTIVE_DAMAGE_MARKER);

const normalizeActiveExpression = (raw) => {
	if (!raw) return null;
	let expr = String(raw).trim();
	if (expr === "") return null;
	expr = expr.replace(skillLevelSourceIdentifierGlobalPattern, "skillLv");
	expr = expr.replace(characterLevelSourceIdentifierGlobalPattern, "self.lv");
	// $BSTR → self._str (base value, B-prefix)
	expr = expr.replace(/\$B(STR|INT|VIT|DEX|AGI|LUK)/g, (_, s) => `self._${s.toLowerCase()}`);
	// $STR → self.str (current value)
	expr = expr.replace(/\$(STR|INT|VIT|DEX|AGI|LUK)/g, (_, s) => `self.${s.toLowerCase()}`);
	if (/\$|extra\[|RLv|\bstack\b/.test(expr)) return null;
	return expr;
};

const qualifiesForActiveDamageV1 = (effect) => {
	const branches = effect.branches ?? [];
	const damageBranches = branches.filter((b) => b.name === "damage");
	const prorationBranches = branches.filter((b) => b.name === "proration");
	if (damageBranches.length !== 1 || prorationBranches.length !== 1) return null;

	const hasStack = branches.some((b) => b.name === "stack");
	const hasHeal = branches.some((b) => b.name === "heal");
	if (hasStack || hasHeal) return null;

	const damage = damageBranches[0];
	const proration = prorationBranches[0];
	const dmgAttrs = Object.fromEntries((damage.attributes ?? []).map((a) => [a.name, a.value]));

	// Skip complex damage types (but allow frequency)
	if (dmgAttrs.duration || dmgAttrs.radius) return null;
	if (dmgAttrs.is_place || dmgAttrs.move_distance || dmgAttrs.end_position) return null;

	const constant = normalizeActiveExpression(dmgAttrs.constant);
	const multiplier = normalizeActiveExpression(dmgAttrs.multiplier);
	if (!constant || !multiplier) return null;

	const prorationDamage = proration.attributes?.find((a) => a.name === "damage")?.value;
	if (!prorationDamage || !vAtkFormulas[prorationDamage]) return null;

	const attackCount = dmgAttrs.frequency ? Number(dmgAttrs.frequency) : 1;
	if (isNaN(attackCount) || attackCount < 1) return null;

	// Extract ailment if present (non-blocking)
	let ailment = null;
	if (dmgAttrs.ailment_name && ailmentNameMap[dmgAttrs.ailment_name]) {
		const chanceExpr = normalizeActiveExpression(dmgAttrs.ailment_chance);
		if (chanceExpr) {
			ailment = { type: ailmentNameMap[dmgAttrs.ailment_name], chance: chanceExpr };
		}
	}

	return { constant, multiplier, prorationDamage, attackCount, ailment, dmgAttrs };
};

const buildActiveDamageDefinition = (variantId, jsonTree, jsonSkill, damageInfo) => {
	const { constant, multiplier, prorationDamage, attackCount, ailment } = damageInfo;
	const vAtk = vAtkFormulas[prorationDamage];
	const formula = `(${vAtk} + ${constant}) * (${multiplier}) / 100`;
	const types = prorationToExpTypes[prorationDamage];
	const ailmentsLiteral = ailment
		? `[{type: ${toMdslString(ailment.type)}, chance: ${toMdslString(ailment.chance)}}]`
		: "[]";
	const lines = [
		"root {",
		`\t/* ${GENERATED_ACTIVE_DAMAGE_MARKER}; sourceTree=${jsonTree.name}; sourceSkill=${jsonSkill.name} */`,
		"\tsequence {",
		`\t\taction [animation, "startup", currentSkill.lifecycle.startUp]`,
		`\t\twait [currentSkill.lifecycle.startUp]`,
		`\t\taction [animation, "charging", currentSkill.lifecycle.charging]`,
		`\t\twait [currentSkill.lifecycle.charging]`,
		`\t\taction [animation, "chanting", currentSkill.lifecycle.chanting]`,
		`\t\twait [currentSkill.lifecycle.chanting]`,
		`\t\taction [singleAttack, $targetId, ${toMdslString(types.application)}, ${toMdslString(types.resolution)}, ${attackCount}, ${toMdslString(formula)}, 1, [], ${ailmentsLiteral}, "none"]`,
		`\t\taction [animation, "action", currentSkill.lifecycle.actionMs]`,
		`\t\twait [currentSkill.lifecycle.actionMs]`,
		"\t}",
		"}",
	];
	return lines.join("\n");
};

const upsertActiveBehaviorTree = (
	behaviorCsv,
	behaviorIndexes,
	behaviorRowsToAppend,
	generatedActiveOwnerIds,
	variantRow,
	jsonTree,
	jsonSkill,
	damageInfo,
	summary,
) => {
	const id = `${variantRow.id}__active_bt`;
	const existingByOwner = behaviorIndexes.activeByOwnerId?.get(variantRow.id);
	if (existingByOwner && existingByOwner.id !== id && !isGeneratedActiveDefinition(existingByOwner.definition)) {
		summary.manualActiveConflicts.push({
			variantId: variantRow.id,
			existingId: existingByOwner.id,
			skill: jsonSkill.name,
		});
		return;
	}

	let row = behaviorIndexes.byId.get(id) ?? existingByOwner;
	if (row && !isGeneratedActiveDefinition(row.definition)) {
		summary.manualActiveConflicts.push({ variantId: variantRow.id, existingId: row.id, skill: jsonSkill.name });
		return;
	}

	const isNew = !row;
	if (!row) {
		row = createRecord(behaviorCsv.headers);
		behaviorRowsToAppend.push(row);
		summary.insertedActiveBehaviorRows += 1;
	} else {
		summary.updatedActiveBehaviorRows += 1;
	}

	setCell(row, "id", id);
	setCell(row, "name", `${jsonSkill.name} 主动伤害`);
	setCell(row, "definition", buildActiveDamageDefinition(variantRow.id, jsonTree, jsonSkill, damageInfo));
	setCellNotNull(row, "agent", "");
	setCellNotNull(row, "attributeSlots", "[]");
	setCell(row, "activeOwnerId", variantRow.id);
	setCell(row, "passiveOwnerId", "");
	setCell(row, "registeredOwnerId", "");
	behaviorIndexes.byId.set(id, row);
	if (!behaviorIndexes.activeByOwnerId) behaviorIndexes.activeByOwnerId = new Map();
	behaviorIndexes.activeByOwnerId.set(variantRow.id, row);
	generatedActiveOwnerIds.add(variantRow.id);
	summary.generatedActiveTrees += 1;
	if (isNew) row.__index = Number.MAX_SAFE_INTEGER;
};

const findRowsForTargets = (skillId, rows, targets, usedRows) => {
	const matched = [];
	for (const target of targets) {
		const exact = rows.find((row) => !usedRows.has(row) && targetMatchesRow(target, row));
		if (exact) {
			matched.push(exact);
			usedRows.add(exact);
			continue;
		}

		const fallback = rows.find((row) => !usedRows.has(row));
		if (fallback) {
			matched.push(fallback);
			usedRows.add(fallback);
			continue;
		}

		return {
			rows: matched,
			error: `${skillId}: missing variant row for ${target.main}/${target.sub}/${target.armor}`,
		};
	}
	return { rows: matched, error: null };
};

const upsertPassiveBehaviorTree = (
	behaviorCsv,
	behaviorIndexes,
	behaviorRowsToAppend,
	generatedPassiveOwnerIds,
	variantRow,
	jsonTree,
	jsonSkill,
	actions,
	summary,
) => {
	const id = `${variantRow.id}__passive_bt`;
	const existingByOwner = behaviorIndexes.passiveByOwnerId.get(variantRow.id);
	if (existingByOwner && existingByOwner.id !== id && !isGeneratedPassiveDefinition(existingByOwner.definition)) {
		summary.manualPassiveConflicts.push({
			variantId: variantRow.id,
			existingId: existingByOwner.id,
			skill: jsonSkill.name,
		});
		return;
	}

	let row = behaviorIndexes.byId.get(id) ?? existingByOwner;
	const isNew = !row;
	if (row && !isGeneratedPassiveDefinition(row.definition)) {
		summary.manualPassiveConflicts.push({ variantId: variantRow.id, existingId: row.id, skill: jsonSkill.name });
		return;
	}

	if (!row) {
		row = createRecord(behaviorCsv.headers);
		behaviorRowsToAppend.push(row);
		summary.insertedBehaviorRows += 1;
	} else {
		summary.updatedBehaviorRows += 1;
	}

	setCell(row, "id", id);
	setCell(row, "name", `${jsonSkill.name} 被动属性`);
	setCell(row, "definition", buildPassiveDefinition(variantRow.id, jsonTree, jsonSkill, actions));
	setCellNotNull(row, "agent", "");
	setCellNotNull(row, "attributeSlots", "[]");
	setCell(row, "activeOwnerId", "");
	setCell(row, "passiveOwnerId", variantRow.id);
	setCell(row, "registeredOwnerId", "");
	behaviorIndexes.byId.set(id, row);
	behaviorIndexes.passiveByOwnerId.set(variantRow.id, row);
	generatedPassiveOwnerIds.add(variantRow.id);
	summary.generatedPassiveTrees += 1;
	if (isNew) row.__index = Number.MAX_SAFE_INTEGER;
};

const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const skillCsv = readCsvRecords(skillCsvPath);
const variantCsv = readCsvRecords(skillVariantCsvPath);
const behaviorCsv = readCsvRecords(behaviorTreeCsvPath);
const skillIndexes = buildSkillIndexes(skillCsv.records);
const behaviorIndexes = buildBehaviorTreeIndexes(behaviorCsv.records);
const variantRowsBySkillId = new Map();

for (const row of variantCsv.records) {
	const rows = variantRowsBySkillId.get(row.belongToskillId) ?? [];
	rows.push(row);
	variantRowsBySkillId.set(row.belongToskillId, rows);
}

const summary = {
	mode: shouldWrite ? "write" : "dry-run",
	sourcePath,
	sourceSkills: 0,
	sourcePassiveEffects: 0,
	passiveEffectsWithActions: 0,
	generatedPassiveTrees: 0,
	insertedBehaviorRows: 0,
	updatedBehaviorRows: 0,
	removedStaleBehaviorRows: 0,
	sourceActiveEffects: 0,
	generatedActiveTrees: 0,
	insertedActiveBehaviorRows: 0,
	updatedActiveBehaviorRows: 0,
	skippedActiveUnsupported: 0,
	manualActiveConflicts: [],
	skippedPassiveNoSupportedActions: 0,
	skippedHistoryEffects: 0,
	skippedEmptyValues: 0,
	normalizedSkillLvExpressions: 0,
	unresolvedSkills: [],
	unmatchedVariants: [],
	manualPassiveConflicts: [],
	percentItems: [],
	unmappedPassiveAttributeCounts: new Map(),
	unmappedPassiveAttributeExamples: new Map(),
	unsupportedExpressionCounts: new Map(),
	unsupportedExpressionExamples: new Map(),
	unsupportedExtraCounts: new Map(),
	unsupportedExtraExamples: new Map(),
};

const behaviorRowsToAppend = [];
const generatedPassiveOwnerIds = new Set();
const generatedActiveOwnerIds = new Set();

for (const category of source.categories ?? []) {
	for (const jsonTree of category.skillTrees ?? []) {
		for (const jsonSkill of jsonTree.skills ?? []) {
			summary.sourceSkills += 1;
			const allEffects = (jsonSkill.effects ?? []).filter((effect) => !effect.isHistory);
			const hasPassiveSkillType = allEffects.some((effect) => effect.skillType === "被動");
			if (!hasPassiveSkillType) continue;
			const passiveEffects = allEffects.filter(
				(effect) => (effect.branches ?? []).some((b) => b.name === "passive"),
			);
			if (passiveEffects.length === 0) continue;

			const resolvedSkill = resolveSkillRecord(jsonTree, jsonSkill, skillIndexes);
			if (!resolvedSkill.record) {
				summary.unresolvedSkills.push(`${jsonTree.name}/${jsonSkill.name}/${resolvedSkill.reason}`);
				continue;
			}

			const skillRows = variantRowsBySkillId.get(resolvedSkill.record.id) ?? [];
			const usedRows = new Set();
			for (const effect of passiveEffects) {
				summary.sourcePassiveEffects += 1;

				const actions = buildPassiveModifyAttributeActions(jsonTree, jsonSkill, effect, summary);
				if (actions.length === 0) {
					summary.skippedPassiveNoSupportedActions += 1;
					continue;
				}
				summary.passiveEffectsWithActions += 1;

				let targets;
				try {
					targets = buildTargets(effect);
				} catch (error) {
					summary.unmatchedVariants.push(`${resolvedSkill.record.id}: ${error.message}`);
					continue;
				}

				const { rows, error } = findRowsForTargets(resolvedSkill.record.id, skillRows, targets, usedRows);
				if (error) {
					summary.unmatchedVariants.push(error);
					continue;
				}

				for (const row of rows) {
					upsertPassiveBehaviorTree(
						behaviorCsv,
						behaviorIndexes,
						behaviorRowsToAppend,
						generatedPassiveOwnerIds,
						row,
						jsonTree,
						jsonSkill,
						actions,
						summary,
					);
				}
			}
		}
	}
}

// === Active damage processing loop ===
for (const category of source.categories ?? []) {
	for (const jsonTree of category.skillTrees ?? []) {
		for (const jsonSkill of jsonTree.skills ?? []) {
			const activeEffects = (jsonSkill.effects ?? []).filter((e) => e.skillType !== "被動");
			if (activeEffects.length === 0) continue;

			const resolvedSkill = resolveSkillRecord(jsonTree, jsonSkill, skillIndexes);
			if (!resolvedSkill.record) continue;

			const skillRows = variantRowsBySkillId.get(resolvedSkill.record.id) ?? [];
			const usedRows = new Set();

			for (const effect of activeEffects) {
				if (effect.isHistory) continue;
				summary.sourceActiveEffects += 1;

				const damageInfo = qualifiesForActiveDamageV1(effect);
				if (!damageInfo) {
					summary.skippedActiveUnsupported += 1;
					continue;
				}

				let targets;
				try {
					targets = buildTargets(effect);
				} catch (error) {
					summary.unmatchedVariants.push(`${resolvedSkill.record.id}: ${error.message}`);
					continue;
				}

				const { rows, error } = findRowsForTargets(resolvedSkill.record.id, skillRows, targets, usedRows);
				if (error) {
					summary.unmatchedVariants.push(error);
					continue;
				}

				for (const row of rows) {
					upsertActiveBehaviorTree(
						behaviorCsv,
						behaviorIndexes,
						behaviorRowsToAppend,
						generatedActiveOwnerIds,
						row,
						jsonTree,
						jsonSkill,
						damageInfo,
						summary,
					);
				}
			}
		}
	}
}

const staleGeneratedRows = behaviorCsv.records.filter(
	(row) =>
		(row.passiveOwnerId &&
			isGeneratedPassiveDefinition(row.definition) &&
			!generatedPassiveOwnerIds.has(row.passiveOwnerId)) ||
		(row.activeOwnerId &&
			isGeneratedActiveDefinition(row.definition) &&
			!generatedActiveOwnerIds.has(row.activeOwnerId)),
);
summary.removedStaleBehaviorRows = staleGeneratedRows.length;
const staleGeneratedRowSet = new Set(staleGeneratedRows);

const mapToObject = (map) =>
	Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
const examplesToObject = (map) => Object.fromEntries([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])));

const outputSummary = {
	...summary,
	percentItems: verbose ? summary.percentItems : summary.percentItems.slice(0, 40),
	percentItemCount: summary.percentItems.length,
	unmappedPassiveAttributeCounts: mapToObject(summary.unmappedPassiveAttributeCounts),
	unmappedPassiveAttributeExamples: examplesToObject(summary.unmappedPassiveAttributeExamples),
	unsupportedExpressionCounts: mapToObject(summary.unsupportedExpressionCounts),
	unsupportedExpressionExamples: examplesToObject(summary.unsupportedExpressionExamples),
	unsupportedExtraCounts: mapToObject(summary.unsupportedExtraCounts),
	unsupportedExtraExamples: examplesToObject(summary.unsupportedExtraExamples),
};

if (
	summary.unresolvedSkills.length > 0 ||
	summary.unmatchedVariants.length > 0 ||
	summary.manualPassiveConflicts.length > 0 ||
	summary.manualActiveConflicts.length > 0
) {
	console.log(JSON.stringify(outputSummary, null, 2));
	throw new Error("行为导入前置校验失败，未写入 behavior_tree.csv。");
}

if (shouldWrite) {
	const keptBehaviorRows = behaviorCsv.records.filter((row) => !staleGeneratedRowSet.has(row));
	fs.writeFileSync(
		behaviorTreeCsvPath,
		writeCsvRecords(behaviorCsv.headers, behaviorCsv.headerCells, [...keptBehaviorRows, ...behaviorRowsToAppend]),
	);
}

console.log(JSON.stringify(outputSummary, null, 2));
