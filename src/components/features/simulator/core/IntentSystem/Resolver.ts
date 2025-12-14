import type { Intent, InsertPipelineStageIntent, RemovePipelineStagesBySourceIntent } from "./Intent";
import type World from "../World/World";
import type { Member } from "../Member/Member";

type IntentExecResult =
  | { intent: Intent; status: "ok" }
  | { intent: Intent; status: "skipped"; reason: string };

/**
 * Resolver：Intent 执行器
 * 默认按产出顺序执行；需要时可在上层对 Intent 做排序/裁决后再传入
 */
export class Resolver {
  commit(intents: Intent[], world: World): IntentExecResult[] {
    const results: IntentExecResult[] = [];
    for (const intent of intents) {
      try {
        this.executeIntent(intent, world);
        results.push({ intent, status: "ok" });
      } catch (error) {
        results.push({ intent, status: "skipped", reason: (error as Error)?.message ?? String(error) });
      }
    }
    return results;
  }

  private executeIntent(intent: Intent, world: World) {
    switch (intent.type) {
      case "sendFsmEvent":
        return this.execSendFsmEvent(intent, world);
      case "runPipeline":
        return this.execRunPipeline(intent, world);
      case "addBuff":
        return this.execAddBuff(intent, world);
      case "removeBuff":
        return this.execRemoveBuff(intent, world);
      case "modifyStat":
        return this.execModifyStat(intent, world);
      case "insertPipelineStage":
        return this.execInsertPipelineStage(intent, world);
      case "removePipelineStagesBySource":
        return this.execRemovePipelineStagesBySource(intent, world);
      default:
        throw new Error(`Unknown intent type: ${(intent as Intent).type}`);
    }
  }

  private getMember(world: World, memberId?: string): Member<any, any, any, any> | null {
    if (!memberId) return null;
    return (world.memberManager.getMember(memberId) as Member<any, any, any, any> | null) ?? null;
  }

  private execSendFsmEvent(intent: Intent, world: World) {
    const member = this.getMember(world, intent.targetId ?? intent.actorId);
    if (!member?.actor) return;
    member.actor.send((intent as any).event);
  }

  private execRunPipeline(intent: Intent, world: World) {
    const member = this.getMember(world, intent.actorId);
    if (!member?.pipelineManager || !member?.actor) return;
    const pipelineIntent = intent as any;
    const snapshot = member.actor.getSnapshot();
    const ctx = (snapshot as any)?.context ?? {};
    // PipelineManager.run 会基于 ctx 生成 working copy 并返回 { ctx: newCtx, actionOutputs }。
    // 如果不把 newCtx 合并回状态机 context，后续行为树表达式（如 buffExists / currentSkillStartupFrames）将读不到这些计算结果。
    const { ctx: newCtx } = member.pipelineManager.run(pipelineIntent.pipeline, ctx, pipelineIntent.params ?? {});
    if (newCtx && typeof newCtx === "object") {
      Object.assign(ctx, newCtx);
    }
  }

  private execAddBuff(intent: Intent, world: World) {
    const member = this.getMember(world, intent.targetId);
    if (!member?.buffManager) return;
    const addBuffIntent = intent as any;
    if (addBuffIntent.replaceIfExists && member.buffManager.hasBuff(addBuffIntent.buff.id)) {
      member.buffManager.removeBuff(addBuffIntent.buff.id);
    }
    member.buffManager.addBuff(addBuffIntent.buff);
  }

  private execRemoveBuff(intent: Intent, world: World) {
    const member = this.getMember(world, intent.targetId);
    if (!member?.buffManager) return;
    const removeBuffIntent = intent as any;
    member.buffManager.removeBuff(removeBuffIntent.buffId);
  }

  private execModifyStat(intent: Intent, world: World) {
    const member = this.getMember(world, intent.targetId);
    if (!member?.statContainer) return;
    const modifyIntent = intent as any;
    for (const change of modifyIntent.changes ?? []) {
      member.statContainer.addModifier(change.path, change.modifierType, change.value, {
        id: intent.source,
        name: intent.source,
        type: "skill",
      });
    }
  }

  private execInsertPipelineStage(intent: InsertPipelineStageIntent, world: World) {
    const member = this.getMember(world, intent.targetId ?? intent.actorId);
    if (!member?.pipelineManager) return;
    const manager: any = member.pipelineManager;
    if (typeof manager.insertPipelineStage === "function") {
      manager.insertPipelineStage(
        intent.pipeline,
        intent.afterStage,
        intent.insertStage,
        intent.stageId,
        intent.source,
        intent.params ?? undefined,
        intent.priority ?? 0,
      );
      return;
    }
    throw new Error("PipelineManager missing insertPipelineStage API");
  }

  private execRemovePipelineStagesBySource(intent: RemovePipelineStagesBySourceIntent, world: World) {
    const member = this.getMember(world, intent.targetId ?? intent.actorId);
    if (!member?.pipelineManager) return;
    const manager: any = member.pipelineManager;
    if (typeof manager.removeStagesBySource === "function") {
      manager.removePipelineStagesBySource(intent.removeSource);
      return;
    }
  }
}

export default Resolver;

