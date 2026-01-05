import type { ActionPool } from "../../../runtime/Agent/type";
import type { PlayerRuntimeProperty } from "./Property";

export const PlayerActionPool = {} as const satisfies ActionPool<PlayerRuntimeProperty>;

export type PlayerActionPool = typeof PlayerActionPool;
