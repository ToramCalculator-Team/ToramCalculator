import { describe, expect, it } from "vitest";
import { getMdslProfileConfig } from "./mdslMemberTypeProfiles";

describe("MDSL 行为树能力 profile", () => {
	it.each(["Player", "Mob", "Partner", "Mercenary"] as const)("%s 的控制树包含 Member 公共控制能力", (memberType) => {
		const profile = getMdslProfileConfig(memberType, "control");

		expect(profile.treeKind).toBe("control");
		expect(profile.actionPool).toHaveProperty("selectTarget");
		expect(profile.actionPool).toHaveProperty("castSkill");
		expect(profile.actionPool).toHaveProperty("jump");
		expect(profile.conditionPool).toHaveProperty("isInControlException");
		expect(profile.actionPool).not.toHaveProperty("state");
	});

	it.each([
		"Player",
		"Mob",
		"Partner",
		"Mercenary",
	] as const)("%s 的效果树包含 Member 公共效果能力且不包含控制 action", (memberType) => {
		const profile = getMdslProfileConfig(memberType, "effect");

		expect(profile.treeKind).toBe("effect");
		expect(profile.actionPool).toHaveProperty("state");
		expect(profile.actionPool).toHaveProperty("log");
		expect(profile.conditionPool).toHaveProperty("hasBuff");
		expect(profile.actionPool).not.toHaveProperty("selectTarget");
	});
});
