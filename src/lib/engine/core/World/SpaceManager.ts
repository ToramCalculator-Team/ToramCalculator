import type { Vec3 } from "./Area/types";
import type { MemberManager } from "./MemberManager";
import type { WorldObservable } from "./observable";

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
 * 圆形查询的可选过滤条件。
 *
 * 设计说明：把 camp / alive 这类“关系判定”就地下沉到介质，
 * 让调用方拿到的已是筛过的只读视图，避免调用方为了过滤而重新触碰富类。
 */
export interface QueryCircleOptions {
	/** 仅返回存活实体（基于 WorldObservable.alive 权威字段） */
	readonly aliveOnly?: boolean;
	/** 自定义过滤谓词，作用于只读视图 */
	readonly filter?: (observable: WorldObservable) => boolean;
}

/**
 * SpaceManager
 * 最小化空间查询实现，后续可替换为网格/八叉树等索引
 */
export class SpaceManager {
	constructor(private readonly memberManager: MemberManager) {}

	/**
	 * 查询圆形范围内的世界实体（只读视图）
	 *
	 * 设计说明（偏差#1 收敛）：
	 * - 返回统一只读接口 `WorldObservable`，不再暴露富类 `Member`，
	 *   调用方据此判定敌我（campId）、存活（alive）、几何（position）即可。
	 * - 暂只查询成员；投射物 / 区域实体等非 Member 实体接入后将经同一接口纳入。
	 *
	 * @param center 中心点
	 * @param radius 半径
	 * @param opts 可选过滤条件（camp/alive 等关系判定就地下沉）
	 * @returns 范围内的世界实体只读视图列表
	 */
	queryCircle(
		center: { x: number; y: number; z: number },
		radius: number,
		opts?: QueryCircleOptions,
	): {
		members: WorldObservable[];
	} {
		// 获取所有成员。Member 已实现 WorldObservable，这里按接口收窄读取面。
		const allMembers: WorldObservable[] = this.memberManager.getAllMembers();

		// 过滤出在范围内、并满足可选关系条件的实体
		const membersInRange = allMembers.filter((member) => {
			if (distance(center, member.position) > radius) return false;
			if (opts?.aliveOnly && !member.alive) return false;
			if (opts?.filter && !opts.filter(member)) return false;
			return true;
		});

		return {
			members: membersInRange,
		};
	}
}
