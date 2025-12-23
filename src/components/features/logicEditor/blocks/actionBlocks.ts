import { Blocks, FieldDropdown, FieldTextInput, Workspace, WorkspaceSvg } from "blockly/core";
import { javascriptGenerator, Order } from "blockly/javascript";
import { ZodBoolean, ZodEnum, ZodNumber, ZodObject, ZodString, ZodType } from "zod/v4";
import {
  PlayerActionPool,
} from "../../simulator/core/Member/types/Player/PlayerAgents";
import type { Action } from "../../simulator/core/Member/runtime/Agent/type";  

/**
 * 动作参数类型
 */
export type ActionParamKind = "number" | "boolean" | "string" | "enum" | "json";

export interface ActionParamMeta {
  name: string;
  kind: ActionParamKind;
  required: boolean;
  enumOptions?: string[];
  displayName?: string;
  desc?: string;
}

export interface ActionMeta {
  /** 动作名称，如 技能.动作.计算 */
  name: string;
  /** 逻辑分组，基于名称前缀的简单分类 */
  category: string;
  displayName?: string;
  desc?: string;
  params: ActionParamMeta[];
}

export interface CustomActionMeta {
  /** 动作名称（唯一标识） */
  name: string;
  /** 展示名 */
  displayName?: string;
  /** 描述 */
  desc?: string;
  /** 动作列表（按顺序执行） */
  actions: string[];
}

/**
 * 根据动作名称生成唯一的积木 ID
 * 规则：前缀 action_，非 ASCII 字符转换为 Unicode 编码，避免中文重名冲突
 */
export const makeActionBlockId = (actionName: string): string => {
  // 将动作名转换为安全的 blockId：保留 ASCII 字符，非 ASCII 字符转换为 Unicode 编码
  const safeName = actionName
    .split("")
    .map((char) => {
      if (/[a-zA-Z0-9_]/.test(char)) return char;
      return `u${char.charCodeAt(0).toString(16)}`;
    })
    .join("");
  return `action_${safeName}`;
};

