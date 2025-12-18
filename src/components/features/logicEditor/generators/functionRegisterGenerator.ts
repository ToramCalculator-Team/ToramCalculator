/**
 * Function Register Generator：从 Blockly procedures 生成 registerUserFunctions 文本
 */

import { Workspace } from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";

export class FunctionRegisterGenerator {
  /**
   * 从 workspace 生成 registerUserFunctions 文本
   */
  workspaceToCode(workspace: Workspace): string {
    const procedureMap = workspace.getProcedureMap();
    const procedures = Array.from(procedureMap.values());
    
    if (procedures.length === 0) {
      return `export function registerUserFunctions({ BehaviourTree, State }) {
  // 没有自定义函数
}`;
    }

    const registrations: string[] = [];

    for (const procModel of procedures) {
      if (!procModel) continue;

      // 类型断言：procModel 应该有相应的方法
      const model = procModel as any;
      if (
        typeof model.getName !== "function" ||
        typeof model.getParameters !== "function" ||
        typeof model.getReturnTypes !== "function" ||
        typeof model.getId !== "function"
      ) {
        continue;
      }

      const procName = model.getName();
      
      // 获取 procedure 的参数列表
      const paramNames = model.getParameters().map((p: any) => p.getName());
      
      // 查找对应的 procedure 定义块
      const hasReturn = model.getReturnTypes().length > 0;
      const procedureBlocks = workspace.getBlocksByType(
        hasReturn ? "procedures_defreturn" : "procedures_defnoreturn",
        false
      );
      
      const procBlock = procedureBlocks.find((b: any) => {
        try {
          const blockProcId = b.getProcedureId();
          const modelProcId = model.getId();
          return blockProcId === modelProcId;
        } catch {
          return false;
        }
      });

      if (!procBlock) continue;

      // 生成函数体代码
      let functionBody = "";
      
      // 获取 procedure 的 statement 输入（函数体）
      const statementInput = procBlock.getInput("STACK");
      if (statementInput && statementInput.connection) {
        const firstStatement = statementInput.connection.targetBlock();
        if (firstStatement) {
          // 生成函数体的 JS 代码
          const bodyCode = javascriptGenerator.statementToCode(procBlock, "STACK");
          if (bodyCode) {
            functionBody = bodyCode.trim();
          }
        }
      }

      // 如果有返回值，处理返回值
      if (hasReturn) {
        const returnInput = procBlock.getInput("RETURN");
        if (returnInput && returnInput.connection) {
          const returnCode = javascriptGenerator.valueToCode(procBlock, "RETURN", Order.NONE);
          if (returnCode) {
            if (functionBody) {
              functionBody += `\n    return ${returnCode};`;
            } else {
              functionBody = `return ${returnCode};`;
            }
          }
        }
      }

      // 如果没有函数体，添加默认返回值
      if (!functionBody) {
        functionBody = hasReturn ? "return true;" : "return State.SUCCEEDED;";
      }

      // 构建函数参数列表（agent 作为第一个参数，然后是用户参数）
      const funcParams = ["agent", ...paramNames].join(", ");

      // 生成 register 调用
      // 将函数体的每一行缩进
      const indentedBody = functionBody
        .split("\n")
        .map((line) => (line.trim() ? `    ${line}` : ""))
        .filter((line) => line)
        .join("\n");

      const registration = `  BehaviourTree.register("${procName}", (${funcParams}) => {
${indentedBody}
  });`;

      registrations.push(registration);
    }

    return `export function registerUserFunctions({ BehaviourTree, State }) {
${registrations.join("\n\n")}
}`;
  }
}

// 创建单例实例
export const functionRegisterGenerator = new FunctionRegisterGenerator();

