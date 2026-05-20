import type { AttributeSlotDeclarationData } from "@db/schema/jsons";
import { type Component, createMemo, For, Index, type JSX, Show } from "solid-js";
import { Button } from "~/components/controls/button";
import { CheckBox } from "~/components/controls/checkBox";
import { Input } from "~/components/controls/input";
import { Select } from "~/components/controls/select";
import type { NodeArgument } from "~/lib/mistreevous/BehaviourTreeDefinition";
import type { BtAuthoringDiagnostic } from "../../model/authoringValidator";
import {
	type EditableBtAttribute,
	type EditableBtNode,
	type EditableBtNodeType,
	formatArgument,
	parseNodeArgument,
	retargetEditableNode,
} from "../../model/editableTree";
import type { MdslCallableSpec, MdslIntellisenseRegistry, MdslParamSpec } from "../../modes/mdslIntellisense";

export type NodeInspectorProps = {
	node?: EditableBtNode;
	registry: MdslIntellisenseRegistry;
	attributeSlots: AttributeSlotDeclarationData[];
	subtreeOptions: Array<{ label: string; value: string }>;
	nodeDiagnostics?: BtAuthoringDiagnostic[];
	onChange: (node: EditableBtNode) => void;
	onOpenBranchTarget?: (ref: string) => void;
	onDelete: () => void;
	onDuplicate: () => void;
	onMove: (direction: -1 | 1) => void;
	canDelete: boolean;
	readOnly?: boolean;
};

const nodeTypeOptions: Array<{ label: string; value: EditableBtNodeType }> = [
	{ label: "子树入口", value: "root" },
	{ label: "Sequence", value: "sequence" },
	{ label: "Selector", value: "selector" },
	{ label: "Parallel", value: "parallel" },
	{ label: "Race", value: "race" },
	{ label: "All", value: "all" },
	{ label: "Lotto", value: "lotto" },
	{ label: "Repeat", value: "repeat" },
	{ label: "Retry", value: "retry" },
	{ label: "Flip", value: "flip" },
	{ label: "Succeed", value: "succeed" },
	{ label: "Fail", value: "fail" },
	{ label: "Action", value: "action" },
	{ label: "Condition", value: "condition" },
	{ label: "Wait", value: "wait" },
	{ label: "Branch", value: "branch" },
];

type AttributeKey = "entry" | "step" | "exit" | "while" | "until";

type ArgumentRow = {
	param: MdslParamSpec;
	index: number;
	value: NodeArgument;
};

const defaultArgumentForParam = (param: MdslParamSpec): NodeArgument => {
	if (param.type.kind === "enum") return param.type.values[0] ?? "";
	if (param.type.type === "number") return 0;
	if (param.type.type === "boolean") return false;
	if (param.type.type === "null") return null;
	return "";
};

const normalizeArgsForSpec = (args: NodeArgument[], spec?: MdslCallableSpec): NodeArgument[] => {
	if (!spec) return args;
	return spec.params.map((param, index) => args[index] ?? defaultArgumentForParam(param));
};

const parseParamValue = (value: string, param: MdslParamSpec): NodeArgument => {
	if (param.type.kind === "primitive" && param.type.type === "number") return Number(value) || 0;
	if (param.type.kind === "primitive" && param.type.type === "boolean") return value === "true";
	return parseNodeArgument(value);
};

const getSingleNumberValue = (value: number | [number, number] | undefined, fallback: number): number => {
	if (Array.isArray(value)) return value[0];
	return value ?? fallback;
};

const formatParamType = (param: MdslParamSpec): string => {
	if (param.description) return param.description;
	if (param.type.kind === "enum") return `可选值：${param.type.values.join(" / ")}`;
	if (param.type.kind === "primitive") return `类型：${param.type.type}`;
	return "";
};

