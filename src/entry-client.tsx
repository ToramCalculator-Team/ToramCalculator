// @refresh reload
import "~/styles/app.css";
import "overlayscrollbars/overlayscrollbars.css";
import { OverlayScrollbars, ClickScrollPlugin } from "overlayscrollbars";
import { mount, StartClient } from "@solidjs/start/client";
import serviceWorkerUrl from "~/worker/serviceWorker?worker&url";
import { DS, pgWorker, proxiedPg } from "~/dataService";

// 注册ServiceWorker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register(serviceWorkerUrl, {
    type: "module",
  });
}

// setTimeout(async() => {
//   console.log(await pgWorker.exec("SELECT * FROM public.monster;"));
// }, 5000);

console.log(await pgWorker.exec("SELECT * FROM public.monster;"));

// console.log(await DS.getMonsterList(proxiedPg));

OverlayScrollbars.plugin(ClickScrollPlugin);
mount(() => <StartClient />, document.getElementById("app")!);
