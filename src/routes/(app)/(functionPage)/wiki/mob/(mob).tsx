import { createMemo, createResource, createSignal, For, JSX, onCleanup, onMount, Show } from "solid-js";
import { Cell, ColumnDef, flexRender } from "@tanstack/solid-table";
import { Motion, Presence } from "solid-motionone";
import { type Mob, createMob, defaultMob, findMobById, findMobs } from "~/repositories/mob";
import { setStore, store } from "~/store";
import { getDictionary } from "~/locales/i18n";
import * as Icon from "~/components/icon";
import Button from "~/components/controls/button";
import { createSyncResource } from "~/hooks/resource";
import VirtualTable from "~/components/module/virtualTable";
import { getCommonPinningStyles } from "~/lib/table";
import { Portal } from "solid-js/web";
import Dialog from "~/components/controls/dialog";
import { createForm } from "@tanstack/solid-form";
import type { AnyFieldApi } from "@tanstack/solid-form";
import { z, ZodFirstPartyTypeKind } from "zod";
import { drop_itemSchema, mobSchema, statisticSchema, zoneSchema } from "~/../db/zod";
import { DataEnums } from "~/../db/dataEnums";
import Input from "~/components/controls/input";
import Toggle from "~/components/controls/toggle";
import { getDB } from "~/repositories/database";
import NodeEditor from "~/components/module/nodeEditor";
import { LoadingBar } from "~/components/loadingBar";

