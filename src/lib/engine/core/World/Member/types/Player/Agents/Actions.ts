import { z } from "zod/v4";
import { createLogger } from "~/lib/Logger";
import { State } from "~/lib/mistreevous/State";
import { ExpressionTransformer } from "../../../../../JSProcessor/ExpressionTransformer";
import type { ExpressionContext } from "../../../../../JSProcessor/types";
import type { DamageAreaRequest, DamageRangeParams, DamageWarningZone } from "../../../../Area/types";
import type { BtContext } from "../../../runtime/BehaviourTree/BtManagerEnv";
import type { ActionPool } from "../../../runtime/Agent/type";
import { defineAction } from "../../../runtime/Agent/type";
import { ModifierType, StatModifierParamSchema } from "../../../runtime/StatContainer/StatContainer";

type PlayerBtContext = BtContext & Record<string, unknown>;

const log = createLogger("PlayerSkillBehaviorActions");
export const PlayerActionPool = {} as const satisfies ActionPool<PlayerBtContext>;

export type PlayerActionPool = typeof PlayerActionPool;
