import { createSignal, JSX, onCleanup, onMount, Show } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { store } from "~/store";

export default function Dialog(props: { children: JSX.Element; state: boolean; setState: (state: boolean) => void }) {
  const handleClose = (): void => {
    props.setState(false);
  };


  const [isPc, setIsPc] = createSignal(window.innerWidth > 1024);

  onMount(() => {
    console.log("--DialogBox render");
    window.addEventListener("resize", () => {
      setIsPc(window.innerWidth > 1024);
    })
  });

  onCleanup(() => {
    console.log("--DialogBox cleanup");
    window.removeEventListener("resize", () => {
      setIsPc(window.innerWidth > 1024);
    })
  });

  return (
    <Presence exitBeforeEnter>
      <Show when={props.state}>
        <Motion.div
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
          class={`DialogBox fixed justify-center left-0 top-0 z-50 flex flex-col lg:flex-row h-dvh w-dvw bg-primary-color-90 opacity-0`}
        >
          <div class={`DialogCloseBtn block flex-1 cursor-pointer`} onClick={handleClose}></div>
          <Motion.div
            animate={isPc() ? { transform: "translateX(0)" } : { transform: "scale(1)" }}
            exit={isPc() ? { transform: "translateX(2.5rem)" } : { transform: "scale(0.95)" }}
            transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
            class={`DialogContent flex basis-[90%] lg:h-dvh lg:basis-4/5 flex-col items-center overflow-y-auto bg-primary-color shadow-2xl shadow-dividing-color ${isPc() ? "translate-x-10" : "scale-95"}`}
          >
            {props.children}
          </Motion.div>
          {/* <div class="DialogCloseBtn flex-1 cursor-pointer" onClick={handleClose}></div> */}
        </Motion.div>
      </Show>
    </Presence>
  );
}
