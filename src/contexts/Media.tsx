import { createContext } from "solid-js";

export type MediaData = {
	width: number;
	height: number;
	orientation: "portrait" | "landscape";
};

export const MediaContext = createContext<MediaData>({
	width: 1920,
	height: 945,
	orientation: "landscape",
});
