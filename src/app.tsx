// @refresh reload
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { createEffect, on, Suspense } from "solid-js";
import { store } from "./store";
import hotkeys from 'hotkeys-js';

export default function App() {
  // 热键
  hotkeys('ctrl+a,ctrl+b,r,f', function (event, handler){
    switch (handler.key) {
      case 'ctrl+a': alert('you pressed ctrl+a!');
        break;
      case 'ctrl+b': alert('you pressed ctrl+b!');
        break;
      case 'r': alert('you pressed r!');
        break;
      case 'f': alert('you pressed f!');
        break;
      default: alert(event);
    }
  });

  // 主题切换时
  createEffect(
    on(
      () => store.theme,
      () => {
        console.log("主题切换");
        document.documentElement.classList.add("transitionColorNone");
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(store.theme);
        setTimeout(() => {
          document.documentElement.classList.remove("transitionColorNone");
        }, 500);
      },
      {
        defer: true,
      }
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
      }
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
      }
    ),
  );
  // 实时更新本地存储
  createEffect(() => {
    localStorage.setItem("store", JSON.stringify(store));
    console.log("本地存储更新");
  });

  return (
    <Router root={(props) => <Suspense>{props.children}</Suspense>}>
      <FileRoutes />
    </Router>
  );
}
