import { describe, expect, it, vi } from "vitest";
import { MemberManager } from "../MemberManager";
import { SpaceManager } from "../SpaceManager";
import { DamageAreaSystem } from "./DamageAreaSystem";
import type { DamageAreaRequest } from "./types";

describe("DamageAreaSystem - 伤害来源透传", () => {
	it("将 member、skill 和 area 身份派发给受击者", () => {
		const memberManager = new MemberManager(null);
		const caster = {
			id: "member-caster",
			campId: "camp-a",
			position: { x: 0, y: 0, z: 0 },
			alive: true,
		};
		const target = {
			id: "member-target",
			campId: "camp-b",
			position: { x: 3, y: 0, z: 0 },
			alive: true,
		};
		vi.spyOn(memberManager, "getMember").mockImplementation((memberId) => {
			// 本测试只验证区域派发契约，DamageAreaSystem 实际只读取 WorldObservable 字段。
			return (memberId === caster.id ? caster : memberId === target.id ? target : null) as never;
		});
		const sendTo = vi.spyOn(memberManager, "sendTo").mockImplementation(() => undefined);
		const system = new DamageAreaSystem(new SpaceManager(memberManager), memberManager);
		const request = {
			identity: {
				sourceId: caster.id,
				sourceSkillId: "skill-magic-arrow",
				sourceCampId: caster.campId,
			},
			lifetime: { startTimeMs: 100, durationMs: 1000 },
			hitPolicy: { hitIntervalMs: 0 },
			attackSemantics: { damageCount: 1 },
			range: { rangeKind: "Single", rangeParams: {} },
			payload: {
				damageFormula: "100",
				casterSnapshot: {},
				skillLv: 10,
				damageTags: ["magical"],
				warningZone: "none",
				lockCasterAttributes: true,
			},
			casterId: caster.id,
			targetId: target.id,
		} satisfies DamageAreaRequest;

		const areaId = system.add(request);
		system.tick({ tickIndex: 1, currentTimeMs: 100, deltaTimeMs: 16 });

		expect(sendTo).toHaveBeenCalledOnce();
		expect(sendTo).toHaveBeenCalledWith(target.id, {
			type: "受到攻击",
			data: {
				damageRequest: expect.objectContaining({
					sourceId: caster.id,
					sourceSkillId: "skill-magic-arrow",
					areaId,
				}),
			},
		});
	});
});