export const NodeInspector: Component<NodeInspectorProps> = (props) => {
	const callableOptions = createMemo(() => {
		const node = props.node;
		const source = node?.type === "condition" ? props.registry.conditions : props.registry.actions;
		return Object.keys(source).map((name) => ({ label: name, value: name }));
	});

	const availableNodeTypeOptions = createMemo(() => {
		if (props.node?.type === "root") return nodeTypeOptions.filter((option) => option.value === "root");
		return nodeTypeOptions.filter((option) => option.value !== "root");
	});

	const slotOptions = createMemo(() => [
		...Object.keys(props.registry.properties).map((name) => ({ label: `$${name}`, value: `$${name}` })),
		...props.attributeSlots.map((slot) => ({ label: slot.path, value: slot.path })),
	]);
	const nodeDiagnostics = createMemo(() => props.nodeDiagnostics ?? []);
	const branchTargetOptions = createMemo(() => {
		const ref = props.node?.type === "branch" ? props.node.ref?.trim() : "";
		const options = props.subtreeOptions;
		if (ref && !options.some((option) => option.value === ref)) {
			return [{ label: `${ref}（缺失）`, value: ref }, ...options];
		}
		return options;
	});
	const hasBranchTarget = createMemo(() => {
		const ref = props.node?.type === "branch" ? props.node.ref?.trim() : "";
		return !!ref && props.subtreeOptions.some((option) => option.value === ref);
	});

	const update = (patch: Partial<EditableBtNode>) => {
		if (!props.node || props.readOnly) return;
		props.onChange({
			...props.node,
			...patch,
			children: patch.children ?? props.node.children,
		});
	};

	const addArg = () => {
		if (!props.node) return;
		update({ args: [...props.node.args, ""] });
	};

	const removeArg = (index: number) => {
		if (!props.node) return;
		update({ args: props.node.args.filter((_, argIndex) => argIndex !== index) });
	};

	const updateAttribute = (key: AttributeKey, patch: Partial<EditableBtAttribute>) => {
		if (!props.node) return;
		const current = props.node[key] ?? { call: "", args: [] };
		update({
			[key]: {
				...current,
				...patch,
				args: patch.args ?? current.args,
			},
		} as Partial<EditableBtNode>);
	};

	const clearAttribute = (key: AttributeKey) => {
		if (!props.node) return;
		update({ [key]: undefined } as Partial<EditableBtNode>);
	};

	return (
		<div class="flex h-full min-h-0 flex-col overflow-auto p-3">
			<Show when={props.node} fallback={<div class="text-main-text-color p-3">选择一个节点后编辑属性</div>}>
				{(nodeAccessor) => {
					const callableSource = () =>
						nodeAccessor().type === "condition" ? props.registry.conditions : props.registry.actions;
					const callable = () => {
						const call = nodeAccessor().call;
						return call ? callableSource()[call] : undefined;
					};
					const argumentRows = (): ArgumentRow[] => {
						const spec = callable();
						const node = nodeAccessor();
						if (spec) {
							const args = normalizeArgsForSpec(node.args, spec);
							return spec.params.map((param, index) => ({ param, index, value: args[index] }));
						}
						return node.args.map((value, index) => ({
							param: { label: `arg${index + 1}`, type: { kind: "primitive", type: "unknown" } },
							index,
							value,
						}));
					};
					const isPathArgument = (param: MdslParamSpec) => /(^|\.)(path|counterSlot)$/i.test(param.label);
					const updateCall = (value: string) => {
						const nextSpec = callableSource()[value];
						update({ call: value, args: normalizeArgsForSpec(nodeAccessor().args, nextSpec) });
					};
					const updateArg = (index: number, value: string, param: MdslParamSpec) => {
						const args = normalizeArgsForSpec(nodeAccessor().args, callable());
						args[index] = parseParamValue(value, param);
						update({ args });
					};

					return (
						<div class="flex flex-col gap-3">
							<div>
								<div class="font-bold text-accent-color">节点属性</div>
								<div class="text-main-text-color text-xs">{nodeAccessor().id}</div>
							</div>
							<Show when={nodeDiagnostics().length > 0}>
								<InlineDiagnostics diagnostics={nodeDiagnostics()} />
							</Show>
							<div class="border-dividing-color border-t py-3">
								<div class="mb-2 text-sm font-bold text-accent-color">节点类型</div>
								<Select
									value={nodeAccessor().type}
									setValue={(value) => {
										if (props.readOnly) return;
										if (props.node) props.onChange(retargetEditableNode(props.node, value as EditableBtNodeType));
									}}
									options={availableNodeTypeOptions()}
									disabled={nodeAccessor().type === "root" || props.readOnly}
								/>
							</div>
							<Show when={nodeAccessor().type === "action" || nodeAccessor().type === "condition"}>
								<InspectorSection title="调用">
									<Select
										value={nodeAccessor().call ?? ""}
										setValue={updateCall}
										options={callableOptions()}
										placeholder="选择调用"
										disabled={props.readOnly}
									/>
									<ArgumentInspectorModule
										moduleName="ActionArguments"
										labelName="参数"
										action={
											<Button
												level="quaternary"
												class="min-h-10"
												disabled={props.readOnly || !!callable()}
												onClick={addArg}
											>
												新增
											</Button>
										}
										rows={argumentRows()}
										slotOptions={slotOptions()}
										canRemove={!props.readOnly && !callable()}
										readOnly={props.readOnly}
										onChange={updateArg}
										onRemove={removeArg}
										isPathArgument={isPathArgument}
									/>
									<InlineDiagnostics diagnostics={nodeDiagnostics().filter(isCallOrArgumentDiagnostic)} />
								</InspectorSection>
							</Show>
							<Show
								when={
									nodeAccessor().type === "wait" ||
									nodeAccessor().type === "branch" ||
									nodeAccessor().type === "repeat" ||
									nodeAccessor().type === "retry" ||
									nodeAccessor().type === "lotto"
								}
							>
								<InspectorSection title="控制参数">
									<Show when={nodeAccessor().type === "wait"}>
										<Input
											type="text"
											title="duration"
											value={formatArgument(nodeAccessor().duration ?? 1000)}
											disabled={props.readOnly}
											onInput={(event) => {
												const raw = event.currentTarget.value.trim();
												update({ duration: raw.startsWith("$") ? { $: raw.slice(1) } : Number(raw) || 0 });
											}}
										/>
									</Show>
									<Show when={nodeAccessor().type === "branch"}>
										<InlineDiagnostics diagnostics={nodeDiagnostics().filter(isBranchDiagnostic)} />
										<Select
											value={nodeAccessor().ref ?? ""}
											setValue={(value) => update({ ref: value })}
											options={branchTargetOptions()}
											placeholder="选择子树"
											disabled={props.readOnly || branchTargetOptions().length === 0}
										/>
										<div class="flex gap-2">
											<Button
												level="secondary"
												class="min-h-10 flex-1 justify-center"
												disabled={!hasBranchTarget()}
												onClick={() => props.onOpenBranchTarget?.(nodeAccessor().ref ?? "")}
											>
												打开目标子树
											</Button>
										</div>
										<Show when={branchTargetOptions().length === 0}>
											<div class="text-main-text-color text-xs">当前 BT 没有可引用的命名子树。</div>
										</Show>
									</Show>
									<Show when={nodeAccessor().type === "repeat"}>
										<Input
											type="number"
											title="iterations"
											value={getSingleNumberValue(nodeAccessor().iterations, 1)}
											disabled={props.readOnly}
											onInput={(event) => update({ iterations: Number(event.currentTarget.value) || 1 })}
										/>
									</Show>
									<Show when={nodeAccessor().type === "retry"}>
										<Input
											type="number"
											title="attempts"
											value={getSingleNumberValue(nodeAccessor().attempts, 1)}
											disabled={props.readOnly}
											onInput={(event) => update({ attempts: Number(event.currentTarget.value) || 1 })}
										/>
									</Show>
									<Show when={nodeAccessor().type === "lotto"}>
										<Input
											type="text"
											title="weights"
											description="用逗号分隔，留空表示平均权重"
											value={(nodeAccessor().weights ?? []).map(formatArgument).join(",")}
											disabled={props.readOnly}
											onInput={(event) =>
												update({
													weights: event.currentTarget.value
														.split(",")
														.map((item) => item.trim())
														.filter(Boolean)
														.map((item) => (item.startsWith("$") ? { $: item.slice(1) } : Number(item) || 1)),
												})
											}
										/>
									</Show>
								</InspectorSection>
							</Show>
							<InspectorSection title="生命周期" collapsible>
								<InlineDiagnostics diagnostics={nodeDiagnostics().filter(isCallbackDiagnostic)} />
								<AttributeEditor
									title="entry"
									value={nodeAccessor().entry}
									onChange={(patch) => updateAttribute("entry", patch)}
									onClear={() => clearAttribute("entry")}
									readOnly={props.readOnly}
								/>
								<AttributeEditor
									title="step"
									value={nodeAccessor().step}
									onChange={(patch) => updateAttribute("step", patch)}
									onClear={() => clearAttribute("step")}
									readOnly={props.readOnly}
								/>
								<AttributeEditor
									title="exit"
									value={nodeAccessor().exit}
									onChange={(patch) => updateAttribute("exit", patch)}
									onClear={() => clearAttribute("exit")}
									readOnly={props.readOnly}
								/>
							</InspectorSection>
							<InspectorSection title="守卫" collapsible>
								<InlineDiagnostics diagnostics={nodeDiagnostics().filter(isGuardDiagnostic)} />
								<AttributeEditor
									title="while"
									value={nodeAccessor().while}
									onChange={(patch) => updateAttribute("while", patch)}
									onClear={() => clearAttribute("while")}
									guard
									readOnly={props.readOnly}
								/>
								<AttributeEditor
									title="until"
									value={nodeAccessor().until}
									onChange={(patch) => updateAttribute("until", patch)}
									onClear={() => clearAttribute("until")}
									guard
									readOnly={props.readOnly}
								/>
							</InspectorSection>
							<Show
								when={
									slotOptions().length > 0 && (nodeAccessor().type === "action" || nodeAccessor().type === "condition")
								}
							>
								<InspectorSection
									title="可用属性槽"
									collapsible
									defaultOpen={argumentRows().some((row) => isPathArgument(row.param))}
								>
									<div class="flex max-h-32 flex-wrap gap-1 overflow-auto">
										<For each={slotOptions()}>
											{(slot) => <span class="bg-area-color rounded px-2 py-1 text-xs">{slot.label}</span>}
										</For>
									</div>
								</InspectorSection>
							</Show>
						</div>
					);
				}}
			</Show>
		</div>
	);
};

