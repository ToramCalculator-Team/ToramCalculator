import { createMemo, For, onMount, ParentProps, Show, useContext } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { Nav } from "~/components/features/nav";
import { setStore, store } from "~/store";

export default function ToolPage(props: ParentProps) {
  onMount(() => {
    console.log("--ToolPage Render");
  });

  return (
    <Motion.main class="flex h-full w-full flex-col-reverse landscape:flex-row">
      <Nav />
      {/* <OverlayScrollbarsComponent
        element="div"
        options={{ scrollbars: { autoHide: "scroll" } }}
        defer
        id="mainContent"
        class="z-40 h-full w-full landscape:landscape:px-12 bg-primary-color-90"
        style={{
          "transition-duration": "all 0s !important"
        }}
      > */}
      <Motion.div
        animate={{ opacity: [0, 1] }}
        transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0 }}
        id="mainContent"
        class="Content z-40 flex h-full w-full flex-col overflow-hidden"
      >
        {props.children}
      </Motion.div>
      {/* </OverlayScrollbarsComponent> */}
    </Motion.main>
  );
}
