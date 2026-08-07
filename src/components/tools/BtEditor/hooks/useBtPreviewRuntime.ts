import type { MemberType } from "@db/schema/enums";
import { createSignal, onCleanup } from "solid-js";
import type { BehaviourTree, State } from "~/lib/mistreevous";
import type { NodeDetails } from "~/lib/mistreevous/nodes/Node";
import type { BtAuthoringDiagnostic } from "../model/authoringValidator";
import type { EditableBtDocument } from "../model/editableTree";
import { editableDocumentToRootDefinitions } from "../model/editableTree";
import { createPreviewBehaviourTree } from "../model/previewRuntime";
import type { MdslIntellisenseRegistry } from "../modes/mdslIntellisense";
import { getErrorMessage } from "../utils/errors";

type RuntimeNodeStateMap = Record<string, State>;

type DebugLogEntry = {
	tick: number;
	message: string;
};

export type UseBtPreviewRuntimeOptions = {
	getDocument: () => EditableBtDocument;
	getAgent: () => string;
	getMemberType: () => MemberType;
	getRegistry: () => MdslIntellisenseRegistry;
	onError: (message: string) => void;
};

/**
 * 管理编辑器预览运行时。
 *
 * 设计说明：预览实例与文档编辑解耦；调用方在文档变更前停止预览，避免旧 interval 写回新文档状态。
 */
export function useBtPreviewRuntime(options: UseBtPreviewRuntimeOptions) {
	const [behaviourTree, setBehaviourTree] = createSignal<BehaviourTree | null>(null);
	const [behaviourTreePlayInterval, setBehaviourTreePlayInterval] = createSignal<number | null>(null);
	const [debugTick, setDebugTick] = createSignal(0);
	const [debugLogs, setDebugLogs] = createSignal<DebugLogEntry[]>([]);
	const [runtimeNodeStates, setRuntimeNodeStates] = createSignal<RuntimeNodeStateMap>({});
	const [previewDiagnostics, setPreviewDiagnostics] = createSignal<BtAuthoringDiagnostic[]>([]);

	const appendPreviewDiagnostic = (diagnostic: BtAuthoringDiagnostic) => {
		setPreviewDiagnostics((diagnostics) => {
			const key = createDiagnosticKey(diagnostic);
			if (diagnostics.some((current) => createDiagnosticKey(current) === key)) return diagnostics;
			return [...diagnostics, diagnostic];
		});
	};

	const createTreeInstance = (): BehaviourTree => {
		const result = createPreviewBehaviourTree({
			definition: editableDocumentToRootDefinitions(options.getDocument()),
			agent: options.getAgent(),
			memberType: options.getMemberType(),
			registry: options.getRegistry(),
			onDiagnostic: (diagnostic) => {
				appendPreviewDiagnostic(diagnostic);
				if (diagnostic.severity === "warning") {
					setDebugLogs((logs) => [{ tick: debugTick(), message: diagnostic.message }, ...logs].slice(0, 20));
				}
			},
			behaviourTreeOptions: {
				// 预览按固定逻辑帧推进，避免 UI 帧率影响节点时间判断。
				getDeltaTimeMs: () => 1000 / 60,
				onNodeStateChange: (change) => {
					setDebugLogs((logs) =>
						[
							{ tick: debugTick(), message: `${change.type} ${change.previousState} -> ${change.state}` },
							...logs,
						].slice(0, 20),
					);
				},
			},
		});
		setPreviewDiagnostics(result.diagnostics);
		return result.tree;
	};

	const refreshTreeInstance = () => {
		try {
			const instance = createTreeInstance();
			setBehaviourTree(instance);
			setRuntimeNodeStates({});
			return "";
		} catch (error) {
			setBehaviourTree(null);
			setRuntimeNodeStates({});
			setPreviewDiagnostics([]);
			return getErrorMessage(error);
		}
	};

	const stopPreview = (stopOptions: { resetTree?: boolean } = {}) => {
		const interval = behaviourTreePlayInterval();
		if (interval) clearInterval(interval);
		if (stopOptions.resetTree !== false) behaviourTree()?.reset();
		const tree = behaviourTree();
		setRuntimeNodeStates(
			tree && stopOptions.resetTree !== false ? collectRuntimeNodeStates(tree.getTreeNodeDetails()) : {},
		);
		setBehaviourTreePlayInterval(null);
	};

	const resetPreviewForEdit = () => {
		stopPreview({ resetTree: false });
		setRuntimeNodeStates({});
		setPreviewDiagnostics([]);
	};

	const stepPreview = () => {
		const tree = behaviourTree();
		if (!tree) return;
		try {
			tree.step();
			setRuntimeNodeStates(collectRuntimeNodeStates(tree.getTreeNodeDetails()));
			setDebugTick((tick) => tick + 1);
		} catch (exception) {
			options.onError(getErrorMessage(exception));
			stopPreview();
		}
		if (!tree.isRunning()) {
			const interval = behaviourTreePlayInterval();
			if (interval) clearInterval(interval);
			setBehaviourTreePlayInterval(null);
		}
	};

	const playPreview = () => {
		let tree = behaviourTree();
		if (!tree) {
			const error = refreshTreeInstance();
			if (error) return error;
			tree = behaviourTree();
		}
		if (!tree) return "";
		tree.reset();
		setDebugTick(0);
		setRuntimeNodeStates(collectRuntimeNodeStates(tree.getTreeNodeDetails()));
		const existingInterval = behaviourTreePlayInterval();
		if (existingInterval) clearInterval(existingInterval);
		const playInterval = window.setInterval(() => stepPreview(), 100);
		setBehaviourTreePlayInterval(playInterval);
		return "";
	};

	onCleanup(() => {
		const interval = behaviourTreePlayInterval();
		if (interval) clearInterval(interval);
	});

	return {
		behaviourTree,
		behaviourTreePlayInterval,
		debugTick,
		debugLogs,
		runtimeNodeStates,
		previewDiagnostics,
		refreshTreeInstance,
		stopPreview,
		resetPreviewForEdit,
		playPreview,
		stepPreview,
	};
}

function collectRuntimeNodeStates(
	details: NodeDetails,
	path = "0",
	acc: RuntimeNodeStateMap = {},
): RuntimeNodeStateMap {
	acc[path] = details.state;
	for (const [index, child] of (details.children ?? []).entries()) {
		collectRuntimeNodeStates(child, `${path}.${index}`, acc);
	}
	return acc;
}

function createDiagnosticKey(diagnostic: BtAuthoringDiagnostic): string {
	return `${diagnostic.severity}:${diagnostic.code}:${diagnostic.rootKey ?? ""}:${diagnostic.nodeId ?? ""}:${diagnostic.message}`;
}
