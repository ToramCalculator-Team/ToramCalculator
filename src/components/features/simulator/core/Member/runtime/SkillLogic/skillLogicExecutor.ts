import { createId } from "@paralleldrive/cuid2";
import type { CustomPipelineMeta } from "~/components/features/logicEditor/blocks/meta";
import { compileSkillLogicToJS } from "./skillLogicCompiler";
import type { MemberStateContext } from "../StateMachine/types";
import { PlayerPipelineStages, type PlayerPipelineDef } from "../../types/Player/PlayerPipelines";
import type { PipelineStage } from "../Pipeline/PipelineStageType";

type StagePool = typeof PlayerPipelineStages;

/**
 * 缺省技能逻辑（无 logic 时使用）
 * 约定：包裹在 main 函数内并显式结束技能
 */
const DEFAULT_SKILL_LOGIC = `
function main() {
  ctx.runPipeline("前摇", { mpCost: ctx.runStage("技能MP消耗", {}).skillMpCostResult, hpCost: ctx.runStage("技能HP消耗", {}).skillHpCostResult });
  ctx.runPipeline("蓄力", {});
  ctx.runPipeline("咏唱", {});
  ctx.runPipeline("发动", {});
  (function(){const d=0; if(d>0){ctx.scheduleFunction(d,"__skill_finish__", { status: "success" }, "finish_skill");} else {ctx.finishSkill("success");}})();
}
`.trim();

