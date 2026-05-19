import type { AttributeSlotDeclarationData } from "@db/schema/jsons";
import { type Component, createMemo, For, Index, type JSX, Show } from "solid-js";
import { Button } from "~/components/controls/button";
import { CheckBox } from "~/components/controls/checkBox";
import { Input } from "~/components/controls/input";
import { Select } from "~/components/controls/select";
import type { NodeArgument } from "~/lib/mistreevous/BehaviourTreeDefinition";
import {
	COMPOSITE_NODE_TYPES,
	DECORATOR_NODE_TYPES,
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
	onChange: (node: EditableBtNode) => void;
	onDelete: () => void;
	onDuplicate: () => void;
	onMove: (direction: -1 | 1) => void;
	canDelete: boolean;
	readOnly?: boolean;
};

const nodeTypeOptions: Array<{ label: string; value: EditableBtNodeType }> = [
	{ label: "Root", value: "root" },
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

type InspectorContentItem = {
	title: string;
	description?: string;
	children: JSX.Element;
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
							<div class="flex items-center justify-between gap-2">
								<div>
									<div class="font-bold text-accent-color">节点属性</div>
									<div class="text-main-text-color text-xs">{nodeAccessor().id}</div>
								</div>
							</div>
							<Select
								value={nodeAccessor().type}
								setValue={(value) => {
									if (props.readOnly) return;
									if (props.node) props.onChange(retargetEditableNode(props.node, value as EditableBtNodeType));
								}}
								options={availableNodeTypeOptions()}
								disabled={nodeAccessor().type === "root" || props.readOnly}
							/>
							<Show when={nodeAccessor().type === "action" || nodeAccessor().type === "condition"}>
								<Select
									value={nodeAccessor().call ?? ""}
									setValue={updateCall}
									options={callableOptions()}
									placeholder="选择调用"
									disabled={props.readOnly}
								/>
								<InspectorContentModule
									moduleName="ActionArguments"
									labelName="参数"
									action={
										<Button
											level="quaternary"
											class="min-h-11"
											disabled={props.readOnly || !!callable()}
											onClick={addArg}
										>
											新增
										</Button>
									}
									content={argumentRows().map((row) => ({
										title: row.param.label,
										description: formatParamType(row.param),
										children: (
											<div class="flex w-full min-w-0 items-center gap-2">
												<div class="min-w-0 flex-1">
													<Show
														when={isPathArgument(row.param) && slotOptions().length > 0}
														fallback={
															<ArgumentInput
																value={formatArgument(row.value)}
																onInput={(event) => updateArg(row.index, event.currentTarget.value, row.param)}
																disabled={props.readOnly}
															/>
														}
													>
														<Select
															value={formatArgument(row.value)}
															setValue={(value) => updateArg(row.index, value, row.param)}
															options={slotOptions()}
															disabled={props.readOnly}
														/>
													</Show>
												</div>
												<Button
													level="quaternary"
													class="min-h-11 flex-none"
													disabled={props.readOnly || !!callable()}
													onClick={() => removeArg(row.index)}
												>
													删
												</Button>
											</div>
										),
									}))}
								/>
							</Show>
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
								<Input
									type="text"
									title="ref"
									value={nodeAccessor().ref ?? ""}
									disabled={props.readOnly}
									onInput={(event) => update({ ref: event.currentTarget.value })}
								/>
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
							<Show
								when={
									slotOptions().length > 0 && (nodeAccessor().type === "action" || nodeAccessor().type === "condition")
								}
							>
								<div class="border-dividing-color rounded border p-2">
									<div class="mb-2 text-sm font-bold">可用属性/槽</div>
									<div class="flex max-h-32 flex-wrap gap-1 overflow-auto">
										<For each={slotOptions()}>
											{(slot) => <span class="bg-area-color rounded px-2 py-1 text-xs">{slot.label}</span>}
										</For>
									</div>
								</div>
							</Show>
							<Show
								when={COMPOSITE_NODE_TYPES.has(nodeAccessor().type) || DECORATOR_NODE_TYPES.has(nodeAccessor().type)}
							>
								<div class="text-main-text-color text-xs">可从节点库向当前节点添加子节点。</div>
							</Show>
						</div>
					);
				}}
			</Show>
		</div>
	);
};

const InspectorContentModule: Component<{
	moduleName: string;
	labelName: string;
	action?: JSX.Element;
	content: InspectorContentItem[];
}> = (props) => (
	<div class={`Module ${props.moduleName} flex flex-col gap-1 lg:gap-2`}>
		<div class="flex items-center justify-between gap-2 lg:px-2">
			<h2 class="ModuleTitle py-2 text-xl font-bold">{props.labelName}</h2>
			{props.action}
		</div>
		<div class="LabelGroup flex flex-col gap-2">
			<Index each={props.content}>
				{(item) => (
					<Input title={item().title} description={item().description}>
						{item().children}
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
		<div class="border-dividing-color rounded border p-2">
			<div class="mb-2 flex items-center justify-between gap-2">
				<span class="text-sm font-bold">{props.title}</span>
				<Button
					level="quaternary"
					class="min-h-11"
					disabled={props.readOnly}
					onClick={props.value ? props.onClear : () => props.onChange({ call: "SomeAction", args: [] })}
				>
					{props.value ? "清除" : "启用"}
				</Button>
			</div>
			<Show when={props.value}>
				{(attribute) => (
					<div class="flex flex-col gap-2">
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
