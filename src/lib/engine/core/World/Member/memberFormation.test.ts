import assert from "node:assert/strict";
import { test } from "node:test";
import { computeMemberFormation, type FormationTeam } from "./memberFormation";

// 唯一 id 队伍工厂：给定前缀与成员数，生成不重名成员。
const teamN = (prefix: string, count: number): FormationTeam => ({
	members: Array.from({ length: count }, (_, i) => ({ id: `${prefix}_${i}`, sequence: i })),
});

const dist = (p: { x: number; z: number }) => Math.hypot(p.x, p.z);
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

test("单队伍单成员：内圈居中于原点，朝 +Z(yaw=0)", () => {
	const f = computeMemberFormation([teamN("A", 1)], [teamN("B0", 1), teamN("B1", 1)]);
	const pose = f.get("A_0")!;
	assert.ok(near(pose.position.x, 0) && near(pose.position.z, 0));
	assert.ok(near(pose.yaw, 0));
});

test("内圈选择：队伍少者为内圈(居中)", () => {
	// campA 1 队，campB 2 队 → A 内圈，单成员在原点
	const f = computeMemberFormation([teamN("A", 1)], [teamN("B0", 1), teamN("B1", 1)]);
	assert.ok(near(dist(f.get("A_0")!.position), 0), "A 的单成员应在原点");
});

test("队伍数相等时按成员总数选内圈", () => {
	// 两边各 1 队，A 1 人 B 3 人 → A 内圈居中
	const f = computeMemberFormation([teamN("A", 1)], [teamN("B", 3)]);
	assert.ok(near(dist(f.get("A_0")!.position), 0), "A 的单成员应在原点");
});

test("外圈成员一律朝内(yaw=θ+π，指向原点)", () => {
	// 内圈 campA 1 队(居中)，外圈 campB 2 队各 1 人，唯一 id。
	const f = computeMemberFormation([teamN("A", 1)], [teamN("B0", 1), teamN("B1", 1)]);
	for (const [id, pose] of f) {
		if (id.startsWith("A") || near(dist(pose.position), 0)) continue;
		const len = dist(pose.position);
		// 朝向向量(sin yaw, cos yaw)应与"成员→原点"单位向量(-x/len,-z/len)同向。
		assert.ok(near(Math.sin(pose.yaw), -pose.position.x / len, 1e-3), `${id} 朝向 x`);
		assert.ok(near(Math.cos(pose.yaw), -pose.position.z / len, 1e-3), `${id} 朝向 z`);
	}
});

test("所有成员都被分配到位姿", () => {
	const f = computeMemberFormation([teamN("A0", 2), teamN("A1", 1)], [teamN("B", 4)]);
	assert.equal(f.size, 7);
});

test("外圈半径大于内圈，避免重叠", () => {
	// campA 1 队(内圈) vs campB 3 队(外圈)。
	const innerIds = ["A_0", "A_1", "A_2", "A_3"];
	const f = computeMemberFormation([teamN("A", 4)], [teamN("B0", 1), teamN("B1", 1), teamN("B2", 1)]);
	const innerMax = Math.max(...innerIds.map((id) => dist(f.get(id)!.position)));
	for (const [id, pose] of f) {
		if (innerIds.includes(id)) continue;
		assert.ok(dist(pose.position) > innerMax, `外圈成员 ${id} 应在内圈外`);
	}
});

test("多队伍内圈：N=4 队锚点每 90° 分布", () => {
	// campA 4 队(内圈，每队 1 人) vs campB 5 队(外圈)。
	const f = computeMemberFormation(
		[teamN("A0", 1), teamN("A1", 1), teamN("A2", 1), teamN("A3", 1)],
		[teamN("B0", 1), teamN("B1", 1), teamN("B2", 1), teamN("B3", 1), teamN("B4", 1)],
	);
	// 4 个内圈成员(每队 1 人→锚点即成员)应在同一半径、彼此夹角 90°。
	const innerPoses = ["A0_0", "A1_0", "A2_0", "A3_0"].map((id) => f.get(id)!);
	const radii = innerPoses.map((p) => dist(p.position));
	for (const r of radii) assert.ok(near(r, radii[0], 1e-6), "内圈锚点同半径");
	const angles = innerPoses.map((p) => Math.atan2(p.position.x, p.position.z)).sort((a, b) => a - b);
	for (let i = 1; i < angles.length; i++) {
		assert.ok(near(angles[i] - angles[i - 1], Math.PI / 2, 1e-3), "相邻锚点夹角 90°");
	}
});
