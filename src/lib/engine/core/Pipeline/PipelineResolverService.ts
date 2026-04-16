import type { PipelineName } from "./catalog";
import { type CompiledPipeline, compilePipeline } from "./InstructionCompiler";
import type { PipelineInstruction } from "./instruction"; 
import type { OverlayOperation, PipelineOverlay } from "./overlay";
import type { PipelineCatalog } from "./PipelineCatalog";
import type { ResolvedPipeline } from "./resolver";
import type { StageData, StageEnv } from "./stageEnv";
 
/**
 * 职责：
 * - 从 Catalog 取基础指令序列
 * - 按 overlay 顺序应用增量变更，得到最终指令序列
 * - 生成 signature，并缓存编译后的 closure
 */
export class PipelineResolverService {
	private readonly compiledCache = new Map<string, CompiledPipeline>();

	constructor(private readonly catalog: PipelineCatalog) {}

	resolve(pipelineName: PipelineName, overlays: readonly PipelineOverlay[]): ResolvedPipeline {
		const base = this.catalog.getBase(pipelineName);
		if (!base) {
			throw new Error(`未找到基础管线：${pipelineName}`);
		}

		const sorted = [...overlays]
			.filter((o) => o.pipelineName === pipelineName)
			.sort((a, b) => {
				const scopeA = a.scope === "member" ? 0 : 1;
				const scopeB = b.scope === "member" ? 0 : 1;
				if (scopeA !== scopeB) return scopeA - scopeB;
				if (a.priority !== b.priority) return a.priority - b.priority;
				if (a.revision !== b.revision) return a.revision - b.revision;
				return a.id.localeCompare(b.id);
			});

		let current: PipelineInstruction[] = [...base];
		let trace: Array<{ target: string; source: "base" | "overlay"; sourceId?: string }> = current.map((i) => ({
			target: i.target,
			source: "base",
		}));

		for (const overlay of sorted) {
			for (const op of overlay.operations) {
				({ instructions: current, trace } = applyOverlayOperation(current, trace, op, overlay.sourceId));
			}
		}

		const signature = hashInstructions(pipelineName, current);

		return { instructions: current, signature, trace };
	}

	resolveAndRun(
		pipelineName: PipelineName,
		overlays: readonly PipelineOverlay[],
		env: StageEnv,
		input: StageData,
	): StageData {
		const resolved = this.resolve(pipelineName, overlays);
		const compiled = this.getOrCompile(resolved.signature, resolved.instructions);
		return compiled(env, input);
	}

	private getOrCompile(signature: string, instructions: readonly PipelineInstruction[]): CompiledPipeline {
		const cached = this.compiledCache.get(signature);
		if (cached) return cached;
		const compiled = compilePipeline(instructions);
		this.compiledCache.set(signature, compiled);
		return compiled;
	}
}

const cloneInstrs = (xs: readonly PipelineInstruction[]): PipelineInstruction[] => xs.map((x) => ({ ...x }));

function applyOverlayOperation(
	instructions: readonly PipelineInstruction[],
	trace: readonly { target: string; source: "base" | "overlay"; sourceId?: string }[],
	op: OverlayOperation,
	sourceId: string,
): { instructions: PipelineInstruction[]; trace: Array<{ target: string; source: "base" | "overlay"; sourceId?: string }> } {
	let next = cloneInstrs(instructions);
	let nextTrace = [...trace];

	const markOverlay = (instr: PipelineInstruction) => ({ target: instr.target, source: "overlay" as const, sourceId });

	const findIndexByTarget = (t: string) => next.findIndex((i) => i.target === t);

	switch (op.kind) {
		case "replacePipeline": {
			next = cloneInstrs(op.instructions);
			nextTrace = next.map(markOverlay);
			return { instructions: next, trace: nextTrace };
		}
		case "insertAfter": {
			const idx = findIndexByTarget(op.anchor);
			const insert = cloneInstrs(op.instructions);
			const insertTrace = insert.map(markOverlay);
			if (idx < 0) {
				next.push(...insert);
				nextTrace.push(...insertTrace);
			} else {
				next.splice(idx + 1, 0, ...insert);
				nextTrace.splice(idx + 1, 0, ...insertTrace);
			}
			return { instructions: next, trace: nextTrace };
		}
		case "insertBefore": {
			const idx = findIndexByTarget(op.anchor);
			const insert = cloneInstrs(op.instructions);
			const insertTrace = insert.map(markOverlay);
			if (idx < 0) {
				next.unshift(...insert);
				nextTrace.unshift(...insertTrace);
			} else {
				next.splice(idx, 0, ...insert);
				nextTrace.splice(idx, 0, ...insertTrace);
			}
			return { instructions: next, trace: nextTrace };
		}
		case "replaceInstruction": {
			const idx = findIndexByTarget(op.target);
			if (idx < 0) return { instructions: next, trace: nextTrace };
			next[idx] = { ...op.instruction };
			nextTrace[idx] = markOverlay(next[idx]);
			return { instructions: next, trace: nextTrace };
		}
		case "removeInstruction": {
			const idx = findIndexByTarget(op.target);
			if (idx < 0) return { instructions: next, trace: nextTrace };
			next.splice(idx, 1);
			nextTrace.splice(idx, 1);
			return { instructions: next, trace: nextTrace };
		}
		case "replaceOperand": {
			const idx = findIndexByTarget(op.target);
			if (idx < 0) return { instructions: next, trace: nextTrace };
			const old = next[idx];
			next[idx] = op.operand === "a" ? { ...old, a: op.newValue } : { ...old, b: op.newValue };
			nextTrace[idx] = markOverlay(next[idx]);
			return { instructions: next, trace: nextTrace };
		}
		default: {
			const _exhaustive: never = op;
			return { instructions: next, trace: nextTrace };
		}
	}
}

function hashInstructions(pipelineName: string, instrs: readonly PipelineInstruction[]): string {
	// 简单可重复 hash：djb2 over JSON
	const json = JSON.stringify({ pipelineName, instrs });
	let h = 5381;
	for (let i = 0; i < json.length; i++) {
		h = (h * 33) ^ json.charCodeAt(i);
	}
	// 转成无符号 32bit
	return `p:${pipelineName}:h:${(h >>> 0).toString(16)}`;
}

