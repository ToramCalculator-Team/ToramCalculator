import { createResource, createSignal, For, JSX, Show, Index, Accessor } from "solid-js";
import { fieldInfo, renderField } from "../utils";
import { dataDisplayConfig } from "./dataConfig";
import {
  taskSchema,
  task_collect_requireSchema,
  task_kill_requirementSchema,
  task_rewardSchema,
} from "@db/generated/zod/index";
import { task, DB, task_collect_require, task_kill_requirement, task_reward } from "@db/generated/kysely/kyesely";
import { dictionary, EnumFieldDetail } from "~/locales/type";
import { getDB } from "@db/repositories/database";
import { ObjRender } from "~/components/dataDisplay/objRender";
import { Input } from "~/components/controls/input";
import { Autocomplete } from "~/components/controls/autoComplete";
import { defaultData } from "@db/defaultData";
import { CardSection } from "~/components/dataDisplay/cardSection";
import { z } from "zod";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { Button } from "~/components/controls/button";
import { createForm } from "@tanstack/solid-form";
import { createId } from "@paralleldrive/cuid2";
import { EnumSelect } from "~/components/controls/enumSelect";
import { TaskRewardType } from "@db/generated/kysely/enums";
import { createStatistic } from "@db/repositories/statistic";
import { store } from "~/store";
import Icons from "~/components/icons/index";
import { setWikiStore } from "../store";
import { itemTypeToTableType } from "./item";
import { Transaction } from "kysely";
import { pick } from "lodash-es";
import { arrayDiff, CardSharedSection } from "./utils";

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

