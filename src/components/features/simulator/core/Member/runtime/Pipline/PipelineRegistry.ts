import type { CommonContext } from "../Agent/CommonContext";
import type { ActionPool, PipelineDef } from "./types";

type DefaultPipelineActionPool = ActionPool<CommonContext>;

const EmptyPipelineActionPool = {} as DefaultPipelineActionPool;

/**
 * 管线定义仓库。
 *
 * 说明：
 * - 这里存放“定义”，不负责实际执行。
 * - 当前先冻结基础能力：动作池 + 基础 pipelineDef。
 * - 多级 scope patch 会在后续迭代继续接入。
 */
export class PipelineRegistry<
	TActionContext extends CommonContext = CommonContext,
	TActionPool extends ActionPool<TActionContext> = ActionPool<TActionContext>,
> {
	private readonly pipelineDef: PipelineDef<TActionPool> = {};

	constructor(
		public readonly actionPool: TActionPool,
		initialPipelines: PipelineDef<TActionPool> = {},
	) {
		this.replacePipelines(initialPipelines);
	}

	getPipelineDefSnapshot(): PipelineDef<TActionPool> {
		const snapshot: PipelineDef<TActionPool> = {};
		for (const [name, stages] of Object.entries(this.pipelineDef)) {
			snapshot[name] = [...stages] as PipelineDef<TActionPool>[string];
		}
		return snapshot;
	}

	replacePipelines(def: PipelineDef<TActionPool> = {}): void {
		for (const name of Object.keys(this.pipelineDef)) {
			delete this.pipelineDef[name];
		}
		for (const [name, stages] of Object.entries(def)) {
			if (!name || !Array.isArray(stages)) continue;
			this.pipelineDef[name] = [...stages] as PipelineDef<TActionPool>[string];
		}
	}

	registerPipelines(def: PipelineDef<TActionPool>): () => void {
		const added = Object.keys(def);
		for (const [name, stages] of Object.entries(def)) {
			if (!name || !Array.isArray(stages)) continue;
			this.pipelineDef[name] = [...stages] as PipelineDef<TActionPool>[string];
		}
		return () => {
			for (const name of added) {
				delete this.pipelineDef[name];
			}
		};
	}

	hasPipeline(name: string): boolean {
		return !!this.pipelineDef[name];
	}

	getPipelineNames(): string[] {
		return Object.keys(this.pipelineDef);
	}
}

export const createEmptyPipelineRegistry = () =>
	new PipelineRegistry<CommonContext, DefaultPipelineActionPool>(EmptyPipelineActionPool, {});
