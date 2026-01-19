/**
 * 控制器事件投影器
 * 
 * 职责：
 * - 将 MemberDomainEvent 投影为 ControllerDomainEvent（按 binding 映射 memberId -> controllerId）
 * - 批量收集并发送到主线程
 * - 生成相机事件（绑定变更时）
 */

import type { ControlBindingManager } from "../Controller/ControlBindingManager";
import type { MemberDomainEvent, ControllerDomainEvent } from "../types";

export class ControllerEventProjector {
	private bindingManager: ControlBindingManager;
	/** 领域事件批发送器（直接发送 domain_event_batch 顶层消息） */
	private domainEventBatchSender: ((payload: { type: "controller_domain_event_batch"; frameNumber: number; events: ControllerDomainEvent[] }) => void) | null = null;
	
	/** 当前帧收集的控制器事件 */
	private currentFrameEvents: ControllerDomainEvent[] = [];

	constructor(bindingManager: ControlBindingManager) {
		this.bindingManager = bindingManager;
	}

	/**
	 * 设置领域事件批发送器
	 * 
	 * 注意：现在直接发送 domain_event_batch 顶层消息，不再嵌套在 system_event 中
	 */
	setDomainEventBatchSender(sender: ((payload: { type: "controller_domain_event_batch"; frameNumber: number; events: ControllerDomainEvent[] }) => void) | null): void {
		this.domainEventBatchSender = sender;
	}

	/**
	 * 投影 MemberDomainEvent 为 ControllerDomainEvent
	 * @param event 成员域事件
	 */
	project(event: MemberDomainEvent): void {
		// 查找绑定到该 member 的 controllerId
		const controllerId = this.bindingManager.getControllerIdByMemberId(event.memberId);
		
		if (!controllerId) {
			// 没有控制器绑定，不投影
			return;
		}

		// 投影为控制器事件
		const controllerEvent: ControllerDomainEvent = {
			...event,
			controllerId,
		} as ControllerDomainEvent;

		this.currentFrameEvents.push(controllerEvent);
	}

	/**
	 * 生成相机跟随事件（绑定变更时调用）
	 * @param controllerId 控制器ID
	 * @param memberId 成员ID
	 */
	emitCameraFollow(controllerId: string, memberId: string): void {
		const cameraEvent: ControllerDomainEvent = {
			type: "camera_follow",
			controllerId,
			entityId: memberId,
		};

		this.currentFrameEvents.push(cameraEvent);
	}

	/**
	 * 刷新帧（发送所有收集的事件到主线程）
	 * 
	 * 现在直接发送 domain_event_batch 顶层消息，不再嵌套在 system_event 中
	 * @param frameNumber 当前帧号
	 */
	flush(frameNumber: number): void {
		if (this.currentFrameEvents.length === 0) {
			return;
		}

		if (!this.domainEventBatchSender) {
			console.warn("ControllerEventProjector: 领域事件批发送器未设置，无法发送事件");
			this.currentFrameEvents = [];
			return;
		}

		// 批量发送（直接作为 domain_event_batch 顶层消息）
		try {
			this.domainEventBatchSender({
				type: "controller_domain_event_batch",
				frameNumber,
				events: this.currentFrameEvents,
			});
		} catch (error) {
			console.error("ControllerEventProjector: 发送事件失败:", error);
		}

		// 清空缓存
		this.currentFrameEvents = [];
	}

	/**
	 * 清空所有缓存
	 */
	clear(): void {
		this.currentFrameEvents = [];
	}
}

