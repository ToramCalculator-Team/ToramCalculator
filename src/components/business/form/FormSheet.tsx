import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { type JSX, onCleanup, onMount, Show } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { useMedia } from "~/lib/contexts/Media-component";
import { store } from "~/store";

export interface FormSheetProps {
	display: boolean;
	index: number;
	total: number;
	children: JSX.Element;
}

export function FormSheet(props: FormSheetProps) {
	const media = useMedia();

	onMount(() => {
		console.log("--SheetBox render");
	});

	onCleanup(() => {
		console.log("--SheetBox cleanup");
	});

	return (
		<Presence exitBeforeEnter>
			<Show when={props.display}>
				<Motion.div
					animate={{
						transform: [media.orientation === "landscape" ? "translateX(10%)" : "translateY(5%)", "translateY(0)"],
						filter: ["blur(12px)", "blur(0px)"],
					}}
					exit={{
						transform: ["translateY(0)", media.orientation === "landscape" ? "translateX(10%)" : "translateY(5%)"],
						filter: ["blur(0px)", "blur(12px)"],
					}}
					transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
					class={`SheetContent bg-primary-color shadow-dividing-color shadow-dialog flex flex-col items-center overflow-y-auto portrait:max-h-[90vh] portrait:rounded-t-[12px] landscape:basis-4/5`}
					style={{
						"z-index": props.index,
					}}
					onClick={(e) => e.stopPropagation()}
				>
					{/* 滚动内容区域 */}
					<OverlayScrollbarsComponent
						element="div"
						options={{ scrollbars: { autoHide: "scroll" } }}
						class="h-full w-full flex-1"
					>
						<div class="Children flex flex-col gap-3">{props.children}</div>
					</OverlayScrollbarsComponent>
				</Motion.div>
			</Show>
		</Presence>
	);
}
