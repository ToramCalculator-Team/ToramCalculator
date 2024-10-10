// @refresh reload
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { createEffect, onMount, Suspense } from "solid-js";
import * as _ from "lodash-es";
import { initialStore, Store, store } from "./store";

export default function App() {
  // 主题切换时
  createEffect(() => {
    document.documentElement.classList.add("transitionColorNone");
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(store.theme);
    setTimeout(() => {
      document.documentElement.classList.remove("transitionColorNone");
    }, 500);
  });

  // 禁用、启用动画
  createEffect(() => {
    store.settings.userInterface.isAnimationEnabled
      ? document.documentElement.classList.remove("transitionNone")
      : document.documentElement.classList.add("transitionNone");
  });

  // 动态设置语言
  createEffect(() => {
    document.documentElement.lang = store.settings.language;
    document.cookie = `lang=${store.settings.language}; path=/; max-age=31536000;`;
  });

  // 实时更新本地存储
  createEffect(() => {
    localStorage.setItem("store", JSON.stringify(store));
    console.log("本地存储已更新");
  });

  // 检查配置数据版本
  onMount(() => {
    const storage = localStorage.getItem("store") ?? "{}";
    const oldStore = JSON.parse(storage);
    const newStore = initialStore;
    if (oldStore.version && oldStore.version === newStore.version) {
      // console.log(`配置数据版本${oldStore.version}`);
    } else {
      // 排除版本信息
      const oldStoreWithoutVersion = _.omit(oldStore, ["version"]);
      const newStoreWithoutVersion = _.omit(newStore, ["version"]);

      // 合并对象
      const mergedStore = _.merge({}, oldStoreWithoutVersion, newStoreWithoutVersion);

      // 加入新版本信息
      mergedStore.version = newStore.version;

      // 更新本地存储
      localStorage.setItem("store", JSON.stringify(mergedStore));
      console.log(`配置数据版本更新至${mergedStore.version}`);
    }
  });

  return (
    <Router root={(props) => <Suspense>{props.children}</Suspense>}>
      <FileRoutes />
    </Router>
  );
}
