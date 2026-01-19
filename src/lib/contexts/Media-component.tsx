import { onCleanup, onMount, type ParentProps, useContext } from "solid-js";
import { createStore } from "solid-js/store";
import { MediaContext, type MediaData } from "./Media";

// 创建 Provider 组件
export function MediaProvider(props: ParentProps) {
	const orientationQuery = window.matchMedia("(orientation: landscape)");
	const [media, setMedia] = createStore<MediaData>({
		width: window.innerWidth,
		height: window.innerHeight,
		orientation: orientationQuery.matches ? "landscape" : "portrait",
	});

	const updateMediaSize = () => {
		setMedia("width", window.innerWidth);
		setMedia("height", window.innerHeight);
	};

	const updateMediaOrientation = (e: MediaQueryListEvent) => {
		if (e.matches) {
			console.log("方向变化至横屏");
			setMedia("orientation", "landscape");
		} else {
			console.log("方向变化至竖屏");
			setMedia("orientation", "portrait");
		}
	};

	onMount(() => {
		orientationQuery.addEventListener("change", updateMediaOrientation);
		window.addEventListener("resize", updateMediaSize);
	});

	onCleanup(() => {
		orientationQuery.removeEventListener("change", updateMediaOrientation);
		window.removeEventListener("resize", updateMediaSize);
	});

	return <MediaContext.Provider value={media}>{props.children}</MediaContext.Provider>;
}

// 创建自定义 hook 来使用这个 context
export function useMedia() {
	const context = useContext(MediaContext);
	if (!context) {
		throw new Error("useMedia must be used within an MediaProvider");
	}
	return context;
}
