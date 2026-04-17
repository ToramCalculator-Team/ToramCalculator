/**
 * 卡片组组件
 *
 * 用于展示DB内的数据，card是特化的dialog
 */

import { type DB, DBSchema } from "@db/generated/zod/index";
import {  Index, Show } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { DATA_CONFIG } from "~/components/business/data-config";
import { Icons } from "~/components/icons";
import { setStore, store } from "~/store";
import { Card } from "./Card";
import { DataRenderer } from "./DataRenderer";

export const CardGroup = () => {
	return (
		<Presence exitBeforeEnter>
			<Show when={store.pages.cardGroup.length > 0}>
				<Motion.div
					animate={{ transform: ["scale(1.05)", "scale(1)"], opacity: [0, 1] }}
					exit={{ transform: ["scale(1)", "scale(1.05)"], opacity: [1, 0] }}
					transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
					class={`DialogBG bg-primary-color-10 fixed top-0 left-0 z-50 grid h-dvh w-dvw transform place-items-center backdrop-blur`}
					onClick={() => setStore("pages", "cardGroup", (pre) => pre.slice(0, -1))}
				>
					<Index each={store.pages.cardGroup}>
						{(cardData, index) => {
							const cardGroupItem = store.pages.cardGroup[index];
							const config = DATA_CONFIG[cardGroupItem.type];
							const data = cardData().data as DB[typeof cardGroupItem.type];
							return (
								<Card
									display={store.pages.cardGroup.length - index < 5}
									index={index}
									total={store.pages.cardGroup.length}
									titleIcon={<Icons.Spirits iconName={cardGroupItem.type} />}
									title={(cardGroupItem.data.name as string) ?? ""}
								>
									<Show when={config} fallback={<pre>{JSON.stringify(cardGroupItem.data, null, 2)}</pre>}>
										{(config) => {
											return (
												<DataRenderer
													primaryKey={config().primaryKey}
													dictionary={config().dictionary}
													deleteCallback={config().card.deleteCallback}
													openEditor={config().card.openEditor}
													editAbleCallback={config().card.editAbleCallback}
													tableName={cardGroupItem.type}
													data={data}
													dataSchema={config().dataSchema}
													hiddenFields={config().card.hiddenFields}
													fieldGroupMap={config().fieldGroupMap}
													fieldGenerator={config().card.fieldGenerator}
													after={config().card.after}
													before={config().card.before}
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
