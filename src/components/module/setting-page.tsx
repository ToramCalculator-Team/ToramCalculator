import { createEffect, createSignal, For, JSX, onMount, Show } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { setStore, store } from "~/store";
import * as Icon from "~/lib/icon";
import { getDictionary } from "~/locales/i18n";
import Button from "~/components/ui/button";
import Toggle from "~/components/ui/toggle";
import CheckBox from "~/components/ui/checkBox";

export default function Setting() {
  const [dictionary, setDictionary] = createSignal(getDictionary("en"));

  createEffect(() => {
    setDictionary(getDictionary(store.settings.language));
  });

  onMount(() => {
    // esc键监听
    const handleEscapeKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setStore("settingsDialogState", false);
        e.stopPropagation(); // 阻止事件继续冒泡
      }
    };

    document.addEventListener("keydown", handleEscapeKeyPress);
    return () => {
      document.addEventListener("keydown", handleEscapeKeyPress);
    };
  });

  const SettingPageContentModule = (
    moduleName: string,
    labelName: string,
    content: {
      title: string;
      description: string;
      children: JSX.Element;
      type?: string;
    }[],
  ) => (
    <div
      class={`Module ${moduleName} flex flex-col gap-1 lg:gap-2 lg:rounded lg:border-none lg:bg-transition-color-8 lg:p-3`}
    >
      <h2 class="ModuleTitle py-2 text-lg font-bold lg:px-2">{labelName}</h2>
      <div class="LabelGroup flex flex-col gap-2 lg:gap-1">
        <For each={content}>
          {({ title, description, children, type }) => (
            <div
              class={`Content flex flex-1 ${
                type
                  ? {
                      col: "flex-col",
                    }[type]
                  : "items-center"
              } justify-between gap-4 border-b-[1px] border-transition-color-20 bg-primary-color py-4 lg:flex-row lg:items-center lg:rounded lg:border lg:p-3`}
            >
              <div class="Description flex flex-1 flex-col gap-2">
                <h3>{title}</h3>
                <span class="text-sm text-accent-color-70">{description}</span>
              </div>
              {children}
            </div>
          )}
        </For>
      </div>
    </div>
  );

  return (
    <Presence exitBeforeEnter>
      <Show when={store.settingsDialogState}>
        <Motion.div
          animate={{ transform: "scale(1)", opacity: [0, 1] }}
          exit={{ transform: "scale(1.05)", opacity: 0 }}
          transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
          class={`SettingBox fixed left-0 top-0 grid h-dvh w-dvw scale-[105%] place-items-center bg-primary-color`}
        >
          <div class={`SettingForm flex h-dvh flex-1 flex-col gap-3 rounded p-6 lg:max-w-7xl lg:p-3`}>
            <div class="FormTitle flex items-center justify-between">
              <h1 class="text-2xl font-bold">{dictionary().ui.settings.title}</h1>
              <Button onClick={() => setStore("settingsDialogState", false)}>
                <Icon.Line.Close />
              </Button>
            </div>
            <div class="FormContent flex flex-1 flex-row items-start overflow-hidden">
              <div class="Nav mr-3 hidden w-fit min-w-60 flex-col rounded bg-transition-color-8 p-3 lg:flex">
                <Button class="bg-transparent">
                  <Icon.Line.Laptop />
                  <span class="w-full text-left">{dictionary().ui.settings.userInterface.title}</span>
                </Button>
                <Button class="bg-transparent">
                  <Icon.Line.Location />
                  <span class="w-full text-left">{dictionary().ui.settings.language.title}</span>
                </Button>
                <Button class="bg-transparent">
                  <Icon.Line.CloudUpload />
                  <span class="w-full text-left">{dictionary().ui.settings.statusAndSync.title}</span>
                </Button>
                <Button class="bg-transparent">
                  <Icon.Line.ColorPalette />
                  <span class="w-full text-left">{dictionary().ui.settings.privacy.title}</span>
                </Button>
                <Button class="bg-transparent">
                  <Icon.Line.VolumeDown />
                  <span class="w-full text-left">{dictionary().ui.settings.messages.title}</span>
                </Button>
                <Button class="bg-transparent">
                  <Icon.Line.Flag />
                  <span class="w-full text-left">{dictionary().ui.settings.about.title}</span>
                </Button>
              </div>
              <OverlayScrollbarsComponent
                element="div"
                options={{ scrollbars: { autoHide: "scroll" } }}
                defer
                class="h-full"
              >
                <div class="List flex h-full flex-1 flex-col items-stretch gap-3 rounded">
                  {SettingPageContentModule("Language", dictionary().ui.settings.language.title, [
                    {
                      title: dictionary().ui.settings.language.selectedLanguage.title,
                      description: dictionary().ui.settings.language.selectedLanguage.description,
                      children: (
                        <div class="Selector flex flex-wrap gap-2 lg:flex-nowrap">
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
                      ),
                      type: "col",
                    },
                  ])}
                  {SettingPageContentModule("UserInterface", dictionary().ui.settings.userInterface.title, [
                    {
                      title: dictionary().ui.settings.userInterface.isAnimationEnabled.title,
                      description: dictionary().ui.settings.userInterface.isAnimationEnabled.description,
                      children: (
                        <Toggle
                          onclick={() => setStore("settings", "userInterface", "isAnimationEnabled", (prev) => !prev)}
                          state={store.settings.userInterface.isAnimationEnabled}
                        />
                      ),
                    },
                    {
                      title: dictionary().ui.settings.userInterface.is3DbackgroundDisabled.title,
                      description: dictionary().ui.settings.userInterface.is3DbackgroundDisabled.description,
                      children: (
                        <Toggle
                          onclick={() =>
                            setStore("settings", "userInterface", "is3DbackgroundDisabled", (prev) => !prev)
                          }
                          state={store.settings.userInterface.is3DbackgroundDisabled}
                        />
                      ),
                    },
                  ])}
                  {SettingPageContentModule("StatusAndSync", dictionary().ui.settings.statusAndSync.title, [
                    {
                      title: dictionary().ui.settings.statusAndSync.restorePreviousStateOnStartup.title,
                      description: dictionary().ui.settings.statusAndSync.restorePreviousStateOnStartup.description,
                      children: (
                        <Toggle
                          onclick={() =>
                            setStore("settings", "statusAndSync", "restorePreviousStateOnStartup", (prev) => !prev)
                          }
                          state={store.settings.statusAndSync.restorePreviousStateOnStartup}
                        />
                      ),
                    },
                  ])}
                  {SettingPageContentModule("Privacy", dictionary().ui.settings.privacy.title, [
                    {
                      title: dictionary().ui.settings.privacy.postVisibility.title,
                      description: dictionary().ui.settings.privacy.postVisibility.description,
                      children: (
                        <div class="Selector flex flex-wrap gap-2 lg:flex-nowrap">
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
                      ),
                      type: "col",
                    },
                  ])}
                  {SettingPageContentModule("Messages", dictionary().ui.settings.messages.title, [
                    {
                      title: dictionary().ui.settings.messages.notifyOnContentChange.title,
                      description: dictionary().ui.settings.messages.notifyOnContentChange.description,
                      children: (
                        <div class="Selector flex flex-wrap gap-2 lg:flex-nowrap">
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
                      ),
                      type: "col",
                    },
                  ])}
                  {SettingPageContentModule("About", dictionary().ui.settings.about.title, [
                    {
                      title: dictionary().ui.settings.about.version.title,
                      description: dictionary().ui.settings.about.version.description,
                      children: <></>,
                    },
                    {
                      title: dictionary().ui.settings.about.description.title,
                      description: dictionary().ui.settings.about.description.description,
                      children: <></>,
                    },
                  ])}
                </div>
              </OverlayScrollbarsComponent>
            </div>
          </div>
        </Motion.div>
      </Show>
    </Presence>
  );
}
