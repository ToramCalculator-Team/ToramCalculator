// @refresh reload
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { createEffect, on, onMount, Suspense } from "solid-js";
import { initialStore, store } from "./store";
import * as _ from "lodash-es";

export default function App() {
  // 检查配置数据版本
  onMount(() => {
    const storage = localStorage.getItem("store") ?? "{}";
    const oldStore = JSON.parse(storage);
    const newStore = initialStore;
    if (oldStore.version && oldStore.version === newStore.version) {
      console.log(`配置数据版本未发生变化${oldStore.version}`);
    } else {
      // 排除版本信息
      const { version: oldVersion, ...oldStoreWithoutVersion } = oldStore;
      const { version: newVersion, ...newStoreWithoutVersion } = newStore;
      // 合并对象
      const mergedStore = _.merge({}, oldStoreWithoutVersion, newStoreWithoutVersion);
      // 加入新版本信息
      mergedStore.version = newStore.version;
      // 更新本地存储
      localStorage.setItem("store", JSON.stringify(mergedStore));
      console.log(`配置数据版本更新至${mergedStore.version}`);
    }
  });

  // 主题切换时
  createEffect(
    on(
      () => store.theme,
      (theme) => {
        console.log("主题切换");
        document.documentElement.classList.add("transitionColorNone");
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(theme);
        setTimeout(() => {
          document.documentElement.classList.remove("transitionColorNone");
        }, 500);
      },
      { defer: true },
    ),
  );

  // 禁用、启用动画
  createEffect(
    on(
      () => store.settings.userInterface.isAnimationEnabled,
      (isAnimationEnabled) => {
        console.log("动画禁用状态切换");
        isAnimationEnabled
          ? document.documentElement.classList.remove("transitionNone")
          : document.documentElement.classList.add("transitionNone");
      },
      { defer: true },
    ),
  );

  // 动态设置语言
  createEffect(
    on(
      () => store.settings.language,
      (language) => {
        console.log("语言切换");
        document.documentElement.lang = language;
        document.cookie = `lang=${language}; path=/; max-age=31536000;`;
      },
      { defer: true },
    ),
  );

  // 实时更新本地存储
  createEffect(() => {
    localStorage.setItem("store", JSON.stringify(store));
    console.log(performance.now());
    console.log("本地存储更新");
  });

  return (
    <Router root={(props) => <Suspense>{props.children}</Suspense>}>
      <FileRoutes />
    </Router>
  );
}
