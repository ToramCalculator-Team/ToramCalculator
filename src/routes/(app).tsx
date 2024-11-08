import { ParentProps, Show } from "solid-js";
import { Motion } from "solid-motionone";
import { store } from "~/store";
import Setting from "~/components/module/setting-page";
import BabylonBg from "~/components/module/test";

export default function AppMainContet(props: ParentProps) {
  return (
    <>
      <Motion.div
        id="AppMainContet"
        class={`h-dvh w-dvw overflow-hidden ${store.settingsDialogState ? "scale-[95%] blur-sm" : "scale-100 blur-0"}`}
      >
        <Show when={store.settings.userInterface.is3DbackgroundDisabled}>
          <BabylonBg />
        </Show>
        {props.children}
      </Motion.div>
      <Setting />
    </>
  );
}
