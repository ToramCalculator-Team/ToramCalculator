// @refresh reload
console.log("entry client",performance.now());
import "~/styles/app.css";
import "overlayscrollbars/overlayscrollbars.css";
import { OverlayScrollbars, ClickScrollPlugin } from "overlayscrollbars";
import { mount, StartClient } from "@solidjs/start/client";
import { initialStore } from "./store";
import * as _ from "lodash-es";
import { createUser, defaultUser, findUserById } from "./repositories/user";
import serviceWorkerUrl from "~/worker/service.worker?worker&url";

// 注册ServiceWorker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register(serviceWorkerUrl, {
    type: "module",
  });
}

const storage = localStorage.getItem("store");
if (storage) {
  const oldStore = JSON.parse(storage);
  const newStore = initialStore;
  if (oldStore.version && oldStore.version === newStore.version) {
    // console.log(`配置数据版本未发生变化${oldStore.version}`);
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
} else {
  console.log("配置数据缺失，执行初始化");
  localStorage.setItem("store", JSON.stringify(initialStore));
}

OverlayScrollbars.plugin(ClickScrollPlugin);
mount(() => <StartClient />, document.getElementById("app")!);

// 测试kysely方法
// try {
//   console.log(await findUserById(defaultUser.id));
// } catch (e) {
//   await createUser(defaultUser);
//   console.log(await findUserById(defaultUser.id));
// }
