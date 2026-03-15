/**
 * @deprecated 请改用 `BuiltInPipelineRegistry.ts`、`StatusPipelines.ts`、`CommonPipelines.ts`。
 * 这个文件仅保留兼容导出，方便旧引用平滑迁移。
 */
export {
	BuiltInPipelineDef as DefaultPipelineDef,
	BuiltInStages as DefaultPipelineActionPool,
	createBuiltInPipelineRegistry as createDefaultPipelineRegistry,
} from "./BuiltInPipelineRegistry";
