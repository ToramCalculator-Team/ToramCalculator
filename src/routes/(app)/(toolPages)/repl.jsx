import { onMount } from "solid-js";
import { createPgWorker } from "~/lib/pglite/pg";

export default function Repl() {
	onMount(async () => {
		await import("https://cdn.jsdelivr.net/npm/@electric-sql/pglite-repl/dist-webcomponent/Repl.js");
		const repl = document.getElementById("repl");
		if (repl) {
			repl.pg = await createPgWorker();
		}
	});
	return <pglite-repl id="repl"></pglite-repl>;
}
