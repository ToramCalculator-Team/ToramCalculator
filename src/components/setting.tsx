import { setStore, store } from "~/store";
import Dialog from "./dialog";

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
      <div class={`SettingForm flex w-full flex-col gap-4 overflow-y-auto rounded px-3 lg:flex-row`}>
        <div class="Nav hidden w-60 flex-col gap-2 border-r-1.5 lg:flex"></div>
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
    </Dialog>
  );
}
