import type { AttributeSlotDeclarationData } from "@db/schema/jsons";
import { type Component, createEffect, createMemo, createSignal, Match, Show, Switch } from "solid-js";
import { Button } from "~/components/controls/button";
import { validateAttributeSlots } from "../../model/authoringValidator";
import { CodeEditor } from "../CodeEditor/CodeEditor";
import { AttributeSlotsPanel } from "./AttributeSlotsPanel";

export type AdvancedPanelKey = "definition" | "agent" | "slots";

export type AdvancedTextPanelsProps = {
	open: boolean;
	activePanel: AdvancedPanelKey;
	definition: string;
	agent: string;
	attributeSlots: AttributeSlotDeclarationData[];
	definitionError?: string;
	agentError?: string;
	onClose: () => void;
	onPanelChange: (panel: AdvancedPanelKey) => void;
	onDefinitionApply: (definition: string) => void;
	onAgentChange: (agent: string) => void;
	onAttributeSlotsChange: (slots: AttributeSlotDeclarationData[]) => void;
	readOnly?: boolean;
};

export const AdvancedTextPanels: Component<AdvancedTextPanelsProps> = (props) => {
	const [draftDefinition, setDraftDefinition] = createSignal(props.definition);
	const [agentDraft, setAgentDraft] = createSignal(props.agent);
	const [slotJsonDraft, setSlotJsonDraft] = createSignal(JSON.stringify(props.attributeSlots, null, "\t"));
	const [slotJsonError, setSlotJsonError] = createSignal("");

	const slotErrors = createMemo(() => validateAttributeSlots(props.attributeSlots));

	const syncDefinitionDraft = () => setDraftDefinition(props.definition);
	const syncSlotJsonDraft = () => {
		setSlotJsonDraft(JSON.stringify(props.attributeSlots, null, "\t"));
		setSlotJsonError("");
	};
	const syncAgentDraft = () => setAgentDraft(props.agent);

	createEffect(() => {
		if (props.open && props.activePanel === "definition") syncDefinitionDraft();
	});

	createEffect(() => {
		if (props.open && props.activePanel === "agent") syncAgentDraft();
	});

	createEffect(() => {
		if (props.open && props.activePanel === "slots") syncSlotJsonDraft();
	});

	const applySlotJson = () => {
		if (props.readOnly) return;
		try {
			const parsed = JSON.parse(slotJsonDraft());
			if (!Array.isArray(parsed)) {
				setSlotJsonError("attributeSlots JSON 必须是数组");
				return;
			}
			const errors = validateAttributeSlots(parsed);
			if (errors.length > 0) {
				setSlotJsonError(errors.join("\n"));
				return;
			}
			props.onAttributeSlotsChange(parsed);
			setSlotJsonError("");
		} catch (error) {
			setSlotJsonError(error instanceof Error ? error.message : String(error));
		}
	};

	return (
		<Show when={props.open}>
			<div class="absolute inset-0 z-50 flex bg-black/30">
				<div class="bg-primary-color flex h-full w-full flex-col shadow-lg">
					<div class="border-dividing-color flex min-h-14 items-center gap-2 border-b p-2">
						<Button
							level={props.activePanel === "definition" ? "primary" : "quaternary"}
							class="min-h-11"
							onClick={() => {
								props.onPanelChange("definition");
								syncDefinitionDraft();
							}}
						>
							Definition
						</Button>
							<Button
								level={props.activePanel === "agent" ? "primary" : "quaternary"}
								class="min-h-11"
								onClick={() => {
									props.onPanelChange("agent");
									syncAgentDraft();
								}}
							>
							Agent
						</Button>
						<Button
							level={props.activePanel === "slots" ? "primary" : "quaternary"}
							class="min-h-11"
							onClick={() => {
								props.onPanelChange("slots");
								syncSlotJsonDraft();
							}}
						>
							Slots
						</Button>
						<Button level="quaternary" class="ml-auto min-h-11" onClick={props.onClose}>
							关闭
						</Button>
					</div>
					<div class="min-h-0 flex-1">
						<Switch>
							<Match when={props.activePanel === "definition"}>
								<div class="flex h-full flex-col">
									<div class="border-dividing-color flex items-center gap-2 border-b p-2">
										<Button
											class="min-h-11"
											disabled={props.readOnly}
											onClick={() => props.onDefinitionApply(draftDefinition())}
										>
											应用 Definition
										</Button>
										<Show when={props.definitionError}>
											<div class="text-brand-color-3rd text-sm">{props.definitionError}</div>
										</Show>
									</div>
									<div class="min-h-0 flex-1">
										<CodeEditor
											value={draftDefinition()}
											onChange={setDraftDefinition}
											mode="json"
											readOnly={props.readOnly}
										/>
									</div>
								</div>
							</Match>
								<Match when={props.activePanel === "agent"}>
									<div class="flex h-full flex-col">
										<div class="border-dividing-color flex items-center gap-2 border-b p-2">
											<Button class="min-h-11" disabled={props.readOnly} onClick={() => props.onAgentChange(agentDraft())}>
												应用 Agent
											</Button>
										</div>
										<Show when={props.agentError}>
											<div class="bg-brand-color-3rd/10 p-2 text-sm text-brand-color-3rd">{props.agentError}</div>
										</Show>
										<div class="min-h-0 flex-1">
											<CodeEditor
												value={agentDraft()}
												onChange={setAgentDraft}
												mode="javascript"
												readOnly={props.readOnly}
										/>
									</div>
								</div>
							</Match>
							<Match when={props.activePanel === "slots"}>
								<div class="grid h-full min-h-0 grid-cols-1 lg:grid-cols-2">
									<AttributeSlotsPanel
										slots={props.attributeSlots}
										onChange={props.onAttributeSlotsChange}
										readOnly={props.readOnly}
									/>
									<div class="border-dividing-color flex min-h-0 flex-col border-t lg:border-t-0 lg:border-l">
										<div class="flex items-center gap-2 p-2">
											<Button class="min-h-11" disabled={props.readOnly} onClick={applySlotJson}>
												应用 JSON
											</Button>
											<Button level="quaternary" class="min-h-11" onClick={syncSlotJsonDraft}>
												同步
											</Button>
										</div>
										<Show when={slotJsonError() || slotErrors().length > 0}>
											<div class="whitespace-pre-wrap bg-brand-color-3rd/10 p-2 text-sm text-brand-color-3rd">
												{slotJsonError() || slotErrors().join("\n")}
											</div>
										</Show>
										<textarea
											class="text-accent-color bg-area-color min-h-0 flex-1 resize-none p-3 font-mono text-sm outline-none"
											value={slotJsonDraft()}
											readOnly={props.readOnly}
											spellcheck={false}
											onInput={(event) => setSlotJsonDraft(event.currentTarget.value)}
										/>
									</div>
								</div>
							</Match>
						</Switch>
					</div>
				</div>
			</div>
		</Show>
	);
};
