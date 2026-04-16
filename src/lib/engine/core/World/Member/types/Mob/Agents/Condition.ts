import type { BtContext } from "../../../runtime/Agent/BtContext";
import type { ConditionPool } from "../../../runtime/Agent/type";

export const MobConditionPool = {} as const satisfies ConditionPool<BtContext & Record<string, unknown>>;

export type MobConditionPool = typeof MobConditionPool;
