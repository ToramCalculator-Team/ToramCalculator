import { createMemo, createResource, createSignal, For, JSX, onCleanup, onMount, Show } from "solid-js";
import { Cell, ColumnDef, flexRender } from "@tanstack/solid-table";
import { Motion, Presence } from "solid-motionone";
import { type Mob, MobDic, defaultMob, findMobById, findMobs } from "~/repositories/client/mob";
import { setStore, store } from "~/store";
import { getDictionary } from "~/locales/i18n";
import * as Icon from "~/components/icon";
import Button from "~/components/controls/button";
import { createSyncResource } from "~/hooks/resource";
import VirtualTable from "~/components/module/virtualTable";
import { getCommonPinningStyles } from "~/lib/table";
import { Portal } from "solid-js/web";
import Dialog from "~/components/controls/dialog";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { createForm } from "@tanstack/solid-form";
import type { AnyFieldApi } from "@tanstack/solid-form";
import { z, ZodFirstPartyTypeKind } from "zod";
import { mobSchema } from "../../../../../../db/clientDB/zod";
import { DataEnums } from "../../../../../../db/dataEnums";
import Input from "~/components/controls/input";

export default function MobIndexPage() {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));
  // 状态管理参数
  const [isFormFullscreen, setIsFormFullscreen] = createSignal(true);
  const [activeBannerIndex, setActiveBannerIndex] = createSignal(1);
  const setMob = (newMob: Mob["MainTable"]): void => {
    setStore("wiki", "mob", "id", newMob.id);
  };

  // table config
  const [tableFilterIsOpen, setTableFilterIsOpen] = createSignal(false);
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
      accessorKey: "initialElement",
      header: () => MobDic(store.settings.language).initialElement,
      cell: (info) => info.getValue<DataEnums["mob"]["initialElement"]>(),
      size: 200,
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
      case "experience":
        setTdContent(
          flexRender(props.cell.column.columnDef.cell, props.cell.getContext()) +
            "+" +
            props.cell.row.original.partsExperience,
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
        class={"flex flex-col justify-center text-main-text-color p-6"}
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
  const [formMob, setFormMob] = createSignal<Mob["MainForm"]>(defaultMob);

  function fieldInfo(field: AnyFieldApi): string {
    const errors =
      field.state.meta.isTouched && field.state.meta.errors.length ? field.state.meta.errors.join(",") : null;
    const isValidating = field.state.meta.isValidating ? "..." : null;
    if (errors) {
      return errors;
    }
    if (isValidating) {
      return isValidating;
    }
    return "";
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

  const form = () => {
    const form = createForm(() => ({
      defaultValues: defaultMob,
      onSubmit: async ({ value }) => {
        // await createMob(value);
        console.log(value);
      },
      // validatorAdapter: zodValidator,
    }));

    return (
      <div class="FormBox w-full lg:p-6">
        <div class="Title flex p-2">
          <h1 class="FormTitle text-2xl font-black">{dictionary().ui.mob.pageTitle}</h1>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          class="Form bg-area-color flex flex-col gap-3 p-2"
        >
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
                        const key = fieldKey as keyof DataEnums["mob"];
                        const defaultInputClass = "mt-0.5 rounded px-4 py-2";
                        const defaultLabelSizeClass = "";
                        let icon: JSX.Element = null;
                        let inputClass = defaultInputClass;
                        let labelSizeClass = defaultLabelSizeClass;
                        let content: JSX.Element = null;
                        switch (key) {
                          case "type":
                            {
                              const zodValue = mobSchema.shape[key];
                              content =
                                "options" in zodValue
                                  ? zodValue.options.map((option) => {
                                      switch (option) {
                                        case "Mob":
                                        case "MiniBoss":
                                        case "Boss":
                                      }
                                      return (
                                        <label
                                          class={`flex gap-1 rounded border-2 px-3 py-2 ${field().state.value === option ? "border-brand-color-1st opacity-100" : "border-transparent opacity-20"}`}
                                        >
                                          {icon}
                                          {dictionary().enums.mob[key][option]}
                                          <input
                                            id={field().name + option}
                                            name={field().name}
                                            value={option}
                                            checked={field().state.value === option}
                                            type="radio"
                                            onBlur={field().handleBlur}
                                            onChange={(e) => field().handleChange(e.target.value)}
                                            class={inputClass}
                                          />
                                        </label>
                                      );
                                    })
                                  : null;
                            }

                            break;

                          case "initialElement": {
                            const zodValue = mobSchema.shape[key];
                            content =
                              "options" in zodValue
                                ? zodValue.options.map((option) => {
                                    switch (option) {
                                      case "Normal":
                                        {
                                          icon = <Icon.Element.NoElement class="h-6 w-6" />;
                                          inputClass = "mt-0.5 hidden rounded px-4 py-2";
                                          labelSizeClass = "no-element basis-1/3";
                                        }
                                        break;
                                      case "Light":
                                        {
                                          icon = <Icon.Element.Light class="h-6 w-6" />;
                                          inputClass = "mt-0.5 hidden rounded px-4 py-2";
                                          labelSizeClass = "light basis-1/3";
                                        }
                                        break;
                                      case "Dark":
                                        {
                                          (icon = <Icon.Element.Dark class="h-6 w-6" />),
                                            (inputClass = "mt-0.5 hidden rounded px-4 py-2");
                                          labelSizeClass = "dark basis-1/3";
                                        }
                                        break;
                                      case "Water":
                                        {
                                          icon = <Icon.Element.Water class="h-6 w-6" />;
                                          inputClass = "mt-0.5 hidden rounded px-4 py-2";
                                          labelSizeClass = "water basis-1/3";
                                        }
                                        break;
                                      case "Fire":
                                        {
                                          icon = <Icon.Element.Fire class="h-6 w-6" />;
                                          inputClass = "mt-0.5 hidden rounded px-4 py-2";
                                          labelSizeClass = "fire basis-1/3";
                                        }
                                        break;
                                      case "Earth":
                                        {
                                          icon = <Icon.Element.Earth class="h-6 w-6" />;
                                          inputClass = "mt-0.5 hidden rounded px-4 py-2";
                                          labelSizeClass = "earth basis-1/3";
                                        }
                                        break;
                                      case "Wind":
                                        {
                                          icon = <Icon.Element.Wind class="h-6 w-6" />;
                                          inputClass = "mt-0.5 hidden rounded px-4 py-2";
                                          labelSizeClass = "wind basis-1/3";
                                        }
                                        break;
                                      default:
                                        {
                                          icon = null;
                                          inputClass = defaultInputClass;
                                          labelSizeClass = defaultLabelSizeClass;
                                        }
                                        break;
                                    }
                                    return (
                                      <label
                                        class={`flex gap-1 rounded border-2 px-3 py-2 ${field().state.value === option ? "border-brand-color-1st" : "border-transparent opacity-20"}`}
                                      >
                                        {icon}
                                        {dictionary().enums.mob[key][option]}
                                        <input
                                          id={field().name + option}
                                          name={field().name}
                                          value={option}
                                          checked={field().state.value === option}
                                          type="radio"
                                          onBlur={field().handleBlur}
                                          onChange={(e) => field().handleChange(e.target.value)}
                                          class={inputClass}
                                        />
                                      </label>
                                    );
                                  })
                                : null;
                          }
                        }
                        return (
                          <Input
                            title={MobDic(store.settings.language)[fieldKey].key}
                            description={MobDic(store.settings.language)[fieldKey].formFieldDescription}
                            state={fieldInfo(field())}
                            class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                          >
                            {/* <div class="EnumsBox flex flex-col gap-1">{content}</div> */}
                            {content}
                          </Input>
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
                          <Input
                            title={MobDic(store.settings.language)[fieldKey].key}
                            description={MobDic(store.settings.language)[fieldKey].formFieldDescription}
                            autocomplete="off"
                            type="number"
                            id={field().name}
                            name={field().name}
                            value={field().state.value as number}
                            onBlur={field().handleBlur}
                            onChange={(e) => field().handleChange(parseFloat(e.target.value))}
                            state={fieldInfo(field())}
                            class="bg-primary-color w-full rounded-md"
                          />
                        );
                        const fieldsetClass: string = defaultFieldsetClass;
                        const inputBox: JSX.Element = defaultInputBox;
                        return inputBox;
                      }}
                    </form.Field>
                  );
                }
                case ZodFirstPartyTypeKind.ZodArray:
                case ZodFirstPartyTypeKind.ZodObject: {
                  return fieldKey;
                }

                case ZodFirstPartyTypeKind.ZodBoolean: {
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
                          <Input
                            title={MobDic(store.settings.language)[fieldKey].key}
                            description={MobDic(store.settings.language)[fieldKey].formFieldDescription}
                            autocomplete="off"
                            type="boolean"
                            id={field().name}
                            name={field().name}
                            value={field().state.value as string}
                            onBlur={field().handleBlur}
                            onChange={(e) => {
                              const target = e.target;
                              field().handleChange(target.value);
                            }}
                            state={fieldInfo(field())}
                            class="border-dividing-color bg-primary-color w-full rounded-md border-1"
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

                        return inputBox;
                      }}
                    </form.Field>
                  );
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
                          <Input
                            title={MobDic(store.settings.language)[fieldKey].key}
                            description={MobDic(store.settings.language)[fieldKey].formFieldDescription}
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
                            class="border-dividing-color bg-primary-color w-full rounded-md border-1"
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

                        return inputBox;
                      }}
                    </form.Field>
                  );
                }
              }
            }}
          </For>
          <form.Subscribe
            selector={(state) => ({
              canSubmit: state.canSubmit,
              isSubmitting: state.isSubmitting,
            })}
            children={(state) => {
              return (
                <div class="flex items-center gap-1 p-2">
                  <Button level="primary" class={`SubmitBtn flex-1`} type="submit" disabled={!state().canSubmit}>
                    {state().isSubmitting ? "..." : dictionary().ui.actions.upload}
                  </Button>
                </div>
              );
            }}
          />
        </form>
      </div>
    );
  };

  // card
  const card = () => {
    return (
      <OverlayScrollbarsComponent element="div" class="w-full" options={{ scrollbars: { autoHide: "scroll" } }} defer>
        <pre class="p-3">{JSON.stringify(displayedMob.latest, null, 2)}</pre>
      </OverlayScrollbarsComponent>
    );
  };

  const dialogContet = createMemo(() => {
    switch (store.wiki.mob?.dialogType) {
      case "form":
        return form();
      case "card":
        return card();
    }
  });

  onMount(() => {
    console.log("--Mob Page Render");
  });

  onCleanup(() => {
    console.log("--Mob Page Unmount");
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
                  setStore("wiki", "mob", {
                    dialogType: "form",
                    dialogIsOpen: true,
                  });
                }}
              ></Button>
              <Button // 仅PC端显示
                icon={<Icon.Line.CloudUpload />}
                class="hidden lg:flex"
                onClick={() => {
                  setStore("wiki", "mob", {
                    dialogType: "form",
                    dialogIsOpen: true,
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
                setTableFilterIsOpen(!tableFilterIsOpen());
              }}
            >
              <Icon.Line.Filter />
            </Button>
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
            filterIsOpen={tableFilterIsOpen}
            setFilterIsOpen={setTableFilterIsOpen}
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
          state={store.wiki.mob?.dialogIsOpen ?? false}
          setState={(state: boolean) => setStore("wiki", "mob", "dialogIsOpen", state)}
        >
          {dialogContet()}
        </Dialog>
      </Portal>
    </>
  );
}
