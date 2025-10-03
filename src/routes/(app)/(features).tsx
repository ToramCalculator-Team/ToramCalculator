import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { createMemo, For, onMount, ParentProps, Show, useContext } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { setStore, store } from "~/store";
import { A, useLocation, useNavigate } from "@solidjs/router";
import Icons from "~/components/icons/index";
import { getDictionary } from "~/locales/i18n";
import { createEffect, createSignal, JSX } from "solid-js";
import { Button } from "~/components/controls/button";
import { MediaContext } from "~/lib/contexts/Media";
import { DB } from "@db/generated/kysely/kysely";

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
    <A
      href={props.config.url}
      tabIndex={0}
      class={
        `NavBtn w-[20dvw] landscape:w-auto btn-${props.config.btnName} group flex shrink-0 flex-col items-center gap-0.5 px-1 py-2 outline-hidden focus-within:outline-hidden landscape:gap-1` +
        " " +
        props.class
      }
    >
      <div
        class={`iconArea rounded-full p-3 lg:px-4 lg:py-1 ${props.active(props.config.url)} group-hover:bg-area-color group-focus:bg-area-color lg:group-hover:bg-brand-color-1st lg:group-focus:bg-brand-color-1st`}
      >
        {props.config.icon}
      </div>
      <div class="hidden text-xs landscape:block">{props.config.btnName}</div>
    </A>
  );
};

const Divider = () => (
  <div class={"Divider hidden py-2 lg:flex lg:justify-center"}>
    <div class="Line bg-brand-color-1st h-[2px] w-12"></div>
  </div>
);

const Nav = () => {
  const [display, setDisplay] = createSignal(false);
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));
  const navigate = useNavigate();
  const media = useContext(MediaContext);
  const location = useLocation();
  const active = (path: string) => {
    let condition = false;
    if (path === "/") {
    } else if (location.pathname.includes(path)) {
      condition = true;
    }
    return condition ? "bg-area-color lg:bg-brand-color-1st" : "";
  };
  const navHiddenTables: (keyof DB)[] = [
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
      animate={{
        transform: [media.orientation === "landscape" ? "" : "translateY(100%)", "translateY(0)"],
        opacity: [0, 1],
      }}
      onMouseEnter={() => setDisplay(true)}
      onMouseLeave={() => setDisplay(false)}
      transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
      class={`Nav w-dvw py-2 landscape:h-dvh landscape:w-24 ${display() ? "lg:landscape:bg-area-color lg:landscape:w-24" : "lg:landscape:w-[1px] lg:landscape:bg-transparent"} landscape:py-5`}
    >
      <div
        class={`Content flex ${display() ? "lg:landscape:opacity-100" : "lg:landscape:opacity-0"} h-full w-full items-center landscape:flex-col landscape:gap-2 lg:landscape:gap-8`}
      >
        <a href={"/"} class="Home hidden landscape:flex items-center justify-center" tabIndex={1}>
          <Icons.Outline.Logo />
        </a>
        <OverlayScrollbarsComponent
          element="div"
          options={{ scrollbars: { autoHide: "scroll" } }}
          defer
          class="h-full w-full!"
        >
          <div class="NavBtnGroup item-center flex shrink landscape:flex-col">
            <NavBtn
              config={{
                btnName: dictionary().ui.nav.home,
                icon: <Icons.Outline.Home />,
                url: "/",
              }}
              active={active}
              class="Home landscape:hidden"
            />
            <NavBtn
              config={{
                btnName: dictionary().db.mob.selfName,
                icon: <Icons.Outline.Calendar />,
                url: "/wiki/mob",
              }}
              active={active}
              class="Home landscape:hidden"
            />
            <div class="WikiGroup hidden items-center landscape:flex landscape:flex-col">
              <NavBtn
                config={{
                  btnName: dictionary().db.mob.selfName,
                  icon: <Icons.Outline.Calendar />,
                  url: "/wiki/mob",
                }}
                active={active}
                class="hidden landscape:flex landscape:w-auto"
              />
              <NavBtn
                config={{
                  btnName: dictionary().db.skill.selfName,
                  icon: <Icons.Outline.Basketball />,
                  url: "/wiki/skill",
                }}
                active={active}
              />
              <NavBtn
                config={{
                  btnName: dictionary().db.weapon.selfName,
                  icon: <Icons.Outline.Category2 />,
                  url: "/wiki/weapon",
                }}
                active={active}
              />
              <NavBtn
                config={{
                  btnName: dictionary().db.crystal.selfName,
                  icon: <Icons.Outline.Box2 />,
                  url: "/wiki/crystal",
                }}
                active={active}
              />
              <NavBtn
                config={{
                  btnName: dictionary().db.player_pet.selfName,
                  icon: <Icons.Outline.Money />,
                  url: "/wiki/player_pet",
                }}
                active={active}
              />
            </div>
            <Divider />
            <div class="CalculatorGroup flex items-center landscape:flex-col landscape:gap-0">
              <div
                class={`ModuleSwitcher flex w-[20dvw] items-center justify-center landscape:hidden`}
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
                  icon: <Icons.Outline.Gamepad />,
                  url: "/character/defaultCharacterId",
                }}
                active={active}
                class={`w-[20dvw] landscape:w-auto`}
              />
              <NavBtn
                config={{
                  btnName: dictionary().ui.nav.simulator,
                  icon: <Icons.Outline.Filter />,
                  url: "/simulator/defaultSimulatorId",
                }}
                active={active}
                class={`hidden w-[20dvw] landscape:flex landscape:w-auto`}
              />
            </div>
          </div>
        </OverlayScrollbarsComponent>
        <div class={`FunBtnGroup lanscape:flex lanscape:flex-col items-center justify-center gap-3`}>
          {/* <Button
          level="quaternary"
          class="hidden rounded-full bg-transparent px-2 py-2 landscape:flex"
          onClick={() => setStore("theme", store.theme == "dark" ? "light" : "dark")}
        >
          <Icons.Outline.Light />
        </Button> */}
          <NavBtn
            config={{
              btnName: dictionary().ui.nav.profile,
              icon: <Icons.Outline.User />,
              url: "/profile",
            }}
            active={active}
            class="w-[20dvw] landscape:hidden"
          />
          <Button
            level="quaternary"
            class="hidden rounded-full bg-transparent px-2 py-2 landscape:flex"
            onClick={() => setStore("settingsDialogState", true)}
          >
            <Icons.Outline.Settings />
          </Button>
        </div>
      </div>
    </Motion.div>
  );
};

export default function FunctionPage(props: ParentProps) {
  onMount(() => {
    console.log("--FunctionPage Render");
  });

  return (
    <Motion.main class="flex h-full w-full flex-col-reverse landscape:flex-row">
      <Nav />
      {/* <OverlayScrollbarsComponent
        element="div"
        options={{ scrollbars: { autoHide: "scroll" } }}
        defer
        id="mainContent"
        class="z-40 h-full w-full landscape:landscape:px-12 bg-primary-color-90"
        style={{
          "transition-duration": "all 0s !important"
        }}
      > */}
      <Motion.div
        animate={{ opacity: [0, 1] }}
        transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.7 : 0 }}
        id="mainContent"
        class="Content z-40 flex h-full w-full flex-col overflow-hidden lg:landscape:px-12"
      >
        {props.children}
      </Motion.div>
      {/* </OverlayScrollbarsComponent> */}
    </Motion.main>
  );
}
