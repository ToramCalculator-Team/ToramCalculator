import { createMemo, createResource, createSignal, For, JSX, onCleanup, onMount, Show } from "solid-js";
import { Cell, ColumnDef, flexRender } from "@tanstack/solid-table";
import { Motion, Presence } from "solid-motionone";
import { type Mob, MobDic, createMob, defaultMob, findMobById, findMobs } from "~/repositories/mob";
import { FormSate, setStore, store } from "~/store";
import { getDictionary } from "~/locales/i18n";
import * as Icon from "~/components/icon";
import Button from "~/components/controls/button";
import { createSyncResource } from "~/hooks/resource";
import VirtualTable from "~/components/module/virtualTable";
import { getCommonPinningStyles } from "~/lib/table";
import { DataEnums } from "~/../db/dataEnums";
import { Portal } from "solid-js/web";
import Dialog from "~/components/controls/dialog";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { createForm } from "@tanstack/solid-form";
import type { AnyFieldApi } from "@tanstack/solid-form";
import { z, ZodFirstPartyTypeKind } from "zod";
import { mobSchema } from "../../../../../../db/clientDB/zod";

export default function MobIndexPage() {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));
  // 状态管理参数
  const [isFormFullscreen, setIsFormFullscreen] = createSignal(false);
  const [activeBannerIndex, setActiveBannerIndex] = createSignal(1);
  const setMob = (newMob: Mob["MainTable"]): void => {
    setStore("wiki", "mob", "id", newMob.id);
  };
  const [dialogState, setDialogState] = createSignal(false);
  const [dialogContent, setDialogContent] = createSignal<JSX.Element>();

  // table config
  const mobColumns: ColumnDef<Mob["MainTable"]>[] = [
    {
      accessorKey: "id",
      header: () => MobDic(store.settings.language).id,
      cell: (info) => info.getValue(),
      size: 200,
    },
    {
      accessorKey: "name",
      header: () => MobDic(store.settings.language).name,
      cell: (info) => info.getValue(),
      size: 220,
    },
    {
      accessorKey: "type",
      header: () => MobDic(store.settings.language).type,
      cell: (info) => dictionary().enums.mob.type[info.getValue<keyof DataEnums["mob"]["type"]>()],
      size: 160,
    },
    {
      accessorKey: "captureable",
      header: () => MobDic(store.settings.language).captureable,
      cell: (info) => info.getValue<Boolean>().toString(),
      size: 160,
    },
    {
      accessorKey: "baseLv",
      header: () => MobDic(store.settings.language).baseLv,
      cell: (info) => info.getValue(),
      size: 160,
    },
    {
      accessorKey: "experience",
      header: () => MobDic(store.settings.language).experience,
      size: 180,
    },
    {
      accessorKey: "partsExperience",
      header: () => MobDic(store.settings.language).partsExperience,
      cell: (info) => info.getValue(),
      size: 200,
    },
    {
      accessorKey: "initialElement",
      header: () => MobDic(store.settings.language).initialElement,
      cell: (info) => info.getValue<DataEnums["mob"]["initialElement"]>(),
      size: 180,
    },
    {
      accessorKey: "physicalDefense",
      header: () => MobDic(store.settings.language).physicalDefense,
      size: 200,
    },
    {
      accessorKey: "physicalResistance",
      header: () => MobDic(store.settings.language).physicalResistance,
      size: 200,
    },
    {
      accessorKey: "magicalDefense",
      header: () => MobDic(store.settings.language).magicalDefense,
      size: 200,
    },
    {
      accessorKey: "magicalResistance",
      header: () => MobDic(store.settings.language).magicalResistance,
      size: 200,
    },
    {
      accessorKey: "criticalResistance",
      header: () => MobDic(store.settings.language).criticalResistance,
      size: 200,
    },
    {
      accessorKey: "avoidance",
      header: () => MobDic(store.settings.language).avoidance,
      size: 160,
    },
    {
      accessorKey: "dodge",
      header: () => MobDic(store.settings.language).dodge,
      size: 160,
    },
    {
      accessorKey: "block",
      header: () => MobDic(store.settings.language).block,
      size: 160,
    },
    {
      accessorKey: "actions",
      header: () => MobDic(store.settings.language).actions,
      cell: (info) => JSON.stringify(info.getValue<Object>()),
      size: 160,
    },
    // {
    //   accessorKey: "belongToZones",
    //   header: () => MobDic(store.settings.language).belongToZones,
    //   cell: (info) => info.getValue(),
    //   size: 150,
    // },
  ];
  const [mobList] = createSyncResource("mob", findMobs);
  const [displayedMob, { refetch: refetchMob }] = createResource(() => store.wiki.mob?.id, findMobById);
  const [formMob, setFormMob] = createSignal<Mob["MainForm"]>(defaultMob);

  const mobTableHiddenColumns: Array<keyof Mob["MainTable"]> = ["id", "updatedByAccountId"];
  const mobFormHiddenFields: Array<keyof Mob["MainForm"]> = ["id", "createdByAccountId", "updatedByAccountId"];

  function mobTdGenerator(props: { cell: Cell<Mob["MainTable"], keyof Mob["MainTable"]> }) {
    const [tdContent, setTdContent] = createSignal<JSX.Element>(<>{"=.=.=.="}</>);
    type MobKeys = keyof DataEnums["mob"];
    type MobValueKeys<T extends MobKeys> = keyof DataEnums["mob"][T];
    switch (props.cell.column.id as keyof Mob["MainTable"]) {
      case "initialElement":
        setTdContent(
          {
            Water: <Icon.Element.Water class="h-12 w-12" />,
            Fire: <Icon.Element.Fire class="h-12 w-12" />,
            Earth: <Icon.Element.Earth class="h-12 w-12" />,
            Wind: <Icon.Element.Wind class="h-12 w-12" />,
            Light: <Icon.Element.Light class="h-12 w-12" />,
            Dark: <Icon.Element.Dark class="h-12 w-12" />,
            Normal: <Icon.Element.NoElement class="h-12 w-12" />,
          }[props.cell.getValue<keyof DataEnums["mob"]["initialElement"]>()] ?? undefined,
        );

        break;

      // 以下值需要添加百分比符号
      case "physicalResistance":
      case "magicalResistance":
      case "dodge":
      case "block":
      case "normalAttackResistanceModifier":
      case "physicalAttackResistanceModifier":
      case "magicalAttackResistanceModifier":
        setTdContent(flexRender(props.cell.column.columnDef.cell, props.cell.getContext()) + "%");
        break;

      default:
        setTdContent(flexRender(props.cell.column.columnDef.cell, props.cell.getContext()));
        break;
    }
    return (
      <td
        style={{
          ...getCommonPinningStyles(props.cell.column),
          width: getCommonPinningStyles(props.cell.column).width + "px",
        }}
        class={"flex flex-col justify-center p-6"}
      >
        {/* 当此字段不存在于枚举类型中时，展示原始文本 */}
        <Show
          when={
            props.cell.column.id in dictionary().enums.mob && props.cell.column.id !== "initialElement" // elementType已特殊处理，再以文本显示
          }
          fallback={tdContent()}
        >
          {dictionary().enums.mob[props.cell.column.id as MobKeys][props.cell.getValue() as MobValueKeys<MobKeys>]}
        </Show>
      </td>
    );
  }

  // form
  interface FieldInfoProps {
    field: AnyFieldApi;
  }

  function FieldInfo(props: FieldInfoProps) {
    return (
      <>
        {props.field.state.meta.isTouched && props.field.state.meta.errors.length ? (
          <em>{props.field.state.meta.errors.join(",")}</em>
        ) : null}
        {props.field.state.meta.isValidating ? "Validating..." : null}
      </>
    );
  }

  const getZodType = <T extends z.ZodTypeAny>(schema: T): ZodFirstPartyTypeKind => {
    if (schema === undefined || schema == null) {
      return ZodFirstPartyTypeKind.ZodUndefined;
    }
    if ("_def" in schema) {
      if ("innerType" in schema._def) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return getZodType(schema._def.innerType);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return schema._def.typeName as ZodFirstPartyTypeKind;
      }
    }
    return ZodFirstPartyTypeKind.ZodUndefined;
  };

  function form() {
    const form = createForm(() => ({
      defaultValues: defaultMob,
      onSubmit: async ({ value }) => {
        // await createMob(value);
        console.log(value);
      },
      // validatorAdapter: zodValidator,
    }));

    return (
      <div>
        <h1>{dictionary().ui.mob.pageTitle}</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <fieldset class="dataKinds flex flex-row flex-wrap gap-y-[4px]">
            <For each={Object.entries(formMob())}>
              {(_field, index) => {
                // 遍历怪物模型
                const fieldKey = _field[0] as keyof Mob["MainForm"];
                const fieldValue = _field[1];
                // 过滤掉隐藏的数据
                if (mobFormHiddenFields.includes(fieldKey)) return;
                // 输入框的类型计算
                const zodValue = mobSchema.shape[fieldKey];
                // 判断字段类型
                const valueType = getZodType(zodValue);
                // 由于数组类型的值与常规变量值存在结构差异，因此在此进行区分
                switch (valueType) {
                  case ZodFirstPartyTypeKind.ZodEnum: {
                    return (
                      <form.Field
                        name={fieldKey}
                        validators={{
                          onChangeAsyncDebounceMs: 500,
                          onChangeAsync: mobSchema.shape[fieldKey],
                        }}
                      >
                        {(field) => {
                          const defaultFieldsetClass = "flex basis-full flex-col gap-1 p-2";
                          const fieldsetClass: string = defaultFieldsetClass;
                          switch (fieldKey) {
                            case "type":
                            case "initialElement":
                            default:
                              break;
                          }
                          return (
                            <fieldset class={fieldsetClass}>
                              <span>
                                <FieldInfo field={field()} />
                              </span>
                              <div
                                class={`inputContianer mt-1 flex flex-wrap self-start rounded lg:gap-2`}
                              >
                                {JSON.stringify(zodValue)}
                                {/* {"options" in zodValue &&
                                  zodValue.options.map((option) => {
                                    const defaultInputClass = "mt-0.5 rounded px-4 py-2";
                                    const defaultLabelSizeClass = "";
                                    let inputClass = defaultInputClass;
                                    let labelSizeClass = defaultLabelSizeClass;
                                    let icon: JSX.Element = null;
                                    return (
                                      <label
                                        class={`flex ${labelSizeClass} hover:border-transition-color-20 cursor-pointer items-center justify-between gap-1 rounded-full p-2 px-4 lg:basis-auto lg:flex-row-reverse lg:justify-end lg:gap-2 lg:rounded-sm lg:hover:opacity-100 ${field.getValue() === option ? "opacity-100" : "opacity-20"} ${mobFormState === "DISPLAY" ? "pointer-events-none border-transparent bg-transparent" : "border-transition-color-8 bg-transition-color-8 pointer-events-auto"}`}
                                      >
                                        {fieldKey}
                                        <input
                                          id={field().name + option}
                                          name={field().name}
                                          value={option}
                                          checked={field().getValue() === option}
                                          type="radio"
                                          onBlur={field().handleBlur}
                                          onChange={(e) => field().handleChange(e.target.value)}
                                          class={inputClass}
                                        />
                                        {icon}
                                      </label>
                                    );
                                  })} */}
                              </div>
                            </fieldset>
                          );
                        }}
                      </form.Field>
                    );
                  }

                  case ZodFirstPartyTypeKind.ZodNumber: {
                    return (
                      <form.Field
                        name={fieldKey}
                        validators={{
                          onChangeAsyncDebounceMs: 500,
                          onChangeAsync: mobSchema.shape[fieldKey],
                        }}
                      >
                        {(field) => {
                          const defaultFieldsetClass = "flex basis-1/2 flex-col gap-1 p-2 lg:basis-1/4";
                          const defaultInputBox = (
                            <input
                              autocomplete="off"
                              id={field().name}
                              name={field().name}
                              value={field().state.value as number}
                              type="number"
                              onBlur={field().handleBlur}
                              onChange={(e) => field().handleChange(parseFloat(e.target.value))}
                              class={`mt-1 w-full flex-1 rounded px-4 py-2`}
                            />
                          );
                          const fieldsetClass: string = defaultFieldsetClass;
                          const inputBox: JSX.Element = defaultInputBox;
                          return (
                            <fieldset class={fieldsetClass}>
                              <label html-for={field().name} class="flex w-full flex-col gap-1">
                                <span>
                                  <FieldInfo field={field()} />
                                </span>
                                {inputBox}
                              </label>
                            </fieldset>
                          );
                        }}
                      </form.Field>
                    );
                  }
                  case ZodFirstPartyTypeKind.ZodArray:
                  case ZodFirstPartyTypeKind.ZodObject: {
                    return fieldKey;
                  }

                  // 字符串输入
                  default: {
                    return (
                      <form.Field
                        name={fieldKey}
                        validators={{
                          onChangeAsyncDebounceMs: 500,
                          onChangeAsync: mobSchema.shape[fieldKey],
                        }}
                      >
                        {(field) => {
                          const defaultFieldsetClass = "flex basis-1/2 flex-col gap-1 p-2 lg:basis-1/4";
                          const defaultInputBox = (
                            <input
                              value={field().state.value as string}
                              id={field().name}
                              name={field().name}
                              type="text"
                              onBlur={field().handleBlur}
                              onChange={(e) => {
                                const target = e.target
                                field().handleChange(target.value);
                              }}
                              class=""
                            />
                          );
                          let fieldsetClass: string = defaultFieldsetClass;
                          let inputBox: JSX.Element = defaultInputBox;
                          switch (fieldKey) {
                            // case "id":
                            // case "state":
                            case "name":
                              {
                                fieldsetClass = "flex basis-full flex-col gap-1 p-2 lg:basis-1/4";
                              }
                              break;
                            case "details":
                              {
                                inputBox = <></>;
                                fieldsetClass = "flex basis-full flex-col gap-1 p-2";
                              }
                              break;

                            default:
                              break;
                          }

                          return (
                            <fieldset class={fieldsetClass}>
                              <label html-for={field().name} class="flex w-full flex-col gap-1">
                                {fieldKey}
                                <span>
                                  <FieldInfo field={field()} />
                                </span>
                                {inputBox}
                              </label>
                            </fieldset>
                          );
                        }}
                      </form.Field>
                    );
                  }
                }
              }}
            </For>
          </fieldset>
          <form.Subscribe
            selector={(state) => ({
              canSubmit: state.canSubmit,
              isSubmitting: state.isSubmitting,
            })}
            children={(state) => {
              return (
                <button type="submit" disabled={!state().canSubmit}>
                  {state().isSubmitting ? '...' : 'Submit'}
                </button>
              )
            }}
          />
        </form>
      </div>
    );
  }

  // card
  const Card = () => {
    return <OverlayScrollbarsComponent
      element="div"
      class="w-full"
      options={{ scrollbars: { autoHide: "scroll" } }}
      defer
    >
      <pre class="p-3">{JSON.stringify(displayedMob.latest, null, 2)}</pre>
    </OverlayScrollbarsComponent>
  }

  // u键监听
  onMount(() => {
    console.log("--Mob Client Render");
  });

  onCleanup(() => {
    console.log("--Mob Client Unmount");
  });

  return (
    <>
      <Presence exitBeforeEnter>
        <Show when={!isFormFullscreen()}>
          <Motion.div
            class="Title hidden flex-col p-3 lg:flex lg:pt-12"
            animate={{ opacity: [0, 1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
          >
            <div class="Content flex flex-row items-center justify-between gap-4 py-3">
              <h1 class="Text lg: text-left text-[2.5rem] leading-[50px] lg:bg-transparent lg:leading-[48px]">
                {dictionary().ui.mob.pageTitle}
              </h1>
              <input
                id="MobSearchBox"
                type="search"
                placeholder={dictionary().ui.searchPlaceholder}
                class="border-dividing-color placeholder:text-dividing-color hover:border-main-text-color focus:border-main-text-color h-[50px] w-full flex-1 rounded-none border-b-2 bg-transparent px-3 py-2 backdrop-blur-xl focus:outline-hidden lg:h-[48px] lg:flex-1 lg:px-5 lg:font-normal"
              />
              <Button // 仅移动端显示
                size="sm"
                icon={<Icon.Line.CloudUpload />}
                class="flex lg:hidden"
                onClick={() => {
                  setDialogContent("");
                  setDialogState(true);
                  setStore("wiki", "mob", {
                    dialogState: true,
                    formState: "CREATE",
                  });
                }}
              ></Button>
              <Button // 仅PC端显示
                icon={<Icon.Line.CloudUpload />}
                class="hidden lg:flex"
                onClick={() => {
                  setDialogContent(form());
                  setDialogState(true);
                  setStore("wiki", "mob", {
                    dialogState: true,
                    formState: "CREATE",
                  });
                }}
              >
                {dictionary().ui.actions.upload} [u]
              </Button>
            </div>
          </Motion.div>
        </Show>
      </Presence>
      <Presence exitBeforeEnter>
        <Show when={!isFormFullscreen()}>
          <Motion.div
            class="Banner hidden h-[260px] flex-initial gap-3 p-3 opacity-0 lg:flex"
            animate={{ opacity: [0, 1] }}
            exit={{ opacity: [1, 0] }}
            transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
          >
            <div class="BannerContent flex flex-1 gap-6 lg:gap-2">
              <div
                class={`banner1 flex-none overflow-hidden rounded ${activeBannerIndex() === 1 ? "active shadow-dividing-color shadow-lg" : ""}`}
                onMouseEnter={() => setActiveBannerIndex(1)}
                style={{
                  // "background-image": `url(${mobList()?.[0]?.image.dataUrl !== `"data:image/png;base64,"` ? mobList()?.[0]?.image.dataUrl : defaultImage.dataUrl})`,
                  "background-position": "center center",
                }}
              >
                <div class="mask bg-brand-color-1st text-primary-color hidden h-full flex-col justify-center gap-2 p-8 lg:flex">
                  <span class="text-3xl font-bold">Top.1</span>
                  <div class="bg-primary-color h-[1px] w-[110px]"></div>
                  <span class="text-xl">{mobList()?.[0]?.name}</span>
                </div>
              </div>
              <div
                class={`banner2 flex-none overflow-hidden rounded ${activeBannerIndex() === 2 ? "active shadow-dividing-color shadow-lg" : ""}`}
                onMouseEnter={() => setActiveBannerIndex(2)}
                style={{
                  // "background-image": `url(${mobList()?.[1]?.image.dataUrl !== `"data:image/png;base64,"` ? mobList()?.[0]?.image.dataUrl : defaultImage.dataUrl})`,
                  "background-position": "center center",
                }}
              >
                <div class="mask bg-brand-color-2nd text-primary-color hidden h-full flex-col justify-center gap-2 p-8 lg:flex">
                  <span class="text-3xl font-bold">Top.2</span>
                  <div class="bg-primary-color h-[1px] w-[110px]"></div>
                  <span class="text-xl">{mobList()?.[1]?.name}</span>
                </div>
              </div>
              <div
                class={`banner2 flex-none overflow-hidden rounded ${activeBannerIndex() === 3 ? "active shadow-dividing-color shadow-lg" : ""}`}
                onMouseEnter={() => setActiveBannerIndex(3)}
                style={{
                  // "background-image": `url(${mobList()?.[2]?.image.dataUrl !== `"data:image/png;base64,"` ? mobList()?.[0]?.image.dataUrl : defaultImage.dataUrl})`,
                  "background-position": "center center",
                }}
              >
                <div class="mask bg-brand-color-3rd text-primary-color hidden h-full flex-col justify-center gap-2 p-8 lg:flex">
                  <span class="text-3xl font-bold">Top.3</span>
                  <div class="bg-primary-color h-[1px] w-[110px]"></div>
                  <span class="text-xl">{mobList()?.[2]?.name}</span>
                </div>
              </div>
            </div>
          </Motion.div>
        </Show>
      </Presence>
      <div class="Table&News flex h-full flex-1 flex-col gap-3 overflow-hidden lg:flex-row lg:p-3">
        <div class="TableModule flex flex-1 flex-col overflow-hidden">
          <div class="Title hidden h-12 w-full items-center gap-3 lg:flex">
            <div class={`Text text-xl ${isFormFullscreen() ? "lg:hidden lg:opacity-0" : ""}`}>
              {dictionary().ui.mob.table.title}
            </div>
            <div
              class={`Description bg-area-color flex-1 rounded p-3 opacity-0 ${isFormFullscreen() ? "lg:opacity-100" : "lg:opacity-0"}`}
            >
              {dictionary().ui.mob.table.description}
            </div>
            <Button
              level="quaternary"
              onClick={() => {
                setIsFormFullscreen(!isFormFullscreen());
              }}
            >
              {isFormFullscreen() ? <Icon.Line.Collapse /> : <Icon.Line.Expand />}
            </Button>
          </div>
          <VirtualTable
            tableName="mob"
            itemList={mobList}
            itemDic={MobDic}
            tableColumns={mobColumns}
            tableHiddenColumns={mobTableHiddenColumns}
            tableTdGenerator={mobTdGenerator}
          />
        </div>
        <Presence exitBeforeEnter>
          <Show when={!isFormFullscreen()}>
            <Motion.div
              animate={{ opacity: [0, 1] }}
              exit={{ opacity: 0 }}
              class="News hidden w-[248px] flex-initial flex-col gap-2 lg:flex"
            >
              <div class="Title flex h-12 text-xl">{dictionary().ui.mob.news.title}</div>
              <div class="Content bg-area-color flex flex-1 flex-col"></div>
            </Motion.div>
          </Show>
        </Presence>
      </div>

      <Portal>
        <Dialog
          state={store.wiki.mob?.dialogState ?? false}
          setState={(state: boolean) => setStore("wiki", "mob", "dialogState", state)}
        >
          {dialogContent()}
        </Dialog>
      </Portal>
    </>
  );
}
