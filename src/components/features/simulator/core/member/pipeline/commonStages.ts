import { z } from "zod/v4";
import { defineStage, type StagePool } from "../../pipeline/PipelineStageType";
import type { MemberStateContext } from "../behaviorTree/MemberStateContext";
import type { BuffManager } from "../../buff/BuffManager";

export interface BuffOperableContext extends MemberStateContext {
  name: string;
  buffManager: BuffManager;
  currentSkill?: { id?: string | null } | null;
}

const logLv = 0; // 0: 不输出日志, 1: 输出关键日志, 2: 输出所有日志

export const commonMemberStages = {
} as const satisfies StagePool<MemberStateContext>;
