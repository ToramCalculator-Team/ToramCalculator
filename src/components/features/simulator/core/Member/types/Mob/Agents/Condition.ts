import type { ConditionPool } from "../../../runtime/Agent/type";
import type { MobRuntimeState } from "./RuntimeState";

export const MobConditionPool = {} as const satisfies ConditionPool<MobRuntimeState>;

export type MobConditionPool = typeof MobConditionPool;
