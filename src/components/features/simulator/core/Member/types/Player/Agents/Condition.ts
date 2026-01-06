import type { ConditionPool } from "../../../runtime/Agent/type";
import type { PlayerProperty } from "./Property";

export const PlayerConditionPool = {} as const satisfies ConditionPool<PlayerProperty>;

export type PlayerConditionPool = typeof PlayerConditionPool;
