import { useNavigate } from "@solidjs/router";
import { onCleanup, onMount } from "solid-js";
import { hydrateSessionAccountStore } from "~/session/sessionAccountStore";
import { store } from "~/store";

// 此页面仅作为中转

export default function CharacterIndexPage() {
	// 导航
	const navigate = useNavigate();
	let disposed = false;
	let retryTimer: ReturnType<typeof setTimeout> | undefined;

	const redirectBySessionContext = async (remainingRetries = 8) => {
		const activeCharacterId = store.session.account.player?.character?.id;
		if (activeCharacterId) {
			navigate(`/character/${activeCharacterId}`);
			return;
		}

		const accountId = store.session.account.id;
		if (!accountId) {
			navigate("/character/create");
			return;
		}

		const context = await hydrateSessionAccountStore({
			id: accountId,
			type: store.session.account.type,
		});
		if (disposed) return;
		// 设计说明：账号本地行未就绪时保留中转页，避免把同步延迟误判成无角色。
		if (!context) {
			if (remainingRetries > 0) {
				retryTimer = setTimeout(() => {
					void redirectBySessionContext(remainingRetries - 1);
				}, 250);
			}
			return;
		}

		if (context.character?.id) {
			navigate(`/character/${context.character.id}`);
			return;
		}
		navigate("/character/create");
	};

	onMount(() => {
		console.log("--CharacterIndexPage Render");
		void redirectBySessionContext();
	});

	onCleanup(() => {
		disposed = true;
		if (retryTimer) clearTimeout(retryTimer);
		console.log("--CharacterIndexPage Unmount");
	});

	return null;
}
