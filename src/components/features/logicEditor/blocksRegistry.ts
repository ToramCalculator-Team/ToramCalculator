import {
  PipelineBlockGenerator,
  StageBlockGenerator,
  createPipelineDefinitionBlock,
  createSchedulePipelineBlock,
  createFinishSkillBlock,
  createStartSkillBlock,
  type PipelineMeta,
  type StageMeta,
  type CustomPipelineMeta,
  makePipelineBlockId,
  makeStageBlockId,
} from "./blocks";

export interface BlocksRegistryOptions {
  builtinPipelineMetas: PipelineMeta[];
  builtinStageMetas: StageMeta[];
  initialCustomPipelines?: CustomPipelineMeta[];
}

export interface BlocksRegistry {
  updateCustomPipelines: (custom: CustomPipelineMeta[]) => void;
  getPipelineNames: () => string[];
  /** 引擎类分类（管线/动作） */
  buildEngineCategories: () => any[];
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

  // 注册积木（注册行为发生在构造函数和辅助函数内部）
  const pipelineBlockGenerator = new PipelineBlockGenerator(getPipelineMetas());
  const stageBlockGenerator = new StageBlockGenerator(options.builtinStageMetas);
  const pipelineDefinitionBlockId = createPipelineDefinitionBlock();
  const schedulePipelineBlockId = createSchedulePipelineBlock(() => getPipelineNames());
  const finishSkillBlockId = createFinishSkillBlock();
  const startSkillBlockId = createStartSkillBlock();

  const buildEngineCategories = () => {
    const metas = getPipelineMetas();
    return [
      {
        kind: "category",
        name: "管线",
        categorystyle: "math_category",
        contents: [
          ...metas.map((m) => ({
            type: makePipelineBlockId(m.name),
            kind: "block" as const,
          })),
          {
            type: pipelineDefinitionBlockId,
            kind: "block" as const,
          },
        ],
      },
      {
        kind: "category",
        name: "动作",
        categorystyle: "logic_category",
        contents: [
          {
            type: startSkillBlockId,
            kind: "block" as const,
          },
          ...options.builtinStageMetas.map((m) => ({
            type: makeStageBlockId(m.name),
            kind: "block" as const,
          })),
          {
            type: schedulePipelineBlockId,
            kind: "block" as const,
          },
          {
            type: finishSkillBlockId,
            kind: "block" as const,
          },
        ],
      },
    ];
  };

  return {
    updateCustomPipelines: (custom) => {
      customPipelines = custom;
    },
    getPipelineNames,
    buildEngineCategories,
  };
}


