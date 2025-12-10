import type { MemberStateContext } from "../StateMachine/types";
import type { PlayerPipelineDef } from "../../types/Player/PlayerPipelines";
import type { TreeData } from "~/lib/behavior3/tree";
import { BehaviorTreeHost } from "../BehaviorTree/BehaviorTreeHost";
import { magicCannonSkillEffect } from "../BehaviorTree/testSkill";

interface SkillLogicRunnerOptions {
  owner: MemberStateContext & {
    pipelineManager?: {
      pipelineDef: PlayerPipelineDef;
      run: Function;
      registerPipelines?: (custom: { name: string; stages: string[] }[], source?: string) => () => void;
      setSkillOverrides?: (overrides?: Record<string, string[]>) => void;
      clearSkillOverrides?: () => void;
    };
  };
  logic: unknown;
  skillId?: string | number | null;
}

type SkillLogicConfig = {
  version?: number;
  startPipeline: string;
  endPipeline?: string;
  customPipelines?: { name: string; stages: string[]; desc?: string; displayName?: string }[];
};

const isSkillLogicConfig = (logic: unknown): logic is SkillLogicConfig => {
  return !!logic && typeof logic === "object" && "startPipeline" in (logic as any);
};

const isBehaviorTreeLogic = (logic: unknown): logic is TreeData => {
  return !!logic && typeof logic === "object" && "root" in (logic as any);
};

const getBehaviorTreeHost = (owner: MemberStateContext) => {
  if (!owner.behaviorTreeHost) {
    (owner as any).behaviorTreeHost = new BehaviorTreeHost(owner);
  }
  return owner.behaviorTreeHost;
};

const applyCustomPipelines = (
  owner: SkillLogicRunnerOptions["owner"],
  custom?: { name: string; stages: string[] }[],
) => {
  if (!owner?.pipelineManager?.setSkillOverrides || !custom?.length) {
    return () => {};
  }
  const skillOverrides: Record<string, string[]> = {};
  for (const cp of custom) {
    if (!cp?.name || !Array.isArray(cp.stages)) continue;
    skillOverrides[cp.name] = cp.stages;
  }
  owner.pipelineManager.setSkillOverrides?.(skillOverrides as any);
  return () => owner.pipelineManager?.clearSkillOverrides?.();
};

export function runSkillLogic(options: SkillLogicRunnerOptions): { status: "success" | "failure"; error?: unknown } {
  const { owner, logic, skillId } = options;

  const rawLogic = logic;
  let btLogic: TreeData | null = null;

  // logic 为空或空字符串时，使用默认技能行为树
  if (
    rawLogic == null ||
    (typeof rawLogic === "string" && rawLogic.trim() === "") ||
    (typeof rawLogic === "object" && Object.keys(rawLogic as any).length === 0)
  ) {
    btLogic = magicCannonSkillEffect.logic;
  } else if (isBehaviorTreeLogic(rawLogic)) {
    btLogic = rawLogic;
  }

  // 行为树逻辑：挂载 skill BT，首次 tick；返回 BT 结果
  if (btLogic) {
    const cleanup = applyCustomPipelines(owner, (btLogic as any).customPipelines);
    try {
      const host = getBehaviorTreeHost(owner);
      const inst = host?.addTree(btLogic, "skill", String(skillId ?? (owner as any).currentSkill?.id ?? "skill_bt"));
      const status = inst?.tree.tick();
      return { status: status === "failure" ? "failure" : "success" };
    } catch (error) {
      console.error("SkillLogic 行为树执行失败:", error);
      return { status: "failure", error };
    } finally {
      cleanup?.();
    }
  }

  // 配置模式：仅当原始 logic 是配置对象时才走这里
  if (isSkillLogicConfig(rawLogic)) {
    const cfg = rawLogic;
    if (!owner.pipelineManager) {
      throw new Error("缺少 pipelineManager");
    }

    const skillOverrides: Record<string, string[]> = {};
    for (const cp of cfg.customPipelines ?? []) {
      if (!cp?.name || !Array.isArray(cp.stages)) continue;
      skillOverrides[cp.name] = cp.stages;
    }

    const pm = owner.pipelineManager as any;
    pm.setSkillOverrides?.(skillOverrides);

    try {
      pm.run(cfg.startPipeline as any, owner as any, {});
      return { status: "success" };
    } catch (error) {
      console.error("SkillLogic 配置模式执行失败:", error);
      return { status: "failure", error };
    } finally {
      pm.clearSkillOverrides?.();
    }
  }

  // 其他类型视为无效逻辑
  throw new Error("SkillLogic 不支持的逻辑类型：仅支持行为树或配置模式");
}
