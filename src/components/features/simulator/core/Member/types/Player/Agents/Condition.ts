import type { ConditionPool } from "../../../runtime/Agent/type";
import type { PlayerRuntimeProperty } from "./Property";

export const PlayerConditionPool = {} as const satisfies ConditionPool<PlayerRuntimeProperty>;

export type PlayerConditionPool = typeof PlayerConditionPool;
