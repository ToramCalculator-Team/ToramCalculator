import { useNavigate } from "@solidjs/router";
import { createMemo, Show } from "solid-js";
import { Button } from "~/components/controls/button";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";
import { createCharacter } from "./createCharacter";

export default function CreateCharacterPage() {
	// UI文本字典
	const dictionary = createMemo(() => getDictionary(store.settings.userInterface.language));

	const navigate = useNavigate();

	return (
		<div class="flex h-full w-full flex-col gap-3 p-6">
			<Button
				class="h-full w-full border-2 border-dashed"
				onClick={async () => {
					const character = await createCharacter();
					navigate(`/character/${character.id}`);
				}}
			>
				{dictionary().ui.actions.create}
				<Show when={!store.session.user?.id}>在本地</Show>
			</Button>
			<Show when={!store.session.user?.id}>
				<Button
					class="h-full w-full border-2 border-dashed"
					onClick={() => {
						setStore("pages", "loginDialogState", true);
					}}
				>
					{dictionary().ui.actions.logIn}
				</Button>
			</Show>
		</div>
	);
}
