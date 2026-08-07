import type { MemberType } from "@db/schema/enums";
import type { Vec3 } from "./Area/types";

/**
 * WorldObservable —— 世界实体的统一只读观测接口
 *
 * 设计动机（见 document/world-medium-analysis.tmp.md 偏差#1）：
 * - 介质（SpaceManager 等空间查询）是“无属性状态的关系整合服务”，在 settle 相位
 *   现场读取实体关系，不缓存影子、不持有实体属性。
 * - 此前 `queryCircle` 直接返回富类 `Member`，使调用方耦合到 Member 内部实现，
 *   且投射物 / 墙体等非 Member 实体无法进入同一查询。
 * - 收敛到本只读接口后，介质只认接口、不认具体类；任何世界实体（Member、未来的
 *   投射物 / 区域实体）只要实现本接口即可被空间查询统一观测。
 *
 * 约束：
 * - 全部为只读访问器（readonly），观测方不得通过本接口修改实体状态。
 * - 字段语义保持“当前帧现场读取”，不承诺跨帧一致性（介质不缓存）。
 */
export interface WorldObservable {
	/** 实体唯一 ID */
	readonly id: string;
	/** 实体类型（Player / Mob / 未来的投射物等） */
	readonly type: MemberType;
	/** 阵营 ID（敌我关系判定依据） */
	readonly campId: string;
	/** 队伍 ID */
	readonly teamId: string;
	/** 当前世界坐标 */
	readonly position: Vec3;
	/**
	 * 权威存活标志。
	 *
	 * 语义：实体是否处于“可被作用”的存活态。由实现方给出权威判定——
	 * 对 Member 而言绑定 FSM 死亡状态（非单纯 `hp.current > 0`），
	 * 避免散落在各处的 `hp.current > 0` 内联 guard 各执一词。
	 */
	readonly alive: boolean;
	/**
	 * 碰撞半径（占位）。
	 *
	 * 预留给切片 4（碰撞取代 startTimeMs 延迟 / 投射物命中）。
	 * 当前实现统一返回 0，调用方暂不应依赖其具体数值。
	 * TODO(切片4): 由实体几何配置驱动真实碰撞半径。
	 */
	readonly collisionRadius: number;
}
