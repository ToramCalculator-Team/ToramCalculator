import { useLocation } from "@solidjs/router";

import * as Icon from "~/lib/icon";
import { getDictionary } from "~/locales/i18n";
import { createEffect, createMemo, createSignal, For, JSX } from "solid-js";
import { setStore, store } from "~/store";
import { Motion } from "solid-motionone";
import Button from "~/components/ui/button";

export default function Nav() {
  const [dictionary, setDictionary] = createSignal(getDictionary("en"));
  const location = useLocation();
  const active = (path: string) => (location.pathname.includes(path) ? "bg-brand-color-1st" : "");
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
      btnName: dictionary().ui.nav.analyzer,
      icon: <Icon.Line.Filter />,
      url: "/analyzer/testAnalyzerId",
    },
  ]);

  createEffect(() => {
    setDictionary(getDictionary(store.settings.language));
  });

  return (
    <Motion.div
      animate={{ transform: "none", opacity: 1 }}
      transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
      class={`Nav border-t-1 border-transition-color-20 lg:bg-transition-color-8 z-10 flex w-dvw flex-shrink-0 translate-y-full overflow-x-auto opacity-0 lg:h-dvh lg:w-24 lg:-translate-x-1/3 lg:translate-y-0 lg:flex-col lg:gap-10 lg:border-none lg:py-5`}
    >
      <div class="LogoOrHomeflex items-center justify-center lg:flex-none">
        <a
          href={"/"}
          class="Home group flex flex-shrink-0 flex-col items-center gap-0.5 px-1 py-2 outline-none focus-within:outline-none lg:p-0"
          tabIndex={1}
        >
          <div class="iconArea group-hover:bg-brand-color-1st group-focus:bg-brand-color-1st rounded-full px-4 py-1 lg:hidden">
            <Icon.Line.Home />
          </div>
          <Icon.Line.Logo class="hidden lg:block" />
          <div class="text-xs lg:hidden">{dictionary().ui.nav.home}</div>
        </a>
      </div>
        <div class="NavBtnList flex lg:flex-1 items-center lg:flex-col lg:gap-4">
          <For each={NavBtnConfig()}>
            {(config) => {
              if (config.icon !== undefined && config.url !== undefined) {
                return (
                  <a
                    href={config.url}
                    tabIndex={0}
                    class={`NavBtn btn-${config.btnName} group flex flex-shrink-0 flex-col items-center gap-0.5 px-1 py-2 outline-none focus-within:outline-none lg:gap-1 lg:p-0`}
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
                return <div class={"Line lg:bg-brand-color-1st h-[1px] flex-none lg:w-12"}></div>;
              }
            }}
          </For>
        </div>
      <div class="FunctionGroup hidden items-center justify-center gap-3 px-6 lg:flex-col lg:p-0 lg:flex">
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
