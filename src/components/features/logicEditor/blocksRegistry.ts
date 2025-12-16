import {
  createPipelineDefinitionBlock,
  type PipelineMeta,
  type StageMeta,
  type CustomPipelineMeta,
  makeStageBlockId,
} from "./blocks";
import { ActionBlockGenerator } from "./blocks/actionBlockGenerator";
import { registerBehavior3Blocks } from "./blocks/behavior3/behavior3Blocks";
import { registerInputsRefsBlocks } from "./blocks/inputsRefsBlocks";

export interface BlocksRegistryOptions {
  builtinPipelineMetas: PipelineMeta[];
  builtinStageMetas: StageMeta[];
  initialCustomPipelines?: CustomPipelineMeta[];
}

export interface BlocksRegistry {
  updateCustomPipelines: (custom: CustomPipelineMeta[]) => void;
  getPipelineNames: () => string[];
  /** 构建工具箱分类（BT / Pipeline / Action / Inputs-Refs） */
  buildToolboxCategories: () => any[];
}

const mergePipelineMetas = (builtin: PipelineMeta[], custom: CustomPipelineMeta[]) => {
  const customMetas: PipelineMeta[] = custom.map((cp) => ({
    name: cp.name,
    category: cp.category ?? "custom",
    displayName: cp.displayName,
    desc: cp.desc,
    params: [],
  }));
  return Array.from(new Map([...builtin, ...customMetas].map((m) => [m.name, m])).values());
};

export function createBlocksRegistry(options: BlocksRegistryOptions): BlocksRegistry {
  let customPipelines = options.initialCustomPipelines ?? [];

  const getPipelineMetas = () => mergePipelineMetas(options.builtinPipelineMetas, customPipelines);
  const getPipelineNames = () => getPipelineMetas().map((m) => m.name);

  // 注册积木
  // 1. Behavior3 BT 块（不包括 bt_root，它由系统自动管理）
  const btBlockIds = registerBehavior3Blocks(getPipelineNames).filter((id) => id !== "bt_root");

  // 2. Pipeline 定义块
  const pipelineDefinitionBlockId = createPipelineDefinitionBlock();

  // 3. Action 块（动态生成）
  const actionBlockGenerator = new ActionBlockGenerator(options.builtinStageMetas);
  const actionBlockIds = actionBlockGenerator.getBlockIds();

  // 4. 参数与引用（Inputs/Refs）块
  const inputsRefsBlockIds = registerInputsRefsBlocks();

  const buildToolboxCategories = () => {
    return [
      // 1. 行为树（BT）- 不包含 bt_root
      {
        kind: "category",
        name: "行为树",
        categorystyle: "logic_category",
        contents: btBlockIds.map((id) => ({
          type: id,
          kind: "block" as const,
        })),
      },
      // 2. 管线（Pipeline）
      {
        kind: "category",
        name: "管线",
        categorystyle: "math_category",
        contents: [
          {
            type: pipelineDefinitionBlockId,
            kind: "block" as const,
          },
        ],
      },
      // 3. 动作（Action）
      {
        kind: "category",
        name: "动作",
        categorystyle: "logic_category",
        contents: actionBlockIds.map((id) => ({
          type: id,
          kind: "block" as const,
        })),
      },
      // 4. 参数与引用（Inputs/Refs）- 暂时为空，后续添加表达式、字段名选择等
      {
        kind: "category",
        name: "参数与引用",
        // 统一色系：本分组块使用绿色（120），因此用 logic_category
        categorystyle: "logic_category",
        contents: inputsRefsBlockIds.map((id) => ({
          type: id,
          kind: "block" as const,
        })),
      },
    ];
  };

  return {
    updateCustomPipelines: (custom) => {
      customPipelines = custom;
    },
    getPipelineNames,
    buildToolboxCategories,
  };
}
