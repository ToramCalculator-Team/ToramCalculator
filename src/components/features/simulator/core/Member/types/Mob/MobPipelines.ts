import { PipelineDef, ActionPool } from "../../runtime/Action/type";
import { CommonActions } from "../../runtime/Action/CommonActions";
import { RuntimeContext } from "../../runtime/Action/ActionContext";

export interface MobActionContext extends RuntimeContext {
}

export const MobActionPool = {
  ...CommonActions,
} as const satisfies ActionPool<RuntimeContext>;
export type MobActionPool = typeof MobActionPool;
