import { type CompiledPipeline, compilePipeline } from "./InstructionCompiler";
import type { PipelineInstruction } from "./instruction";
import type { OverlayOperation, PipelineOverlay } from "./overlay";
import type { PipelineValues } from "./PipelineValues";
import type { STANDARD_PIPELINES } from "./standard";

export type PipelineDefinitions = Readonly<Record<string, readonly PipelineInstruction[]>>;
export type PipelineNameOf<TDefinitions extends PipelineDefinitions> = keyof TDefinitions & string;
export type PipelineName = PipelineNameOf<typeof STANDARD_PIPELINES>;

export type PipelineLayerKind = "world" | "camp" | "team" | "member" | "skill";

export interface LayerRef {
	readonly kind: PipelineLayerKind;
	readonly id: string;
}

interface LayerRevision {
	readonly ref: LayerRef;
	readonly revision: number;
}

interface ResolvedPipelineEntry {
	readonly instructions: readonly PipelineInstruction[];
	readonly compiled: CompiledPipeline;
	readonly provenance: readonly LayerRevision[];
}

interface PipelineLayer {
	readonly ref: LayerRef;
	revision: number;
	overlays: PipelineOverlay[];
	readonly entries: Map<string, ResolvedPipelineEntry>;
}

const REQUIRED_LAYER_ORDER: readonly PipelineLayerKind[] = ["world", "camp", "team", "member", "skill"];

export class PipelineService {
	private readonly definitions: PipelineDefinitions;
	private readonly baseCompiled = new Map<string, CompiledPipeline>();
	private readonly layers = new Map<string, PipelineLayer>();
	private layerChain: readonly LayerRef[] = [];

	constructor(definitions: PipelineDefinitions) {
		this.definitions = freezeDefinitions(definitions);
		for (const [name, instructions] of Object.entries(this.definitions)) {
			validateInstructions(name, instructions);
			this.baseCompiled.set(name, compilePipeline(instructions));
		}
	}

	getPipelineNames(): readonly PipelineNameOf<PipelineDefinitions>[] {
		return Object.freeze(Object.keys(this.definitions));
	}

	addOverlay(layerRef: LayerRef, overlay: PipelineOverlay): void {
		this.assertPipelineExists(overlay.pipelineName);
		validateOverlay(overlay);
		const layer = this.getOrCreateLayer(layerRef);
		layer.overlays = layer.overlays.filter((item) => item.id !== overlay.id);
		layer.overlays.push(freezeOverlay(overlay));
		layer.revision += 1;
	}

	removeOverlay(layerRef: LayerRef, sourceId: string): void {
		const layer = this.getOrCreateLayer(layerRef);
		const next = layer.overlays.filter((overlay) => overlay.sourceId !== sourceId);
		if (next.length === layer.overlays.length) return;
		layer.overlays = next;
		layer.revision += 1;
	}

	clearLayer(layerRef: LayerRef): void {
		this.layers.delete(layerKey(layerRef));
	}

	setLayerChain(layers: readonly LayerRef[]): void {
		this.layerChain = this.normalizeLayerChain(layers);
	}

	run<TName extends PipelineNameOf<PipelineDefinitions>>(pipelineName: TName, params: PipelineValues): PipelineValues {
		this.assertPipelineExists(pipelineName);
		const entry = this.resolveForChain(pipelineName, this.layerChain);
		return entry.compiled(params);
	}

	private resolveForChain(pipelineName: string, chain: readonly LayerRef[]): ResolvedPipelineEntry {
		let parent: ResolvedPipelineEntry | undefined;
		for (const ref of chain) {
			const layer = this.getOrCreateLayer(ref);
			const current = layer.entries.get(pipelineName);
			const provenance = parent
				? [...parent.provenance, { ref, revision: layer.revision }]
				: [{ ref, revision: layer.revision }];
			if (current && sameProvenance(current.provenance, provenance)) {
				parent = current;
				continue;
			}
			const instructions = applyOverlays(
				parent?.instructions ?? this.getBase(pipelineName),
				layer.overlays,
				pipelineName,
			);
			const next: ResolvedPipelineEntry = {
				instructions: Object.freeze(instructions),
				compiled: compilePipeline(instructions),
				provenance,
			};
			layer.entries.set(pipelineName, next);
			parent = next;
		}
		if (parent) return parent;
		return {
			instructions: this.getBase(pipelineName),
			compiled: this.baseCompiled.get(pipelineName) as CompiledPipeline,
			provenance: [],
		};
	}

	private getOrCreateLayer(ref: LayerRef): PipelineLayer {
		const key = layerKey(ref);
		const existing = this.layers.get(key);
		if (existing) return existing;
		const layer: PipelineLayer = { ref, revision: 0, overlays: [], entries: new Map() };
		this.layers.set(key, layer);
		return layer;
	}

	private getBase(name: string): readonly PipelineInstruction[] {
		const base = this.definitions[name];
		if (!base) throw new Error(`PipelineService: 未找到管线：${name}`);
		return base;
	}

	private assertPipelineExists(name: string): void {
		if (!this.definitions[name]) throw new Error(`PipelineService: 未找到管线：${name}`);
	}

	private normalizeLayerChain(layers: readonly LayerRef[]): readonly LayerRef[] {
		const ordered = [...layers].sort(
			(a, b) => REQUIRED_LAYER_ORDER.indexOf(a.kind) - REQUIRED_LAYER_ORDER.indexOf(b.kind),
		);
		for (let i = 1; i < ordered.length; i++) {
			if (ordered[i - 1].kind === ordered[i].kind) throw new Error(`PipelineService: 层链重复：${ordered[i].kind}`);
		}
		return ordered;
	}
}

