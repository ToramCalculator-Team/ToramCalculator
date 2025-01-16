// @refresh reload
import "~/styles/app.css";
import "overlayscrollbars/overlayscrollbars.css";
import { OverlayScrollbars, ClickScrollPlugin } from "overlayscrollbars";
import { mount, StartClient } from "@solidjs/start/client";
import * as _ from "lodash-es";
import serviceWorkerUrl from "~/worker/service.worker?worker&url";
import { createMob, defaultMob, findMobById } from "./repositories/mob";
import { createCharacter, defaultCharacter, findCharacterById } from "./repositories/character";

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
  console.log("查询Character");
  const character = await findCharacterById(defaultCharacter.id);
  console.log("找到Character：", character);
} catch (e) {
  console.log(e);
  console.log("创建Character");
  const { statistic, combos, weapon, subWeapon, armor, addEquip, speEquip,  ...character } = defaultCharacter;
  const newCharacter = await createCharacter(character);
  console.log("已创建newCharacter：", newCharacter);
}
