import { findCharacterWithRelations } from "@db/repositories/character";
import { findSkillWithRelations } from "@db/repositories/skill";
import { createEffect, createMemo, createResource, createSignal, onMount, Show } from "solid-js";
import { LogicEditor } from "~/components/features/logicEditor/LogicEditor";
import { MemberBaseNestedSchema } from "~/components/features/simulator/core/member/MemberBaseSchema";
import { PlayerAttrSchema } from "~/components/features/simulator/core/member/player/PlayerData";
export default function LogicEditorTestPage() {
  const [data, setData] = createSignal<any>({});
  const [state, setState] = createSignal<any[]>([]);
  const [code, setCode] = createSignal<string>("");
  const [skill, { refetch: refetchSkill }] = createResource(() => findSkillWithRelations("defaultSkillId"));
  const [character, { refetch: refetchCharacter }] = createResource(() =>
    findCharacterWithRelations("defaultCharacterId"),
  );
  const schema = createMemo(() => {
    const c = character();
    if (!c) {
      return {};
    }
    return PlayerAttrSchema(c);
  });

  createEffect(() => {
    const skillEffect = skill()?.effects[0];
    if (skillEffect) {
      setData(skillEffect.logic);
    }
  });

  return (
    <div class="grid h-full grid-cols-12 grid-rows-12 gap-2 p-3">
      <div class="col-span-12 row-span-8">
        <Show when={skill() && character()}>
          <LogicEditor
            data={data()}
            setData={setData}
            state={state()}
            code={code}
            setCode={setCode}
            schema={schema()}
            targetSchema={MemberBaseNestedSchema}
          />
        </Show>
      </div>
      <pre class="col-span-12 row-span-4 overflow-y-auto">{code()}</pre>

      {/* 调试信息 */}
      {/* <div class="col-span-12 row-span-4 flex overflow-y-auto">
        <pre class="basis-1/2 overflow-y-auto">{JSON.stringify(data(), null, 2)}</pre>
        <pre class="basis-1/2 overflow-y-auto text-xs">{code()}</pre>
      </div> */}
    </div>
  );
}
