import type { RendererCmd, RenderSnapshot, Vec3 } from "~/lib/engine/core/thread/RendererProtocol";
import type { WorldResource } from "./worldResource";

export interface WorldResourcePose {
	memberId: string;
	position: Vec3;
	yaw: number;
}

/**
 * 3D 世界内容的内部控制端口。
 *
 * 静态资源从应用解析层进入，动态命令从引擎渲染流进入；该端口只在渲染层汇合两者，
 * 避免引擎线程协议反向拥有静态模型和 Babylon 内容生命周期。
 */
export interface RendererController {
	send: (cmd: RendererCmd | RendererCmd[]) => void;
	tick: (dtSec: number) => void;
	dispose: () => void;
	getEntityPose: (id: string) => { pos: Vec3; yaw: number } | undefined;
	applyWorldResources: (resources: WorldResource[], poses: WorldResourcePose[]) => Promise<void>;
	applyRenderSnapshot: (renderSnapshot: RenderSnapshot) => Promise<void>;
}
