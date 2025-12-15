import type Resolver from "../IntentSystem/Resolver";
import type IntentBuffer from "../IntentSystem/IntentBuffer";
import type { MemberManager } from "../Member/MemberManager";
import type AreaManager from "./AreaManager";
import type SpaceManager from "./SpaceManager";

/**
 * World/Scene 容器：聚合成员/区域/空间系统 + Intent/Resolver
 */
export class World {
  constructor(
    public readonly memberManager: MemberManager,
    public readonly spaceManager: SpaceManager,
    public readonly areaManager: AreaManager,
    public readonly intentBuffer: IntentBuffer,
    public readonly resolver: Resolver,
  ) {}

  /**
   * 每帧 tick：成员 → 区域 → 统一执行 Intent
   */
  tick(frame: number): void {
    // console.log(`🌍 [World] tick: ${frame}`);
    const members = this.memberManager.getAllMembers();
    for (const member of members) {
      member.tick(frame, this.intentBuffer);
    }

    // 区域更新（当前占位实现）
    this.areaManager.tick(frame, this.intentBuffer);

    // 统一执行 Intent
    // 重要：在 commit 过程中（例如 sendFsmEvent -> 状态机 action -> 行为树节点），可能会继续向 intentBuffer push 新 intent。
    // 如果只 drain 一次，这些“本帧新增 intent”会被延迟到下一帧，导致顺序/依赖错误（典型：RunPipeline 的输出被后续逻辑依赖）。
    // 这里改为“循环 drain -> commit，直到 buffer 为空”，并加安全上限防止死循环。
    let guard = 0;
    while (guard++ < 100) {
      const intents = this.intentBuffer.drain();
      if (intents.length === 0) break;
      this.resolver.commit(intents, this);
    }
    if (guard >= 100) {
      console.error(`❌ [World] Intent 执行超过安全上限(100轮)，可能存在循环产出。frame=${frame}`);
    }
  }
}

export default World;
