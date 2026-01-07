/**
 * 控制绑定管理器
 * 管理 controllerId -> memberId 的绑定关系
 */

export class ControlBindingManager {
	/** 绑定表：controllerId -> memberId */
	private bindings: Map<string, string> = new Map();

	/** 反向索引：memberId -> controllerId（一个 member 只能被一个 controller 绑定） */
	private reverseBindings: Map<string, string> = new Map();

	/**
	 * 绑定控制器到成员
	 * @param controllerId 控制器ID
	 * @param memberId 成员ID
	 */
	bind(controllerId: string, memberId: string): void {
		// 如果该 controller 已经绑定了其他 member，先解绑
		const oldMemberId = this.bindings.get(controllerId);
		if (oldMemberId && oldMemberId !== memberId) {
			this.reverseBindings.delete(oldMemberId);
		}

		// 如果该 member 已经被其他 controller 绑定，先解绑旧的 controller
		const oldControllerId = this.reverseBindings.get(memberId);
		if (oldControllerId && oldControllerId !== controllerId) {
			this.bindings.delete(oldControllerId);
		}

		// 建立新的绑定
		this.bindings.set(controllerId, memberId);
		this.reverseBindings.set(memberId, controllerId);

		console.log(`🔗 绑定控制器: ${controllerId} -> ${memberId}`);
	}

	/**
	 * 解绑控制器
	 * @param controllerId 控制器ID
	 */
	unbind(controllerId: string): void {
		const memberId = this.bindings.get(controllerId);
		if (memberId) {
			this.bindings.delete(controllerId);
			this.reverseBindings.delete(memberId);
			console.log(`🔓 解绑控制器: ${controllerId} (原绑定: ${memberId})`);
		}
	}

	/**
	 * 获取控制器绑定的成员ID
	 * @param controllerId 控制器ID
	 * @returns 成员ID，如果未绑定则返回 undefined
	 */
	getBoundMemberId(controllerId: string): string | undefined {
		return this.bindings.get(controllerId);
	}

	/**
	 * 获取绑定到成员的控制器ID
	 * @param memberId 成员ID
	 * @returns 控制器ID，如果未绑定则返回 undefined
	 */
	getControllerIdByMemberId(memberId: string): string | undefined {
		return this.reverseBindings.get(memberId);
	}

	/**
	 * 检查控制器是否已绑定
	 * @param controllerId 控制器ID
	 * @returns 是否已绑定
	 */
	hasBinding(controllerId: string): boolean {
		return this.bindings.has(controllerId);
	}

	/**
	 * 获取所有绑定关系
	 * @returns 绑定关系数组
	 */
	getAllBindings(): Array<{ controllerId: string; memberId: string }> {
		return Array.from(this.bindings.entries()).map(([controllerId, memberId]) => ({
			controllerId,
			memberId,
		}));
	}

	/**
	 * 获取所有已知控制器ID（以 binding 为准）
	 *
	 * 说明：
	 * - 多控制器快照(byController) 的 key 集合应该来自「绑定关系」
	 * - ControllerRegistry 主要用于 endpoint/反馈通道注册，不应作为快照的控制器来源
	 */
	getAllControllerIds(): string[] {
		return Array.from(this.bindings.keys());
	}

	/**
	 * 清空所有绑定
	 */
	clear(): void {
		this.bindings.clear();
		this.reverseBindings.clear();
		console.log("🧹 清空所有控制器绑定");
	}
}