const InspectorSection: Component<{
	title: string;
	children: JSX.Element;
	collapsible?: boolean;
	defaultOpen?: boolean;
}> = (props) => {
	const content = <div class="flex flex-col gap-2 py-2">{props.children}</div>;
	if (props.collapsible) {
		return (
			<details class="border-dividing-color border-t py-2" open={props.defaultOpen}>
				<summary class="cursor-pointer py-1 text-sm font-bold text-accent-color">{props.title}</summary>
				{content}
			</details>
		);
	}
	return (
		<section class="border-dividing-color border-t py-2">
			<div class="py-1 text-sm font-bold text-accent-color">{props.title}</div>
			{content}
		</section>
	);
};

const InlineDiagnostics: Component<{ diagnostics: BtAuthoringDiagnostic[] }> = (props) => (
	<Show when={props.diagnostics.length > 0}>
		<div class="flex flex-col gap-1">
			<For each={props.diagnostics}>
				{(diagnostic) => (
					<div
						class={`rounded px-2 py-1 text-xs ${
							diagnostic.severity === "warning"
								? "bg-amber-500/10 text-amber-600"
								: diagnostic.severity === "info"
									? "bg-area-color text-main-text-color"
									: "bg-brand-color-3rd/10 text-brand-color-3rd"
						}`}
					>
						{diagnostic.message}
					</div>
				)}
			</For>
		</div>
	</Show>
);

