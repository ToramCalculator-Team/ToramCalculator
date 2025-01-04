import { ParentProps, Show } from "solid-js";
import { Motion } from "solid-motionone";
import { store } from "~/store";
import Setting from "~/components/module/setting-page";
import BabylonBg from "~/components/module/test2";
import RandomBallBackground from "~/components/module/randomBallBg";

export default function AppMainContet(props: ParentProps) {
  return (
    <>
      <Show when={store.settings.userInterface.is3DbackgroundDisabled}>
        <BabylonBg />
      </Show>
      <RandomBallBackground />
      <Motion.div
        id="AppMainContet"
        class={`h-dvh w-dvw overflow-hidden ${store.settingsDialogState ? "scale-[95%] blur-sm opacity-0" : "scale-100 blur-0 opacity-100"}`}
      >
        {props.children}
      </Motion.div>
      <Setting />
    </>
  );
}
