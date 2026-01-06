import type { ConditionPool } from "../../../runtime/Agent/type";
import type { MobProperty } from "./Property";

export const MobConditionPool = {} as const satisfies ConditionPool<MobProperty>;

export type MobConditionPool = typeof MobConditionPool;
