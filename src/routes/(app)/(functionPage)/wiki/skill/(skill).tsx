import { createEffect, createMemo, createResource, createSignal, For, JSX, onCleanup, onMount, Show } from "solid-js";
import {
  Cell,
  Column,
  ColumnDef,
  createSolidTable,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
} from "@tanstack/solid-table";
import { createVirtualizer, Virtualizer } from "@tanstack/solid-virtual";
import { Motion, Presence } from "solid-motionone";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import type { OverlayScrollbarsComponentRef } from "overlayscrollbars-solid";
import * as _ from "lodash-es";

import { defaultImage } from "~/repositories/client/image";
import { type Skill, SkillDic, defaultSkill, findSkillById, findSkills } from "~/repositories/client/skill";
import { setStore, store } from "~/store";
import { getDictionary } from "~/locales/i18n";
import * as Icon from "~/components/icon";
import Dialog from "~/components/controls/dialog";
import Button from "~/components/controls/button";
import { findSimulatorById } from "~/repositories/client/simulator";
import NodeEditor from "~/components/module/nodeEditor";
import { updateSkillEffect } from "~/repositories/client/skillEffect";
import { DataEnums } from "../../../../../../db/dataEnums";
import VirtualTable from "~/components/module/virtualTable";
import { Portal } from "solid-js/web";
import { getCommonPinningStyles } from "~/lib/table";

export default function SkillIndexPage() {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));
  // 状态管理参数
  const [isFormFullscreen, setIsFormFullscreen] = createSignal(true);
  const [dialogState, setDialogState] = createSignal(false);
  const setSkill = (newSkill: Skill["Insert"]): void => {
    setStore("wiki", "skill", "id", newSkill.id);
  };

  // table原始数据------------------------------------------------------------

  const [skillList, { refetch: refetchSkillList }] = createResource(findSkills);
  const [skill, { refetch: refetchSkill }] = createResource(() =>
    findSkillById(store.wiki.skill?.id ?? defaultSkill.id),
  );

  // table
  const [tableFilterIsOpen, setTableFilterIsOpen] = createSignal(false);
  const skillColumns: ColumnDef<Skill["MainTable"]>[] = [
    {
      accessorKey: "id",
      header: () => SkillDic(store.settings.language).id,
      cell: (info) => info.getValue(),
      size: 200,
    },
    {
      accessorKey: "name",
      header: () => SkillDic(store.settings.language).name,
      cell: (info) => info.getValue(),
      size: 220,
    },
    {
      accessorKey: "treeType",
      header: () => SkillDic(store.settings.language).treeType,
      cell: (info) => dictionary().enums.skill.treeType[info.getValue<keyof DataEnums["skill"]["treeType"]>()],
      size: 120,
    },
    {
      accessorKey: "tier",
      header: () => SkillDic(store.settings.language).tier,
      cell: (info) => info.getValue(),
      size: 120,
    },
  ];

  const skillTableHiddenColumns: Array<keyof Skill["MainTable"]> = ["id"];

  function skillTdGenerator(props:{ cell: Cell<Skill["MainTable"], keyof Skill["MainTable"]> }) {
    const [tdContent, setTdContent] = createSignal<JSX.Element>(<>{"=.=.=.="}</>);
    type SkillKeys = keyof DataEnums["skill"];
    type SkillValueKeys<T extends SkillKeys> = keyof DataEnums["skill"][T];

    switch (props.cell.column.id as keyof Skill["MainTable"]) {
      case "id":
      case "treeType":
      case "posX":
      case "posY":
      case "tier":
      case "name":
      case "isPassive":
      case "chargingType":
      case "distanceType":
      case "targetType":
      case "details":
      case "dataSources":
      case "statisticId":
      case "updatedByAccountId":
      case "createdByAccountId":

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
            props.cell.column.id in dictionary().enums.skill && props.cell.column.id !== "initialElement" // elementType已特殊处理，再以文本显示
          }
          fallback={tdContent()}
        >
          {
            dictionary().enums.skill[props.cell.column.id as SkillKeys][
              props.cell.getValue() as SkillValueKeys<SkillKeys>
            ]
          }
        </Show>
      </td>
    );
  }

  // u键监听
  onMount(() => {
    console.log("--Skill Client Render");
    // u键监听
  });

  onCleanup(() => {
    console.log("--Skill Client Unmount");
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
                {dictionary().ui.skill.pageTitle}
              </h1>
              <input
                id="SkillSearchBox"
                type="search"
                placeholder={dictionary().ui.searchPlaceholder}
                class="border-dividing-color placeholder:text-dividing-color hover:border-main-text-color focus:border-main-text-color h-[50px] w-full flex-1 rounded-none border-b-2 bg-transparent px-3 py-2 backdrop-blur-xl focus:outline-hidden lg:h-[48px] lg:flex-1 lg:px-5 lg:font-normal"
                // onChange={(e) => handleSearchChange(e.target.value)}
              />
              <Button // 仅移动端显示
                size="sm"
                icon={<Icon.Line.CloudUpload />}
                class="flex lg:hidden"
                onClick={() => {
                  setSkill(defaultSkill);
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
                  setSkill(defaultSkill);
                  setStore("wiki", "skill", {
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
            exit={{ opacity: 0 }}
          ></Motion.div>
        </Show>
      </Presence>
      <div class="Table&News flex flex-1 flex-col gap-3 overflow-hidden p-3 lg:flex-row">
        <div class="TableModule flex flex-1 flex-col overflow-hidden">
          <div class="Title hidden h-12 w-full items-center gap-3 lg:flex">
            <div class={`Text text-xl ${isFormFullscreen() ? "lg:hidden lg:opacity-0" : ""}`}>
              {dictionary().ui.skill.table.title}
            </div>
            <div
              class={`Description bg-area-color flex-1 rounded p-3 opacity-0 ${isFormFullscreen() ? "lg:opacity-100" : "lg:opacity-0"}`}
            >
              {dictionary().ui.skill.table.description}
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
            tableName="skill"
            itemList={skillList}
            itemDic={SkillDic}
            tableColumns={skillColumns}
            tableHiddenColumns={skillTableHiddenColumns}
            tableTdGenerator={skillTdGenerator}
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
              <div class="Title flex h-12 text-xl">{dictionary().ui.skill.news.title}</div>
              <div class="Content bg-area-color flex flex-1 flex-col"></div>
            </Motion.div>
          </Show>
        </Presence>
      </div>

      <Portal>
        <Dialog state={dialogState()} setState={setDialogState}>
          {/* <pre>{JSON.stringify(skill(), null, 2)}</pre> */}
          <NodeEditor
            data={async () => {
              await refetchSkill();
              return skill()!.effects[0].logic as Record<string, any>;
            }}
            setData={async (data) => {
              const curSkillEffect = skill()?.effects[0];
              if (!curSkillEffect) return;
              // console.log("/////");
              await updateSkillEffect(curSkillEffect.id, { ...curSkillEffect, logic: data });
            }}
          />
        </Dialog>
      </Portal>
    </>
  );
}
