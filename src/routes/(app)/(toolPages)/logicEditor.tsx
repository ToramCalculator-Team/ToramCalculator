import { findCharacterWithRelations } from "@db/repositories/character";
import { findSkillWithRelations } from "@db/repositories/skill";
import { createEffect, createMemo, createResource, createSignal, onMount, Show } from "solid-js";
import { NodeEditor } from "~/components/features/blocklyEditor/nodeEditor";
import { PlayerAttrSchema } from "~/components/features/simulator/core/member/player/PlayerData";
export default function LogicEditor() {
  const [data, setData] = createSignal<any>({});
  const [state, setState] = createSignal<any[]>([]);
  const [code, setCode] = createSignal<string>("");
  const [skill, { refetch: refetchSkill }] = createResource(() => findSkillWithRelations("defaultSkillId"));
  const [character, { refetch: refetchCharacter }] = createResource(() => findCharacterWithRelations("defaultCharacterId"));
  const schema = createMemo(() => {
    const c = character();
    if (!c) {
      return {};
    };
    return PlayerAttrSchema(c);
  });

  createEffect(() => {
    const skillEffect = skill()?.effects[0];
    if (skillEffect) {
      setData(skillEffect.logic);
    }
  });

  return (
    <div class="flex h-full flex-col">
      <Show when={skill() && character()}>
        <div class="basis-2/3">
          <NodeEditor data={data()} setData={setData} state={state()} code={code} setCode={setCode} schema={schema()} targetSchema={schema()} />
        </div>
      </Show>
      <div class="flex basis-1/3 gap-2 overflow-hidden">
        <pre class="basis-1/2 overflow-y-auto">{JSON.stringify(data(), null, 2)}</pre>
        <div class="divider bg-dividing-color h-full w-1"></div>
        <pre class="basis-1/2 overflow-y-auto text-xs">{code()}</pre>
      </div>
    </div>
  );
}
