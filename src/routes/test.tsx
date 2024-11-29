import { Motion } from "solid-motionone";
import { store } from "~/store";
import Setting from "~/components/module/setting-page";

export default function Test() {
  return (
    <>
      <Motion.div
        id="AppMainContet"
        class={`h-dvh w-dvw overflow-hidden ${store.settingsDialogState ? "scale-[95%] opacity-0 blur-sm" : "scale-100 opacity-100 blur-0"}`}
      >
        <thead
          class={`TableHead sticky top-0 z-10`}
          style={{
            height: `48px`,
            width: `100%`,
            background: `yellow`,
          }}
        ></thead>
        <table class="Table relative w-full">
          <tbody
            style={{
              height: `2000px`,
              background: `red`,
            }}
            class={`TableBodyrelative bg-brand-color-1st`}
          ></tbody>
        </table>
      </Motion.div>
      <Setting />
    </>
  );
}
