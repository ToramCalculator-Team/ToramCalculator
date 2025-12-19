/**
 * 函数调用块生成器
 * 基于 pipelineBlocks.ts 的 ActionBlockGenerator 思路，生成预置函数和自定义函数的调用块
 * 输出类型：MDSL_CALL（供 bt_action/bt_condition 嵌入）
 */

import { Blocks, FieldDropdown, FieldTextInput, FieldNumber, FieldCheckbox, utils } from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";
import { buildPlayerActionMetas, type ActionMeta } from "./actionBlocks";
import type { ActionParamMeta } from "./actionBlocks"; 

/**
 * 为函数名生成安全的 blockType（用于函数调用块）
 * 规则：fn_<encodedName>，与 action_<encodedName> 区分开
 */
export function makeFunctionCallBlockId(functionName: string): string {
  const safeName = functionName
    .split("")
    .map((char) => {
      if (/[a-zA-Z0-9_]/.test(char)) {
        return char;
      }
      return `u${char.charCodeAt(0).toString(16)}`;
    })
    .join("");
  return `fn_${safeName}`;
}

/**
 * 从 blockType 解码函数名
 */
export function decodeFunctionCallBlockId(blockType: string): string | null {
  if (!blockType.startsWith("fn_")) return null;
  const encoded = blockType.replace(/^fn_/, "");
  return encoded.replace(/u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * 将 PipelineParamMeta 转换为 MDSL 参数输入
 * 注意：MDSL 参数只支持 string/number/boolean/null/$propertyRef
 */
function createMDSLParamInput(this: any, param: ActionParamMeta, index: number): void {
  const block = this;
  
  if (param.kind === "enum" && param.enumOptions && param.enumOptions.length > 0) {
    // 枚举类型：用下拉选择，但生成时转为字符串
    block.appendDummyInput()
      .appendField(param.displayName ?? param.name)
      .appendField(
        new FieldDropdown(() => param.enumOptions!.map((opt) => [String(opt), String(opt)])),
        param.name,
      );
  } else if (param.kind === "number") {
    // 数字：可以用数字输入或 mdsl_literal
    block.appendValueInput(param.name)
      .setCheck("MDSL_ARG")
      .appendField(param.displayName ?? param.name);
  } else if (param.kind === "boolean") {
    // 布尔：可以用下拉或 mdsl_literal
    block.appendValueInput(param.name)
      .setCheck("MDSL_ARG")
      .appendField(param.displayName ?? param.name);
  } else if (param.kind === "string") {
    // 字符串：用 mdsl_literal
    block.appendValueInput(param.name)
      .setCheck("MDSL_ARG")
      .appendField(param.displayName ?? param.name);
  } else {
    // json 等其他类型：统一用 MDSL_ARG（用户可以用 mdsl_literal 的字符串类型输入 JSON 字符串）
    block.appendValueInput(param.name)
      .setCheck("MDSL_ARG")
      .appendField(param.displayName ?? param.name);
  }
}

/**
 * 为预置函数生成调用块（基于 ActionMeta）
 */
function createBuiltinFunctionCallBlock(meta: ActionMeta): void {
  const blockId = makeFunctionCallBlockId(meta.name);
  const params = meta.params;

  Blocks[blockId] = {
    init: function () {
      // 函数名作为标题
      this.appendDummyInput().appendField(meta.name);

      // 根据参数声明生成输入
      for (const param of params) {
        createMDSLParamInput.call(this, param, params.indexOf(param));
      }

      // 输出类型：MDSL_CALL
      this.setOutput(true, "MDSL_CALL");
      this.setColour(230);
      this.setTooltip(`调用函数：${meta.name}`);
      this.setHelpUrl("");

      // 保存函数名和参数信息到 mutation，便于后续识别和生成 MDSL
      (this as any).functionName = meta.name;
      (this as any).paramNames = params.map((p) => p.name);
    },
  };

  // mutationToDom：保存函数名和参数信息
  (Blocks[blockId] as any).mutationToDom = function () {
    const container = utils.xml.createElement("mutation");
    container.setAttribute("functionName", (this as any).functionName || meta.name);
    container.setAttribute("paramNames", JSON.stringify((this as any).paramNames || params.map((p) => p.name)));
    return container;
  };

  // domToMutation：恢复函数名和参数信息
  (Blocks[blockId] as any).domToMutation = function (xmlElement: Element) {
    const functionName = xmlElement.getAttribute("functionName") || meta.name;
    const paramNamesStr = xmlElement.getAttribute("paramNames");
    const paramNames = paramNamesStr ? JSON.parse(paramNamesStr) : params.map((p) => p.name);
    (this as any).functionName = functionName;
    (this as any).paramNames = paramNames;
  };

  // JS generator（用于调试，实际生成 MDSL 时用 mdslGenerator）
  javascriptGenerator.forBlock[blockId] = function (block, generator) {
    const functionName = meta.name;
    const args: string[] = [];

    for (const param of params) {
      if (param.kind === "enum" && param.enumOptions && param.enumOptions.length > 0) {
        // 枚举类型：从 field 获取值
        const value = block.getFieldValue(param.name);
        args.push(JSON.stringify(value));
      } else {
        // 普通参数：从连接的块获取代码
        const code = generator.valueToCode(block, param.name, Order.NONE);
        if (code) {
          args.push(code);
        }
      }
    }

    const code = `${functionName}(${args.join(", ")})`;
    return [code, Order.FUNCTION_CALL];
  };
}

/**
 * 为自定义函数（procedure）生成调用块
 */
function createCustomFunctionCallBlock(
  functionName: string,
  paramNames: string[],
  hasReturn: boolean
): void {
  const blockId = makeFunctionCallBlockId(functionName);

  Blocks[blockId] = {
    init: function () {
      // 函数名作为标题
      this.appendDummyInput().appendField(functionName);

      // 根据参数列表生成输入（统一用 MDSL_ARG）
      for (let i = 0; i < paramNames.length; i++) {
        this.appendValueInput(paramNames[i])
          .setCheck("MDSL_ARG")
          .appendField(paramNames[i]);
      }

      // 输出类型：MDSL_CALL
      this.setOutput(true, "MDSL_CALL");
      this.setColour(230);
      this.setTooltip(`调用函数：${functionName}`);
      this.setHelpUrl("");

      // 保存函数名和参数信息
      (this as any).functionName = functionName;
      (this as any).paramNames = paramNames;
    },
  };

  // mutationToDom
  (Blocks[blockId] as any).mutationToDom = function () {
    const container = utils.xml.createElement("mutation");
    container.setAttribute("functionName", (this as any).functionName || functionName);
    container.setAttribute("paramNames", JSON.stringify((this as any).paramNames || paramNames));
    return container;
  };

  // domToMutation
  (Blocks[blockId] as any).domToMutation = function (xmlElement: Element) {
    const fnName = xmlElement.getAttribute("functionName") || functionName;
    const paramNamesStr = xmlElement.getAttribute("paramNames");
    const pNames = paramNamesStr ? JSON.parse(paramNamesStr) : paramNames;
    (this as any).functionName = fnName;
    (this as any).paramNames = pNames;
  };

  // JS generator（用于调试）
  javascriptGenerator.forBlock[blockId] = function (block, generator) {
    const fnName = functionName;
    const args: string[] = [];

    for (const paramName of paramNames) {
      const code = generator.valueToCode(block, paramName, Order.NONE);
      if (code) {
        args.push(code);
      }
    }

    const code = `${fnName}(${args.join(", ")})`;
    return [code, Order.FUNCTION_CALL];
  };
}

/**
 * 函数调用块管理器
 */
export class FunctionCallBlockManager {
  private builtinBlockIds: string[] = [];
  private customBlockIds: Set<string> = new Set();

  /**
   * 注册所有预置函数调用块
   */
  registerBuiltinFunctionCallBlocks(): void {
    const actionMetas = buildPlayerActionMetas();
    
    for (const meta of actionMetas) {
      const blockId = makeFunctionCallBlockId(meta.name);
      if (!Blocks[blockId]) {
        createBuiltinFunctionCallBlock(meta);
      }
      // 即使 Blocks 已存在（例如 HMR 后），也要确保 builtinBlockIds 里有记录
      if (!this.builtinBlockIds.includes(blockId)) {
        this.builtinBlockIds.push(blockId);
      }
    }
  }

  /**
   * 同步自定义函数调用块（从 workspace 的 procedureMap 或直接查找 procedure 定义块）
   */
  syncCustomFunctionCallBlocks(workspace: any): void {
    // 先刷新 procedureMap，确保新创建的 procedure 定义块已注册
    if (typeof workspace.refreshProcedureMap === "function") {
      workspace.refreshProcedureMap();
    }

    const procedureMap = workspace.getProcedureMap();
    let procedures = Array.from(procedureMap.values());
    const currentBlockIds = new Set<string>();

    // 如果 procedureMap 为空，尝试直接从 workspace 中查找 procedure 定义块
    if (procedures.length === 0) {
      // console.log("[functionCallBlocks] procedureMap 为空，尝试直接从 workspace 查找 procedure 定义块");
      const allBlocks = workspace.getAllBlocks(false);
      const procedureDefs: Array<{ name: string; params: string[]; hasReturn: boolean }> = [];

      for (const block of allBlocks) {
        if (block.type === "procedures_defnoreturn" || block.type === "procedures_defreturn") {
          try {
            // 从块的字段中获取 procedure 名称
            const name = block.getFieldValue("NAME");
            if (!name || typeof name !== "string") {
              continue;
            }

            // 尝试从 mutation 中获取参数
            const params: string[] = [];
            try {
              const mutation = (block as any).mutationToDom?.();
              if (mutation) {
                const paramNodes = mutation.querySelectorAll("arg");
                for (let i = 0; i < paramNodes.length; i++) {
                  const paramName = paramNodes[i].getAttribute("name");
                  if (paramName) {
                    params.push(paramName);
                  }
                }
              }
            } catch (mutationError) {
              console.warn("[functionCallBlocks] 获取参数列表失败", mutationError);
            }

            procedureDefs.push({
              name,
              params,
              hasReturn: block.type === "procedures_defreturn",
            });
          } catch (error) {
            console.warn("[functionCallBlocks] 获取 procedure 信息失败", block, error);
          }
        }
      }

      // console.log("[functionCallBlocks] 从 workspace 直接查找到的 procedure 定义", procedureDefs);

      // 将找到的 procedure 定义转换为类似 procedureMap 的格式进行处理
      for (const def of procedureDefs) {
        if (!def.name) continue;

        const functionName = def.name;
        const paramNames = def.params;
        const hasReturn = def.hasReturn;

        // console.log("[functionCallBlocks] 处理 procedure（从 workspace 直接查找）", {
        //   functionName,
        //   paramNames,
        //   hasReturn,
        // });

        const blockId = makeFunctionCallBlockId(functionName);
        currentBlockIds.add(blockId);

        // 如果块不存在，创建它
        if (!Blocks[blockId]) {
          // console.log("[functionCallBlocks] 创建新的自定义函数调用块", blockId);
          createCustomFunctionCallBlock(functionName, paramNames, hasReturn);
          this.customBlockIds.add(blockId);
        } else {
          // 如果块已存在，检查是否需要更新（参数列表变化）
          const existingBlock = Blocks[blockId] as any;
          const existingParamNames = existingBlock.paramNames || [];
          if (JSON.stringify(existingParamNames) !== JSON.stringify(paramNames)) {
            // 参数列表变化，重新创建块（Blockly 会自动处理已存在实例的更新）
            createCustomFunctionCallBlock(functionName, paramNames, hasReturn);
          }
          this.customBlockIds.add(blockId);
        }
      }
    } else {
      // 使用 procedureMap 中的信息
      // 为每个 procedure 创建/更新调用块
      for (const procModel of procedures) {
        if (!procModel) continue;

        const model = procModel as any;
        if (
          typeof model.getName !== "function" ||
          typeof model.getParameters !== "function" ||
          typeof model.getReturnTypes !== "function"
        ) {
          continue;
        }

        const functionName = model.getName();
        const paramNames = model.getParameters().map((p: any) => p.getName());
        const hasReturn = model.getReturnTypes().length > 0;

        // console.log("[functionCallBlocks] 处理 procedure", {
        //   functionName,
        //   paramNames,
        //   hasReturn,
        // });

        const blockId = makeFunctionCallBlockId(functionName);
        currentBlockIds.add(blockId);

        // 如果块不存在，创建它
        if (!Blocks[blockId]) {
          // console.log("[functionCallBlocks] 创建新的自定义函数调用块", blockId);
          createCustomFunctionCallBlock(functionName, paramNames, hasReturn);
          this.customBlockIds.add(blockId);
        } else {
          // 如果块已存在，检查是否需要更新（参数列表变化）
          const existingBlock = Blocks[blockId] as any;
          const existingParamNames = existingBlock.paramNames || [];
          if (JSON.stringify(existingParamNames) !== JSON.stringify(paramNames)) {
            // 参数列表变化，重新创建块（Blockly 会自动处理已存在实例的更新）
            createCustomFunctionCallBlock(functionName, paramNames, hasReturn);
          }
          this.customBlockIds.add(blockId);
        }
      }
    }

    // 调试：打印 procedureMap 信息
    // console.log("[functionCallBlocks] 同步自定义函数调用块", {
    //   procedureMapSize: procedureMap.size,
    //   proceduresCount: procedures.length,
    //   currentCustomBlockIds: Array.from(this.customBlockIds),
    // });

    // 移除已删除的 procedure 对应的块
    for (const blockId of this.customBlockIds) {
      if (!currentBlockIds.has(blockId)) {
        // console.log("[functionCallBlocks] 移除已删除的自定义函数调用块", blockId);
        // 注意：不能直接删除 Blocks[blockId]，因为可能还有实例在使用
        // 这里只从跟踪列表中移除，实际的块会在下次同步时被覆盖
        this.customBlockIds.delete(blockId);
      }
    }

    // console.log("[functionCallBlocks] 同步完成", {
    //   finalCustomBlockIds: Array.from(this.customBlockIds),
    // });
  }


  /**
   * 构建函数调用分类的 toolbox contents（包含内置和自定义）
   */
  buildFunctionCallToolboxContents(workspace: any): any[] {
    const contents: any[] = [];

    // 1. 预置函数调用块
    for (const blockId of this.builtinBlockIds) {
      contents.push({
        type: blockId,
        kind: "block" as const,
      });
    }

    // 2. 分隔符（如果有预置和自定义）
    const procedureMap = workspace.getProcedureMap();
    const procedures = Array.from(procedureMap.values());
    if (this.builtinBlockIds.length > 0 && procedures.length > 0) {
      contents.push({
        kind: "label" as const,
        text: "自定义函数",
      });
    }

    // 3. 自定义函数调用块
    for (const blockId of this.customBlockIds) {
      contents.push({
        type: blockId,
        kind: "block" as const,
      });
    }

    return contents;
  }

  /**
   * 构建仅内置函数的 toolbox contents
   */
  buildBuiltinFunctionToolboxContents(): any[] {
    const contents: any[] = [];

    // 只返回预置函数调用块
    for (const blockId of this.builtinBlockIds) {
      contents.push({
        type: blockId,
        kind: "block" as const,
      });
    }

    return contents;
  }

  /**
   * 构建仅自定义函数调用块的 toolbox contents
   */
  buildCustomFunctionToolboxContents(): any[] {
    const contents: any[] = [];

    // console.log("[functionCallBlocks] 构建自定义函数调用块 toolbox contents", {
    //   customBlockIds: Array.from(this.customBlockIds),
    //   customBlockIdsSize: this.customBlockIds.size,
    // });

    for (const blockId of this.customBlockIds) {
      // 验证块是否已注册
      if (!Blocks[blockId]) {
        console.warn("[functionCallBlocks] 自定义函数调用块未注册", blockId);
        continue;
      }
      contents.push({
        type: blockId,
        kind: "block" as const,
      });
    }

    // console.log("[functionCallBlocks] 返回的自定义函数调用块数量", contents.length);
    return contents;
  }

  /**
   * 获取所有函数调用块的 blockId
   */
  getAllBlockIds(): string[] {
    return [...this.builtinBlockIds, ...Array.from(this.customBlockIds)];
  }
}

// 创建单例实例
export const functionCallBlockManager = new FunctionCallBlockManager();

