import { setStore, store } from "~/store";
import Dialog from "./dialog";
import { Show } from "solid-js";

export default function Setting() {
  return (
    <Dialog
      state={store.indexPage.settingsDialogState}
      setState={(state: boolean) => {
        setStore("indexPage", {
          ...store.indexPage,
          settingsDialogState: state,
        });
      }}
    >
      <Show when={store.indexPage.settingsDialogState} fallback={<></>}>
        <div
          class={`SettingForm flex flex-1 flex-col gap-4 overflow-y-auto rounded px-3 lg:max-w-[1536px] lg:flex-row`}
        >
          <div class="Nav hidden w-60 flex-col gap-2 border-r-2 border-transition-color-8 lg:flex"></div>
          <div class="ModuleContent flex w-full flex-col gap-4">
            <div class="Module UI flex flex-col gap-2">
              <label class="Durtion">
                <input
                  type="checkbox"
                  checked={store.durtion}
                  onChange={(e) => {
                    setStore("durtion", e.currentTarget.checked);
                  }}
                />
                <span class="text-sm">{store.durtion ? "开启动画" : "关闭动画"}</span>
              </label>
            </div>
          </div>
        </div>
      </Show>
    </Dialog>
  );
}