const decodeActionBlockId = (blockType: string): string | null => {
  if (!blockType.startsWith("action_")) return null;
  const encoded = blockType.replace(/^action_/, "");
  // 反向还原 makeActionBlockId：uXXXX -> 对应字符，其余 ASCII 保留
  return encoded.replace(/u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
};

/**
 * 将函数名编码为 Blockly JavaScript 生成器使用的格式
 * Blockly 对非 ASCII 字符使用下划线 + UTF-8 字节的十六进制编码（大写）
 * 例如：蓄力 -> _E8_93_84_E5_8A_9B
 * 
 * 规则：
 * - ASCII 字符（字母、数字、下划线）保持不变
 * - 非 ASCII 字符转换为 UTF-8 字节序列，每个字节用两位十六进制表示，用下划线分隔
 */
export const encodeFunctionName = (functionName: string): string => {
  let result = "";
  for (let i = 0; i < functionName.length; i++) {
    const char = functionName[i];
    const code = char.charCodeAt(0);
    
    // ASCII 字符（字母、数字、下划线）保持不变
    if ((code >= 0x30 && code <= 0x39) || // 0-9
        (code >= 0x41 && code <= 0x5A) || // A-Z
        (code >= 0x61 && code <= 0x7A) || // a-z
        code === 0x5F) { // _
      result += char;
    } else {
      // 非 ASCII 字符：转换为 UTF-8 字节序列
      // 使用 TextEncoder 获取 UTF-8 字节
      const utf8Bytes = new TextEncoder().encode(char);
      // 每个字节转换为两位十六进制（大写），用下划线分隔
      result += "_" + Array.from(utf8Bytes)
        .map((byte) => byte.toString(16).toUpperCase().padStart(2, "0"))
        .join("_");
    }
  }
  return result;
};

type AnyAction = Action<ZodType, ZodType, Record<string, unknown>>;

/**
 * 从 zod schema 中解析参数元数据
 */
const extractParamsFromSchema = (schema: ZodType | undefined): ActionParamMeta[] => {
  if (!schema) return [];

  const unwrapped = unwrapEffectsAndOptionals(schema);
  if (!(unwrapped instanceof ZodObject)) {
    // 暂时只处理 object，其它类型先视为无显式参数或由调用方自行处理
    return [];
  }

  const shape = (unwrapped as ZodObject<Record<string, ZodType>>).shape;
  const metas: ActionParamMeta[] = [];

  for (const key of Object.keys(shape)) {
    const fieldSchema = shape[key];
    const { base, required } = unwrapOptional(fieldSchema);

    let kind: ActionParamKind = "json";
    let enumOptions: string[] | undefined;

    if (base instanceof ZodNumber) {
      kind = "number";
    } else if (base instanceof ZodBoolean) {
      kind = "boolean";
    } else if (base instanceof ZodString) {
      kind = "string";
    } else if (base instanceof ZodEnum) {
      const values = (base as unknown as { _def: { values: readonly string[] } })._def?.values;
      if (Array.isArray(values)) {
        kind = "enum";
        enumOptions = values.slice();
      } else {
        kind = "json";
      }
    } else {
      kind = "json";
    }

    metas.push({
      name: key,
      kind,
      required,
      enumOptions,
    });
  }

  return metas;
};

/**
 * 去掉 optional/default/effects 外壳，获得基础 schema
 */
const unwrapEffectsAndOptionals = (schema: ZodType): ZodType => {
  // 这里不做精细类型判断，只是尽量剥掉一层 effects/optional/default
  // 以便拿到内部的 ZodObject / ZodNumber 等
  // zod 内部 def.typeName 是稳定标识
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inner = (s: ZodType): ZodType => {
    const def: any = (s as any)._def;
    const typeName: string | undefined = def?.typeName;
    if (typeName === "ZodEffects" && def?.schema) {
      return inner(def.schema as ZodType);
    }
    if (typeName === "ZodOptional" && def?.innerType) {
      return inner(def.innerType as ZodType);
    }
    if (typeName === "ZodDefault" && def?.innerType) {
      return inner(def.innerType as ZodType);
    }
    return s;
  };

  return inner(schema);
};

/**
 * 拆出 required 信息：optional/default 视为非必填
 */
const unwrapOptional = (schema: ZodType): { base: ZodType; required: boolean } => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const def: any = (schema as any)._def;
  const typeName: string | undefined = def?.typeName;
  if (typeName === "ZodOptional" || typeName === "ZodDefault") {
    return { base: unwrapEffectsAndOptionals(schema), required: false };
  }
  return { base: unwrapEffectsAndOptionals(schema), required: true };
};

/**
 * 动作元数据
 */
export interface ActionMeta {
  name: string;
  category: string;
  params: ActionParamMeta[];
  /** 若动作有“单一标量”输出，则标记其类型，便于生成值积木 */
  outputKind?: ActionParamKind;
  /** 若输出是 object 且只有一个字段，则记录字段名，生成访问表达式 */
  outputField?: string;
}

/**
 * 从 Player 动作池构造动作元数据
 */
export const buildPlayerActionMetas = (): ActionMeta[] => {
  const metas: ActionMeta[] = [];

  const actionPool: PlayerActionPool = PlayerActionPool;

  for (const actionName of Object.keys(actionPool) as (keyof PlayerActionPool)[]) {
    const action = actionPool[actionName] as unknown as AnyAction;
    const inputSchema = action[0];
    const outputSchema = action[1];
    const params = extractParamsFromSchema(inputSchema);

    const { kind: outputKind, field: outputField } = inferOutputFromSchema(outputSchema);

    metas.push({
      name: actionName,
      category: "playerAction",
      params,
      outputKind,
      outputField,
    });
  }

  return metas;
};

/**
 * 从动作的输出 schema 推导“是否可以作为标量值积木使用”
 * 规则：
 * - 直接的 number/boolean/string
 * - 或仅包含一个字段，且该字段为 number/boolean/string
 */
