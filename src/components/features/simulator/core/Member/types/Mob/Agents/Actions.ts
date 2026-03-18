import type { ActionPool } from "../../../runtime/Agent/type";
import type { MobRuntimeState } from "./RuntimeState";

export const MobActionPool = {} as const satisfies ActionPool<MobRuntimeState>;

export type MobActionPool = typeof MobActionPool;
