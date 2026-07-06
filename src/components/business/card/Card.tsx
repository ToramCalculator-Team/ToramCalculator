/**
 * 卡片组件
 * 是特化的dialog，用于展示单个数据
 */

import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { createEffect, createSignal, type JSX, on, Show } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { Frame } from "~/components/containers/frame";
import { store } from "~/store";


interface CardProps {
	title: string;
	titleIcon?: () => JSX.Element;
	index: number;
	total: number;
	children: JSX.Element;
	display: boolean;
	closing?: boolean;
	onExitComplete?: () => void;
}

export const Card = (props: CardProps) => {
	// 旋转角度与交错延迟
	const targetRotation = () => (props.total - props.index - 1) * 2;
	const [staggerDelay, setStaggerDelay] = createSignal(0);

	let prevTotal: number | undefined;
	createEffect(
		on(
			() => props.total,
			(total) => {
				if (prevTotal !== undefined && total < prevTotal) {
					// 卡片被关闭，按从顶到底的顺序交错响应
					setStaggerDelay((total - 1 - props.index) * 0.15);
				} else {
					setStaggerDelay(0);
				}
				prevTotal = total;
			},
		),
	);

	return (
		<Presence exitBeforeEnter>
			<Show when={props.display && !props.closing}>
				<Motion.div
					initial={{ transform: "rotate(0deg)", opacity: 0 }}
					animate={{ transform: `rotate(${targetRotation()}deg)`, opacity: 1 }}
					exit={{ transform: "rotate(0deg)", opacity: 0 }}
					transition={{
						duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0,
						delay: staggerDelay(),
					}}
					onMotionComplete={() => {
						if (props.closing) props.onExitComplete?.();
					}}
					class={`Card drop-shadow-dividing-color bg-primary-color fixed top-1/2 left-1/2 z-10 flex h-[70vh] w-full max-w-[90vw] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 rounded p-2 drop-shadow-2xl lg:max-w-240`}
					style={{
						"z-index": props.index,
					}}
					onClick={(e) => e.stopPropagation()}
				>
					{/* 标题栏 */}
					<Show when={props.title}>
						<div class="CardTitle drop-shadow-dividing-color absolute -top-3 z-10 flex items-center drop-shadow-xl">
							<svg width="30" height="48" viewBox="0 0 30 48" fill="none" xmlns="http://www.w3.org/2000/svg">
								<title>Card Decorate</title>
								<path
									d="M13.8958 -6.07406e-07L-1.04907e-06 24L13.8958 48L29 48L29 -1.26763e-06L13.8958 -6.07406e-07Z"
									fill="rgb(var(--primary))"
								/>
								<path d="M19 6.99999L9 24L19 41L29 41L29 6.99999L19 6.99999Z" fill="currentColor" />
								<path
									d="M29.5 3.49999L29.5 44.5L16.2109 44.5L16.0664 44.249L4.56641 24.249L4.42285 24L4.56641 23.751L16.0664 3.75097L16.2109 3.49999L29.5 3.49999Z"
									stroke="currentColor"
									stroke-opacity="0.55"
								/>
							</svg>

							<div class="bg-primary-color z-10 -mx-px py-0.75">
								<div class="border-boundary-color flex items-center border-y py-0.75">
									<Show when={props.titleIcon}>
										<div class="TitleIcon bg-accent-color flex items-center w-8.5 h-8.5">{props.titleIcon?.()}</div>
									</Show>
									<h1 class="text-primary-color bg-accent-color py-0.75 text-xl font-bold">{props.title}</h1>
								</div>
							</div>
							<svg width="30" height="48" viewBox="0 0 30 48" fill="none" xmlns="http://www.w3.org/2000/svg">
								<title>Card Decorate</title>
								<path
									d="M16.1042 -6.07406e-07L30 24L16.1042 48L0.999998 48L1 -1.26763e-06L16.1042 -6.07406e-07Z"
									fill="rgb(var(--primary))"
								/>
								<path
									d="M0.500063 3.49999L0.500061 44.5L13.7891 44.5L13.9337 44.249L25.4337 24.249L25.5772 24L25.4337 23.751L13.9337 3.75097L13.7891 3.49999L0.500063 3.49999Z"
									stroke="currentColor"
									stroke-opacity="0.55"
								/>
								<path d="M11 6.99999L21 24L11 41L1.00003 41L1.00003 6.99999L11 6.99999Z" fill="currentColor" />
							</svg>
						</div>
					</Show>


					<Frame >
						<OverlayScrollbarsComponent
							element="div"
							options={{ scrollbars: { autoHide: "scroll" } }}
							class="w-full h-full flex-1 rounded border-8 border-primary-color"
						>
							<div class="Childern flex flex-col gap-3 mx-3 my-6">{props.children}</div>
						</OverlayScrollbarsComponent>
					</Frame>
				</Motion.div>
			</Show>
		</Presence>
	);
};
