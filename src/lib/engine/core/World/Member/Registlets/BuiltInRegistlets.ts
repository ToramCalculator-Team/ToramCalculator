/**
 * 内置雷吉斯托环 (registlet) 试点数据。
 *
 * 结构与 prisma `registlet` + `db/schema/jsons.ts` 里的 effect schema 严格对齐，
 * 数据库接入后可以直接从 registlet 表读同样的行形态（或覆盖本文件内容）。
 *
 * 当前包含 5 条代表性托环，覆盖 overlay / threshold watcher / proc mask 三种机制：
 *  1. registlet.lingjiaoLingjiao  (领教领教)   — overlay: damageCalc 末尾 clamp finalDamage
 *  2. registlet.lastResistance    (最后的抵抗) — overlay: applyDamage 内拦截致死
 *  3. registlet.dianHou           (殿后)       — overlay: damageCalc 减伤段加条件加成
 *  4. registlet.hpEmergency       (HP 紧急回复) — threshold watcher: HP 跨 25% 下穿
 *  5. registlet.jianqingZhuiji    (减轻追击)   — subscription: 进入胆怯/翻覆/昏厥时 +物理防御%
 *
 * 运行时由 `RegistletLoader.installRegistlet` 消费。
 */

import type { RegistletRow } from "./RegistletLoader";

/**
 * 领教领教：伤害上限变为目标最大 HP 的 1%。
 *
 * 落点：`damageCalc` 管线 `finalDamage` 锚点之后，clamp 成 `min(finalDamage, self.hp.max * 0.01)`。
 */
const LINGJIAO: RegistletRow = {
	id: "registlet.lingjiaoLingjiao",
	name: "领教领教",
	maxLevel: 10,
	attrModifiers: [],
	skillBranchActivators: [],
	subscriptions: [],
	thresholdWatchers: [],
	pipelinePatches: [
		{
			pipelineName: "damageCalc",
			slot: "finalDamage",
			position: "after",
			priority: 0,
			steps: [
				{
					type: "insertInstructions",
					instructions: [
						{ target: "lljHpMax", op: "get", a: "self", b: "hp.max" },
						{ target: "lljCap", op: "*", a: "lljHpMax", b: 0.01 },
						{ target: "finalDamage", op: "min", a: "finalDamage", b: "lljCap" },
					],
				},
			],
		},
	],
};

/**
 * 最后的抵抗：受致死伤害时把 HP 保留 1 点（队伍判定等后续迭代）。
 *
 * 落点：`applyDamage` 管线 `damage` 锚点之后，按 `self.hp.current - damage <= 0` 条件
 * 将 damage 改写为 `self.hp.current - 1`。
 */
const LAST_RESISTANCE: RegistletRow = {
	id: "registlet.lastResistance",
	name: "最后的抵抗",
	maxLevel: 5,
	attrModifiers: [],
	skillBranchActivators: [],
	subscriptions: [],
	thresholdWatchers: [],
	pipelinePatches: [
		{
			pipelineName: "applyDamage",
			slot: "damage",
			position: "after",
			priority: 10,
			steps: [
				{
					type: "insertInstructions",
					instructions: [
						{ target: "lrHpCurrent", op: "get", a: "self", b: "hp.current" },
						{ target: "lrHpAfter", op: "-", a: "lrHpCurrent", b: "damage" },
						{ target: "lrIsFatal", op: "<=", a: "lrHpAfter", b: 0 },
						{ target: "lrSafeDamage", op: "-", a: "lrHpCurrent", b: 1 },
						{
							target: "damage",
							op: "select",
							a: "lrIsFatal",
							b: "lrSafeDamage,damage",
						},
					],
				},
			],
		},
	],
};

/**
 * 殿后：(镜头面向)后方受到的伤害减轻 等级%。
 *
 * 落点：`damageCalc` 管线 `baseDamageReduction` 锚点之后，按 `input.isBack`（FSM 预先把 back
 * 方向映射成 1，其它 0）追加减伤量。
 */
