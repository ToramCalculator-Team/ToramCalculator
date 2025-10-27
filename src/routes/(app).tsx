import { Show, type ParentProps, createEffect, onMount, createSignal, on } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { setStore, store } from "~/store";
import { MediaProvider } from "~/lib/contexts/Media-component";
import { RandomBallBackground } from "~/components/effects/randomBg";
import { Setting } from "~/components/features/setting";
import { BabylonBg } from "~/components/effects/babylonBg";
import hotkeys from "hotkeys-js";
import { LoginDialog } from "~/components/features/loginDialog";
import { ensureLocalAccount } from "~/lib/localAccount";
import { CardGroup } from "~/components/features/cardGroup";
import { repositoryMethods } from "@db/generated/repositories";
import { getDB } from "@db/repositories/database";
import { getPrimaryKeys } from "@db/repositories/untils";
import { DB } from "@db/generated/zod/index";
import { defaultData } from "@db/defaultData";

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
      () => store.settings.userInterface.theme,
      () => {
        console.log("主题切换");
        document.documentElement.classList.add("transitionColorNone");
        setStore("settings", "userInterface", "isAnimationEnabled", false);
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(store.settings.userInterface.theme);
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
      () => store.settings.userInterface.language,
      () => {
        console.log("语言切换");
        document.documentElement.lang = store.settings.userInterface.language;
        document.cookie = `lang=${store.settings.userInterface.language}; path=/; max-age=31536000;`;
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

  // 移除全局加载动画
  // 此处移除是为了客户端在初次下载完资源时，将画面从加载过渡到正常页面，preload.js中的是为了保证之后的每次页面都不展示加载动画
  createEffect(
    on(
      () => store.pages.resourcesLoaded,
      () => {
        console.log("移除全局加载动画");
        const loader = document.getElementById("loader");
        if (loader) {
          loader.style.opacity = "0";
          loader.style.scale = "1.1";
          setTimeout(() => {
            loader.remove();
          }, 1000);
        }
      },
      {
        defer: true,
      },
    ),
  );

  // 本地状态更新
  onMount(async () => {
    setStore("pages", "resourcesLoaded", true);
    await ensureLocalAccount();

    // 数据库查询测试
    const db = await getDB();
    db.transaction().execute(async (trx) => {
      for (const [key, value] of Object.entries(repositoryMethods)) {
        if (!value.select?.name) {
          continue;
        }
        const primaryKey = await getPrimaryKeys(trx, key as keyof DB);
        if (primaryKey.length === 0) {
          continue;
        }
        const data = await value.select(defaultData[key as keyof DB][primaryKey[0]], trx);
        // console.log(
        //   "表名：",
        //   key,
        //   "主键：",
        //   primaryKey,
        //   "默认值的主键：",
        //   defaultData[key as keyof DB][primaryKey[0]],
        //   "数据：",
        //   data,
        // );
      }
    });
  });

  return (
    <MediaProvider>
      <Show when={store.settings.userInterface.is3DbackgroundDisabled}>
        <BabylonBg />
      </Show>
      <RandomBallBackground />
      <Motion.div
        id="AppMainContet"
        class={`h-full w-full overflow-hidden ${store.pages.settingsDialogState ? "scale-[95%] opacity-0 blur-xs" : "blur-0 scale-100 opacity-100"}`}
      >
        {props.children}
      </Motion.div>
      <Setting />
      <LoginDialog />
      <CardGroup />
    </MediaProvider>
  );
}
