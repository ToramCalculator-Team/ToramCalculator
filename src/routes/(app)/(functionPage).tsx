import { ParentProps } from "solid-js";
import Nav from "~/components/leftNav";

export default function Home(props: ParentProps) {
  return (
    <main class="flex h-dvh w-dvw flex-col-reverse lg:flex-row">
      <Nav />
      {props.children}
    </main>
  );
}
