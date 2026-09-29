import { type Component, createEffect, type JSX, onCleanup, Show } from "solid-js";

export type MenuProps = {
	anchorEl?: HTMLElement | null;
	open: boolean;
	onClose: () => void;
	children?: JSX.Element;
	class?: string;
};

const Menu: Component<MenuProps> = (props) => {
	let menuRef: HTMLDivElement | undefined;

	// 点击外部关闭菜单
	const handleClickOutside = (event: MouseEvent) => {
		if (
			props.open &&
			menuRef &&
			!menuRef.contains(event.target as Node) &&
			props.anchorEl &&
			!props.anchorEl.contains(event.target as Node)
		) {
			props.onClose();
		}
	};

	createEffect(() => {
		if (props.open) document.addEventListener("mousedown", handleClickOutside);
		else document.removeEventListener("mousedown", handleClickOutside);
	});

	onCleanup(() => {
		document.removeEventListener("mousedown", handleClickOutside);
	});

	return (
		<Show when={props.open}>
			<div
				ref={menuRef}
				class={`absolute left-0 top-full z-50 mt-1 min-w-[320px] max-w-[calc(100vw-16px)] max-h-[90vh] overflow-y-auto rounded border border-dividing-color bg-primary-color shadow-lg ${props.class || ""}`}
				role="menu"
			>
				{props.children}
			</div>
		</Show>
	);
};

export { Menu };
