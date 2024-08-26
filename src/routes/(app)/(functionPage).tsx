import { ParentProps } from "solid-js";
import { Motion } from "solid-motionone";
import Nav from "~/components/nav";

export default function Home(props: ParentProps) {
  return (
    <Motion.main animate={{ opacity: 1 }} class="flex h-dvh w-dvw flex-col-reverse opacity-0 lg:flex-row">
      <Nav />
      {props.children}
    </Motion.main>
  );
}
