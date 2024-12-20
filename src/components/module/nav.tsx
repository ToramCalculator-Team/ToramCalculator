import { useLocation } from "@solidjs/router";

import * as Icon from "~/lib/icon";
import { getDictionary } from "~/locales/i18n";
import { createEffect, createMemo, createSignal, For, JSX } from "solid-js";
import { setStore, store } from "~/store";
import { Motion } from "solid-motionone";
import Button from "~/components/ui/button";

const NavBtn = (props: {
  config: {
    btnName: string;
    icon: JSX.Element;
    url: string;
  };
  active: (path: string) => string;
  class?: string;
}) => {
  return (
    <a
      href={props.config.url}
      tabIndex={0}
      class={
        `NavBtn btn-${props.config.btnName} group flex flex-shrink-0 flex-col items-center gap-0.5 px-1 py-2 outline-none focus-within:outline-none lg:gap-1` +
        " " +
        props.class
      }
    >
      <div
        class={`iconArea rounded-full px-4 py-1 ${props.active(props.config.url)} group-hover:bg-brand-color-1st group-focus:bg-brand-color-1st`}
      >
        {props.config.icon}
      </div>
      <div class="text-xs">{props.config.btnName}</div>
    </a>
  );
};

const Divider = () => (
  <div class={"Divider hidden py-2 lg:block"}>
    <div class="Line h-[2px] w-12 bg-brand-color-1st"></div>
  </div>
);

export default function Nav() {
  const [dictionary, setDictionary] = createSignal(getDictionary("en"));
  const location = useLocation();
  const active = (path: string) => (location.pathname.includes(path) ? "bg-brand-color-1st" : "");

  createEffect(() => {
    setDictionary(getDictionary(store.settings.language));
  });

  return (
    <Motion.div
      animate={{ transform: "none", opacity: 1 }}
      transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
      class={`Nav z-10 flex w-dvw flex-shrink-0 translate-y-full items-center justify-between bg-area-color opacity-0 lg:h-dvh lg:w-24 lg:-translate-x-1/3 lg:translate-y-0 lg:flex-col lg:py-5`}
    >
      <div class="NavBtnGroup flex flex-1 items-center lg:flex-col lg:gap-0">
        <a
          href={"/"}
          class="Home group flex w-[25dvw] lg:w-auto flex-shrink-0 flex-col items-center gap-0.5 px-1 py-2 outline-none focus-within:outline-none lg:p-0"
          tabIndex={1}
        >
          <div class="iconArea rounded-full px-4 py-1 group-hover:bg-brand-color-1st group-focus:bg-brand-color-1st lg:hidden">
            <Icon.Line.Home />
          </div>
          <Icon.Line.Logo class="hidden lg:block" />
          <div class="text-xs lg:hidden">{dictionary().ui.nav.home}</div>
        </a>
        <div class="WikiGroup flex-shrink-0 lg:pt-6">
          <NavBtn
            config={{
              btnName: "Wiki",
              icon: <Icon.Line.Category2 />,
              url: "/wiki",
            }}
            active={active}
            class="lg:hidden w-[25dvw] lg:w-auto"
          />
          <div class="SubGroup hidden flex-col items-center lg:flex">
            <NavBtn
              config={{
                btnName: dictionary().ui.nav.monsters,
                icon: <Icon.Line.Calendar />,
                url: "/wiki/monster",
              }}
              active={active}
            />
            <Divider />
            <NavBtn
              config={{
                btnName: dictionary().ui.nav.skills,
                icon: <Icon.Line.Basketball />,
                url: "/wiki/skill",
              }}
              active={active}
            />
            <NavBtn
              config={{
                btnName: dictionary().ui.nav.equipments,
                icon: <Icon.Line.Category2 />,
                url: "/wiki/equipment",
              }}
              active={active}
            />
            <NavBtn
              config={{
                btnName: dictionary().ui.nav.crystals,
                icon: <Icon.Line.Box2 />,
                url: "/wiki/crystal",
              }}
              active={active}
            />
            <NavBtn
              config={{
                btnName: dictionary().ui.nav.pets,
                icon: <Icon.Line.Money />,
                url: "/wiki/pet",
              }}
              active={active}
            />
            <NavBtn
              config={{
                btnName: dictionary().ui.nav.items,
                icon: <Icon.Line.Coins />,
                url: "/wiki/building",
              }}
              active={active}
            />
            <Divider />
          </div>
        </div>
        <NavBtn
          config={{
            btnName: dictionary().ui.nav.character,
            icon: <Icon.Line.Gamepad />,
            url: "/character/testCharacterId",
          }}
          active={active}
          class=" w-[25dvw] lg:w-auto"
        />
        <NavBtn
          config={{
            btnName: dictionary().ui.nav.simulator,
            icon: <Icon.Line.Filter />,
            url: "/simulator/testSimulatorId",
          }}
          active={active}
          class=" w-[25dvw] lg:w-auto"
        />
      </div>
      <div class="FunBtnGroup hidden lg:flex items-center justify-center gap-3 px-6 lg:flex-col lg:p-0">
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