const DIAN_HOU: RegistletRow = {
	id: "registlet.dianHou",
	name: "殿后",
	maxLevel: 10,
	attrModifiers: [],
	skillBranchActivators: [],
	subscriptions: [],
	thresholdWatchers: [],
	pipelinePatches: [
		{
			pipelineName: "damageCalc",
			slot: "baseDamageReduction",
			position: "after",
			priority: 0,
			steps: [
				{
					type: "insertInstructions",
					instructions: [
						// dhRateTimesBase = baseDamage * levelRate
						{ target: "dhRateTimesBase", op: "*", a: "baseDamage", b: "{levelRate}" },
						// dhAddReduction = dhRateTimesBase * input.isBack
						{ target: "dhAddReduction", op: "*", a: "dhRateTimesBase", b: "input.isBack" },
						{
							target: "baseDamageReduction",
							op: "+",
							a: "baseDamageReduction",
							b: "dhAddReduction",
						},
					],
				},
			],
		},
	],
};

/**
 * HP 紧急回复：HP 跌破 25% 时回复 (等级+10)% 最大 HP，60s CD。
 */
const HP_EMERGENCY: RegistletRow = {
	id: "registlet.hpEmergency",
	name: "HP紧急回复",
	maxLevel: 10,
	attrModifiers: [],
	skillBranchActivators: [],
	subscriptions: [],
	pipelinePatches: [],
	thresholdWatchers: [
		{
			path: "hp.current",
			threshold: "self.hp.max * 0.25",
			direction: "falling",
			cooldownFrames: 3600,
			fireOnRegister: false,
			handlers: [
				{
					type: "addModifier",
					attribute: "hp.current",
					modifierType: "dynamicFixed",
					value: "self.hp.max * (level + 10) / 100",
					lifetime: "once",
				},
			],
		},
	],
};

/**
 * 减轻追击：陷入胆怯 / 翻覆 / 昏厥时 +等级% 物理防御（骨架版借用 def.p 代替"受击减伤"语义）。
 *
 * 机制：
 * - `status.entered` 订阅：加一条 sourceId 稳定的 dynamicPercentage modifier（level% of def.p）
 * - `status.exited` 订阅：按相同 sourceId 移除 modifier
 *
 * 注：精确语义"受击伤害直接减"需要 base schema 加一个减伤 % 属性并接入 damageCalc；
 * 本骨架只验证订阅 → addModifier / removeModifierBySource 闭环。
 */
const JIANQING_ZHUIJI: RegistletRow = {
	id: "registlet.jianqingZhuiji",
	name: "减轻追击",
	maxLevel: 20,
	attrModifiers: [],
	skillBranchActivators: [],
	pipelinePatches: [],
	thresholdWatchers: [],
	subscriptions: [
		{
			eventNames: ["status.entered"],
			requiredDamageTags: [],
			requiredStatusTypes: ["Flinch", "Tumble", "Stun"],
			handlers: [
				{
					type: "addModifier",
					attribute: "def.p",
					modifierType: "dynamicPercentage",
					value: "{level}",
					lifetime: "bySource",
					sourceIdSuffix: "jqzj.active",
				},
			],
		},
		{
			eventNames: ["status.exited"],
			requiredDamageTags: [],
			requiredStatusTypes: ["Flinch", "Tumble", "Stun"],
			handlers: [
				{
					type: "removeModifierBySource",
					attribute: "def.p",
					sourceIdSuffix: "jqzj.active",
				},
			],
		},
	],
};

export const BUILT_IN_REGISTLETS: readonly RegistletRow[] = [
	LINGJIAO,
	LAST_RESISTANCE,
	DIAN_HOU,
	HP_EMERGENCY,
	JIANQING_ZHUIJI,
];

/** 快速查表：id → 数据。 */
export const BUILT_IN_REGISTLETS_BY_ID: ReadonlyMap<string, RegistletRow> = new Map(
	BUILT_IN_REGISTLETS.map((r) => [r.id, r]),
);
