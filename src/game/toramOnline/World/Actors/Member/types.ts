import { z } from "zod/v4";
import type { AttributeContainerCheckpoint } from "~/engine/core/AttributeContainer/AttributeContainerTypes";
import type { ExpressionContext } from "~/engine/core/JSProcessor/types";
import type { SimulationTickContext } from "~/engine/core/types";
import type { ResolvedDamageEffect } from "~/game/toramOnline/service/Damage/types";
import type { WorldCharacterSkill, WorldSkillVariant } from "../../ScenarioSchema";
import type { DamageAreaSpec } from "../Area/types";
import type { EffectBtManagerCheckpoint } from "./EffectBehavior/types";
import type { MemberFSMCheckpoint } from "./StateMachine/types";
import type { StatusInstanceStoreCheckpoint } from "./Status/types";

/**
 *
 * Runtime 是成员运行状态的持久化部分，应该满足：
 *  - 能进入 MemberCheckpoint
 *  - 能通过重放或恢复继续模拟
 *  - 不包含函数、对象引用、订阅回调、外部服务
 *  - 不依赖当前执行者是 BT 还是 FSM
 *  - 表达“成员现在处于什么状态”
 *
 * 如果移除 BT 和 FSM，单靠检查点仍然需要恢复它，或者下一次模拟需要它，它就是 Runtime 候选
 */
interface MemberDefinition {
	memberId: string;
	name: string;
	campId: string;
	teamId: string;
}

interface MemberState {
	position: { x: number; y: number; z: number }; // 当前世界坐标
	yaw: number; // 当前朝向（弧度，绕 y 轴）；移动时由移动方向派生，静止时保持最后朝向。
	targetId: string; // 当前目标成员 ID
	skillCooldowns: number[]; // 当前技能冷却剩余时间（毫秒，按技能索引顺序排列）
	/** 当前正在处理的技能（FSM 在"添加待处理技能"时写入，"清空待处理技能"时清空）。 */
	currentSkill: {
		id: string;
		lv: number;
		name: string;
		executionInstance: number;
		data: WorldCharacterSkill;
		activeVariant: WorldSkillVariant;
		lifecycle: {
			/** 当前技能生命周期的四段毫秒；动作总时长由 startup + recovery 派生。 */
			charging: number;
			chanting: number;
			startup: number;
			recovery: number;
		};
	} | null;
	nextSkillExecutionInstance: number;
	/** 上一次释放的技能，用于连击判定等。 */
	preSkill: WorldCharacterSkill | null;
	/** 当前 Tick 已接纳的移动状态；由控制输入采样与成员状态共同决定。 */
	movement: { dir: { x: number; z: number }; speed: number } | null;
	/** 垂直运动由成员状态机和 Tick 积分共同维护，渲染层不能改写。 */
	verticalVelocity: number;
	grounded: boolean;
	/**
	 * 成员物理参数（游戏层在场景装配时注入，引擎不硬编码具体数值）。
	 * - walkSpeed / runSpeed：对应 intensity 0.5 / 1.0 时的基础速度（m/s），应用 buff/debuff 前。
	 * - gravity：世界重力加速度（m/s²）。
	 * - jumpSpeed：起跳瞬间垂直初速（m/s）。
	 */
	locomotion: {
		walkSpeed: number;
		runSpeed: number;
		gravity: number;
		jumpSpeed: number;
	};
}

export interface MemberRuntime extends MemberDefinition, MemberState, SimulationTickContext, Record<string, unknown> {}

/**
 * 成员运行时服务接口。
 *
 * 说明：
 * - 这些字段由引擎/成员管理器注入。
 * - 它们不是成员状态本身，而是运行时可调用服务。
 */
export interface MemberRuntimeServices {
	/** 表达式求值器 */
	expressionEvaluator: ((expression: string, context: ExpressionContext) => number | boolean) | null;
	/** 瞬时伤害执行入口：只查询一次范围，不创建 Area。 */
	executeInstantDamage: ((effect: ResolvedDamageEffect) => void) | null;
	/** 持续 Area 创建入口。 */
	createDamageArea: ((spec: DamageAreaSpec) => string) | null;
	/** 事件发布器 */
	eventPublish: ((event: MemberEvent) => void) | null;
	/**
	 * 目标解析器。
	 *
	 * 设计说明：
	 * - 未指定目标时为场景装配选择确定的初始目标。
	 * - 显式目标只做成员身份解析；技能只读取已经保存在 runtime 中的 targetId。
	 */
	targetResolver: ((sourceMemberId: string, requestedTargetId?: string | null) => string | null) | null;
	/**
	 * 目标水平方向解析器。
	 *
	 * World 读取两个成员的权威位置并返回单位方向；Member 只负责把方向写为自身 yaw，
	 * 从而保持跨成员空间读取与成员物理状态写入的职责边界。
	 */
	targetDirectionResolver: ((sourceMemberId: string, targetMemberId: string) => { x: number; z: number } | null) | null;
	/** 引擎级随机数生成器（seeded PRNG），用于命中判定等确定性模拟 */
	random: () => number;
}

