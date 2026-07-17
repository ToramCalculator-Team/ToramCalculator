import type { ConditionPool } from "../../../runtime/Agent/type";
import type { BtContext } from "../../../runtime/BehaviourTree/BtManagerEnv";

export const MobConditionPool = {} as const satisfies ConditionPool<BtContext & Record<string, unknown>>;

export type MobConditionPool = typeof MobConditionPool;
