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
    });
  });

  onCleanup(() => {
    console.log("--DialogBox cleanup");
    window.removeEventListener("resize", () => {
      setIsPc(window.innerWidth > 1024);
    });
  });

  return (
    <Presence exitBeforeEnter>
      <Show when={props.state}>
        <Motion.div
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
          class={`DialogBox bg-primary-color-90 fixed top-0 left-0 z-50 flex h-dvh w-dvw flex-col justify-center opacity-0 lg:flex-row`}
        >
          <div class={`DialogCloseBtn block flex-1 cursor-pointer`} onClick={handleClose}></div>
          <Motion.div
            animate={{ transform: [isPc() ? "translateX(10%)" : "translateY(10%)", "translateY(0)"] }}
            exit={{ transform: ["translateY(0)", isPc() ? "translateX(10%)" : "translateY(10%)"] }}
            transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
            class={`DialogContent bg-primary-color shadow-dividing-color flex basis-[90%] flex-col items-center overflow-y-auto shadow-2xl lg:h-dvh lg:basis-4/5`}
          >
            {props.children}
          </Motion.div>
          {/* <div class="DialogCloseBtn flex-1 cursor-pointer" onClick={handleClose}></div> */}
        </Motion.div>
      </Show>
    </Presence>
  );
}
