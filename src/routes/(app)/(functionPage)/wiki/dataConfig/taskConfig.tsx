import { createResource, createSignal, For, JSX, Show, Index, Accessor } from "solid-js";
import { fieldInfo, renderField } from "../utils";
import { dataDisplayConfig } from "./dataConfig";
import { taskSchema, task_collect_requireSchema, task_kill_requirementSchema, task_rewardSchema } from "~/../db/zod";
import { task, DB, task_collect_require, task_kill_requirement, task_reward } from "~/../db/kysely/kyesely";
import { dictionary, EnumFieldDetail } from "~/locales/type";
import { getDB } from "~/repositories/database";
import { ObjRender } from "~/components/module/objRender";
import { Input } from "~/components/controls/input";
import { Autocomplete } from "~/components/controls/autoComplete";
import { defaultData } from "~/../db/defaultData";
import { CardSection } from "~/components/module/cardSection";
import { z } from "zod";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { Button } from "~/components/controls/button";
import { createForm } from "@tanstack/solid-form";
import { createId } from "@paralleldrive/cuid2";
import { EnumSelect } from "~/components/controls/enumSelect";
import { itemTypeToTableType, updateObjArrayItemKey } from "./utils";
import { TaskRewardType } from "../../../../../../db/kysely/enums";
import { createStatistic } from "~/repositories/statistic";
import { store } from "~/store";
import * as Icon from "~/components/icon";
import { VirtualTable } from "~/components/module/virtualTable";

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

const defaultTaskWithRelated: TaskWithRelated = {
  ...defaultData.task,
  collectRequires: [],
  killRequirements: [],
  rewards: [],
};

const TaskWithRelatedDic = (dic: dictionary) => ({
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
});

const TaskWithRelatedFetcher = async (id: string) => {
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
};

const TasksFetcher = async () => {
  const db = await getDB();
  const res = await db.selectFrom("task").selectAll("task").execute();
  return res;
};

