import { useNavigate } from "@solidjs/router";
import { onMount, type ParentProps, Show } from "solid-js";
import { setStore, store } from "~/store";

// 此页面仅作为中转

export default function CharacterIndexPage(props: ParentProps) {
	// 导航
	const navigate = useNavigate();

	if (store.session.account.player?.character?.id) {
		navigate(`/character/${store.session.account.player?.character?.id}`);
	} else {
		navigate(`/character/create`);
	}

	onMount(() => {
		console.log("--CharacterIndexPage Render");

		return () => {
			console.log("--CharacterIndexPage Unmount");
		};
	});

	return <></>;
}
