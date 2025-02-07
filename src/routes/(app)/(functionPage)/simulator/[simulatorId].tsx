import { Mob } from "~/repositories/mob";
import { Character, CharacterDic } from "~/repositories/character";
import {
  Accessor,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  onMount,
  Show,
  JSX,
  on,
} from "solid-js";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";
import Button from "~/components/controls/button";
import Dialog from "~/components/controls/dialog";
import {
  Simulator,
  defaultSimulator,
  findSimulatorById,
} from "~/repositories/simulator";
import { useParams } from "@solidjs/router";
import * as Icon from "~/components/icon";
import * as _ from "lodash-es";
import {
  Definition,
  Designer,
  RootEditorContext,
  StepEditorContext,
  StepsConfiguration,
  ToolboxConfiguration,
  ValidatorConfiguration,
} from "sequential-workflow-designer";
import { RootEditorWrapperContext } from "~/components/module/flowEditor/RootEditorWrapper";
import Input, { InputComponentType } from "~/components/controls/input";
import { render } from "solid-js/web";
import { StepEditorWrapperContext } from "~/components/module/flowEditor/StepEditorWrapper";
import { type CustomStateMachineStep, ExecutableSteps, StateMachine } from "~/worker/utils/StateMachine";

interface WorkflowDefinition extends Definition {
  properties: {
    speed: number;
  };
  sequence: CustomStateMachineStep[];
}

const externalEditorClassName = "sqd-editor-solid";

// export type skillSequenceList = {
//   name: string;
//   data: tSkill[];
// };

