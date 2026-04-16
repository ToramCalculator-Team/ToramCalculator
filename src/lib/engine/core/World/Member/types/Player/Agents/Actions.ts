import type { BtContext } from "../../../runtime/Agent/BtContext";
import type { ActionPool } from "../../../runtime/Agent/type";

export const PlayerActionPool = {} as const satisfies ActionPool<BtContext & Record<string, unknown>>;

export type PlayerActionPool = typeof PlayerActionPool;
