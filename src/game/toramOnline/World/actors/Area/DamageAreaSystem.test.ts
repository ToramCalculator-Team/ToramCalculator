import { describe, expect, it, vi } from "vitest";
import { MemberManager } from "../MemberManager";
import { SpaceManager } from "../SpaceManager";
import { DamageAreaSystem } from "./DamageAreaSystem";
import { type DamageAreaSpec, WORLD_AREA_CAPACITY, WORLD_AREA_CAPACITY_EXCEEDED_CODE } from "./types";

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

function createMembers() {
	const caster = { id: "member-caster", campId: "camp-a", position: { x: 0, y: 0, z: 0 }, alive: true };
	const target = { id: "member-target", campId: "camp-b", position: { x: 3, y: 0, z: 0 }, alive: true };
	const memberManager = new MemberManager();
	vi.spyOn(memberManager, "getAllMembers").mockReturnValue([caster, target] as never);
	vi.spyOn(memberManager, "getMember").mockImplementation((memberId) => {
		return (memberId === caster.id ? caster : memberId === target.id ? target : null) as never;
	});
	return memberManager;
}

function createSpec(over: Partial<DamageAreaSpec> = {}): DamageAreaSpec {
	return {
		identity: {
			sourceId: caster.id,
			sourceSkillId: "skill-magic-arrow",
			sourceCampId: caster.campId,
			sourceTeamId: "team-a",
		},
		attackSemantics: { damageCount: 1, damageIntervalMs: 0 },
		payload: {
			damageFormula: "100",
			casterSnapshot: {},
			skillLv: 10,
			damageTags: ["magical"],
			lockCasterAttributes: true,
		},
		targetId: target.id,
		rangeKind: "GroundFixed",
		range: {
			shape: { kind: "circle", radius: 1 },
			anchor: { kind: "target" },
			yaw: 0,
		},
		lifetime: { startTimeMs: 100, durationMs: 1000 },
		hitPolicy: { hitIntervalMs: 0 },
		...over,
	};
}

