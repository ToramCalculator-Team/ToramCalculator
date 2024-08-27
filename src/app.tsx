// @refresh reload
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { createEffect, onMount, Suspense } from "solid-js";
import * as _ from "lodash-es";
import { initialStore, Store, store } from "./store";

export default function App() {
  // 实时更新主题
  createEffect(() => {
    document.documentElement.classList.add("transitionColorNone");
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(store.theme);
    setTimeout(() => {
      document.documentElement.classList.remove("transitionColorNone");
    }, 500);
  });

  // 检查配置数据版本
  onMount(() => {
    const storage = localStorage.getItem("store") ?? "{}";
    const oldConfig = JSON.parse(storage);
    const newConfig = initialStore;
    if (oldConfig.version && oldConfig.version === newConfig.version) {
      console.log(`配置数据版本${oldConfig.version}`);
    } else {
      console.log(`配置数据版本更新至${newConfig.version}`);

      // 排除版本信息
      const oldConfigWithoutVersion = _.omit(oldConfig, ["version"]);
      const newConfigWithoutVersion = _.omit(newConfig, ["version"]);

      // 合并对象
      const mergedConfig = _.merge({}, oldConfigWithoutVersion, newConfigWithoutVersion);

      // 加入新版本信息
      mergedConfig.version = newConfig.version;

      // console.log("旧对象：", oldConfig, "新对象：", newConfig, "合并结果：", mergedConfig);
      localStorage.setItem("store", JSON.stringify(mergedConfig));
    }
  });

  // 更新配置数据的本地存储
  createEffect(() => {
    document.documentElement.lang = store.settings.language;
    document.cookie = `lang=${store.settings.language}; path=/; max-age=31536000;`;
    localStorage.setItem("store", JSON.stringify(store));
  });

  //
  createEffect(() => {
    store.settings.userInterface.isAnimationEnabled
      ? document.documentElement.classList.remove("transitionNone")
      : document.documentElement.classList.add("transitionNone");
  });

  return (
    <Router root={(props) => <Suspense>{props.children}</Suspense>}>
      <FileRoutes />
    </Router>
  );
}
