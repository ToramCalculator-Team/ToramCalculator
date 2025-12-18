/**
 * Procedure 定义块补丁
 * 限制函数体的 STACK 输入，禁止 BT 节点（BT_NODE_TYPE）进入函数体
 * 
 * 原理：
 * - BT 节点的 previous/next check 为 BT_NODE_TYPE
 * - 设置 STACK 的 check 为 "PROC_BODY" 后，BT_NODE_TYPE 无法匹配，因此无法连接
 * - 普通语句块的 previous check 通常为 null，与有 check 的输入仍可连接（Blockly 规则）
 * 
 * 注意：此 patch 需要在 "blockly/blocks" 导入后执行，确保 procedures 块已定义
 */

import { Blocks } from "blockly/core";

// 函数体语句类型标识
const PROC_BODY_TYPE = "PROC_BODY";

/**
 * 包装 procedure 定义块的 init 函数，添加 STACK 输入类型限制
 */
function patchProcedureDefBlock(blockType: "procedures_defnoreturn" | "procedures_defreturn"): void {
  const originalBlock = Blocks[blockType];
  if (!originalBlock || !originalBlock.init) {
    // 如果块还未定义，延迟执行（可能在 HMR 或延迟加载场景）
    setTimeout(() => {
      const retryBlock = Blocks[blockType];
      if (retryBlock && retryBlock.init) {
        patchProcedureDefBlock(blockType);
      } else {
        console.warn(`[procedureBlocksPatch] 无法找到 ${blockType} 块定义（延迟重试后仍失败）`);
      }
    }, 0);
    return;
  }

  const originalInit = originalBlock.init;

  Blocks[blockType] = {
    ...originalBlock,
    init: function () {
      // 调用原始 init
      originalInit.call(this);

      // 获取 STACK 输入（函数体输入）
      const stackInput = this.getInput("STACK");
      if (stackInput) {
        // 设置类型检查，阻止 BT_NODE_TYPE 连接
        stackInput.setCheck(PROC_BODY_TYPE);
      } else {
        console.warn(`[procedureBlocksPatch] ${blockType} 块没有找到 STACK 输入`);
      }
    },
  };
}

// 在模块加载时执行 patch
// 由于 LogicEditor.tsx 中已导入 "blockly/blocks"，procedures 块应该已定义
patchProcedureDefBlock("procedures_defnoreturn");
patchProcedureDefBlock("procedures_defreturn");



