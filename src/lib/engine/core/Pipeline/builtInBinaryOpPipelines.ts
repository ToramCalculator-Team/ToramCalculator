import type { PipelineInstruction } from "./instruction";

/**
 * 内置基础管线定义（仅数据）。
 *
 * 说明：
 * - 由 `PipelineCatalog` 收编并冻结
 * - 解析/编译/执行由 `PipelineResolverService` 负责
 *
 * 技能生命周期帧管线（skill.startup / charging / chanting / action）约定：
 * - 由编排层（FSM action "计算技能生命周期参数"）预求值 variant 上的字符串公式，
 *   以 `input.original`（startup）或 `input.fixed` + `input.modified`（其余三段）传入。
 * - 管线只负责套用 mspd 行动速度修正：rate = max(0.5, 1 - mspd/100)，然后向下取整。
 * - FSM 再把管线输出 `frames` 写入 `runtime.currentSkill*Frames`。
 */

/** 标准行动速度修正：rate = max(0.5, 1 - mspd/100)。 */
const mspdRateInstructions: readonly PipelineInstruction[] = [
	{ target: "mspd", op: "get", a: "self", b: "mspd" },
	{ target: "mspdPct", op: "/", a: "mspd", b: 100 },
	{ target: "rawRate", op: "-", a: 1, b: "mspdPct" },
	{ target: "rate", op: "max", a: 0.5, b: "rawRate" },
];

