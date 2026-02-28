/**
 * 控制器端点接口
 * 用于向控制器发送反馈事件
 */

/**
 * 控制器反馈事件类型
 */
export type ControllerFeedbackEvent =
	| { type: "member_state_changed"; memberId: string; data: unknown }
	| { type: "cast_progress"; memberId: string; progress: number }
	| { type: "move_started"; memberId: string }
	| { type: "move_stopped"; memberId: string }
	| { type: "hit"; memberId: string; damage: number }
	| { type: "died"; memberId: string }
	| { type: "skill_availability_changed"; memberId: string; skillId: string; available: boolean };

/**
 * 控制器端点接口
 */
export interface ControllerEndpoint {
	/**
	 * 发送反馈事件到控制器
	 * @param event 反馈事件
	 */
	send(event: ControllerFeedbackEvent): void;
}

/**
 * 控制器注册表
 * 
 * 职责：仅管理控制器反馈端点（ControllerEndpoint），用于向控制器发送反馈事件
 * 
 * 注意：
 * - 不用于管理"控制器列表"或"绑定关系"
 * - 控制器列表和绑定关系由 ControlBindingManager 管理
 * - 此注册表仅用于 endpoint 的注册/注销，用于反馈事件路由
 */
export class ControllerRegistry {
	/** 端点映射表：controllerId -> ControllerEndpoint */
	private endpoints: Map<string, ControllerEndpoint> = new Map();

	/**
	 * 注册控制器端点
	 * @param controllerId 控制器ID
	 * @param endpoint 控制器端点
	 */
	register(controllerId: string, endpoint: ControllerEndpoint): void {
		this.endpoints.set(controllerId, endpoint);
		console.log(`📝 注册控制器端点: ${controllerId}`);
	}

	/**
	 * 注销控制器端点
	 * @param controllerId 控制器ID
	 */
	unregister(controllerId: string): void {
		if (this.endpoints.delete(controllerId)) {
			console.log(`🗑️ 注销控制器端点: ${controllerId}`);
		}
	}

	/**
	 * 获取控制器端点
	 * @param controllerId 控制器ID
	 * @returns 控制器端点，如果不存在则返回 undefined
	 */
	get(controllerId: string): ControllerEndpoint | undefined {
		return this.endpoints.get(controllerId);
	}

	/**
	 * 检查控制器是否已注册
	 * @param controllerId 控制器ID
	 * @returns 是否已注册
	 */
	has(controllerId: string): boolean {
		return this.endpoints.has(controllerId);
	}

	/**
	 * 获取所有已注册的控制器ID
	 * @returns 控制器ID数组
	 */
	getAllControllerIds(): string[] {
		return Array.from(this.endpoints.keys());
	}

	/**
	 * 清空所有注册
	 */
	clear(): void {
		this.endpoints.clear();
		console.log("🧹 清空所有控制器注册");
	}
}

