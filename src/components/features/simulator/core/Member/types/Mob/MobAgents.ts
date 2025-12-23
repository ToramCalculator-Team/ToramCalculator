import { ActionPool } from "../../runtime/Agent/type";
import { CommonActions } from "../../runtime/Agent/GlobalActions";
import { RuntimeContext } from "../../runtime/Agent/AgentContext";

export interface MobActionContext extends RuntimeContext {
}

export const MobActionPool = {
  ...CommonActions,
} as const satisfies ActionPool<RuntimeContext>;
export type MobActionPool = typeof MobActionPool;
