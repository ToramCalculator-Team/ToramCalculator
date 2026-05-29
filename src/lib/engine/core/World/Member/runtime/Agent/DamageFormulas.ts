/**
 * 有效攻击力公式常量
 *
 * 这些公式在受击侧结算时展开，依赖 self（施法者快照）和 target（受击者实时属性）。
 * 伤害公式模板：(有效攻击力 + 技能常数) * 技能倍率 / 100
 *
 * 导入脚本和 BT 生成器使用这些常量组装最终 damageFormula 字符串。
 */

/** 物理有效攻击力 */
export const vAtkP = "((self.lv - target.lv + self.atk.p) * (1 - target.red.p) - target.def.p * (1 - self.pie.p))";

/** 魔法有效攻击力 */
export const vAtkM = "((self.lv - target.lv + self.atk.m) * (1 - target.red.m) - target.def.m * (1 - self.pie.m))";

/** 双剑有效攻击力（左右手各一把单手剑） */
export const vAtkDW = "((self.lv - target.lv + self.atk.dw) * (1 - target.red.p) - target.def.p * (1 - self.pie.p))";

/** 巫师有效攻击力（魔導具） */
export const vAtkMD = "((self.lv - target.lv + self.atk.md) * (1 - target.red.m) - target.def.m * (1 - self.pie.m))";

/**
 * 根据 expResolutionType 选择对应的有效攻击力公式
 */
export function getEffectiveAtkFormula(resolutionType: "physical" | "magic" | "normal" | "dualWield" | "magicDevice"): string {
	switch (resolutionType) {
		case "physical":
			return vAtkP;
		case "magic":
			return vAtkM;
		case "dualWield":
			return vAtkDW;
		case "magicDevice":
			return vAtkMD;
		case "normal":
			return vAtkP; // 一般攻击默认走物理公式
	}
}

/**
 * 组装完整伤害公式
 * @param resolutionType 有效攻击力类型
 * @param constant 技能常数表达式（可含 skillLv）
 * @param multiplier 技能倍率表达式（可含 skillLv）
 */
export function buildDamageFormula(resolutionType: "physical" | "magic" | "normal" | "dualWield" | "magicDevice", constant: string, multiplier: string): string {
	const vAtk = getEffectiveAtkFormula(resolutionType);
	return `(${vAtk} + ${constant}) * (${multiplier}) / 100`;
}
