// @refresh reload
import "~/styles/app.css";
import "overlayscrollbars/overlayscrollbars.css";
import { OverlayScrollbars, ClickScrollPlugin } from "overlayscrollbars";
import { mount, StartClient } from "@solidjs/start/client";
import * as _ from "lodash-es";
import serviceWorkerUrl from "~/worker/service.worker?worker&url";
import { createMob, defaultMob, findMobById } from "./repositories/mob";
import { createCharacter, defaultCharacter, findCharacterById } from "./repositories/character";
import { createSkill, defaultSkill, findSkillById, Skill, updateSkill } from "./repositories/skill";
import { createSkillEffect, defaultSkillEffect, findSkillEffectById } from "./repositories/skillEffect";
import { createCrystal, defaultCrystals, findCrystalById } from "./repositories/crystal";
import { store } from "./store";
import { findSimulatorById, defaultSimulator, createSimulator } from "./repositories/simulator";

console.log("entry-client");

if (!store.resourcesLoaded) {
  // 资源加载进度
  const resourceList = document.getElementById("resource-list")!;
  let totalResources = 32;
  let loadedResources = 0;

  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      resourceList.innerHTML = `⏳ ${Math.floor((loadedResources * 100) / totalResources)}% ：${entry.name.replace("https://app.kiaclouth.com/_build/assets/", "")}`;

      // 模拟进度（实际需根据资源总数调整）
      loadedResources++;
      // console.log(`已加载资源数：${loadedResources}`);
      // totalResources++;
      // console.log(`已加载资源数：${totalResources}`);1
    });
  });
  observer.observe({ type: "resource", buffered: true });
}

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
  // console.log("查询Mob");
  const mob = await findMobById(defaultMob.id);
  // console.log("找到Mob:", mob);
} catch (e) {
  // console.log(e);
  // console.log("创建Mob");
  const { statistic, image, belongToZones, ...mob } = defaultMob;
  const newMob = await createMob(mob);
  // console.log("已创建新Mob:", newMob);
}

let newSkill: Skill = defaultSkill;
try {
  // console.log("查询skill");
  const skill = await findSkillById(defaultSkill.id);
  // console.log("找到Skill:", skill);
} catch (e) {
  // console.log(e);
  // console.log("创建Skill");
  const { statistic, effects, ...skill } = defaultSkill;
  newSkill = await createSkill(skill);
  // console.log("已创建新Skill:", newSkill);
}

try {
  // console.log("查询skillEffect");
  const skillEffect = await findSkillEffectById(defaultSkillEffect.id);
  // console.log("找到SkillEffect:", skillEffect);
} catch (e) {
  // console.log(e);
  // console.log("创建SkillEffect");
  const newSkillEffect = await createSkillEffect({
    ...defaultSkillEffect,
    description: "测试SkillEffect",
    belongToskillId: newSkill.id,
  });
  // console.log("已创建新SkillEffect:", newSkillEffect);
}

// try {
//   console.log("查询Character");
//   const character = await findCharacterById(defaultCharacter.id);
//   console.log("找到Character：", character);
// } catch (e) {
//   console.log(e);
//   console.log("创建Character");
//   const { statistic, team, ...character } = defaultCharacter;
//   const newCharacter = await createCharacter(character);
//   console.log("已创建newCharacter：", newCharacter);
// }

try {
  // console.log("查询Simulator");
  const simulator = await findSimulatorById(defaultSimulator.id);
  // console.log("找到Simulator：", simulator);
} catch (e) {
  // console.log(e);
  // console.log("创建Simulator");
  const { statistic, team, ...simulator } = defaultSimulator;
  const newSimulator = await createSimulator(simulator);
  // console.log("已创建newSimulator：", newSimulator);
}
