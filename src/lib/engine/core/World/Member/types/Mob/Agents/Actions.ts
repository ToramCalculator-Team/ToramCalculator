import type { BtContext } from "../../../runtime/Agent/BtContext";
import type { ActionPool } from "../../../runtime/Agent/type";

export const MobActionPool = {} as const satisfies ActionPool<BtContext & Record<string, unknown>>;

export type MobActionPool = typeof MobActionPool;
