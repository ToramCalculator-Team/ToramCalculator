import { ZodBoolean, ZodEnum, ZodNumber, ZodObject, ZodString, ZodType } from "zod/v4";
import {
  PlayerPipelineStages,
  PlayerPipelineDef,
  type PlayerStagePool,
} from "../../simulator/core/Member/types/Player/PlayerPipelines";
import type { PipelineStage } from "../../simulator/core/Member/runtime/Pipeline/PipelineStageType";

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
  name: string;
  category?: string;
  displayName?: string;
  desc?: string;
  stages: string[];
}

type AnyStage = PipelineStage<ZodType, ZodType, Record<string, unknown>>;

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

export const makeStageBlockId = (stageName: string): string => {
  const safeName = stageName
    .split("")
    .map((char) => {
      if (/[a-zA-Z0-9_]/.test(char)) {
        return char;
      }
      return `u${char.charCodeAt(0).toString(16)}`;
    })
    .join("");
  return `stage_${safeName}`;
};

export const decodeStageBlockId = (blockType: string): string | null => {
  if (!blockType.startsWith("stage_")) return null;
  const encoded = blockType.replace(/^stage_/, "");
  return encoded.replace(/u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
};

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

export const buildPlayerPipelineMetas = (): PipelineMeta[] => {
  const metas: PipelineMeta[] = [];

  const def: PlayerPipelineDef = PlayerPipelineDef;
  const stagePool: PlayerStagePool = PlayerPipelineStages;

  for (const pipelineName of Object.keys(def) as (keyof PlayerPipelineDef)[]) {
    const stageNames = def[pipelineName];

    const available = new Set<string>(); // 已有的上下文字段（前序输出或入口）
    const required = new Map<string, PipelineParamMeta>(); // 需要入口提供的参数

    for (const stageName of stageNames) {
      const stageDef = stagePool[stageName] as unknown as AnyStage | undefined;
      if (!stageDef) continue;
      const [inputSchema, outputSchema] = stageDef;

      // 输入需要的字段
      const params = extractParamsFromSchema(inputSchema);
      for (const p of params) {
        if (!available.has(p.name) && !required.has(p.name)) {
          required.set(p.name, p);
          available.add(p.name); // 入口提供后视为可用
        }
      }

      // 输出字段加入可用集合
      const outputKeys = extractOutputKeys(outputSchema);
      for (const key of outputKeys) {
        available.add(key);
      }
    }

    const category = pipelineName.toString().split(".")[0] || "pipeline";

    metas.push({
      name: pipelineName as string,
      category,
      displayName: pipelineName as string,
      params: Array.from(required.values()),
    });
  }

  return metas;
};

export const buildPlayerStageMetas = () => {
  const metas: StageMeta[] = [];
  const stagePool: PlayerStagePool = PlayerPipelineStages;

  for (const stageName of Object.keys(stagePool) as (keyof PlayerStagePool)[]) {
    const stageDef = stagePool[stageName] as unknown as AnyStage;
    const [inputSchema, outputSchema] = stageDef;

    const params = extractParamsFromSchema(inputSchema);
    const outputKind = inferOutputFromSchema(outputSchema);

    metas.push({
      name: stageName as string,
      params,
      outputKind: outputKind.kind,
      outputField: outputKind.field,
    });
  }

  return metas;
};

export interface StageMeta {
  name: string;
  params: PipelineParamMeta[];
  outputKind?: "number" | "boolean" | "string" | "json";
  outputField?: string;
}

const inferOutputFromSchema = (schema: ZodType | undefined): { kind?: StageMeta["outputKind"]; field?: string } => {
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