export default function MobIndexPage() {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));
  // 状态管理参数
  const [isTableFullscreen, setIsTableFullscreen] = createSignal(false);
  const [activeBannerIndex, setActiveBannerIndex] = createSignal(0);
  const setMob = (newMob: Mob["MainTable"]): void => {
    setStore("wiki", "mob", "id", newMob.id);
  };

  // table config
  const [tableFilterIsOpen, setTableFilterIsOpen] = createSignal(false);
  const mobColumns: ColumnDef<Mob["MainTable"]>[] = [
    {
      accessorKey: "id",
      header: () => dictionary().db.mob.fields.id,
      cell: (info) => info.getValue(),
      size: 200,
    },
    {
      accessorKey: "name",
      header: () => dictionary().db.mob.fields.name,
      cell: (info) => info.getValue(),
      size: 220,
    },
    {
      accessorKey: "initialElement",
      header: () => dictionary().db.mob.fields.initialElement,
      cell: (info) => info.getValue<DataEnums["mob"]["initialElement"]>(),
      size: 200,
    },
    {
      accessorKey: "type",
      header: () => dictionary().db.mob.fields.type,
      cell: (info) => dictionary().enums.mob.type[info.getValue<keyof DataEnums["mob"]["type"]>()],
      size: 160,
    },
    {
      accessorKey: "captureable",
      header: () => dictionary().db.mob.fields.captureable,
      cell: (info) => info.getValue<Boolean>().toString(),
      size: 160,
    },
    {
      accessorKey: "baseLv",
      header: () => dictionary().db.mob.fields.baseLv,
      cell: (info) => info.getValue(),
      size: 160,
    },
    {
      accessorKey: "experience",
      header: () => dictionary().db.mob.fields.experience,
      size: 180,
    },
    {
      accessorKey: "physicalDefense",
      header: () => dictionary().db.mob.fields.physicalDefense,
      size: 200,
    },
    {
      accessorKey: "physicalResistance",
      header: () => dictionary().db.mob.fields.physicalResistance,
      size: 200,
    },
    {
      accessorKey: "magicalDefense",
      header: () => dictionary().db.mob.fields.magicalDefense,
      size: 200,
    },
    {
      accessorKey: "magicalResistance",
      header: () => dictionary().db.mob.fields.magicalResistance,
      size: 200,
    },
    {
      accessorKey: "criticalResistance",
      header: () => dictionary().db.mob.fields.criticalResistance,
      size: 200,
    },
    {
      accessorKey: "avoidance",
      header: () => dictionary().db.mob.fields.avoidance,
      size: 160,
    },
    {
      accessorKey: "dodge",
      header: () => dictionary().db.mob.fields.dodge,
      size: 160,
    },
    {
      accessorKey: "block",
      header: () => dictionary().db.mob.fields.block,
      size: 160,
    },
    {
      accessorKey: "actions",
      header: () => dictionary().db.mob.fields.actions,
      cell: (info) => JSON.stringify(info.getValue<Object>()),
      size: 160,
    },
    // {
    //   accessorKey: "belongToZones",
    //   header: () => dictionary().db.mob.fields.belongToZones,
    //   cell: (info) => info.getValue(),
    //   size: 150,
    // },
  ];
  const [mobList, { refetch: refetchMobList }] = createSyncResource("mob", findMobs);

  const mobTableHiddenColumns: Array<keyof Mob["MainTable"]> = [
    "id",
    "actions",
    "createdByAccountId",
    "updatedByAccountId",
  ];

  function mobTdGenerator(props: { cell: Cell<Mob["MainTable"], keyof Mob["MainTable"]> }) {
    const [tdContent, setTdContent] = createSignal<JSX.Element>(<>{"=.=.=.="}</>);
    type MobKeys = keyof DataEnums["mob"];
    type MobValueKeys<T extends MobKeys> = keyof DataEnums["mob"][T];
    let defaultTdClass = "text-main-text-color flex flex-col justify-center p-6";
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

      case "name":
        defaultTdClass = "text-accent-color flex flex-col justify-center p-6 ";

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
        class={defaultTdClass}
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
  const mobFormHiddenFields: Array<keyof Mob["MainForm"]> = [
    "id",
    "statisticId",
    "createdByAccountId",
    "updatedByAccountId",
  ];

  function fieldInfo(field: AnyFieldApi): string {
    const errors =
      field.state.meta.isTouched && field.state.meta.errors.length ? field.state.meta.errors.join(",") : null;
    const isValidating = field.state.meta.isValidating ? "..." : null;
    if (errors) {
      console.log(field.state.meta.errors);
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
        return getZodType(schema._def.innerType);
      } else {
        return schema._def.typeName as ZodFirstPartyTypeKind;
      }
    }
    return ZodFirstPartyTypeKind.ZodUndefined;
  };

  const form = () => {
    const form = createForm(() => ({
      defaultValues: defaultMob,
      onSubmit: async ({ value }) => {
        const currentAccount = store.session.user.account;
        if (!currentAccount) {
          alert("请先登录");
          return;
        }
        const db = await getDB();
        const mob = await db.transaction().execute(async (trx) => {
          return await createMob(trx, {
            ...value,
            createdByAccountId: currentAccount.id,
            updatedByAccountId: currentAccount.id,
          });
        });

        refetchMobList();
        setStore("wiki", "mob", "dialogIsOpen", false);
      },
      // validatorAdapter: zodValidator,
    }));

    return (
      <div class="FormBox flex w-full flex-col gap-2 lg:p-6">
        <div class="Title flex p-2">
          <h1 class="FormTitle text-2xl font-black">{dictionary().ui.mob.pageTitle}</h1>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          class="Form bg-area-color flex flex-col gap-3 rounded p-3"
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
                        switch (key) {
                          case "type": {
                            const zodValue = mobSchema.shape[key];
                            return (
                              <Input
                                title={dictionary().db.mob.fields[fieldKey].key}
                                description={dictionary().db.mob.fields[fieldKey].formFieldDescription}
                                state={fieldInfo(field())}
                                class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                              >
                                <div class="EnumsBox flex flex-wrap gap-1">
                                  <For each={zodValue.options}>
                                    {(option) => {
                                      switch (option) {
                                        case "Mob":
                                        case "MiniBoss":
                                        case "Boss":
                                          icon = <Icon.Filled.Basketball />;
                                          break;
                                      }
                                      return (
                                        <label
                                          class={`flex cursor-pointer gap-1 rounded border-2 px-3 py-2 hover:opacity-100 ${field().state.value === option ? "border-accent-color bg-area-color" : "border-dividing-color opacity-50"}`}
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
                                    }}
                                  </For>
                                </div>
                              </Input>
                            );
                          }

                          case "initialElement": {
                            const zodValue = mobSchema.shape[key];
                            return (
                              <Input
                                title={dictionary().db.mob.fields[fieldKey].key}
                                description={dictionary().db.mob.fields[fieldKey].formFieldDescription}
                                state={fieldInfo(field())}
                                class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                              >
                                <div class="EnumsBox flex flex-wrap gap-1">
                                  <For each={zodValue.options}>
                                    {(option) => {
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
                                          class={`flex cursor-pointer items-center gap-1 rounded border-2 px-3 py-2 hover:opacity-100 ${field().state.value === option ? "border-accent-color" : "border-dividing-color bg-area-color opacity-50"}`}
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
                                    }}
                                  </For>
                                </div>
                              </Input>
                            );
                          }
                        }
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
                        switch (fieldKey) {
                          case "baseLv":
                          case "experience":
                          case "partsExperience":
                          case "initialElement":
                          case "radius":
                          case "maxhp":
                          case "physicalDefense":
                          case "physicalResistance":
                          case "magicalDefense":
                          case "magicalResistance":
                          case "criticalResistance":
                          case "avoidance":
                          case "dodge":
                          case "block":
                          case "normalAttackResistanceModifier":
                          case "physicalAttackResistanceModifier":
                          case "magicalAttackResistanceModifier":
                        }
                        return (
                          <Input
                            title={dictionary().db.mob.fields[fieldKey].key}
                            description={dictionary().db.mob.fields[fieldKey].formFieldDescription}
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
                      }}
                    </form.Field>
                  );
                }
                case ZodFirstPartyTypeKind.ZodArray:
                case ZodFirstPartyTypeKind.ZodObject: {
                  return fieldKey;
                }

                case ZodFirstPartyTypeKind.ZodLazy: {
                  return (
                    <form.Field
                      name={fieldKey}
                      validators={{
                        onChangeAsyncDebounceMs: 500,
                        onChangeAsync: mobSchema.shape[fieldKey],
                      }}
                    >
                      {(field) => {
                        // const defaultFieldsetClass = "flex basis-1/2 flex-col gap-1 p-2 lg:basis-1/4";
                        return (
                          <Input
                            title={dictionary().db.mob.fields[fieldKey].key}
                            description={dictionary().db.mob.fields[fieldKey].formFieldDescription}
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
                          >
                            <NodeEditor
                              data={field().state.value}
                              setData={(data) => field().setValue(data)}
                              state={store.wiki.mob?.dialogIsOpen}
                              id={field().name}
                              class="h-[80vh] w-full"
                            />
                          </Input>
                        );
                      }}
                    </form.Field>
                  );
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
                        return (
                          <Input
                            title={dictionary().db.mob.fields[fieldKey].key}
                            description={dictionary().db.mob.fields[fieldKey].formFieldDescription}
                            state={fieldInfo(field())}
                            class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                          >
                            <Toggle
                              id={field().name}
                              onClick={() => {
                                field().setValue(!field().state.value);
                              }}
                              onBlur={field().handleBlur}
                              name={field().name}
                              checked={field().state.value as boolean}
                            />
                          </Input>
                        );
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
                            title={dictionary().db.mob.fields[fieldKey].key}
                            description={dictionary().db.mob.fields[fieldKey].formFieldDescription}
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
                          // case "details":
                          //   {
                          //     inputBox = <TextEditor />;
                          //     fieldsetClass = "flex basis-full flex-col gap-1 p-2";
                          //   }
                          //   break;

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
                <div class="flex items-center gap-1">
                  <Button level="primary" class={`SubmitBtn flex-1`} type="submit" disabled={!state().canSubmit}>
                    {state().isSubmitting ? "..." : dictionary().ui.actions.add}
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
  // 1. 等待 store.database.tableSyncState.mob 为 true
  const readyMobId = createMemo(() => {
    if (store.database.tableSyncState.mob && store.wiki.mob?.id) {
      return store.wiki.mob.id;
    }
    return undefined; // 未就绪返回 undefined，createResource 将忽略
  });

  // 2. 异步加载 mob 数据，仅当 readyMobId 有值时才触发 fetch
  const [displayedMob, { refetch: refetchMob }] = createResource(readyMobId, findMobById);
  const mobCardHiddenFields: Array<keyof Mob["Card"]> = [
    "id",
    "statisticId",
    "createdByAccountId",
    "updatedByAccountId",
  ];
  const card = (data: Mob["Card"] | undefined) => {
    // console.log(data);
    const mobCardSchema = mobSchema.extend({
      belongToZones: z.array(zoneSchema),
      dropItems: z.array(drop_itemSchema), // 你需要一个 itemSchema
      statistic: statisticSchema, // 你也需要一个 statisticSchema
    });

    if (!data) return <LoadingBar class="w-full" />;

    return (
      <div class="Card flex h-full w-full flex-col gap-3">
        <div class="CardTitle flex p-2">
          <h1 class="FormTitle text-2xl font-black">{data.name}</h1>
        </div>
        <div class="CardContent flex flex-col gap-3 rounded p-3">
          <For each={Object.entries(data)}>
            {(_field, index) => {
              // 遍历怪物模型
              const fieldKey = _field[0] as keyof Mob["Card"];
              const fieldValue = _field[1];
              // 过滤掉隐藏的数据
              if (mobCardHiddenFields.includes(fieldKey)) return;
              // 输入框的类型计算
              const zodValue = mobCardSchema.shape[fieldKey];
              // 判断字段类型
              const valueType = getZodType(zodValue);

              if (
                [
                  ZodFirstPartyTypeKind.ZodArray,
                  ZodFirstPartyTypeKind.ZodObject,
                  ZodFirstPartyTypeKind.ZodLazy,
                ].includes(valueType)
              ) {
                switch (valueType) {
                  case ZodFirstPartyTypeKind.ZodArray: {
                    switch (fieldKey) {
                      case "belongToZones":
                      case "dropItems": {
                        return (
                          <div class="Field flex gap-1">
                            <span class="text-main-text-color">{fieldKey}</span>:
                            <span class="text-accent-color font-bold">{JSON.stringify(fieldValue, null, 2)}</span>
                            <span class="text-dividing-color">{`[${valueType}]`}</span>
                          </div>
                        );
                      }
                    }
                  }
                  case ZodFirstPartyTypeKind.ZodLazy:
                  case ZodFirstPartyTypeKind.ZodObject: {
                    switch (fieldKey) {
                      case "statistic": {
                        return (
                          <div class="Field flex gap-1">
                            <span class="text-main-text-color">{fieldKey}</span>:
                            <pre class="text-accent-color">{JSON.stringify(fieldValue, null, 2)}</pre>
                            <span class="text-dividing-color">{`[${valueType}]`}</span>
                          </div>
                        );
                      }
                    }
                  }
                }
              } else {
                const key = fieldKey as keyof Mob["Select"];
                switch (valueType) {
                  case ZodFirstPartyTypeKind.ZodNumber: {
                    switch (key) {
                      case "baseLv":
                      case "experience":
                      case "partsExperience":
                      case "initialElement":
                      case "radius":
                      case "maxhp":
                      case "physicalDefense":
                      case "physicalResistance":
                      case "magicalDefense":
                      case "magicalResistance":
                      case "criticalResistance":
                      case "avoidance":
                      case "dodge":
                      case "block":
                      case "normalAttackResistanceModifier":
                      case "physicalAttackResistanceModifier":
                      case "magicalAttackResistanceModifier":
                    }
                    return (
                      <div class="Field flex gap-1">
                        <span class="text-main-text-color">{dictionary().db.mob.fields[key].key}</span>:
                        <span class="text-accent-color font-bold">{fieldValue as number}</span>
                        <span class="text-dividing-color">{`[${valueType}]`}</span>
                      </div>
                    );
                  }

                  case ZodFirstPartyTypeKind.ZodBoolean: {
                    return (
                      <div class="Field flex gap-1">
                        <span class="text-main-text-color">{dictionary().db.mob.fields[key].key}</span>:
                        <span class="text-accent-color font-bold">{fieldValue as boolean}</span>
                        <span class="text-dividing-color">{`[${valueType}]`}</span>
                      </div>
                    );
                  }

                  case ZodFirstPartyTypeKind.ZodDate: {
                    return (
                      <div class="Field flex gap-1">
                        <span class="text-main-text-color">{dictionary().db.mob.fields[key].key}</span>:
                        <span class="text-accent-color font-bold">{(fieldValue as Date).toLocaleDateString()}</span>
                        <span class="text-dividing-color">{`[${valueType}]`}</span>
                      </div>
                    );
                  }

                  case ZodFirstPartyTypeKind.ZodEnum:
                  // 字符串输入
                  default: {
                    if (fieldKey in defaultMob) {
                      return (
                        <div class="Field flex gap-1">
                          <span class="text-main-text-color">{dictionary().db.mob.fields[key].key}</span>:
                          <span class="text-accent-color font-bold">{fieldValue as string}</span>
                          <span class="text-dividing-color">{`[${valueType}]`}</span>
                        </div>
                      );
                    } else {
                      return (
                        <div class="Field flex gap-1">
                          <span class="text-main-text-color">{JSON.stringify(fieldKey, null, 2)}</span>:
                          <span class="text-accent-color font-bold">{JSON.stringify(fieldValue, null, 2)}</span>
                          <span class="text-dividing-color">{`[${valueType}]`}</span>
                        </div>
                      );
                    }
                  }
                }
              }
            }}
          </For>
          <div class="flex items-center gap-1">
            <Button class="ModifyBtn" disabled>
              {dictionary().ui.actions.modify}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const dialogContet = createMemo(() => {
    switch (store.wiki.mob?.dialogType) {
      case "form":
        return form();
      case "card":
        return card(displayedMob.latest);
    }
  });

  onMount(() => {
    console.log("--Mob Page Render");
  });

  onCleanup(() => {
    console.log("--Mob Page Unmount");
  });

  return (
    <Show
      when={store.database.tableSyncState.mob}
      fallback={
        <div class="LoadingState w-full h-full flex flex-col items-center justify-center">
          <h1 class="animate-pulse">awaiting DB sync...</h1>
          <LoadingBar class="w-1/2 min-w-[320px]" />
        </div>
      }
    >
      <Presence exitBeforeEnter>
        <Show when={!isTableFullscreen()}>
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
                class="border-dividing-color placeholder:text-dividing-color hover:border-main-text-color focus:border-main-text-color h-[50px] w-full flex-1 rounded-none border-b-1 bg-transparent px-3 py-2 backdrop-blur-xl focus:outline-hidden lg:h-[48px] lg:flex-1 lg:px-5 lg:font-normal"
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
                {dictionary().ui.actions.add}
              </Button>
            </div>
          </Motion.div>
        </Show>
      </Presence>
      <Presence exitBeforeEnter>
        <Show when={!isTableFullscreen()}>
          <Motion.div
            class="Banner hidden h-[260px] flex-initial gap-3 p-3 opacity-0 lg:flex"
            animate={{ opacity: [0, 1] }}
            exit={{ opacity: [1, 0] }}
            transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
          >
            <div class="BannerContent flex flex-1 gap-6 lg:gap-2">
              <For each={[0, 1, 2]}>
                {(_, index) => {
                  const brandColor = {
                    1: "1st",
                    2: "2nd",
                    3: "3rd",
                  }[1 + (index() % 3)];
                  return (
                    <div
                      class={`Banner-${index} flex-none overflow-hidden rounded border-2 ${activeBannerIndex() === index() ? "active shadow-card shadow-dividing-color border-primary-color" : "border-transparent"}`}
                      onMouseEnter={() => setActiveBannerIndex(index())}
                      style={{
                        // "background-image": `url(${mobList()?.[0]?.image.dataUrl !== `"data:image/png;base64,"` ? mobList()?.[0]?.image.dataUrl : defaultImage.dataUrl})`,
                        "background-position": "center center",
                      }}
                    >
                      <div
                        class={`mask ${activeBannerIndex() === index() ? `bg-brand-color-${brandColor}` : `bg-area-color`} text-primary-color hidden h-full flex-col justify-center gap-2 p-8 lg:flex`}
                      >
                        <span
                          class={`text-3xl font-bold ${activeBannerIndex() === index() ? `text-primary-color` : `text-accent-color`}`}
                        >
                          TOP.{index() + 1}
                        </span>
                        <div
                          class={`h-[1px] w-[110px] ${activeBannerIndex() === index() ? `bg-primary-color` : `bg-accent-color`}`}
                        ></div>
                        <span
                          class={`text-xl ${activeBannerIndex() === index() ? `text-primary-color` : `text-accent-color`}`}
                        >
                          {mobList()?.[index()]?.name}
                        </span>
                      </div>
                    </div>
                  );
                }}
              </For>
            </div>
          </Motion.div>
        </Show>
      </Presence>
      <div class="Table&News flex h-full flex-1 flex-col gap-3 overflow-hidden lg:flex-row lg:p-3">
        <div class="TableModule flex flex-1 flex-col overflow-hidden">
          <div class="Title hidden h-12 w-full items-center gap-3 lg:flex">
            <div class={`Text text-xl ${isTableFullscreen() ? "lg:hidden lg:opacity-0" : ""}`}>
              {dictionary().ui.mob.table.title}
            </div>
            <div
              class={`Description bg-area-color flex-1 rounded p-3 opacity-0 ${isTableFullscreen() ? "lg:opacity-100" : "lg:opacity-0"}`}
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
                setIsTableFullscreen(!isTableFullscreen());
              }}
            >
              {isTableFullscreen() ? <Icon.Line.Collapse /> : <Icon.Line.Expand />}
            </Button>
          </div>
          <VirtualTable
            tableName="mob"
            itemList={mobList}
            itemDic={dictionary().db.mob}
            tableColumns={mobColumns}
            tableHiddenColumns={mobTableHiddenColumns}
            tableTdGenerator={mobTdGenerator}
            filterIsOpen={tableFilterIsOpen}
            setFilterIsOpen={setTableFilterIsOpen}
          />
        </div>
        <Presence exitBeforeEnter>
          <Show when={!isTableFullscreen()}>
            <Motion.div
              animate={{ opacity: [0, 1] }}
              exit={{ opacity: 0 }}
              class="News hidden w-[248px] flex-initial flex-col gap-2 lg:flex"
            >
              <div class="Title flex h-12 text-xl">{dictionary().ui.mob.news.title}</div>
              <div class="Content flex flex-1 flex-col">
                <For each={[0, 1, 2]}>
                  {() => {
                    return <div></div>;
                  }}
                </For>
              </div>
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
    </Show>
  );
}
