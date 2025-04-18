import { createSignal, JSX, onCleanup, onMount, Show } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { store } from "~/store";

export default function Dialog(props: { children: JSX.Element; state: boolean; setState: (state: boolean) => void }) {
  const handleClose = (): void => {
    props.setState(false);
  };

  const [isLandscape, setisLandscape] = createSignal(window.innerWidth > window.innerHeight);
  const landscapeQuery = window.matchMedia("(orientation: landscape)");

  landscapeQuery.addEventListener("change", (e) => {
    if (e.matches) {
      setisLandscape(true);
    } else {
      setisLandscape(false);
    }
  });

  onMount(() => {
    console.log("--DialogBox render");
  });

  onCleanup(() => {
    console.log("--DialogBox cleanup");
  });

  return (
    <Presence exitBeforeEnter>
      <Show when={props.state}>
        <Motion.div
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
          class={`DialogBox bg-primary-color-90 fixed top-0 left-0 z-50 flex h-dvh w-dvw flex-col justify-center opacity-0 landscape:flex-row`}
        >
          <div class={`DialogCloseBtn bg-area-color backdrop-blur-xl block flex-1 cursor-pointer portrait:hidden`} onClick={handleClose}></div>
          <Motion.div
            animate={{
              transform: [isLandscape() ? "translateX(10%)" : "translateY(5%)", "translateY(0)"],
              filter: ["blur(12px)", "blur(0px)"],
            }}
            exit={{
              transform: ["translateY(0)", isLandscape() ? "translateX(10%)" : "translateY(5%)"],
              filter: ["blur(0px)", "blur(12px)"],
            }}
            transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
            class={`DialogContent bg-primary-color shadow-dividing-color flex basis-[90%] flex-col items-center overflow-y-auto shadow-2xl landscape:h-dvh landscape:basis-4/5`}
          >
            {props.children}
          </Motion.div>
          <div class={`DialogCloseBtn bg-area-color backdrop-blur-xl block flex-1 cursor-pointer landscape:hidden`} onClick={handleClose}></div>
        </Motion.div>
      </Show>
    </Presence>
  );
}