const inferOutputFromSchema = (
  schema: ZodType | undefined,
): { kind?: ActionParamKind; field?: string } => {
  if (!schema) return {};

  const unwrapped = unwrapEffectsAndOptionals(schema);

  // 直接标量
  if (unwrapped instanceof ZodNumber) {
    return { kind: "number" };
  }
  if (unwrapped instanceof ZodBoolean) {
    return { kind: "boolean" };
  }
  if (unwrapped instanceof ZodString) {
    return { kind: "string" };
  }

  // 单字段 object，且字段为标量
  if (unwrapped instanceof ZodObject) {
    const shape = (unwrapped as ZodObject<Record<string, ZodType>>).shape;
    const keys = Object.keys(shape);
    if (keys.length === 1) {
      const fieldName = keys[0];
      const fieldSchema = shape[fieldName];
      const { base } = unwrapOptional(fieldSchema);

      if (base instanceof ZodNumber) {
        return { kind: "number", field: fieldName };
      }
      if (base instanceof ZodBoolean) {
        return { kind: "boolean", field: fieldName };
      }
      if (base instanceof ZodString) {
        return { kind: "string", field: fieldName };
      }
    }
  }

  return {};
};

/**
 * 基于 ActionMeta 生成 Blockly 积木定义与 JS 代码
 */
export class PipelineBlockGenerator {
  private metas: ActionMeta[];
  private blockIds: string[] = [];

  constructor(metas: ActionMeta[]) {
    this.metas = metas;
    this.generateBlocks();
  }

  private generateBlocks() {
    for (const meta of this.metas) {
      this.createActionBlock(meta);
    }
  }

  private createActionBlock(meta: ActionMeta) {
    const blockId = makeActionBlockId(meta.name);
    const params = meta.params;

    Blocks[blockId] = {
      init: function () {
        this.appendDummyInput().appendField(meta.displayName ?? meta.name);

        for (const p of params) {
          if (p.kind === "enum" && p.enumOptions && p.enumOptions.length > 0) {
            this.appendDummyInput()
              .appendField(p.displayName ?? p.name)
              .appendField(
                new FieldDropdown(() => p.enumOptions!.map((opt) => [opt, opt])),
                p.name,
              );
          } else {
            const input = this.appendValueInput(p.name).appendField(p.displayName ?? p.name);
            if (p.kind === "number") {
              input.setCheck("Number");
            } else if (p.kind === "boolean") {
              input.setCheck("Boolean");
            } else if (p.kind === "string") {
              // 允许 String 类型或 null（任何类型），以便 Blockly 的 text 积木可以连接
              input.setCheck(["String", null]);
            }
          }
        }

        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(260);
        this.setTooltip(meta.desc ?? meta.name);
        this.setHelpUrl("");
      },
    };

    javascriptGenerator.forBlock[blockId] = function (block, generator) {
      const args: Record<string, unknown> = {};

      for (const p of params) {
        if (p.kind === "enum" && p.enumOptions && p.enumOptions.length > 0) {
          const value = block.getFieldValue(p.name);
          args[p.name] = value;
        } else {
          const code = generator.valueToCode(block, p.name, Order.NONE) || (p.kind === "string" ? '""' : "0");
          args[p.name] = code;
        }
      }

      const argsPairs: string[] = [];
      for (const p of params) {
        const v = args[p.name];
        if (typeof v === "string" && !p.kind.startsWith("enum")) {
          argsPairs.push(`${p.name}: ${v}`);
        } else {
          argsPairs.push(`${p.name}: ${JSON.stringify(v)}`);
        }
      }

      const argsCode = params.length > 0 ? `{ ${argsPairs.join(", ")} }` : "{}";
      const code = `ctx.runAction("${meta.name}", ${argsCode});\n`;
      return code;
    };

    this.blockIds.push(blockId);
  }

  getBlockIds(): string[] {
    return this.blockIds.slice();
  }
}

