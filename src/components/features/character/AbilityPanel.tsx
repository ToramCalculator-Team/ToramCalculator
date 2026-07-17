import type { CharacterPersonalityType } from "@db/schema/enums";
import { RangeInput } from "~/components/controls/range";
import { Select } from "~/components/controls/select";
import { useDictionary } from "~/contexts/Dictionary";
import type { CharacterNumericField } from "~/features/character/edit/characterEditProtocol";
import { normalizeCharacterNumericValue } from "~/features/character/edit/characterNumericRules";

type AbilityPanelProps = {
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
	onNumericSetRequested: (field: CharacterNumericField, value: number) => void;
	onNumericAdjustRequested: (field: CharacterNumericField, delta: -1 | 1) => void;
	onPersonalityTypeSetRequested: (value: CharacterPersonalityType) => void;
};

export function AbilityPanel(props: AbilityPanelProps) {
	const dictionary = useDictionary();
	const setNumericValue = (field: CharacterNumericField, value: number) => {
		props.onNumericSetRequested(field, normalizeCharacterNumericValue(field, value, props.slots.personalityType));
	};
	return (
		<div class="AbilityConfig flex flex-col gap-2">
			<div class="Level flex flex-col gap-2">
				<div class="LevelLabel">{dictionary().db.character.fields.lv.key}</div>
				<RangeInput
					value={props.slots.lv}
					setValue={(value) => setNumericValue("lv", value)}
					adjustValue={(delta) => props.onNumericAdjustRequested("lv", delta)}
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
							setValue={(value) => setNumericValue("str", value)}
							adjustValue={(delta) => props.onNumericAdjustRequested("str", delta)}
							min={1}
						/>
					</div>
					<div class="Int flex items-center gap-2">
						<div class="IntLabel">{dictionary().db.character.fields.int.key}</div>
						<RangeInput
							value={props.slots.int}
							setValue={(value) => setNumericValue("int", value)}
							adjustValue={(delta) => props.onNumericAdjustRequested("int", delta)}
							min={1}
						/>
					</div>
					<div class="Vit flex items-center gap-2">
						<div class="VitLabel">{dictionary().db.character.fields.vit.key}</div>
						<RangeInput
							value={props.slots.vit}
							setValue={(value) => setNumericValue("vit", value)}
							adjustValue={(delta) => props.onNumericAdjustRequested("vit", delta)}
							min={1}
						/>
					</div>
					<div class="Agi flex items-center gap-2">
						<div class="AgiLabel">{dictionary().db.character.fields.agi.key}</div>
						<RangeInput
							value={props.slots.agi}
							setValue={(value) => setNumericValue("agi", value)}
							adjustValue={(delta) => props.onNumericAdjustRequested("agi", delta)}
							min={1}
						/>
					</div>
					<div class="Dex flex items-center gap-2">
						<div class="DexLabel">{dictionary().db.character.fields.dex.key}</div>
						<RangeInput
							value={props.slots.dex}
							setValue={(value) => setNumericValue("dex", value)}
							adjustValue={(delta) => props.onNumericAdjustRequested("dex", delta)}
							min={1}
						/>
					</div>
				</div>
			</div>
			<div class="PersonalityType flex flex-col gap-2">
				<div class="PersonalityTypeLabel">{dictionary().db.character.fields.personalityType.key}</div>
				<Select
					value={props.slots.personalityType}
					setValue={(value) => props.onPersonalityTypeSetRequested(value as CharacterPersonalityType)}
					options={[
						{ label: dictionary().db.character.fields.personalityType.enumMap.None, value: "None" },
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
					setValue={(value) => setNumericValue("personalityValue", value)}
					adjustValue={(delta) => props.onNumericAdjustRequested("personalityValue", delta)}
					min={props.slots.personalityType === "None" ? 0 : 1}
					max={props.slots.personalityType === "None" ? 0 : 255}
					disabled={props.slots.personalityType === "None"}
					showSlider={false}
				/>
			</div>
		</div>
	);
}
