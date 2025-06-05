import { createEffect, createMemo, createSignal, For, JSX, onMount } from "solid-js";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";
import { useNavigate } from "@solidjs/router";
import * as Icon from "~/components/icon";
import { Button  } from "~/components/controls/button";

export default function ProfilePage() {
  const navigate = useNavigate();
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));

  // 页面附加功能（右上角按钮组）配置
  const [extraFunctionConfig] = createSignal<
    {
      onClick: () => void;
      icon: JSX.Element;
    }[]
  >([
    {
      onClick: () => setStore("theme", store.theme == "dark" ? "light" : "dark"),
      icon: <Icon.Line.Light />,
    },
    {
      onClick: () => setStore("settingsDialogState", !store.settingsDialogState),
      icon: <Icon.Line.Settings />,
    },
  ]);

  onMount(() => {
    console.log("--AccountIndexPage Render");

    return () => {
      console.log("--AccountIndexPage Unmount");
    };
  });

  return (
    <div class="Profile flex flex-col gap-4 p-3">
      <div class="Top gap-3 p-6 flex flex-col items-center justify-center">
        <div class="Avatar flex-none bg-accent-color w-32 h-32 overflow-hidden rounded-full"></div>
        <span class="text-2xl">{store.session.user.name}</span>
        <div class={`Config absolute top-3 right-3 flex gap-1`}>
          <For each={extraFunctionConfig()}>
            {(config, index) => {
              return (
                <Button
                  class="outline-hidden focus-within:outline-hidden"
                  level="quaternary"
                  onClick={config.onClick}
                  icon={config.icon}
                ></Button>
              );
            }}
          </For>
        </div>
      </div>
      <div class="Bottom bg-area-color w-full h-full"></div>
    </div>
  );
}
