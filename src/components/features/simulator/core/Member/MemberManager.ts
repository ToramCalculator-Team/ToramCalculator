import type { MemberWithRelations } from "@db/generated/repositories/member";
import type { TeamWithRelations } from "@db/generated/repositories/team";
import type { MemberType } from "@db/schema/enums";
import type { Actor, AnyActorLogic } from "xstate";
import type { Member } from "./Member";
import type { MemberDomainEvent } from "../types";
import type { ExpressionContext } from "../JSProcessor/types";
import type { CommonRuntimeContext } from "./runtime/Agent/CommonRuntimeContext";
import type { MemberEventType, MemberStateContext } from "./runtime/StateMachine/types";
import { Mob } from "./types/Mob/Mob";
import { Player } from "./types/Player/Player";

// ============================== 类型定义 ==============================

// 避免 any：用通用基类型承载不同成员实现
export type AnyMemberEntry = Member<
	string,
	MemberEventType,
	MemberStateContext,
	CommonRuntimeContext & Record<string, unknown>
>;

// ============================== 成员管理器类 ==============================

/**
 * 成员管理器类
 * 统一管理所有成员的生命周期，是成员管理的最终执行层
 */
export class MemberManager {
	/** 所有成员的管理表 - 主存储（存储Actor与元数据） */
	private members: Map<string, AnyMemberEntry> = new Map();
	/** 阵营注册表（仅存基础信息） */
	private camps: Map<string, TeamWithRelations[]> = new Map();
	/** 队伍注册表（仅存基础信息） */
	private teams: Map<string, TeamWithRelations> = new Map();
	/** 阵营 -> 成员ID集合 索引 */
	private membersByCamp: Map<string, Set<string>> = new Map();
	/** 队伍 -> 成员ID集合 索引 */
	private membersByTeam: Map<string, Set<string>> = new Map();

	/** 渲染消息发射器 */
	private renderMessageSender: ((payload: unknown) => void) | null = null;
	/** 域事件发射器 */
	private emitDomainEvent: ((event: MemberDomainEvent) => void) | null = null;
	/** 表达式求值器（由引擎注入） */
	private evaluateExpression:
		| ((expression: string, context: ExpressionContext) => number | boolean)
		| null = null;

	// ==================== 主控目标系统 ====================

	/** 当前主控目标ID - 用户操作的成员，相机跟随的目标 */
	private primaryMemberId: string | null = null;

	// ==================== 构造函数 ====================
	constructor(renderMessageSender: ((payload: unknown) => void) | null) {
		this.renderMessageSender = renderMessageSender;
	}

	/**
	 * 设置域事件发射器
	 */
	setEmitDomainEvent(emitDomainEvent: ((event: MemberDomainEvent) => void) | null): void {
		this.emitDomainEvent = emitDomainEvent;
		// 为所有已存在的成员设置
		for (const member of this.members.values()) {
			member.setEmitDomainEvent(emitDomainEvent);
		}
	}

	/**
	 * 设置表达式求值器（由引擎注入）
	 */
	setEvaluateExpression(
		evaluateExpression: ((expression: string, context: ExpressionContext) => number | boolean) | null,
	): void {
		this.evaluateExpression = evaluateExpression;
		for (const member of this.members.values()) {
			member.setEvaluateExpression(evaluateExpression);
		}
	}

	// ==================== 公共接口 ====================
	/**
	 * 创建并注册新成员
	 *
	 * @param memberData 成员数据库数据
	 * @param campId 阵营ID
	 * @param teamId 队伍ID
	 * @param characterIndex 角色索引
	 * @param position 位置
	 * @returns 创建的成员实例，失败则返回null
	 */
	createAndRegister(
		memberData: MemberWithRelations,
		campId: string,
		teamId: string,
		characterIndex: number,
		position?: { x: number; y: number; z: number },
	): Actor<AnyActorLogic> | null {
		switch (memberData.type) {
			case "Player": {
				const player = new Player(memberData, campId, teamId, characterIndex, this.renderMessageSender, position);
				// 设置域事件发射器
				player.setEmitDomainEvent(this.emitDomainEvent);
				// 设置表达式求值器
				if (!this.evaluateExpression) {
					throw new Error(`MemberManager: evaluateExpression 未设置，无法创建成员 ${memberData.id}`);
				}
				player.setEvaluateExpression(this.evaluateExpression);
				const success = this.registerMember(player, campId, teamId, memberData);
				if (success) {
					player.start();
					console.log(`✅ 创建并注册玩家成功: ${memberData.name} (${memberData.type})`);
					return player.actor;
				} else {
					// 注册失败：不与 actor 交互，直接返回
					return null;
				}
			}
			case "Mob": {
				const mob = new Mob(memberData, campId, teamId, this.renderMessageSender, position);
				// 设置域事件发射器
				mob.setEmitDomainEvent(this.emitDomainEvent);
				// 设置表达式求值器
				if (!this.evaluateExpression) {
					throw new Error(`MemberManager: evaluateExpression 未设置，无法创建成员 ${memberData.id}`);
				}
				mob.setEvaluateExpression(this.evaluateExpression);
				const success = this.registerMember(mob, campId, teamId, memberData);
				if (success) {
					mob.start();
					console.log(`✅ 创建并注册怪物成功: ${memberData.name} (${memberData.type})`);
					return mob.actor;
				} else {
					// 注册失败：不与 actor 交互，直接返回
					return null;
				}
			}
			// case "Mercenary":
			//   member = new Mercenary(memberData, this.engine, initialState);
			//   break;
			// case "Partner":
			//   member = new Partner(memberData, this.engine, initialState);
			//   break;
			default:
				console.error(`❌ 不支持的成员类型: ${memberData.type}`);
				return null;
		}
	}

