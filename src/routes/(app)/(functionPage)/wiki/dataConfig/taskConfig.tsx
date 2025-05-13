import { Cell, flexRender } from "@tanstack/solid-table";
import { createResource, createSignal, For, JSX, Show } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { createTask, findTaskById, findTasks, Task } from "~/repositories/task";
import { fieldInfo } from "../utils";
import { dataDisplayConfig } from "./dataConfig";
import { taskSchema, task_collect_requireSchema, task_kill_requirementSchema, task_rewardSchema } from "~/../db/zod";
import { task, DB, task_collect_require, task_kill_requirement, task_reward } from "~/../db/kysely/kyesely";
import { dictionary } from "~/locales/type";
import { getDB } from "~/repositories/database";
import { DBDataRender } from "~/components/module/dbDataRender";
import { Input } from "~/components/controls/input";
import { Autocomplete } from "~/components/controls/autoComplete";
import { defaultData } from "~/../db/defaultData";
import { CardSection } from "~/components/module/cardSection";
import { z } from "zod";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { Button } from "~/components/controls/button";
import { Select } from "~/components/controls/select";
import { DeepKeys, DeepValue } from "@tanstack/solid-form";
import { createId } from "@paralleldrive/cuid2";
import { EnumSelect } from "~/components/controls/enumSelect";
import { itemTypeToTableType } from "./utils";

type TaskWithRelated = task & {
  collectRequires: task_collect_require[];
  killRequirements: task_kill_requirement[];
  rewards: task_reward[];
};

const TaskWithRelatedSchema = z.object({
  ...taskSchema.shape,
  collectRequires: z.array(task_collect_requireSchema),
  killRequirements: z.array(task_kill_requirementSchema),
  rewards: z.array(task_rewardSchema),
});

