import { Transaction } from "kysely";
import { DB } from "../../../../../../db/kysely/kyesely";
import { getPrimaryKeys } from "~/repositories/untils";

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
  const dataToAdd = props.newArray.filter((effect) => !props.oldArray.some((oldEffect) => {
    for (const primaryKey of primaryKeys) {
      if (effect[primaryKey as keyof DB[T]] === oldEffect[primaryKey as keyof DB[T]]) {
        return true;
      }
    }
    return false;
  }));
  const dataToRemove = props.oldArray.filter(
    (oldEffect) => !props.newArray.some((newEffect) => {
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
