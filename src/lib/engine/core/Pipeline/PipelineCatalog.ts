import { BuiltInBinaryOpPipelines } from "./builtInBinaryOpPipelines";
import type { PipelineCatalog as PipelineCatalogType, PipelineName } from "./catalog";
import type { PipelineInstruction } from "./instruction";

/**
 * 说明： 
 * - Catalog 在引擎初始化时构建一次
 * - 构建后只读（无 register/replace）
 */
export class PipelineCatalog implements PipelineCatalogType {
	public readonly version: number;

	private readonly baseByName: ReadonlyMap<PipelineName, readonly PipelineInstruction[]>;
	private readonly names: readonly PipelineName[];

	constructor(defs: Record<string, readonly PipelineInstruction[]> = BuiltInBinaryOpPipelines, version = 1) {
		this.version = version;

		const entries: Array<[PipelineName, readonly PipelineInstruction[]]> = [];
		for (const [name, instrs] of Object.entries(defs)) {
			entries.push([name, Object.freeze([...instrs])]);
		}

		this.baseByName = new Map(entries);
		this.names = Object.freeze(entries.map(([n]) => n));
		Object.freeze(this);
	}

	getBase(name: PipelineName): readonly PipelineInstruction[] | undefined {
		return this.baseByName.get(name);
	}

	getNames(): readonly PipelineName[] {
		return this.names;
	}
}

