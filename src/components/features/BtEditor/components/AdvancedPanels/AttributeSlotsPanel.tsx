import type { AttributeSlotDeclarationData } from "@db/schema/jsons";
import { type Component, createMemo, For, Index } from "solid-js";
import { Button } from "~/components/controls/button";
import { CheckBox } from "~/components/controls/checkBox";
import { Input } from "~/components/controls/input";
import { validateAttributeSlots } from "../../model/authoringValidator";

export type AttributeSlotsPanelProps = {
	slots: AttributeSlotDeclarationData[];
	onChange: (slots: AttributeSlotDeclarationData[]) => void;
	readOnly?: boolean;
};

type AttributeSlotAttributePatch = Partial<AttributeSlotDeclarationData["attribute"]>;

const createEmptySlot = (): AttributeSlotDeclarationData => ({
	path: "skill.example.counter",
	attribute: {
		displayName: "行为树变量",
		expression: "0",
	},
});

export const AttributeSlotsPanel: Component<AttributeSlotsPanelProps> = (props) => {
	const errors = createMemo(() => validateAttributeSlots(props.slots));

	const updateSlot = (
		index: number,
		patch: Partial<Omit<AttributeSlotDeclarationData, "attribute">> & {
			attribute?: AttributeSlotAttributePatch;
		},
	) => {
		if (props.readOnly) return;
		const next = props.slots.slice();
		next[index] = {
			...next[index],
			...patch,
			attribute: {
				...next[index].attribute,
				...(patch.attribute ?? {}),
			},
		};
		props.onChange(next);
	};

	return (
		<div class="flex h-full min-h-0 flex-col gap-3 overflow-auto p-3">
			<div class="flex items-center justify-between gap-2">
				<div class="font-bold text-accent-color">属性槽</div>
				<Button
					class="min-h-11"
					disabled={props.readOnly}
					onClick={() => props.onChange([...props.slots, createEmptySlot()])}
				>
					新增
				</Button>
			</div>
			<For each={errors()}>
				{(error) => <div class="rounded bg-brand-color-3rd/10 px-3 py-2 text-sm text-brand-color-3rd">{error}</div>}
			</For>
			<Index each={props.slots}>
				{(slot, index) => (
					<div class="border-dividing-color bg-area-color flex flex-col gap-2 rounded-md border p-2">
						<Input
							type="text"
							title="path"
							value={slot().path}
							disabled={props.readOnly}
							onInput={(event) => updateSlot(index, { path: event.currentTarget.value })}
						/>
						<Input
							type="text"
							title="displayName"
							value={slot().attribute.displayName}
							disabled={props.readOnly}
							onInput={(event) => updateSlot(index, { attribute: { displayName: event.currentTarget.value } })}
						/>
						<Input
							type="text"
							title="expression"
							value={slot().attribute.expression}
							disabled={props.readOnly}
							onInput={(event) => updateSlot(index, { attribute: { expression: event.currentTarget.value } })}
						/>
						<div class="flex flex-wrap gap-2">
							<CheckBox
								name={`noBaseValue-${index}`}
								checked={!!slot().attribute.noBaseValue}
								disabled={props.readOnly}
								onChange={(event) => updateSlot(index, { attribute: { noBaseValue: event.currentTarget.checked } })}
							>
								noBaseValue
							</CheckBox>
						</div>
						<Button
							level="quaternary"
							class="min-h-11 justify-center"
							disabled={props.readOnly}
							onClick={() => props.onChange(props.slots.filter((_, slotIndex) => slotIndex !== index))}
						>
							删除
						</Button>
					</div>
				)}
			</Index>
		</div>
	);
};
