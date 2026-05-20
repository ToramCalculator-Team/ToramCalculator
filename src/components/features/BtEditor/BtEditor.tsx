import type { MemberType } from "@db/schema/enums";
import { MEMBER_TYPE } from "@db/schema/enums";
import type { AttributeSlotDeclarationData, MemberBTTree } from "@db/schema/jsons";
import { type Component, createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { Sheet } from "~/components/containers/sheet";
import { Button } from "~/components/controls/button";
import { Icons } from "~/components/icons";
import { State } from "~/lib/mistreevous/State";
import { ExamplesMenu, SkillLogicExamplesMenu, ToastContainer } from "./components";
import { type AdvancedPanelKey, AdvancedTextPanels } from "./components/AdvancedPanels/AdvancedTextPanels";
import { DebugConsole } from "./components/DebugConsole/DebugConsole";
import { DiagnosticsDrawer } from "./components/Diagnostics/DiagnosticsDrawer";
import { DiagnosticsStatusBar } from "./components/Diagnostics/DiagnosticsStatusBar";
import {
	type BtDiagnosticListItem,
	severityClass,
	severityRank,
	toDiagnosticListItem,
} from "./components/Diagnostics/diagnosticsModel";
import { type CanvasElements, MainPanel } from "./components/MainPanel/MainPanel";
import { PreviewRuntimeStatus } from "./components/PreviewRuntimeStatus/PreviewRuntimeStatus";
import { NodeInspector } from "./components/StructuredEditor/NodeInspector";
import { NodeLibrary } from "./components/StructuredEditor/NodeLibrary";
import { type BtSubtreeNavItem, SubtreeNavBar } from "./components/SubtreeNavBar/SubtreeNavBar";
import { createCanvasElementsFromEditableTree } from "./components/workflow/createCanvasElementsFromEditableTree";
import { parseInitialEditableDocument, useBtDocument } from "./hooks/useBtDocument";
import { useBtDragDrop } from "./hooks/useBtDragDrop";
import { useBtHistory } from "./hooks/useBtHistory";
import { useBtPreviewRuntime } from "./hooks/useBtPreviewRuntime";
import { getBlockingDiagnostics, validateBtAuthoring } from "./model/authoringValidator";
import {
	addNodeAtSelection,
	canDeleteEditableRoot,
	cloneEditableDocument,
	collectEditableBranchReferences,
	createDefaultEditableDocument,
	deleteEditableNode,
	duplicateChildNode,
	type EditableBtDocument,
	type EditableBtNode,
	type EditableBtNodeType,
	type EditableBtRoot,
	type EditableBtTree,
	editableDocumentFromDefinition,
	editableDocumentToDefinitionText,
	findEditableRootByName,
	getEditableNodeCaption,
	getEditableRootBranchReferenceCount,
	getEditableRootDisplayName,
	moveEditableNode,
	updateEditableNode,
} from "./model/editableTree";
import { buildMdslIntellisenseRegistry } from "./modes/mdslIntellisense";
import { getMdslProfileConfig } from "./modes/mdslMemberTypeProfiles";
import { toast } from "./stores/toastStore";
import { DefinitionType, SidebarTab } from "./types/app";
import { getErrorMessage } from "./utils/errors";

export { DefinitionType, SidebarTab };

export type BtEditorProps = {
	title: string;
	initValue?: MemberBTTree;
	/** @deprecated 兼容旧调用点，后续统一改为 initValue。 */
	initValues?: {
		definition: string;
		agent: string;
		memberType?: MemberType;
		name?: string;
		attributeSlots?: AttributeSlotDeclarationData[];
	};
	readOnly?: boolean;
	onSave: (nextTree: MemberBTTree) => void;
	onClose?: () => void;
};

type EditorSnapshot = {
	treeName: string;
	agent: string;
	memberType: MemberType;
	attributeSlots: AttributeSlotDeclarationData[];
	document: EditableBtDocument;
	selectedNodeId?: string;
};

const emptyTree = (): MemberBTTree => ({
	name: "default",
	definition: editableDocumentToDefinitionText(createDefaultEditableDocument()),
	agent: "class Agent {}",
	memberType: "Player",
	attributeSlots: [],
});

const normalizeInitValue = (props: BtEditorProps): MemberBTTree => {
	if (props.initValue) {
		return {
			...props.initValue,
			attributeSlots: props.initValue.attributeSlots ?? [],
		};
	}
	if (props.initValues) {
		return {
			name: props.initValues.name ?? "default",
			definition: props.initValues.definition,
			agent: props.initValues.agent,
			memberType: props.initValues.memberType ?? "Player",
			attributeSlots: props.initValues.attributeSlots ?? [],
		};
	}
	return emptyTree();
};

const cloneAttributeSlots = (slots: AttributeSlotDeclarationData[]): AttributeSlotDeclarationData[] =>
	slots.map((slot) => ({
		path: slot.path,
		attribute: { ...slot.attribute },
	}));

/**
 * 行为树结构化编辑器。
 *
 * 设计说明：内部以 EditableBtDocument 为权威模型；文本面板用于导入/高级编辑，保存时统一输出 MemberBTTree。
 */
export const BtEditor: Component<BtEditorProps> = (props) => {
	const initial = normalizeInitValue(props);
	const initialEditableDocument = parseInitialEditableDocument(initial.definition);
	const [treeName, setTreeName] = createSignal(initial.name);
	const [agent, setAgent] = createSignal(initial.agent || "class Agent {}");
	const [memberType, setMemberType] = createSignal<MemberType>(initial.memberType ?? "Player");
	const [attributeSlots, setAttributeSlots] = createSignal<AttributeSlotDeclarationData[]>(
		initial.attributeSlots ?? [],
	);
	const {
		editableDocument,
		activeRoot,
		activeTree,
		definition,
		selectedNode,
		selectedNodeId,
		setSelectedNodeId,
		replaceDocument,
		replaceActiveTree,
		switchActiveRoot,
		renameRoot,
		addNamedRoot,
		deleteNamedRoot,
	} = useBtDocument(initialEditableDocument.document);
	const [definitionError, setDefinitionError] = createSignal(initialEditableDocument.error);
	const [advancedOpen, setAdvancedOpen] = createSignal(false);
	const [advancedPanel, setAdvancedPanel] = createSignal<AdvancedPanelKey>("definition");
	const [mobileInspectorOpen, setMobileInspectorOpen] = createSignal(false);
	const [diagnosticsOpen, setDiagnosticsOpen] = createSignal(false);
	const [debugConsoleOpen, setDebugConsoleOpen] = createSignal(false);
	const mdslIntellisense = createMemo(() => {
		const config = getMdslProfileConfig(memberType());
		return buildMdslIntellisenseRegistry(config, agent());
	});
	const {
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
	} = useBtPreviewRuntime({
		getDocument: editableDocument,
		getAgent: agent,
		getMemberType: memberType,
		getRegistry: mdslIntellisense,
		onError: (message) => toast.error(message),
	});
	const diagnostics = createMemo(() =>
		validateBtAuthoring({
			document: editableDocument(),
			memberType: memberType(),
			agent: agent(),
			attributeSlots: attributeSlots(),
			registry: mdslIntellisense(),
		}),
	);
	const blockingDiagnostics = createMemo(() => getBlockingDiagnostics(diagnostics()));
	const agentError = createMemo(
		() =>
			diagnostics().find((diagnostic) => diagnostic.code.startsWith("agent.") && diagnostic.severity === "error")
				?.message ?? "",
	);
	const visibleDiagnostics = createMemo(() => [
		...diagnostics(),
		...previewDiagnostics().filter((diagnostic) => diagnostic.severity === "warning"),
	]);
	const diagnosticListItems = createMemo<BtDiagnosticListItem[]>(() => {
		const document = editableDocument();
		const items: BtDiagnosticListItem[] = [];
		if (definitionError()) {
			items.push({
				id: "definition:parse",
				severity: "error",
				source: "definition",
				code: "definition.parse",
				message: definitionError(),
			});
		}
		for (const diagnostic of diagnostics()) {
			items.push(toDiagnosticListItem(diagnostic, "authoring", document));
		}
		for (const diagnostic of previewDiagnostics().filter((item) => item.severity === "warning")) {
			items.push(toDiagnosticListItem(diagnostic, "preview", document));
		}
		return items.sort((left, right) => severityRank(left.severity) - severityRank(right.severity));
	});
	const diagnosticCounts = createMemo(() => ({
		errors: diagnosticListItems().filter((item) => item.severity === "error").length,
		warnings: diagnosticListItems().filter((item) => item.severity === "warning").length,
	}));
	const topDiagnostic = createMemo(() => diagnosticListItems()[0]);
	const topDiagnosticClass = createMemo(() => severityClass(topDiagnostic()?.severity ?? "info"));
	const subtreeNavItems = createMemo<BtSubtreeNavItem[]>(() => {
		const document = editableDocument();
		const items = diagnosticListItems();
		return document.roots.map((root) => ({
			rootKey: root.key,
			displayName: getEditableRootDisplayName(root),
			isPrimary: !root.name,
			errorCount: items.filter((item) => item.rootKey === root.key && item.severity === "error").length,
			warningCount: items.filter((item) => item.rootKey === root.key && item.severity === "warning").length,
			referenceCount: getEditableRootBranchReferenceCount(document, root.key),
		}));
	});
	const namedSubtreeOptions = createMemo(() =>
		editableDocument()
			.roots.filter((root) => !!root.name)
			.map((root) => ({ label: getEditableRootDisplayName(root), value: root.name ?? "" })),
	);
	const selectedNodeDiagnostics = createMemo(() => {
		const id = selectedNodeId();
		if (!id) return [];
		return visibleDiagnostics().filter(
			(diagnostic) => diagnostic.nodeId === id && (!diagnostic.rootKey || diagnostic.rootKey === activeRoot().key),
		);
	});
	const canSave = createMemo(() => !definitionError() && blockingDiagnostics().length === 0);
	const isReadOnly = createMemo(() => !!props.readOnly);
	const currentTreeStateLabel = createMemo(() => formatBtState(behaviourTree()?.getState()));
	const runningNodeSummary = createMemo(() => {
		const runningNode = findNodeByRuntimeState(activeTree().root, runtimeNodeStates(), State.RUNNING);
		return runningNode ? getEditableNodeCaption(runningNode) : "无";
	});

	const createSnapshot = (): EditorSnapshot => ({
		treeName: treeName(),
		agent: agent(),
		memberType: memberType(),
		attributeSlots: cloneAttributeSlots(attributeSlots()),
		document: cloneEditableDocument(editableDocument()),
		selectedNodeId: selectedNodeId(),
	});

	const restoreSnapshot = (snapshot: EditorSnapshot) => {
		resetPreviewForEdit();
		setTreeName(snapshot.treeName);
		setAgent(snapshot.agent);
		setMemberType(snapshot.memberType);
		setAttributeSlots(cloneAttributeSlots(snapshot.attributeSlots));
		replaceDocument(snapshot.document, snapshot.selectedNodeId);
		setDefinitionError("");
		queueMicrotask(() => setDefinitionError(refreshTreeInstance()));
	};

	const history = useBtHistory({
		createSnapshot,
		restoreSnapshot,
		canRecord: () => !isReadOnly(),
	});
	const canUndo = createMemo(() => !isReadOnly() && history.canUndo());
	const canRedo = createMemo(() => !isReadOnly() && history.canRedo());
	const recordHistory = () => history.recordSnapshot(createSnapshot());
	const undo = history.undo;
	const redo = history.redo;

	const refreshPreview = () => {
		setDefinitionError(refreshTreeInstance());
	};

	const schedulePreviewRefresh = () => {
		queueMicrotask(refreshPreview);
	};

	const resetPreviewBecauseDocumentChanged = () => {
		const wasPlaying = !!behaviourTreePlayInterval();
		resetPreviewForEdit();
		if (wasPlaying) toast.info("文档已变更，预览已停止", 1800);
	};

	const handleTreeChange = (next: EditableBtTree, options: { recordHistory?: boolean } = {}) => {
		if (options.recordHistory !== false) recordHistory();
		resetPreviewBecauseDocumentChanged();
		replaceActiveTree(next);
		schedulePreviewRefresh();
	};

	const handleAgentChange = (nextAgent: string, options: { recordHistory?: boolean } = {}) => {
		if (isReadOnly()) return;
		if (nextAgent === agent()) return;
		if (options.recordHistory !== false) recordHistory();
		resetPreviewBecauseDocumentChanged();
		setAgent(nextAgent);
		schedulePreviewRefresh();
	};

	const handleDefinitionApply = (
		nextDefinition: string,
		options: { recordHistory?: boolean; nextSelectedNodeId?: string | null } = {},
	) => {
		if (isReadOnly()) return;
		try {
			const nextDocument = editableDocumentFromDefinition(nextDefinition);
			if (options.recordHistory !== false) recordHistory();
			resetPreviewBecauseDocumentChanged();
			replaceDocument(nextDocument, options.nextSelectedNodeId);
			schedulePreviewRefresh();
			setDefinitionError("");
		} catch (error) {
			setDefinitionError(getErrorMessage(error));
		}
	};

	const handleMDSLInsert = (mdsl: string, nextAgent: string): void => {
		if (isReadOnly()) return;
		recordHistory();
		handleAgentChange(nextAgent, { recordHistory: false });
		handleDefinitionApply(mdsl, { recordHistory: false, nextSelectedNodeId: null });
		setMobileInspectorOpen(false);
	};

	const handleTreeNameChange = (nextName: string) => {
		if (isReadOnly() || nextName === treeName()) return;
		recordHistory();
		setTreeName(nextName);
	};

	const handleMemberTypeChange = (nextMemberType: MemberType) => {
		if (isReadOnly() || nextMemberType === memberType()) return;
		recordHistory();
		resetPreviewBecauseDocumentChanged();
		setMemberType(nextMemberType);
		schedulePreviewRefresh();
	};

	const handleActiveRootChange = (rootKey: string) => {
		if (rootKey === activeRoot().key) return;
		recordHistory();
		// 设计说明：root 切换会替换画布拓扑，先清理预览状态，避免旧运行态映射到新子树路径。
		resetPreviewForEdit();
		switchActiveRoot(rootKey);
		setMobileInspectorOpen(false);
	};

	const handleRootNameChange = (root: EditableBtRoot, nextName: string) => {
		const trimmedName = nextName.trim();
		if (isReadOnly() || !root.name || !trimmedName || root.name === trimmedName) return;
		recordHistory();
		resetPreviewBecauseDocumentChanged();
		renameRoot(root.key, trimmedName);
		schedulePreviewRefresh();
	};

	const handleAddRoot = () => {
		if (isReadOnly()) return;
		recordHistory();
		resetPreviewBecauseDocumentChanged();
		addNamedRoot();
		schedulePreviewRefresh();
	};

	const handleDeleteRoot = () => {
		if (isReadOnly() || !activeRoot().name) return;
		if (!canDeleteEditableRoot(editableDocument(), activeRoot().key)) return;
		recordHistory();
		resetPreviewBecauseDocumentChanged();
		deleteNamedRoot(activeRoot().key);
		schedulePreviewRefresh();
	};

	const handleOpenBranchTarget = (ref: string) => {
		const targetRoot = findEditableRootByName(editableDocument(), ref);
		if (!targetRoot) return;
		switchActiveRoot(targetRoot.key, targetRoot.tree.root.id);
		setMobileInspectorOpen(false);
	};

	const handleDiagnosticClick = (item: BtDiagnosticListItem) => {
		if (item.rootKey && item.rootKey !== activeRoot().key) {
			switchActiveRoot(item.rootKey, item.nodeId);
		}
		if (item.nodeId) setSelectedNodeId(item.nodeId);
		setDiagnosticsOpen(false);
		setMobileInspectorOpen(!!item.nodeId);
	};

	const updateSelectedNode = (node: EditableBtNode) => {
		if (isReadOnly()) return;
		handleTreeChange(updateEditableNode(activeTree(), node.id, () => node));
	};

	const deleteSelectedNode = () => {
		if (isReadOnly()) return;
		const id = selectedNodeId();
		if (!id || id === activeTree().root.id) return;
		const nextTree = deleteEditableNode(activeTree(), id);
		handleTreeChange(nextTree);
		setSelectedNodeId(undefined);
		setMobileInspectorOpen(false);
	};

	const moveSelectedNode = (direction: -1 | 1) => {
		if (isReadOnly()) return;
		const id = selectedNodeId();
		if (!id || id === activeTree().root.id) return;
		handleTreeChange(moveEditableNode(activeTree(), id, direction));
	};

	const duplicateSelectedNode = () => {
		if (isReadOnly()) return;
		const id = selectedNodeId();
		if (id && id !== activeTree().root.id) handleTreeChange(duplicateChildNode(activeTree(), id));
	};

	const addNodeToSelected = (type: EditableBtNodeType) => {
		if (isReadOnly()) return;
		const selected = selectedNodeId() ?? activeTree().root.id;
		const result = addNodeAtSelection(activeTree(), selected, type);
		handleTreeChange(result.tree);
		setSelectedNodeId(result.nodeId);
	};

	const {
		draggedNodeType,
		draggedTreeNodeId,
		activeDropPlacement,
		dragPreview,
		startLibraryNodeDrag,
		startTreeNodeDrag,
		clearNodeDrag,
		clearDanglingNodeDrag,
		updateNodeDropPreview,
		commitNodeDrop,
		previewInsertNode,
		clearInsertPreview,
		commitInsertNode,
		canDropOnNode,
	} = useBtDragDrop({
		isReadOnly,
		getActiveTree: activeTree,
		onTreeChange: handleTreeChange,
		onSelectNode: setSelectedNodeId,
		onOpenInspector: () => setMobileInspectorOpen(true),
	});

	const renderedEditableTree = createMemo(() => dragPreview()?.tree ?? activeTree());
	const canvasElements = createMemo<CanvasElements>(() => createCanvasElementsFromEditableTree(renderedEditableTree()));

	const onPlayButtonPressed = (): void => {
		const error = playPreview();
		if (error) setDefinitionError(error);
	};

	const onStopButtonPressed = (): void => {
		stopPreview();
	};

	const save = () => {
		if (isReadOnly()) return;
		const blocking = blockingDiagnostics();
		if (blocking.length > 0) return;
		setDefinitionError("");
		const nextTree: MemberBTTree = {
			name: treeName() || "default",
			definition: definition(),
			agent: agent(),
			memberType: memberType(),
			attributeSlots: attributeSlots(),
		};
		props.onSave(nextTree);
	};

	const handleKeyDown = (event: KeyboardEvent) => {
		if (isEditableKeyboardTarget(event.target)) return;
		if (isReadOnly()) return;
		const commandKey = event.ctrlKey || event.metaKey;
		if (commandKey && event.key.toLowerCase() === "z") {
			event.preventDefault();
			if (event.shiftKey) redo();
			else undo();
			return;
		}
		if (commandKey && event.key.toLowerCase() === "y") {
			event.preventDefault();
			redo();
			return;
		}
		if (event.altKey && event.key === "ArrowUp") {
			event.preventDefault();
			moveSelectedNode(-1);
			return;
		}
		if (event.altKey && event.key === "ArrowDown") {
			event.preventDefault();
			moveSelectedNode(1);
			return;
		}
		if (event.key === "Delete" || event.key === "Backspace") {
			event.preventDefault();
			deleteSelectedNode();
		}
	};

	onCleanup(() => {
		document.removeEventListener("keydown", handleKeyDown);
		window.removeEventListener("dragend", clearDanglingNodeDrag);
		window.removeEventListener("drop", clearDanglingNodeDrag);
		window.removeEventListener("mouseup", clearDanglingNodeDrag);
		window.removeEventListener("blur", clearDanglingNodeDrag);
	});

	onMount(() => {
		document.addEventListener("keydown", handleKeyDown);
		// 设计说明：树内节点拖动时，占位预览会替换原拖拽源 DOM；全局清理兜住丢失的 dragend。
		window.addEventListener("dragend", clearDanglingNodeDrag);
		window.addEventListener("drop", clearDanglingNodeDrag);
		window.addEventListener("mouseup", clearDanglingNodeDrag);
		window.addEventListener("blur", clearDanglingNodeDrag);
		refreshPreview();
	});

	// 设计说明：只读模式服务于技能卡片中的逻辑图展示，只保留画布浏览能力，不暴露编辑入口。
	if (props.readOnly) {
		return (
			<div id="BtEditor" class="BtEditor bg-primary-color relative flex h-full w-full flex-col overflow-hidden">
				<Show when={definitionError()}>
					<div class="bg-brand-color-3rd/10 px-3 py-2 text-sm text-brand-color-3rd">{definitionError()}</div>
				</Show>
				<div class="min-h-0 flex-1">
					<MainPanel
						layoutId={`readonly:${activeRoot().key}`}
						elements={canvasElements()}
						showPlayButton={false}
						showReplayButton={false}
						showStopButton={false}
						onPlayButtonClick={() => {}}
						onReplayButtonClick={() => {}}
						onStopButtonClick={() => {}}
						showCanvasControls={false}
						readOnly
					/>
				</div>
				<ToastContainer />
			</div>
		);
	}

	return (
		<div id="BtEditor" class="BtEditor bg-primary-color relative flex h-full w-full flex-col overflow-hidden">
			<div class="border-dividing-color flex min-h-14 flex-wrap items-center gap-2 border-b p-2">
				<div class="flex min-w-0 flex-1 basis-[24rem] items-center gap-2">
					<label class="sr-only" for="bt-editor-tree-name">
						行为树名
					</label>
					<input
						id="bt-editor-tree-name"
						aria-label="行为树名"
						class="border-dividing-color bg-area-color min-h-11 min-w-0 flex-1 rounded-md border px-3 text-lg font-semibold outline-none transition-colors focus:border-accent-color disabled:opacity-70"
						type="text"
						value={treeName()}
						placeholder={props.title || "未命名行为树"}
						onInput={(event) => handleTreeNameChange(event.currentTarget.value)}
						disabled={isReadOnly()}
					/>
					<MemberTypeSegmentedControl value={memberType()} disabled={isReadOnly()} onChange={handleMemberTypeChange} />
				</div>
				<Show when={!isReadOnly()}>
					<Button level="quaternary" class="h-11 w-11 p-2" disabled={!canSave()} onClick={save}>
						<Icons.Outline.Save />
					</Button>
					<Button level="quaternary" class="h-11 w-11 p-2" disabled={!canUndo()} onClick={undo}>
						<Icons.Outline.Back />
					</Button>
					<Button level="quaternary" class="h-11 w-11 p-2" disabled={!canRedo()} onClick={redo}>
						<Icons.Outline.Replay />
					</Button>
					<ExamplesMenu onMDSLInsert={handleMDSLInsert} />
					<SkillLogicExamplesMenu onMDSLInsert={handleMDSLInsert} />
				</Show>
				<Button
					level="quaternary"
					class="h-11 w-11 p-2"
					onClick={() => {
						setAdvancedPanel("definition");
						setAdvancedOpen(true);
					}}
				>
					<Icons.Outline.Burger />
				</Button>
				<Show when={props.onClose}>
					<Button level="quaternary" class="h-11 w-11 p-2" onClick={() => props.onClose?.()}>
						<Icons.Outline.Close />
					</Button>
				</Show>
			</div>
			<Show when={diagnosticListItems().length > 0}>
				<DiagnosticsStatusBar
					errors={diagnosticCounts().errors}
					warnings={diagnosticCounts().warnings}
					topDiagnostic={topDiagnostic()}
					class={topDiagnosticClass()}
					onOpen={() => setDiagnosticsOpen(true)}
				/>
			</Show>
			<div class="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_340px]">
				<aside class="border-dividing-color hidden min-h-0 border-r lg:flex lg:flex-col">
					<NodeLibrary
						onAdd={addNodeToSelected}
						onDragStart={startLibraryNodeDrag}
						onDragEnd={clearNodeDrag}
						disabled={isReadOnly()}
					/>
					<div class="border-dividing-color border-t p-3">
						<Button
							level="secondary"
							class="min-h-11 w-full justify-center"
							onClick={() => {
								setAdvancedPanel("slots");
								setAdvancedOpen(true);
							}}
						>
							属性槽
						</Button>
					</div>
				</aside>
				<main class="relative flex min-h-0 flex-col">
					<SubtreeNavBar
						items={subtreeNavItems()}
						activeRootKey={activeRoot().key}
						activeRoot={activeRoot()}
						deleteBlockedReason={getActiveRootDeleteBlockedReason(editableDocument(), activeRoot())}
						readOnly={isReadOnly()}
						onSwitch={handleActiveRootChange}
						onAdd={handleAddRoot}
						onRename={(name) => handleRootNameChange(activeRoot(), name)}
						onDelete={handleDeleteRoot}
					/>
					<div class="min-h-0 flex-1">
						<MainPanel
							layoutId={`structured:${activeRoot().key}`}
							elements={canvasElements()}
							selectedNodeId={selectedNodeId()}
							dragNodeType={draggedNodeType()}
							dragNodeId={draggedTreeNodeId()}
							activeDropPlacement={activeDropPlacement()}
							showPlayButton={!!behaviourTree() && !behaviourTreePlayInterval()}
							showReplayButton={!!behaviourTreePlayInterval()}
							showStopButton={!!behaviourTreePlayInterval()}
							onPlayButtonClick={onPlayButtonPressed}
							onReplayButtonClick={onPlayButtonPressed}
							onStopButtonClick={onStopButtonPressed}
							onStepButtonClick={stepPreview}
							onNodeDragOver={updateNodeDropPreview}
							onNodeDrop={commitNodeDrop}
							onNodeDragEnd={clearNodeDrag}
							onCanvasClick={() => {
								setSelectedNodeId(undefined);
								setMobileInspectorOpen(false);
							}}
							onNodeClick={(id) => {
								setSelectedNodeId(id);
								setMobileInspectorOpen(false);
							}}
							onNodeLongPress={(id) => {
								setSelectedNodeId(id);
								setMobileInspectorOpen(false);
							}}
							onNodeInspect={(id) => {
								setSelectedNodeId(id);
								setMobileInspectorOpen(true);
							}}
							onNodeDelete={(id) => {
								setSelectedNodeId(id);
								deleteSelectedNode();
							}}
							onNodeInsertPreview={previewInsertNode}
							onNodeInsertCancel={clearInsertPreview}
							onNodeInsertCommit={commitInsertNode}
							onTreeNodeDragStart={startTreeNodeDrag}
							onTreeNodeDragEnd={clearNodeDrag}
							canDeleteNode={(id) => !isReadOnly() && id !== activeTree().root.id}
							canDropOnNode={canDropOnNode}
							runtimeNodeStates={isReadOnly() ? {} : runtimeNodeStates()}
							previewStatus={
								<PreviewRuntimeStatus
									tick={debugTick()}
									treeState={currentTreeStateLabel()}
									runningNode={runningNodeSummary()}
								/>
							}
							readOnly={isReadOnly()}
						/>
					</div>
				</main>
				<aside class="border-dividing-color hidden min-h-0 border-l lg:block">
					<NodeInspector
						node={selectedNode()}
						registry={mdslIntellisense()}
						attributeSlots={attributeSlots()}
						subtreeOptions={namedSubtreeOptions()}
						nodeDiagnostics={selectedNodeDiagnostics()}
						onChange={updateSelectedNode}
						onOpenBranchTarget={handleOpenBranchTarget}
						onDelete={() => {
							deleteSelectedNode();
						}}
						onDuplicate={() => {
							duplicateSelectedNode();
						}}
						onMove={(direction) => {
							moveSelectedNode(direction);
						}}
						canDelete={!isReadOnly() && selectedNodeId() !== activeTree().root.id}
						readOnly={isReadOnly()}
					/>
				</aside>
			</div>
			<div class="lg:hidden">
				<Sheet state={mobileInspectorOpen()} setState={setMobileInspectorOpen}>
					<div class="h-[90dvh] w-full overflow-hidden">
						<NodeInspector
							node={selectedNode()}
							registry={mdslIntellisense()}
							attributeSlots={attributeSlots()}
							subtreeOptions={namedSubtreeOptions()}
							nodeDiagnostics={selectedNodeDiagnostics()}
							onChange={updateSelectedNode}
							onOpenBranchTarget={handleOpenBranchTarget}
							onDelete={() => {
								deleteSelectedNode();
							}}
							onDuplicate={() => {
								duplicateSelectedNode();
							}}
							onMove={(direction) => {
								moveSelectedNode(direction);
							}}
							canDelete={!isReadOnly() && selectedNodeId() !== activeTree().root.id}
							readOnly={isReadOnly()}
						/>
					</div>
				</Sheet>
			</div>
			<DebugConsole
				open={debugConsoleOpen()}
				logs={debugLogs()}
				tick={debugTick()}
				onToggle={() => setDebugConsoleOpen((open) => !open)}
			/>
			<DiagnosticsDrawer
				open={diagnosticsOpen()}
				items={diagnosticListItems()}
				onClose={() => setDiagnosticsOpen(false)}
				onSelect={handleDiagnosticClick}
			/>
			<AdvancedTextPanels
				open={advancedOpen()}
				activePanel={advancedPanel()}
				definition={definition()}
				agent={agent()}
				attributeSlots={attributeSlots()}
				mdslIntellisense={mdslIntellisense()}
				definitionError={definitionError()}
				agentError={agentError()}
				onClose={() => setAdvancedOpen(false)}
				onPanelChange={setAdvancedPanel}
				onDefinitionApply={handleDefinitionApply}
				onAgentChange={handleAgentChange}
				onAttributeSlotsChange={(slots) => {
					if (isReadOnly()) return;
					recordHistory();
					resetPreviewBecauseDocumentChanged();
					setAttributeSlots(slots);
					schedulePreviewRefresh();
				}}
				readOnly={isReadOnly()}
			/>
			<ToastContainer />
		</div>
	);
};

const formatBtState = (state?: State): string => {
	if (state === State.RUNNING) return "Running";
	if (state === State.SUCCEEDED) return "Succeeded";
	if (state === State.FAILED) return "Failed";
	return "Ready";
};

const findNodeByRuntimeState = (
	node: EditableBtNode,
	runtimeStates: Record<string, State>,
	state: State,
	path = "0",
): EditableBtNode | undefined => {
	if (runtimeStates[path] === state) return node;
	for (const [index, child] of node.children.entries()) {
		const found = findNodeByRuntimeState(child, runtimeStates, state, `${path}.${index}`);
		if (found) return found;
	}
	return undefined;
};

const MemberTypeSegmentedControl: Component<{
	value: MemberType;
	disabled: boolean;
	onChange: (value: MemberType) => void;
}> = (props) => (
	// 设计说明：MemberType 是互斥上下文，使用 radio 分段控件直接暴露当前 registry/属性路径目标。
	<fieldset
		aria-label="行为树类型"
		class="border-dividing-color bg-area-color flex min-h-11 shrink-0 items-center gap-1 rounded-md border p-1"
	>
		<legend class="sr-only">行为树类型</legend>
		<For each={MEMBER_TYPE}>
			{(type) => {
				const selected = () => props.value === type;
				return (
					<label
						class="relative inline-flex min-h-9 cursor-pointer items-center rounded px-2 text-xs font-medium transition-colors lg:px-3 lg:text-sm"
						classList={{
							"bg-accent-color text-primary-color": selected(),
							"hover:bg-dividing-color text-main-text-color": !selected(),
							"pointer-events-none opacity-60": props.disabled,
						}}
					>
						<input
							type="radio"
							name="bt-editor-member-type"
							value={type}
							checked={selected()}
							disabled={props.disabled}
							class="sr-only"
							onChange={() => props.onChange(type)}
						/>
						{type}
					</label>
				);
			}}
		</For>
	</fieldset>
);

const getActiveRootDeleteBlockedReason = (document: EditableBtDocument, root: EditableBtRoot): string => {
	if (!root.name) return "主入口不能删除";
	const references = collectEditableBranchReferences(document).filter((reference) => reference.ref === root.name);
	if (references.length > 0) return `已有 ${references.length} 个 branch 引用，先调整引用后再删除`;
	return "";
};

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	const tagName = target.tagName.toLowerCase();
	return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}
