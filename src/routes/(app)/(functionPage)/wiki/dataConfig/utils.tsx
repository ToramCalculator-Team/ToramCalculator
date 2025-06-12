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
