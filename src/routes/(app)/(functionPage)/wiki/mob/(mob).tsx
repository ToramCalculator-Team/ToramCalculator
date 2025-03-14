import { createMemo, createResource, createSignal, JSX, onCleanup, onMount, Show } from "solid-js";
import { Cell, ColumnDef, flexRender } from "@tanstack/solid-table";
import { Motion, Presence } from "solid-motionone";
import { defaultImage } from "~/repositories/image";
import { type Mob, MobDic, defaultMob, findMobById, findMobs } from "~/repositories/mob";
import { FormSate, setStore, store } from "~/store";
import { getDictionary } from "~/locales/i18n";
import * as Icon from "~/components/icon";
import Button from "~/components/controls/button";
import { type Enums } from "~/repositories/enums";
import { DicEnumsKeys, DicEnumsKeysValue } from "~/locales/dictionaries/type";
import { createSyncResource } from "~/hooks/resource";
import VirtualTable from "~/components/module/virtualTable";
import { getCommonPinningStyles } from "~/lib/table";

export default function MobIndexPage() {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));
  // 状态管理参数
  const [isFormFullscreen, setIsFormFullscreen] = createSignal(true);
  const [dialogState, setDialogState] = createSignal(false);
  const [formState, setformState] = createSignal<FormSate>("CREATE");
  const [activeBannerIndex, setActiveBannerIndex] = createSignal(1);
  const setMobformState = (newState: FormSate): void => {
    setStore("wiki", "mob", {
      formState: newState,
    });
  };
  const setMob = (newMob: Mob): void => {
    setStore("wiki", "mob", "id", newMob.id);
  };

  // table
  const mobColumns: ColumnDef<Mob>[] = [
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
      cell: (info) => dictionary().enums.MobType[info.getValue<Enums["MobType"]>()],
      size: 120,
    },
    {
      accessorKey: "captureable",
      header: () => MobDic(store.settings.language).captureable,
      cell: (info) => info.getValue<Boolean>().toString(),
      size: 120,
    },
    {
      accessorKey: "baseLv",
      header: () => MobDic(store.settings.language).baseLv,
      cell: (info) => info.getValue(),
      size: 120,
    },
    {
      accessorKey: "experience",
      header: () => MobDic(store.settings.language).experience,
      size: 120,
    },
    {
      accessorKey: "partsExperience",
      header: () => MobDic(store.settings.language).partsExperience,
      cell: (info) => info.getValue(),
      size: 120,
    },
    {
      accessorKey: "elementType",
      header: () => MobDic(store.settings.language).elementType,
      cell: (info) => info.getValue<Enums["ElementType"]>(),
      size: 120,
    },
    {
      accessorKey: "physicalDefense",
      header: () => MobDic(store.settings.language).physicalDefense,
      size: 120,
    },
    {
      accessorKey: "physicalResistance",
      header: () => MobDic(store.settings.language).physicalResistance,
      size: 120,
    },
    {
      accessorKey: "magicalDefense",
      header: () => MobDic(store.settings.language).magicalDefense,
      size: 120,
    },
    {
      accessorKey: "magicalResistance",
      header: () => MobDic(store.settings.language).magicalResistance,
      size: 120,
    },
    {
      accessorKey: "criticalResistance",
      header: () => MobDic(store.settings.language).criticalResistance,
      size: 120,
    },
    {
      accessorKey: "avoidance",
      header: () => MobDic(store.settings.language).avoidance,
      size: 100,
    },
    {
      accessorKey: "dodge",
      header: () => MobDic(store.settings.language).dodge,
      size: 100,
    },
    {
      accessorKey: "block",
      header: () => MobDic(store.settings.language).block,
      size: 100,
    },
    {
      accessorKey: "actions",
      header: () => MobDic(store.settings.language).actions,
      cell: (info) => JSON.stringify(info.getValue<Object>()),
      size: 150,
    },
    // {
    //   accessorKey: "belongToZones",
    //   header: () => MobDic(store.settings.language).belongToZones,
    //   cell: (info) => info.getValue(),
    //   size: 150,
    // },
  ];
  const [mobList] = createSyncResource("mob", findMobs);
  const [mob, { refetch: refetchMob }] = createResource(store.wiki.mob?.id, findMobById);

  const mobTableHiddenColumns: Array<keyof Mob> = ["id", "updatedByAccountId"];

  function mobTdGenerator(props: { cell: Cell<Mob, keyof Mob> }) {
    const [tdContent, setTdContent] = createSignal<JSX.Element>(<>{"=.=.=.="}</>);

    switch (props.cell.column.id as Exclude<keyof Mob, keyof typeof mobTableHiddenColumns>) {
      case "elementType":
        setTdContent(
          {
            Water: <Icon.Element.Water class="h-12 w-12" />,
            Fire: <Icon.Element.Fire class="h-12 w-12" />,
            Earth: <Icon.Element.Earth class="h-12 w-12" />,
            Wind: <Icon.Element.Wind class="h-12 w-12" />,
            Light: <Icon.Element.Light class="h-12 w-12" />,
            Dark: <Icon.Element.Dark class="h-12 w-12" />,
            Normal: <Icon.Element.NoElement class="h-12 w-12" />,
          }[props.cell.getValue() as Enums["ElementType"]] ?? undefined,
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
        class={"flex flex-col justify-center py-6"}
      >
        {/* 当此字段不存在于枚举类型中时，展示原始文本 */}
        <Show
          when={
            Object.keys(dictionary().enums).includes(
              "Mob" + props.cell.column.id.charAt(0).toLocaleUpperCase() + props.cell.column.id.slice(1),
            ) &&
            Object.keys(
              dictionary().enums[
                ("Mob" +
                  props.cell.column.id.charAt(0).toLocaleUpperCase() +
                  props.cell.column.id.slice(1)) as DicEnumsKeys
              ],
            ).includes(props.cell.getValue()) &&
            props.cell.column.id !== "elementType" // elementType已特殊处理，再以文本显示
          }
          fallback={tdContent()}
        >
          {
            dictionary().enums[
              ("Mob" +
                props.cell.column.id.charAt(0).toLocaleUpperCase() +
                props.cell.column.id.slice(1)) as DicEnumsKeys
            ][props.cell.getValue() as keyof DicEnumsKeysValue]
          }
        </Show>
      </td>
    );
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
                  setMob(defaultMob);
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
                  setMob(defaultMob);
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
            exit={{ opacity: 0 }}
          >
            <div class="BannerContent flex flex-1 gap-6 lg:gap-2">
              <div
                class={`banner1 flex-none overflow-hidden rounded ${activeBannerIndex() === 1 ? "active shadow-dividing-color shadow-lg" : ""}`}
                onMouseEnter={() => setActiveBannerIndex(1)}
                style={{
                  "background-image": `url(${mobList()?.[0]?.image.dataUrl !== `"data:image/png;base64,"` ? mobList()?.[0]?.image.dataUrl : defaultImage.dataUrl})`,
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
                  "background-image": `url(${mobList()?.[1]?.image.dataUrl !== `"data:image/png;base64,"` ? mobList()?.[0]?.image.dataUrl : defaultImage.dataUrl})`,
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
                  "background-image": `url(${mobList()?.[2]?.image.dataUrl !== `"data:image/png;base64,"` ? mobList()?.[0]?.image.dataUrl : defaultImage.dataUrl})`,
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
      <div class="Table&News flex h-full flex-1 flex-col gap-3 overflow-hidden lg:p-3 lg:flex-row">
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
            item={mob}
            itemList={() => mobList() ?? []}
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
    </>
  );
}