	/**
	 * 注册新成员，将actor包装进MemberManagerEntry中，并维护阵营/队伍索引
	 *
	 * @param member 成员实例
	 * @param campId 阵营ID
	 * @param teamId 队伍ID
	 * @returns 注册是否成功
	 */
	registerMember(member: AnyMemberEntry, campId: string, teamId: string, memberData: MemberWithRelations): boolean {
		this.members.set(memberData.id, member);
		// console.log(`📝 注册成员: ${memberData.name} (${memberData.type}) -> ${campId}/${teamId}`);

		// 维护阵营/队伍索引
		if (!this.membersByCamp.has(campId)) {
			this.membersByCamp.set(campId, new Set());
		}
		this.membersByCamp.get(campId)?.add(memberData.id);

		if (!this.membersByTeam.has(teamId)) {
			this.membersByTeam.set(teamId, new Set());
		}
		this.membersByTeam.get(teamId)?.add(memberData.id);

		// 自动选择主控目标（如果还没有设置的话）
		if (!this.primaryMemberId) {
			this.autoSelectPrimaryMember();
		}

		return true;
	}

	/**
	 * 注销成员
	 *
	 * @param memberId 成员ID
	 * @returns 注销是否成功
	 */
	unregisterMember(memberId: string): boolean {
		const member = this.members.get(memberId);
		if (!member) {
			console.warn(`⚠️ 成员不存在: ${memberId}`);
			return false;
		}

		this.members.delete(memberId);
		this.membersByCamp.forEach((value) => {
			value.delete(memberId);
		});
		this.membersByTeam.forEach((value) => {
			value.delete(memberId);
		});

		// 如果被删除的成员是当前主控目标，重新选择目标
		if (this.primaryMemberId === memberId) {
			console.log(`🎯 当前主控目标被删除，重新选择目标`);
			this.autoSelectPrimaryMember();
		}

		return true;
	}

	/**
	 * 获取成员实例
	 *
	 * @param memberId 成员ID
	 * @returns 成员实例，如果不存在则返回null
	 */
	getMember(memberId: string): AnyMemberEntry | null {
		return this.members.get(memberId) || null;
	}

	/**
	 * 获取所有成员
	 *
	 * @returns 所有成员实例的数组
	 */
	getAllMembers(): AnyMemberEntry[] {
		return Array.from(this.members.values());
	}

	/**
	 * 获取所有成员ID
	 *
	 * @returns 所有成员ID的数组
	 */
	getAllMemberIds(): string[] {
		return Array.from(this.members.keys());
	}

	/**
	 * 按类型获取成员
	 *
	 * @param type 成员类型
	 * @returns 指定类型的成员数组
	 */
	getMembersByType(type: MemberType): AnyMemberEntry[] {
		return Array.from(this.members.values())
			.filter((member) => member.type === type)
			.map((member) => member);
	}

	/**
	 * 按阵营获取成员
	 *
	 * @param campId 阵营ID
	 * @returns 指定阵营的成员数组
	 */
	getMembersByCamp(campId: string): AnyMemberEntry[] {
		const idSet = this.membersByCamp.get(campId);
		if (!idSet) return [];
		const result: AnyMemberEntry[] = [];
		for (const id of idSet) {
			const member = this.members.get(id);
			if (member) result.push(member);
		}
		return result;
	}

	/**
	 * 按队伍获取成员
	 *
	 * @param teamId 队伍ID
	 * @returns 指定队伍的成员数组
	 */
	getMembersByTeam(teamId: string): AnyMemberEntry[] {
		const idSet = this.membersByTeam.get(teamId);
		if (!idSet) return [];
		const result: AnyMemberEntry[] = [];
		for (const id of idSet) {
			const member = this.members.get(id);
			if (member) result.push(member);
		}
		return result;
	}

	/**
	 * 获取活跃成员
	 *
	 * @returns 活跃成员数组
	 */
	// getActiveMembers(): Member<any>[] {
	//   return Array.from(this.members.values())
	//     .filter((member) => member.isActive)
	//     .map((member) => member.actor);
	// }

