import { setStore, store } from "~/store";
import * as Icon from "~/components/icon";
import { createEffect, createMemo, createSignal, onMount, Show } from "solid-js";
import { getDictionary } from "~/i18n";
import { Motion, Presence } from "solid-motionone";
import Button from "./button";
import Toggle from "./toggle";
import CheckBox from "./checkBox";

export default function Setting() {
  const [dictionary, setDictionary] = createSignal(getDictionary("en"));

  createEffect(() => {
    setDictionary(getDictionary(store.settings.language));
  })

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
        <Motion.div
          animate={{ transform: "scale(1)", opacity: [0, 1] }}
          exit={{ transform: "scale(1.05)", opacity: 0 }}
          transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
          class={`SettingBox fixed left-0 top-0 grid h-dvh w-dvw scale-[105%] place-items-center bg-primary-color`}
        >
          <div class={`SettingForm flex h-dvh w-full flex-1 flex-col gap-3 rounded p-3 lg:max-w-7xl`}>
            <div class="FormTitle items-center flex justify-between">
              <h1 class="text-2xl font-bold">{dictionary().ui.settings.title}</h1>
              <Button level="tertiary" onClick={() => setStore("settingsDialogState", false)}>
                <Icon.Line.Close />
              </Button>
            </div>
            <div class="FormContent flex flex-1 flex-row items-start overflow-hidden">
              <div class="Nav mr-3 hidden w-60 flex-col gap-2 rounded-md bg-transition-color-8 p-3 lg:flex">
                <Button level="tertiary" class="bg-transparent">
                  <Icon.Line.Laptop />
                  <span class="w-full text-left">{dictionary().ui.settings.userInterface.title}</span>
                </Button>
                <Button level="tertiary" class="bg-transparent">
                  <Icon.Line.Location />
                  <span class="w-full text-left">{dictionary().ui.settings.language.title}</span>
                </Button>
                <Button level="tertiary" class="bg-transparent">
                  <Icon.Line.CloudUpload />
                  <span class="w-full text-left">{dictionary().ui.settings.statusAndSync.title}</span>
                </Button>
                <Button level="tertiary" class="bg-transparent">
                  <Icon.Line.ColorPalette />
                  <span class="w-full text-left">{dictionary().ui.settings.privacy.title}</span>
                </Button>
                <Button level="tertiary" class="bg-transparent">
                  <Icon.Line.VolumeDown />
                  <span class="w-full text-left">{dictionary().ui.settings.messages.title}</span>
                </Button>
                <Button level="tertiary" class="bg-transparent">
                  <Icon.Line.Flag />
                  <span class="w-full text-left">{dictionary().ui.settings.about.title}</span>
                </Button>
              </div>
              <div class="List flex h-full flex-1 flex-col items-stretch gap-5 lg:gap-3 overflow-y-auto rounded-md">
                <div class="Module UserInterface flex flex-col gap-2 rounded-md bg-transition-color-8 p-1 lg:p-3">
                  <h2 class="ModuleTitle p-2 text-lg font-bold">{dictionary().ui.settings.userInterface.title}</h2>
                  <div class="LabelGroup flex flex-col gap-1">
                    <div class="Durtion flex flex-col lg:flex-row flex-1 items-start lg:items-center justify-between gap-4 rounded-md border-1.5 border-transition-color-20 bg-primary-color p-3">
                      <div class="Description flex flex-1 flex-col gap-2">
                        <h3>{dictionary().ui.settings.userInterface.isAnimationEnabled.title}</h3>
                        <span class="text-sm text-accent-color-70">
                          {dictionary().ui.settings.userInterface.isAnimationEnabled.description}
                        </span>
                      </div>
                      <Toggle
                        onclick={() => setStore("settings", "userInterface", "isAnimationEnabled", (prev) => !prev)}
                        state={store.settings.userInterface.isAnimationEnabled}
                      />
                    </div>
                  </div>
                </div>

                <div class="Module Language flex flex-col gap-2 rounded-md bg-transition-color-8 p-1 lg:p-3">
                  <h2 class="ModuleTitle p-2 text-lg font-bold">{dictionary().ui.settings.language.title}</h2>
                  <div class="LabelGroup flex flex-col gap-1">
                    <div class="Location flex flex-col lg:flex-row flex-1 items-start lg:items-center justify-between gap-4 rounded-md border-1.5 border-transition-color-20 bg-primary-color p-3">
                      <div class="Description flex flex-1 flex-col gap-2">
                        <h3>{dictionary().ui.settings.language.selectedLanguage.title}</h3>
                        <span class="text-sm text-accent-color-70">
                          {dictionary().ui.settings.language.selectedLanguage.description}
                        </span>
                      </div>
                      <div class="Selector flex flex-wrap lg:flex-nowrap gap-2">
                        <CheckBox
                          state={store.settings.language === "zh-CN" || store.settings.language === "zh-HK"}
                          onClick={() => setStore("settings", "language", "zh-CN")}
                        >
                          {dictionary().ui.settings.language.selectedLanguage.zhCN}
                        </CheckBox>
                        <CheckBox
                          state={store.settings.language === "zh-TW"}
                          onClick={() => setStore("settings", "language", "zh-TW")}
                        >
                          {dictionary().ui.settings.language.selectedLanguage.zhTW}
                        </CheckBox>
                        <CheckBox
                          state={store.settings.language === "en-US" || store.settings.language === "en-GB"}
                          onClick={() => setStore("settings", "language", "en-US")}
                        >
                          {dictionary().ui.settings.language.selectedLanguage.enUS}
                        </CheckBox>
                        <CheckBox
                          state={store.settings.language === "ja"}
                          onClick={() => setStore("settings", "language", "ja")}
                        >
                          {dictionary().ui.settings.language.selectedLanguage.jaJP}
                        </CheckBox>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="Module StatusAndSync flex flex-col gap-2 rounded-md bg-transition-color-8 p-1 lg:p-3">
                  <h2 class="ModuleTitle p-2 text-lg font-bold">{dictionary().ui.settings.statusAndSync.title}</h2>
                  <div class="LabelGroup flex flex-col gap-1">
                    <div class="RestorePreviousStateOnStartup flex flex-col lg:flex-row flex-1 items-start lg:items-center justify-between gap-4 rounded-md border-1.5 border-transition-color-20 bg-primary-color p-3">
                      <div class="Description flex flex-1 flex-col gap-2">
                        <h3>{dictionary().ui.settings.statusAndSync.restorePreviousStateOnStartup.title}</h3>
                        <span class="text-sm text-accent-color-70">
                          {dictionary().ui.settings.statusAndSync.restorePreviousStateOnStartup.description}
                        </span>
                      </div>
                      <Toggle
                        onclick={() =>
                          setStore("settings", "statusAndSync", "restorePreviousStateOnStartup", (prev) => !prev)
                        }
                        state={store.settings.statusAndSync.restorePreviousStateOnStartup}
                      />
                    </div>
                    <div class="SyncStateAcrossClients flex flex-col lg:flex-row flex-1 items-start lg:items-center justify-between gap-4 rounded-md border-1.5 border-transition-color-20 bg-primary-color p-3">
                      <div class="Description flex flex-1 flex-col gap-2">
                        <h3>{dictionary().ui.settings.statusAndSync.syncStateAcrossClients.title}</h3>
                        <span class="text-sm text-accent-color-70">
                          {dictionary().ui.settings.statusAndSync.syncStateAcrossClients.description}
                        </span>
                      </div>
                      <Toggle
                        onclick={() => setStore("settings", "statusAndSync", "syncStateAcrossClients", (prev) => !prev)}
                        state={store.settings.statusAndSync.syncStateAcrossClients}
                      />
                    </div>
                  </div>
                </div>

                <div class="Module Privacy flex flex-col gap-2 rounded-md bg-transition-color-8 p-1 lg:p-3">
                  <h2 class="ModuleTitle p-2 text-lg font-bold">{dictionary().ui.settings.privacy.title}</h2>
                  <div class="LabelGroup flex flex-col gap-1">
                    <div class="PostVisibility flex flex-col lg:flex-row flex-1 items-start lg:items-center justify-between gap-4 rounded-md border-1.5 border-transition-color-20 bg-primary-color p-3">
                      <div class="Description flex flex-1 flex-col gap-2">
                        <h3>{dictionary().ui.settings.privacy.postVisibility.title}</h3>
                        <span class="text-sm text-accent-color-70">
                          {dictionary().ui.settings.privacy.postVisibility.description}
                        </span>
                      </div>
                      <div class="Selector flex flex-wrap lg:flex-nowrap gap-2">
                        <CheckBox
                          state={store.settings.privacy.postVisibility === "everyone"}
                          onClick={() => setStore("settings", "privacy", "postVisibility", "everyone")}
                        >
                          {dictionary().ui.settings.privacy.postVisibility.everyone}
                        </CheckBox>
                        <CheckBox
                          state={store.settings.privacy.postVisibility === "friends"}
                          onClick={() => setStore("settings", "privacy", "postVisibility", "friends")}
                        >
                          {dictionary().ui.settings.privacy.postVisibility.friends}
                        </CheckBox>
                        <CheckBox
                          state={store.settings.privacy.postVisibility === "onlyMe"}
                          onClick={() => setStore("settings", "privacy", "postVisibility", "onlyMe")}
                        >
                          {dictionary().ui.settings.privacy.postVisibility.onlyMe}
                        </CheckBox>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="Module Message flex flex-col gap-2 rounded-md bg-transition-color-8 p-1 lg:p-3">
                  <h2 class="ModuleTitle p-2 text-lg font-bold">{dictionary().ui.settings.messages.title}</h2>
                  <div class="LabelGroup flex flex-col gap-1">
                    <div class="Durtion flex flex-col lg:flex-row flex-1 items-start lg:items-center justify-between gap-4 rounded-md border-1.5 border-transition-color-20 bg-primary-color p-3">
                      <div class="Description flex flex-1 flex-col gap-2">
                        <h3>{dictionary().ui.settings.messages.notifyOnContentChange.title}</h3>
                        <span class="text-sm text-accent-color-70">
                          {dictionary().ui.settings.messages.notifyOnContentChange.description}
                        </span>
                      </div>
                      <div class="Selector flex flex-wrap lg:flex-nowrap gap-2">
                        <CheckBox
                          state={store.settings.messages.notifyOnContentChange.notifyOnReferencedContentChange}
                          onClick={() =>
                            setStore(
                              "settings",
                              "messages",
                              "notifyOnContentChange",
                              "notifyOnReferencedContentChange",
                              (prev) => !prev,
                            )
                          }
                        >
                          {dictionary().ui.settings.messages.notifyOnContentChange.notifyOnReferencedContentChange}
                        </CheckBox>
                        <CheckBox
                          state={store.settings.messages.notifyOnContentChange.notifyOnLike}
                          onClick={() =>
                            setStore("settings", "messages", "notifyOnContentChange", "notifyOnLike", (prev) => !prev)
                          }
                        >
                          {dictionary().ui.settings.messages.notifyOnContentChange.notifyOnLike}
                        </CheckBox>
                        <CheckBox
                          state={store.settings.messages.notifyOnContentChange.notifyOnBookmark}
                          onClick={() =>
                            setStore(
                              "settings",
                              "messages",
                              "notifyOnContentChange",
                              "notifyOnBookmark",
                              (prev) => !prev,
                            )
                          }
                        >
                          {dictionary().ui.settings.messages.notifyOnContentChange.notifyOnBookmark}
                        </CheckBox>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="Module About flex flex-col gap-2 rounded-md bg-transition-color-8 p-1 lg:p-3">
                  <h2 class="ModuleTitle p-2 text-lg font-bold">{dictionary().ui.settings.about.title}</h2>
                  <div class="LabelGroup flex flex-col gap-1">
                    <div class="Version flex flex-col lg:flex-row flex-1 items-start lg:items-center justify-between gap-4 rounded-md border-1.5 border-transition-color-20 bg-primary-color p-3">
                      <div class="Description flex flex-1 flex-col gap-2">
                        <h3>{dictionary().ui.settings.about.version.title}</h3>
                        <span class="text-sm text-accent-color-70">
                          {dictionary().ui.settings.about.version.description}
                        </span>
                      </div>
                    </div>
                    <div class="Description flex flex-col lg:flex-row flex-1 items-start lg:items-center justify-between gap-4 rounded-md border-1.5 border-transition-color-20 bg-primary-color p-3">
                      <div class="Description flex flex-1 flex-col gap-2">
                        <h3>{dictionary().ui.settings.about.description.title}</h3>
                        <span class="text-sm text-accent-color-70">
                          {dictionary().ui.settings.about.description.description}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Motion.div>
      </Show>
    </Presence>
  );
}