/** 引擎 Tick 已从控制器最新状态中解析出的成员移动输入。 */
export interface MemberMovementInput {
	direction: { x: number; z: number };
	intensity: number;
}

// 运行时状态缺省值
export const DefaultMemberRuntime: MemberRuntime = {
	memberId: "",
	name: "",
	campId: "",
	teamId: "",
	tickIndex: 0,
	currentTimeMs: 0,
	fixedStepMs: 1000 / 60,
	position: { x: 0, y: 0, z: 0 },
	yaw: 0,
	movement: null,
	verticalVelocity: 0,
	grounded: true,
	locomotion: {
		walkSpeed: 1,
		runSpeed: 2,
		gravity: 9.8,
		jumpSpeed: 3,
	},
	targetId: "",
	statusTags: [],
	skillCooldowns: [],
	currentSkill: null,
	nextSkillExecutionInstance: 0,
	preSkill: null,
};

/** 单个成员的完整检查点 */
export interface MemberCheckpoint {
	memberId: string;
	fsm: MemberFSMCheckpoint;
	attributeContainer: AttributeContainerCheckpoint;
	statusStore: StatusInstanceStoreCheckpoint;
	effectBtManager: EffectBtManagerCheckpoint;
	pipelineOverlays: unknown;
	position: { x: number; y: number; z: number };
	/** 共享 runtime（plain data，可 postMessage） */
	runtime: unknown;
}

/**
 * 成员产生的事件
 */
export const MemberEventSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("state_changed"),
		memberId: z.string(),
		hp: z.number().nullable(),
		mp: z.number().nullable(),
		position: z
			.object({
				x: z.number(),
				y: z.number(),
				z: z.number(),
			})
			.optional(),
	}),
	z.object({
		type: z.literal("hit"),
		memberId: z.string(),
		sourceMemberId: z.string(),
		sourceSkillId: z.string().nullable(),
		damage: z.number(),
		hp: z.number().nullable(),
	}),
	z.object({
		type: z.literal("status_entered"),
		memberId: z.string(),
		statusType: z.string(),
		sourceId: z.string().optional(),
		timeMs: z.number(),
	}),
	z.object({
		type: z.literal("status_exited"),
		memberId: z.string(),
		statusType: z.string(),
		reason: z.enum(["expired", "removed"]),
		timeMs: z.number(),
	}),
	z.object({
		type: z.literal("skill_cast_accepted"),
		memberId: z.string(),
		skillId: z.string(),
		targetId: z.string(),
		inputId: z.string().optional(),
	}),
	z.object({
		type: z.literal("skill_input_rejected"),
		memberId: z.string(),
		skillId: z.string(),
		inputId: z.string().optional(),
	}),
	z.object({
		type: z.literal("target_selection_accepted"),
		memberId: z.string(),
		targetId: z.string(),
		inputId: z.string(),
	}),
	z.object({
		type: z.literal("target_selection_rejected"),
		memberId: z.string(),
		requestedTargetId: z.string(),
		inputId: z.string(),
	}),
	z.object({
		type: z.literal("death"),
		memberId: z.string(),
	}),
	z.object({
		type: z.literal("move_started"),
		memberId: z.string(),
		position: z.object({
			x: z.number(),
			y: z.number(),
			z: z.number(),
		}),
	}),
	z.object({
		type: z.literal("move_stopped"),
		memberId: z.string(),
		position: z.object({
			x: z.number(),
			y: z.number(),
			z: z.number(),
		}),
	}),
	z.object({
		type: z.literal("cast_progress"),
		memberId: z.string(),
		skillId: z.string(),
		progress: z.number(), // 0~1
	}),
	z.object({
		type: z.literal("skill_cast_denied"),
		memberId: z.string(),
		skillId: z.string(),
	}),
]);

export type MemberEvent = z.output<typeof MemberEventSchema>;
