import { useLocation } from "@solidjs/router";

import * as Icon from "./icon";
import { getDictionary } from "~/i18n";
import { createEffect, createMemo, createSignal, For, JSX } from "solid-js";
import { setStore, store } from "~/store";
import { Motion } from "solid-motionone";
import Button from "./button";

export default function Nav() {
  const [dictionary, setDictionary] = createSignal(getDictionary("en"));
  const location = useLocation();
  const active = (path: string) => (path.includes(location.pathname) ? "bg-brand-color-1st" : "");
  const NavBtnConfig = createMemo<
    {
      btnName: string;
      icon: JSX.Element | undefined;
      url: string | undefined;
    }[]
  >(() => [
    {
      btnName: dictionary().ui.nav.monsters,
      icon: <Icon.Line.Calendar />,
      url: "/monster",
    },
    { btnName: "LineA", icon: undefined, url: undefined },
    {
      btnName: dictionary().ui.nav.skills,
      icon: <Icon.Line.Basketball />,
      url: "/skill",
    },
    {
      btnName: dictionary().ui.nav.equipments,
      icon: <Icon.Line.Category2 />,
      url: "/equipment",
    },
    {
      btnName: dictionary().ui.nav.crystals,
      icon: <Icon.Line.Box2 />,
      url: "/crystal",
    },
    {
      btnName: dictionary().ui.nav.pets,
      icon: <Icon.Line.Money />,
      url: "/pet",
    },
    {
      btnName: dictionary().ui.nav.items,
      icon: <Icon.Line.Coins />,
      url: "/building",
    },
    { btnName: "LineB", icon: undefined, url: undefined },
    {
      btnName: dictionary().ui.nav.character,
      icon: <Icon.Line.Gamepad />,
      url: "/character",
    },
    {
      btnName: dictionary().ui.nav.comboAnalyze,
      icon: <Icon.Line.Filter />,
      url: "/analyze",
    },
  ]);

  createEffect(() => {
    setDictionary(getDictionary(store.settings.language));
  })

  return (
    <Motion.div
      animate={{ transform: "translateX(0)", opacity: 1 }}
      class={`Nav border-t-1 z-10 flex w-dvw flex-shrink-0 translate-y-full overflow-x-auto border-transition-color-20 opacity-0 backdrop-blur lg:h-dvh lg:w-24 lg:-translate-x-1/3 lg:translate-y-0 lg:flex-col lg:gap-10 lg:border-none lg:bg-transition-color-8 lg:py-5`}
    >
      <div class="flex items-center justify-center lg:flex-none">
        <a
          href={"/"}
          class="Home group flex flex-shrink-0 flex-col items-center gap-0.5 px-1 py-2 lg:p-0"
          tabIndex={1}
        >
          <div class="iconArea rounded-full px-4 py-1 group-hover:bg-brand-color-1st group-focus:bg-brand-color-1st lg:hidden">
            <Icon.Line.Home />
          </div>
          <Icon.Line.Logo class="hidden lg:block" />
          <div class="text-xs lg:hidden">{dictionary().ui.nav.home}</div>
        </a>
      </div>
      <div class="NavBtnList flex flex-1 items-center lg:flex-col lg:gap-4 lg:overflow-y-auto">
        <For each={NavBtnConfig()}>
          {(config) => {
            if (config.icon !== undefined && config.url !== undefined) {
              return (
                <a
                  href={config.url}
                  tabIndex={0}
                  class={`NavBtn btn-${config.btnName} group flex flex-shrink-0 flex-col items-center gap-0.5 px-1 py-2 lg:gap-1 lg:p-0`}
                >
                  <div
                    class={`iconArea rounded-full px-4 py-1 ${active(config.url)} group-hover:bg-brand-color-1st group-focus:bg-brand-color-1st`}
                  >
                    {config.icon}
                  </div>
                  <div class="text-xs">{config.btnName}</div>
                </a>
              );
            } else {
              return <div class={"Line h-line flex-none lg:w-12 lg:bg-brand-color-1st"}></div>;
            }
          }}
        </For>
      </div>
      <div class="FunctionGroup flex items-center justify-center gap-3 px-6 lg:flex-col lg:p-0">
        <Button
          level="quaternary"
          class="rounded-full bg-transparent px-2 py-2"
          onClick={() => setStore("theme", store.theme == "dark" ? "light" : "dark")}
        >
          <Icon.Line.Light />
        </Button>
        <Button
          level="quaternary"
          class="rounded-full bg-transparent px-2 py-2"
          onClick={() => setStore("settingsDialogState", true)}
        >
          <Icon.Line.Settings />
        </Button>
      </div>
    </Motion.div>
  );
}
