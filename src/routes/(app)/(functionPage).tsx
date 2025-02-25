import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { createMemo, For, ParentProps, Show } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { setStore, store } from "~/store";
import { useLocation } from "@solidjs/router";
import * as Icon from "~/components/icon";
import { getDictionary } from "~/locales/i18n";
import { createEffect, createSignal, JSX } from "solid-js";
import Button from "~/components/controls/button";
import Input from "~/components/controls/input";
import { WIKISCHEMA_TYPE } from "~/repositories/enums";

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
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));
  const [isWikiOpen, setIsWikiOpen] = createSignal(false);
  const [isNavDialogOpen, setIsNavDialogOpen] = createSignal(false);
  const [wikiClass, setWikiClass] = createSignal("mob");
  const [wikiTableFilterRef, setWikiTableFilterRef] = createSignal<HTMLInputElement>();
  const location = useLocation();
  const active = (path: string) => (location.pathname.includes(path) ? "bg-area-color lg:bg-brand-color-1st" : "");

  return (
    <Motion.div
      animate={{ transform: "none", opacity: 1 }}
      transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
      class={`Nav ${isNavDialogOpen() ? "z-50" : "z-10"} flex w-dvw translate-y-full items-center justify-between bg-primary-color py-2 opacity-0 lg:h-dvh lg:w-24 lg:-translate-x-1/3 lg:translate-y-0 lg:flex-col lg:bg-area-color lg:py-5`}
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
        <div class="WikiGroup flex items-center overflow-y-hidden lg:flex-col">
          {/* 移动端wiki切换按钮 */}
          <a
            href={`/wiki/${wikiClass()}`}
            onclick={() => setIsWikiOpen(!isWikiOpen())}
            tabIndex={0}
            class={`NavBtn btn-Wiki group flex w-[20dvw] flex-shrink-0 flex-col items-center gap-0.5 px-1 py-2 outline-none focus-within:outline-none lg:hidden lg:gap-1`}
          >
            <div
              class={`iconArea rounded-full p-3 lg:px-4 lg:py-1 ${active(`/wiki/${wikiClass()}`)} group-hover:bg-area-color group-focus:bg-area-color lg:group-hover:bg-brand-color-1st lg:group-focus:bg-brand-color-1st`}
            >
              <Show
                when={isWikiOpen()}
                fallback={
                  <Motion.div
                    animate={{ transform: "none", opacity: 1 }}
                    transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
                    class="h-6 w-6 rotate-90"
                  >
                    <Icon.Line.Calendar />
                  </Motion.div>
                }
              >
                <Motion.div
                  animate={{ transform: "none", opacity: 1 }}
                  transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
                  class="h-6 w-6 rotate-90"
                >
                  <Icon.Line.Category2 />
                </Motion.div>
              </Show>
            </div>
            <div class="hidden text-xs lg:block">Wiki</div>
          </a>
          <Show when={isWikiOpen()}>
            <div class={`${isWikiOpen() ? "" : ""} WikiPageMeun flex h-full w-full items-center gap-1 pr-3`}>
              <Button class="bg-primary-color" onClick={() => setIsNavDialogOpen(!isNavDialogOpen())}>
                <Icon.Line.Receipt />
              </Button>
              <input
                onInput={() => setStore("wiki", "filterStr", wikiTableFilterRef()?.value ?? "")}
                ref={setWikiTableFilterRef}
                class="w-full rounded bg-area-color p-3"
              />
              <Button class="bg-primary-color">
                <Icon.Line.Settings />
              </Button>
            </div>
          </Show>
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
          class={`w-[20dvw] lg:w-auto ${isWikiOpen() ? "hidden" : ""}`}
        />
        <div
          class={`ModuleSwitcher ${isWikiOpen() ? "hidden" : ""} flex w-[20dvw] items-center justify-center lg:hidden`}
        >
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
          class={`w-[20dvw] lg:w-auto ${isWikiOpen() ? "hidden" : ""}`}
        />
      </div>
      <div class={`FunBtnGroup ${isWikiOpen() ? "hidden" : ""} items-center justify-center gap-3 lg:flex lg:flex-col`}>
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

      <Presence exitBeforeEnter>
        <Show when={isNavDialogOpen()}>
          <Motion.div
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
            class={`NavDialogBox fixed left-0 top-0 z-50 flex h-full w-full flex-col items-center bg-area-color opacity-0`}
          >
            <div
              class={`DialogCloseBtn block flex-1 cursor-pointer self-stretch`}
              onClick={() => setIsNavDialogOpen(!isNavDialogOpen())}
            ></div>
            <Motion.div
              animate={{ transform: "translateY(0)" }}
              exit={{ transform: "translateY(24px)" }}
              transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
              class={`DialogContent flex min-h-12 w-[calc(100%-48px)] translate-y-6 flex-wrap items-center overflow-y-auto rounded bg-primary-color shadow-2xl shadow-dividing-color`}
            >
              <For each={WIKISCHEMA_TYPE}>
                {(schemaName) => {
                  return (
                    <a
                      class={`${schemaName} w-1/3 p-3 overflow-hidden text-ellipsis`}
                      onClick={() => setWikiClass(schemaName)}
                      href={`/wiki/${wikiClass()}`}
                    >
                      {schemaName}
                    </a>
                  );
                }}
              </For>
            </Motion.div>
            <div
              class="DialogCloseBtn h-20 cursor-pointer self-stretch"
              onClick={() => setIsNavDialogOpen(!isNavDialogOpen())}
            ></div>
          </Motion.div>
        </Show>
      </Presence>
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
        class="z-40 h-full w-full"
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
