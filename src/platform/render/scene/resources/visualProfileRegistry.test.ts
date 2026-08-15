import { describe, expect, it } from "vitest";
import { worldStateStringId } from "~/engine/core/thread/worldStateBuffer";
import type { WorldResource } from "../contracts/worldResource";
import { createDefaultCharacterWorldResource } from "./defaultCharacterResource";
import { VisualProfileRegistry } from "./visualProfileRegistry";

describe("VisualProfileRegistry", () => {
	it("为多个同类型成员注册独立稳定 profile，且不回退到其他成员资源", () => {
		const first = createDefaultCharacterWorldResource({
			memberId: "member-a",
			resourceId: "character-a",
			displayName: "A",
		});
		const second = createDefaultCharacterWorldResource({
			memberId: "member-b",
			resourceId: "character-b",
			displayName: "B",
		});
		const mob: WorldResource = {
			memberId: "mob-a",
			resourceId: "mob-resource",
			displayName: "Mob",
			kind: "mob",
			model: { type: "primitive", shape: "sphere" },
			appearance: { radius: 1, color: "#ffffff" },
			animation: null,
		};
		const registry = new VisualProfileRegistry();
		registry.register([first, second, mob]);

		expect(registry.get(worldStateStringId("member-a"))?.resource.resourceId).toBe("character-a");
		expect(registry.get(worldStateStringId("member-b"))?.resource.resourceId).toBe("character-b");
		expect(registry.resolve(999_999)).toBeUndefined();
	});

	it("拒绝显式 visualProfileId 冲突", () => {
		const first = {
			...createDefaultCharacterWorldResource({ memberId: "member-a", resourceId: "character-a", displayName: "A" }),
			visualProfileId: 7,
		};
		const second = {
			...createDefaultCharacterWorldResource({ memberId: "member-b", resourceId: "character-b", displayName: "B" }),
			visualProfileId: 7,
		};
		const registry = new VisualProfileRegistry();

		expect(() => registry.register([first, second])).toThrow("visualProfileId 冲突: 7");
	});

	it("显式 profile 同时保留固定成员 ID 的稳定别名", () => {
		const resource = {
			...createDefaultCharacterWorldResource({ memberId: "member-a", resourceId: "character-a", displayName: "A" }),
			visualProfileId: 7,
		};
		const registry = new VisualProfileRegistry();
		registry.register([resource]);

		expect(registry.resolve(7)?.resource).toBe(resource);
		expect(registry.resolve(worldStateStringId("member-a"))?.resource).toBe(resource);
	});
});
