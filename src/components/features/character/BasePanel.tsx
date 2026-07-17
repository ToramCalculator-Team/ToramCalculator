import { Input } from "~/components/controls/input";
import { useDictionary } from "~/contexts/Dictionary";
import type { CharacterFieldPatch } from "~/features/character/edit/characterEditProtocol";

export type BasePanelProps = {
	name: string;
	onPatchRequested: (patch: CharacterFieldPatch) => Promise<void> | void;
};

export function BasePanel(props: BasePanelProps) {
	const dictionary = useDictionary();

	return (
		<div class="BasicConfig flex flex-col gap-2">
			<div class="BasicConfigItem flex flex-col gap-2">
				<div class="BasicConfigItemLabel">{dictionary().ui.character.tabs.base.name}</div>
				<Input
					type="text"
					value={props.name}
					onChange={(e) => props.onPatchRequested({ name: e.target.value })}
					description="请输入角色名称"
				/>
			</div>
		</div>
	);
}
