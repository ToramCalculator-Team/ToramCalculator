// @refresh reload
import "~/styles/app.css";
import 'overlayscrollbars/overlayscrollbars.css';
import { mount, StartClient } from "@solidjs/start/client";
import { PGliteWorker } from "@electric-sql/pglite/worker";
import PGliteWorkerUrl from "~/lib/worker/PGliteWorker.ts?url";
import serviceWorkerUrl from "~/entry-serviceworker.ts?url";
import { OverlayScrollbars, ClickScrollPlugin } from "overlayscrollbars";

// // 初始化本地数据库
// export const pg = await PGliteWorker.create(
//   new Worker(PGliteWorkerUrl, {
//     type: "module",
//   })
// );

// // 注册ServiceWorker
// if ("serviceWorker" in navigator) {
//   navigator.serviceWorker.register(serviceWorkerUrl, {
//     type: "module",
//   });
// }

OverlayScrollbars.plugin(ClickScrollPlugin);
mount(() => <StartClient />, document.getElementById("app")!);
