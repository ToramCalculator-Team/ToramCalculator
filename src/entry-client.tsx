// @refresh reload
import "~/styles/app.css";
import "overlayscrollbars/overlayscrollbars.css";
import { OverlayScrollbars, ClickScrollPlugin } from "overlayscrollbars";
import { mount, StartClient } from "@solidjs/start/client";
import * as _ from "lodash-es";
import serviceWorkerUrl from "~/worker/service.worker?worker&url";
import { createMob, defaultMob, findMobById } from "./repositories/mob";
import { createSimulator, defaultSimulator, findSimulatorById } from "./repositories/simulator";

// 注册ServiceWorker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register(serviceWorkerUrl, {
    type: "module",
  });
}

OverlayScrollbars.plugin(ClickScrollPlugin);
mount(() => <StartClient />, document.getElementById("app")!);

// 测试kysely方法，目前没办法保证异步执行顺序，可能此时数据库未完成初始化
try {
  console.log("查询Mob");
  const mob = await findMobById(defaultMob.id);
  console.log("找到Mob:", mob);
} catch (e) {
  console.log(e);
  console.log("创建Mob");
  const { statistic, image, belongToZones, ...mob } = defaultMob;
  const newMob = await createMob(mob);
  console.log("已创建新Mob:", newMob);
}

try {
  console.log("查询Simulator");
  const simulator = await findSimulatorById(defaultSimulator.id);
  console.log("找到Simulator：", simulator);
} catch (e) {
  console.log(e);
  console.log("创建Simulator");
  const { statistic, team,  ...simulator } = defaultSimulator;
  const newSimulator = await createSimulator(simulator);
  console.log("已创建newSimulator：", newSimulator);
}
