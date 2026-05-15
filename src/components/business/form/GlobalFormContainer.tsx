import { For, Show } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { store } from "~/store";
import { FormSheet } from "./FormSheet";
import { type GlobalFormEntryApi, globalFormGroup } from "./globalFormGroup";

export function GlobalFormContainer() {
	return (
		<Presence exitBeforeEnter>
			<Show when={globalFormGroup.entries().length > 0}>
				<Motion.div
					animate={{ opacity: [0, 1] }}
					exit={{ opacity: [1, 0] }}
					transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
					class="GlobalFormContainer pointer-events-none fixed top-0 left-0 z-50 h-dvh w-dvw"
				>
					<For each={globalFormGroup.entries()}>
						{(entry, index) => {
							/**
							 * 设计说明：api 只暴露容器控制能力，表单内容和提交行为由 entry.render 所在场景决定。
							 */
							const api: GlobalFormEntryApi = {
								get id() {
									return entry.id;
								},
								get index() {
									return index();
								},
								get total() {
									return globalFormGroup.size();
								},
								close: () => globalFormGroup.remove(entry.id),
								closeTop: () => globalFormGroup.remove(),
							};

							return (
								<FormSheet
									display={!entry.isClosing}
									index={index()}
									total={globalFormGroup.size()}
									onClose={api.closeTop}
									onExitComplete={() => globalFormGroup.commitRemoval(entry.id)}
								>
									{entry.render(api)}
								</FormSheet>
							);
						}}
					</For>
				</Motion.div>
			</Show>
		</Presence>
	);
}
