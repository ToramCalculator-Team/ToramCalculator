import type { CharacterWithRelations } from "@db/generated/repositories/character";
import type { CharacterPersonalityType } from "@db/schema/enums";
import { RangeInput } from "~/components/controls/range";
import { Select } from "~/components/controls/select";
import { useDictionary } from "~/contexts/Dictionary";

export type AbilitySlot = Extract<
	keyof CharacterWithRelations,
	"lv" | "str" | "int" | "vit" | "agi" | "dex" | "personalityType" | "personalityValue"
>;

type AbiPanelProps = {
	slots: {
		lv: number;
		str: number;
		int: number;
		vit: number;
		agi: number;
		dex: number;
		personalityType: CharacterPersonalityType;
		personalityValue: number;
	};
	onChangeRequested: (slot: AbilitySlot, value: number | CharacterPersonalityType) => void;
};

export function AbiPanel(props: AbiPanelProps) {
	const dictionary = useDictionary();
	return (
		<div class="AbilityConfig flex flex-col gap-2">
			<div class="Level flex flex-col gap-2">
				<div class="LevelLabel">{dictionary().db.character.fields.lv.key}</div>
				<RangeInput
					value={props.slots.lv}
					setValue={(value) => {
						props.onChangeRequested("lv", value);
					}}
					min={1}
					max={300}
					showSlider={false}
				/>
			</div>
			<div class="Ability flex flex-col gap-2">
				<div class="AbilityLabel">ABI</div>
				<div class="AbilityValueGroup flex flex-col gap-2">
					<div class="Str flex items-center gap-2">
						<div class="StrLabel">{dictionary().db.character.fields.str.key}</div>
						<RangeInput
							value={props.slots.str}
							setValue={(value) => {
								props.onChangeRequested("str", value);
							}}
							min={1}
						/>
					</div>
					<div class="Int flex items-center gap-2">
						<div class="IntLabel">{dictionary().db.character.fields.int.key}</div>
						<RangeInput
							value={props.slots.int}
							setValue={(value) => {
								props.onChangeRequested("int", value);
							}}
							min={1}
						/>
					</div>
					<div class="Vit flex items-center gap-2">
						<div class="VitLabel">{dictionary().db.character.fields.vit.key}</div>
						<RangeInput
							value={props.slots.vit}
							setValue={(value) => {
								props.onChangeRequested("vit", value);
							}}
							min={1}
						/>
					</div>
					<div class="Agi flex items-center gap-2">
						<div class="AgiLabel">{dictionary().db.character.fields.agi.key}</div>
						<RangeInput
							value={props.slots.agi}
							setValue={(value) => {
								props.onChangeRequested("agi", value);
							}}
							min={1}
						/>
					</div>
					<div class="Dex flex items-center gap-2">
						<div class="DexLabel">{dictionary().db.character.fields.dex.key}</div>
						<RangeInput
							value={props.slots.dex}
							setValue={(value) => {
								props.onChangeRequested("dex", value);
							}}
							min={1}
						/>
					</div>
				</div>
			</div>
			<div class="PersonalityType flex flex-col gap-2">
				<div class="PersonalityTypeLabel">{dictionary().db.character.fields.personalityType.key}</div>
				<Select
					value={props.slots.personalityType}
					setValue={(value) => {
						props.onChangeRequested("personalityType", value as CharacterPersonalityType);
					}}
					options={[
						{
							label: dictionary().db.character.fields.personalityType.enumMap.None,
							value: "None",
						},
						{ label: dictionary().db.character.fields.personalityType.enumMap.Luk, value: "Luk" },
						{ label: dictionary().db.character.fields.personalityType.enumMap.Cri, value: "Cri" },
						{ label: dictionary().db.character.fields.personalityType.enumMap.Tec, value: "Tec" },
						{ label: dictionary().db.character.fields.personalityType.enumMap.Men, value: "Men" },
					]}
				/>
			</div>
			<div class="PersonalityValue flex flex-col gap-2">
				<div class="PersonalityValueLabel">{dictionary().db.character.fields.personalityValue.key}</div>
				<RangeInput
					value={props.slots.personalityValue}
					setValue={(value) => {
						props.onChangeRequested("personalityValue", value);
					}}
					min={1}
					max={255}
					showSlider={false}
				/>
			</div>
		</div>
	);
}
