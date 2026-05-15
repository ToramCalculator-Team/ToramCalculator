import { For, Show } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { store } from "~/store";
import { Card } from "./Card";
import { type GlobalCardEntryApi, globalCardGroup } from "./globalCardGroup";

export function GlobalCardContainer() {
	return (
		<Presence exitBeforeEnter>
			<Show when={globalCardGroup.entries().length > 0}>
				<Motion.div
					animate={{ transform: ["scale(1.05)", "scale(1)"], opacity: [0, 1] }}
					exit={{ transform: ["scale(1)", "scale(1.05)"], opacity: [1, 0] }}
					transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
					class="DialogBG bg-primary-color-10 pointer-events-auto fixed top-0 left-0 z-50 grid h-dvh w-dvw transform place-items-center backdrop-blur"
					onClick={() => globalCardGroup.remove()}
				>
					<For each={globalCardGroup.entries()}>
						{(entry, index) => {
							/**
							 * 设计说明：api 只暴露容器控制能力，卡片内容由 entry.render 所在场景决定。
							 */
							const api: GlobalCardEntryApi = {
								get id() {
									return entry.id;
								},
								get index() {
									return index();
								},
								get total() {
									return globalCardGroup.size();
								},
								close: () => globalCardGroup.remove(entry.id),
								closeTop: () => globalCardGroup.remove(),
							};
							const content = entry.render(api);

							return (
								<Card
									display={globalCardGroup.size() - index() < 5}
									index={index()}
									total={globalCardGroup.activeSize()}
									titleIcon={entry.titleIcon}
									title={entry.title ?? ""}
									closing={entry.closing}
									onExitComplete={() => globalCardGroup.confirmRemove(entry.id)}
								>
									{content}
								</Card>
							);
						}}
					</For>
				</Motion.div>
			</Show>
		</Presence>
	);
}
