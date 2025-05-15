import { ItemType } from "~/../db/kysely/enums";
import { DB } from "~/../db/kysely/kyesely";

export const itemTypeToTableType = (itemType: ItemType) => {
  const tableType: keyof DB = (
    {
      Weapon: "weapon",
      Armor: "armor",
      Option: "option",
      Special: "special",
      Crystal: "crystal",
      Consumable: "consumable",
      Material: "material",
    } satisfies Record<ItemType, keyof DB>
  )[itemType];
  return tableType;
};

export const updateObjArrayItemKey = <T extends Record<string, any>>(
  array: T[],
  key: keyof T | null,
  index: number,
  value: T,
) => {
  if (key === null) {
    return array.map((item, i) => (i === index ? { ...item, value } : item));
  }
  return array.map((item, i) => (i === index ? { ...item, [key]: value[key] } : item));
};
