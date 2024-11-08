import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { ParentProps } from "solid-js";
import { Motion } from "solid-motionone";
import Nav from "~/components/module/nav";
import { store } from "~/store";

export default function Home(props: ParentProps) {
  return (
    <Motion.main class="flex h-dvh w-dvw flex-col-reverse lg:flex-row">
      <Nav />
      <OverlayScrollbarsComponent
        element="div"
        options={{ scrollbars: { autoHide: "scroll" } }}
        defer
        class="h-full w-full z-0"
      >
        <Motion.div
          animate={{ opacity: 1 }}
          transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0 }}
          id="mainContent"
          class="Content flex w-full min-h-full flex-1 flex-col opacity-0"
        >
          {props.children}
        </Motion.div>
      </OverlayScrollbarsComponent>
    </Motion.main>
  );
}
