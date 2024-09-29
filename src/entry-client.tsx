// @refresh reload
import "~/styles/app.css";
import "overlayscrollbars/overlayscrollbars.css";
import { OverlayScrollbars, ClickScrollPlugin } from "overlayscrollbars";
import { mount, StartClient } from "@solidjs/start/client";
import serviceWorkerUrl from "~/worker/serviceWorker?worker&url";
import { DS } from "~/dataService";
import { dw } from "~/worker/dataWorker";
import { proxiedPg } from "~/dataService";

// 注册ServiceWorker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register(serviceWorkerUrl, {
    type: "module",
  });
}

console.log(await dw.getMonsterList(proxiedPg));


OverlayScrollbars.plugin(ClickScrollPlugin);
mount(() => <StartClient />, document.getElementById("app")!);