const isCallOrArgumentDiagnostic = (diagnostic: BtAuthoringDiagnostic): boolean =>
	diagnostic.code.startsWith("action.") || diagnostic.code.startsWith("condition.");

const isCallbackDiagnostic = (diagnostic: BtAuthoringDiagnostic): boolean => diagnostic.code.startsWith("callback.");

const isGuardDiagnostic = (diagnostic: BtAuthoringDiagnostic): boolean => diagnostic.code.startsWith("guard.");

const isBranchDiagnostic = (diagnostic: BtAuthoringDiagnostic): boolean => diagnostic.code.startsWith("branch.");

const ArgumentInspectorModule: Component<{
	moduleName: string;
	labelName: string;
	action?: JSX.Element;
	rows: ArgumentRow[];
	slotOptions: Array<{ label: string; value: string }>;
	canRemove: boolean;
	readOnly?: boolean;
	onChange: (index: number, value: string, param: MdslParamSpec) => void;
	onRemove: (index: number) => void;
	isPathArgument: (param: MdslParamSpec) => boolean;
}> = (props) => (
	<div class={`Module ${props.moduleName} flex flex-col gap-1 lg:gap-2`}>
		<div class="flex items-center justify-between gap-2">
			<h2 class="ModuleTitle py-1 text-base font-bold">{props.labelName}</h2>
			{props.action}
		</div>
		<div class="LabelGroup flex flex-col gap-2">
			<Index each={props.rows}>
				{(row) => (
					<Input title={row().param.label} description={formatParamType(row().param)}>
						<div class="flex w-full min-w-0 items-center gap-2">
							<div class="min-w-0 flex-1">
								<Show
									when={props.isPathArgument(row().param) && props.slotOptions.length > 0}
									fallback={
										<ArgumentInput
											value={formatArgument(row().value)}
											onInput={(event) => props.onChange(row().index, event.currentTarget.value, row().param)}
											disabled={props.readOnly}
										/>
									}
								>
									<Select
										value={formatArgument(row().value)}
										setValue={(value) => props.onChange(row().index, value, row().param)}
										options={props.slotOptions}
										disabled={props.readOnly}
									/>
								</Show>
							</div>
							<Button
								level="quaternary"
								class="min-h-11 flex-none"
								disabled={!props.canRemove}
								onClick={() => props.onRemove(row().index)}
							>
								删
							</Button>
						</div>
					</Input>
				)}
			</Index>
		</div>
	</div>
);

