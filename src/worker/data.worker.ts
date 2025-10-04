import { PGliteWorker } from "@electric-sql/pglite/worker";
import * as Comlink from "comlink";

const worker = self as unknown as SharedWorkerGlobalScope;

export interface DataWorkerApi {
  getName: typeof getName;
}

async function getName() {
  const res = await fetch("https://random-word-api.herokuapp.com/word?number=1");
  const json = await res.json();
  return json[0];
}

/**
 * When a connection is made into this shared worker, expose `obj`
 * via the connection `port`.
 */
worker.onconnect = (e: MessageEvent) => {
  const port = e.ports[0];
  return Comlink.expose(
    {
      getName,
    } satisfies DataWorkerApi,
    port,
  );
};
