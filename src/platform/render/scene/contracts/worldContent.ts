import type { Vec3 } from "~/engine/core/thread/RendererProtocol";
import type { RenderFrameStats } from "../renderFrameStats";
import type { WorldResource } from "./worldResource";

export interface WorldResourcePose {
	memberId: string;
	position: Vec3;
	yaw: number;
}

/**
 * 3D 世界内容的内部控制端口。
 *
 * 静态资源从应用解析层进入，连续运行事实从实时世界状态 SAB 读取；
 * 引擎线程协议不拥有静态模型和 Babylon 内容生命周期。
 */
export interface RendererController {
	tick: (dtSec: number) => void;
	dispose: () => void;
	getEntityPose: (id: string) => { pos: Vec3; yaw: number } | undefined;
	applyWorldResources: (resources: WorldResource[], poses: WorldResourcePose[]) => Promise<void>;
	getFrameStats: () => RenderFrameStats;
}