export const createTaskDataConfig = (dic: dictionary): dataDisplayConfig<TaskWithRelated> => ({
  defaultData: {
    ...defaultData.task,
    collectRequires: [],
    killRequirements: [],
    rewards: [],
  },
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
        accessorKey: "lv",
        cell: (info) => info.getValue(),
        size: 100,
      },
      {
        accessorKey: "type",
        cell: (info) => info.getValue(),
        size: 100,
      },
    ],
    hiddenColumns: ["id"],
    defaultSort: { id: "name", desc: false },
    tdGenerator: (props) => {
      const [tdContent, setTdContent] = createSignal<JSX.Element>(<>{"=.=.=.="}</>);
      let defaultTdClass = "text-main-text-color flex flex-col justify-center px-6 py-3";
      const columnId = props.cell.column.id as keyof TaskWithRelated;
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
            {props.cell.getValue()}
          </Show>
        </td>
      );
    },
  },
  dataFetcher: async (id) => {
    const db = await getDB();
    const res = await db
      .selectFrom("task")
      .where("id", "=", id)
      .selectAll("task")
      .select((eb) => [
        jsonArrayFrom(
          eb
            .selectFrom("task_collect_require")
            .whereRef("task_collect_require.taskId", "=", eb.ref("task.id"))
            .selectAll("task_collect_require"),
        ).as("collectRequires"),
        jsonArrayFrom(
          eb
            .selectFrom("task_kill_requirement")
            .whereRef("task_kill_requirement.taskId", "=", eb.ref("task.id"))
            .selectAll("task_kill_requirement"),
        ).as("killRequirements"),
        jsonArrayFrom(
          eb.selectFrom("task_reward").whereRef("task_reward.taskId", "=", eb.ref("task.id")).selectAll("task_reward"),
        ).as("rewards"),
      ])
      .executeTakeFirstOrThrow();
    return res;
  },
  datasFetcher: async () => {
    const db = await getDB();
    const res = await db
      .selectFrom("task")
      .selectAll("task")
      .select((eb) => [
        jsonArrayFrom(
          eb
            .selectFrom("task_collect_require")
            .whereRef("task_collect_require.taskId", "=", eb.ref("task.id"))
            .selectAll("task_collect_require"),
        ).as("collectRequires"),
        jsonArrayFrom(
          eb
            .selectFrom("task_kill_requirement")
            .whereRef("task_kill_requirement.taskId", "=", eb.ref("task.id"))
            .selectAll("task_kill_requirement"),
        ).as("killRequirements"),
        jsonArrayFrom(
          eb.selectFrom("task_reward").whereRef("task_reward.taskId", "=", eb.ref("task.id")).selectAll("task_reward"),
        ).as("rewards"),
      ])
      .execute();
    return res;
  },
  dictionary: dic,
  dataSchema: TaskWithRelatedSchema,
  form: {
    hiddenFields: ["id"],
    fieldGenerators: {
      type: (key, field) => {
        return (
          <Input
            title={dic.db.task.fields[key].key}
            description={dic.db.task.fields[key].formFieldDescription}
            state={fieldInfo(field())}
            class="border-dividing-color bg-primary-color w-full rounded-md border-1"
          >
            <Select
              value={field().state.value}
              setValue={(value) => field().setValue(value as DeepValue<TaskWithRelated, DeepKeys<TaskWithRelated>>)}
              optionsFetcher={async () => {
                return Object.entries(dic.db.task.fields[key].enumMap).map(([value, label]) => ({
                  label: label as string,
                  value,
                }));
              }}
            />
          </Input>
        );
      },
      npcId: (key, field) => {
        const initialValue = field().state.value;
        return (
          <Input
            title={dic.db.task.fields[key].key}
            description={dic.db.task.fields[key].formFieldDescription}
            state={fieldInfo(field())}
            class="border-dividing-color bg-primary-color w-full rounded-md border-1"
          >
            <Autocomplete
              id={key}
              initialValue={initialValue}
              setValue={(value) => {
                field().setValue(value.id);
              }}
              datasFetcher={async () => {
                const db = await getDB();
                const npcs = await db.selectFrom("npc").selectAll("npc").execute();
                return npcs;
              }}
              displayField="name"
              valueField="id"
            />
          </Input>
        );
      },
      collectRequires: (key, field) => {
        return (
          <Input
            title={dic.db.task_collect_require.selfName}
            description={dic.db.task_collect_require.description}
            state={fieldInfo(field())}
            class="border-dividing-color bg-primary-color w-full rounded-md border-1"
          >
            <div class="ArrayBox flex w-full flex-col gap-2 rounded-md">
              <For each={field().state.value}>
                {(_item, index) => {
                  const initialValue = _item as task_collect_require & { itemName: string };
                  return (
                    <div class="ObjectBox border-dividing-color flex flex-col rounded-md border-1">
                      <div class="Title border-dividing-color flex w-full items-center justify-between border-b-1 p-2">
                        <span class="text-accent-color font-bold">{key.toLocaleUpperCase() + " " + index()}</span>
                        <Button
                          onClick={() => {
                            const newArray = (field().state.value as unknown[]).filter((_, i) => i !== index());
                            field().setValue(newArray);
                          }}
                        >
                          -
                        </Button>
                      </div>
                      <div class="SubForm-DropItem flex w-full flex-col gap-2">
                        <div id={key + "itemId" + index()} class="flex-1">
                          <Input
                            title={dic.db.task_collect_require.fields.itemId.key}
                            description={dic.db.task_collect_require.fields.itemId.formFieldDescription}
                            state={fieldInfo(field())}
                          >
                            <Autocomplete
                              id={key + "itemId" + index()}
                              initialValue={{
                                itemId: initialValue.itemId,
                                itemName: initialValue.itemName,
                              }}
                              setValue={(value) => {
                                const newArray = [...field().state.value];
                                newArray[index()] = value;
                                field().setValue(newArray);
                              }}
                              datasFetcher={async () => {
                                const db = await getDB();
                                const items = await db
                                  .selectFrom("task_collect_require")
                                  .innerJoin("item", "task_collect_require.itemId", "item.id")
                                  .select(["task_collect_require.itemId", "item.name as itemName"])
                                  .execute();
                                return items;
                              }}
                              displayField="itemName"
                              valueField="itemId"
                            />
                          </Input>
                        </div>
                        <div id={key + "count" + index()} class="flex-1">
                          <Input
                            type="number"
                            title={dic.db.task_collect_require.fields.count.key}
                            description={dic.db.task_collect_require.fields.count.formFieldDescription}
                            state={fieldInfo(field())}
                          />
                        </div>
                      </div>
                    </div>
                  );
                }}
              </For>
              <Button
                onClick={() => {
                  const newArray = [...(field().state.value as string[]), defaultData.drop_item];
                  field().setValue(newArray);
                }}
                class="w-full"
              >
                +
              </Button>
            </div>
          </Input>
        );
      },
      killRequirements: (key, field) => {
        return (
          <Input
            title={dic.db.task_kill_requirement.selfName}
            description={dic.db.task_kill_requirement.description}
            state={fieldInfo(field())}
            class="border-dividing-color bg-primary-color w-full rounded-md border-1"
          >
            <div class="ArrayBox flex w-full flex-col gap-2 rounded-md">
              <For each={field().state.value}>
                {(_item, index) => {
                  const initialValue = _item as task_kill_requirement & { mobName: string };
                  return (
                    <div class="ObjectBox border-dividing-color flex flex-col rounded-md border-1">
                      <div class="Title border-dividing-color flex w-full items-center justify-between border-b-1 p-2">
                        <span class="text-accent-color font-bold">{key.toLocaleUpperCase() + " " + index()}</span>
                        <Button
                          onClick={() => {
                            const newArray = (field().state.value as unknown[]).filter((_, i) => i !== index());
                            field().setValue(newArray);
                          }}
                        >
                          -
                        </Button>
                      </div>
                      <div class="SubForm-DropItem flex w-full flex-col gap-2">
                        <div id={key + index()} class="flex-1">
                          <Autocomplete
                            id={key + index()}
                            initialValue={{
                              mobId: initialValue.mobId,
                              mobName: initialValue.mobName,
                            }}
                            setValue={(value) => {
                              const newArray = [...field().state.value];
                              newArray[index()] = value;
                              field().setValue(newArray);
                            }}
                            datasFetcher={async () => {
                              const db = await getDB();
                              const mobs = await db
                                .selectFrom("task_kill_requirement")
                                .innerJoin("mob", "task_kill_requirement.mobId", "mob.id")
                                .select(["task_kill_requirement.mobId", "mob.name as mobName"])
                                .execute();
                              return mobs;
                            }}
                            displayField="mobName"
                            valueField="mobId"
                          />
                        </div>
                        <div id={key + "count" + index()} class="flex-1">
                          <Input
                            type="number"
                            title={dic.db.task_kill_requirement.fields.count.key}
                            description={dic.db.task_kill_requirement.fields.count.formFieldDescription}
                            state={fieldInfo(field())}
                          />
                        </div>
                      </div>
                    </div>
                  );
                }}
              </For>
              <Button
                onClick={() => {
                  const newArray = [...(field().state.value as string[]), defaultData.drop_item];
                  field().setValue(newArray);
                }}
                class="w-full"
              >
                +
              </Button>
            </div>
          </Input>
        );
      },
      rewards: (key, field) => {
        return (
          <Input
            title={dic.db.task_reward.selfName}
            description={dic.db.task_reward.description}
            state={fieldInfo(field())}
            class="border-dividing-color bg-primary-color w-full rounded-md border-1"
          >
            <div class="ArrayBox flex w-full flex-col gap-2 rounded-md">
              <For each={field().state.value}>
                {(_item, index) => {
                  const initialValue = _item as task_reward & { itemName: string };
                  const zodValue = task_rewardSchema.shape;
                  return (
                    <div class="ObjectBox border-dividing-color flex flex-col rounded-md border-1">
                      <div class="Title border-dividing-color flex w-full items-center justify-between border-b-1 p-2">
                        <span class="text-accent-color font-bold">{key.toLocaleUpperCase() + " " + index()}</span>
                        <Button
                          onClick={() => {
                            const newArray = (field().state.value as unknown[]).filter((_, i) => i !== index());
                            field().setValue(newArray);
                          }}
                        >
                          -
                        </Button>
                      </div>
                      <div class="SubForm-DropItem flex w-full flex-col gap-2">
                        <Input
                          title={dic.db.task_reward.fields.type.key}
                          description={dic.db.task_reward.fields.type.formFieldDescription}
                          state={fieldInfo(field())}
                        >
                          <EnumSelect
                            value={initialValue.type}
                            setValue={(value) => {
                              const newArray = [...field().state.value];
                              newArray[index()] = {
                                ...initialValue,
                                type: value,
                              };
                              field().setValue(newArray);
                            }}
                            options={zodValue.type.options}
                            dic={dic.db.task_reward.fields.type.enumMap}
                            field={{
                              id: field().name,
                              name: field().name,
                              handleBlur: field().handleBlur,
                              handleChange: field().handleChange,
                            }}
                          />
                        </Input>
                        <Show when={initialValue.type === "Item"}>
                          <div id={key + "itemId" + index()} class="flex-1">
                            <Autocomplete
                              id={key + "itemId" + index()}
                              initialValue={{
                                id: initialValue.itemId,
                                name: initialValue.itemName,
                              }}
                              setValue={(value) => {
                                const newArray = [...field().state.value];
                                newArray[index()] = {
                                  ...initialValue,
                                  itemId: value.id,
                                  itemName: value.name,
                                };
                                field().setValue(newArray);
                              }}
                              datasFetcher={async () => {
                                const db = await getDB();
                                const items = await db.selectFrom("item").select(["id", "name"]).execute();
                                return items;
                              }}
                              displayField="name"
                              valueField="id"
                            />
                          </div>
                          <div id={key + "probability" + index()} class="flex-1">
                            <Input
                              type="number"
                              title={dic.db.task_reward.fields.probability.key}
                              description={dic.db.task_reward.fields.probability.formFieldDescription}
                              state={fieldInfo(field())}
                            />
                          </div>
                          <div id={key + "count" + index()} class="flex-1">
                            <Input
                              type="number"
                              title={dic.db.task_reward.fields.value.key}
                              description={dic.db.task_reward.fields.value.formFieldDescription}
                              state={fieldInfo(field())}
                            />
                          </div>
                        </Show>
                      </div>
                    </div>
                  );
                }}
              </For>
              <Button
                onClick={() => {
                  const newArray = [...(field().state.value as string[]), defaultData.drop_item];
                  field().setValue(newArray);
                }}
                class="w-full"
              >
                +
              </Button>
            </div>
          </Input>
        );
      },
    },
    onSubmit: async (data) => {
      const db = await getDB();
      const task = await db.transaction().execute(async (trx) => {
        const { collectRequires, killRequirements, rewards, ...rest } = data;
        const task = await createTask(trx, {
          ...rest,
        });
        if (collectRequires.length > 0) {
          for (const collectRequire of collectRequires) {
            await trx
              .insertInto("task_collect_require")
              .values({
                ...collectRequire,
                taskId: task.id,
              })
              .execute();
          }
        }
        if (killRequirements.length > 0) {
          for (const killRequirement of killRequirements) {
            await trx
              .insertInto("task_kill_requirement")
              .values({
                ...killRequirement,
                taskId: task.id,
              })
              .execute();
          }
        }
        if (rewards.length > 0) {
          for (const reward of rewards) {
            await trx
              .insertInto("task_reward")
              .values({
                ...reward,
                taskId: task.id,
              })
              .execute();
          }
        }
        return task;
      });
    },
  },
  card: {
    cardRender: (
      data: TaskWithRelated,
      appendCardTypeAndIds: (
        updater: (prev: { type: keyof DB; id: string }[]) => { type: keyof DB; id: string }[],
      ) => void,
    ) => {
      const [collectRequiresData] = createResource(data.id, async (taskId) => {
        const db = await getDB();
        return await db
          .selectFrom("task_collect_require")
          .innerJoin("item", "task_collect_require.itemId", "item.id")
          .where("task_collect_require.taskId", "=", taskId)
          .selectAll("task_collect_require")
          .select(["item.name as itemName"])
          .execute();
      });

      const [killRequirementsData] = createResource(data.id, async (taskId) => {
        const db = await getDB();
        return await db
          .selectFrom("task_kill_requirement")
          .innerJoin("mob", "task_kill_requirement.mobId", "mob.id")
          .where("task_kill_requirement.taskId", "=", taskId)
          .selectAll("task_kill_requirement")
          .select(["mob.name as mobName"])
          .execute();
      });

      const [rewardsData] = createResource(data.id, async (taskId) => {
        const db = await getDB();
        return await db
          .selectFrom("task_reward")
          .innerJoin("item", "task_reward.itemId", "item.id")
          .where("task_reward.taskId", "=", taskId)
          .selectAll("task_reward")
          .select(["item.name as itemName", "item.itemType"])
          .execute();
      });

      return (
        <>
          {DBDataRender<TaskWithRelated>({
            data,
            dictionary: {
              ...dic.db.task,
              fields: {
                ...dic.db.task.fields,
                collectRequires: {
                  key: "collectRequires",
                  ...dic.db.task_collect_require.fields,
                  tableFieldDescription: dic.db.task_collect_require.fields.itemId.tableFieldDescription,
                  formFieldDescription: dic.db.task_collect_require.fields.itemId.formFieldDescription,
                },
                killRequirements: {
                  key: "killRequirements",
                  ...dic.db.task_kill_requirement.fields,
                  tableFieldDescription: dic.db.task_kill_requirement.fields.mobId.tableFieldDescription,
                  formFieldDescription: dic.db.task_kill_requirement.fields.mobId.formFieldDescription,
                },
                rewards: {
                  key: "rewards",
                  ...dic.db.task_reward.fields,
                  tableFieldDescription: dic.db.task_reward.fields.itemId.tableFieldDescription,
                  formFieldDescription: dic.db.task_reward.fields.itemId.formFieldDescription,
                },
              },
            },
            dataSchema: TaskWithRelatedSchema,
            hiddenFields: ["id"],
            fieldGroupMap: {
              基本信息: ["name", "lv", "type", "description"],
            },
          })}

          <CardSection
            title={dic.db.task_collect_require.selfName}
            data={collectRequiresData.latest}
            renderItem={(collectRequire) => {
              return {
                label: collectRequire.itemName,
                onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: "item", id: collectRequire.itemId }]),
              };
            }}
          />

          <CardSection
            title={dic.db.task_kill_requirement.selfName}
            data={killRequirementsData.latest}
            renderItem={(killRequirement) => {
              return {
                label: killRequirement.mobName,
                onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: "mob", id: killRequirement.mobId }]),
              };
            }}
          />

          <CardSection
            title={dic.db.task_reward.selfName}
            data={rewardsData.latest}
            renderItem={(reward) => {
              return {
                label: reward.itemName,
                onClick: () =>
                  appendCardTypeAndIds((prev) => [
                    ...prev,
                    { type: itemTypeToTableType(reward.itemType), id: reward.itemId! },
                  ]),
              };
            }}
          />
        </>
      );
    },
  },
});
