import type { ActionPool } from "../../../runtime/Agent/type";
import type { PlayerRuntimeState } from "./RuntimeState";

export const PlayerActionPool = {} as const satisfies ActionPool<PlayerRuntimeState>;

export type PlayerActionPool = typeof PlayerActionPool;
