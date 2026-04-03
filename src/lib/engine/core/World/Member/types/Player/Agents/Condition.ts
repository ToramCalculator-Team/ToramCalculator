import type { ConditionPool } from "../../../runtime/Agent/type";
import type { PlayerRuntimeState } from "./RuntimeState";

export const PlayerConditionPool = {} as const satisfies ConditionPool<PlayerRuntimeState>;

export type PlayerConditionPool = typeof PlayerConditionPool;
