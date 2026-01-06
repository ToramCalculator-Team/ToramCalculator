import type { ActionPool } from "../../../runtime/Agent/type";
import type { PlayerProperty } from "./Property";

export const PlayerActionPool = {} as const satisfies ActionPool<PlayerProperty>;

export type PlayerActionPool = typeof PlayerActionPool;
