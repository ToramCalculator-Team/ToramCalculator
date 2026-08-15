import { z } from "zod/v4";
import type { WorldStateLayoutDescriptor, WorldStateReader } from "./worldStateBuffer";

export const Vec3Schema = z.object({ x: z.number(), y: z.number(), z: z.number() });
export type Vec3 = z.output<typeof Vec3Schema>;

/** 渲染层只读能力：静态资源注册表由 Session 初始化，连续运行事实统一来自实时状态 SAB。 */
export interface SimulationRenderSource {
	getWorldStateReader(): WorldStateReader | null;
	getWorldStateLayout(): WorldStateLayoutDescriptor | null;
}
