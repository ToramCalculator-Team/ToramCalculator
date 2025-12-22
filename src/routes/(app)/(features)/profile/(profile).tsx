import { createEffect, createMemo, createSignal, For, JSX, onMount } from "solid-js";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";
import { useNavigate } from "@solidjs/router";
import { Icons } from "~/components/icons/index";
import { Button } from "~/components/controls/button";

export default function ProfilePage() {
  const navigate = useNavigate();
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.userInterface.language));

  // 页面附加功能（右上角按钮组）配置
  const [extraFunctionConfig] = createSignal<
    {
      onClick: () => void;
      icon: JSX.Element;
    }[]
  >([
    {
      onClick: () => setStore("settings", "userInterface", "theme", store.settings.userInterface.theme == "dark" ? "light" : "dark"),
      icon: <Icons.Outline.Light />,
    },
    {
      onClick: () => setStore("pages", "settingsDialogState", !store.pages.settingsDialogState),
      icon: <Icons.Outline.Settings />,
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
      <div class="Top flex flex-col items-center justify-center gap-3 p-6">
        <div class="Avatar bg-area-color h-32 w-32 flex-none overflow-hidden rounded-full"></div>
        <span class="text-2xl">{store.session.user?.name}</span>
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
      <div class="Bottom bg-area-color h-full w-full">
      </div>
    </div>
  );
}
