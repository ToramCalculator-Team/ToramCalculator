import { selectCharacterByIdWithRelations } from "@db/generated/repositories/character";
import { selectSkillByIdWithRelations } from "@db/generated/repositories/skill";
import { createEffect, createMemo, createResource, createSignal, onMount, Show } from "solid-js";
import { LogicEditor } from "~/components/features/logicEditor/LogicEditor";
import defaultData from "~/components/features/logicEditor/defaultData.json";

export default function LogicEditorTestPage() {
  // 是否显示调试布局
  const [debugLayout, setDebugLayout] = createSignal<boolean>(true);
  const [data, setData] = createSignal<any>({});
  const [state, setState] = createSignal<any[]>([]);
  const [code, setCode] = createSignal<string>("");

  onMount(() => {
    setData(defaultData);
  });

  return (
    <div class="grid h-full grid-cols-12 grid-rows-12 gap-2 p-3">
      <div class="col-span-12 row-span-8">
        <LogicEditor
          data={data()}
          setData={setData}
          state={state()}
          code={code}
          setCode={setCode}
          memberType={"Player"}
        />
      </div>
      <Show when={debugLayout()} fallback={<pre class="col-span-12 row-span-4 overflow-y-auto">{code()}</pre>}>
        <div class="col-span-12 row-span-4 flex overflow-y-auto">
          <pre class="basis-1/2 overflow-y-auto">{JSON.stringify(data(), null, 2)}</pre>
          <pre class="basis-1/2 overflow-y-auto text-xs">{code()}</pre>
        </div>
      </Show>
    </div>
  );
}