/**
 * 基于 ActionMeta 生成“动作调用”积木
 * 语义：在运行时通过 ctx.runAction(actionName, params) 调用单个动作，
 * 由动作自身将输出合并进上下文。
 */
export class ActionBlockGenerator {
  private metas: ActionMeta[];
  private blockIds: string[] = [];

  constructor(metas: ActionMeta[]) {
    this.metas = metas;
    this.generateBlocks();
  }

  private generateBlocks() {
    for (const meta of this.metas) {
      this.createActionBlock(meta);
    }
  }

  private createActionBlock(meta: ActionMeta) {
    const blockId = makeActionBlockId(meta.name);
    const params = meta.params;

    Blocks[blockId] = {
      init: function () {
        this.appendDummyInput().appendField(meta.name);

        for (const p of params) {
          if (p.kind === "enum" && p.enumOptions && p.enumOptions.length > 0) {
            this.appendDummyInput()
              .appendField(p.displayName ?? p.name)
              .appendField(
                new FieldDropdown(() => p.enumOptions!.map((opt) => [opt, opt])),
                p.name,
              );
          } else {
            const input = this.appendValueInput(p.name).appendField(p.displayName ?? p.name);
            if (p.kind === "number") {
              input.setCheck("Number");
            } else if (p.kind === "boolean") {
              input.setCheck("Boolean");
            } else if (p.kind === "string") {
              // 允许 String 类型或 null（任何类型），以便 Blockly 的 text 积木可以连接
              input.setCheck(["String", null]);
            }
          }
        }

        // 若动作有“标量输出”，则作为值积木，否则作为语句积木
        if (meta.outputKind && meta.outputKind !== "json") {
          if (meta.outputKind === "number") {
            this.setOutput(true, "Number");
          } else if (meta.outputKind === "boolean") {
            this.setOutput(true, "Boolean");
          } else if (meta.outputKind === "string") {
            this.setOutput(true, "String");
          } else {
            this.setOutput(true, null);
          }
        } else {
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
        }
        this.setColour(210);
        this.setTooltip(meta.name);
        this.setHelpUrl("");
      },
    };

    javascriptGenerator.forBlock[blockId] = function (block, generator) {
      const args: Record<string, unknown> = {};

      for (const p of params) {
        if (p.kind === "enum" && p.enumOptions && p.enumOptions.length > 0) {
          const value = block.getFieldValue(p.name);
          args[p.name] = value;
        } else {
          const code = generator.valueToCode(block, p.name, Order.NONE) || (p.kind === "string" ? '""' : "0");
          args[p.name] = code;
        }
      }

      const argsPairs: string[] = [];
      for (const p of params) {
        const v = args[p.name];
        if (typeof v === "string" && !p.kind.startsWith("enum")) {
          argsPairs.push(`${p.name}: ${v}`);
        } else {
          argsPairs.push(`${p.name}: ${JSON.stringify(v)}`);
        }
      }

      const argsCode = params.length > 0 ? `{ ${argsPairs.join(", ")} }` : "{}";
      // 根据是否有标量输出，生成表达式或语句
      if (meta.outputKind && meta.outputKind !== "json") {
        const access = meta.outputField ? `.${meta.outputField}` : "";
        const code = `ctx.runAction("${meta.name}", ${argsCode})${access}`;
        return [code, Order.NONE] as [string, number];
      } else {
        const code = `ctx.runAction("${meta.name}", ${argsCode});\n`;
        return code;
      }
    };

    this.blockIds.push(blockId);
  }

  getBlockIds(): string[] {
    return this.blockIds.slice();
  }
}

/**
 * 动作定义积木（仅用于收集元数据，不生成运行时代码）
 */