const TaskWithRelatedFetcher = async (id: string): Promise<TaskWithRelated> => {
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

const createTask = async (trx: Transaction<DB>, value: task) => {
  const statistic = await createStatistic(trx);
  const task = await trx
    .insertInto("task")
    .values({
      ...value,
      id: createId(),
      statisticId: statistic.id,
      createdByAccountId: store.session.user.account?.id,
      updatedByAccountId: store.session.user.account?.id,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  return task;
};

const updateTask = async (trx: Transaction<DB>, value: task) => {
  const task = await trx
    .updateTable("task")
    .set({
      ...value,
      updatedByAccountId: store.session.user.account?.id,
    })
    .where("id", "=", value.id)
    .returningAll()
    .executeTakeFirstOrThrow();
  return task;
};

const deleteTask = async (trx: Transaction<DB>, task: task) => {
  // 重置任务关联数据

  // 删除任务关联数据
  await trx.deleteFrom("task_collect_require").where("taskId", "=", task.id).execute();
  await trx.deleteFrom("task_kill_requirement").where("taskId", "=", task.id).execute();
  await trx.deleteFrom("task_reward").where("taskId", "=", task.id).execute();
  // 删除任务
  await trx.deleteFrom("task").where("id", "=", task.id).execute();
  // 删除统计数据
  await trx.deleteFrom("statistic").where("id", "=", task.statisticId).execute();
};

const TaskWithRelatedForm = (dic: dictionary, oldTask?: TaskWithRelated) => {
  const formInitialValues = oldTask ?? defaultTaskWithRelated;
  const form = createForm(() => ({
    defaultValues: formInitialValues,
    onSubmit: async ({ value: newTask }) => {
      console.log("oldTask", oldTask, "newTask", newTask);
      const taskData = pick(newTask, Object.keys(defaultData.task) as (keyof task)[]);
      const db = await getDB();
      const task = await db.transaction().execute(async (trx) => {
        let task: task;
        if (oldTask) {
          task = await updateTask(trx, taskData);
        } else {
          task = await createTask(trx, taskData);
        }

        // 收集要求
        const {
          dataToAdd: collectRequiresToAdd,
          dataToRemove: collectRequiresToRemove,
          dataToUpdate: collectRequiresToUpdate,
        } = await arrayDiff({
          trx,
          table: "task_collect_require",
          oldArray: oldTask?.collectRequires ?? [],
          newArray: newTask.collectRequires,
        });

        for (const collectRequire of collectRequiresToAdd) {
          await trx
            .insertInto("task_collect_require")
            .values({
              ...collectRequire,
              id: createId(),
              taskId: task.id,
            })
            .execute();
        }
        for (const collectRequire of collectRequiresToRemove) {
          await trx.deleteFrom("task_collect_require").where("id", "=", collectRequire.id).execute();
        }
        for (const collectRequire of collectRequiresToUpdate) {
          await trx
            .updateTable("task_collect_require")
            .set(collectRequire)
            .where("id", "=", collectRequire.id)
            .execute();
        }

        // 击杀要求
        const {
          dataToAdd: killRequirementsToAdd,
          dataToRemove: killRequirementsToRemove,
          dataToUpdate: killRequirementsToUpdate,
        } = await arrayDiff({
          trx,
          table: "task_kill_requirement",
          oldArray: oldTask?.killRequirements ?? [],
          newArray: newTask.killRequirements,
        });

        for (const killRequirement of killRequirementsToAdd) {
          await trx
            .insertInto("task_kill_requirement")
            .values({
              ...killRequirement,
              id: createId(),
              taskId: task.id,
            })
            .execute();
        }
        for (const killRequirement of killRequirementsToRemove) {
          await trx.deleteFrom("task_kill_requirement").where("id", "=", killRequirement.id).execute();
        }
        for (const killRequirement of killRequirementsToUpdate) {
          await trx
            .updateTable("task_kill_requirement")
            .set(killRequirement)
            .where("id", "=", killRequirement.id)
            .execute();
        }

        // 奖励
        const {
          dataToAdd: rewardsToAdd,
          dataToRemove: rewardsToRemove,
          dataToUpdate: rewardsToUpdate,
        } = await arrayDiff({
          trx,
          table: "task_reward",
          oldArray: oldTask?.rewards ?? [],
          newArray: newTask.rewards,
        });

        for (const reward of rewardsToAdd) {
          await trx
            .insertInto("task_reward")
            .values({
              ...reward,
              id: createId(),
              taskId: task.id,
            })
            .execute();
        }
        for (const reward of rewardsToRemove) {
          await trx.deleteFrom("task_reward").where("id", "=", reward.id).execute();
        }
        for (const reward of rewardsToUpdate) {
          await trx.updateTable("task_reward").set(reward).where("id", "=", reward.id).execute();
        }

        return task;
      });
      setWikiStore("cardGroup", (pre) => [...pre, { type: "task", id: task.id }]);
      setWikiStore("form", {
        data: undefined,
        isOpen: false,
      });
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
                    {(npcIdField) => (
                      <Input
                        title={dic.db.task.fields[fieldKey].key}
                        description={dic.db.task.fields[fieldKey].formFieldDescription}
                        state={fieldInfo(npcIdField())}
                        class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                      >
                        <Autocomplete
                          id={npcIdField().name}
                          initialValue={npcIdField().state.value}
                          setValue={(value) => {
                            npcIdField().setValue(value.id);
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
                    {(collectRequires) => (
                      <form.Subscribe selector={(state) => state.values.type}>
                        {(type) => (
                          <Show when={type() === "Collect" || type() === "Both"}>
                            <Input
                              title={dic.db.task_collect_require.selfName}
                              description={dic.db.task_collect_require.description}
                              state={fieldInfo(collectRequires())}
                              class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                            >
                              <div class="ArrayBox flex w-full flex-col gap-2">
                                <Index each={collectRequires().state.value}>
                                  {(collectRequire, collectRequireIndex) => {
                                    return (
                                      <div class="ObjectBox border-dividing-color flex flex-col rounded-md border-1">
                                        <div class="Title border-dividing-color flex w-full items-center justify-between border-b-1 p-2">
                                          <span class="text-accent-color font-bold">
                                            {dic.db.task_collect_require.selfName + " " + collectRequireIndex}
                                          </span>
                                          <Button onClick={() => collectRequires().removeValue(collectRequireIndex)}>
                                            -
                                          </Button>
                                        </div>
                                        <Index each={Object.entries(collectRequire())}>
                                          {(collectRequireField, collectRequireFieldIndex) => {
                                            const fieldKey = collectRequireField()[0] as keyof task_collect_require;
                                            const fieldValue = collectRequireField()[1];
                                            switch (fieldKey) {
                                              case "id":
                                              case "taskId":
                                                return null;
                                              case "itemId":
                                                return (
                                                  <form.Field
                                                    name={`collectRequires[${collectRequireIndex}].itemId`}
                                                    validators={{
                                                      onChangeAsyncDebounceMs: 500,
                                                      onChangeAsync: task_collect_requireSchema.shape[fieldKey],
                                                    }}
                                                  >
                                                    {(itemIdField) => {
                                                      return (
                                                        <Input
                                                          title={dic.db.task_collect_require.fields.itemId.key}
                                                          description={
                                                            dic.db.task_collect_require.fields.itemId
                                                              .formFieldDescription
                                                          }
                                                          state={fieldInfo(itemIdField())}
                                                        >
                                                          <Autocomplete
                                                            id={`collectRequires[${collectRequireIndex}].itemId`}
                                                            initialValue={itemIdField().state.value}
                                                            setValue={(value) => itemIdField().setValue(value.id)}
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
                                                      );
                                                    }}
                                                  </form.Field>
                                                );
                                              default:
                                                // 非基础对象字段，对象，对象数组会单独处理，因此可以断言
                                                const simpleFieldKey = `collectRequires[${collectRequireIndex}].${fieldKey}`;
                                                const simpleFieldValue = fieldValue;
                                                return renderField<task_collect_require, keyof task_collect_require>(
                                                  form,
                                                  simpleFieldKey,
                                                  simpleFieldValue,
                                                  dic.db.task_collect_require,
                                                  task_collect_requireSchema,
                                                );
                                            }
                                          }}
                                        </Index>
                                      </div>
                                    );
                                  }}
                                </Index>
                                <Button
                                  onClick={() => {
                                    const newArray = [
                                      ...collectRequires().state.value,
                                      defaultData.task_collect_require,
                                    ];
                                    collectRequires().setValue(newArray);
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
                    {(killRequirements) => (
                      <form.Subscribe selector={(state) => state.values.type}>
                        {(type) => (
                          <Show when={type() === "Defeat" || type() === "Both"}>
                            <Input
                              title={dic.db.task_kill_requirement.selfName}
                              description={dic.db.task_kill_requirement.description}
                              state={fieldInfo(killRequirements())}
                              class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                            >
                              <div class="ArrayBox flex w-full flex-col gap-2">
                                <Index each={killRequirements().state.value}>
                                  {(killRequirement, killRequirementIndex) => {
                                    return (
                                      <div class="ObjectBox border-dividing-color flex flex-col rounded-md border-1">
                                        <div class="Title border-dividing-color flex w-full items-center justify-between border-b-1 p-2">
                                          <span class="text-accent-color font-bold">
                                            {dic.db.task_kill_requirement.selfName + " " + killRequirementIndex}
                                          </span>
                                          <Button onClick={() => killRequirements().removeValue(killRequirementIndex)}>
                                            -
                                          </Button>
                                        </div>
                                        <Index each={Object.entries(killRequirement())}>
                                          {(killRequirementField, killRequirementFieldIndex) => {
                                            const fieldKey = killRequirementField()[0] as keyof task_kill_requirement;
                                            const fieldValue = killRequirementField()[1];
                                            switch (fieldKey) {
                                              case "id":
                                              case "taskId":
                                                return null;
                                              case "mobId":
                                                return (
                                                  <form.Field
                                                    name={`killRequirements[${killRequirementIndex}].mobId`}
                                                    validators={{
                                                      onChangeAsyncDebounceMs: 500,
                                                      onChangeAsync: task_kill_requirementSchema.shape[fieldKey],
                                                    }}
                                                  >
                                                    {(itemIdField) => {
                                                      return (
                                                        <Input
                                                          title={dic.db.task_kill_requirement.fields.mobId.key}
                                                          description={
                                                            dic.db.task_kill_requirement.fields.mobId
                                                              .formFieldDescription
                                                          }
                                                          state={fieldInfo(itemIdField())}
                                                        >
                                                          <Autocomplete
                                                            id={`killRequirements[${killRequirementIndex}].mobId`}
                                                            initialValue={itemIdField().state.value}
                                                            setValue={(value) => itemIdField().setValue(value.id)}
                                                            datasFetcher={async () => {
                                                              const db = await getDB();
                                                              const items = await db
                                                                .selectFrom("mob")
                                                                .select(["id", "name"])
                                                                .execute();
                                                              return items;
                                                            }}
                                                            displayField="name"
                                                            valueField="id"
                                                          />
                                                        </Input>
                                                      );
                                                    }}
                                                  </form.Field>
                                                );
                                              default:
                                                // 非基础对象字段，对象，对象数组会单独处理，因此可以断言
                                                const simpleFieldKey = `killRequirements[${killRequirementIndex}].${fieldKey}`;
                                                const simpleFieldValue = fieldValue;
                                                return renderField<task_kill_requirement, keyof task_kill_requirement>(
                                                  form,
                                                  simpleFieldKey,
                                                  simpleFieldValue,
                                                  dic.db.task_kill_requirement,
                                                  task_kill_requirementSchema,
                                                );
                                            }
                                          }}
                                        </Index>
                                      </div>
                                    );
                                  }}
                                </Index>
                                <Button
                                  onClick={() => {
                                    const newArray = [
                                      ...killRequirements().state.value,
                                      defaultData.task_kill_requirement,
                                    ];
                                    killRequirements().setValue(newArray);
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
                    {(rewards) => (
                      <Input
                        title={dic.db.task_reward.selfName}
                        description={dic.db.task_reward.description}
                        state={fieldInfo(rewards())}
                        class="border-dividing-color bg-primary-color w-full rounded-md border-1"
                      >
                        <div class="ArrayBox flex w-full flex-col gap-2">
                          <Index each={rewards().state.value}>
                            {(reward, rewardIndex) => {
                              return (
                                <div class="ObjectBox border-dividing-color flex flex-col rounded-md border-1">
                                  <div class="Title border-dividing-color flex w-full items-center justify-between border-b-1 p-2">
                                    <span class="text-accent-color font-bold">
                                      {dic.db.task_reward.selfName + " " + rewardIndex}
                                    </span>
                                    <Button onClick={() => rewards().removeValue(rewardIndex)}>-</Button>
                                  </div>
                                  <Index each={Object.entries(reward())}>
                                    {(rewardField, rewardFieldIndex) => {
                                      const fieldKey = rewardField()[0] as keyof task_reward;
                                      const fieldValue = rewardField()[1];
                                      switch (fieldKey) {
                                        case "id":
                                        case "taskId":
                                          return null;
                                        case "itemId":
                                          return (
                                            <form.Subscribe
                                              selector={(state) => state.values.rewards[rewardIndex].type}
                                            >
                                              {(type) => (
                                                <Show when={type() === "Item"}>
                                                  <form.Field
                                                    name={`rewards[${rewardIndex}].itemId`}
                                                    validators={{
                                                      onChangeAsyncDebounceMs: 500,
                                                      onChangeAsync: task_rewardSchema.shape[fieldKey],
                                                    }}
                                                  >
                                                    {(itemIdField) => {
                                                      return (
                                                        <Input
                                                          title={dic.db.task_collect_require.fields.itemId.key}
                                                          description={
                                                            dic.db.task_collect_require.fields.itemId
                                                              .formFieldDescription
                                                          }
                                                          state={fieldInfo(itemIdField())}
                                                        >
                                                          <Autocomplete
                                                            id={`rewards[${rewardIndex}].itemId`}
                                                            initialValue={itemIdField().state.value ?? ""}
                                                            setValue={(value) => itemIdField().setValue(value.id)}
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
                                                      );
                                                    }}
                                                  </form.Field>
                                                </Show>
                                              )}
                                            </form.Subscribe>
                                          );
                                        case "probability":
                                          return (
                                            <form.Subscribe
                                              selector={(state) => state.values.rewards[rewardIndex].type}
                                            >
                                              {(type) => (
                                                <Show when={type() === "Item"}>
                                                  {renderField<task_reward, keyof task_reward>(
                                                    form,
                                                    `rewards[${rewardIndex}].${fieldKey}`,
                                                    fieldValue,
                                                    dic.db.task_reward,
                                                    task_rewardSchema,
                                                  )}
                                                </Show>
                                              )}
                                            </form.Subscribe>
                                          );
                                        default:
                                          // 非基础对象字段，对象，对象数组会单独处理，因此可以断言
                                          const simpleFieldKey = `rewards[${rewardIndex}].${fieldKey}`;
                                          const simpleFieldValue = fieldValue;
                                          return renderField<task_reward, keyof task_reward>(
                                            form,
                                            simpleFieldKey,
                                            simpleFieldValue,
                                            dic.db.task_reward,
                                            task_rewardSchema,
                                          );
                                      }
                                    }}
                                  </Index>
                                </div>
                              );
                            }}
                          </Index>
                          <Button
                            onClick={() => {
                              const newArray = [...rewards().state.value, defaultData.task_reward];
                              rewards().setValue(newArray);
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

export const TaskDataConfig: dataDisplayConfig<task, TaskWithRelated, TaskWithRelated> = {
  defaultData: defaultTaskWithRelated,
  dataFetcher: TaskWithRelatedFetcher,
  datasFetcher: TasksFetcher,
  dataSchema: TaskWithRelatedSchema,
  table: {
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
    dictionary: (dic) => TaskWithRelatedDic(dic),
    hiddenColumnDef: ["id", "createdByAccountId", "updatedByAccountId", "statisticId"],
    defaultSort: { id: "name", desc: false },
    tdGenerator: {},
  },
  form: ({ dic, data }) => TaskWithRelatedForm(dic, data),
  card: ({ dic, data }) => {
    const [collectRequiresData] = createResource(data.id, async (taskId) => {
      const db = await getDB();
      return await db
        .selectFrom("task_collect_require")
        .innerJoin("item", "task_collect_require.itemId", "item.id")
        .where("task_collect_require.taskId", "=", taskId)
        .selectAll("task_collect_require")
        .select(["item.name as itemName", "item.itemType"])
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
          dataRender={(collectRequire) => {
            return (
              <Button
                onClick={() =>
                  setWikiStore("cardGroup", (pre) => [
                    ...pre,
                    { type: itemTypeToTableType(collectRequire.itemType), id: collectRequire.itemId },
                  ])
                }
              >
                {collectRequire.itemName}
              </Button>
            );
          }}
        />
        <CardSection
          title={dic.db.task_kill_requirement.selfName}
          data={killRequirementsData.latest}
          dataRender={(killRequirement) => {
            return (
              <Button
                onClick={() => setWikiStore("cardGroup", (pre) => [...pre, { type: "mob", id: killRequirement.mobId }])}
              >
                {killRequirement.mobName}
              </Button>
            );
          }}
        />
        <CardSection
          title={dic.db.task_reward.selfName}
          data={rewardsData.latest}
          dataRender={(reward) => {
            return (
              <Button
                onClick={() =>
                  setWikiStore("cardGroup", (pre) => [
                    ...pre,
                    { type: itemTypeToTableType(reward.itemType), id: reward.itemId! },
                  ])
                }
              >
                {reward.itemName}
              </Button>
            );
          }}
        />

        <CardSharedSection dic={dic} data={data} delete={deleteTask} />
      </>
    );
  },
};