function layerKey(ref: LayerRef): string {
	return `${ref.kind}:${ref.id}`;
}

function sameProvenance(a: readonly LayerRevision[], b: readonly LayerRevision[]): boolean {
	return (
		a.length === b.length &&
		a.every(
			(item, index) =>
				item.ref.kind === b[index].ref.kind && item.ref.id === b[index].ref.id && item.revision === b[index].revision,
		)
	);
}

function freezeDefinitions<T extends PipelineDefinitions>(definitions: T): T {
	for (const instructions of Object.values(definitions)) {
		for (const instruction of instructions) Object.freeze(instruction);
		Object.freeze(instructions);
	}
	return Object.freeze(definitions);
}

function freezeOverlay(overlay: PipelineOverlay): PipelineOverlay {
	return Object.freeze({ ...overlay, operations: Object.freeze([...overlay.operations]) });
}

const INSTRUCTION_OPS = new Set<PipelineInstruction["op"]>([
	"+",
	"-",
	"*",
	"/",
	"%",
	"^",
	"max",
	"min",
	"clamp",
	"floor",
	"ceil",
	"round",
	"abs",
	">",
	">=",
	"<",
	"<=",
	"==",
	"!=",
	"and",
	"or",
	"not",
	"select",
	"get",
	"eval",
]);

function validateInstructions(pipelineName: string, instructions: readonly PipelineInstruction[]): void {
	const targets = new Set<string>();
	for (const instruction of instructions) {
		if (!instruction || typeof instruction !== "object")
			throw new Error(`PipelineService: 管线 ${pipelineName} 存在非法指令`);
		if (!instruction.target || targets.has(instruction.target))
			throw new Error(`PipelineService: 管线 ${pipelineName} 存在重复或空 target：${instruction.target}`);
		if (!INSTRUCTION_OPS.has(instruction.op))
			throw new Error(`PipelineService: 管线 ${pipelineName} 存在非法操作符：${String(instruction.op)}`);
		if (typeof instruction.a !== "number" && typeof instruction.a !== "string")
			throw new Error(`PipelineService: 管线 ${pipelineName} 的 ${instruction.target} 存在非法操作数`);
		if (instruction.b !== undefined && typeof instruction.b !== "number" && typeof instruction.b !== "string")
			throw new Error(`PipelineService: 管线 ${pipelineName} 的 ${instruction.target} 存在非法操作数`);
		targets.add(instruction.target);
	}
}

function validateOverlay(overlay: PipelineOverlay): void {
	if (!overlay.id || !overlay.sourceId || !overlay.pipelineName)
		throw new Error("PipelineService: overlay 缺少身份或管线名称");
	for (const operation of overlay.operations) {
		if (!operation || typeof operation.kind !== "string")
			throw new Error(`PipelineService: overlay ${overlay.sourceId} 存在非法操作`);
		switch (operation.kind) {
			case "insertBefore":
			case "insertAfter":
				validateInstructions(overlay.pipelineName, operation.instructions);
				break;
			case "replacePipeline":
				validateInstructions(overlay.pipelineName, operation.instructions);
				break;
			case "replaceInstruction":
				validateInstructions(overlay.pipelineName, [operation.instruction]);
				break;
		}
	}
}

function applyOverlays(
	base: readonly PipelineInstruction[],
	overlays: readonly PipelineOverlay[],
	pipelineName: string,
): PipelineInstruction[] {
	const current = base.map((instruction) => ({ ...instruction }));
	const selected = overlays
		.filter((overlay) => overlay.pipelineName === pipelineName)
		.sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
	for (const overlay of selected) {
		for (const operation of overlay.operations) applyOperation(current, operation, overlay.sourceId, pipelineName);
	}
	return current;
}

function applyOperation(
	instructions: PipelineInstruction[],
	operation: OverlayOperation,
	sourceId: string,
	pipelineName: string,
): void {
	const indexOf = (target: string) => instructions.findIndex((instruction) => instruction.target === target);
	const missing = (target: string): never => {
		throw new Error(`PipelineService: 管线 ${pipelineName} 的 overlay ${sourceId} 找不到 target ${target}`);
	};
	switch (operation.kind) {
		case "replacePipeline":
			instructions.splice(0, instructions.length, ...operation.instructions.map((instruction) => ({ ...instruction })));
			return;
		case "insertBefore": {
			const index = indexOf(operation.anchor);
			if (index < 0) missing(operation.anchor);
			instructions.splice(index, 0, ...operation.instructions.map((instruction) => ({ ...instruction })));
			return;
		}
		case "insertAfter": {
			const index = indexOf(operation.anchor);
			if (index < 0) missing(operation.anchor);
			instructions.splice(index + 1, 0, ...operation.instructions.map((instruction) => ({ ...instruction })));
			return;
		}
		case "replaceInstruction": {
			const index = indexOf(operation.target);
			if (index < 0) missing(operation.target);
			instructions[index] = { ...operation.instruction };
			return;
		}
		case "removeInstruction": {
			const index = indexOf(operation.target);
			if (index < 0) missing(operation.target);
			instructions.splice(index, 1);
			return;
		}
		case "replaceOperand": {
			const index = indexOf(operation.target);
			if (index < 0) missing(operation.target);
			const old = instructions[index];
			instructions[index] =
				operation.operand === "a" ? { ...old, a: operation.newValue } : { ...old, b: operation.newValue };
			return;
		}
	}
}