export function createActionDefinitionBlock() {
  const blockId = "action_definition";

  Blocks[blockId] = {
    init: function () {
      this.appendDummyInput().appendField("定义动作");
      this.appendDummyInput()
        .appendField("名称")
        .appendField(new FieldTextInput("自定义动作"), "actionName");
      this.appendDummyInput()
        .appendField("描述(可选)")
        .appendField(new FieldTextInput(""), "desc");

      this.appendStatementInput("ACTIONS").setCheck(null).appendField("动作顺序");

      this.setColour(260);
      this.setTooltip("定义一个自定义动作（仅收集元数据）");
      this.setHelpUrl("");
    },
  };

  javascriptGenerator.forBlock[blockId] = function (_block, _generator) {
    // 仅作为元数据收集，不生成运行时代码
    return "";
  };

  return blockId;
}

/**
 * 从 workspace 中收集自定义动作定义
 */
export const collectCustomActions = (workspace: Workspace | WorkspaceSvg): CustomActionMeta[] => {
  const blocks = workspace.getBlocksByType("action_definition", false);
  const customActions: CustomActionMeta[] = [];

  for (const block of blocks) {
    const name = block.getFieldValue("actionName")?.trim();
    if (!name) continue;
    const desc = block.getFieldValue("desc")?.trim() || undefined;

    const actions: string[] = [];
    let current = block.getInputTargetBlock("ACTIONS");
    while (current) {
      const actionName = decodeActionBlockId(current.type);
      if (actionName) {
        actions.push(actionName);
      }
      current = current.getNextBlock();
    }

    customActions.push({
      name,
      desc,
      actions,
    });
  }

  return customActions;
};

/**
 * 为 scheduleAction 函数创建积木
 * 参数：delayFrames (number), actionName (enum), params (可选 json), source (可选 string)
 */
export function createScheduleActionBlock(getActionNames?: () => string[], actionNames?: string[]) {
  const blockId = "schedule_action";
  const fallbackNames = (Object.keys(PlayerActionPool) as (keyof PlayerActionPool)[]).slice();

  Blocks[blockId] = {
    init: function () {
      this.appendDummyInput().appendField("延迟执行动作");
  
      // 强制竖排显示各个输入
      this.setInputsInline(false);
      
      // delayFrames: number
      this.appendValueInput("delayFrames")
        .appendField("延迟帧数")
        .setCheck("Number");
      
      // actionName: enum
      this.appendDummyInput()
        .appendField("动作名称")
        .appendField(
          new FieldDropdown(() => {
            const names = getActionNames ? getActionNames() : actionNames;
            const list =
              names && names.length > 0
                ? names
                : actionNames && actionNames.length > 0
                  ? actionNames
                  : fallbackNames;
            return list.map((name) => [name, name]);
          }),
          "actionName",
        );
      
      // params: optional json (使用文本输入，用户输入 JSON)
      this.appendValueInput("params")
        .appendField("参数(可选)")
        .setCheck(null);
      
      // source: optional string
      this.appendValueInput("source")
        .appendField("来源(可选)")
        .setCheck(["String", null]);
  
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(210);
      this.setTooltip("延迟执行指定的动作");
      this.setHelpUrl("");
    },
  };

  javascriptGenerator.forBlock[blockId] = function (block, generator) {
    const delayFramesCode = generator.valueToCode(block, "delayFrames", Order.NONE) || "0";
    const names =
      (getActionNames ? getActionNames() : actionNames) && (getActionNames ? getActionNames() : actionNames)!.length > 0
        ? getActionNames
          ? getActionNames()!
          : (actionNames as string[])
        : fallbackNames;
    const actionName = block.getFieldValue("actionName") || names[0];
    const paramsCode = generator.valueToCode(block, "params", Order.NONE);
    const sourceCode = generator.valueToCode(block, "source", Order.NONE);

    // scheduleAction 函数签名: (context, delayFrames, actionName, params?, source?)
    // 在积木代码中，ctx 就是 context
    const args: string[] = [];
    args.push(delayFramesCode);
    args.push(`"${actionName}"`);
    if (paramsCode) {
      args.push(paramsCode);
    } else {
      args.push("undefined");
    }
    if (sourceCode) {
      args.push(sourceCode);
    } else {
      args.push("undefined");
    }

    const code = `ctx.scheduleAction(${args.join(", ")});\n`;
    return code;
  };

  return blockId;
}

