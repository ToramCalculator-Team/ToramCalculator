import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { ParentProps } from "solid-js";
import { Motion } from "solid-motionone";
import { setStore, store } from "~/store";
import { useLocation } from "@solidjs/router";
import * as Icon from "~/components/icon";
import { getDictionary } from "~/locales/i18n";
import { createEffect, createSignal, JSX } from "solid-js";
import Button from "~/components/controls/button";

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
        class={`iconArea rounded-full p-3 lg:px-4 lg:py-1 ${props.active(props.config.url)} group-hover:bg-area-color group-focus:bg-area-color lg:group-hover:bg-brand-color-1st lg:group-focus:bg-brand-color-1st`}
      >
        {props.config.icon}
      </div>
      <div class="hidden text-xs lg:block">{props.config.btnName}</div>
    </a>
  );
};

const Divider = () => (
  <div class={"Divider hidden py-2 lg:flex lg:justify-center"}>
    <div class="Line h-[2px] w-12 bg-brand-color-1st"></div>
  </div>
);

const Nav = () => {
  const [dictionary, setDictionary] = createSignal(getDictionary("en"));
  const [wikiClass, setWikiClass] = createSignal("mob");
  const location = useLocation();
  const active = (path: string) => (location.pathname.includes(path) ? "bg-area-color lg:bg-brand-color-1st" : "");

  createEffect(() => {
    setDictionary(getDictionary(store.settings.language));
  });

  return (
    <Motion.div
      animate={{ transform: "none", opacity: 1 }}
      transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
      class={`Nav z-10 flex w-dvw translate-y-full items-center justify-between bg-primary-color py-2 opacity-0 lg:h-dvh lg:w-24 lg:-translate-x-1/3 lg:translate-y-0 lg:flex-col lg:bg-area-color lg:py-5`}
    >
      <div class="NavBtnGroup flex items-center overflow-y-hidden lg:flex-col lg:gap-0">
        <a
          href={"/"}
          class="Home group hidden w-[20dvw] flex-shrink-0 flex-col items-center gap-0.5 px-1 py-2 outline-none focus-within:outline-none lg:flex lg:w-auto lg:p-0 lg:pb-6"
          tabIndex={1}
        >
          <div class="iconArea rounded-full px-4 py-1 group-hover:bg-brand-color-1st group-focus:bg-brand-color-1st lg:hidden">
            <Icon.Line.Home />
          </div>
          <Icon.Line.Logo class="hidden lg:block" />
          <div class="text-xs lg:hidden">{dictionary().ui.nav.home}</div>
        </a>
        <div class="WikiGroup flex flex-col overflow-y-hidden">
          <NavBtn
            config={{
              btnName: "Wiki",
              icon: <Icon.Line.Category2 />,
              url: `/wiki/${wikiClass()}`,
            }}
            active={active}
            class="w-[20dvw] lg:hidden"
          />
          <NavBtn
            config={{
              btnName: dictionary().ui.nav.mobs,
              icon: <Icon.Line.Calendar />,
              url: "/wiki/mob",
            }}
            active={active}
            class="hidden lg:flex lg:w-auto"
          />
          <Divider />
          <OverlayScrollbarsComponent
            element="div"
            options={{ scrollbars: { autoHide: "scroll" } }}
            defer
            class="SubGroup !hidden flex-shrink flex-col overflow-y-auto lg:!flex"
          >
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
          </OverlayScrollbarsComponent>
        </div>
        <Divider />
        <NavBtn
          config={{
            btnName: dictionary().ui.nav.character,
            icon: <Icon.Line.Gamepad />,
            url: "/character/defaultCharacterId",
          }}
          active={active}
          class="w-[20dvw] lg:w-auto"
        />
        <div class="ModuleSwitcher flex w-[20dvw] items-center justify-center lg:hidden">
          <div class="Btn h-12 w-12 rounded-full bg-accent-color p-1">
            <div class="Ring flex h-full w-full items-center justify-center rounded-full border border-primary-color text-primary-color">
              53
            </div>
          </div>
        </div>
        <NavBtn
          config={{
            btnName: dictionary().ui.nav.simulator,
            icon: <Icon.Line.Filter />,
            url: "/simulator/defaultSimulatorId",
          }}
          active={active}
          class="w-[20dvw] lg:w-auto"
        />
      </div>
      <div class="FunBtnGroup items-center justify-center gap-3 lg:flex lg:flex-col">
        <Button
          level="quaternary"
          class="hidden rounded-full bg-transparent px-2 py-2 lg:flex"
          onClick={() => setStore("theme", store.theme == "dark" ? "light" : "dark")}
        >
          <Icon.Line.Light />
        </Button>
        <Button
          level="quaternary"
          class="hidden rounded-full bg-transparent px-2 py-2 lg:flex"
          onClick={() => setStore("settingsDialogState", true)}
        >
          <Icon.Line.Settings />
        </Button>
        <NavBtn
          config={{
            btnName: dictionary().ui.nav.profile,
            icon: <Icon.Line.User />,
            url: "/profile",
          }}
          active={active}
          class="w-[20dvw] lg:hidden"
        />
      </div>
    </Motion.div>
  );
};

export default function Home(props: ParentProps) {
  return (
    <Motion.main class="flex h-full w-full flex-col-reverse lg:flex-row">
      <Nav />
      <OverlayScrollbarsComponent
        element="div"
        options={{ scrollbars: { autoHide: "scroll" } }}
        defer
        class="z-50 h-full w-full"
      >
        <Motion.div
          animate={{ opacity: 1 }}
          transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0 }}
          id="mainContent"
          class="Content flex min-h-full w-full flex-1 flex-col opacity-0"
        >
          {props.children}
        </Motion.div>
      </OverlayScrollbarsComponent>
    </Motion.main>
  );
}
