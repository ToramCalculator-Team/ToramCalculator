import { ParentProps } from "solid-js";
import { Motion } from "solid-motionone";
import Nav from "~/components/nav";
import { store } from "~/store";

export default function Home(props: ParentProps) {
  return (
    <Motion.main class="flex h-dvh w-dvw flex-col-reverse lg:flex-row">
      <Nav />
      <Motion.div animate={{ opacity: 1 }} transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0 }} class="Content flex flex-col opacity-0 lg:w-[calc(100dvw-96px)] lg:flex-row">
        <div class="LeftArea sticky top-0 z-10 flex-1"></div>
        <div class={`ModuleContent h-[calc(100dvh-67px)] w-full flex-col p-3 lg:p-5 overflow-auto lg:h-dvh lg:max-w-[1536px]`}>
          {props.children}
        </div>
        <div class="RightArea sticky top-0 z-10 flex-1"></div>
      </Motion.div>
    </Motion.main>
  );
}
