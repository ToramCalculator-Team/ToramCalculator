// @refresh reload
import "~/styles/app.css";
import "overlayscrollbars/overlayscrollbars.css";
import { OverlayScrollbars, ClickScrollPlugin } from "overlayscrollbars";
import { mount, StartClient } from "@solidjs/start/client";
import * as _ from "lodash-es";
import serviceWorkerUrl from "~/worker/service.worker?worker&url";
import { createMob, defaultMob, findMobById, Mob, NewMob } from "./repositories/mob";

// 注册ServiceWorker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register(serviceWorkerUrl, {
    type: "module",
  });
}

OverlayScrollbars.plugin(ClickScrollPlugin);
mount(() => <StartClient />, document.getElementById("app")!);

// 测试kysely方法
try {
  console.log("查询");
  const result = await findMobById(defaultMob.id);
  console.log("result", result);
} catch (e) {
  console.log(e);
  console.log("创建");
  const { statistic, image, dropItems, belongToZones, ...mob } = defaultMob;
  const newMob = await createMob(mob);
  console.log("newMob", newMob);
}
