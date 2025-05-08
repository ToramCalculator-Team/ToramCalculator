import { Cell, flexRender } from "@tanstack/solid-table";
import { createResource, createSignal, For, JSX, Show } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { createTask, findTaskById, findTasks, Task } from "~/repositories/task";
import { dataDisplayConfig } from "./dataConfig";
import { taskSchema } from "~/../db/zod";
import { DB, task } from "~/../db/kysely/kyesely";
import { Dic, EnumFieldDetail } from "~/locales/type";
import { getDB } from "~/repositories/database";
import { DBDataRender } from "~/components/module/dbDataRender";
import { CardSection } from "~/components/module/cardSection";
import { defaultData } from "~/../db/defaultData";
import { EnumSelect } from "~/components/controls/enumSelect";
import { fieldInfo } from "../utils";
import { createTaskCollectRequire } from "~/repositories/taskCollectRequire";
import { createTaskKillRequirement } from "~/repositories/taskKillRequirement";
import { createTaskReward } from "~/repositories/taskReward";
import { createId } from "@paralleldrive/cuid2";
import { Autocomplete } from "~/components/controls/autoComplete";
import { Input } from "~/components/controls/input";
import { itemTypeToTableType } from "./utils";

export const createTaskDataConfig = (
  dic: Dic<task>,
): dataDisplayConfig<
  task,
  Task["Card"],
  {
    rewardItems: string[];
    collectItems: string[];
    killMobs: string[];
  }
> => ({
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
    dictionary: dic,
    tdGenerator: (props: { cell: Cell<task, keyof task> }) => {
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
          <Show when={true} fallback={tdContent()}>
            {"enumMap" in dic.fields[columnId]
              ? (dic.fields[columnId] as EnumFieldDetail<keyof task>).enumMap[props.cell.getValue()]
              : props.cell.getValue()}
          </Show>
        </td>
      );
    },
  },
  form: {
    data: defaultData.task,
    hiddenFields: ["id"],
    dataSchema: taskSchema,
    dictionary: dic,
    fieldGenerators: {
      type: (key, field) => {
        const zodValue = taskSchema.shape[key];
        return (
          <EnumSelect
            title={dic.fields[key].key}
            description={dic.fields[key].formFieldDescription}
            state={fieldInfo(field())}
            options={zodValue.options}
            field={field}
            dic={dic.fields[key].enumMap}
          />
        );
      },
      npcId: (key, field) => {
        return (
          <Input
            title={dic.fields[key].key}
            description={dic.fields[key].formFieldDescription}
            state={fieldInfo(field())}
            class="border-dividing-color bg-primary-color w-full rounded-md border-1"
          >
            <Autocomplete
              value={field().state.value}
              setValue={(id) => {
                field().setValue(id);
              }}
              optionsFetcher={async (search) => {
                const db = await getDB();
                const result = await db
                  .selectFrom("npc")
                  .select(["id", "name"])
                  .where("name", "ilike", `%${search}%`)
                  .limit(50)
                  .execute();
                return result.map((item) => ({
                  label: item.name,
                  value: item.id,
                }));
              }}
            />
          </Input>
        );
      },
    },
    extraData: {
      collectItems: {
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
      killMobs: {
        defaultValue: [],
        optionsFetcher: async (name) => {
          const db = await getDB();
          const mobs = await db.selectFrom("mob").select(["id", "name"]).where("name", "ilike", `%${name}%`).execute();
          return mobs.map((mob) => ({
            label: mob.name,
            value: mob.id,
          }));
        },
        dictionary: {
          key: "mobs",
          tableFieldDescription: "任务击杀怪物",
          formFieldDescription: "任务击杀怪物",
        },
      },
      rewardItems: {
        defaultValue: [],
        optionsFetcher: async (name) => {
          const db = await getDB();
          const items = await db
            .selectFrom("task_reward")
            .innerJoin("item", "task_reward.itemId", "item.id")
            .where("item.name", "ilike", `%${name}%`)
            .select(["item.name as itemName", "item.id as itemId"])
            .execute();
          return items.map((item) => ({
            label: item.itemName,
            value: item.itemId,
          }));
        },
        dictionary: {
          key: "items",
          tableFieldDescription: "任务奖励物品",
          formFieldDescription: "任务奖励物品",
        },
      },
    },
    onSubmit: async (data) => {
      const db = await getDB();
      const task = await db.transaction().execute(async (trx) => {
        const { collectItems, killMobs, rewardItems, ...rest } = data;
        const task = await createTask(trx, {
          ...rest,
        });
        if (collectItems.length > 0) {
          for (const itemId of collectItems) {
            await createTaskCollectRequire(trx, {
              id: createId(),
              taskId: task.id,
              itemId,
              count: 1,
            });
          }
        }
        if (killMobs.length > 0) {
          for (const mobId of killMobs) {
            await createTaskKillRequirement(trx, {
              id: createId(),
              taskId: task.id,
              mobId,
              count: 1,
            });
          }
        }
        if (rewardItems.length > 0) {
          for (const itemId of rewardItems) {
            await createTaskReward(trx, {
              id: createId(),
              taskId: task.id,
              itemId,
              type: "Item",
              value: 1,
              probability: 100,
            });
          }
        }
        return task;
      });
    },
  },
  card: {
    dataFetcher: findTaskById,
    cardRender: (
      data: task,
      appendCardTypeAndIds: (
        updater: (prev: { type: keyof DB; id: string }[]) => { type: keyof DB; id: string }[],
      ) => void,
    ) => {
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
            "item.itemType as itemType",
            "item.id as itemId",
          ])
          .execute();
      });

      return (
        <>
          <div class="TaskImage bg-area-color h-[18vh] w-full rounded"></div>
          {DBDataRender<Task["Card"]>({
            data,
            dictionary: dic,
            dataSchema: taskSchema,
            hiddenFields: ["id"],
            fieldGroupMap: {
              基本信息: ["name", "description", "type", "lv"],
            },
          })}

          <CardSection
            title={dic.cardFields?.npcs ?? "属于NPC"}
            data={npcData.latest}
            renderItem={(npc) => ({
              label: npc.name,
              onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: "npc", id: npc.id }]),
            })}
          />

          <CardSection
            title={dic.cardFields?.items ?? "道具需求"}
            data={collectData.latest}
            renderItem={(collect) => ({
              label: collect.itemId,
            })}
          />

          <CardSection
            title={dic.cardFields?.items ?? "击杀需求"}
            data={killsData.latest}
            renderItem={(kill) => ({
              label: `${kill.mobName} * ${kill.count}`,
              onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: "mob", id: kill.mobId }]),
            })}
          />

          <CardSection
            title={dic.cardFields?.items ?? "奖励"}
            data={rewardData.latest}
            renderItem={(reward) => {
              if (reward.type === "Item") {
                return {
                  label: `${reward.itemName} * ${reward.value} : ${reward.probability}%`,
                  onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: itemTypeToTableType(reward.itemType), id: reward.itemId }]),
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
});
