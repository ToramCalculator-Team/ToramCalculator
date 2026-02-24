import type { JSX } from "solid-js";
import { Portal, Show } from "solid-js/web";
import { Motion, Presence } from "solid-motionone";
import { store } from "~/store";
import { Button } from "../controls/button";

export const BtEditorWrapper: (props:{title: string, children: JSX.Element, editorDisplay: boolean, setEditorDisplay: (editorDisplay: boolean) => void}) => JSX.Element = (props) => {
	return (
		<>
			<Button class="w-full" onClick={() => props.setEditorDisplay(true)}>{props.title}</Button>
			<Portal>
				<Presence exitBeforeEnter>
					<Show when={props.editorDisplay}>
						<Motion.div
							animate={{ transform: ["scale(1.05)", "scale(1)"], opacity: [0, 1] }}
							exit={{ transform: ["scale(1)", "scale(1.05)"], opacity: [1, 0] }}
							transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
							class={`DialogBG bg-primary-color-10 fixed top-0 left-0 z-40 grid h-dvh w-dvw transform place-items-center backdrop-blur`}
							onClick={() => props.setEditorDisplay(false)}
							style={{
								"z-index": 51,
							}}
						>
							<div
								role="application"
								class="DialogBox bg-primary-color shadow-dividing-color shadow-dialog relative flex h-[90vh] w-[90vw] flex-col items-center gap-3 rounded p-2"
								onClick={(e) => e.stopPropagation()}
								onKeyDown={(e) => {
									if (e.key === "Escape") {
										props.setEditorDisplay(false);
									}
								}}
							>
								{props.children}
							</div>
						</Motion.div>
					</Show>
				</Presence>
			</Portal>
		</>
	);
};
