
import type { AnyMemberEntry, MemberManager } from "../Member/MemberManager";
import type { Vec3 } from "./types";

/**
 * 计算两点之间的距离
 */
function distance(a: Vec3, b: Vec3): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	const dz = a.z - b.z;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * SpaceManager
 * 最小化空间查询实现，后续可替换为网格/八叉树等索引
 */
export class SpaceManager {
	constructor(private readonly memberManager: MemberManager) {}

	/**
	 * 查询圆形范围内的成员和区域
	 * @param center 中心点
	 * @param radius 半径
	 * @returns 范围内的成员和区域
	 */
	queryCircle<T = AnyMemberEntry>(
		center: { x: number; y: number; z: number },
		radius: number,
	): {
		members: T[];
		areas: T[];
	} {
		// 获取所有成员
		const allMembers = this.memberManager.getAllMembers();

		// 过滤出在范围内的成员
		const membersInRange = allMembers.filter((member) => {
			const dist = distance(center, member.position);
			return dist <= radius;
		}) as T[];

		return {
			members: membersInRange,
			areas: [], // 区域查询暂未实现
		};
	}
}

