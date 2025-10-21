import { Transaction } from "kysely";
import { DB } from "@db/generated/zod/index";
import { getPrimaryKeys } from "@db/repositories/untils";
import { Show } from "solid-js";
import { dictionary } from "~/locales/type";
import { setStore, store } from "~/store";
import { Button } from "~/components/controls/button";
import Icons from "~/components/icons/index";
import { getDB } from "@db/repositories/database";
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
    <Show when={props.data.createdByAccountId === store.session.account?.id}>
      <section class="FunFieldGroup flex w-full flex-col gap-2">
        <h3 class="text-accent-color flex items-center gap-2 font-bold">
          {props.dic.ui.actions.operation}
          <div class="Divider bg-dividing-color h-px w-full flex-1" />
        </h3>
        <div class="FunGroup flex gap-1">
          <Button
            class="w-fit"
            icon={<Icons.Outline.Trash />}
            onclick={async () => {
              const db = await getDB();
              await db.transaction().execute(async (trx) => {
                await props.delete(trx, props.data);
              });
              // 关闭当前卡片
              setStore("pages","cardGroup", (pre) => pre.slice(0, -1));
            }}
          />
          <Button
            class="w-fit"
            icon={<Icons.Outline.Edit />}
            onclick={() => {
              // 关闭当前卡片
              setStore("pages","cardGroup", (pre) => pre.slice(0, -1));
              // 打开表单
              setWikiStore("form", { isOpen: true, data: props.data });
            }}
          />
        </div>
      </section>
    </Show>
  );
};

/**
 * 文字滚动展示组件(暂未完成)
 * @param props.text 要展示的文字
 * @param props.width 展示的宽度
 **/
export const TextScroll = (props: { text: string; width: number }) => {
  // 当文字长度大于宽度时，文字会滚动
  const textLength = props.text.length;
  const scrollDuration = textLength * 0.1;
  return (
    <span
      class="overflow-hidden text-nowrap text-ellipsis"
    >
        {props.text}
    </span>
  );
};