const TaskWithRelatedForm = (dic: dictionary, handleSubmit: (table: keyof DB, id: string) => void) => {
  const form = createForm(() => ({
    defaultValues: defaultTaskWithRelated,
    onSubmit: async ({ value }) => {
      const db = await getDB();
      const task = await db.transaction().execute(async (trx) => {
        const { collectRequires, killRequirements, rewards, ...rest } = value;
        const statistic = await createStatistic(trx);
        const task = await trx
          .insertInto("task")
          .values({
            ...rest,
            id: createId(),
            statisticId: statistic.id,
            createdByAccountId: store.session.user.account?.id,
            updatedByAccountId: store.session.user.account?.id,
          })
          .returningAll()
          .executeTakeFirstOrThrow();
        if (collectRequires.length > 0) {
          for (const collectRequire of collectRequires) {
            await trx
              .insertInto("task_collect_require")
              .values({
                ...collectRequire,
                id: createId(),
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
                id: createId(),
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
                id: createId(),
                taskId: task.id,
              })
              .execute();
          }
        }
        return task;
      });
      handleSubmit("task", task.id);
    },
  }));
  return (
    <div class="FormBox flex w-full flex-col">
      <div class="Title flex items-center p-2 portrait:p-6">
        <h1 class="FormTitle text-2xl font-black">{dic.db.task.selfName}</h1>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        class={`Form bg-area-color flex flex-col gap-3 rounded p-3 portrait:rounded-b-none`}
      >
        <For each={Object.entries(defaultTaskWithRelated)}>
          {(_field, index) => {
            const fieldKey = _field[0] as keyof TaskWithRelated;
            const fieldValue = _field[1];
            switch (fieldKey) {
              case "id":
              case "createdByAccountId":
              case "updatedByAccountId":
              case "statisticId":
                return null;
              case "npcId":
                return (
                  <form.Field
                    name={fieldKey}
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: TaskWithRelatedSchema.shape[fieldKey],
                    }}
                  >
                    {(field) => (
                      <Input
                        title={dic.db.task.fields[fieldKey].key}
                        description={dic.db.task.fields[fieldKey].formFieldDescription}
                        state={fieldInfo(field())}
                        class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                      >
                        <Autocomplete
                          id={field().name}
                          initialValue={defaultData.npc}
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
                    )}
                  </form.Field>
                );
              case "collectRequires":
                return (
                  <form.Field
                    name={fieldKey}
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: TaskWithRelatedSchema.shape[fieldKey],
                    }}
                  >
                    {(field) => (
                      <form.Subscribe selector={(state) => state.values.type}>
                        {(type) => (
                          <Show when={type() === "Collect" || type() === "Both"}>
                            <Input
                              title={dic.db.task_collect_require.selfName}
                              description={dic.db.task_collect_require.description}
                              state={fieldInfo(field())}
                              class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                            >
                              <div class="ArrayBox flex w-full flex-col gap-2">
                                <Index each={field().state.value}>
                                  {(item, index) => {
                                    const initialValue = item() as task_collect_require & { itemName: string };
                                    return (
                                      <div class="ObjectBox border-dividing-color flex flex-col rounded-md border-1">
                                        <div class="Title border-dividing-color flex w-full items-center justify-between border-b-1 p-2">
                                          <span class="text-accent-color font-bold">
                                            {dic.db.task_collect_require.selfName + " " + index}
                                          </span>
                                          <Button onClick={() => field().removeValue(index)}>-</Button>
                                        </div>
                                        <div class="SubForm flex w-full flex-col gap-2">
                                          <Input
                                            title={dic.db.task_collect_require.fields.itemId.key}
                                            description={dic.db.task_collect_require.fields.itemId.formFieldDescription}
                                            state={fieldInfo(field())}
                                          >
                                            <Autocomplete
                                              id={fieldKey + "itemId" + index}
                                              initialValue={{ id: initialValue.itemId, name: initialValue.itemName }}
                                              setValue={(value) => {
                                                const newArray = [...field().state.value];
                                                newArray[index] = { ...initialValue, itemId: value.id };
                                                field().setValue(newArray);
                                              }}
                                              datasFetcher={async () => {
                                                const db = await getDB();
                                                const items = await db
                                                  .selectFrom("item")
                                                  .select(["id", "name"])
                                                  
                                                  .execute();
                                                return items;
                                              }}
                                              displayField="name"
                                              valueField="id"
                                            />
                                          </Input>
                                          <Input
                                            type="number"
                                            title={dic.db.task_collect_require.fields.count.key}
                                            description={dic.db.task_collect_require.fields.count.formFieldDescription}
                                            state={fieldInfo(field())}
                                          />
                                        </div>
                                      </div>
                                    );
                                  }}
                                </Index>
                                <Button
                                  onClick={() => {
                                    const newArray = [...field().state.value, defaultData.task_collect_require];
                                    field().setValue(newArray);
                                  }}
                                  class="w-full"
                                >
                                  +
                                </Button>
                              </div>
                            </Input>
                          </Show>
                        )}
                      </form.Subscribe>
                    )}
                  </form.Field>
                );
              case "killRequirements":
                return (
                  <form.Field
                    name={fieldKey}
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: TaskWithRelatedSchema.shape[fieldKey],
                    }}
                  >
                    {(field) => (
                      <form.Subscribe selector={(state) => state.values.type}>
                        {(type) => (
                          <Show when={type() === "Defeat" || type() === "Both"}>
                            <Input
                              title={dic.db.task_kill_requirement.selfName}
                              description={dic.db.task_kill_requirement.description}
                              state={fieldInfo(field())}
                              class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                            >
                              <div class="ArrayBox flex w-full flex-col gap-2">
                                <Index each={field().state.value}>
                                  {(item, index) => {
                                    const initialValue = item() as task_kill_requirement & { mobName: string };
                                    return (
                                      <div class="ObjectBox border-dividing-color flex flex-col rounded-md border-1">
                                        <div class="Title border-dividing-color flex w-full items-center justify-between border-b-1 p-2">
                                          <span class="text-accent-color font-bold">
                                            {dic.db.task_kill_requirement.selfName + " " + index}
                                          </span>
                                          <Button onClick={() => field().removeValue(index)}>-</Button>
                                        </div>
                                        <div class="SubForm-DropItem flex w-full flex-col gap-2">
                                          <Input
                                            title={dic.db.task_kill_requirement.fields.mobId.key}
                                            description={dic.db.task_kill_requirement.fields.mobId.formFieldDescription}
                                            state={fieldInfo(field())}
                                          >
                                            <Autocomplete
                                              id={fieldKey + "mobId" + index}
                                              initialValue={{ id: initialValue.mobId, name: initialValue.mobName }}
                                              setValue={(value) => {
                                                const newArray = [...field().state.value];
                                                newArray[index] = { ...initialValue, mobId: value.id };
                                                field().setValue(newArray);
                                              }}
                                              datasFetcher={async () => {
                                                const db = await getDB();
                                                const mobs = await db
                                                  .selectFrom("mob")
                                                  .select(["id", "name"])
                                                  
                                                  .execute();
                                                return mobs;
                                              }}
                                              displayField="name"
                                              valueField="id"
                                            />
                                          </Input>
                                          <Input
                                            type="number"
                                            title={dic.db.task_kill_requirement.fields.count.key}
                                            description={dic.db.task_kill_requirement.fields.count.formFieldDescription}
                                            state={fieldInfo(field())}
                                          />
                                        </div>
                                      </div>
                                    );
                                  }}
                                </Index>
                                <Button
                                  onClick={() => {
                                    const newArray = [...field().state.value, defaultData.task_kill_requirement];
                                    field().setValue(newArray);
                                  }}
                                  class="w-full"
                                >
                                  +
                                </Button>
                              </div>
                            </Input>
                          </Show>
                        )}
                      </form.Subscribe>
                    )}
                  </form.Field>
                );
              case "rewards":
                return (
                  <form.Field
                    name={fieldKey}
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: TaskWithRelatedSchema.shape[fieldKey],
                    }}
                  >
                    {(field) => (
                      <Input
                        title={dic.db.task_reward.selfName}
                        description={dic.db.task_reward.description}
                        state={fieldInfo(field())}
                        class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                      >
                        <div class="ArrayBox flex w-full flex-col gap-2">
                          <Index each={field().state.value}>
                            {(item, index) => {
                              const zodValue = task_rewardSchema.shape;
                              return (
                                <div class="ObjectBox border-dividing-color flex flex-col rounded-md border-1">
                                  <div class="Title border-dividing-color flex w-full items-center justify-between border-b-1 p-2">
                                    <span class="text-accent-color font-bold">
                                      {dic.db.task_reward.selfName + " " + index}
                                    </span>
                                    <Button onClick={() => field().removeValue(index)}>-</Button>
                                  </div>
                                  <div class="SubForm-DropItem flex w-full flex-col gap-2">
                                    <Input
                                      title={dic.db.task_reward.fields.type.key}
                                      description={dic.db.task_reward.fields.type.formFieldDescription}
                                      state={fieldInfo(field())}
                                    >
                                      <EnumSelect
                                        value={item().type}
                                        setValue={(value) => {
                                          const newArray = [...field().state.value];
                                          newArray[index] = { ...item(), type: value as TaskRewardType };
                                          field().setValue(newArray);
                                        }}
                                        options={zodValue.type.options}
                                        dic={dic.db.task_reward.fields.type.enumMap}
                                        field={{
                                          id: field().name,
                                          name: field().name,
                                        }}
                                      />
                                    </Input>
                                    <Show when={item().type === "Item"}>
                                      <Input
                                        title={dic.db.task_reward.fields.itemId.key}
                                        description={dic.db.task_reward.fields.itemId.formFieldDescription}
                                        state={fieldInfo(field())}
                                      >
                                        <Autocomplete
                                          id={fieldKey + "itemId" + index}
                                          initialValue={{
                                            id: item().itemId!, // 类型为Item的task_reward，itemId一定不为空
                                            name: "",
                                          }}
                                          setValue={(value) => {
                                            const newArray = [...field().state.value];
                                            newArray[index] = { ...item(), itemId: value.id };
                                            field().setValue(newArray);
                                          }}
                                          datasFetcher={async () => {
                                            const db = await getDB();
                                            const items = await db
                                              .selectFrom("item")
                                              .select(["id", "name"])
                                              
                                              .execute();
                                            return items;
                                          }}
                                          displayField="name"
                                          valueField="id"
                                        />
                                      </Input>
                                      <Input
                                        type="number"
                                        title={dic.db.task_reward.fields.probability.key}
                                        description={dic.db.task_reward.fields.probability.formFieldDescription}
                                        state={fieldInfo(field())}
                                      />
                                    </Show>
                                    <Input
                                      type="number"
                                      title={dic.db.task_reward.fields.value.key}
                                      description={dic.db.task_reward.fields.value.formFieldDescription}
                                      state={fieldInfo(field())}
                                    />
                                  </div>
                                </div>
                              );
                            }}
                          </Index>
                          <Button
                            onClick={() => {
                              const newArray = [...field().state.value, defaultData.task_reward];
                              field().setValue(newArray);
                            }}
                            class="w-full"
                          >
                            +
                          </Button>
                        </div>
                      </Input>
                    )}
                  </form.Field>
                );
              default:
                // 非基础对象字段，对象，对象数组会单独处理，因此可以断言
                const simpleFieldKey = _field[0] as keyof task;
                const simpleFieldValue = _field[1];
                return renderField<TaskWithRelated, keyof TaskWithRelated>(
                  form,
                  simpleFieldKey,
                  simpleFieldValue,
                  TaskWithRelatedDic(dic),
                  TaskWithRelatedSchema,
                );
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
                  {state().isSubmitting ? "..." : dic.ui.actions.add}
                </Button>
              </div>
            );
          }}
        />
      </form>
    </div>
  );
};

