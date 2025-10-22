import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { createMemo, createResource, For, onMount, ParentProps, Show, useContext } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { setStore, store } from "~/store";
import Icons from "~/components/icons/index";
import { getDictionary } from "~/locales/i18n";
import { fieldInfo, Form } from "~/components/dataDisplay/form";
import { MobWithRelationsSchema, selectMobWithRelations } from "@db/generated/repository/mob";
import { LogicEditor } from "~/components/features/logicEditor/LogicEditor";
import { Input } from "~/components/controls/input";
import { MemberBaseNestedSchema } from "~/components/features/simulator/core/member/MemberBaseSchema";
import { CrystalWithRelationsSchema, selectCrystalWithRelations } from "@db/generated/repository/crystal";

export default function FunctionPage(props: ParentProps) {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.userInterface.language));
  const mobFinder = (id: string) => selectMobWithRelations(id);
  const [mob, { refetch: refetchMob }] = createResource(() => "defaultMobId", mobFinder);
  const crystalFinder = (id: string) => selectCrystalWithRelations(id);
  const [crystal, { refetch: refetchCrystal }] = createResource(() => "defaultOptionCrystalAItemId", crystalFinder);

  onMount(() => {
    console.log("--FunctionPage Render");
  });

  return (
    <Motion.main class="flex h-full w-full flex-col-reverse landscape:flex-row">
      <OverlayScrollbarsComponent
        element="div"
        options={{ scrollbars: { autoHide: "scroll" } }}
        defer
        id="mainContent"
        class="bg-primary-color-90 z-40 h-full w-full landscape:landscape:px-12"
        style={{
          "transition-duration": "all 0s !important",
        }}
      >
        <Show when={mob()}>
          {(varMob) => (
            <Form
              initialValue={varMob()}
              dataSchema={MobWithRelationsSchema}
              dictionary={dictionary().db.mob}
              fieldGroupMap={{
                基本信息: ["name", "details", "captureable", "experience", "radius"],
                属性: [
                  "initialElement",
                  "baseLv",
                  "partsExperience",
                  "maxhp",
                  "physicalDefense",
                  "physicalResistance",
                  "magicalDefense",
                  "magicalResistance",
                ],
                其他: ["actions"],
              }}
              fieldGenerator={{
                actions: (field, dictionary, dataSchema) => {
                  return (
                    <Input
                      title={dictionary.fields.actions.key}
                      description={dictionary.fields.actions.formFieldDescription}
                      autocomplete="off"
                      type="text"
                      id={field().name}
                      name={field().name}
                      value={field().state.value as string}
                      onBlur={field().handleBlur}
                      onChange={(e) => {
                        const target = e.target;
                        field().handleChange(target.value);
                      }}
                      state={fieldInfo(field())}
                      class="border-dividing-color bg-primary-color w-full rounded-md border"
                    >
                      <LogicEditor
                        data={field().state.value}
                        setData={(data) => field().setValue(data)}
                        state={true}
                        id={field().name}
                        schema={MemberBaseNestedSchema}
                        targetSchema={MemberBaseNestedSchema}
                        class="h-[80vh] w-full"
                      />
                    </Input>
                  );
                },
              }}
            />
          )}
        </Show>
        <Show when={crystal()}>
          {(varCrystal) => (
            <Form
              initialValue={varCrystal()}
              dataSchema={CrystalWithRelationsSchema}
              dictionary={dictionary().db.crystal}
              fieldGroupMap={{
                基本信息: ["type"],
                属性: ["modifiers"],
              }}
            />
          )}
        </Show>
      </OverlayScrollbarsComponent>
    </Motion.main>
  );
}
