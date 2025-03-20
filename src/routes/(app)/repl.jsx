import { onMount } from "solid-js";
import { pgWorker } from "~/initialWorker";

export default function Repl() {
  // onMount(async () => {
  //   await import("https://cdn.jsdelivr.net/npm/@electric-sql/pglite-repl/dist-webcomponent/Repl.js");
  //   const repl = document.getElementById("repl");
  //   if (repl) {
  //     repl.pg = pgWorker;
  //   }
  // });
  return <pglite-repl id="repl"></pglite-repl>;
}
