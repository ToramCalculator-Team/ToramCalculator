import type { BtContext } from "../../../runtime/Agent/BtContext";
import type { ConditionPool } from "../../../runtime/Agent/type";

export const PlayerConditionPool = {} as const satisfies ConditionPool<BtContext & Record<string, unknown>>;

export type PlayerConditionPool = typeof PlayerConditionPool;
