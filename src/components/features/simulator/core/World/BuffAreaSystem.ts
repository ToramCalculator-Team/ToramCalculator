import type { MemberManager } from "../Member/MemberManager";
import type { SpaceManager } from "./SpaceManager";
import type { BuffAreaRequest } from "./types";

/**
 * Buff 区域系统
 * 管理跨帧 Buff 区域实例（光环与 Buff 区域）
 * 当前为空壳实现，后续补充 enter/exit 或持续刷新逻辑
 */
export class BuffAreaSystem {
	constructor(
		private readonly spaceManager: SpaceManager,
		private readonly memberManager: MemberManager,
	) {}

	/**
	 * 添加 Buff 区域
	 */
	add(request: BuffAreaRequest): string {
		// TODO: 实现 Buff 区域添加逻辑
		const areaId = `buff_${Date.now()}`;
		return areaId;
	}

	/**
	 * 移除 Buff 区域
	 */
	remove(areaId: string): void {
		// TODO: 实现 Buff 区域移除逻辑
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
		// TODO: 实现 Buff 区域 tick 逻辑
		// - 计算 insideSet
		// - enter/exit 或持续刷新
		// - 派发 buff 添加/移除事件
	}
}

