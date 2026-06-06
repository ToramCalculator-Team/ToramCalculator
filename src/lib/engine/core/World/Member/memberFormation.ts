/**
 * 成员初始队形分配（纯函数，唯一真相源）。
 *
 * 引擎层（GameEngine.loadScenario）与渲染层（相机预摆位）共用此函数，
 * 保证两侧对成员初始坐标/朝向的计算完全一致——位置是从队伍结构推导的规则，而非数据。
 *
 * 规格（径向同心对峙）：
 * - 两阵营比较：队伍少者为内圈（队伍数相等比成员总数，再相等取 campA），放在原点附近。
 * - 内圈阵营：队伍锚点绕原点等角分布（1 居中 / 2 背靠背 / 3 每 120° / 4 每 90°），队伍朝外（指向敌方）。
 *   队内成员绕队伍锚点小同心圆分布，朝向与队伍一致。
 * - 外圈阵营（队伍多者）：位置与内圈无关，全部成员在更大同心圆上等角分布，一律朝内（指向原点）。
 * - 半径按数量自适应，保证成员间、队伍簇间不重叠。
 *
 * 坐标系：y=0 为地面；位置 = R·(sin θ, 0, cos θ)；yaw 为绕 Y 轴弧度，
 * yaw=θ 表示朝外（背离原点的径向），yaw=θ+π 表示朝内（指向原点）。
 */

export interface FormationVec3 {
	x: number;
	y: number;
	z: number;
}

export interface FormationPose {
	position: FormationVec3;
	yaw: number;
}

/** 公式只需成员 id 与队内顺序，刻意用最小输入类型，避免耦合庞大的 MemberWithRelations。 */
export interface FormationMember {
	id: string;
	sequence: number;
}

export interface FormationTeam {
	members: FormationMember[];
}

// 具名常量：先跑通，后续可调。
const MEMBER_SPACING = 2.5; // 同一队伍内相邻成员的目标弧间距（世界单位）
const TEAM_GAP = 3.0; // 相邻队伍簇之间的最小空隙
const OUTER_GAP = 4.0; // 外圈阵营与内圈最外缘的最小空隙

const TAU = Math.PI * 2;

/** 位置 = R·(sinθ, 0, cosθ)，从圆心沿角 θ 的径向偏移。 */
function radial(center: FormationVec3, radius: number, theta: number): FormationVec3 {
	return {
		x: center.x + radius * Math.sin(theta),
		y: 0,
		z: center.z + radius * Math.cos(theta),
	};
}

/** 让 K 个点在半径 r 圆上等角分布时，保证相邻点弧间距约为 spacing 所需的最小半径。 */
function radiusForCount(count: number, spacing: number): number {
	if (count <= 1) return 0;
	// 弦长 = 2r·sin(π/K) ≈ spacing → r = spacing / (2 sin(π/K))
	return spacing / (2 * Math.sin(Math.PI / count));
}

function totalMembers(teams: FormationTeam[]): number {
	return teams.reduce((sum, t) => sum + t.members.length, 0);
}

/**
 * 选内圈阵营：队伍少者；队伍数相等比成员总数少者；再相等取 A。
 * 返回 inner/outer 两组队伍。
 */
function pickInnerOuter(
	campA: FormationTeam[],
	campB: FormationTeam[],
): { inner: FormationTeam[]; outer: FormationTeam[]; innerIsA: boolean } {
	if (campA.length !== campB.length) {
		const aInner = campA.length < campB.length;
		return aInner ? { inner: campA, outer: campB, innerIsA: true } : { inner: campB, outer: campA, innerIsA: false };
	}
	const aInner = totalMembers(campA) <= totalMembers(campB);
	return aInner ? { inner: campA, outer: campB, innerIsA: true } : { inner: campB, outer: campA, innerIsA: false };
}

