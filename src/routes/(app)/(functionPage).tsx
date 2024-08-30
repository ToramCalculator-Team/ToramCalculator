import { onMount, ParentProps } from "solid-js";
import { Motion } from "solid-motionone";
import Nav from "~/components/nav";
import { store } from "~/store";

export default function Home(props: ParentProps) {
  return (
    <Motion.main class="flex h-dvh w-dvw flex-col-reverse lg:flex-row">
      <Nav />
      <Motion.div
        animate={{ opacity: 1 }}
        transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0 }}
        class="Content flex flex-1 w-full lg:max-w-[1536px] mx-auto flex-col opacity-0 lg:h-dvh lg:py-5 bg-primary-color"
      >
        {props.children}
      </Motion.div>
    </Motion.main>
  );
}
