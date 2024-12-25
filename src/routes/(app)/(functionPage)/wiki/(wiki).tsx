import { createEffect, createSignal, JSX, onMount, Show } from "solid-js";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";
import * as Icon from "~/lib/icon";
import Button from "~/components/ui/button";
import { Motion, Presence } from "solid-motionone";

export default function WikiPage() {
  const [dictionary, setDictionary] = createSignal(getDictionary("en"));

  createEffect(() => {
    setDictionary(getDictionary(store.settings.language));
  });

  onMount(() => {
    console.log("--WikiPage Render");
  });

  return (
    <>
      <div class="Content flex flex-col gap-4 p-3">
        <Motion.div
          animate={{
            opacity: [0, 1],
            gridTemplateRows: ["0fr", "1fr"],
          }}
          exit={{
            opacity: [1, 0],
            gridTemplateRows: ["1fr", "0fr"],
            paddingBottom: 0,
            paddingTop: 0,
          }}
          transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.5 : 0 }}
          class={`Bottom grid w-full self-center bg-accent-color p-6 ease-linear dark:bg-area-color lg:w-fit lg:bg-transparent lg:py-20 dark:lg:bg-transparent`}
        >
          <div
            class={`Content flex flex-wrap gap-3 overflow-hidden rounded lg:flex-1 lg:justify-center lg:bg-area-color lg:p-3 lg:backdrop-blur`}
          >
            <a
              tabIndex={2}
              href={"/wiki/monster"}
              class="flex-none basis-[calc(33.33%-8px)] overflow-hidden rounded lg:basis-auto"
            >
              <Button
                class="group w-full flex-col bg-primary-color-10 dark:bg-primary-color dark:text-accent-color lg:w-fit lg:flex-row lg:bg-accent-color"
                level="primary"
                tabIndex={-1}
                icon={
                  <Icon.Filled.Browser class="h-10 w-10 text-brand-color-1st group-hover:text-primary-color group-hover:dark:text-accent-color lg:h-6 lg:w-6" />
                }
              >
                <span class="text-ellipsis text-nowrap text-sm lg:text-base">{dictionary().ui.nav.mobs}</span>
              </Button>
            </a>
            <a
              tabIndex={2}
              href={"/wiki/skill"}
              class="flex-none basis-[calc(33.33%-8px)] overflow-hidden rounded lg:basis-auto"
            >
              <Button
                class="group w-full flex-col bg-primary-color-10 dark:bg-primary-color dark:text-accent-color lg:w-fit lg:flex-row lg:bg-accent-color"
                level="primary"
                tabIndex={-1}
                icon={
                  <Icon.Filled.Basketball class="h-10 w-10 text-brand-color-2nd group-hover:text-primary-color group-hover:dark:text-accent-color lg:h-6 lg:w-6" />
                }
              >
                <span class="text-ellipsis text-nowrap text-sm lg:text-base">{dictionary().ui.nav.skills}</span>
              </Button>
            </a>
            <a
              tabIndex={2}
              href={"/wiki/equipment"}
              class="flex-none basis-[calc(33.33%-8px)] overflow-hidden rounded lg:basis-auto"
            >
              <Button
                class="group w-full flex-col bg-primary-color-10 dark:bg-primary-color dark:text-accent-color lg:w-fit lg:flex-row lg:bg-accent-color"
                level="primary"
                tabIndex={-1}
                icon={
                  <Icon.Filled.Category2 class="h-10 w-10 text-brand-color-3rd group-hover:text-primary-color group-hover:dark:text-accent-color lg:h-6 lg:w-6" />
                }
              >
                <span class="text-ellipsis text-nowrap text-sm lg:text-base">{dictionary().ui.nav.equipments}</span>
              </Button>
            </a>
            <a
              tabIndex={2}
              href={"/wiki/crystal"}
              class="flex-none basis-[calc(33.33%-8px)] overflow-hidden rounded lg:basis-auto"
            >
              <Button
                class="group w-full flex-col bg-primary-color-10 dark:bg-primary-color dark:text-accent-color lg:w-fit lg:flex-row lg:bg-accent-color"
                level="primary"
                tabIndex={-1}
                icon={
                  <Icon.Filled.Box2 class="h-10 w-10 text-brand-color-1st group-hover:text-primary-color group-hover:dark:text-accent-color lg:h-6 lg:w-6" />
                }
              >
                <span class="text-ellipsis text-nowrap text-sm lg:text-base">{dictionary().ui.nav.crystals}</span>
              </Button>
            </a>
            <a
              tabIndex={2}
              href={"/wiki/pet"}
              class="flex-none basis-[calc(33.33%-8px)] overflow-hidden rounded lg:basis-auto"
            >
              <Button
                class="group w-full flex-col bg-primary-color-10 dark:bg-primary-color dark:text-accent-color lg:w-fit lg:flex-row lg:bg-accent-color"
                level="primary"
                tabIndex={-1}
                icon={
                  <Icon.Filled.Heart class="h-10 w-10 text-brand-color-2nd group-hover:text-primary-color group-hover:dark:text-accent-color lg:h-6 lg:w-6" />
                }
              >
                <span class="text-ellipsis text-nowrap text-sm lg:text-base">{dictionary().ui.nav.pets}</span>
              </Button>
            </a>
            <a
              tabIndex={2}
              href={"/building"}
              class="flex-none basis-[calc(33.33%-8px)] overflow-hidden rounded lg:basis-auto"
            >
              <Button
                class="group w-full flex-col bg-primary-color-10 dark:bg-primary-color dark:text-accent-color lg:w-fit lg:flex-row lg:bg-accent-color"
                level="primary"
                tabIndex={-1}
                icon={
                  <Icon.Filled.Layers class="h-10 w-10 text-brand-color-3rd group-hover:text-primary-color group-hover:dark:text-accent-color lg:h-6 lg:w-6" />
                }
              >
                <span class="text-ellipsis text-nowrap text-sm lg:text-base">{dictionary().ui.nav.items}</span>
              </Button>
            </a>
            <a
              tabIndex={2}
              href={"/character"}
              class="flex-none basis-[calc(33.33%-8px)] overflow-hidden rounded lg:basis-auto"
            >
              <Button
                class="group w-full flex-col bg-primary-color-10 dark:bg-primary-color dark:text-accent-color lg:w-fit lg:flex-row lg:bg-accent-color"
                level="primary"
                tabIndex={-1}
                icon={
                  <Icon.Filled.User class="h-10 w-10 text-brand-color-1st group-hover:text-primary-color group-hover:dark:text-accent-color lg:h-6 lg:w-6" />
                }
              >
                <span class="text-ellipsis text-nowrap text-sm lg:text-base">{dictionary().ui.nav.character}</span>
              </Button>
            </a>
            <a
              tabIndex={2}
              href={"/simulator/testSimulatorId"}
              class="flex-none basis-[calc(33.33%-8px)] overflow-hidden rounded lg:basis-auto"
            >
              <Button
                class="group w-full flex-col bg-primary-color-10 dark:bg-primary-color dark:text-accent-color lg:w-fit lg:flex-row lg:bg-accent-color"
                level="primary"
                tabIndex={-1}
                icon={
                  <Icon.Filled.Gamepad class="h-10 w-10 text-brand-color-2nd group-hover:text-primary-color group-hover:dark:text-accent-color lg:h-6 lg:w-6" />
                }
              >
                <span class="text-ellipsis text-nowrap text-sm lg:text-base">{dictionary().ui.nav.simulator}</span>
              </Button>
            </a>
          </div>
        </Motion.div>
      </div>
    </>
  );
}
