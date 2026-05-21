import type { MemberType } from "@db/schema/enums";
import { MEMBER_TYPE } from "@db/schema/enums";
import type { AttributeSlotDeclarationData, MemberBTTree } from "@db/schema/jsons";
import { type Component, createEffect, createMemo, createSignal, on, onCleanup, onMount, Show } from "solid-js";
import { Sheet } from "~/components/containers/sheet";
import { Button } from "~/components/controls/button";
import { EnumSelect } from "~/components/controls/enumSelect";
import { Input } from "~/components/controls/input";
import { Select } from "~/components/controls/select";
import { Icons } from "~/components/icons";
import { State } from "~/lib/mistreevous/State";
import {
	Divider,
	ExamplesMenuContent,
	Menu,
	MenuItem,
	MenuList,
	SkillLogicExamplesMenuContent,
	ToastContainer,
} from "./components";
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
import { validateBtAuthoring } from "./model/authoringValidator";
import {
	addNodeAtSelection,
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
import type { WorkflowDragOverlay } from "./types/workflow";
import { getErrorMessage } from "./utils/errors";

export { DefinitionType, SidebarTab };

export type BtEditorValue = Pick<MemberBTTree, "definition" | "agent"> &
	Partial<Pick<MemberBTTree, "name" | "memberType" | "attributeSlots">>;

export type BtEditorProps = {
	title: string;
	value: BtEditorValue;
	readOnly?: boolean;
	onChange?: (nextTree: MemberBTTree) => void;
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

const defaultTree = emptyTree();

const normalizeValue = (value: BtEditorValue): MemberBTTree => ({
	...defaultTree,
	...value,
	attributeSlots: value.attributeSlots ?? [],
});

const cloneAttributeSlots = (slots: AttributeSlotDeclarationData[]): AttributeSlotDeclarationData[] =>
	slots.map((slot) => ({
		path: slot.path,
		attribute: { ...slot.attribute },
	}));

const getAttributeSlotsSignature = (slots: AttributeSlotDeclarationData[]) => JSON.stringify(slots);

// 设计说明：受控同步只比较可持久化 BT 数据，避免节点焦点、拖拽预览、面板开关等编辑态穿过组件边界。
const getBtEditorValueSignature = (value: MemberBTTree): string =>
	[value.name, value.definition, value.agent, value.memberType, getAttributeSlotsSignature(value.attributeSlots)].join(
		"\u001f",
	);

/**
 * 行为树结构化编辑器。
 *
 * 设计说明：外部 value 只承载持久化语义数据；节点焦点、面板、拖拽、预览和历史栈保留为编辑器内部状态。
 */
export const BtEditor: Component<BtEditorProps> = (props) => {
	const initial = normalizeValue(props.value);
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
	const [topMenuAnchorEl, setTopMenuAnchorEl] = createSignal<HTMLElement | null>(null);
	const topMenuOpen = () => Boolean(topMenuAnchorEl());
	const closeTopMenu = () => setTopMenuAnchorEl(null);
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
	const isReadOnly = createMemo(() => !!props.readOnly);
	const externalValue = createMemo(() => normalizeValue(props.value));
	const externalValueSignature = createMemo(() => getBtEditorValueSignature(externalValue()));
	const currentValue = createMemo<MemberBTTree>(() => ({
		name: treeName() || "default",
		definition: definition(),
		agent: agent(),
		memberType: memberType(),
		attributeSlots: cloneAttributeSlots(attributeSlots()),
	}));
	const currentTreeStateLabel = createMemo(() => formatBtState(behaviourTree()?.getState()));
	const runningNodeSummary = createMemo(() => {
		const runningNode = findNodeByRuntimeState(activeTree().root, runtimeNodeStates(), State.RUNNING);
		return runningNode ? getEditableNodeCaption(runningNode) : "无";
	});
	const emitChange = (patch: Partial<MemberBTTree> = {}) => {
		const nextValue: MemberBTTree = {
			...currentValue(),
			...patch,
			attributeSlots: cloneAttributeSlots(patch.attributeSlots ?? currentValue().attributeSlots),
		};
		if (getBtEditorValueSignature(nextValue) === getBtEditorValueSignature(externalValue())) return;
		props.onChange?.(nextValue);
	};

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
		emitChange({
			name: snapshot.treeName || "default",
			definition: editableDocumentToDefinitionText(snapshot.document),
			agent: snapshot.agent,
			memberType: snapshot.memberType,
			attributeSlots: cloneAttributeSlots(snapshot.attributeSlots),
		});
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

	const openAdvancedPanel = (panel: AdvancedPanelKey) => {
		closeTopMenu();
		setAdvancedPanel(panel);
		setAdvancedOpen(true);
	};

	// 设计说明：外部 value 变化只同步内部 draft；对外通知只能从用户命令处理器发出，避免响应式 effect 反向写表单。
	createEffect(
		on(
			externalValueSignature,
			() => {
				const nextValue = externalValue();
				const current = currentValue();
				if (getBtEditorValueSignature(current) === getBtEditorValueSignature(nextValue)) return;

				const definitionChanged = current.definition !== nextValue.definition;
				const runtimeContextChanged =
					definitionChanged ||
					current.agent !== nextValue.agent ||
					current.memberType !== nextValue.memberType ||
					getAttributeSlotsSignature(current.attributeSlots) !== getAttributeSlotsSignature(nextValue.attributeSlots);

				if (runtimeContextChanged) resetPreviewBecauseDocumentChanged();
				if (current.name !== nextValue.name) setTreeName(nextValue.name);
				if (current.agent !== nextValue.agent) setAgent(nextValue.agent);
				if (current.memberType !== nextValue.memberType) setMemberType(nextValue.memberType);
				if (
					getAttributeSlotsSignature(current.attributeSlots) !== getAttributeSlotsSignature(nextValue.attributeSlots)
				) {
					setAttributeSlots(cloneAttributeSlots(nextValue.attributeSlots));
				}
				if (definitionChanged) {
					const nextDocument = parseInitialEditableDocument(nextValue.definition);
					replaceDocument(nextDocument.document);
					setDefinitionError(nextDocument.error);
				}
				if (runtimeContextChanged) schedulePreviewRefresh();
			},
			{ defer: true },
		),
	);

	const handleTreeChange = (next: EditableBtTree, options: { recordHistory?: boolean } = {}) => {
		if (options.recordHistory !== false) recordHistory();
		resetPreviewBecauseDocumentChanged();
		const nextDocument = replaceActiveTree(next);
		emitChange({ definition: editableDocumentToDefinitionText(nextDocument) });
		schedulePreviewRefresh();
	};

	const handleAgentChange = (nextAgent: string, options: { recordHistory?: boolean } = {}) => {
		if (isReadOnly()) return;
		if (nextAgent === agent()) return;
		if (options.recordHistory !== false) recordHistory();
		resetPreviewBecauseDocumentChanged();
		setAgent(nextAgent);
		emitChange({ agent: nextAgent });
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
			const replacedDocument = replaceDocument(nextDocument, options.nextSelectedNodeId);
			emitChange({ definition: editableDocumentToDefinitionText(replacedDocument) });
			schedulePreviewRefresh();
			setDefinitionError("");
		} catch (error) {
			setDefinitionError(getErrorMessage(error));
		}
	};

	const handleMDSLInsert = (mdsl: string, nextAgent: string): void => {
		if (isReadOnly()) return;
		try {
			const nextDocument = editableDocumentFromDefinition(mdsl);
			recordHistory();
			resetPreviewBecauseDocumentChanged();
			setAgent(nextAgent);
			const replacedDocument = replaceDocument(nextDocument, null);
			emitChange({
				agent: nextAgent,
				definition: editableDocumentToDefinitionText(replacedDocument),
			});
			schedulePreviewRefresh();
			setDefinitionError("");
			setMobileInspectorOpen(false);
		} catch (error) {
			setDefinitionError(getErrorMessage(error));
		}
	};

	const handleTreeNameChange = (nextName: string) => {
		if (isReadOnly() || nextName === treeName()) return;
		recordHistory();
		setTreeName(nextName);
		emitChange({ name: nextName || "default" });
	};

	const handleMemberTypeChange = (nextMemberType: MemberType) => {
		if (isReadOnly() || nextMemberType === memberType()) return;
		recordHistory();
		resetPreviewBecauseDocumentChanged();
		setMemberType(nextMemberType);
		emitChange({ memberType: nextMemberType });
		schedulePreviewRefresh();
	};

	const handleAttributeSlotsChange = (slots: AttributeSlotDeclarationData[]) => {
		if (isReadOnly()) return;
		const nextSlots = cloneAttributeSlots(slots);
		if (getAttributeSlotsSignature(nextSlots) === getAttributeSlotsSignature(attributeSlots())) return;
		recordHistory();
		resetPreviewBecauseDocumentChanged();
		setAttributeSlots(nextSlots);
		emitChange({ attributeSlots: nextSlots });
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
		const nextDocument = renameRoot(root.key, trimmedName);
		emitChange({ definition: editableDocumentToDefinitionText(nextDocument) });
		schedulePreviewRefresh();
	};

	const handleAddRoot = () => {
		if (isReadOnly()) return;
		recordHistory();
		resetPreviewBecauseDocumentChanged();
		const nextDocument = addNamedRoot();
		emitChange({ definition: editableDocumentToDefinitionText(nextDocument) });
		schedulePreviewRefresh();
	};

	const handleDeleteRootByKey = (rootKey: string) => {
		if (isReadOnly()) return;
		const root = editableDocument().roots.find((item) => item.key === rootKey);
		if (!root) return;
		const blockedReason = getRootDeleteBlockedReason(editableDocument(), root);
		if (blockedReason) {
			toast.warning(blockedReason);
			return;
		}
		recordHistory();
		resetPreviewBecauseDocumentChanged();
		const nextDocument = deleteNamedRoot(rootKey);
		emitChange({ definition: editableDocumentToDefinitionText(nextDocument) });
		schedulePreviewRefresh();
	};

	const handleDeleteRoot = () => {
		handleDeleteRootByKey(activeRoot().key);
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
		if (!id) return;
		if (id === activeTree().root.id) {
			handleDeleteRoot();
			return;
		}
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
		dragSession,
		draggedNodeType,
		draggedTreeNodeId,
		activeDropPlacement,
		previewTree,
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

	const renderedEditableTree = createMemo(() => previewTree() ?? activeTree());
	const canvasElements = createMemo<CanvasElements>(() => createCanvasElementsFromEditableTree(renderedEditableTree()));
	const dragOverlay = createMemo<WorkflowDragOverlay | undefined>(() => {
		const session = dragSession();
		if (session.phase !== "tree-dragging") return undefined;
		const elements = createCanvasElementsFromEditableTree({ root: session.sourceSubtree });
		return {
			...elements,
			sourceRect: session.sourceRect,
			startPointer: session.startPointer,
			currentPointer: session.currentPointer,
		};
	});

	const onPlayButtonPressed = (): void => {
		const error = playPreview();
		if (error) setDefinitionError(error);
	};

	const onStopButtonPressed = (): void => {
		stopPreview();
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
			const subtreeTabRootKey = getSubtreeTabRootKey(event.target);
			// 设计说明：tab 焦点属于分支导航命令域，Delete 直接删除该分支，避免穿透到画布当前节点选择。
			if (subtreeTabRootKey) {
				handleDeleteRootByKey(subtreeTabRootKey);
				return;
			}
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
			<div class="border-dividing-color flex min-h-12 items-center border-b bg-primary-color">
				<div class="flex h-full shrink-0 items-center px-2">
					<Button
						level="quaternary"
						class="h-10 min-h-10 px-3 py-2"
						aria-label="打开行为树菜单"
						title="行为树菜单"
						onClick={(event) => setTopMenuAnchorEl(topMenuOpen() ? null : event.currentTarget)}
					>
						<Icons.Outline.Burger />
					</Button>
				</div>
				<SubtreeNavBar
					items={subtreeNavItems()}
					activeRootKey={activeRoot().key}
					readOnly={isReadOnly()}
					onSwitch={handleActiveRootChange}
					onAdd={handleAddRoot}
					onDelete={handleDeleteRootByKey}
				/>
				<Show when={props.onClose}>
					<div class="flex h-full shrink-0 items-center px-2">
						<Button
							level="quaternary"
							class="h-10 min-h-10 px-3 py-2"
							aria-label="关闭编辑器"
							title="关闭编辑器"
							onClick={() => props.onClose?.()}
						>
							<Icons.Outline.Close />
						</Button>
					</div>
				</Show>
				<BtEditorTopMenu
					anchorEl={topMenuAnchorEl()}
					open={topMenuOpen()}
					title={props.title}
					treeName={treeName()}
					memberType={memberType()}
					activeRoot={activeRoot()}
					readOnly={isReadOnly()}
					onClose={closeTopMenu}
					onTreeNameChange={handleTreeNameChange}
					onMemberTypeChange={handleMemberTypeChange}
					onRootNameChange={handleRootNameChange}
					onOpenAdvanced={openAdvancedPanel}
					onMDSLInsert={handleMDSLInsert}
				/>
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
					<div class="min-h-0 flex-1">
						<MainPanel
							layoutId={`structured:${activeRoot().key}`}
							elements={canvasElements()}
							selectedNodeId={selectedNodeId()}
							dragNodeType={draggedNodeType()}
							dragNodeId={draggedTreeNodeId()}
							activeDropPlacement={activeDropPlacement()}
							dragOverlay={dragOverlay()}
							showPlayButton={!!behaviourTree() && !behaviourTreePlayInterval()}
							showReplayButton={!!behaviourTreePlayInterval()}
							showStopButton={!!behaviourTreePlayInterval()}
							onPlayButtonClick={onPlayButtonPressed}
							onReplayButtonClick={onPlayButtonPressed}
							onStopButtonClick={onStopButtonPressed}
							canUndo={canUndo()}
							canRedo={canRedo()}
							onUndo={undo}
							onRedo={redo}
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
				onAttributeSlotsChange={handleAttributeSlotsChange}
				readOnly={isReadOnly()}
			/>
			<ToastContainer />
		</div>
	);
};

const BtEditorTopMenu: Component<{
	anchorEl: HTMLElement | null;
	open: boolean;
	title: string;
	treeName: string;
	memberType: MemberType;
	activeRoot: EditableBtRoot;
	readOnly: boolean;
	onClose: () => void;
	onTreeNameChange: (name: string) => void;
	onMemberTypeChange: (memberType: MemberType) => void;
	onRootNameChange: (root: EditableBtRoot, name: string) => void;
	onOpenAdvanced: (panel: AdvancedPanelKey) => void;
	onMDSLInsert: (mdsl: string, agent: string) => void;
}> = (props) => (
	<Menu anchorEl={props.anchorEl} open={props.open} onClose={props.onClose} class="w-[380px] max-w-[calc(100vw-16px)]">
		{/* 设计说明：菜单收纳低频配置与文本编辑入口，顶栏空间留给分支导航和关闭动作。 */}
		<div class="flex flex-col gap-3 px-4 py-3">
			<div class="text-accent-color text-xs font-semibold">文档</div>
			<Input
				type="text"
				id="bt-editor-tree-name"
				aria-label="行为树名"
				value={props.treeName}
				placeholder={props.title || "未命名行为树"}
				onInput={(event) => props.onTreeNameChange(event.currentTarget.value)}
				disabled={props.readOnly}
			/>
			<div class="flex flex-col gap-2">
				<div class="text-main-text-color text-xs">类型</div>
				<MemberTypePicker
					value={props.memberType}
					disabled={props.readOnly}
					onChange={props.onMemberTypeChange}
					compact
				/>
			</div>
		</div>
		<Show when={props.activeRoot.name}>
			<Divider />
			<div class="flex flex-col gap-2 px-4 py-3">
				<div class="text-accent-color text-xs font-semibold">当前分支</div>
				<Input
					type="text"
					aria-label="当前分支名"
					value={props.activeRoot.name ?? ""}
					disabled={props.readOnly}
					onInput={(event) => props.onRootNameChange(props.activeRoot, event.currentTarget.value)}
				/>
			</div>
		</Show>
		<Divider />
		<div class="text-accent-color px-4 pt-2 text-xs font-semibold">编辑</div>
		<MenuList dense>
			<MenuItem dense onClick={() => props.onOpenAdvanced("definition")}>
				MDSL
			</MenuItem>
			<MenuItem dense onClick={() => props.onOpenAdvanced("agent")}>
				Agent
			</MenuItem>
			<MenuItem dense onClick={() => props.onOpenAdvanced("slots")}>
				属性槽
			</MenuItem>
		</MenuList>
		<Divider />
		<div class="text-accent-color px-4 pt-2 text-xs font-semibold">通用示例</div>
		<ExamplesMenuContent onMDSLInsert={props.onMDSLInsert} onSelect={props.onClose} />
		<Divider />
		<div class="text-accent-color px-4 pt-2 text-xs font-semibold">技能示例</div>
		<SkillLogicExamplesMenuContent onMDSLInsert={props.onMDSLInsert} onSelect={props.onClose} />
	</Menu>
);

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

const memberTypeLabels: Record<MemberType, string> = {
	Player: "玩家",
	Partner: "伙伴",
	Mercenary: "佣兵",
	Mob: "怪物",
};

const memberTypeOptions = MEMBER_TYPE.map((type) => ({
	label: memberTypeLabels[type],
	value: type,
}));

const MemberTypePicker: Component<{
	value: MemberType;
	disabled: boolean;
	onChange: (value: MemberType) => void;
	compact?: boolean;
}> = (props) => {
	const setValue = (value: string) => props.onChange(value as MemberType);
	if (props.compact) {
		return (
			<Select
				value={props.value}
				setValue={setValue}
				options={memberTypeOptions}
				disabled={props.disabled}
				textCenter
			/>
		);
	}
	return (
		// 设计说明：MemberType 决定 action/condition registry 和属性路径上下文；桌面用枚举按钮直接比较，移动端用 Select 降低宽度占用。
		<>
			<div class="hidden shrink-0 lg:block">
				<EnumSelect<Record<MemberType, MemberType>>
					value={props.value}
					setValue={(value) => props.onChange(value as MemberType)}
					options={[...MEMBER_TYPE]}
					field={{ id: "bt-editor-member-type", name: "bt-editor-member-type" }}
					dic={memberTypeLabels}
					disabled={props.disabled}
				/>
			</div>
			<div class="w-32 shrink-0 lg:hidden">
				<Select
					value={props.value}
					setValue={setValue}
					options={memberTypeOptions}
					disabled={props.disabled}
					textCenter
				/>
			</div>
		</>
	);
};

const getRootDeleteBlockedReason = (document: EditableBtDocument, root: EditableBtRoot): string => {
	if (!root.name) return "主入口不能删除";
	if (document.roots.length <= 1) return "至少保留一个分支";
	const references = collectEditableBranchReferences(document).filter((reference) => reference.ref === root.name);
	if (references.length > 0) return `已有 ${references.length} 个 branch 引用，先调整引用后再删除`;
	return "";
};

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	const tagName = target.tagName.toLowerCase();
	return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

function getSubtreeTabRootKey(target: EventTarget | null): string | undefined {
	if (!(target instanceof HTMLElement)) return undefined;
	return target.closest<HTMLElement>("[data-bt-subtree-root-key]")?.dataset.btSubtreeRootKey;
}