export const BuiltInBinaryOpPipelines: Record<string, readonly PipelineInstruction[]> = {
	// 前摇：variant.startupFrames 为单一公式，整段受行动速度影响。
	// 输入：input.original（由 FSM 预求值）
	"skill.startup": [
		...mspdRateInstructions,
		{ target: "rawFrames", op: "*", a: "input.original", b: "rate" },
		{ target: "frames", op: "floor", a: "rawFrames" },
	],

	// 蓄力：reservoirFixed 不受速度影响；reservoirModified 受行动速度修正。
	// 输入：input.fixed, input.modified
	"skill.charging": [
		...mspdRateInstructions,
		{ target: "adj", op: "*", a: "input.modified", b: "rate" },
		{ target: "rawFrames", op: "+", a: "input.fixed", b: "adj" },
		{ target: "frames", op: "floor", a: "rawFrames" },
	],

	// 咏唱：chantingFixed 不受速度影响；chantingModified 受行动速度修正。
	// 输入：input.fixed, input.modified
	"skill.chanting": [
		...mspdRateInstructions,
		{ target: "adj", op: "*", a: "input.modified", b: "rate" },
		{ target: "rawFrames", op: "+", a: "input.fixed", b: "adj" },
		{ target: "frames", op: "floor", a: "rawFrames" },
	],

	// 发动（motion）：motionFixed 不受速度影响；motionModified 受行动速度修正。
	// 输入：input.fixed, input.modified
	"skill.action": [
		...mspdRateInstructions,
		{ target: "adj", op: "*", a: "input.modified", b: "rate" },
		{ target: "rawFrames", op: "+", a: "input.fixed", b: "adj" },
		{ target: "frames", op: "floor", a: "rawFrames" },
	],

	"status.apply": [
		// baseDuration = input.baseDurationFrames
		{ target: "baseDuration", op: "+", a: "input.baseDurationFrames", b: 0 },
		// durationRate = get(self, "status.{statusType}.durationRate")
		{ target: "durationRate", op: "get", a: "self", b: "status.{statusType}.durationRate" },
		// resolved = baseDuration * durationRate / 100
		{ target: "resolved0", op: "*", a: "baseDuration", b: "durationRate" },
		{ target: "resolved1", op: "/", a: "resolved0", b: 100 },
		{ target: "resolved", op: "floor", a: "resolved1" },
		// appliedAt = env.frame
		{ target: "appliedAt", op: "+", a: "env.frame", b: 0 },
		// expiresAt = appliedAt + resolved
		{ target: "expiresAt", op: "+", a: "appliedAt", b: "resolved" },
	],

	"damage.physical": [
		// lvDiff = get(self,"lv") - get(target,"lv")
		{ target: "selfLv", op: "get", a: "self", b: "lv" },
		{ target: "targetLv", op: "get", a: "target", b: "lv" },
		{ target: "lvDiff", op: "-", a: "selfLv", b: "targetLv" },
		// rawAtk = lvDiff + get(self,"atk.p")
		{ target: "atkP", op: "get", a: "self", b: "atk.p" },
		{ target: "rawAtk", op: "+", a: "lvDiff", b: "atkP" },
		// redRate = 1 - get(target,"red.p")
		{ target: "redP", op: "get", a: "target", b: "red.p" },
		{ target: "redRate", op: "-", a: 1, b: "redP" },
		// reduced = rawAtk * redRate
		{ target: "reduced", op: "*", a: "rawAtk", b: "redRate" },
		// pieRate = 1 - get(self,"pie.p")
		{ target: "pieP", op: "get", a: "self", b: "pie.p" },
		{ target: "pieRate", op: "-", a: 1, b: "pieP" },
		// defVal = pieRate * get(target,"def.p")
		{ target: "defP", op: "get", a: "target", b: "def.p" },
		{ target: "defVal", op: "*", a: "pieRate", b: "defP" },
		// result = reduced - defVal
		{ target: "result", op: "-", a: "reduced", b: "defVal" },
	],

	// ======================================================================
	// 命中判定（hitCheck）
	// ======================================================================
	// 只产出命中率（0~100 百分比）。FSM 负责根据该值做随机投掷得到 0/1 命中标志，以保持
	// 管线纯函数性。
	//
	// 输入（params）：
	//  - input.isMagical：1 = 魔法攻击（必命中），0 = 物理攻击。
	//  - input.casterHit：施法者侧命中值快照（来自 casterSnapshot.hit）。
	//  - input.skillMpCost：技能实际蓝耗，服务于 skillHitRate 加成。
	//
	// 阶段 anchor（供 overlay 精准挂载）：
	//  targetAvoid        → 受击者回避值
	//  baseHitRate        → 基础命中率 = clamp(100 - (targetAvoid - casterHit)/3, 0, 100)
	//  skillBonus         → 技能蓝耗加成 = skillMpCost / 10
	//  skillHitRate       → baseHitRate + skillBonus
	//  statusHitModifier  → 异常状态修正（overlay 锚点，默认 0；盲目/混乱等在此加负值）
	//  physicalHitRate    → skillHitRate + statusHitModifier（物理路径最终命中率）
	//  hitRate            → 分支选择：isMagical ? 100 : physicalHitRate，clamp 到 [0,100]
	hitCheck: [
		{ target: "targetAvoid", op: "get", a: "self", b: "avoid" },
		{ target: "avoidDelta", op: "-", a: "targetAvoid", b: "input.casterHit" },
		{ target: "avoidPenalty", op: "/", a: "avoidDelta", b: 3 },
		{ target: "rawBaseHit", op: "-", a: 100, b: "avoidPenalty" },
		{ target: "baseHitRate", op: "clamp", a: "rawBaseHit", b: "0,100" },

		{ target: "skillBonus", op: "/", a: "input.skillMpCost", b: 10 },
		{ target: "skillHitRate", op: "+", a: "baseHitRate", b: "skillBonus" },

		// 异常状态修正锚点（盲目/混乱等 overlay 在此挂减值；强化类挂正值）
		{ target: "statusHitModifier", op: "+", a: 0, b: 0 },
		{ target: "physicalHitRate", op: "+", a: "skillHitRate", b: "statusHitModifier" },

		// 魔法路径必命中；clamp 兜底
		{ target: "magicalRate", op: "*", a: "input.isMagical", b: 100 },
		{ target: "notMagical", op: "-", a: 1, b: "input.isMagical" },
		{ target: "physicalContribution", op: "*", a: "notMagical", b: "physicalHitRate" },
		{ target: "rawHitRate", op: "+", a: "magicalRate", b: "physicalContribution" },
		{ target: "hitRate", op: "clamp", a: "rawHitRate", b: "0,100" },
	],

	// ======================================================================
	// 伤害计算（damageCalc）
	// ======================================================================
	// 接在 hitCheck 之后、FSM 确认命中的基础上计算最终伤害数值。
	//
	// 输入：
	//  - input.baseDamage：施法者侧求值后的原始伤害。
	//  - input.damageTags / warningZone / direction / skillLv：归因信息（overlay 条件依据）。
	//
	// 阶段 anchor（供 overlay 精准挂载）：
	//  invincible           → 无敌判定（0/1，默认 0；"系统无敌"类 status 对应 overlay 改写为 1）
	//  baseDamage           → 基础伤害（默认取 input.baseDamage）
	//  crit                 → 暴击判定（默认 0）
	//  blocked              → 格挡判定（默认 0）
	//  blockReduction       → 格挡减伤量（默认 0）
	//  baseDamageReduction  → 通用减伤汇总锚点（红/蓝区、殿后、浴血奋战、弧光减伤 等 hook 首选挂点）
	//  damage               → 减伤后中间值
	//  finalDamage          → 最终伤害输出（领教领教 clamp 到 target.hp.max*1%）
	//  isFatal              → 致死预判（最后的抵抗 overlay 在此之前拦截）
	damageCalc: [
		{ target: "selfHp", op: "get", a: "self", b: "hp.current" },

		{ target: "invincible", op: "+", a: 0, b: 0 },
		{ target: "baseDamage", op: "+", a: "input.baseDamage", b: 0 },
		{ target: "crit", op: "+", a: 0, b: 0 },
		{ target: "blocked", op: "+", a: 0, b: 0 },
		{ target: "blockReduction", op: "+", a: 0, b: 0 },
		{ target: "baseDamageReduction", op: "+", a: 0, b: 0 },

		// damage = max(0, (baseDamage - baseDamageReduction) - blockReduction) * (1 - invincible)
		{ target: "afterReduction", op: "-", a: "baseDamage", b: "baseDamageReduction" },
		{ target: "afterBlock", op: "-", a: "afterReduction", b: "blockReduction" },
		{ target: "clampedDamage", op: "max", a: 0, b: "afterBlock" },
		{ target: "notInv", op: "-", a: 1, b: "invincible" },
		{ target: "damage", op: "*", a: "clampedDamage", b: "notInv" },

		{ target: "finalDamage", op: "+", a: "damage", b: 0 },

		// 致死预判（最后的抵抗 overlay 在 finalDamage 锚点之后、applyDamage 之前改写）
		{ target: "hpAfterHit", op: "-", a: "selfHp", b: "finalDamage" },
		{ target: "isFatal", op: "<=", a: "hpAfterHit", b: 0 },
	],

	// ======================================================================
	// 伤害应用（applyDamage）
	// ======================================================================
	// 纯计算：给出 hpAfter / mpAfter，由 FSM 负责写回 StatContainer。
	// 致死拦截类（"最后的抵抗"等）overlay 在此管线前半（damage 锚点）挂条件覆写。
	//
	// 输入：
	//  - input.finalDamage：damageCalc 输出
	//  - input.mpCost：可选（百分比攻击等场景附带 MP 损失）
	applyDamage: [
		{ target: "hpBefore", op: "get", a: "self", b: "hp.current" },
		{ target: "mpBefore", op: "get", a: "self", b: "mp.current" },

		// 损失累积锚点。overlay（最后的抵抗等）在此 target 之后插 select 做改写。
		{ target: "damage", op: "+", a: "input.finalDamage", b: 0 },
		{ target: "mpDelta", op: "+", a: "input.mpCost", b: 0 },

		{ target: "rawHpAfter", op: "-", a: "hpBefore", b: "damage" },
		{ target: "hpAfter", op: "max", a: 0, b: "rawHpAfter" },
		{ target: "rawMpAfter", op: "-", a: "mpBefore", b: "mpDelta" },
		{ target: "mpAfter", op: "max", a: 0, b: "rawMpAfter" },

		{ target: "died", op: "<=", a: "hpAfter", b: 0 },
	],

	// ======================================================================
	// 异常施加（statusResist）
	// ======================================================================
	// 由受击 FSM 在"进行控制判定"阶段调用，针对单个候选异常类型输出是否施加成功。
	//
	// 输入：
	//  - input.statusType：候选异常类型字符串
	//  - input.baseProbability：施加基础概率（0~1）
	//
	// 阶段 anchor：
	//  targetResistance → 目标抗性（从 target / self 的 status.<type>.resistance 读取，默认 0）
	//  appliedProbability → 最终施加概率
	//  applied → 0/1
	statusResist: [
		// 当前仅骨架：抗性置 0，概率=基础概率。精细化时改为按 statusType 读取抗性。
		{ target: "targetResistance", op: "+", a: 0, b: 0 },
		{ target: "resistRate", op: "-", a: 1, b: "targetResistance" },
		{ target: "appliedProbability", op: "*", a: "input.baseProbability", b: "resistRate" },
		// 随机判定暂不做（管线应保持纯函数），由 FSM 侧结合当前帧随机源决定。
		// 骨架直接将概率截断到 [0,1]，供 FSM 自行投掷。
		{ target: "applied", op: "clamp", a: "appliedProbability", b: "0,1" },
	],
} as const;
