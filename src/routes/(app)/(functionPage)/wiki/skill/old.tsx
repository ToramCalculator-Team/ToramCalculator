import { createMemo, createResource, createSignal, For, JSX, onCleanup, onMount, Show } from "solid-js";
import { Cell, ColumnDef, flexRender } from "@tanstack/solid-table";
import { Motion, Presence } from "solid-motionone";
import { type Skill, createSkill, defaultSkill, findSkillById, findSkills } from "~/repositories/skill";
import { setStore, store } from "~/store";
import { getDictionary } from "~/locales/i18n";
import * as Icon from "~/components/icon";
import { Button  } from "~/components/controls/button";
import { createSyncResource } from "~/hooks/resource";
import { VirtualTable  } from "~/components/module/virtualTable";
import { getCommonPinningStyles } from "~/lib/table";
import { Portal } from "solid-js/web";
import { Sheet } from "~/components/controls/sheet";
import { z, ZodFirstPartyTypeKind } from "zod";
import { skill_effectSchema, skillSchema, statisticSchema } from "~/../db/zod";
import { DataEnums } from "~/../db/dataEnums";
import { LoadingBar } from "~/components/loadingBar";
import { Form } from "~/components/module/form";

export default function SkillIndexPage() {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));
  // 状态管理参数
  const [isTableFullscreen, setIsTableFullscreen] = createSignal(false);
  const [activeBannerIndex, setActiveBannerIndex] = createSignal(0);
  const setSkill = (newSkill: Skill["MainTable"]): void => {
    setStore("wiki", "skill", "id", newSkill.id);
  };

  // table config
  const [tableFilterIsOpen, setTableFilterIsOpen] = createSignal(false);
  const skillColumns: ColumnDef<Skill["MainTable"]>[] = [
    {
      accessorKey: "id",
      header: () => dictionary().db.skill.fields.id,
      cell: (info) => info.getValue(),
      size: 200,
    },
    {
      accessorKey: "name",
      header: () => dictionary().db.skill.fields.name,
      cell: (info) => info.getValue(),
      size: 220,
    },
    {
      accessorKey: "treeType",
      header: () => dictionary().db.skill.fields.treeType,
      cell: (info) => dictionary().enums.skill.treeType[info.getValue<keyof DataEnums["skill"]["treeType"]>()],
      size: 120,
    },
    {
      accessorKey: "tier",
      header: () => dictionary().db.skill.fields.tier,
      cell: (info) => info.getValue<Boolean>().toString(),
      size: 160,
    },
  ];
  const [skillList, { refetch: refetchSkillList }] = createSyncResource("skill", findSkills);

  const skillTableHiddenColumns: Array<keyof Skill["MainTable"]> = [
    "id",
    "createdByAccountId",
    "updatedByAccountId",
  ];

  function skillTdGenerator(props: { cell: Cell<Skill["MainTable"], keyof Skill["MainTable"]> }) {
    const [tdContent, setTdContent] = createSignal<JSX.Element>(<>{"=.=.=.="}</>);
    type SkillKeys = keyof DataEnums["skill"];
    type SkillValueKeys<T extends SkillKeys> = keyof DataEnums["skill"][T];
    let defaultTdClass = "text-main-text-color flex flex-col justify-center p-6";
    switch (props.cell.column.id as keyof Skill["MainTable"]) {
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
            props.cell.column.id in dictionary().enums.skill && props.cell.column.id !== "initialElement" // elementType已特殊处理，再以文本显示
          }
          fallback={tdContent()}
        >
          {dictionary().enums.skill[props.cell.column.id as SkillKeys][props.cell.getValue() as SkillValueKeys<SkillKeys>]}
        </Show>
      </td>
    );
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

  // form
  const [formSkill, setFormSkill] = createSignal<Skill["MainForm"]>(defaultSkill);
  const skillFormHiddenFields: Array<keyof Skill["MainForm"]> = [
    "id",
    "statisticId",
    "createdByAccountId",
    "updatedByAccountId",
  ];
  const form = Form({
    tableName: "skill",
    defaultItem: defaultSkill,
    item: () => formSkill(),
    itemSchema: skillSchema,
    formHiddenFields: skillFormHiddenFields,
    fieldGenerator: (key, field) => {
      switch (key) {
        default: return <></>
       }
    },
    createItem: createSkill,
    refetchItemList: refetchSkillList,
  })
  
  // card
  // 1. 等待 store.database.tableSyncState.skill 为 true
  const readySkillId = createMemo(() => {
    if (store.database.tableSyncState.skill && store.wiki.skill?.id) {
      return store.wiki.skill.id;
    }
    return undefined; // 未就绪返回 undefined，createResource 将忽略
  });

  // 2. 异步加载 skill 数据，仅当 readySkillId 有值时才触发 fetch
  const [displayedSkill, { refetch: refetchSkill }] = createResource(readySkillId, findSkillById);
  const skillCardHiddenFields: Array<keyof Skill["Card"]> = [
    "id",
    "statisticId",
    "createdByAccountId",
    "updatedByAccountId",
  ];
  const card = (data: Skill["Card"] | undefined) => {
    // console.log(data);
    const skillCardSchema = skillSchema.extend({
      effects: z.array(skill_effectSchema),
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
              const fieldKey = _field[0] as keyof Skill["Card"];
              const fieldValue = _field[1];
              // 过滤掉隐藏的数据
              if (skillCardHiddenFields.includes(fieldKey)) return;
              // 输入框的类型计算
              const zodValue = skillCardSchema.shape[fieldKey];
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
                      case "effects" : {
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
                const key = fieldKey as keyof Skill["Select"];
                switch (valueType) {
                  case ZodFirstPartyTypeKind.ZodNumber: {
                    switch (key) {
                      case "tier":
                    }
                    return (
                      <div class="Field flex gap-1">
                        <span class="text-main-text-color">{dictionary().db.skill.fields[key].key}</span>:
                        <span class="text-accent-color font-bold">{fieldValue as number}</span>
                        <span class="text-dividing-color">{`[${valueType}]`}</span>
                      </div>
                    );
                  }

                  case ZodFirstPartyTypeKind.ZodBoolean: {
                    return (
                      <div class="Field flex gap-1">
                        <span class="text-main-text-color">{dictionary().db.skill.fields[key].key}</span>:
                        <span class="text-accent-color font-bold">{fieldValue as boolean}</span>
                        <span class="text-dividing-color">{`[${valueType}]`}</span>
                      </div>
                    );
                  }

                  case ZodFirstPartyTypeKind.ZodEnum:
                  // 字符串输入
                  default: {
                    if (fieldKey in defaultSkill) {
                      return (
                        <div class="Field flex gap-1">
                          <span class="text-main-text-color">{dictionary().db.skill.fields[key].key}</span>:
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
    switch (store.wiki.skill?.dialogType) {
      case "form":
        return form;
      case "card":
        return card(displayedSkill.latest);
    }
  });

  onMount(() => {
    console.log("--Skill Page Render");
  });

  onCleanup(() => {
    console.log("--Skill Page Unmount");
  });

  return (
    <Show
      when={store.database.tableSyncState.skill}
      fallback={
        <div class="LoadingState w-full h-full flex flex-col items-center justify-center gap-3">
          <LoadingBar class="w-1/2 min-w-[320px]" />
          <h1 class="animate-pulse">awaiting DB sync...</h1>
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
                {dictionary().ui.skill.pageTitle}
              </h1>
              <input
                id="SkillSearchBox"
                type="search"
                placeholder={dictionary().ui.searchPlaceholder}
                class="border-dividing-color placeholder:text-dividing-color hover:border-main-text-color focus:border-main-text-color h-[50px] w-full flex-1 rounded-none border-b-1 bg-transparent px-3 py-2 backdrop-blur-xl focus:outline-hidden lg:h-[48px] lg:flex-1 lg:px-5 lg:font-normal"
              />
              <Button // 仅移动端显示
                size="sm"
                icon={<Icon.Line.CloudUpload />}
                class="flex lg:hidden"
                onClick={() => {
                  setStore("wiki", "skill", {
                    dialogType: "form",
                    dialogIsOpen: true,
                  });
                }}
              ></Button>
              <Button // 仅PC端显示
                icon={<Icon.Line.CloudUpload />}
                class="hidden lg:flex"
                onClick={() => {
                  setStore("wiki", "skill", {
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
                        // "background-image": `url(${skillList()?.[0]?.image.dataUrl !== `"data:image/png;base64,"` ? skillList()?.[0]?.image.dataUrl : defaultImage.dataUrl})`,
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
                          {skillList()?.[index()]?.name}
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
              {dictionary().ui.skill.table.title}
            </div>
            <div
              class={`Description bg-area-color flex-1 rounded p-3 opacity-0 ${isTableFullscreen() ? "lg:opacity-100" : "lg:opacity-0"}`}
            >
              {dictionary().ui.skill.table.description}
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
            tableName="skill"
            dataList={skillList}
            dataDic={dictionary().db.skill}
            tableColumns={skillColumns}
            tableHiddenColumns={skillTableHiddenColumns}
            tableTdGenerator={skillTdGenerator}
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
              <div class="Title flex h-12 text-xl">{dictionary().ui.skill.news.title}</div>
              <div class="Content flex flex-1 flex-col gap-3">
                <For each={[0, 1, 2]}>
                  {() => {
                    return <div class="Item w-full h-full flex-1 bg-area-color rounded"></div>;
                  }}
                </For>
              </div>
            </Motion.div>
          </Show>
        </Presence>
      </div>

      <Portal>
        <Sheet
          state={store.wiki.skill?.dialogIsOpen ?? false}
          setState={(state: boolean) => setStore("wiki", "skill", "dialogIsOpen", state)}
        >
          {dialogContet()}
        </Sheet>
      </Portal>
    </Show>
  );
}
