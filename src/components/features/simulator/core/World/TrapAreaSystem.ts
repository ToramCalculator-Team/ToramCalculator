import type { MemberManager } from "../Member/MemberManager";
import type { SpaceManager } from "./SpaceManager";
import type { TrapAreaRequest } from "./types";

/**
 * 陷阱区域系统
 * 管理跨帧陷阱区域实例
 * 当前为空壳实现，后续补充触发次数/激活延迟等规则
 */
export class TrapAreaSystem {
	constructor(
		private readonly spaceManager: SpaceManager,
		private readonly memberManager: MemberManager,
	) {}

	/**
	 * 添加陷阱区域
	 */
	add(request: TrapAreaRequest): string {
		// TODO: 实现陷阱区域添加逻辑
		const areaId = `trap_${Date.now()}`;
		return areaId;
	}

	/**
	 * 移除陷阱区域
	 */
	remove(areaId: string): void {
		// TODO: 实现陷阱区域移除逻辑
	}

	/**
	 * 按施法者ID移除所有相关区域
	 */
	removeBySource(sourceId: string): void {
		// TODO: 实现按施法者移除逻辑
	}

	/**
	 * 每帧更新
	 */
	tick(frame: number): void {
		// TODO: 实现陷阱区域 tick 逻辑
		// - 触发检测
		// - 激活延迟
		// - 触发次数限制
	}

	clear(): void {
		// TODO: 实现陷阱区域清理逻辑
	}
}

