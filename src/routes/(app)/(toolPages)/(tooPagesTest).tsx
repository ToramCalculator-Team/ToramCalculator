import { onMount } from "solid-js/types/reactive/signal.js";
import { ParentProps } from "solid-js/types/render/component.js";
import { Motion } from "solid-motionone";
import { Button } from "~/components/controls/button";
import Icons from "~/components/icons";

export default function FunctionPage(props: ParentProps) {
  onMount(() => {
    console.log("--TooPages Render");
  });

  return (
    <Motion.main class="flex h-full w-full flex-col-reverse landscape:flex-row">
      <div class="ToolPageNav flex justify-between px-6">
        <div class="ToolPageNavLeft flex">
          <Button icon={<Icons.Outline.Home />}></Button>
        </div>
        <div class="ToolPageNavRight flex">
        </div>
      </div>
      {props.children}
    </Motion.main>
  );
}
