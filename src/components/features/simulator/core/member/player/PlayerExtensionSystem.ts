import { TypeSafeExtensionSystem, ExtensionFunction } from "../ExtensionSystem";

/**
 * 直接定义 PlayerStateMachine 中的 Action 和 Guard 名称
 * 由于 XState 的类型推导比较复杂，这里手动维护清单更简单可靠
 */
export type PlayerActionNames = 
  | "根据角色配置生成初始状态"
  | "休息动画"
  | "前摇动画"
  | "扣除技能消耗"
  | "写入前摇结束通知事件"
  | "蓄力动画"
  | "写入蓄力结束通知事件"
  | "后摇动画"
  | "写入后摇结束通知事件"
  | "在当前帧写入技能效果事件"
  | "重置角色状态";

export type PlayerGuardNames = 
  | "技能在冷却中"
  | "有蓄力动作";

/**
 * Player 状态机的扩展系统实例
 * 使用手动定义的扩展点名称确保类型安全
 */
export const playerExtensions = new TypeSafeExtensionSystem<
  any, // 简化配置类型，专注于扩展功能
  PlayerActionNames,
  PlayerGuardNames
>();

/**
 * 注册 Player 状态机扩展函数的便捷接口
 */
export const registerPlayerExtension = {
  /**
   * 为任意 Action 注册扩展函数
   * @param actionName Action 名称（类型安全，只能是状态机中存在的）
   * @param extension 扩展函数
   */
  action: <TOutput>(actionName: PlayerActionNames, extension: ExtensionFunction<any, any, TOutput>) => {
    playerExtensions.addActionExtension(actionName, extension);
  },

  /**
   * 为任意 Guard 注册扩展函数
   * @param guardName Guard 名称（类型安全，只能是状态机中存在的）
   * @param extension 扩展函数
   */
  guard: (guardName: PlayerGuardNames, extension: ExtensionFunction<any, any, boolean>) => {
    playerExtensions.addGuardExtension(guardName, extension);
  },
};

/**
 * 获取所有可用的扩展点
 * 用于 Blockly 或其他动态系统
 */
export const getAvailableExtensionPoints = () => ({
  actions: playerExtensions.getAvailableActionNames(),
  guards: playerExtensions.getAvailableGuardNames(),
});

/**
 * 运行 Action 扩展
 * 状态机内部使用
 */
export const runActionExtensions = <TOutput>(
  actionName: PlayerActionNames,
  baseOutput: TOutput,
  context: any,
  event: any,
): TOutput => {
  return playerExtensions.runActionExtensions(actionName, baseOutput, context, event);
};

/**
 * 运行 Guard 扩展
 * 状态机内部使用
 */
export const runGuardExtensions = <TOutput>(
  guardName: PlayerGuardNames,
  baseResult: TOutput,
  context: any,
  event: any,
): TOutput => {
  return playerExtensions.runGuardExtensions(guardName, baseResult, context, event);
};