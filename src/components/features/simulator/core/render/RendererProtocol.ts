// 消息驱动渲染协议（最小可用 + 可扩展）

export type EntityId = string;

export type Vec3 = { x: number; y: number; z: number };

export interface CmdBase {
  entityId: EntityId;
  seq: number; // 每实体递增序号，用于丢弃旧指令
  ts: number; // 逻辑时间（ms）
  epoch?: number; // 可选：上下文重置/重生
}

export interface SpawnCmd extends CmdBase {
  type: "spawn";
  name: string;
  position: Vec3;
  props?: {
    color?: string;
    radius?: number; // m，默认 0.2（直径 0.4）
    visible?: boolean;
  };
}

export interface DestroyCmd extends CmdBase {
  type: "destroy";
}

export interface MoveStartCmd extends CmdBase {
  type: "moveStart";
  dir: { x: number; z: number }; // 归一化目标方向（水平面）
  speed: number; // m/s
  accel?: number; // m/s^2，默认 0（立即达到）
}

export interface MoveStopCmd extends CmdBase {
  type: "moveStop";
  decel?: number; // m/s^2，默认立即停止
  snapToStop?: boolean; // true => 立即停止（忽略 decel）
}

export interface FaceCmd extends CmdBase {
  type: "face";
  yaw: number; // 弧度，绕 y 轴
}

export interface TeleportCmd extends CmdBase {
  type: "teleport";
  position: Vec3;
}

export interface SetNameCmd extends CmdBase {
  type: "setName";
  name: string;
}

export interface ActionCmd extends CmdBase {
  type: "action";
  name: string; // 仅名称，渲染端自行映射
  params?: Record<string, unknown>;
}

export interface SetPropsCmd extends CmdBase {
  type: "setProps";
  props: {
    color?: string;
    radius?: number;
    visible?: boolean;
  };
}

export interface ReconcileCmd extends CmdBase {
  type: "reconcile";
  position: Vec3;
  velocity?: Vec3;
  hard?: boolean; // true 硬校正；false 平滑靠拢（当前实现为硬校正）
}

export type RendererCmd =
  | SpawnCmd
  | DestroyCmd
  | MoveStartCmd
  | MoveStopCmd
  | FaceCmd
  | TeleportCmd
  | SetNameCmd
  | ActionCmd
  | SetPropsCmd
  | ReconcileCmd
  | { type: "batch"; cmds: RendererCmd[] };

export interface RendererController {
  send: (cmd: RendererCmd | RendererCmd[]) => void;
  tick: (dtSec: number) => void;
  dispose: () => void;
  // 提供给外部的查询接口：用于相机跟随
  getEntityPose: (id: EntityId) => { pos: Vec3; yaw: number } | undefined;
}