const ArgumentInput: Component<{
	value: string;
	disabled?: boolean;
	onInput: JSX.EventHandler<HTMLInputElement, InputEvent>;
}> = (props) => (
	<input
		type="text"
		value={props.value}
		disabled={props.disabled}
		onInput={props.onInput}
		class={`text-accent-color bg-area-color w-full rounded p-3 focus:outline-brand-color-1st ${
			props.disabled ? "pointer-events-none opacity-50" : ""
		}`}
	/>
);

const AttributeEditor: Component<{
	title: AttributeKey;
	value?: EditableBtAttribute;
	guard?: boolean;
	onChange: (patch: Partial<EditableBtAttribute>) => void;
	onClear: () => void;
	readOnly?: boolean;
}> = (props) => {
	return (
		<div class="border-dividing-color border-t py-2 first:border-t-0">
			<div class="flex items-center justify-between gap-2">
				<span class="text-sm font-bold">{props.title}</span>
				<Button
					level="quaternary"
					class="min-h-10"
					disabled={props.readOnly}
					onClick={props.value ? props.onClear : () => props.onChange({ call: "SomeAction", args: [] })}
				>
					{props.value ? "清除" : "启用"}
				</Button>
			</div>
			<Show when={props.value}>
				{(attribute) => (
					<div class="mt-2 flex flex-col gap-2">
						<Input
							type="text"
							value={attribute().call}
							disabled={props.readOnly}
							onInput={(event) => props.onChange({ call: event.currentTarget.value })}
						/>
						<Input
							type="text"
							description="参数用逗号分隔"
							value={attribute().args.map(formatArgument).join(",")}
							disabled={props.readOnly}
							onInput={(event) =>
								props.onChange({
									args: event.currentTarget.value
										.split(",")
										.map((item) => item.trim())
										.filter(Boolean)
										.map(parseNodeArgument),
								})
							}
						/>
						<Show when={props.guard}>
							<CheckBox
								name={`${props.title}-succeedOnAbort`}
								checked={!!attribute().succeedOnAbort}
								disabled={props.readOnly}
								onChange={(event) => props.onChange({ succeedOnAbort: event.currentTarget.checked })}
							>
								succeedOnAbort
							</CheckBox>
						</Show>
					</div>
				)}
			</Show>
		</div>
	);
};