/** 队内成员绕锚点小同心圆分布，朝向与队伍一致（teamYaw）。 */
function placeTeamMembers(team: FormationTeam, anchor: FormationVec3, teamYaw: number, out: Map<string, FormationPose>): void {
	const ordered = [...team.members].sort((a, b) => a.sequence - b.sequence);
	const m = ordered.length;
	if (m === 0) return;
	if (m === 1) {
		out.set(ordered[0].id, { position: { ...anchor }, yaw: teamYaw });
		return;
	}
	const r = radiusForCount(m, MEMBER_SPACING);
	ordered.forEach((member, i) => {
		const theta = i * (TAU / m);
		out.set(member.id, { position: radial(anchor, r, theta), yaw: teamYaw });
	});
}

/** 单个队伍簇占据的半径（锚点到最外成员）。 */
function teamClusterRadius(team: FormationTeam): number {
	return radiusForCount(team.members.length, MEMBER_SPACING);
}

/**
 * 内圈阵营：队伍锚点绕原点等角分布，朝外（yaw=θ，背离原点指向敌方）。
 * 返回内圈占据的最大半径（供外圈避让）。
 */
function placeInnerCamp(inner: FormationTeam[], origin: FormationVec3, out: Map<string, FormationPose>): number {
	const n = inner.length;
	if (n === 0) return 0;
	if (n === 1) {
		// 队伍居中：锚点在原点，朝 +Z（yaw=0）指向敌方。
		placeTeamMembers(inner[0], origin, 0, out);
		return teamClusterRadius(inner[0]);
	}
	// 多队伍：锚点在 R_team 圆上等角分布，需容纳最大队伍簇且簇间留 TEAM_GAP。
	const maxCluster = Math.max(...inner.map(teamClusterRadius));
	const rTeam = Math.max(maxCluster, (maxCluster * 2 + TEAM_GAP) / (2 * Math.sin(Math.PI / n)));
	let maxReach = 0;
	inner.forEach((team, i) => {
		const theta = i * (TAU / n);
		const anchor = radial(origin, rTeam, theta);
		placeTeamMembers(team, anchor, theta, out); // 朝外
		maxReach = Math.max(maxReach, rTeam + teamClusterRadius(team));
	});
	return maxReach;
}

/**
 * 外圈阵营：位置与内圈无关，全部成员（team→sequence 排序）在更大同心圆上等角分布，
 * 一律朝内（yaw=θ+π，指向原点）。
 */
function placeOuterCamp(outer: FormationTeam[], origin: FormationVec3, innerReach: number, out: Map<string, FormationPose>): void {
	const flat: FormationMember[] = [];
	for (const team of outer) {
		for (const member of [...team.members].sort((a, b) => a.sequence - b.sequence)) flat.push(member);
	}
	const k = flat.length;
	if (k === 0) return;
	// 半径既要避开内圈，又要让 k 个成员等角分布时间距约为 MEMBER_SPACING。
	const rByCount = radiusForCount(k, MEMBER_SPACING);
	const rOuter = Math.max(innerReach + OUTER_GAP, rByCount);
	if (k === 1) {
		// 单一成员：放在 +Z 外圈，朝内。
		out.set(flat[0].id, { position: radial(origin, rOuter, 0), yaw: Math.PI });
		return;
	}
	flat.forEach((member, i) => {
		const theta = i * (TAU / k);
		out.set(member.id, { position: radial(origin, rOuter, theta), yaw: theta + Math.PI });
	});
}

/**
 * 计算全部成员的初始位姿。
 * @returns Map<memberId, { position, yaw }>
 */
export function computeMemberFormation(
	campA: FormationTeam[],
	campB: FormationTeam[],
): Map<string, FormationPose> {
	const out = new Map<string, FormationPose>();
	const origin: FormationVec3 = { x: 0, y: 0, z: 0 };
	const { inner, outer } = pickInnerOuter(campA, campB);
	const innerReach = placeInnerCamp(inner, origin, out);
	placeOuterCamp(outer, origin, innerReach, out);
	return out;
}
