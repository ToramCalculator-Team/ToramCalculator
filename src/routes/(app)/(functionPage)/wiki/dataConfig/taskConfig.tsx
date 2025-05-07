import { Cell, flexRender } from "@tanstack/solid-table";
import { createResource, createSignal, For, JSX, Show } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { defaultTask, findTaskById, findTasks, Task } from "~/repositories/task";
import { DBdataDisplayConfig } from "./dataConfig";
import { taskSchema } from "~/../db/zod";
import { DB, task } from "~/../db/kysely/kyesely";
import { Dic, EnumFieldDetail } from "~/locales/type";
import { getDB } from "~/repositories/database";
import { DBDataRender } from "~/components/module/dbDataRender";
import { Button } from "~/components/controls/button";
import { CardSection } from "~/components/module/cardSection";

export const taskDataConfig: DBdataDisplayConfig<
  "task",
  Task["Card"],
  {
    npcs: string[];
    items: string[];
  }
> = {
  table: {
    columnDef: [
      {
        accessorKey: "id",
        cell: (info) => info.getValue(),
        size: 200,
      },
      {
        accessorKey: "name",
        cell: (info) => info.getValue(),
        size: 220,
      },
      {
        accessorKey: "description",
        cell: (info) => info.getValue(),
        size: 220,
      },
      {
        accessorKey: "type",
        cell: (info) => info.getValue(),
        size: 150,
      },
      {
        accessorKey: "lv",
        cell: (info) => info.getValue(),
        size: 100,
      },
    ],
    dataFetcher: findTasks,
    defaultSort: { id: "name", desc: false },
    hiddenColumnDef: ["id"],
    tdGenerator: (props: { cell: Cell<task, keyof task>; dictionary: Dic<task> }) => {
      const [tdContent, setTdContent] = createSignal<JSX.Element>(<>{"=.=.=.="}</>);
      let defaultTdClass = "text-main-text-color flex flex-col justify-center px-6 py-3";
      const columnId = props.cell.column.id as keyof task;
      switch (columnId) {
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
          {"enumMap" in props.dictionary.fields[columnId]
            ? (props.dictionary.fields[columnId] as EnumFieldDetail<keyof task>).enumMap[props.cell.getValue()]
            : props.cell.getValue()}
        </td>
      );
    },
  },
  form: {
    data: defaultTask,
    hiddenFields: ["id"],
    dataSchema: taskSchema,
    fieldGenerators: {},
    extraData: {
      npcs: {
        defaultValue: [],
        optionsFetcher: async (name) => {
          const db = await getDB();
          const npcs = await db.selectFrom("npc").select(["id", "name"]).where("name", "ilike", `%${name}%`).execute();
          return npcs.map((npc) => ({
            label: npc.name,
            value: npc.id,
          }));
        },
        dictionary: {
          key: "npcs",
          tableFieldDescription: "相关NPC",
          formFieldDescription: "相关NPC",
        },
      },
      items: {
        defaultValue: [],
        optionsFetcher: async (name) => {
          const db = await getDB();
          const items = await db
            .selectFrom("item")
            .select(["id", "name"])
            .where("name", "ilike", `%${name}%`)
            .execute();
          return items.map((item) => ({
            label: item.name,
            value: item.id,
          }));
        },
        dictionary: {
          key: "items",
          tableFieldDescription: "任务物品",
          formFieldDescription: "任务物品",
        },
      },
    },
  },
  card: {
    dataFetcher: findTaskById,
    cardRender: (data, dictionary, appendCardTypeAndIds) => {
      const [npcData] = createResource(data.id, async (taskId) => {
        const db = await getDB();
        return await db
          .selectFrom("task")
          .innerJoin("npc", "task.npcId", "npc.id")
          .where("task.id", "=", taskId)
          .selectAll("npc")
          .execute();
      });

      const [killsData] = createResource(data.id, async (taskId) => {
        const db = await getDB();
        return await db
          .selectFrom("task")
          .innerJoin("task_kill_requirement", "task.id", "task_kill_requirement.taskId")
          .innerJoin("mob", "task_kill_requirement.mobId", "mob.id")
          .where("task.id", "=", taskId)
          .select(["mob.name as mobName", "task_kill_requirement.count", "mob.id as mobId"])
          .execute();
      });

      const [collectData] = createResource(data.id, async (taskId) => {
        const db = await getDB();
        return await db
          .selectFrom("task")
          .innerJoin("task_collect_require", "task.id", "task_collect_require.taskId")
          .where("task.id", "=", taskId)
          .selectAll("task_collect_require")
          .execute();
      });

      const [rewardData] = createResource(data.id, async (taskId) => {
        const db = await getDB();
        return await db
          .selectFrom("task")
          .innerJoin("task_reward", "task.id", "task_reward.taskId")
          .innerJoin("item", "task_reward.itemId", "item.id")
          .where("task.id", "=", taskId)
          .select([
            "task_reward.probability",
            "task_reward.type",
            "task_reward.value",
            "item.name as itemName",
            "item.type as itemType",
            "item.id as itemId",
          ])
          .execute();
      });

      return (
        <>
          <div class="TaskImage bg-area-color h-[18vh] w-full rounded"></div>
          {DBDataRender<"task">({
            data,
            dictionary: dictionary,
            dataSchema: taskSchema,
            hiddenFields: ["id"],
            fieldGroupMap: {
              基本信息: ["name", "description", "type", "lv"],
            },
          })}

          <CardSection
            title={dictionary.cardFields?.npcs ?? "属于NPC"}
            data={npcData.latest}
            renderItem={(npc) => ({
              label: npc.name,
              onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: "npc", id: npc.id }]),
            })}
          />

          <CardSection
            title={dictionary.cardFields?.items ?? "道具需求"}
            data={collectData.latest}
            renderItem={(collect) => ({
              label: collect.itemId,
            })}
          />

          <CardSection
            title={dictionary.cardFields?.items ?? "击杀需求"}
            data={killsData.latest}
            renderItem={(kill) => ({
              label: `${kill.mobName} * ${kill.count}`,
              onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: "mob", id: kill.mobId }]),
            })}
          />

          <CardSection
            title={dictionary.cardFields?.items ?? "奖励"}
            data={rewardData.latest}
            renderItem={(reward) => {
              if (reward.type === "Item") {
                return {
                  label: `${reward.itemName} * ${reward.value} : ${reward.probability}%`,
                  onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: "item", id: reward.itemId }]),
                };
              } else if (reward.type === "Money") {
                return {
                  label: `金钱: ${reward.value}`,
                };
              } else if (reward.type === "Exp") {
                return {
                  label: `经验: ${reward.value}`,
                };
              }
              return { label: "未知奖励类型" };
            }}
          />
        </>
      );
    },
  },
};
