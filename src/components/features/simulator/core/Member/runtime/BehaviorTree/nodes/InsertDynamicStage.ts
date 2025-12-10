import { createId } from "@paralleldrive/cuid2";
import type { Context } from "~/lib/behavior3/context";
import { Node, type NodeDef, type Status } from "~/lib/behavior3/node";
import type { Tree } from "~/lib/behavior3/tree";
import type { MemberStateContext } from "../../StateMachine/types";

type TargetConfig = {
  pipelineName: string;
  afterStage: string;
  priority?: number;
  /**
   * 可选：对当前阶段输出做 T⇒T 数值变换的表达式
   * - targetPath: 需要写回的字段路径（优先从阶段输出读取）
   * - expression: 受限表达式，默认可用变量：x（原值）、input（阶段输出）、ctx（上下文）
   */
  targetPath?: string;
  expression?: string;
  description?: string;
};

const getByPath = (obj: any, path?: string) => {
  if (!obj || !path) return undefined;
  return path.split(".").reduce((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as any)[key];
    }
    return undefined;
  }, obj);
};

const setByPath = (obj: any, path: string, value: any) => {
  if (!path) return obj;
  const parts = path.split(".");
  let cursor = obj;
  for (let i = 0; i < parts.length; i++) {
    const key = parts[i];
    if (i === parts.length - 1) {
      (cursor as any)[key] = value;
      return obj;
    }
    if (!cursor[key] || typeof cursor[key] !== "object") {
      (cursor as any)[key] = {};
    }
    cursor = cursor[key];
  }
  return obj;
};

/**
 * InsertDynamicStage
 * 仅作用于当前成员的 pipelineManager，在指定阶段后插入动态阶段（T⇒T 转换）
 */
export class InsertDynamicStage extends Node {
  declare args: {
    readonly targets: TargetConfig[];
    /** 来源标识，默认 buff.id / owner.id */
    readonly source?: string;
  };

  override onTick<TContext extends MemberStateContext>(
    tree: Tree<Context, TContext>,
    status: Status,
  ): Status {
    const owner = tree.owner as TContext & {
      pipelineManager?: {
        insertDynamicStage?: Function;
        pipelineDef?: Record<string, readonly string[]>;
      };
    };

    const pipelineManager = owner?.pipelineManager as any;
    if (!pipelineManager?.insertDynamicStage) {
      this.error("InsertDynamicStage: 缺少 pipelineManager.insertDynamicStage");
      return "failure";
    }

    const targets = this.args?.targets ?? [];
    if (!Array.isArray(targets) || targets.length === 0) {
      this.error("InsertDynamicStage: targets 不能为空");
      return "failure";
    }

    const source =
      this.args?.source ??
      (owner as any).currentBuff?.id ??
      (owner as any).currentBuffId ??
      owner.id ??
      "bt_dynamic_stage";

    for (const target of targets) {
      if (!target?.pipelineName || !target.afterStage) {
        console.warn("[InsertDynamicStage] 缺少 pipelineName/afterStage，已跳过", target);
        continue;
      }

      // 校验插入点是否存在（如果能找到静态定义）
      const stageList = pipelineManager.pipelineDef?.[target.pipelineName];
      if (Array.isArray(stageList) && !stageList.includes(target.afterStage)) {
        console.warn(
          `[InsertDynamicStage] 管线 ${String(target.pipelineName)} 不包含阶段 ${String(target.afterStage)}，已跳过`,
        );
        continue;
      }

      const handler = (ctx: any, stageOutput: any) => {
        let nextOutput = stageOutput ?? {};

        // 可选：对阶段输出做一次受限表达式变换
        if (target.expression && target.targetPath) {
          const currentValue = getByPath(nextOutput, target.targetPath) ?? getByPath(ctx, target.targetPath);
          try {
            const evalCtx = {
              x: currentValue,
              input: stageOutput,
              ctx,
              ...ctx,
            };
            const newValue =
              typeof ctx.engine?.evaluateExpression === "function"
                ? ctx.engine.evaluateExpression(target.expression, evalCtx)
                : currentValue;

            // 写回到输出副本
            const cloned = typeof nextOutput === "object" && nextOutput !== null ? { ...nextOutput } : {};
            setByPath(cloned, target.targetPath, newValue);
            nextOutput = cloned;
          } catch (error) {
            console.error(
              `[InsertDynamicStage] 表达式执行失败 (${target.pipelineName}/${target.afterStage}):`,
              error,
            );
          }
        }

        return nextOutput;
      };

      const stageId = `${source}_${String(target.pipelineName)}_${String(target.afterStage)}_${createId()}`;
      pipelineManager.insertDynamicStage(
        target.pipelineName,
        target.afterStage,
        handler,
        stageId,
        source,
        target.priority ?? 0,
      );
    }

    return "success";
  }

  static override get descriptor(): NodeDef {
    return {
      name: "InsertDynamicStage",
      type: "Action",
      children: 0,
      status: ["success", "failure"],
      desc: "在指定管线阶段后插入动态阶段（仅作用当前成员）",
      args: [
        {
          name: "targets",
          type: "json",
          desc: "目标数组：{ pipelineName, afterStage, priority?, targetPath?, expression? }[]",
        },
        {
          name: "source",
          type: "string?",
          desc: "来源标识，默认 buff.id 或 owner.id",
        },
      ],
      doc: `
        + 仅作用当前成员的 pipelineManager
        + 对每个 target 在 afterStage 后插入一个动态阶段
        + 如果提供 targetPath + expression，则对阶段输出做一次 T⇒T 数值变换
        + 阶段来源统一使用 source，便于 removeStagesBySource 清理
      `,
    };
  }
}


