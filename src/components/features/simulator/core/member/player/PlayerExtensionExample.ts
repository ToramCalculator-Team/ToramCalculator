import { registerPlayerExtension } from "./PlayerExtensionSystem";

/**
 * 使用示例：注册玩家状态机的扩展函数
 * 展示如何为现有的 Action 和 Guard 添加自定义逻辑
 */

// 示例1：为技能消耗扣除添加魔法炮充填机制
registerPlayerExtension.action("扣除技能消耗", (output: any, context: any, event: any) => {
  console.log("[扩展] 技能消耗扣除扩展被调用", { output, skillId: event.data?.skillId });
  
  // 如果是魔法炮且有充填状态，减少MP消耗
  if (event.data?.skillId === "魔法炮" && context.buffManager?.hasBuff?.("充填")) {
    const modifiedOutput = { ...output as object };
    if ((modifiedOutput as any).mpCost) {
      (modifiedOutput as any).mpCost = Math.max(0, (modifiedOutput as any).mpCost - 50);
      console.log("[扩展] 魔法炮充填：MP消耗减少50", { 
        原始: (output as any).mpCost, 
        修改后: (modifiedOutput as any).mpCost 
      });
    }
    return modifiedOutput;
  }
  
  return output;
});

// 示例2：为技能冷却检查添加急速冷却机制
registerPlayerExtension.guard("技能在冷却中", (baseResult, context, event) => {
  console.log("[扩展] 技能冷却检查扩展被调用", { baseResult, skillId: event.data?.skillId });
  
  // 如果有急速冷却buff，忽略冷却时间
  if (context.buffManager?.hasBuff?.("急速冷却")) {
    console.log("[扩展] 急速冷却：忽略技能冷却");
    return false; // 强制设为不在冷却中
  }
  
  return baseResult;
});

// 示例3：为前摇动画添加特效处理
registerPlayerExtension.action("前摇动画", (output, context, event) => {
  console.log("[扩展] 前摇动画扩展被调用", { skillId: event.data?.skillId });
  
  // 如果是特殊技能，添加额外的视觉效果
  const skillId = event.data?.skillId;
  if (skillId === "魔法炮" || skillId === "终极技能") {
    console.log("[扩展] 播放特殊技能前摇特效", { skillId });
    // 这里可以触发特殊的渲染命令
  }
  
  return output;
});

// 示例4：Blockly 生成的扩展函数示例
const blocklyGeneratedExtension = (output: any, context: any, event: any) => {
  // 这是 Blockly 可能生成的逻辑
  if (context.member?.name === "魔法师" && event.data?.skillId?.includes("火")) {
    console.log("[Blockly扩展] 火系魔法师技能消耗减少20%");
    return {
      ...output,
      mpCost: output.mpCost ? output.mpCost * 0.8 : 0
    };
  }
  return output;
};

// 注册 Blockly 生成的扩展
registerPlayerExtension.action("扣除技能消耗", blocklyGeneratedExtension);

export { }; // 确保这是一个模块
