import type { PipelineDef, StagePool } from "./types";

/**
 * 管线定义仓库。
 *
 * 说明：
 * - 这里存放“默认阶段池 + 默认管线定义”
 * - 它是各级管线编排的模板来源
 */
export class PipelineRegistry<TStageContext extends {}, TStagePool extends StagePool<TStageContext>> {
	private readonly pipelineDef: PipelineDef<TStagePool> = {};

	constructor(
		public readonly stagePool: TStagePool,
		initialPipelines: PipelineDef<TStagePool> = {},
	) {
		this.replacePipelines(initialPipelines);
	}

	getPipelineDefSnapshot(): PipelineDef<TStagePool> {
		const snapshot: PipelineDef<TStagePool> = {};
		for (const [name, stages] of Object.entries(this.pipelineDef)) {
			snapshot[name] = [...stages] as PipelineDef<TStagePool>[string];
		}
		return snapshot;
	}

	replacePipelines(def: PipelineDef<TStagePool> = {}): void {
		for (const name of Object.keys(this.pipelineDef)) {
			delete this.pipelineDef[name];
		}
		for (const [name, stages] of Object.entries(def)) {
			if (!name || !Array.isArray(stages)) continue;
			this.pipelineDef[name] = [...stages] as PipelineDef<TStagePool>[string];
		}
	}

	registerPipelines(def: PipelineDef<TStagePool>): () => void {
		const added = Object.keys(def);
		for (const [name, stages] of Object.entries(def)) {
			if (!name || !Array.isArray(stages)) continue;
			this.pipelineDef[name] = [...stages] as PipelineDef<TStagePool>[string];
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
