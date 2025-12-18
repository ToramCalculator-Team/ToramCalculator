/**
 * FUNCTIONS 动态分类：合并预置函数与用户自定义 procedures
 */

// FlyoutDefinition 类型定义
type FlyoutDefinition = {
  kind: "flyoutToolbox";
  contents: Array<{
    type?: string;
    fields?: Record<string, any>;
    kind: "block" | "label";
    text?: string;
  }>;
};
import { buildPlayerActionMetas, type ActionMeta } from "./actionBlocks";

/**
 * 获取预置函数列表（从 actionPool 中提取）
 */
export function getBuiltinFunctionNames(): string[] {
  const actionMetas = buildPlayerActionMetas();
  return actionMetas.map((meta) => meta.name);
}

/**
 * 为预置函数创建 fn_call 积木配置
 */
export function createBuiltinFunctionCallBlocks(): FlyoutDefinition["contents"] {
  const functionNames = getBuiltinFunctionNames();
  
  return functionNames.map((name) => ({
    type: "fn_call",
    fields: {
      FUNCTION_NAME: name,
    },
    kind: "block" as const,
  }));
}

/**
 * FUNCTIONS 分类的 flyout 内容生成器
 * 合并预置函数调用块和用户自定义 procedures
 */
export function createFunctionsFlyout(workspace: any): FlyoutDefinition {
  const blocks: FlyoutDefinition["contents"] = [];

  // 1. 添加预置函数调用块
  const builtinBlocks = createBuiltinFunctionCallBlocks();
  blocks.push(...builtinBlocks);

  // 2. 添加分隔符（如果有预置函数和自定义函数）
  const procedureMap = workspace.getProcedureMap();
  const procedures = Array.from(procedureMap.values());
  if (builtinBlocks.length > 0 && procedures.length > 0) {
    blocks.push({
      kind: "label" as const,
      text: "自定义函数",
    });
  }

  // 3. 添加用户自定义 procedure 调用块
  // Blockly 的 procedures_call_return 和 procedures_call_noreturn 会自动出现在 PROCEDURE 分类中
  // 我们需要手动创建这些块
  for (const procModel of procedures) {
    if (!procModel) continue;

    // 类型断言：procModel 应该有 getReturnTypes 和 getName 方法
    const model = procModel as any;
    if (typeof model.getReturnTypes !== "function" || typeof model.getName !== "function") {
      continue;
    }

    const hasReturn = model.getReturnTypes().length > 0;
    const blockType = hasReturn ? "procedures_call_return" : "procedures_call_noreturn";

    blocks.push({
      type: blockType,
      fields: {
        NAME: model.getName(),
      },
      kind: "block" as const,
    });
  }

  return {
    kind: "flyoutToolbox",
    contents: blocks,
  };
}

