import { PGliteWorker } from "@electric-sql/pglite/worker";
import * as Comlink from "comlink";
import { defaultSM } from "./analyzerWorker/stateMachine";

const worker = self as unknown as SharedWorkerGlobalScope;

export const dw = {
  counter: 0,
  inc() {
    this.counter++;
  },
  async getMonsterList(pg: PGliteWorker) {
    return await pg.exec("SELECT * FROM monster");
  },
  runSM() {
    defaultSM.start();
    return defaultSM.consoles
  }
};

/**
 * When a connection is made into this shared worker, expose `obj`
 * via the connection `port`.
 */
worker.onconnect = (e: MessageEvent) => Comlink.expose(dw, e.ports[0]);
