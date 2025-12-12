import { createId } from "@paralleldrive/cuid2";
import type { Context } from "~/lib/behavior3/context";
import { Node, type NodeDef, type Status } from "~/lib/behavior3/node";
import type { Tree } from "~/lib/behavior3/tree";
import type { MemberStateContext } from "../../StateMachine/types";

type TargetConfig = {
  /** 动作组名称 */
  actionGroupName: string;
  /** 插入点：在哪个动作之后插入 */
  afterActionName: string;
  priority?: number;
  /** 插入的动作名称（actionName 视为唯一ID） */
  insertActionName: string;
  /** 插入动作的额外参数（会与 actionOutput 合并后作为输入） */
  params?: Record<string, unknown>;
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
 * 仅作用于当前成员的 actionManager，在指定动作后插入动态动作
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
      actionManager?: {
        insertDynamicStage?: Function;
        actionGroupDef?: Record<string, readonly string[]>;
        actionPool?: Record<string, readonly [any, any, Function]>;
      };
    };

    if (!owner.intentBuffer) {
      this.error("InsertDynamicStage: owner.intentBuffer is required to push Intent");
      return "failure";
    }

    const actionManager = owner?.actionManager as any;
    if (!actionManager?.actionPool) {
      this.error("InsertDynamicStage: 缺少 owner.actionManager.actionPool");
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
      const { actionGroupName, afterActionName } = target;
      if (!actionGroupName || !afterActionName || !target.insertActionName) {
        console.warn("[InsertDynamicStage] 缺少 actionGroupName/afterActionName/insertActionName，已跳过", target);
        continue;
      }

      // 校验插入点是否存在（如果能找到静态定义）
      const actionList = actionManager.actionGroupDef?.[actionGroupName];
      if (Array.isArray(actionList) && !actionList.includes(afterActionName)) {
        console.warn(
          `[InsertDynamicStage] 动作组 ${String(actionGroupName)} 不包含动作 ${String(afterActionName)}，已跳过`,
        );
        continue;
      }

      const stageId = `${source}_${String(actionGroupName)}_${String(afterActionName)}_${createId()}`;
      const insertStageName = target.insertActionName;

      // 只存 stageName，不存 handler；params 作为纯数据交给 ActionManager 在执行前合并
      owner.intentBuffer.push({
        type: "insertPipelineStage",
        source,
        actorId: owner.id,
        targetId: owner.id,
        pipeline: actionGroupName,
        afterStage: afterActionName,
        insertStage: insertStageName,
        params: target.params ?? undefined,
        stageId,
        priority: target.priority ?? 0,
      } as any);
    }

    return "success";
  }

  static override get descriptor(): NodeDef {
    return {
      name: "InsertDynamicStage",
      type: "Action",
      children: 0,
      status: ["success", "failure"],
      desc: "在指定动作后插入动态动作（仅作用当前成员）",
      args: [
        {
          name: "targets",
          type: "json",
          desc: "目标数组：{ actionGroupName, afterActionName, insertActionName, params?, priority? }[]",
        },
        {
          name: "source",
          type: "string?",
          desc: "来源标识，默认 buff.id 或 owner.id",
        },
      ],
      doc: `
        + 仅作用当前成员的 actionManager
        + 仅支持插入 action（insertActionName + params）
        + 阶段来源统一使用 source，便于 removeStagesBySource 清理
      `,
    };
  }
}


