import { PipelineDef, ActionPool } from "../../runtime/Action/type";
import { CommonActions } from "../../runtime/Action/CommonActions";
import { ActionContext } from "../../runtime/Action/ActionContext";

export interface MobActionContext extends ActionContext {
}

export const MobActionPool = {
  ...CommonActions,
} as const satisfies ActionPool<MobActionContext>;
export type MobActionPool = typeof MobActionPool;
