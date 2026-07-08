import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { type JSX, Show } from "solid-js";
import { Frame } from "./frame";

export function Dialog(props: {
	children: JSX.Element;
	title?: string;
	titleIcon?: () => JSX.Element;
	maxWith?: string;
	onEscape?: () => void;
}) {
	return (
		<div
			role="application"
			class="DialogBox bg-primary-color shadow-dividing-color shadow-dialog relative flex w-full h-full flex-col items-center gap-3 rounded p-2"
			style={{ "max-width": props.maxWith }}
			onClick={(e) => e.stopPropagation()}
			onKeyDown={(e) => {
				if (e.key === "Escape") props.onEscape?.();
			}}
		>
			<Show when={props.title}>
				<div class="DialogTitle z-10 drop-shadow-dividing-color absolute -top-3 flex items-center drop-shadow-xl">
					<svg width="30" height="48" viewBox="0 0 30 48" fill="none" xmlns="http://www.w3.org/2000/svg">
						<title>Dialog Title Decorate</title>
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
						<title>Dialog Title Decorate</title>
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
			<Frame>
				<OverlayScrollbarsComponent
					element="div"
					options={{ scrollbars: { autoHide: "scroll" } }}
					class="w-full h-full flex-1 rounded border-8 border-primary-color"
				>
					<div class="Childern flex flex-col gap-3 mx-3 my-6">{props.children}</div>
				</OverlayScrollbarsComponent>
			</Frame>
		</div>
	);
}
