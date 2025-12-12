import type { IntentBuffer } from "../IntentSystem/IntentBuffer";
import type { MemberManager } from "../Member/MemberManager";
import SpaceManager from "./SpaceManager";

/**
 * AreaManager
 * 区域实例的生命周期与规则调度（当前为占位实现）
 */
export class AreaManager {
  constructor(
    private readonly spaceManager: SpaceManager,
    private readonly memberManager: MemberManager,
  ) {}

  /**
   * 每帧更新区域逻辑，向 intentBuffer 产出意图
   * 当前为占位实现
   */
  tick(_frame: number, _intentBuffer: IntentBuffer): void {
    // TODO: 实际区域逻辑在后续补充
    void this.spaceManager;
    void this.memberManager;
  }
}

export default AreaManager;

