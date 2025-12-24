import type { RuntimeContext } from "../../runtime/Agent/AgentContext";
import { CommonActions } from "../../runtime/Agent/GlobalActions";
import type { ActionPool } from "../../runtime/Agent/type";

export interface MobActionContext extends RuntimeContext {}

export const MobActionPool = {
	...CommonActions,
} as const satisfies ActionPool<RuntimeContext>;
export type MobActionPool = typeof MobActionPool;
