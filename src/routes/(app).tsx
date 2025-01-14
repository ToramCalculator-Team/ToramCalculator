import { ParentProps, Show } from "solid-js";
import { Motion } from "solid-motionone";
import { store } from "~/store";
import Setting from "~/components/module/setting-page";
// import BabylonBg from "~/components/module/test2";
import RandomBallBackground from "~/components/module/randomBallBg";

export default function AppMainContet(props: ParentProps) {
  // pwa安装提示
  let deferredPrompt;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log("beforeinstallprompt");
  });

  return (
    <>
      {/* <Show when={store.settings.userInterface.is3DbackgroundDisabled}>
        <BabylonBg />
      </Show> */}
      <RandomBallBackground />
      <Motion.div
        id="AppMainContet"
        class={`h-dvh w-dvw overflow-hidden ${store.settingsDialogState ? "scale-[95%] opacity-0 blur-sm" : "scale-100 opacity-100 blur-0"}`}
      >
        {props.children}
      </Motion.div>
      <Setting />
    </>
  );
}
