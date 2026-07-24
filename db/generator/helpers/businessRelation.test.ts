import { describe, expect, it } from "vitest";
import { classifyBusinessRelation } from "./businessRelation";

describe("classifyBusinessRelation", () => {
	it("通过 belongTo 关系对识别父子方向", () => {
		expect(classifyBusinessRelation("belongToSkill", "variants")).toBe("parent");
		expect(classifyBusinessRelation("variants", "belongToSkill")).toBe("child");
	});

	it("通过 usedBy 关系对识别单向业务依赖", () => {
		expect(classifyBusinessRelation("usedByCharacterSkills", "template")).toBe("parent");
		expect(classifyBusinessRelation("template", "usedByCharacterSkills")).toBe("child");
	});

	it("通过 Owner 后缀识别行为树的父级", () => {
		expect(classifyBusinessRelation("activeOwner", "activeBehaviorTree")).toBe("parent");
		expect(classifyBusinessRelation("activeBehaviorTree", "activeOwner")).toBe("child");
	});

	it("普通引用不进入业务父子层级", () => {
		expect(classifyBusinessRelation("preSkill", "nextSkills")).toBeNull();
	});

	it("拒绝关系两端同时声明为父级", () => {
		expect(() => classifyBusinessRelation("belongToSkill", "usedBySkills")).toThrow("关系两端不能同时声明为业务父级");
	});
});