interface SkillLogicRunnerOptions {
  owner: MemberStateContext & {
    pipelineManager?: {
      pipelineDef: PlayerPipelineDef;
      stagePool: StagePool;
      run: Function;
      registerPipelines?: (custom: CustomPipelineMeta[], source?: string) => () => void;
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

const compiledCache = new Map<string, { compiledCode: string; customPipelines: CustomPipelineMeta[] }>();

const normalizeCacheKey = (logic: unknown, skillId?: string | number | null) => {
  if (logic == null) return `skill:${skillId ?? "unknown"}:empty`;
  if (typeof logic === "string") return logic;
  try {
    return JSON.stringify(logic);
  } catch {
    return `skill:${skillId ?? "unknown"}:unstringifiable`;
  }
};

const runStage = (
  stageName: string,
  stagePool: Record<string, PipelineStage<any, any, any>>,
  owner: MemberStateContext,
  input: any,
) => {
  const stage = stagePool[stageName];
  if (!stage) {
    throw new Error(`阶段不存在: ${stageName}`);
  }

  const [inputSchema, outputSchema, impl] = stage;
  let stageInput = input ?? {};

  if (inputSchema) {
    const parsed = (inputSchema as any).safeParse(stageInput);
    if (!parsed.success) {
      throw new Error(`[${stageName}] 输入验证失败: ${parsed.error.message}`);
    }
    stageInput = parsed.data;
  }

  let stageOut = impl ? impl(owner as any, stageInput) : stageInput;

  if (outputSchema) {
    const parsed = (outputSchema as any).safeParse(stageOut);
    if (!parsed.success) {
      throw new Error(`[${stageName}] 输出验证失败: ${parsed.error.message}`);
    }
    stageOut = parsed.data;
    Object.assign(owner, stageOut);
  } else if (stageOut && typeof stageOut === "object") {
    Object.assign(owner, stageOut);
  }

  return stageOut;
};

const runCustomPipeline = (
  pipelineName: string,
  def: CustomPipelineMeta,
  stagePool: Record<string, PipelineStage<any, any, any>>,
  owner: MemberStateContext,
  params?: Record<string, unknown>,
) => {
  let prev = params ?? {};

  for (const stageName of def.stages) {
    prev = runStage(stageName, stagePool, owner, prev);
  }

  return prev;
};

const schedulePipeline = (
  owner: MemberStateContext,
  delayFrames: number,
  pipelineName: string,
  params?: Record<string, unknown>,
  source?: string,
) => {
  const queue = owner.engine.getEventQueue?.();
  if (!queue) {
    console.warn(`⚠️ [${owner.name}] 无法获取事件队列，无法调度管线 ${pipelineName}`);
    return;
  }

  const executeFrame = owner.currentFrame + Math.max(1, Number(delayFrames) || 0);
  queue.insert({
    id: createId(),
    type: "member_pipeline_event",
    executeFrame,
    insertFrame: owner.currentFrame,
    processed: false,
    payload: {
      targetMemberId: owner.id,
      pipelineName,
      params,
      skillId: (owner as any).currentSkill?.id ?? "unknown_skill",
      source: source ?? "skill_logic",
    },
  });
};

const scheduleFunction = (
  owner: MemberStateContext,
  delayFrames: number,
  functionName: string,
  params?: Record<string, unknown>,
  source?: string,
) => {
  // 特殊保留名：__skill_finish__ 用于延迟结束技能
  if (functionName === "__skill_finish__") {
    const status = (params as any)?.status === "failure" ? "failure" : "success";
    owner.engine.dispatchMemberEvent(
      owner.id,
      "技能执行完成",
      { status },
      Math.max(0, Number(delayFrames) || 0),
      (owner as any).currentSkill?.id ?? "unknown_skill",
      { source: source ?? "skill_logic_finish" },
    );
    return;
  }

  // 其它函数仍沿用管线事件通道
  schedulePipeline(owner, delayFrames, functionName, params, source ?? "scheduled_function");
};

export function runSkillLogic(options: SkillLogicRunnerOptions): { status: "success" | "failure"; error?: unknown } {
  const { owner, logic, skillId } = options;

  const cacheKey = normalizeCacheKey(logic, skillId);
  let cached = compiledCache.get(cacheKey);

  if (!cached) {
    if (isSkillLogicConfig(logic)) {
      // 配置模式不做编译缓存
      cached = { compiledCode: "", customPipelines: [] };
    } else {
      const useDefault = !logic || (typeof logic === "string" && (logic as string).trim() === "");

      if (useDefault) {
        cached = { compiledCode: DEFAULT_SKILL_LOGIC, customPipelines: [] };
      } else if (typeof logic === "string") {
        cached = { compiledCode: logic as string, customPipelines: [] };
      } else {
        const compiled = compileSkillLogicToJS(logic);
        if (compiled && compiled.code.trim()) {
          cached = { compiledCode: compiled.code, customPipelines: compiled.customPipelines };
        } else {
          cached = { compiledCode: DEFAULT_SKILL_LOGIC, customPipelines: [] };
        }
      }

      compiledCache.set(cacheKey, cached);
    }
  }

  // 配置模式：注册自定义管线并运行 startPipeline
  if (isSkillLogicConfig(logic)) {
    const cfg = logic;
    const cleanup =
      owner.pipelineManager?.registerPipelines?.(cfg.customPipelines ?? [], String(skillId ?? "skill_logic")) ?? (() => {});

    try {
      const pipelineDef = owner.pipelineManager?.pipelineDef as Record<string, unknown> | undefined;
      if (!pipelineDef || !(cfg.startPipeline in pipelineDef)) {
        throw new Error(`找不到起始管线: ${cfg.startPipeline}`);
      }
      if (!owner.pipelineManager) {
        throw new Error("缺少 pipelineManager");
      }
      // 入口参数：默认空对象，后续阶段依赖 ctx（已在 PipelineManager.run 合并初始参数到 ctx）
      owner.pipelineManager.run(cfg.startPipeline as any, owner as any, {});
      return { status: "success" };
    } catch (error) {
      console.error("SkillLogic 配置模式执行失败:", error);
      return { status: "failure", error };
    } finally {
      cleanup();
    }
  }

  try {
    // 自动调用 main（若存在），免去逻辑内显式调用
    const compiledSource = `${cached.compiledCode}\n;if (typeof main === "function") { main(); }`;
    const compiledCode = owner.engine.compileScript(compiledSource, owner.id, owner.targetId);
    const runner = owner.engine.createExpressionRunner(compiledCode);

    const customPipelineMap = new Map<string, CustomPipelineMeta>(
      (cached.customPipelines ?? []).map((cp) => [cp.name, cp]),
    );
    const stagePool =
      owner.pipelineManager?.stagePool ?? (PlayerPipelineStages as Record<string, PipelineStage<any, any, any>>);

    let finished = false;
    const finishSkill = (status: "success" | "failure" = "success") => {
      if (finished) return;
      finished = true;
      owner.engine.dispatchMemberEvent(
        owner.id,
        "技能执行完成",
        { status },
        0,
        String(skillId ?? (owner as any).currentSkill?.id ?? "unknown_skill"),
        { source: "skill_logic" },
      );
    };

    const ctx = {
      ...owner,
      casterId: owner.id,
      targetId: owner.targetId,
      engine: owner.engine,
      runPipeline: (pipelineName: string, params?: Record<string, unknown>) => {
        if (owner.pipelineManager?.pipelineDef && pipelineName in owner.pipelineManager.pipelineDef) {
          const result = owner.pipelineManager.run(pipelineName as keyof PlayerPipelineDef, owner as any, params);
          if (result?.ctx) {
            Object.assign(owner, result.ctx);
          }
          return result?.stageOutputs;
        }

        const customDef = customPipelineMap.get(pipelineName);
        if (customDef) {
          return runCustomPipeline(pipelineName, customDef, stagePool, owner, params);
        }

        throw new Error(`找不到管线: ${pipelineName}`);
      },
      runStage: (stageName: string, params?: Record<string, unknown>) => runStage(stageName, stagePool, owner, params),
      schedulePipeline: (
        delayFrames: number,
        pipelineName: string,
        params?: Record<string, unknown>,
        source?: string,
      ) => schedulePipeline(owner, delayFrames, pipelineName, params, source),
      scheduleFunction: (
        delayFrames: number,
        functionName: string,
        params?: Record<string, unknown>,
        source?: string,
      ) => scheduleFunction(owner, delayFrames, functionName, params, source),
      finishSkill,
    };

    runner(ctx as any);

    finishSkill("success");
    return { status: "success" };
  } catch (error) {
    console.error("SkillLogic 执行失败:", error);
    try {
      owner.engine.dispatchMemberEvent(
        owner.id,
        "技能执行完成",
        { status: "failure" },
        0,
        String(skillId ?? (owner as any).currentSkill?.id ?? "unknown_skill"),
        { source: "skill_logic" },
      );
    } catch {
      // ignore dispatch failure
    }
    return { status: "failure", error };
  }
}