/**
 * 为 scheduleAction 函数创建积木（用于延迟调用自定义函数）
 * 参数：delayFrames (number), functionName (string), params (可选 json), source (可选 string)
 */
export function createScheduleFunctionBlock() {
  const blockId = "schedule_function";

  Blocks[blockId] = {
    init: function () {
      this.appendDummyInput().appendField("延迟执行函数");
  
      // 强制竖排显示各个输入
      this.setInputsInline(false);
      
      // delayFrames: number
      this.appendValueInput("delayFrames")
        .appendField("延迟帧数")
        .setCheck("Number");
      
      // functionName: string (使用文本输入)
      this.appendValueInput("functionName")
        .appendField("函数名称")
        .setCheck(["String", null]);
      
      // params: optional json (使用文本输入，用户输入 JSON)
      this.appendValueInput("params")
        .appendField("参数(可选)")
        .setCheck(null);
      
      // source: optional string
      this.appendValueInput("source")
        .appendField("来源(可选)")
        .setCheck(["String", null]);
  
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(230);
      this.setTooltip("延迟执行指定的自定义函数（函数名会自动编码）");
      this.setHelpUrl("");
    },
  };

  javascriptGenerator.forBlock[blockId] = function (block, generator) {
    const delayFramesCode = generator.valueToCode(block, "delayFrames", Order.NONE) || "0";
    const functionNameCode = generator.valueToCode(block, "functionName", Order.NONE) || '""';
    const paramsCode = generator.valueToCode(block, "params", Order.NONE);
    const sourceCode = generator.valueToCode(block, "source", Order.NONE);

    // 获取函数名字符串，并编码为 Blockly 格式
    // functionNameCode 可能是字符串字面量（如 "蓄力"）或变量
    // 如果是字符串字面量，在生成时编码；否则使用运行时编码函数
    let encodedFunctionName: string;
    
    // 检查是否是字符串字面量（以引号开头和结尾）
    const stringLiteralMatch = functionNameCode.match(/^["'](.+)["']$/);
    if (stringLiteralMatch) {
      // 字符串字面量：在生成时编码
      const functionName = stringLiteralMatch[1];
      encodedFunctionName = `"${encodeFunctionName(functionName)}"`;
    } else {
      // 变量或表达式：使用运行时编码
      // 创建一个内联的编码函数
      encodedFunctionName = `(function(name) {
        if (typeof name !== 'string') return name;
        var result = '';
        for (var i = 0; i < name.length; i++) {
          var char = name[i];
          var code = char.charCodeAt(0);
          if ((code >= 0x30 && code <= 0x39) || (code >= 0x41 && code <= 0x5A) || (code >= 0x61 && code <= 0x7A) || code === 0x5F) {
            result += char;
          } else {
            // 使用 TextEncoder 编码 UTF-8（如果可用）
            try {
              var encoder = new TextEncoder();
              var utf8 = encoder.encode(char);
              result += '_' + Array.from(utf8).map(function(b) {
                return b.toString(16).toUpperCase().padStart(2, '0');
              }).join('_');
            } catch (e) {
              // 降级方案：使用 charCodeAt（不准确，但可用）
              var hex = code.toString(16).toUpperCase();
              result += '_' + (hex.length === 1 ? '0' : '') + hex;
            }
          }
        }
        return result;
      })(${functionNameCode})`;
    }

    const args: string[] = [];
    args.push(delayFramesCode);
    args.push(encodedFunctionName);
    if (paramsCode) {
      args.push(paramsCode);
    } else {
      args.push("undefined");
    }
    if (sourceCode) {
      args.push(sourceCode);
    } else {
      args.push("undefined");
    }

    const code = `ctx.scheduleAction(${args.join(", ")});\n`;
    return code;
  };

  return blockId;
}



