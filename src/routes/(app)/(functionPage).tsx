import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { createMemo, For, onMount, ParentProps, Show } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { setStore, store } from "~/store";
import { useLocation } from "@solidjs/router";
import * as Icon from "~/components/icon";
import { getDictionary } from "~/locales/i18n";
import { createEffect, createSignal, JSX } from "solid-js";
import Button from "~/components/controls/button";
import { DataEnums } from "../../../db/dataEnums";

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
        `NavBtn w-[20dvw] landscape:w-auto btn-${props.config.btnName} group flex shrink-0 flex-col items-center gap-0.5 px-1 py-2 outline-hidden focus-within:outline-hidden lg:gap-1` +
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
    <div class="Line bg-brand-color-1st h-[2px] w-12"></div>
  </div>
);

const Nav = () => {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));
  const [isWikiOpen, setIsWikiOpen] = createSignal(false);
  const [isNavDialogOpen, setIsNavDialogOpen] = createSignal(false);
  const [wikiClass, setWikiClass] = createSignal<keyof DataEnums>("mob");
  const [wikiTableFilterRef, setWikiTableFilterRef] = createSignal<HTMLInputElement>();
  const location = useLocation();
  const active = (path: string) => (location.pathname.includes(path) ? "bg-area-color lg:bg-brand-color-1st" : "");
  const [isPc] = createSignal(window.innerWidth > 1024);
  const navHiddenTables: (keyof DataEnums)[] = [
    "verification_token",
    "account",
    "account_create_data",
    "account_update_data",
    "avatar",
    "character",
    "character_skill",
    "combo",
    "combo_step",
    "drop_item",
    "image",
    "member",
    "mercenary",
    "player",
    "player_armor",
    "player_option",
    "player_pet",
    "player_special",
    "player_weapon",
    "post",
    "recipe_ingredient",
    "session",
    "skill_effect",
    "statistic",
    "task_collect_require",
    "task_kill_requirement",
    "task_reward",
    "user",
  ];

  return (
    <Motion.div
      animate={{ transform: [isPc() ? "translateX(-30%)" : "translateY(100%)", "translateY(0)"], opacity: [0, 1] }}
      transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
      class={`Nav ${isNavDialogOpen() ? "z-50" : "z-10"} bg-primary-color lg:bg-area-color flex w-dvw items-center landscape:gap-8 py-2 lg:h-dvh lg:w-24 lg:flex-col lg:py-5`}
    >

      <a
        href={"/"}
        class="Home group hidden landscape:block"
        tabIndex={1}
      >
        <Icon.Line.Logo />
      </a>
      <OverlayScrollbarsComponent
        element="div"
        options={{ scrollbars: { autoHide: "scroll" } }}
        defer
        class="w-full! h-full"
      >
        <div class="NavBtnGroup item-center flex landscape:flex-col shrink">
          <NavBtn
            config={{
              btnName: dictionary().ui.nav.home,
              icon: <Icon.Line.Home />,
              url: "/",
            }}
            active={active}
            class="Home landscape:hidden"
          />
          <NavBtn
            config={{
              btnName: dictionary().ui.nav.mobs,
              icon: <Icon.Line.Calendar />,
              url: "/wiki/mob",
            }}
            active={active}
            class="Home landscape:hidden"
          />
          <div class="WikiGroup hidden landscape:flex items-center landscape:flex-col">
            <NavBtn
              config={{
                btnName: dictionary().ui.nav.mobs,
                icon: <Icon.Line.Calendar />,
                url: "/wiki/mob",
              }}
              active={active}
              class="hidden lg:flex lg:w-auto"
            />
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
          </div>
          <Divider />
          <div class="CalculatorGroup flex items-center lg:flex-col lg:gap-0">
            <div
              class={`ModuleSwitcher  flex w-[20dvw] items-center justify-center lg:hidden`}
              onClick={() => console.log("/simulator/defaultSimulatorId")}
            >
              <div class="Btn bg-accent-color h-12 w-12 rounded-full p-1">
                <div class="Ring border-primary-color text-primary-color flex h-full w-full items-center justify-center rounded-full border">
                  53
                </div>
              </div>
            </div>
            <NavBtn
              config={{
                btnName: dictionary().ui.nav.character,
                icon: <Icon.Line.Gamepad />,
                url: "/character/defaultCharacterId",
              }}
              active={active}
              class={`w-[20dvw] lg:w-auto `}
            />
            <NavBtn
              config={{
                btnName: dictionary().ui.nav.simulator,
                icon: <Icon.Line.Filter />,
                url: "/character/defaultSimulatorId",
              }}
              active={active}
              class={`w-[20dvw] lg:w-auto hidden landscape:flex`}
            />
          </div>
        </div>
      </OverlayScrollbarsComponent>
      <div class={`FunBtnGroup items-center justify-center gap-3 lanscape:flex lanscape:flex-col`}>
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

export default function FunctionPage(props: ParentProps) {

  onMount(() => {
    console.log("--FunctionPage Render");
  });

  return (
    <Motion.main class="flex h-full w-full flex-col-reverse lg:flex-row">
      <Nav />
      {/* <OverlayScrollbarsComponent
        element="div"
        options={{ scrollbars: { autoHide: "scroll" } }}
        defer
        id="mainContent"
        class="z-40 h-full w-full lg:landscape:px-12 bg-primary-color-90"
        style={{
          "transition-duration": "all 0s !important"
        }}
      > */}
      <Motion.div
        animate={{ opacity: 1 }}
        transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0 }}
        id="mainContent"
        class="Content bg-primary-color-90 z-40 flex h-full w-full flex-col overflow-hidden lg:landscape:px-12"
      >
        {props.children}
      </Motion.div>
      {/* </OverlayScrollbarsComponent> */}
    </Motion.main>
  );
}
