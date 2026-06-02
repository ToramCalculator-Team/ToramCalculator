import { createSignal } from "solid-js";

/**
 * card 与 form 是仅有的两个顶层浮层组，它们之间只存在「谁在上」这一个相对关系。
 * 因此不需要无限自增的 z-index，只需用本信号在两个固定层级（z-stack / z-stack-top）间切换：
 * 最近发生新增的组用 z-stack-top 上浮，另一组保持 z-stack。
 */
export type TopGroup = "card" | "form";

const [topGroup, setTopGroup] = createSignal<TopGroup>("card");

export { topGroup, setTopGroup };
