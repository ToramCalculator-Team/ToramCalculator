import { createSignal, JSX, onCleanup, onMount, Show } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { useMedia } from "~/lib/contexts/Media-component";
import { store } from "~/store";

export function Sheet(props: { children: JSX.Element; state: boolean; setState: (state: boolean) => void }) {
  const handleClose = (): void => {
    props.setState(false);
  };

  const media = useMedia();

  onMount(() => {
    console.log("--SheetBox render");
  });

  onCleanup(() => {
    console.log("--SheetBox cleanup");
  });

  return (
    <Presence exitBeforeEnter>
      <Show when={props.state}>
        <Motion.div
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
          class={`SheetBox bg-primary-color-90 fixed flex top-0 left-0 w-dvw h-dvh z-50 opacity-0`}
        >
          <div class="SheetBg bg-area-color flex h-full w-full flex-col justify-center landscape:flex-row">
            <div class={`SheetCloseBtn block flex-1 cursor-pointer backdrop-blur-xl`} onClick={handleClose}></div>
            <Motion.div
              animate={{
                transform: [media.orientation === "landscape" ? "translateX(10%)" : "translateY(5%)", "translateY(0)"],
                filter: ["blur(12px)", "blur(0px)"],
              }}
              exit={{
                transform: ["translateY(0)", media.orientation === "landscape" ? "translateX(10%)" : "translateY(5%)"],
                filter: ["blur(0px)", "blur(12px)"],
              }}
              transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
              class={`SheetContent bg-primary-color shadow-dividing-color shadow-dialog flex flex-col items-center overflow-y-auto portrait:max-h-[90vh] portrait:rounded-t-[12px] landscape:basis-4/5`}
            >
              {props.children}
            </Motion.div>
            <div class={`SheetCloseBtn hidden flex-1 cursor-pointer backdrop-blur-xl`} onClick={handleClose}></div>
          </div>
        </Motion.div>
      </Show>
    </Presence>
  );
}
