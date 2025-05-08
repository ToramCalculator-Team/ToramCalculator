import { Cell, flexRender } from "@tanstack/solid-table";
import { createResource, createSignal, For, JSX, Show } from "solid-js";
import { getCommonPinningStyles } from "~/lib/table";
import { findActivityById, findActivities, Activity, createActivity } from "~/repositories/activity";
import { dataDisplayConfig } from "./dataConfig";
import { activitySchema } from "~/../db/zod";
import { activity } from "~/../db/kysely/kyesely";
import { Dic, EnumFieldDetail } from "~/locales/type";
import { getDB } from "~/repositories/database";
import { DBDataRender } from "~/components/module/dbDataRender";
import { CardSection } from "~/components/module/cardSection";
import { defaultData } from "~/../db/defaultData";

export const createActivityDataConfig = (dic: Dic<activity>): dataDisplayConfig<
  activity,
  Activity["Card"],
  {
    zones: string[];
    recipes: string[];
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
    ],
    dataFetcher: findActivities,
    defaultSort: { id: "name", desc: false },
    hiddenColumnDef: ["id"],
    dictionary: dic,
    tdGenerator: (props: { cell: Cell<activity, keyof activity> }) => {
      const [tdContent, setTdContent] = createSignal<JSX.Element>(<>{"=.=.=.="}</>);
      let defaultTdClass = "text-main-text-color flex flex-col justify-center px-6 py-3";
      const columnId = props.cell.column.id as keyof activity;
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
          <Show
            when={true}
            fallback={tdContent()}
          >
            {"enumMap" in dic.fields[columnId]
              ? (dic.fields[columnId] as EnumFieldDetail<keyof activity>).enumMap[props.cell.getValue()]
              : props.cell.getValue()}
          </Show>
        </td>
      );
    },
  },
  form: {
    data: defaultData.activity,
    extraData: {
      zones: {
        defaultValue: [],
        optionsFetcher: async (name) => {
          const db = await getDB();
          const zones = await db
            .selectFrom("zone")
            .select(["id", "name"])
            .where("name", "ilike", `%${name}%`)
            .execute();
          return zones.map((zone) => ({
            label: zone.name,
            value: zone.id,
          }));
        },
        dictionary: {
          key: "zones",
          tableFieldDescription: "期间限定开放的区域",
          formFieldDescription: "期间限定开放的区域",
        },
      },
      recipes: {
        defaultValue: [],
        optionsFetcher: async (name) => {
          const db = await getDB();
          const recipes = await db
            .selectFrom("recipe")
            .innerJoin("item", "recipe.itemId", "item.id")
            .where("item.name", "ilike", `%${name}%`)
            .select(["item.name", "recipe.id"])
            .execute();
          return recipes.map((recipe) => ({
            label: recipe.name,
            value: recipe.id,
          }));
        },
        dictionary: {
          key: "recipes",
          tableFieldDescription: "期间限定的配方  ",
          formFieldDescription: "期间限定的配方",
        },
      },
    },
    hiddenFields: ["id"],
    dataSchema: activitySchema,
    dictionary: dic,
    fieldGenerators: {},
    onSubmit: async (data) => {
      const db = await getDB();
      const activity = await db.transaction().execute(async (trx) => {
        const { zones, recipes, ...rest } = data;
        const activity = await createActivity(trx, {
          ...rest,
        });
        if (zones.length > 0) {
          for (const zoneId of zones) {
            await trx.updateTable("zone").set({ activityId: activity.id }).where("id", "=", zoneId).execute();
          }
        }
        if (recipes.length > 0) {
          for (const recipeId of recipes) {
            await trx.updateTable("recipe").set({ activityId: activity.id }).where("id", "=", recipeId).execute();
          }
        }
        return activity;
      });
    },
  },
  card: {
    dataFetcher: findActivityById,
    cardRender: (data, appendCardTypeAndIds) => {
      const [zoneData] = createResource(data.id, async (activityId) => {
        const db = await getDB();
        return await db.selectFrom("zone").where("zone.activityId", "=", activityId).selectAll("zone").execute();
      });
      const [recipeData] = createResource(data.id, async (activityId) => {
        const db = await getDB();
        return await db
          .selectFrom("recipe")
          .innerJoin("item", "recipe.itemId", "item.id")
          .where("recipe.activityId", "=", activityId)
          .selectAll("recipe")
          .select("item.name as itemName")
          .execute();
      });

      return (
        <>
          <div class="ActivityImage bg-area-color h-[18vh] w-full rounded"></div>
          {DBDataRender<Activity["Card"]>({
            data,
            dictionary: dic,
            dataSchema: activitySchema,
            hiddenFields: ["id"],
            fieldGroupMap: {
              基本信息: ["name"],
            },
          })}

          <CardSection
            title={dic.cardFields?.zone ?? "活动区域"}
            data={zoneData.latest}
            renderItem={(zone) => {
              return {
                label: zone.name,
                onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: "zone", id: zone.id }]),
              };
            }}
          />

          <CardSection
            title={dic.cardFields?.recipes ?? "活动配方"}
            data={recipeData.latest}
            renderItem={(recipe) => {
              return {
                label: recipe.itemName,
                onClick: () => appendCardTypeAndIds((prev) => [...prev, { type: "recipe", id: recipe.id }]),
              };
            }}
          />
        </>
      );
    },
  },
});
