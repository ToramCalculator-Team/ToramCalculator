import type { ActionPool } from "../../../runtime/Agent/type";
import type { MobProperty } from "./Property";

export const MobActionPool = {} as const satisfies ActionPool<MobProperty>;

export type MobActionPool = typeof MobActionPool;