export default function SimulatorIndexClient() {
  const params = useParams();
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));

  // 状态管理参数
  const mobList = store.wiki.mobPage.mobList;
  const setMobList = (value: Mob[]) => setStore("wiki", "mobPage", "mobList", value);
  const characterList = store.characterPage.characterList;
  const setCharacterList = (value: Character[]) => setStore("characterPage", "characterList", value);
  const analyzeList = store.simulatorPage.simulatorList;
  const setAnalyzeList = (value: Simulator[]) => setStore("simulatorPage", "simulatorList", value);
  const [simulator, { refetch: refetchSimulator }] = createResource(() => findSimulatorById(params.simulatorId));
  const [memberIndex, setMemberIndex] = createSignal(0);
  const [mobIndex, setMobIndex] = createSignal(0);

  const [designer, setDesigner] = createSignal<Designer<WorkflowDefinition> | null>(null);
  const [placeholder, setPlaceholder] = createSignal<HTMLElement | null>(null);
  const [isToolboxCollapsed, setIsToolboxCollapsed] = createSignal(false);
  const [isEditorCollapsed, setIsEditorCollapsed] = createSignal(false);
  const [isReadonly, setIsReadonly] = createSignal(false);

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

  const Divider = () => <div class="Divider h-[1px] w-full flex-none bg-dividing-color"></div>;

  function rootEditorProvider(def: WorkflowDefinition, context: RootEditorContext, isReadonly: boolean) {
    const container = document.createElement("div");
    container.className = externalEditorClassName;
    render(
      () => (
        <RootEditorWrapperContext definition={def} context={context} isReadonly={isReadonly}>
          <div class="List flex h-full flex-1 flex-col gap-6 rounded">
            {SettingPageContentModule("Language", dictionary().ui.settings.language.title, [
              {
                title: dictionary().ui.settings.language.selectedLanguage.title,
                description: dictionary().ui.settings.language.selectedLanguage.description,
                children: (
                  <input
                    name="speed"
                    onChange={(e) => {
                      def.properties.speed = parseInt(e.target.value);
                      context.notifyPropertiesChanged();
                    }}
                    value={def.properties.speed?.toString() ?? ""}
                    readOnly={isReadonly}
                    type="text"
                  />
                ),
              },
            ])}
            <Divider />
          </div>
        </RootEditorWrapperContext>
      ),
      container,
    );
    return container;
  }

  function stepEditorProvider(
    step: CustomStateMachineStep,
    context: StepEditorContext,
    def: Definition,
    isReadonly: boolean,
  ) {
    const container = document.createElement("div");
    container.className = externalEditorClassName;
    render(
      () => (
        <StepEditorWrapperContext step={step} definition={def} context={context} isReadonly={isReadonly}>
          <div class="StepEditor">
            <h4>{"Step " + step.type}</h4>
            <p>
              <label>
                名称
                <input
                  name="name"
                  onInput={(e) => {
                    step.name = e.target.value;
                    context.notifyNameChanged();
                  }}
                  value={step.name?.toString()}
                  readOnly={isReadonly}
                  type="text"
                />
              </label>
            </p>
            <For each={["formula", "condition", "message"]}>
              {(key) => (
                <Show when={step.properties[key] !== undefined}>
                  <p>
                    <label>
                      {key}
                      <input
                        name={key}
                        onInput={(e) => {
                          step.properties[key] = e.target.value;
                          context.notifyPropertiesChanged();
                        }}
                        value={step.properties[key]?.toString()}
                        readOnly={isReadonly}
                        type="text"
                      />
                    </label>
                  </p>
                </Show>
              )}
            </For>
          </div>
        </StepEditorWrapperContext>
      ),
      container,
    );

    return container;
  }

  const toolboxConfiguration: Accessor<ToolboxConfiguration> = createMemo(() => ({
    groups: [
      {
        name: "数学模块",
        steps: [ExecutableSteps.createMathStep("自定义公式", ""), ExecutableSteps.createTextStep("消息模块")],
      },
      {
        name: "逻辑模块",
        steps: [ExecutableSteps.createIfStep("If", ""), ExecutableSteps.createLoopStep("Loop", "")],
      },
    ],
  }));
  const stepsConfiguration: Accessor<StepsConfiguration> = createMemo(() => ({
    /* ... */
  }));
  const validatorConfiguration: Accessor<ValidatorConfiguration> = createMemo(() => ({
    step: (step) => {
      return Object.keys(step.properties).every((n) => !!step.properties[n]);
    },
    root: (definition) => {
      return (definition.properties["speed"] as number) > 0;
    },
  }));

  const [starArray, setStarArray] = createSignal<number[]>([]);
  const [dialogState, setDialogState] = createSignal(false);
  // simulator更新后未重新获取，待解决
  // createEffect(
  //   on(
  //     dialogState,
  //     () => {
  //       console.log("重新获取分析器");
  //       refetchSimulator();
  //     }, {
  //       defer: true,
  //     }
  //   )
  // )

  const showDesigner = (indexOfMember: number) => {
    setDialogState(true);
    setMemberIndex(indexOfMember);
    setDesigner(
      Designer.create(
        placeholder()!,
        {
          properties: {
            speed: 300,
          },
          sequence: _.cloneDeep(
            // (simulator()?.team[memberIndex()]?.flow as CustomStateMachineStep[]) ??
            [
              ExecutableSteps.createTextStep("开始!"),
              ExecutableSteps.createTextStep("结束"),
            ],
          ),
        },
        {
          theme: store.theme,
          undoStackSize: 10,
          toolbox: toolboxConfiguration()
            ? {
              ...toolboxConfiguration(),
              isCollapsed: isToolboxCollapsed(),
            }
            : false,
          steps: stepsConfiguration(),
          validator: validatorConfiguration(),
          controlBar: true,
          contextMenu: true,
          keyboard: true,
          // preferenceStorage:,
          editors: {
            isCollapsed: isEditorCollapsed(),
            rootEditorProvider,
            stepEditorProvider,
          },
          customActionHandler: () => { },
          // extensions,
          // i18n,
          isReadonly: isReadonly(),
        },
      ),
    );
    designer()?.onDefinitionChanged.subscribe(() => {
      const sequence = designer()?.getDefinition().sequence;
      if (sequence) {
        // 更新数据库
        // 更新状态库
        // setStore("simulator", "team", memberIndex(), "flow", structuredClone(sequence));
      }
    });
    designer()?.onSelectedStepIdChanged.subscribe((stepId) => { });
    designer()?.onIsToolboxCollapsedChanged.subscribe((isCollapsed) => { });
    designer()?.onIsEditorCollapsedChanged.subscribe((isCollapsed) => { });
  };

  onMount(() => {
    console.log("--Simulator Client Render");
  });

  return (
    <>
      <div class="Title flex flex-col p-3 lg:pt-12">
        <div class="Content flex flex-col items-center justify-between gap-10 py-3 lg:flex-row lg:justify-start lg:gap-4">
          <h1 class="Text flex-1 text-left text-3xl lg:bg-transparent lg:text-4xl">{simulator()?.name}</h1>
          <div class="Control flex gap-3">
            <Button icon={<Icon.Line.Share />}>{dictionary().ui.actions.generateImage}</Button>
            <Button icon={<Icon.Line.Save />}>{dictionary().ui.actions.save}</Button>
          </div>
        </div>
      </div>

      <div class="MobsConfig flex flex-col gap-3 p-3">
        <div class="ModuleTitle flex h-12 w-full items-center text-xl">
          {dictionary().ui.simulator.simulatorPage.mobsConfig.title}
        </div>
        <div class="ModuleContent flex flex-col gap-6">
          <For each={simulator()?.team}>
            {(mob, index) => {
              function setStarArr(star: number) {
                const newStarArray = [...starArray()];
                newStarArray[index()] = star;
                setStarArray(newStarArray);
              }
              return (
                <div class="flex flex-col items-center rounded bg-accent-color bg-right shadow-card shadow-dividing-color lg:flex-row lg:gap-6">
                  {/* <div class="MobsName z-10 flex-shrink-0 px-6 py-3 text-xl text-primary-color">
                    {mob.mob?.name ?? ""}
                  </div>
                  <div class="MobsConfig z-10 flex flex-1 flex-shrink-0 flex-col gap-6 px-6 py-3 lg:flex-row">
                    <div
                      class="MobsAugment flex flex-shrink-0 cursor-pointer items-center gap-3 rounded p-3 px-6 py-3 hover:bg-primary-color-10"
                      onMouseEnter={() => setStarArr(0)}
                      onMouseLeave={() => {
                        setStarArr(mob.star);
                      }}
                      onClick={() => updateMob(simulator()!.mobs[index()].id, { star: starArray()[index()] })}
                    >
                      <Icon.Filled.Star
                        onMouseEnter={() => setStarArr(1)}
                        class={`${starArray()[index()] >= 1 ? "text-brand-color-1st" : "text-primary-color-30"} hover:text-primary-color`}
                      />
                      <Icon.Filled.Star
                        onMouseEnter={() => setStarArr(2)}
                        class={`${starArray()[index()] >= 2 ? "text-brand-color-2nd" : "text-primary-color-30"} hover:text-primary-color`}
                      />
                      <Icon.Filled.Star
                        onMouseEnter={() => setStarArr(3)}
                        class={`${starArray()[index()] >= 3 ? "text-brand-color-3rd" : "text-primary-color-30"} hover:text-primary-color`}
                      />
                      <Icon.Filled.Star
                        onMouseEnter={() => setStarArr(4)}
                        class={`${starArray()[index()] >= 4 ? "text-brand-color-4th" : "text-primary-color-30"} hover:text-primary-color`}
                      />
                    </div>
                    <Button class="text-primary-color" icon={<Icon.Line.Swap />}>
                      {dictionary().ui.actions.swap}
                    </Button>
                    <Button class="text-primary-color" icon={<Icon.Line.ZoomIn />}>
                      {dictionary().ui.actions.checkInfo}
                    </Button>
                  </div>
                  <div
                    class="MobsBG z-0 w-1/2 self-stretch rounded"
                    style={{
                      "background-image": `url(${mob?.mob?.image?.dataUrl})`,
                      "background-position-y": "40%",
                    }}
                  >
                    <div class="Mask to-accent-color-0 h-full w-1/2 bg-gradient-to-r from-accent-color"></div>
                  </div> */}
                </div>
              );
            }}
          </For>
        </div>
      </div>

      <div class="TeamConfig flex flex-col gap-3 p-3">
        <div class="ModuleTitle flex h-12 w-full items-center text-xl">
          {dictionary().ui.simulator.simulatorPage.teamConfig.title}
        </div>
        <div class="ModuleContent flex flex-wrap gap-3">
          <For each={simulator()?.team}>
            {(member, index) => {
              return (
                <div class="Member flex border-b-2 border-accent-color p-1">
                  {/* <div
                    onClick={() => showDesigner(index())}
                    class="InfoRow cursor-pointer gap-6 rounded p-2 hover:bg-dividing-color"
                  >
                    <div class="Info flex flex-col gap-2 px-3">
                      <div class="MemberName text-lg font-bold">{member.character?.name ?? "未知"}</div>
                      <div class="MenberConfig flex flex-1 gap-1 text-mainText-color">
                        <span>{member.character?.lv ?? "未知"}</span>-
                        <span>
                          {
                            dictionary().db.enums.MainWeaponType[
                              member.character?.mainWeapon?.mainWeaponType ?? "NO_WEAPON"
                            ]
                          }
                        </span>
                        -
                        <span>
                          {
                            dictionary().db.enums.SubWeaponType[
                              member.character?.subWeapon?.subWeaponType ?? "NO_WEAPON"
                            ]
                          }
                        </span>
                      </div>
                    </div>
                    <div class="Funtion"></div>
                  </div>
                  <div class="FlowRow"></div> */}
                </div>
              );
            }}
          </For>

          <div class="AddMember flex p-1">
            <div
              onClick={async () => {
                // simulator() && addMemberToSimulator(simulator()!.id, defaultMember);
              }}
              class="InfoRow flex cursor-pointer items-center gap-6 rounded bg-area-color p-2 hover:bg-dividing-color"
            >
              <div class="Info flex flex-col items-center justify-center gap-2 px-3">
                <Icon.Line.AddUser />
                <span>
                  {dictionary().ui.actions.add}
                  {CharacterDic(store.settings.language).selfName}
                </span>
              </div>
            </div>
            <div class="FlowRow"></div>
          </div>
        </div>
      </div>

      <Button
        level="primary"
        disabled={designer()?.isReadonly()}
        icon={<Icon.Line.Gamepad />}
        onClick={async () => {
          // (await DW.stateMachine).start();
          // console.log((await DW.stateMachine).data)
        }}
      >
        测试运行
      </Button>

      <Dialog state={dialogState()} setState={setDialogState}>
        <div ref={setPlaceholder} id="sqd-placeholder" class="FlowEditor h-full w-full"></div>
        <div class="FunctionArea flex w-full gap-2 border-t-2 border-accent-color p-3">
          <Button
            level="primary"
            disabled={designer()?.isReadonly()}
            icon={<Icon.Line.Gamepad />}
            onClick={() => {
              designer()?.setIsReadonly(true);
            }}
          >
            测试运行
          </Button>
          <Button
            disabled={designer()?.isReadonly()}
            icon={<Icon.Line.Gamepad />}
            onClick={() => {
              setDialogState(false);
              // deleteMemberFromSimulator(simulator()!.id, simulator()!.team[memberIndex()].id);
            }}
          >
            {dictionary().ui.actions.remove}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
