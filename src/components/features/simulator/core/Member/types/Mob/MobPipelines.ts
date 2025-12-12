import { ActionGroupDef, ActionPool } from "../../runtime/Action/type";
import { MobStateContext } from "./MobStateMachine";
import { CommonActions } from "../../runtime/Action/CommonActions";

export const MobActions = {
  ...CommonActions,
} as const satisfies ActionPool<MobStateContext>;

export type MobActionPool = typeof MobActions;

/**
 * Mob 的 PipelineDef 类型（不再提供代码常量定义）
 */
export type MobActionGroupDef = ActionGroupDef<MobActionPool>;
