import { ParentProps } from "solid-js";
import Nav from "~/components/leftNav";

export default function Home(props: ParentProps) {
  return (
    <main>
      <Nav />
      {props.children}
    </main>
  );
}
