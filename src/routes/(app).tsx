import { ParentProps } from "solid-js";
import { clientOnly } from "@solidjs/start";
import { Motion } from "solid-motionone";
import { store } from "~/store";
import RandomBallBackground from "~/components/randomBallBg";

const Setting = clientOnly(() => import("~/components/setting"));

export default function AppMainContet(props: ParentProps) {
  return (
    <>
      <RandomBallBackground />
      <Motion.div
        id="AppMainContet"
        class={`h-dvh w-dvw overflow-hidden ${store.settingsDialogState ? "scale-[95%] blur-sm" : "scale-100 blur-0"}`}
      >
        {props.children}
      </Motion.div>
      <Setting />
    </>
  );
}
