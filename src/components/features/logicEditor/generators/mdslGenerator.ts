/**
 * MDSL Generator：将 Blockly workspace 转换为 MDSL definition 文本
 */

import { Workspace } from "blockly/core";
import { decodeFunctionCallBlockId } from "../blocks/functionCallBlocks";

export class MDSLGenerator {
  private indentLevel = 0;
  private readonly indentSize = 4;

  /**
   * 生成缩进字符串
   */
  private indent(): string {
    return " ".repeat(this.indentLevel * this.indentSize);
  }

  /**
   * 增加缩进
   */
  private increaseIndent(): void {
    this.indentLevel++;
  }

  /**
   * 减少缩进
   */
  private decreaseIndent(): void {
    this.indentLevel = Math.max(0, this.indentLevel - 1);
  }

  /**
   * 从 workspace 生成 MDSL definition
   */
  workspaceToCode(workspace: Workspace): string {
    this.indentLevel = 0;
    const rootBlocks = workspace.getBlocksByType("bt_root", false);
    
    if (rootBlocks.length === 0) {
      return ""; // 没有根节点
    }

    const definitions: string[] = [];

    for (const rootBlock of rootBlocks) {
      const rootName = rootBlock.getFieldValue("NAME") || "skill_bt";
      const rootDesc = rootBlock.getFieldValue("DESC") || "";
      const rootChild = rootBlock.getInputTargetBlock("ROOT");

      if (!rootChild) {
        continue; // 跳过没有子节点的根
      }

      let definition = "root";
      
      // 如果有名称，添加标识符
      if (rootName && rootName !== "skill_bt") {
        definition += ` [${rootName}]`;
      }

      definition += " {\n";
      this.increaseIndent();

      const childCode = this.blockToCode(rootChild);
      if (childCode) {
        definition += childCode;
      }

      this.decreaseIndent();
      definition += this.indent() + "}";
      definitions.push(definition);
    }

    return definitions.join("\n\n");
  }

  /**
   * 将单个 block 转换为 MDSL 代码
   */
  private blockToCode(block: any): string {
    if (!block) return "";

    const blockType = block.type;
    let code = "";

    switch (blockType) {
      case "bt_sequence":
        code = this.generateSequence(block);
        break;
      case "bt_selector":
        code = this.generateSelector(block);
        break;
      case "bt_repeat":
        code = this.generateRepeat(block);
        break;
      case "bt_retry":
        code = this.generateRetry(block);
        break;
      case "bt_wait":
        code = this.generateWait(block);
        break;
      case "bt_action":
        code = this.generateAction(block);
        break;
      case "bt_condition":
        code = this.generateCondition(block);
        break;
      case "bt_branch":
        code = this.generateBranch(block);
        break;
      default:
        // 未知类型，跳过
        break;
    }

    return code;
  }

  /**
   * 生成 sequence 节点
   */
  private generateSequence(block: any): string {
    let code = this.indent() + "sequence {\n";
    this.increaseIndent();

    let child = block.getInputTargetBlock("CHILDREN");
    while (child) {
      code += this.blockToCode(child);
      child = child.getNextBlock();
    }

    this.decreaseIndent();
    code += this.indent() + "}\n";
    return code;
  }

  /**
   * 生成 selector 节点
   */
  private generateSelector(block: any): string {
    let code = this.indent() + "selector {\n";
    this.increaseIndent();

    let child = block.getInputTargetBlock("CHILDREN");
    while (child) {
      code += this.blockToCode(child);
      child = child.getNextBlock();
    }

    this.decreaseIndent();
    code += this.indent() + "}\n";
    return code;
  }

  /**
   * 生成 repeat 节点
   */
  private generateRepeat(block: any): string {
    const iterations = block.getFieldValue("ITERATIONS")?.trim();
    let code = this.indent() + "repeat";
    
    if (iterations) {
      code += ` [${iterations}]`;
    }
    
    code += " {\n";
    this.increaseIndent();

    const child = block.getInputTargetBlock("CHILD");
    if (child) {
      code += this.blockToCode(child);
    }

    this.decreaseIndent();
    code += this.indent() + "}\n";
    return code;
  }

  /**
   * 生成 retry 节点
   */
  private generateRetry(block: any): string {
    const attempts = block.getFieldValue("ATTEMPTS")?.trim();
    let code = this.indent() + "retry";
    
    if (attempts) {
      code += ` [${attempts}]`;
    }
    
    code += " {\n";
    this.increaseIndent();

    const child = block.getInputTargetBlock("CHILD");
    if (child) {
      code += this.blockToCode(child);
    }

    this.decreaseIndent();
    code += this.indent() + "}\n";
    return code;
  }

  /**
   * 生成 wait 节点
   */
  private generateWait(block: any): string {
    const duration = block.getFieldValue("DURATION")?.trim();
    let code = this.indent() + "wait";
    
    if (duration) {
      code += ` [${duration}]`;
    }
    
    code += "\n";
    return code;
  }

  /**
   * 生成 action 节点
   */
  private generateAction(block: any): string {
    const fnCallBlock = block.getInputTargetBlock("FUNCTION_CALL");
    if (!fnCallBlock) {
      return this.indent() + "action [Unknown]\n";
    }

    const functionCall = this.generateFunctionCall(fnCallBlock);
    return this.indent() + `action ${functionCall}\n`;
  }

