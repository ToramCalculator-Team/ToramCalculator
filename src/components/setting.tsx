import { setStore, store } from "~/store";
import Dialog from "./dialog";
import { For, JSX, onMount, Show } from "solid-js";
import { dictionary, i18n, Locale } from "~/i18n";
import { Motion, Presence } from "solid-motionone";
import Button from "./button";

export default function Setting() {
  onMount(() => {
    console.log("--DialogBox render");
    return () => {
      console.log("--DialogBox unmount");
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
          animate={{ transform: "scale(1)", opacity: [0,1] }}
          exit={{ transform: "scale(1.2)", opacity: 0 }}
          transition={{ duration: store.durtion ? 0.3 : 0 }}
          class={`SettingBox grid place-items-center fixed left-0 top-0 h-dvh w-dvw scale-[120%] overflow-y-auto bg-primary-color`}
        >
          <div class={`SettingForm w-full h-full flex flex-1 flex-col gap-4 overflow-y-auto rounded px-3 lg:max-w-[1536px]`}>
            <div
              class="FormTitle flex justify-between p-3"
              onClick={() => setStore("settingsDialogState", false)}
            >
              <h1 class="text-3xl font-bold">{dictionary().ui.settings.title}</h1>
              <Button>{dictionary().ui.actions.close}</Button>
            </div>
            <div class="FormContent flex flex-1 lg:flex-row">
              <div class="Nav hidden w-60 flex-col gap-2 border-r-2 border-transition-color-8 lg:flex"></div>
              <div class="ModuleContent flex w-full flex-col gap-4">
                <div class="Module UI flex flex-col gap-2">
                  <label class="Durtion flex flex-col">
                    <span class="text-sm">{dictionary().ui.settings.isAnimationEnabled}</span>
                    <input
                      type="checkbox"
                      checked={store.durtion}
                      onChange={(e) => {
                        setStore("durtion", e.currentTarget.checked);
                      }}
                    />
                  </label>
                  <label class="Location flex flex-col">
                    {dictionary().ui.settings.selectedLanguage}:
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
        </Motion.div>
        {/* <div
            class="DialogCloseBtn flex-1 cursor-pointer"
            onClick={() => setStore("settingsDialogState", false)}
          ></div> */}
      </Show>
    </Presence>
  );
}
