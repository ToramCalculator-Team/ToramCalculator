export type StatusType = string;

export interface StatusInstance {
	id: string;
	type: StatusType;
	sourceId?: string;
	sourceSkillId?: string;
	appliedAtFrame: number;
	resolvedDurationFrames?: number;
	expiresAtFrame?: number;
	stacks?: number;
	tags?: string[];
	meta?: Record<string, unknown>;
}

/**
 * 状态实例仓库接口。
 *
 * 说明：
 * - 这里承载的是“状态实例”，不是成员级 stat。
 * - 第一轮先冻结接口边界，具体实现会在后续状态系统迭代中补上。
 */
export interface StatusInstanceStore {
	list(): StatusInstance[];
	getByType(type: StatusType): StatusInstance[];
	hasStatus(type: StatusType): boolean;
	getStatusRemaining(type: StatusType, currentFrame: number): number | null;
	getStatusTags(currentFrame: number): string[];
}
