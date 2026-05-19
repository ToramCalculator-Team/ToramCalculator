import type { MemberType } from "@db/schema/enums";
import { MEMBER_TYPE } from "@db/schema/enums";
import type { AttributeSlotDeclarationData, MemberBTTree } from "@db/schema/jsons";
import { type Component, createMemo, createSignal, onCleanup, onMount, Show } from "solid-js";
import { Button } from "~/components/controls/button";
import { Input } from "~/components/controls/input";
import { Select } from "~/components/controls/select";
import { Icons } from "~/components/icons";
import { ExamplesMenu, SkillLogicExmaplesMenu, ToastContainer } from "./components";
import { type AdvancedPanelKey, AdvancedTextPanels } from "./components/AdvancedPanels/AdvancedTextPanels";
import { type CanvasElements, MainPanel } from "./components/MainPanel/MainPanel";
import { NodeInspector } from "./components/StructuredEditor/NodeInspector";
import { NodeLibrary } from "./components/StructuredEditor/NodeLibrary";
import { getPreferredSelectionId, parseInitialEditableDocument, useBtDocument } from "./hooks/useBtDocument";
import { useBtDragDrop } from "./hooks/useBtDragDrop";
import { useBtHistory } from "./hooks/useBtHistory";
import { useBtPreviewRuntime } from "./hooks/useBtPreviewRuntime";
import { getBlockingDiagnostics, validateBtAuthoring } from "./model/authoringValidator";
import {
	addNodeAtSelection,
	cloneEditableDocument,
	createCanvasElementsFromEditableTree,
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
	getEditableRootDisplayName,
	moveEditableNode,
	updateEditableNode,
} from "./model/editableTree";
import { buildMdslIntellisenseRegistry } from "./modes/mdslIntellisense";
import { getMdslProfileConfig } from "./modes/mdslMemberTypeProfiles";
import { toast } from "./stores/toastStore";
import { DefinitionType, SidebarTab } from "./types/app";

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
	const topDiagnostic = createMemo(() => visibleDiagnostics()[0]);
	const topDiagnosticClass = createMemo(() => {
		const severity = topDiagnostic()?.severity;
		if (severity === "warning") return "bg-amber-500/10 text-amber-600";
		if (severity === "info") return "bg-area-color text-main-text-color";
		return "bg-brand-color-3rd/10 text-brand-color-3rd";
	});
	const canSave = createMemo(() => !definitionError() && blockingDiagnostics().length === 0);
	const isReadOnly = createMemo(() => !!props.readOnly);

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
	const recordHistory = history.recordHistory;
	const undo = history.undo;
	const redo = history.redo;

	const refreshPreview = () => {
		setDefinitionError(refreshTreeInstance());
	};

	const schedulePreviewRefresh = () => {
		queueMicrotask(refreshPreview);
	};

	const handleTreeChange = (next: EditableBtTree, options: { recordHistory?: boolean } = {}) => {
		if (options.recordHistory !== false) recordHistory();
		resetPreviewForEdit();
		replaceActiveTree(next);
		schedulePreviewRefresh();
	};

	const handleAgentChange = (nextAgent: string, options: { recordHistory?: boolean } = {}) => {
		if (isReadOnly()) return;
		if (nextAgent === agent()) return;
		if (options.recordHistory !== false) recordHistory();
		resetPreviewForEdit();
		setAgent(nextAgent);
		schedulePreviewRefresh();
	};

	const handleDefinitionApply = (nextDefinition: string, options: { recordHistory?: boolean } = {}) => {
		if (isReadOnly()) return;
		try {
			const nextDocument = editableDocumentFromDefinition(nextDefinition);
			if (options.recordHistory !== false) recordHistory();
			resetPreviewForEdit();
			replaceDocument(nextDocument);
			schedulePreviewRefresh();
			setDefinitionError("");
		} catch (error) {
			setDefinitionError(error instanceof Error ? error.message : String(error));
		}
	};

	const handleMDSLInsert = (mdsl: string, nextAgent: string): void => {
		if (isReadOnly()) return;
		recordHistory();
		handleAgentChange(nextAgent, { recordHistory: false });
		handleDefinitionApply(mdsl, { recordHistory: false });
	};

	const handleTreeNameChange = (nextName: string) => {
		if (isReadOnly() || nextName === treeName()) return;
		recordHistory();
		setTreeName(nextName);
	};

	const handleMemberTypeChange = (nextMemberType: MemberType) => {
		if (isReadOnly() || nextMemberType === memberType()) return;
		recordHistory();
		resetPreviewForEdit();
		setMemberType(nextMemberType);
		schedulePreviewRefresh();
	};

	const handleActiveRootChange = (rootKey: string) => {
		if (rootKey === activeRoot().key) return;
		recordHistory();
		resetPreviewForEdit();
		switchActiveRoot(rootKey);
		setMobileInspectorOpen(false);
	};

	const handleRootNameChange = (root: EditableBtRoot, nextName: string) => {
		const trimmedName = nextName.trim();
		if (isReadOnly() || !root.name || !trimmedName || root.name === trimmedName) return;
		recordHistory();
		resetPreviewForEdit();
		renameRoot(root.key, trimmedName);
		schedulePreviewRefresh();
	};

	const handleAddRoot = () => {
		if (isReadOnly()) return;
		recordHistory();
		resetPreviewForEdit();
		addNamedRoot();
		schedulePreviewRefresh();
	};

	const handleDeleteRoot = () => {
		if (isReadOnly() || !activeRoot().name) return;
		recordHistory();
		resetPreviewForEdit();
		deleteNamedRoot(activeRoot().key);
		schedulePreviewRefresh();
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
		setSelectedNodeId(getPreferredSelectionId(nextTree));
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
		canDropOnNode,
	} = useBtDragDrop({
		isReadOnly,
		getActiveTree: activeTree,
		onTreeChange: handleTreeChange,
		onSelectNode: setSelectedNodeId,
		onOpenInspector: () => setMobileInspectorOpen(true),
	});

	const renderedEditableTree = createMemo(() => dragPreview()?.tree ?? activeTree());
	const canvasElements = createMemo<CanvasElements>(() =>
		createCanvasElementsFromEditableTree(
			renderedEditableTree(),
			isReadOnly() ? undefined : selectedNodeId(),
			isReadOnly() ? {} : runtimeNodeStates(),
		),
	);

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
			<div class="border-dividing-color flex min-h-14 items-center gap-2 border-b p-2">
				<h1 class="min-w-0 flex-1 truncate px-1 text-lg font-bold">{props.title}</h1>
				<Show when={!isReadOnly()}>
					<Button level="quaternary" class="min-h-11 min-w-11 p-2" disabled={!canSave()} onClick={save}>
						<Icons.Outline.Save />
					</Button>
					<Button level="quaternary" class="min-h-11 min-w-11 p-2" disabled={!canUndo()} onClick={undo}>
						<Icons.Outline.Back />
					</Button>
					<Button level="quaternary" class="min-h-11 min-w-11 p-2" disabled={!canRedo()} onClick={redo}>
						<Icons.Outline.Replay />
					</Button>
					<ExamplesMenu onMDSLInsert={handleMDSLInsert} />
					<SkillLogicExmaplesMenu onMDSLInsert={handleMDSLInsert} />
				</Show>
				<Button
					level="quaternary"
					class="min-h-11 min-w-11 p-2"
					onClick={() => {
						setAdvancedPanel("definition");
						setAdvancedOpen(true);
					}}
				>
					<Icons.Outline.Burger />
				</Button>
				<Show when={props.onClose}>
					<Button level="quaternary" class="min-h-11 min-w-11 p-2" onClick={() => props.onClose?.()}>
						<Icons.Outline.Close />
					</Button>
				</Show>
			</div>
			<Show when={definitionError() || topDiagnostic()}>
				<div
					class={`px-3 py-2 text-sm ${definitionError() ? "bg-brand-color-3rd/10 text-brand-color-3rd" : topDiagnosticClass()}`}
				>
					{definitionError() || topDiagnostic()?.message}
				</div>
			</Show>
			<div class="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_340px]">
				<aside class="border-dividing-color hidden min-h-0 border-r lg:block">
					<div class="border-dividing-color flex flex-col gap-2 border-b p-3">
						<Input
							title="名称"
							type="text"
							value={treeName()}
							onInput={(event) => handleTreeNameChange(event.currentTarget.value)}
							disabled={isReadOnly()}
						/>
						<Select
							value={memberType()}
							setValue={(value) => handleMemberTypeChange(value as MemberType)}
							options={MEMBER_TYPE.map((type) => ({ label: type, value: type }))}
							disabled={isReadOnly()}
						/>
						<div class="border-dividing-color mt-1 flex flex-col gap-2 border-t pt-2">
							<div class="text-main-text-color text-xs">Root</div>
							<Select
								value={activeRoot().key}
								setValue={handleActiveRootChange}
								options={editableDocument().roots.map((root) => ({
									label: getEditableRootDisplayName(root),
									value: root.key,
								}))}
								disabled={isReadOnly()}
							/>
							<Show when={activeRoot().name}>
								<Input
									title="子树名称"
									type="text"
									value={activeRoot().name ?? ""}
									onInput={(event) => handleRootNameChange(activeRoot(), event.currentTarget.value)}
									disabled={isReadOnly()}
								/>
							</Show>
							<div class="grid grid-cols-2 gap-2">
								<Button
									level="secondary"
									class="min-h-11 justify-center"
									disabled={isReadOnly()}
									onClick={handleAddRoot}
								>
									新增子树
								</Button>
								<Button
									level="quaternary"
									class="min-h-11 justify-center"
									disabled={isReadOnly() || !activeRoot().name}
									onClick={handleDeleteRoot}
								>
									删除子树
								</Button>
							</div>
						</div>
					</div>
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
				<main class="relative min-h-0">
					<MainPanel
						layoutId="structured"
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
							setMobileInspectorOpen(true);
						}}
						onNodeLongPress={(id) => {
							setSelectedNodeId(id);
							setMobileInspectorOpen(true);
						}}
						onNodeMove={(id, direction) => {
							setSelectedNodeId(id);
							moveSelectedNode(direction);
						}}
						onNodeDelete={(id) => {
							setSelectedNodeId(id);
							deleteSelectedNode();
						}}
						onTreeNodeDragStart={startTreeNodeDrag}
						onTreeNodeDragEnd={clearNodeDrag}
						canDeleteNode={(id) => !isReadOnly() && id !== activeTree().root.id}
						canDropOnNode={canDropOnNode}
						readOnly={isReadOnly()}
					/>
					<div class="absolute right-2 bottom-2 left-2 flex gap-2 lg:hidden">
						<Button class="min-h-11 flex-1" onClick={() => setMobileInspectorOpen(true)}>
							属性
						</Button>
						<Button class="min-h-11 flex-1" disabled={isReadOnly()} onClick={() => addNodeToSelected("action")}>
							动作
						</Button>
						<Button class="min-h-11 flex-1" disabled={isReadOnly()} onClick={() => addNodeToSelected("sequence")}>
							控制
						</Button>
						<Button
							class="min-h-11 flex-1"
							onClick={() => {
								setAdvancedPanel("slots");
								setAdvancedOpen(true);
							}}
						>
							槽
						</Button>
					</div>
				</main>
				<aside class="border-dividing-color hidden min-h-0 border-l lg:block">
					<NodeInspector
						node={selectedNode()}
						registry={mdslIntellisense()}
						attributeSlots={attributeSlots()}
						onChange={updateSelectedNode}
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
			<Show when={mobileInspectorOpen()}>
				<div class="absolute inset-x-0 bottom-0 z-40 max-h-[78vh] overflow-hidden rounded-t-lg bg-primary-color shadow-lg lg:hidden">
					<div class="border-dividing-color flex items-center gap-2 border-b p-2">
						<Button level="quaternary" class="min-h-11" onClick={() => setMobileInspectorOpen(false)}>
							关闭
						</Button>
						<Button class="min-h-11" disabled={isReadOnly()} onClick={() => addNodeToSelected("action")}>
							加动作
						</Button>
						<Button class="min-h-11" disabled={isReadOnly()} onClick={() => addNodeToSelected("condition")}>
							加条件
						</Button>
					</div>
					<div class="grid max-h-[calc(78vh-56px)] grid-cols-1 overflow-auto">
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
								编辑属性槽
							</Button>
						</div>
						<NodeInspector
							node={selectedNode()}
							registry={mdslIntellisense()}
							attributeSlots={attributeSlots()}
							onChange={updateSelectedNode}
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
				</div>
			</Show>
			<Show when={debugLogs().length > 0}>
				<div class="border-dividing-color hidden max-h-32 overflow-auto border-t px-3 py-2 text-xs lg:block">
					<div class="mb-1 flex gap-3 text-main-text-color">
						<span>tick: {debugTick()}</span>
						<span>selected: {selectedNode()?.type ?? "-"}</span>
					</div>
					<div class="flex flex-col gap-1">
						{debugLogs().map((log) => (
							<div>
								[{log.tick}] {log.message}
							</div>
						))}
					</div>
				</div>
			</Show>
			<AdvancedTextPanels
				open={advancedOpen()}
				activePanel={advancedPanel()}
				definition={definition()}
				agent={agent()}
				attributeSlots={attributeSlots()}
				definitionError={definitionError()}
				agentError={agentError()}
				onClose={() => setAdvancedOpen(false)}
				onPanelChange={setAdvancedPanel}
				onDefinitionApply={handleDefinitionApply}
				onAgentChange={handleAgentChange}
				onAttributeSlotsChange={(slots) => {
					if (isReadOnly()) return;
					recordHistory();
					resetPreviewForEdit();
					setAttributeSlots(slots);
					schedulePreviewRefresh();
				}}
				readOnly={isReadOnly()}
			/>
			<ToastContainer />
		</div>
	);
};

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	const tagName = target.tagName.toLowerCase();
	return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}
