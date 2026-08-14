import { z } from "zod/v4";
import type { MemberSlotIndex, WorldStateReader } from "./worldStateBuffer";

export const Vec3Schema = z.object({ x: z.number(), y: z.number(), z: z.number() });
export type Vec3 = z.output<typeof Vec3Schema>;

/** SceneRuntime 消费的只读渲染流能力；不包含 Engine 生命周期或业务命令。 */
export interface SimulationRenderSource {
	getRenderSnapshot(includeAreas?: boolean): Promise<RenderSnapshot | null>;
	on(event: "render_cmd", listener: (payload: { engineId: string; cmd: unknown }) => void): () => void;
	off(event: "render_cmd", listener?: (payload: { engineId: string; cmd: unknown }) => void): void;
	/** SAB 世界状态读取器；实时 Session 显式启动投影后可用，未附加时返回 null。 */
	getWorldStateReader(): WorldStateReader | null;
	/** SAB 槽位索引（memberId → slotIdx）；与 getWorldStateReader() 同生命周期。 */
	getWorldStateSlotIndex(): MemberSlotIndex | null;
}

export interface CmdBase {
	entityId: string;
	seq: number; // 每实体递增序号，用于丢弃旧指令
	ts: number; // 逻辑时间（ms）
	epoch?: number; // 可选：上下文重置/重生
}

export interface SpawnCmd extends CmdBase {
	type: "spawn";
	position: Vec3;
}

export interface DestroyCmd extends CmdBase {
	type: "destroy";
}

export interface FaceCmd extends CmdBase {
	type: "face";
	yaw: number; // 弧度，绕 y 轴
}

export interface TeleportCmd extends CmdBase {
	type: "teleport";
	position: Vec3;
}

export interface ActionCmd extends CmdBase {
	type: "action";
	name: string; // 仅名称，渲染端自行映射
	params?: Record<string, unknown>;
}

export interface ReconcileCmd extends CmdBase {
	type: "reconcile";
	position: Vec3;
	velocity?: Vec3;
	hard?: boolean; // true 硬校正；false 平滑靠拢（当前实现为硬校正）
}

export interface CameraFollowCmd extends CmdBase {
	type: "camera_follow";
	entityId: string;
	// 仅传"跟随哪个实体"这一逻辑事实；相机距离/角度是渲染层策略，
	// 由 thirdPersonController 的 defaultCameraState 决定，逻辑层不在此规定。
}

export type RendererCmd =
	| SpawnCmd
	| DestroyCmd
	| FaceCmd
	| TeleportCmd
	| ActionCmd
	| ReconcileCmd
	| CameraFollowCmd
	| { type: "batch"; cmds: RendererCmd[] };

// ==================== 渲染快照（全量状态同步） ====================

/** 渲染快照中单条成员状态（仅视觉/位置/动画，与逻辑成员数据区分） */
export const RenderSnapshotMemberSchema = z.object({
	id: z.string(),
	position: Vec3Schema,
	yaw: z.number(),
	animation: z.object({ name: z.string(), progress: z.number() }).optional(),
});
export type RenderSnapshotMember = z.output<typeof RenderSnapshotMemberSchema>;

/** 渲染快照中单条区域状态（仅视觉/形状/位置，与逻辑区域数据区分） */
export const RenderSnapshotAreaSchema = z.object({
	id: z.string(),
	type: z.string(),
	position: Vec3Schema,
	shape: z.looseObject({
		radius: z.number().optional(),
		width: z.number().optional(),
		height: z.number().optional(),
	}),
	remainingTimeMs: z.number(),
});
export type RenderSnapshotArea = z.output<typeof RenderSnapshotAreaSchema>;

/** 当前世界渲染状态（声明式，用于渲染层首次同步；与 FrameSnapshot / GameEngineSnapshot 等逻辑快照区分） */
export const RenderSnapshotSchema = z.object({
	tickIndex: z.number().int().nonnegative(),
	currentTimeMs: z.number().nonnegative(),
	members: z.array(RenderSnapshotMemberSchema),
	areas: z.array(RenderSnapshotAreaSchema).optional(),
	cameraFollowEntityId: z.string().nullable(),
});
export type RenderSnapshot = z.output<typeof RenderSnapshotSchema>;
