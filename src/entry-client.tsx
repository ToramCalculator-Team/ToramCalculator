// @refresh reload
import "~/styles/app.css";
import "overlayscrollbars/overlayscrollbars.css";
import { OverlayScrollbars, ClickScrollPlugin } from "overlayscrollbars";
import { mount, StartClient } from "@solidjs/start/client";
import * as _ from "lodash-es";
import serviceWorkerUrl from "~/worker/service.worker?worker&url";
import { createAccount, defaultAccount, findAccountById } from "./repositories/account";

// 注册ServiceWorker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register(serviceWorkerUrl, {
    type: "module",
  });
}

OverlayScrollbars.plugin(ClickScrollPlugin);
mount(() => <StartClient />, document.getElementById("app")!);

// 测试kysely方法
try {
  console.log(await findAccountById(defaultAccount.id));
} catch (e) {
  const {create, update, ...account} = defaultAccount
  await createAccount(account);
}

