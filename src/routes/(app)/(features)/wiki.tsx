import { onCleanup, onMount, type ParentProps } from "solid-js";
import { Motion } from "solid-motionone";
import { store } from "~/store";

export default function WikiPage(props: ParentProps) {

	onMount(() => {
		console.log("--WikiPage Render");
	});

	onCleanup(() => {
		console.log("--WikiPage Unmount");
	});

	return (
		<Motion.div
			animate={{ opacity: [0, 1] }}
			transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0 }}
			id="WikiContainer"
			class="WikiContainer relative flex h-full w-full flex-col"
		>
			{props.children}
		</Motion.div>
	);
}