	/**
	 * 清空注册表
	 * 移除所有成员并清理资源
	 */
	clear(): void {
		console.log(`🗑️ 清空成员注册表，共 ${this.members.size} 个成员`);

		// 不与 actor 交互，直接清空索引与引用，避免停止阶段的竞态

		// 清空注册表
		this.members.clear();
		this.membersByCamp.clear();
		this.membersByTeam.clear();
		this.camps.clear();
		this.teams.clear();

		// 清空主控目标
		this.primaryMemberId = null;
	}

	/**
	 * 获取注册表大小
	 *
	 * @returns 当前注册的成员数量
	 */
	size(): number {
		return this.members.size;
	}

	/**
	 * 检查是否为空
	 *
	 * @returns 注册表是否为空
	 */
	isEmpty(): boolean {
		return this.members.size === 0;
	}

	/**
	 * 检查成员是否存在
	 *
	 * @param memberId 成员ID
	 * @returns 成员是否存在
	 */
	hasMember(memberId: string): boolean {
		return this.members.has(memberId);
	}

	// ==================== 阵营/队伍管理 ====================

	/**
	 * 创建阵营（幂等）
	 */
	addCamp(campId: string): TeamWithRelations[] {
		if (!this.camps.has(campId)) {
			this.camps.set(campId, []);
			this.membersByCamp.set(campId, this.membersByCamp.get(campId) || new Set());
		}
		const camp = this.camps.get(campId);
		if (!camp) {
			const empty: TeamWithRelations[] = [];
			this.camps.set(campId, empty);
			return empty;
		}
		return camp;
	}

	/** 添加队伍（幂等） */
	addTeam(campId: string, team: TeamWithRelations): TeamWithRelations {
		if (!this.camps.has(campId)) {
			// 若未注册阵营，先注册
			this.addCamp(campId);
		}
		this.teams.set(team.id, team);
		this.membersByTeam.set(team.id, this.membersByTeam.get(team.id) || new Set());
		return team;
	}

	/**
	 * 发送事件到指定成员
	 */
	sendTo(memberId: string, event: unknown): void {
		const member = this.members.get(memberId);
		// Member 实例内部的 actor event type 取决于具体成员类型，这里保持 unknown 并在 send 时做收敛
		member?.actor.send?.(event as never);
	}

	/** 查询阵营是否存在 */
	hasCamp(campId: string): boolean {
		return this.camps.has(campId);
	}
	/** 查询队伍是否存在 */
	hasTeam(teamId: string): boolean {
		return this.teams.has(teamId);
	}

	// ==================== 主控目标管理 ====================

	/** 获取当前主控目标 */
	getPrimaryMemberId(): string | null {
		return this.primaryMemberId;
	}

	/** 设置主控目标 */
	setPrimaryMember(memberId: string | null): void {
		const oldMemberId = this.primaryMemberId;

		// 验证目标成员是否存在
		if (memberId && !this.members.has(memberId)) {
			console.warn(`🎯 主控目标设置失败: 成员 ${memberId} 不存在`);
			return;
		}

		this.primaryMemberId = memberId;

		if (oldMemberId !== memberId) {
			console.log(`🎯 主控目标切换: ${oldMemberId} -> ${memberId}`);

			// 通知渲染层相机跟随新目标（仅用于渲染层，不用于控制器层）
			// 注意：多控制器架构下，主控目标概念仅用于渲染层（相机跟随），不再通知控制器层
			if (memberId) {
				this.renderMessageSender?.({
					type: "render:cmd",
					cmd: {
						type: "camera_follow",
						entityId: memberId,
						distance: 8,
						verticalAngle: Math.PI / 6,
						seq: Date.now(),
						ts: Date.now(),
					},
				});
			}

			// 已移除：primary_target_changed 系统事件发送
			// 原因：多控制器架构下，每个控制器独立绑定成员，不存在"主控目标"概念
			// 控制器层应通过 byController[controllerId] 获取绑定成员数据
		}
	}

	/** 自动选择主控目标：优先Player，其次第一个成员 */
	autoSelectPrimaryMember(): void {
		const allMembers = Array.from(this.members.values());

		// 优先选择Player类型的成员
		const playerMember = allMembers.find((member) => member.type === "Player");
		if (playerMember) {
			this.setPrimaryMember(playerMember.id);
			return;
		}

		// 如果没有Player，选择第一个成员
		const firstMember = allMembers[0];
		if (firstMember) {
			this.setPrimaryMember(firstMember.id);
			return;
		}

		// 没有成员时清空目标
		this.setPrimaryMember(null);
	}

	/** 获取主控目标的成员信息 */
	getPrimaryMemberInfo(): AnyMemberEntry | null {
		if (!this.primaryMemberId) return null;
		return this.members.get(this.primaryMemberId) || null;
	}
}
