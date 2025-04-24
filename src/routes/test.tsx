import { createEffect, createMemo, createResource, createSignal, JSX, onMount, ParentProps, Show } from "solid-js";
import { setStore, store } from "~/store";
import { findMobById } from "~/repositories/mob";
import { ObjRender } from "~/components/module/objRender";
import { z } from "zod";
import { zoneSchema, drop_itemSchema, statisticSchema, mobSchema } from "../../db/zod";
import { LoadingBar } from "~/components/loadingBar";

const subRelationZodShape = {
  belongToZones: z.array(zoneSchema),
  dropItems: z.array(drop_itemSchema),
  statistic: statisticSchema,
};

export default function WikiPage(props: ParentProps) {
  const [mob, { refetch: refetchMob }] = createResource(store.wiki.mob?.id, findMobById);

  return (
    <Show when={mob()} fallback={<LoadingBar />}>
      <ObjRender
        data={mob.latest!}
        dataSchema={mobSchema.extend(subRelationZodShape)}
        hiddenFields={["id", { statistic: ["id", "usageTimestamps"] }]}
        fieldGroupMap={{
          常规属性: ["experience", "partsExperience", "maxhp"],
          战斗属性: [
            "initialElement",
            "physicalDefense",
            "physicalResistance",
            "magicalDefense",
            "magicalResistance",
            "criticalResistance",
            "avoidance",
            "block",
            "dodge",
            "normalAttackResistanceModifier",
            "physicalAttackResistanceModifier",
            "magicalAttackResistanceModifier",
          ],
          出现的区域: ["belongToZones"],
          掉落道具: ["dropItems"],
          额外说明: ["details"],
          怪物行为: ["actions"],
          词条信息: ["dataSources", "statistic"],
        }}
      />
    </Show>
  );
}
