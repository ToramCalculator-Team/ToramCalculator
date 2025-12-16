import { ZodBoolean, ZodEnum, ZodNumber, ZodObject, ZodString, ZodType } from "zod/v4";

export type PipelineParamKind = "number" | "boolean" | "string" | "enum" | "json";

export interface PipelineParamMeta {
  name: string;
  kind: PipelineParamKind;
  required: boolean;
  enumOptions?: string[];
  displayName?: string;
  desc?: string;
}

export interface PipelineMeta {
  name: string;
  category: string;
  displayName?: string;
  desc?: string;
  params: PipelineParamMeta[];
}

export interface CustomPipelineMeta {
  /** 对应 pipeline_definition 块 id（用于识别 rename 并同步引用） */
  sourceBlockId?: string;
  name: string;
  category?: string;
  displayName?: string;
  desc?: string;
  actions: string[];
}

/**
 * 编辑器侧对“动作(stage)”的最小抽象：
 * - 不依赖运行时 Action 类型定义（避免 logicEditor/blocks 层与 simulator runtime 强耦合）
 */
export type AnyAction = readonly [ZodType<any> | undefined, ZodType<any> | undefined, unknown];

export const makePipelineBlockId = (pipelineName: string): string => {
  const safeName = pipelineName
    .split("")
    .map((char) => {
      if (/[a-zA-Z0-9_]/.test(char)) return char;
      return `u${char.charCodeAt(0).toString(16)}`;
    })
    .join("");
  return `pipeline_${safeName}`;
};

export const makeActionBlockId = (actionName: string): string => {
  const safeName = actionName
    .split("")
    .map((char) => {
      if (/[a-zA-Z0-9_]/.test(char)) {
        return char;
      }
      return `u${char.charCodeAt(0).toString(16)}`;
    })
    .join("");
  return `action_${safeName}`;
};

export const decodeActionBlockId = (blockType: string): string | null => {
  if (!blockType.startsWith("action_")) return null;
  const encoded = blockType.replace(/^action_/, "");
  return encoded.replace(/u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
};

// 兼容：stageBlocks.ts 使用 stage_ 前缀命名（历史原因），这里与 action_ 统一同一套编码/解码。
export const makeStageBlockId = (stageName: string): string => makeActionBlockId(stageName);
export const decodeStageBlockId = (blockType: string): string | null => decodeActionBlockId(blockType);

export interface StageMeta {
  name: string;
  params: PipelineParamMeta[];
  outputKind?: "number" | "boolean" | "string" | "json";
  outputField?: string;
}

const unwrapEffectsAndOptionals = (schema: ZodType): ZodType => {
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

const unwrapOptional = (schema: ZodType): { base: ZodType; required: boolean } => {
  const def: any = (schema as any)._def;
  const typeName: string | undefined = def?.typeName;
  if (typeName === "ZodOptional" || typeName === "ZodDefault") {
    return { base: unwrapEffectsAndOptionals(schema), required: false };
  }
  return { base: unwrapEffectsAndOptionals(schema), required: true };
};

const extractParamsFromSchema = (schema: ZodType | undefined): PipelineParamMeta[] => {
  if (!schema) return [];

  const unwrapped = unwrapEffectsAndOptionals(schema);
  if (!(unwrapped instanceof ZodObject)) {
    return [];
  }

  const shape = (unwrapped as ZodObject<Record<string, ZodType>>).shape;
  const metas: PipelineParamMeta[] = [];

  for (const key of Object.keys(shape)) {
    const fieldSchema = shape[key];
    const { base, required } = unwrapOptional(fieldSchema);

    let kind: PipelineParamKind = "json";
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
 * 提取输出字段名称（仅处理对象）
 */
const extractOutputKeys = (schema: ZodType | undefined): string[] => {
  if (!schema) return [];
  const unwrapped = unwrapEffectsAndOptionals(schema);
  if (!(unwrapped instanceof ZodObject)) return [];
  return Object.keys((unwrapped as ZodObject<Record<string, ZodType>>).shape);
};

export interface ActionMeta {
  name: string;
  params: PipelineParamMeta[];
  outputKind?: "number" | "boolean" | "string" | "json";
  outputField?: string;
}

export const inferOutputFromSchema = (schema: ZodType | undefined): { kind?: ActionMeta["outputKind"]; field?: string } => {
  if (!schema) return { kind: undefined };
  const unwrapped = unwrapEffectsAndOptionals(schema);

  if (unwrapped instanceof ZodNumber) return { kind: "number" };
  if (unwrapped instanceof ZodBoolean) return { kind: "boolean" };
  if (unwrapped instanceof ZodString) return { kind: "string" };
  if (unwrapped instanceof ZodObject) {
    const shape = (unwrapped as ZodObject<Record<string, ZodType>>).shape;
    const keys = Object.keys(shape);
    if (keys.length === 1) {
      const key = keys[0];
      const nested = unwrapEffectsAndOptionals(shape[key]);
      if (nested instanceof ZodNumber) return { kind: "number", field: key };
      if (nested instanceof ZodBoolean) return { kind: "boolean", field: key };
      if (nested instanceof ZodString) return { kind: "string", field: key };
    }
  }

  return { kind: "json" };
};

export const buildActionMetas = (actionPool: Record<string, AnyAction>): ActionMeta[] => {
  const metas: ActionMeta[] = [];
  for (const actionName of Object.keys(actionPool)) {
    const def = actionPool[actionName] as AnyAction;
    const [inputSchema, outputSchema] = def;
    metas.push({
      name: actionName,
      params: extractParamsFromSchema(inputSchema),
      outputKind: inferOutputFromSchema(outputSchema).kind,
      outputField: inferOutputFromSchema(outputSchema).field,
    });
  }
  return metas;
};

export const buildStageMetas = (actionPool: Record<string, AnyAction>): StageMeta[] => {
  return buildActionMetas(actionPool).map((m) => ({
    name: m.name,
    params: m.params,
    outputKind: m.outputKind,
    outputField: m.outputField,
  }));
};


