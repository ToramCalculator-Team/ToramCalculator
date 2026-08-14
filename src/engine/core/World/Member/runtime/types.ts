import type {
	EngineCharacter,
	EngineCharacterSkill,
	EngineMob,
	EngineSkillVariant,
} from "../../../engineScenarioSchema";
import type { MobAttrKey } from "../types/Mob/MobAttrSchema";
import type { PlayerAttrKey } from "../types/Player/PlayerAttrSchema";

/**
 * 目标：把"共享运行时状态（可序列化，可进 checkpoint）"与"运行时服务（不可序列化）"分离。
 *
 * 设计说明：
 * - 所有字段一律扁平，命名直接对应 BT 黑板契约与 MDSL 引用（$currentSkill / $currentTimeMs 等）。
 * - BT 执行期直接消费这些字段；AttributeContainer、services、订阅器等成员组件通过 capabilities 注入。
 * - FSM 为这些字段的唯一写入方；BT action 通过 capabilities 请求外部组件执行副作用。
 */
export interface MemberSharedRuntime<_TExtraAttrKey extends string = never> extends Record<string, unknown> {
	memberId: string;
	name: string;
	campId: string;
	teamId: string;
	tickIndex: number;
	currentTimeMs: number;
	deltaTimeMs: number;
	position: { x: number; y: number; z: number };
	/** 当前朝向（弧度，绕 y 轴）；移动时由移动方向派生，静止时保持最后朝向。 */
	yaw: number;
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
	targetId: string;
	statusTags: string[];
	skillCooldowns: number[];
	/** 当前正在处理的技能（FSM 在"添加待处理技能"时写入，"清空待处理技能"时清空）。 */
	currentSkill: {
		data: EngineCharacterSkill;
		activeVariant: EngineSkillVariant;
		lifecycle: {
			/** 当前技能生命周期的四段毫秒；动作总时长由 startup + recovery 派生。 */
			charging: number;
			chanting: number;
			startup: number;
			recovery: number;
		};
	} | null;
	/** 上一次释放的技能，用于连击判定等。 */
	previousSkill: EngineCharacterSkill | null;
	/** per-tree 注入的所属技能上下文（注册行为树时由 localContext 提供）。 */
	skill?: { id: string; lv: number; name: string };
}

/** 引擎 Tick 已从控制器最新状态中解析出的成员移动输入。 */
export interface MemberMovementInput {
	direction: { x: number; z: number };
	intensity: number;
}
export const DefaultMemberSharedRuntime: MemberSharedRuntime = {
	memberId: "",
	name: "",
	campId: "",
	teamId: "",
	tickIndex: 0,
	currentTimeMs: 0,
	deltaTimeMs: 0,
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
	previousSkill: null,
};

/** Player 专用 runtime 扩展。 */
export interface PlayerRuntime extends MemberSharedRuntime<PlayerAttrKey> {
	type: "Player";
	skillList: EngineCharacterSkill[];
	data: EngineCharacter | null;
}
export const PlayerRuntimeDefaults: PlayerRuntime = {
	...DefaultMemberSharedRuntime,
	type: "Player",
	skillList: [],
	data: null,
};

/** Mob 专用 runtime 扩展。 */
export interface MobRuntime extends MemberSharedRuntime<MobAttrKey> {
	type: "Mob";
	skillList: EngineCharacterSkill[];
	data: EngineMob | null;
}
export const MobRuntimeDefaults: MobRuntime = {
	...DefaultMemberSharedRuntime,
	type: "Mob",
	skillList: [],
	data: null,
};
