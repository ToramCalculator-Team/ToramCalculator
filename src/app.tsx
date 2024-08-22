// @refresh reload
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { createEffect, Suspense } from "solid-js";
import { store } from "./store";

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

  // 更新配置数据的本地存储
  createEffect(() => {
    localStorage.setItem("store", JSON.stringify(store));
  });

  //
  createEffect(() => {
    store.durtion
      ? document.documentElement.classList.remove("transitionNone")
      : document.documentElement.classList.add("transitionNone");
  });

  return (
    <Router root={(props) => <Suspense>{props.children}</Suspense>}>
      <FileRoutes />
    </Router>
  );
}