const TaskTable = (dic: dictionary, filterStr: Accessor<string>, columnHandleClick: (column: string) => void) => {
  return VirtualTable<task>({
    dataFetcher: TasksFetcher,
    columnsDef: [
      {
        id: "id",
        accessorFn: (row) => row.id,
        cell: (info) => info.getValue(),
        size: 200,
      },
      {
        id: "name",
        accessorFn: (row) => row.name,
        cell: (info) => info.getValue(),
        size: 220,
      },
      {
        id: "lv",
        accessorFn: (row) => row.lv,
        cell: (info) => info.getValue<number | null>(),
        size: 120,
      },
      {
        id: "type",
        accessorFn: (row) => row.type,
        cell: (info) => info.getValue<string | null>(),
        size: 160,
      },
      {
        id: "description",
        accessorFn: (row) => row.description,
        cell: (info) => info.getValue<string | null>(),
        size: 160,
      },
    ],
    dictionary: TaskWithRelatedDic(dic),
    hiddenColumnDef: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
    defaultSort: { id: "name", desc: false },
    tdGenerator: {},
    globalFilterStr: filterStr,
    columnHandleClick: columnHandleClick,
  });
};

export const TaskDataConfig: dataDisplayConfig<TaskWithRelated, task> = {
  defaultData: defaultTaskWithRelated,
  dataFetcher: TaskWithRelatedFetcher,
  datasFetcher: TasksFetcher,
  dataSchema: TaskWithRelatedSchema,
  table: (dic, filterStr, columnHandleClick) => TaskTable(dic, filterStr, columnHandleClick),
  form: (dic, handleSubmit) => TaskWithRelatedForm(dic, handleSubmit),
  card: (dic, data, appendCardTypeAndIds) => {
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
        <div class="TaskImage bg-area-color h-[18vh] w-full rounded"></div>
        {ObjRender<TaskWithRelated>({
          data,
          dictionary: TaskWithRelatedDic(dic),
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

        <Show when={data.createdByAccountId === store.session.user.account?.id}>
          <section class="FunFieldGroup flex w-full flex-col gap-2">
            <h3 class="text-accent-color flex items-center gap-2 font-bold">
              {dic.ui.actions.operation}
              <div class="Divider bg-dividing-color h-[1px] w-full flex-1" />
            </h3>
            <div class="FunGroup flex flex-col gap-3">
              <Button
                class="w-fit"
                icon={<Icon.Line.Trash />}
                onclick={async () => {
                  const db = await getDB();
                  await db.deleteFrom("task").where("id", "=", data.id).executeTakeFirstOrThrow();
                }}
              />
            </div>
          </section>
        </Show>
      </>
    );
  },
};
