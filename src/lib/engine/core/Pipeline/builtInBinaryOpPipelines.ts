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
} as const;
