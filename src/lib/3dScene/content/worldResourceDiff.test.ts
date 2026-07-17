import { describe, expect, it } from "vitest";
import type { MobWorldResource } from "../contracts/worldResource";
import { createDefaultCharacterWorldResource } from "../resources/defaultCharacterResource";
import { canReuseWorldResource } from "./worldResourceDiff";

const characterResource = createDefaultCharacterWorldResource({
	memberId: "member-1",
	resourceId: "character-1",
	displayName: "Character",
});

const mobResource: MobWorldResource = {
	memberId: "member-1",
	resourceId: "mob-1",
	displayName: "Mob",
	kind: "mob",
	model: { type: "primitive", shape: "sphere" },
	appearance: { radius: 1, color: "#ffffff" },
	animation: null,
};

describe("canReuseWorldResource", () => {
	it("完整静态资源相同时允许沿用实体", () => {
		expect(canReuseWorldResource(characterResource, structuredClone(characterResource))).toBe(true);
		expect(canReuseWorldResource(mobResource, structuredClone(mobResource))).toBe(true);
	});

	it("角色身份、名称、模型、缩放或动画映射变化时要求替换", () => {
		expect(canReuseWorldResource(characterResource, { ...characterResource, resourceId: "character-2" })).toBe(false);
		expect(canReuseWorldResource(characterResource, { ...characterResource, displayName: "Renamed" })).toBe(false);
		expect(
			canReuseWorldResource(characterResource, {
				...characterResource,
				model: { ...characterResource.model, uri: "/models/other.glb" },
			}),
		).toBe(false);
		expect(
			canReuseWorldResource(characterResource, {
				...characterResource,
				appearance: { scale: 2 },
			}),
		).toBe(false);
		expect(
			canReuseWorldResource(characterResource, {
				...characterResource,
				animation: {
					...characterResource.animation,
					clips: { ...characterResource.animation.clips, idle: "other-idle" },
				},
			}),
		).toBe(false);
	});

	it("资源种类或 Mob 外观变化时要求替换", () => {
		expect(canReuseWorldResource(characterResource, mobResource)).toBe(false);
		expect(
			canReuseWorldResource(mobResource, { ...mobResource, appearance: { ...mobResource.appearance, radius: 2 } }),
		).toBe(false);
		expect(
			canReuseWorldResource(mobResource, {
				...mobResource,
				appearance: { ...mobResource.appearance, color: "#000000" },
			}),
		).toBe(false);
	});
});
