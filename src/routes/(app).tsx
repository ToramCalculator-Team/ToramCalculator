import { Show, type ParentProps, createEffect, onMount, createSignal, on } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { setStore, store } from "~/store";
import { MediaProvider } from "~/contexts/Media-component";
import { RandomBallBackground } from "~/components/module/randomBg";
import { Setting } from "~/components/module/setting";
import { BabylonBg } from "~/components/module/babylonBg";
import hotkeys from "hotkeys-js";
import { findMobs } from "~/repositories/mob";
import { findSkills } from "~/repositories/skill";
import { findCrystals } from "~/repositories/crystal";
import { findItems } from "~/repositories/item";
import { findActivities } from "~/repositories/activity";
import { findAddresses } from "~/repositories/address";
import { findArmors } from "~/repositories/armor";
import { findConsumables } from "~/repositories/consumable";
import { findNpcs } from "~/repositories/npc";
import { findZones } from "~/repositories/zone";
import { findMaterials } from "~/repositories/material";
import { findTasks } from "~/repositories/task";
import { findWeapons } from "~/repositories/weapon";
import { findOptions } from "~/repositories/optEquip";
import { findSpecials } from "~/repositories/speEquip";

export default function AppMainContet(props: ParentProps) {
  // 热键
  hotkeys("ctrl+a,ctrl+b,r,f,enter,esc", function (event, handler) {
    switch (
      handler.key
      //   case "enter":
      //     alert("you pressed enter!");
      //     break;
      //   case "esc":
      //     alert("you pressed esc!");
      //     break;
      //   case "ctrl+a":
      //     alert("you pressed ctrl+a!");
      //     break;
      // case "ctrl+b":
      //   break;
      //   case "r":
      //     alert("you pressed r!");
      //     break;
      //   case "f":
      //     alert("you pressed f!");
      //     break;
      //   default:
      //     alert(event);
    ) {
    }
  });

  // 主题切换时
  createEffect(
    on(
      () => store.theme,
      () => {
        console.log("主题切换");
        document.documentElement.classList.add("transitionColorNone");
        setStore("settings", "userInterface", "isAnimationEnabled", false);
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(store.theme);
        setTimeout(() => {
          document.documentElement.classList.remove("transitionColorNone");
          setStore("settings", "userInterface", "isAnimationEnabled", true);
        }, 1);
      },
      {
        defer: true,
      },
    ),
  );
  // 禁用、启用动画
  createEffect(
    on(
      () => store.settings.userInterface.isAnimationEnabled,
      () => {
        console.log("动画禁用状态切换");
        store.settings.userInterface.isAnimationEnabled
          ? document.documentElement.classList.remove("transitionNone")
          : document.documentElement.classList.add("transitionNone");
      },
      {
        defer: true,
      },
    ),
  );
  // 动态设置语言
  createEffect(
    on(
      () => store.settings.language,
      () => {
        console.log("语言切换");
        document.documentElement.lang = store.settings.language;
        document.cookie = `lang=${store.settings.language}; path=/; max-age=31536000;`;
      },
      {
        defer: true,
      },
    ),
  );
  // 实时更新本地存储
  createEffect(() => {
    localStorage.setItem("store", JSON.stringify(store));
    // console.log("本地存储更新");
  });

  onMount(() => {
    // 此组件挂载后移除全局加载动画
    const loader = document.getElementById("loader");
    if (loader) {
      loader.style.opacity = "0";
      loader.style.scale = "1.1";
      setTimeout(() => {
        loader.remove();
      }, 1000);
    }
    setStore("resourcesLoaded", true);

    // 数据库查询测试
    findMobs();
    findSkills();
    findCrystals();
    findNpcs();
    findZones();
    findAddresses();
    findActivities();
    findArmors();
    findConsumables();
    findCrystals();
    findMaterials();
    findOptions();
    findSpecials();
    findTasks();
    findWeapons();
  });

  return (
    <MediaProvider>
      <Show when={store.settings.userInterface.is3DbackgroundDisabled}>
        <BabylonBg />
      </Show>
      <RandomBallBackground />
      <Motion.div
        id="AppMainContet"
        class={`h-full w-full overflow-hidden ${store.settingsDialogState ? "scale-[95%] opacity-0 blur-xs" : "blur-0 scale-100 opacity-100"}`}
      >
        {props.children}
      </Motion.div>
      <Setting />
    </MediaProvider>
  );
}
