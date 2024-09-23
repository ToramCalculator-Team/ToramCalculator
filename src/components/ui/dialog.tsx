import { JSX, onMount, Show } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { store } from "~/store";

export default function Dialog(props: { children: JSX.Element; state: boolean; setState: (state: boolean) => void }) {
  const { children } = props;

  const handleClose = (): void => {
    props.setState(false);
  };

  onMount(() => {
    console.log("--DialogBox render");
    return () => {
      console.log("--DialogBox unmount");
    };
  });

  return (
    <Presence exitBeforeEnter>
      <Show when={props.state}>
        <Motion.div
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
          class={`DialogBox fixed left-0 top-0 z-50 flex h-dvh w-dvw bg-primary-color-90 opacity-0`}
        >
          <div class="DialogCloseBtn flex-1 cursor-pointer" onClick={handleClose}></div>
          <Motion.div
            animate={{ transform: "translateX(0)" }}
            exit={{ transform: "translateX(2.5rem)" }}
            transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
            class={`DialogContent flex w-full max-h-[100dvh] min-h-[40dvh] max-w-[100dvw] basis-4/5 flex-col items-center overflow-y-auto bg-primary-color shadow-2xl shadow-transition-color-20 lg:translate-x-10`}
          >
            {children}
          </Motion.div>
          {/* <div class="DialogCloseBtn flex-1 cursor-pointer" onClick={handleClose}></div> */}
        </Motion.div>
      </Show>
    </Presence>
  );
}
