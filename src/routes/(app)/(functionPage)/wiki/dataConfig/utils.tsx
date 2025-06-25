import { Transaction } from "kysely";
import { DB } from "../../../../../../db/kysely/kyesely";
import { getPrimaryKeys } from "~/repositories/untils";
import { Show } from "solid-js";
import { dictionary } from "~/locales/type";
import { store } from "~/store";
import { Button } from "~/components/controls/button";
import * as Icon from "~/components/icon";
import { getDB } from "~/repositories/database";
import { setWikiStore } from "../store";
import sprites from "~/../public/app-image/sprites.json";
import spritesUrl from "~/../public/app-image/icon-sprites.png?url";
import { defaultData } from "../../../../../../db/defaultData";

export const arrayDiff = async <T extends keyof DB>(props: {
  trx: Transaction<DB>;
  table: T;
  oldArray: DB[T][];
  newArray: DB[T][];
}) => {
  const primaryKeys = await getPrimaryKeys(props.trx, props.table);
  if (primaryKeys.length === 0) {
    throw new Error("表没有主键");
  }
  const dataToAdd = props.newArray.filter(
    (effect) =>
      !props.oldArray.some((oldEffect) => {
        for (const primaryKey of primaryKeys) {
          if (effect[primaryKey as keyof DB[T]] === oldEffect[primaryKey as keyof DB[T]]) {
            return true;
          }
        }
        return false;
      }),
  );
  const dataToRemove = props.oldArray.filter(
    (oldEffect) =>
      !props.newArray.some((newEffect) => {
        for (const primaryKey of primaryKeys) {
          if (newEffect[primaryKey as keyof DB[T]] === oldEffect[primaryKey as keyof DB[T]]) {
            return true;
          }
        }
        return false;
      }),
  );
  const dataToUpdate = props.newArray.filter((newEffect) =>
    props.oldArray.some((oldEffect) => {
      for (const primaryKey of primaryKeys) {
        if (oldEffect[primaryKey as keyof DB[T]] === newEffect[primaryKey as keyof DB[T]]) {
          return true;
        }
      }
      return false;
    }),
  );

  return {
    dataToAdd,
    dataToRemove,
    dataToUpdate,
  };
};

export const CardSharedSection = <T extends object>(props: {
  dic: dictionary;
  data: T & {
    createdByAccountId: string | null;
  };
  delete: (trx: Transaction<DB>, data: T) => Promise<void>;
}) => {
  return (
    <Show when={props.data.createdByAccountId === store.session.user.account?.id}>
      <section class="FunFieldGroup flex w-full flex-col gap-2">
        <h3 class="text-accent-color flex items-center gap-2 font-bold">
          {props.dic.ui.actions.operation}
          <div class="Divider bg-dividing-color h-[1px] w-full flex-1" />
        </h3>
        <div class="FunGroup flex gap-1">
          <Button
            class="w-fit"
            icon={<Icon.Line.Trash />}
            onclick={async () => {
              const db = await getDB();
              await db.transaction().execute(async (trx) => {
                await props.delete(trx, props.data);
              });
              // 关闭当前卡片
              setWikiStore("cardGroup", (pre) => pre.slice(0, -1));
            }}
          />
          <Button
            class="w-fit"
            icon={<Icon.Line.Edit />}
            onclick={() => {
              // 关闭当前卡片
              setWikiStore("cardGroup", (pre) => pre.slice(0, -1));
              // 打开表单
              setWikiStore("form", { isOpen: true, data: props.data });
            }}
          />
        </div>
      </section>
    </Show>
  );
};

export const getSpriteIcon = (iconName: string) => {
  // if (iconName in defaultData) {
  //   const tableName = iconName as keyof DB;
  //   switch (tableName) {
  //     case "activity":
  //     case "address":
  //     case "armor":
  //     case "avatar":
  //     case "character":
  //     case "character_skill":
  //     case "combo":
  //     case "combo_step":
  //     case "consumable":
  //     case "crystal":
  //     case "drop_item":
  //     case "image":
  //     case "item":
  //     case "material":
  //     case "member":
  //     case "mercenary":
  //     case "mob":
  //     case "npc":
  //     case "option":
  //     case "player":
  //     case "player_armor":
  //     case "player_option":
  //     case "player_pet":
  //     case "player_special":
  //     case "player_weapon":
  //     case "post":
  //     case "recipe":
  //     case "recipe_ingredient":
  //     case "session":
  //     case "simulator":
  //     case "skill":
  //     case "skill_effect":
  //     case "special":
  //     case "statistic":
  //     case "task":
  //     case "task_collect_require":
  //     case "task_kill_requirement":
  //     case "task_reward":
  //     case "team":
  //     case "user":
  //     case "verification_token":
  //     case "weapon":
  //     case "world":
  //     case "zone":
  //     default:
  //       return <Icon.Line.Gamepad />;
  //   }
  // }
  // 不区分大小写查找
  const backgroundImage = sprites.find((sprite) => sprite.name.toLowerCase() === iconName.toLowerCase());
  return (
    <Show when={backgroundImage} fallback={<Icon.Line.Gamepad />}>
      {(backgroundImage) => (
        <div class="flex-none relative h-6 w-6">
          <img
            src={spritesUrl}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: `${backgroundImage().width}px`,
              height: `${backgroundImage().height}px`,
              "object-position": `${-backgroundImage().x}px ${-backgroundImage().y}px`,
              "object-fit": "none",
              "max-width": "none",
              "max-height": "none",
            }}
            alt={iconName}
          />
        </div>
      )}
    </Show>
  );
};
