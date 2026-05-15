import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { createEffect, createSignal, type JSX, on, onCleanup, onMount, Show } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { useMedia } from "~/contexts/Media-component";
import { store } from "~/store";

export interface FormSheetProps {
	display: boolean;
	index: number;
	total: number;
	onClose: () => void;
	onExitComplete: () => void;
	children: JSX.Element;
}

export function FormSheet(props: FormSheetProps) {
	const media = useMedia();
	// 计算偏移级别
	const [offsetLevel, setOffsetLevel] = createSignal(0);

	createEffect(
		on(
			() => props.total,
			() => {
				setOffsetLevel(props.total - props.index - 1);
			},
		),
	);

	createEffect(() => {
		if (!props.display && !store.settings.userInterface.isAnimationEnabled) {
			// 设计说明：动画关闭时不等待 Motion 回调，避免关闭态 entry 留在运行时栈。
			props.onExitComplete();
		}
	});

	onMount(() => {
		console.log("--SheetBox render");
	});

	onCleanup(() => {
		console.log("--SheetBox cleanup");
	});

	return (
		<Presence exitBeforeEnter>
			{/* display 由全局容器的关闭态驱动，节点会保留到退出动画播放完再从运行时栈移除。 */}
			<Show when={props.display}>
				<Motion.div
					animate={{ opacity: [0, 1] }}
					exit={{ opacity: [1, 0] }}
					onMotionComplete={() => {
						if (!props.display) props.onExitComplete();
					}}
					transition={{
						duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0,
					}}
					class={`SheetBG bg-primary-color-30 pointer-events-auto fixed top-0 left-0 h-dvh w-dvw backdrop-blur`}
					onClick={(e) => {
						e.stopPropagation();
						props.onClose();
					}}
					style={{
						"z-index": props.index,
					}}
				>
					<Presence exitBeforeEnter>
						<Show when={props.display}>
							<Motion.div
								animate={{
									transform: [
										media.orientation === "landscape" ? "translateX(10%)" : "translateY(5%)",
										"translateY(0)",
									],
									filter: ["blur(12px)", "blur(0px)"],
								}}
								exit={{
									transform: [
										"translateY(0)",
										media.orientation === "landscape" ? "translateX(10%)" : "translateY(5%)",
									],
									filter: ["blur(0px)", "blur(12px)"],
								}}
								transition={{
									duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0,
								}}
								class={`
						SheetContent absolute bg-primary-color shadow-dividing-color shadow-dialog flex flex-col items-center overflow-y-auto 
						portrait:rounded-t-[12px] 
						portrait:bottom-0
						portrait:w-dvw
						landscape:right-0
						landscape:h-dvh
						`}
								style={{
									// transform: `translateX(-${offsetLevel() * 10}%)`,
									width: media.orientation === "landscape" ? `${offsetLevel() > 0 ? 100 : 90}vw` : "100vw",
									height: media.orientation === "landscape" ? "100vh" : `${offsetLevel() > 0 ? 100 : 90}vh`,
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
				</Motion.div>
			</Show>
		</Presence>
	);
}
