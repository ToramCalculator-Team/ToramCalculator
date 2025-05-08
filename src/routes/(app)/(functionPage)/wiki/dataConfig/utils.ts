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