  /**
   * 生成 condition 节点
   */
  private generateCondition(block: any): string {
    const fnCallBlock = block.getInputTargetBlock("FUNCTION_CALL");
    if (!fnCallBlock) {
      return this.indent() + "condition [Unknown]\n";
    }

    const functionCall = this.generateFunctionCall(fnCallBlock);
    return this.indent() + `condition ${functionCall}\n`;
  }

  /**
   * 生成 branch 节点
   */
  private generateBranch(block: any): string {
    const ref = block.getFieldValue("REF") || "SubtreeName";
    return this.indent() + `branch [${ref}]\n`;
  }

  /**
   * 生成函数调用（fn_<encodedName> 块或旧的 fn_call 块）
   */
  private generateFunctionCall(block: any): string {
    const blockType = block.type;
    
    // 新的函数调用块：fn_<encodedName>
    if (blockType.startsWith("fn_")) {
      return this.generateNewFunctionCall(block);
    }
    
    // 旧的 fn_call 块（兼容处理）
    if (blockType === "fn_call") {
      return this.generateOldFunctionCall(block);
    }
    
    return "[Unknown]";
  }

  /**
   * 生成新的函数调用（fn_* 块）
   */
  private generateNewFunctionCall(block: any): string {
    // 从 blockType 或 mutation 中获取函数名
    let functionName = (block as any).functionName;
    if (!functionName) {
      functionName = this.decodeFunctionNameFromBlockType(block.type);
    }

    // 从 mutation 中获取参数名列表
    let paramNames: string[] = (block as any).paramNames || [];
    
    // 如果 paramNames 为空，尝试从 mutation XML 中读取
    if (paramNames.length === 0) {
      try {
        const mutation = (block as any).mutationToDom?.();
        if (mutation) {
          const paramNamesStr = mutation.getAttribute("paramNames");
          if (paramNamesStr) {
            paramNames = JSON.parse(paramNamesStr);
          }
        }
      } catch (e) {
        // 忽略错误
      }
    }

    // 如果仍然为空，尝试从输入列表中推断
    if (paramNames.length === 0 && block.inputList) {
      for (const input of block.inputList) {
        if (input.name) {
          paramNames.push(input.name);
        }
      }
    }
    
    const args: string[] = [functionName];
    
    // 根据参数名收集参数值
    for (const paramName of paramNames) {
      // 检查是否是枚举字段（dummyInput + dropdown）
      // 枚举字段通常没有 connection，而是直接在 input 的 fieldRow 中
      let foundEnum = false;
      for (const input of block.inputList || []) {
        if (input.fieldRow) {
          const field = input.fieldRow.find((f: any) => f.name === paramName);
          if (field && typeof field.getValue === "function") {
            const value = field.getValue();
            args.push(`"${String(value).replace(/"/g, '\\"')}"`);
            foundEnum = true;
            break;
          }
        }
      }
      
      if (foundEnum) continue;
      
      // 普通参数：从连接的块获取值
      const argBlock = block.getInputTargetBlock(paramName);
      if (argBlock) {
        const argValue = this.generateArgument(argBlock);
        if (argValue !== null) {
          args.push(argValue);
        }
      }
    }
    
    return `[${args.join(", ")}]`;
  }

  /**
   * 生成旧的函数调用（fn_call 块，兼容处理）
   */
  private generateOldFunctionCall(block: any): string {
    const functionName = block.getFieldValue("FUNCTION_NAME") || "Unknown";
    const args: string[] = [functionName];

    // 收集所有有值的参数（最多 5 个）
    for (let i = 0; i < 5; i++) {
      const argBlock = block.getInputTargetBlock("ARG" + i);
      if (argBlock) {
        const argValue = this.generateArgument(argBlock);
        if (argValue !== null) {
          args.push(argValue);
        }
      }
    }

    return `[${args.join(", ")}]`;
  }

  /**
   * 从 blockType (fn_<encodedName>) 解码函数名
   */
  private decodeFunctionNameFromBlockType(blockType: string): string {
    const decoded = decodeFunctionCallBlockId(blockType);
    return decoded || "Unknown";
  }

  /**
   * 生成参数值（mdsl_literal 块或其他值块）
   */
  private generateArgument(block: any): string | null {
    if (!block) return null;
    
    // mdsl_literal 块
    if (block.type === "mdsl_literal") {
      return this.generateMDSLLiteral(block);
    }
    
    // 如果是枚举字段（dropdown），直接返回字符串值
    const fields = block.inputList?.flatMap((input: any) => input.fieldRow || []) || [];
    for (const field of fields) {
      if (field.name && field.getValue) {
        const value = field.getValue();
        if (typeof value === "string") {
          return `"${value.replace(/"/g, '\\"')}"`;
        }
        if (typeof value === "number") {
          return String(value);
        }
        if (typeof value === "boolean") {
          return value ? "true" : "false";
        }
      }
    }
    
    // 其他情况：尝试从字段值获取
    return null;
  }

  /**
   * 生成 mdsl_literal 参数值
   */
  private generateMDSLLiteral(block: any): string | null {
    if (block.type !== "mdsl_literal") {
      return null;
    }

    const type = block.getFieldValue("TYPE");
    const value = block.getFieldValue("VALUE");

    switch (type) {
      case "string":
        // 转义字符串中的引号
        const escapedValue = (value || "").replace(/"/g, '\\"');
        return `"${escapedValue}"`;
      case "number":
        return value || "0";
      case "boolean":
        return value === "true" ? "true" : "false";
      case "null":
        return "null";
      case "propertyRef":
        return `$${value || "target"}`;
      default:
        return "null";
    }
  }
}

// 创建单例实例
export const mdslGenerator = new MDSLGenerator();