describe("DamageAreaSystem", () => {
	it("只为真正持续区域注册实例，并显式派发 area 来源", () => {
		const memberManager = createMembers();
		const sendTo = vi.spyOn(memberManager, "sendTo").mockImplementation(() => undefined);
		const system = new DamageAreaSystem(new SpaceManager(memberManager), memberManager);
		const areaId = system.createDamageArea(createSpec());

		system.tick({ tickIndex: 1, currentTimeMs: 100, deltaTimeMs: 16 });

		expect(sendTo).toHaveBeenCalledOnce();
		expect(sendTo).toHaveBeenCalledWith(target.id, {
			type: "受到攻击",
			data: {
				damageRequest: expect.objectContaining({
					sourceId: caster.id,
					sourceSkillId: "skill-magic-arrow",
					sourceTeamId: "team-a",
					origin: { kind: "area", areaId },
				}),
			},
		});
	});

	it("容量超限时使用稳定诊断码拒绝创建", () => {
		const memberManager = createMembers();
		const system = new DamageAreaSystem(new SpaceManager(memberManager), memberManager);
		const spec = createSpec();

		for (let index = 0; index < WORLD_AREA_CAPACITY; index++) system.createDamageArea(spec);
		expect(() => system.createDamageArea(spec)).toThrow(WORLD_AREA_CAPACITY_EXCEEDED_CODE);
	});

	it("静止区域要求正数 durationMs，并导出解析后的矩形范围", () => {
		const memberManager = createMembers();
		const system = new DamageAreaSystem(new SpaceManager(memberManager), memberManager);
		const areaId = system.createDamageArea(
			createSpec({
				rangeKind: "Line",
				range: {
					shape: { kind: "rect", width: 3, height: "sourceToTarget" },
					anchor: { kind: "betweenSourceAndTarget" },
					yaw: "sourceToTarget",
				},
				lifetime: { startTimeMs: 100, durationMs: 16 },
			}),
		);

		expect(system.getAreaSnapshot(100)).toMatchObject([
			{
				id: areaId,
				rangeKind: "Line",
				position: { x: 1.5, y: 0, z: 0 },
				shape: { kind: "rect", width: 3, height: 3 },
			},
		]);
		expect(() => system.createDamageArea(createSpec({ lifetime: { startTimeMs: 0, durationMs: 0 } }))).toThrow(
			"durationMs",
		);
	});

	it("移动区域生命周期由轨迹长度和速度推导", () => {
		const memberManager = createMembers();
		const spaceManager = new SpaceManager(memberManager);
		const queryCircle = vi
			.spyOn(spaceManager, "queryCircle")
			.mockImplementation((center) => ({ members: center.x >= target.position.x ? [target] : [] }) as never);
		const sendTo = vi.spyOn(memberManager, "sendTo").mockImplementation(() => undefined);
		const system = new DamageAreaSystem(spaceManager, memberManager);

		system.createDamageArea(
			createSpec({
				rangeKind: "Bullet",
				range: {
					shape: { kind: "circle", radius: 0.5 },
					anchor: { kind: "caster" },
					yaw: "sourceToTarget",
					trajectory: {
						kind: "segment",
						from: { kind: "caster" },
						to: { kind: "target" },
						speed: 10,
					},
				},
				lifetime: { startTimeMs: 100, durationMs: 5000 },
			}),
		);

		expect(system.getAreaSnapshot(399)).toHaveLength(1);
		expect(system.getAreaSnapshot(400)).toHaveLength(0);
		system.tick({ tickIndex: 1, currentTimeMs: 401, deltaTimeMs: 16 });

		expect(queryCircle).toHaveBeenCalled();
		expect(sendTo).toHaveBeenCalledOnce();
		expect(system.getAreaSnapshot(401)).toHaveLength(0);
	});

	it("每个目标维护独立命中时间轴", () => {
		const memberManager = createMembers();
		const sendTo = vi.spyOn(memberManager, "sendTo").mockImplementation(() => undefined);
		const system = new DamageAreaSystem(new SpaceManager(memberManager), memberManager);
		system.createDamageArea(
			createSpec({
				attackSemantics: { damageCount: 2, damageIntervalMs: 0 },
				hitPolicy: { hitIntervalMs: 500 },
			}),
		);

		system.tick({ tickIndex: 1, currentTimeMs: 100, deltaTimeMs: 100 });
		system.tick({ tickIndex: 2, currentTimeMs: 200, deltaTimeMs: 100 });
		system.tick({ tickIndex: 3, currentTimeMs: 600, deltaTimeMs: 400 });

		expect(sendTo).toHaveBeenCalledTimes(2);
		expect(
			sendTo.mock.calls.map(
				([, event]) => (event as { data: { damageRequest: { damageIndex: number } } }).data.damageRequest.damageIndex,
			),
		).toEqual([0, 1]);
	});

	it("checkpoint 恢复使用创建时解析的范围和生命周期", () => {
		const memberManager = createMembers();
		const system = new DamageAreaSystem(new SpaceManager(memberManager), memberManager);
		system.createDamageArea(createSpec());
		const checkpoint = system.captureCheckpoint();
		const targetMember = memberManager.getMember(target.id);
		if (!targetMember) throw new Error("测试目标不存在");
		targetMember.position.x = 20;

		system.restoreCheckpoint(checkpoint);
		expect(system.getAreaSnapshot(100)[0]?.position).toEqual({ x: 3, y: 0, z: 0 });
	});

	it("checkpoint 恢复不会按成员新位置重算已锁定轨迹", () => {
		const memberManager = createMembers();
		const system = new DamageAreaSystem(new SpaceManager(memberManager), memberManager);
		system.createDamageArea(
			createSpec({
				rangeKind: "Bullet",
				range: {
					shape: { kind: "circle", radius: 0.5 },
					anchor: { kind: "caster" },
					yaw: "sourceToTarget",
					trajectory: {
						kind: "segment",
						from: { kind: "caster" },
						to: { kind: "target" },
						speed: 10,
					},
				},
			}),
		);
		const checkpoint = system.captureCheckpoint();
		const targetMember = memberManager.getMember(target.id);
		if (!targetMember) throw new Error("测试目标不存在");
		targetMember.position.x = 20;

		system.restoreCheckpoint(checkpoint);
		expect(system.getAreaSnapshot(100)[0]?.trajectory).toMatchObject({
			kind: "segment",
			from: { x: 0, y: 0, z: 0 },
			to: { x: 3, y: 0, z: 0 },
		});
		expect(system.getAreaSnapshot(399)).toHaveLength(1);
		expect(system.getAreaSnapshot(400)).toHaveLength(0);
	});

	it("旧 checkpoint 缺少已解析范围时拒绝恢复", () => {
		const memberManager = createMembers();
		const system = new DamageAreaSystem(new SpaceManager(memberManager), memberManager);
		system.createDamageArea(createSpec());
		const checkpoint = system.captureCheckpoint();
		const entry = checkpoint.instances[0];
		if (!entry) throw new Error("测试 checkpoint 实例不存在");
		Reflect.deleteProperty(entry, "resolvedRange");

		expect(() => system.restoreCheckpoint(checkpoint)).toThrow("checkpoint 缺少已解析范围");
	});

	it("checkpoint 恢复保留每目标命中时间轴", () => {
		const memberManager = createMembers();
		const sendTo = vi.spyOn(memberManager, "sendTo").mockImplementation(() => undefined);
		const system = new DamageAreaSystem(new SpaceManager(memberManager), memberManager);
		system.createDamageArea(
			createSpec({
				attackSemantics: { damageCount: 2, damageIntervalMs: 0 },
				hitPolicy: { hitIntervalMs: 500 },
			}),
		);
		system.tick({ tickIndex: 1, currentTimeMs: 100, deltaTimeMs: 100 });
		system.restoreCheckpoint(system.captureCheckpoint());

		system.tick({ tickIndex: 2, currentTimeMs: 200, deltaTimeMs: 100 });
		system.tick({ tickIndex: 3, currentTimeMs: 600, deltaTimeMs: 400 });
		expect(sendTo).toHaveBeenCalledTimes(2);
	});

	it("attach 轨迹恢复后仍动态读取锚点位置", () => {
		const memberManager = createMembers();
		const spaceManager = new SpaceManager(memberManager);
		const queryCircle = vi.spyOn(spaceManager, "queryCircle").mockReturnValue({ members: [] });
		const system = new DamageAreaSystem(spaceManager, memberManager);
		system.createDamageArea(
			createSpec({
				range: {
					shape: { kind: "circle", radius: 1 },
					anchor: { kind: "target" },
					yaw: 0,
					trajectory: { kind: "attach", anchor: { kind: "target" } },
				},
			}),
		);
		const checkpoint = system.captureCheckpoint();
		const targetMember = memberManager.getMember(target.id);
		if (!targetMember) throw new Error("测试目标不存在");
		targetMember.position.x = 20;
		system.restoreCheckpoint(checkpoint);

		system.tick({ tickIndex: 1, currentTimeMs: 100, deltaTimeMs: 16 });
		expect(queryCircle).toHaveBeenCalledWith({ x: 20, y: 0, z: 0 }, 1, expect.any(Object));
	});
});
