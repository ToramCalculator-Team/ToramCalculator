import Input, { type InputComponentType } from "~/components/controls/input";
import * as Icon from "~/components/icon";
import { getDictionary } from "~/locales/i18n";
import Button from "~/components/controls/button";
import CheckBox from "~/components/controls/checkBox";
import Switch from "~/components/controls/switch";
import Radio from "~/components/controls/radio";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { For, type JSX, Show, createMemo } from "solid-js";
import { setStore, store } from "~/store";
import { Motion, Presence } from "solid-motionone";

export const Setting = () => {
  const dictionary = createMemo(() => getDictionary(store.settings.language));

  const SettingPageContentModule = (
    moduleName: string,
    labelName: string,
    content: {
      title: string;
      description: string;
      children: JSX.Element;
      type?: InputComponentType;
    }[],
  ) => (
    <div class={`Module ${moduleName} flex flex-col gap-1 lg:gap-2 lg:px-3`}>
      <h2 class="ModuleTitle py-2 text-xl font-bold lg:px-2">{labelName}</h2>
      <div class="LabelGroup flex flex-col gap-2">
        <For each={content}>
          {({ title, description, children }) => (
            <Input title={title} description={description}>
              {children}
            </Input>
          )}
        </For>
      </div>
    </div>
  );

  const Divider = () => <div class="Divider bg-dividing-color h-[1px] w-full flex-none"></div>;

  return (
    <Presence exitBeforeEnter>
      <Show when={store.settingsDialogState}>
        <Motion.div
          animate={{ transform: ["scale(1.05)", "scale(1)"], opacity: [0, 1] }}
          exit={{ transform: ["scale(1)", "scale(1.05)"], opacity: [1, 0] }}
          transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
          class={`SettingBox bg-primary-color-10 fixed top-0 left-0 grid h-dvh w-dvw transform place-items-center backdrop-blur`}
        >
          <Button class={`CloseBtn absolute top-3 right-3`} onClick={() => setStore("settingsDialogState", false)}>
            <Icon.Line.Close />
          </Button>
          <div
            class={`SettingForm flex h-dvh w-full flex-1 flex-col gap-3 rounded p-6 lg:max-w-(--breakpoint-2xl) lg:p-3`}
          >
            <div class="FormTitle flex items-center">
              <h1 class="text-2xl font-bold">{dictionary().ui.settings.title}</h1>
            </div>
            <div class="FormContent flex flex-1 flex-row items-start gap-3 overflow-hidden">
              <div class="Nav hidden w-fit min-w-60 flex-col gap-2 rounded lg:flex">
                <Button level="quaternary" active>
                  <Icon.Line.Laptop />
                  <span class="w-full text-left">{dictionary().ui.settings.userInterface.title}</span>
                </Button>
                <Button level="quaternary">
                  <Icon.Line.Location />
                  <span class="w-full text-left">{dictionary().ui.settings.language.title}</span>
                </Button>
                <Button level="quaternary">
                  <Icon.Line.CloudUpload />
                  <span class="w-full text-left">{dictionary().ui.settings.statusAndSync.title}</span>
                </Button>
                <Button level="quaternary">
                  <Icon.Line.ColorPalette />
                  <span class="w-full text-left">{dictionary().ui.settings.privacy.title}</span>
                </Button>
                <Button level="quaternary">
                  <Icon.Line.VolumeDown />
                  <span class="w-full text-left">{dictionary().ui.settings.messages.title}</span>
                </Button>
                <Button level="quaternary">
                  <Icon.Line.Flag />
                  <span class="w-full text-left">{dictionary().ui.settings.about.title}</span>
                </Button>
              </div>
              <div class="Divider bg-dividing-color hidden h-full w-[1px] lg:block"></div>
              <OverlayScrollbarsComponent
                element="div"
                options={{ scrollbars: { autoHide: "scroll" } }}
                defer
                class="h-full w-full"
              >
                <div class="List flex h-full flex-1 flex-col gap-6 rounded">
                  {SettingPageContentModule("Language", dictionary().ui.settings.language.title, [
                    {
                      title: dictionary().ui.settings.language.selectedLanguage.title,
                      description: dictionary().ui.settings.language.selectedLanguage.description,
                      children: (
                        <div class="Selector flex flex-col">
                          <Radio
                            name={"zh-CN"}
                            checked={store.settings.language === "zh-CN"}
                            onClick={() => setStore("settings", "language", "zh-CN")}
                          >
                            {dictionary().ui.settings.language.selectedLanguage.zhCN}
                          </Radio>
                          <Radio
                            name="zh-TW"
                            checked={store.settings.language === "zh-TW"}
                            onClick={() => setStore("settings", "language", "zh-TW")}
                          >
                            {dictionary().ui.settings.language.selectedLanguage.zhTW}
                          </Radio>
                          <Radio
                            name="en"
                            checked={store.settings.language === "en"}
                            onClick={() => setStore("settings", "language", "en")}
                          >
                            {dictionary().ui.settings.language.selectedLanguage.enUS}
                          </Radio>
                          <Radio
                            name="ja"
                            checked={store.settings.language === "ja"}
                            onClick={() => setStore("settings", "language", "ja")}
                          >
                            {dictionary().ui.settings.language.selectedLanguage.jaJP}
                          </Radio>
                        </div>
                      ),
                    },
                  ])}
                  <Divider />
                  {SettingPageContentModule("UserInterface", dictionary().ui.settings.userInterface.title, [
                    {
                      title: dictionary().ui.settings.userInterface.isAnimationEnabled.title,
                      description: dictionary().ui.settings.userInterface.isAnimationEnabled.description,
                      children: (
                        <Switch
                          name={dictionary().ui.settings.userInterface.isAnimationEnabled.title}
                          onClick={() => setStore("settings", "userInterface", "isAnimationEnabled", (prev) => !prev)}
                          checked={store.settings.userInterface.isAnimationEnabled}
                        />
                      ),
                    },
                    {
                      title: dictionary().ui.settings.userInterface.is3DbackgroundDisabled.title,
                      description: dictionary().ui.settings.userInterface.is3DbackgroundDisabled.description,
                      children: (
                        <Switch
                          name={dictionary().ui.settings.userInterface.is3DbackgroundDisabled.title}
                          onclick={() =>
                            setStore("settings", "userInterface", "is3DbackgroundDisabled", (prev) => !prev)
                          }
                          checked={store.settings.userInterface.is3DbackgroundDisabled}
                        />
                      ),
                    },
                  ])}
                  <Divider />
                  {SettingPageContentModule("StatusAndSync", dictionary().ui.settings.statusAndSync.title, [
                    {
                      title: dictionary().ui.settings.statusAndSync.restorePreviousStateOnStartup.title,
                      description: dictionary().ui.settings.statusAndSync.restorePreviousStateOnStartup.description,
                      children: (
                        <Switch
                          name={dictionary().ui.settings.statusAndSync.restorePreviousStateOnStartup.title}
                          onClick={() =>
                            setStore("settings", "statusAndSync", "restorePreviousStateOnStartup", (prev) => !prev)
                          }
                          checked={store.settings.statusAndSync.restorePreviousStateOnStartup}
                        />
                      ),
                    },
                  ])}
                  <Divider />
                  {SettingPageContentModule("Privacy", dictionary().ui.settings.privacy.title, [
                    {
                      title: dictionary().ui.settings.privacy.postVisibility.title,
                      description: dictionary().ui.settings.privacy.postVisibility.description,
                      children: (
                        <div class="Selector flex flex-col">
                          <Radio
                            name="everyone"
                            checked={store.settings.privacy.postVisibility === "everyone"}
                            onClick={() => setStore("settings", "privacy", "postVisibility", "everyone")}
                          >
                            {dictionary().ui.settings.privacy.postVisibility.everyone}
                          </Radio>
                          <Radio
                            name="friends"
                            checked={store.settings.privacy.postVisibility === "friends"}
                            onClick={() => setStore("settings", "privacy", "postVisibility", "friends")}
                          >
                            {dictionary().ui.settings.privacy.postVisibility.friends}
                          </Radio>
                          <Radio
                            name="onlyMe"
                            checked={store.settings.privacy.postVisibility === "onlyMe"}
                            onClick={() => setStore("settings", "privacy", "postVisibility", "onlyMe")}
                          >
                            {dictionary().ui.settings.privacy.postVisibility.onlyMe}
                          </Radio>
                        </div>
                      ),
                    },
                  ])}
                  <Divider />
                  {SettingPageContentModule("Messages", dictionary().ui.settings.messages.title, [
                    {
                      title: dictionary().ui.settings.messages.notifyOnContentChange.title,
                      description: dictionary().ui.settings.messages.notifyOnContentChange.description,
                      children: (
                        <div class="Selector flex flex-col">
                          <CheckBox
                            name="notifyOnReferencedContentChange"
                            checked={store.settings.messages.notifyOnContentChange.notifyOnReferencedContentChange}
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
                            name="notifyOnLike"
                            checked={store.settings.messages.notifyOnContentChange.notifyOnLike}
                            onClick={() =>
                              setStore("settings", "messages", "notifyOnContentChange", "notifyOnLike", (prev) => !prev)
                            }
                          >
                            {dictionary().ui.settings.messages.notifyOnContentChange.notifyOnLike}
                          </CheckBox>
                          <CheckBox
                            name="notifyOnBookmark"
                            checked={store.settings.messages.notifyOnContentChange.notifyOnBookmark}
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
                    },
                  ])}
                  <Divider />
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
};
