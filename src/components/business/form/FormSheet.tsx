import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { createEffect, createSignal, type JSX, on, onCleanup, onMount, Show } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { useMedia } from "~/lib/contexts/Media-component";
import { setStore, store } from "~/store";

export interface FormSheetProps {
	display: boolean;
	index: number;
	total: number;
	children: JSX.Element;
}

export function FormSheet(props: FormSheetProps) {
	const media = useMedia();
	// 计算偏移级别
	const [offsetLevel, setOffsetLevel] = createSignal(0);

	// 缓存创建时的index
	const { index: initialIndex } = props;

	createEffect(
		on(
			() => props.total,
			() => {
				setOffsetLevel(props.total - props.index - 1);
			},
		),
	);

	onMount(() => {
		console.log("--SheetBox render");
	});

	onCleanup(() => {
		console.log("--SheetBox cleanup");
	});

	return (
		<Presence exitBeforeEnter>
			<Show when={store.pages.formGroup.length >= initialIndex}>
				<Motion.div
					animate={{ opacity: [0, 1] }}
					exit={{ opacity: [1, 0] }}
					transition={{
						duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0,
					}}
					class={`SheetBG bg-primary-color-30 backdrop-blur fixed top-0 left-0 h-dvh w-dvw`}
					onClick={(e) => {
						e.stopPropagation();
						// 由于此处直接删除store内容，上层也没有缓存处理，上层的Index会直接剔除数据，导致目前的退出动画全部无效
						setStore("pages", "formGroup", (pre) => pre.slice(0, -1));
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
