import { type Accessor, createMemo, createRoot } from "solid-js";
import { getDictionary } from "~/locales/i18n";
import type { Dictionary } from "~/locales/type";
import { store } from "~/store";

// 设计目的：字典是 store.language 的纯派生值，没有需要建立的副作用或生命周期，
// 因此不需要 Provider/context——直接做成全局 memo 即可，消除一层无意义的组件包裹。
// 用 createRoot 持有这个全局响应式计算，使其在组件树之外存活且只创建一次。
let dictionaryMemo: Accessor<Dictionary> | undefined;

function getDictionaryMemo(): Accessor<Dictionary> {
	if (!dictionaryMemo) {
		dictionaryMemo = createRoot(() => createMemo(() => getDictionary(store.settings.userInterface.language)));
	}
	return dictionaryMemo;
}

/** 当前语言对应的字典（reactive accessor）。直接读全局 store，无需 Provider。 */
export function useDictionary(): Accessor<Dictionary> {
	return getDictionaryMemo();
}
