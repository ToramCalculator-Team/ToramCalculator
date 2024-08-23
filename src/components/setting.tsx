import { setStore, store } from "~/store";
import * as Icon from "~/components/icon";
import { createMemo, For, JSX, onMount, Show } from "solid-js";
import { getDictionary, i18n, Locale } from "~/i18n";
import { Motion, Presence } from "solid-motionone";
import Button from "./button";

export default function Setting() {
  const dictionary = createMemo(() => getDictionary(store.location));

  onMount(() => {
    console.log("--DialogBox render");

    // esc键监听
    const handleEscapeKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setStore("settingsDialogState", false);
        e.stopPropagation(); // 阻止事件继续冒泡
      }
    };

    document.addEventListener("keydown", handleEscapeKeyPress);
    return () => {
      console.log("--DialogBox unmount");
      document.addEventListener("keydown", handleEscapeKeyPress);
    };
  });

  return (
    <Presence exitBeforeEnter>
      <Show when={store.settingsDialogState}>
        {/* <div
            class="DialogCloseBtn flex-1 cursor-pointer"
            onClick={() => setStore("settingsDialogState", false)}
          ></div> */}
        <Motion.div
          animate={{ transform: "scale(1)", opacity: [0, 1] }}
          exit={{ transform: "scale(1.05)", opacity: 0 }}
          transition={{ duration: store.durtion ? 0.3 : 0 }}
          class={`SettingBox fixed left-0 top-0 grid h-dvh w-dvw scale-[105%] place-items-center bg-primary-color`}
        >
          <div class={`SettingForm flex h-dvh w-full flex-1 flex-col gap-3 rounded p-3 lg:max-w-7xl`}>
            <div class="FormTitle flex justify-between">
              <h1 class="text-2xl font-bold">{dictionary().ui.settings.title}</h1>
              <Button level="tertiary" onClick={() => setStore("settingsDialogState", false)}>
                <Icon.Line.Close />
              </Button>
            </div>
            <div class="FormContent overflow-hidden flex flex-1 flex-row items-start">
              <div class="Nav mr-3 hidden w-60 flex-col gap-2 rounded-md bg-transition-color-8 p-3 lg:flex">
                <Button level="tertiary" class="bg-transparent">
                  <Icon.Line.Box2 />
                  <span class="w-full text-left">{dictionary().ui.nav.crystals}</span>
                </Button>
                <Button level="tertiary" class="bg-transparent">
                  <Icon.Line.Box2 />
                  <span class="w-full text-left">{dictionary().ui.nav.crystals}</span>
                </Button>
              </div>
              <div class="List overflow-y-auto flex flex-1 h-full flex-col items-stretch gap-3">
                <div class="Module UI flex flex-col gap-1 rounded-md bg-transition-color-8 p-3">
                  <h2 class="p-2 text-lg font-bold">外观</h2>
                  <div class="LabelGroup flex flex-col gap-1">
                    <label class="Durtion flex flex-col items-start gap-2 rounded-md border-1.5 border-transition-color-20 bg-primary-color p-3">
                      <div class="Dsicription flex flex-col gap-2">
                        <h3>{dictionary().ui.settings.isAnimationEnabled}</h3>
                        <span class="text-sm text-accent-color-70">
                          Innovation distinguishes between a leader and a follower. 领袖和跟风者的区别就在于创新。
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={store.durtion}
                        onChange={(e) => {
                          setStore("durtion", e.currentTarget.checked);
                        }}
                      />
                    </label>
                    <label class="Location flex flex-col items-start gap-2 rounded-md border-1.5 border-transition-color-20 bg-primary-color p-3">
                      <div class="Dsicription flex flex-col gap-2">
                        <h3>{dictionary().ui.settings.selectedLanguage}</h3>
                        <span class="text-sm text-accent-color-70">
                          Innovation distinguishes between a leader and a follower. 领袖和跟风者的区别就在于创新。
                        </span>
                      </div>
                      <select
                        name="Language"
                        value={store.location}
                        onChange={(e) => setStore("location", e.currentTarget.value as Locale)}
                      >
                        <For each={i18n.locales} fallback={<option value="">--Please choose an option--</option>}>
                          {(item) => <option value={item}>{item}</option>}
                        </For>
                      </select>
                    </label>
                  </div>
                </div>
                <div class="Module UI flex flex-col gap-1 rounded-md bg-transition-color-8 p-3">
                  <h2 class="p-2 text-lg font-bold">外观</h2>
                  <div class="LabelGroup flex flex-col gap-1">
                    <label class="Durtion flex flex-col items-start gap-2 rounded-md border-1.5 border-transition-color-20 bg-primary-color p-3">
                      <div class="Dsicription flex flex-col gap-2">
                        <h3>{dictionary().ui.settings.isAnimationEnabled}</h3>
                        <span class="text-sm text-accent-color-70">
                          Innovation distinguishes between a leader and a follower. 领袖和跟风者的区别就在于创新。
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={store.durtion}
                        onChange={(e) => {
                          setStore("durtion", e.currentTarget.checked);
                        }}
                      />
                    </label>
                    <label class="Location flex flex-col items-start gap-2 rounded-md border-1.5 border-transition-color-20 bg-primary-color p-3">
                      <div class="Dsicription flex flex-col gap-2">
                        <h3>{dictionary().ui.settings.selectedLanguage}</h3>
                        <span class="text-sm text-accent-color-70">
                          Innovation distinguishes between a leader and a follower. 领袖和跟风者的区别就在于创新。
                        </span>
                      </div>
                      <select
                        name="Language"
                        value={store.location}
                        onChange={(e) => setStore("location", e.currentTarget.value as Locale)}
                      >
                        <For each={i18n.locales} fallback={<option value="">--Please choose an option--</option>}>
                          {(item) => <option value={item}>{item}</option>}
                        </For>
                      </select>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Motion.div>
        {/* <div
            class="DialogCloseBtn flex-1 cursor-pointer"
            onClick={() => setStore("settingsDialogState", false)}
          ></div> */}
      </Show>
    </Presence>
  );
}
