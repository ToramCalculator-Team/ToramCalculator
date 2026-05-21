import type { AttributeSlotDeclarationData } from "@db/schema/jsons";
import { type Component, createEffect, createMemo, createSignal, For, Index, type JSX, Show } from "solid-js";
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
import type {
	MdslCallableSpec,
	MdslIntellisenseRegistry,
	MdslParamSpec,
	MdslTypeSpec,
} from "../../modes/mdslIntellisense";

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
	identity: string;
	param: MdslParamSpec;
	index: number;
	value: NodeArgument;
};

type ArgumentReferenceOption = {
	label: string;
	value: string;
	type: MdslTypeSpec;
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
	const propertyReferenceOptions = createMemo<ArgumentReferenceOption[]>(() =>
		Object.entries(props.registry.properties).map(([name, type]) => ({
			label: `$${name}`,
			value: `$${name}`,
			type,
		})),
	);
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
							return spec.params.map((param, index) => ({
								identity: `${node.id}:${index}:${param.label}`,
								param,
								index,
								value: args[index],
							}));
						}
						return node.args.map((value, index) => ({
							identity: `${node.id}:${index}:arg${index + 1}`,
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
					const updateArg = (index: number, value: NodeArgument) => {
						const args = normalizeArgsForSpec(nodeAccessor().args, callable());
						args[index] = value;
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
										propertyReferenceOptions={propertyReferenceOptions()}
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
	propertyReferenceOptions: ArgumentReferenceOption[];
	canRemove: boolean;
	readOnly?: boolean;
	onChange: (index: number, value: NodeArgument) => void;
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
								<ArgumentField
									row={row()}
									slotOptions={props.slotOptions}
									propertyReferenceOptions={props.propertyReferenceOptions}
									isPathArgument={props.isPathArgument}
									readOnly={props.readOnly}
									onChange={props.onChange}
								/>
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

const ArgumentField: Component<{
	row: ArgumentRow;
	slotOptions: Array<{ label: string; value: string }>;
	propertyReferenceOptions: ArgumentReferenceOption[];
	isPathArgument: (param: MdslParamSpec) => boolean;
	readOnly?: boolean;
	onChange: (index: number, value: NodeArgument) => void;
}> = (props) => {
	const update = (value: NodeArgument) => props.onChange(props.row.index, value);
	const param = () => props.row.param;
	const value = () => props.row.value;
	const referenceOptions = () => getReferenceOptionsForParam(param(), props.propertyReferenceOptions);

	if (props.isPathArgument(param()) && props.slotOptions.length > 0) {
		return (
			<Select
				value={formatArgument(value())}
				setValue={(nextValue) => update(parseNodeArgument(nextValue))}
				options={props.slotOptions}
				disabled={props.readOnly}
			/>
		);
	}

	if (param().type.kind === "enum") {
		return (
			<EnumArgumentField
				identity={props.row.identity}
				value={value()}
				values={param().type.values}
				referenceOptions={referenceOptions()}
				disabled={props.readOnly}
				onChange={update}
			/>
		);
	}

	if (param().type.kind === "primitive") {
		if (param().type.type === "number") {
			return (
				<NumberArgumentField
					identity={props.row.identity}
					value={value()}
					referenceOptions={referenceOptions()}
					readOnly={props.readOnly}
					onChange={update}
				/>
			);
		}
		if (param().type.type === "boolean") {
			return (
				<BooleanArgumentField
					identity={props.row.identity}
					value={value()}
					referenceOptions={referenceOptions()}
					readOnly={props.readOnly}
					onChange={update}
				/>
			);
		}
		if (param().type.type === "string") {
			return (
				<StringArgumentField
					identity={props.row.identity}
					value={value()}
					referenceOptions={referenceOptions()}
					readOnly={props.readOnly}
					onChange={update}
				/>
			);
		}
		if (param().type.type === "null") {
			return (
				<input
					type="text"
					value="null"
					disabled
					class="text-accent-color bg-area-color pointer-events-none w-full rounded p-3 opacity-50"
				/>
			);
		}
	}

	return (
		<ArgumentInput
			type="text"
			value={formatArgument(value())}
			onInput={(event) => update(parseNodeArgument(event.currentTarget.value))}
			disabled={props.readOnly}
		/>
	);
};

const EnumArgumentField: Component<{
	identity: string;
	value: NodeArgument;
	values: readonly string[];
	referenceOptions: ArgumentReferenceOption[];
	disabled?: boolean;
	onChange: (value: NodeArgument) => void;
}> = (props) => {
	const fallback = () => props.values[0] ?? "";
	const [directValue, setDirectValue] = createSignal(typeof props.value === "string" ? props.value : fallback());
	let previousIdentity = props.identity;

	createEffect(() => {
		if (props.identity !== previousIdentity) {
			previousIdentity = props.identity;
			setDirectValue(typeof props.value === "string" ? props.value : fallback());
			return;
		}
		if (typeof props.value === "string") setDirectValue(props.value);
	});

	const commitDirectValue = (value: string) => {
		setDirectValue(value);
		props.onChange(value);
	};

	return (
		// 设计说明：枚举参数的直接值来自 schema 候选；引用模式只接收字符串/未知属性，避免手写自由文本绕过枚举约束。
		<div class="flex min-w-0 gap-2">
			<Select
				value={directValue()}
				setValue={commitDirectValue}
				options={props.values.map((option) => ({ label: option, value: option }))}
				disabled={props.disabled || isPropertyReferenceArgument(props.value)}
			/>
			<ReferenceSelect
				value={props.value}
				options={props.referenceOptions}
				directLabel="直接枚举值"
				disabled={props.disabled}
				onDirect={() => props.onChange(directValue())}
				onReference={props.onChange}
			/>
		</div>
	);
};

const NumberArgumentField: Component<{
	identity: string;
	value: NodeArgument;
	referenceOptions: ArgumentReferenceOption[];
	readOnly?: boolean;
	onChange: (value: NodeArgument) => void;
}> = (props) => {
	const [rawValue, setRawValue] = createSignal(typeof props.value === "number" ? String(props.value) : "");
	let previousIdentity = props.identity;

	createEffect(() => {
		if (props.identity !== previousIdentity) {
			previousIdentity = props.identity;
			setRawValue(typeof props.value === "number" ? String(props.value) : "");
			return;
		}
		if (typeof props.value === "number") setRawValue(String(props.value));
	});

	const parseFiniteNumber = (raw: string): number | undefined => {
		const trimmed = raw.trim();
		if (!trimmed || trimmed === "+" || trimmed === "-" || trimmed === "." || trimmed === "+." || trimmed === "-.") {
			return undefined;
		}
		const nextValue = Number(trimmed);
		return Number.isFinite(nextValue) ? nextValue : undefined;
	};

	const commitRawValue = (): number => {
		const parsed = parseFiniteNumber(rawValue());
		const nextValue = parsed ?? (typeof props.value === "number" ? props.value : 0);
		setRawValue(String(nextValue));
		return nextValue;
	};

	const handleInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (event) => {
		const nextRawValue = event.currentTarget.value;
		setRawValue(nextRawValue);
		const parsed = parseFiniteNumber(nextRawValue);
		if (parsed !== undefined) props.onChange(parsed);
	};

	return (
		// 设计说明：数字输入存在“正在输入但还不是合法 number”的瞬态，本地 raw buffer 避免把小数点/负号立刻提交成 0。
		<div class="flex min-w-0 gap-2">
			<ArgumentInput
				type="number"
				value={rawValue()}
				disabled={props.readOnly || isPropertyReferenceArgument(props.value)}
				onInput={handleInput}
				onBlur={() => props.onChange(commitRawValue())}
			/>
			<ReferenceSelect
				value={props.value}
				options={props.referenceOptions}
				directLabel="直接数值"
				disabled={props.readOnly}
				onDirect={() => props.onChange(commitRawValue())}
				onReference={props.onChange}
			/>
		</div>
	);
};

const BooleanArgumentField: Component<{
	identity: string;
	value: NodeArgument;
	referenceOptions: ArgumentReferenceOption[];
	readOnly?: boolean;
	onChange: (value: NodeArgument) => void;
}> = (props) => {
	const [directValue, setDirectValue] = createSignal(typeof props.value === "boolean" ? props.value : false);
	let previousIdentity = props.identity;

	createEffect(() => {
		if (props.identity !== previousIdentity) {
			previousIdentity = props.identity;
			setDirectValue(typeof props.value === "boolean" ? props.value : false);
			return;
		}
		if (typeof props.value === "boolean") setDirectValue(props.value);
	});

	const commitDirectValue = (value: boolean) => {
		setDirectValue(value);
		props.onChange(value);
	};

	return (
		<div class="flex min-w-0 items-center gap-2">
			<div class={isPropertyReferenceArgument(props.value) ? "pointer-events-none opacity-50" : ""}>
				<CheckBox
					name="boolean-argument"
					checked={directValue()}
					disabled={props.readOnly || isPropertyReferenceArgument(props.value)}
					onChange={(event) => commitDirectValue(event.currentTarget.checked)}
				>
					{directValue() ? "true" : "false"}
				</CheckBox>
			</div>
			<ReferenceSelect
				value={props.value}
				options={props.referenceOptions}
				directLabel="直接布尔值"
				disabled={props.readOnly}
				onDirect={() => props.onChange(directValue())}
				onReference={props.onChange}
			/>
		</div>
	);
};

const StringArgumentField: Component<{
	identity: string;
	value: NodeArgument;
	referenceOptions: ArgumentReferenceOption[];
	readOnly?: boolean;
	onChange: (value: NodeArgument) => void;
}> = (props) => {
	const [directValue, setDirectValue] = createSignal(typeof props.value === "string" ? props.value : "");
	let previousIdentity = props.identity;

	createEffect(() => {
		if (props.identity !== previousIdentity) {
			previousIdentity = props.identity;
			setDirectValue(typeof props.value === "string" ? props.value : "");
			return;
		}
		if (typeof props.value === "string") setDirectValue(props.value);
	});

	const commitDirectValue = (value: string) => {
		setDirectValue(value);
		props.onChange(value);
	};

	return (
		<div class="flex min-w-0 gap-2">
			<ArgumentInput
				type="text"
				value={directValue()}
				disabled={props.readOnly || isPropertyReferenceArgument(props.value)}
				onInput={(event) => commitDirectValue(event.currentTarget.value)}
			/>
			<ReferenceSelect
				value={props.value}
				options={props.referenceOptions}
				directLabel="直接文本"
				disabled={props.readOnly}
				onDirect={() => props.onChange(directValue())}
				onReference={props.onChange}
			/>
		</div>
	);
};

const ReferenceSelect: Component<{
	value: NodeArgument;
	options: ArgumentReferenceOption[];
	directLabel: string;
	disabled?: boolean;
	onDirect: () => void;
	onReference: (value: NodeArgument) => void;
}> = (props) => {
	const currentReference = createMemo(() =>
		isPropertyReferenceArgument(props.value) ? formatArgument(props.value) : "",
	);
	const options = createMemo(() => {
		const current = currentReference();
		const currentOption =
			current && !props.options.some((option) => option.value === current)
				? [{ label: `${current}（当前）`, value: current }]
				: [];
		return [{ label: props.directLabel, value: "" }, ...currentOption, ...props.options];
	});

	return (
		// 设计说明：当前文档可能引用了未声明或类型暂不可推断的 `$属性`；显示当前值可以保护旧数据不被控件语义吞掉。
		<Show when={props.options.length > 0 || !!currentReference()}>
			<div class="w-36 shrink-0">
				<Select
					value={currentReference()}
					setValue={(nextValue) => {
						if (!nextValue) {
							props.onDirect();
							return;
						}
						props.onReference(parseNodeArgument(nextValue));
					}}
					options={options()}
					disabled={props.disabled}
				/>
			</div>
		</Show>
	);
};

const isPropertyReferenceArgument = (value: NodeArgument): value is { $: string } =>
	typeof value === "object" && value !== null && "$" in value;

const getReferenceOptionsForParam = (
	param: MdslParamSpec,
	options: ArgumentReferenceOption[],
): ArgumentReferenceOption[] => {
	if (param.type.kind === "enum") {
		return options.filter((option) => {
			if (option.type.kind !== "primitive") return false;
			return option.type.type === "string" || option.type.type === "unknown";
		});
	}
	if (param.type.kind !== "primitive") return [];
	const expectedType = param.type.type;
	if (expectedType === "null") return [];
	if (expectedType === "unknown") return options;
	return options.filter((option) => {
		if (option.type.kind !== "primitive") return false;
		return option.type.type === expectedType || option.type.type === "unknown";
	});
};

const ArgumentInput: Component<{
	type: "text" | "number";
	value: string;
	disabled?: boolean;
	onInput: JSX.EventHandler<HTMLInputElement, InputEvent>;
	onBlur?: JSX.EventHandler<HTMLInputElement, FocusEvent>;
}> = (props) => (
	<input
		type={props.type}
		value={props.value}
		disabled={props.disabled}
		onInput={props.onInput}
		onBlur={props.onBlur}
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
