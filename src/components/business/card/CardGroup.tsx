/**
 * 卡片组组件
 *
 * 用于展示DB内的数据，card是特化的dialog
 */

import { repositoryMethods } from "@db/generated/repositories";
import { type DB, DBSchema } from "@db/generated/zod/index";
import { createEffect, createMemo, createResource, createSignal, Index, JSX, on, Show } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { DATA_CONFIG, type DataConfig } from "~/components/business/data-config";
import { Icons } from "~/components/icons";
import { type Store, setStore, store } from "~/store";
import { Card } from "./Card";
import { DBdataRenderer } from "./DBdataRenderer";

const cardDataCache = new Map<string, any>();

/**
 * 获取单个卡片数据，带临时缓存
 */
async function getCardData(type: keyof DB, id: string, forceRefresh: boolean = false) {
	const key = `${type}-${id}`;
	if (!forceRefresh && cardDataCache.has(key)) {
		return cardDataCache.get(key);
	}
	const data = await repositoryMethods[type].select?.(id);
	cardDataCache.set(key, data);
	return data;
}

/**
 * 获取卡片组数据，批量带缓存
 */
async function getCardDatas(cardGroup: Store["pages"]["cardGroup"], forceRefresh: boolean = false): Promise<any[]> {
	return await Promise.all(cardGroup.map(({ type, id }) => getCardData(type, id, forceRefresh)));
}

export const CardGroup = () => {
	const [cachedCardDatas] = createResource(
		() => store.pages.cardGroup.length, // 不添加length的话，似乎不会追踪到素组元素新增，只会追踪数组本身是否变化
		() => {
			return getCardDatas(store.pages.cardGroup);
		},
	);

	return (
		<Presence exitBeforeEnter>
			<Show when={cachedCardDatas()?.length}>
				<Motion.div
					animate={{ transform: ["scale(1.05)", "scale(1)"], opacity: [0, 1] }}
					exit={{ transform: ["scale(1)", "scale(1.05)"], opacity: [1, 0] }}
					transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
					class={`DialogBG bg-primary-color-10 fixed top-0 left-0 z-40 grid h-dvh w-dvw transform place-items-center backdrop-blur`}
					onClick={() => setStore("pages", "cardGroup", (pre) => pre.slice(0, -1))}
				>
					<Index each={cachedCardDatas()}>
						{(cardData, index) => {
							console.log("cardData", cardData());
							const cardGroupItem = store.pages.cardGroup[index];
							return (
								<Card
									display={cachedCardDatas()!.length - index < 5}
									index={index}
									total={cachedCardDatas()!.length}
									titleIcon={<Icons.Spirits iconName={cardGroupItem.type} />}
									// title={dictionary().db[cardGroupItem.type].selfName + "-" + (cardData()?.name ?? "")}
									title={cardData()?.name ?? ""}
								>
									<Show when={cardData()} fallback={<pre>{JSON.stringify(cardData(), null, 2)}</pre>}>
										{(cardData) => {
											const config = DATA_CONFIG[cardGroupItem.type];
											return (
												<DBdataRenderer
													tableName={cardGroupItem.type}
													data={cardData()}
													dataSchema={DBSchema[cardGroupItem.type]}
													// @ts-expect-error 动态类型导致的类型推断问题：hiddenFields
													hiddenFields={config?.card.hiddenFields}
													// @ts-expect-error 动态类型导致的类型推断问题：fieldGroupMap
													fieldGroupMap={config?.fieldGroupMap}
													fieldGenerator={config?.card.fieldGenerator}
													// @ts-expect-error 函数逆变性问题：after
													after={config?.card.after}
													// @ts-expect-error 函数逆变性问题：before
													before={config?.card.before}
												/>
											);
										}}
									</Show>
								</Card>
							);
						}}
					</Index>
				</Motion.div>
			</Show>
		</Presence>
	);
};
