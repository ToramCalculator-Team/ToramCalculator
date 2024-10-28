import { $Enums } from "@prisma/client";
import { Character } from "~/repositories/character";
import { ModifierType } from "~/repositories/enums";

const weaponAbiT: Record<
  $Enums.MainWeaponType,
  {
    baseHit: number;
    baseAspd: number;
    weaAtk_Matk_Convert: number;
    weaAtk_Patk_Convert: number;
    abi_Attr_Convert: Record<
      "str" | "int" | "agi" | "dex",
      { pAtkT: number; mAtkT: number; aspdT: number; stabT: number }
    >;
  }
> = {
  ONE_HAND_SWORD: {
    baseHit: 0.25,
    baseAspd: 100,
    abi_Attr_Convert: {
      str: {
        pAtkT: 2,
        stabT: 0.025,
        aspdT: 0.2,
        mAtkT: 0,
      },
      int: {
        mAtkT: 3,
        pAtkT: 0,
        aspdT: 0,
        stabT: 0,
      },
      agi: {
        aspdT: 4.2,
        pAtkT: 0,
        mAtkT: 0,
        stabT: 0,
      },
      dex: {
        pAtkT: 2,
        stabT: 0.075,
        mAtkT: 0,
        aspdT: 0,
      },
    },
    weaAtk_Matk_Convert: 0,
    weaAtk_Patk_Convert: 1,
  },
  KATANA: {
    baseHit: 0.3,
    baseAspd: 200,
    abi_Attr_Convert: {
      str: {
        pAtkT: 1.5,
        stabT: 0.075,
        aspdT: 0.3,
        mAtkT: 0,
      },
      int: {
        mAtkT: 1.5,
        pAtkT: 0,
        aspdT: 0,
        stabT: 0,
      },
      agi: {
        aspdT: 3.9,
        pAtkT: 0,
        mAtkT: 0,
        stabT: 0,
      },
      dex: {
        pAtkT: 2.5,
        stabT: 0.025,
        mAtkT: 0,
        aspdT: 0,
      },
    },
    weaAtk_Matk_Convert: 0,
    weaAtk_Patk_Convert: 1,
  },
  TWO_HANDS_SWORD: {
    baseHit: 0.15,
    baseAspd: 50,
    abi_Attr_Convert: {
      str: {
        pAtkT: 3,
        aspdT: 0.2,
        mAtkT: 0,
        stabT: 0,
      },
      int: {
        mAtkT: 3,
        pAtkT: 0,
        aspdT: 0,
        stabT: 0,
      },
      agi: {
        aspdT: 2.2,
        pAtkT: 0,
        mAtkT: 0,
        stabT: 0,
      },
      dex: {
        pAtkT: 1,
        stabT: 0.1,
        mAtkT: 0,
        aspdT: 0,
      },
    },
    weaAtk_Matk_Convert: 0,
    weaAtk_Patk_Convert: 1,
  },
  BOW: {
    baseHit: 0.1,
    baseAspd: 75,
    abi_Attr_Convert: {
      str: {
        pAtkT: 1,
        stabT: 0.05,
        mAtkT: 0,
        aspdT: 0,
      },
      int: {
        mAtkT: 3,
        pAtkT: 0,
        aspdT: 0,
        stabT: 0,
      },
      agi: {
        aspdT: 3.1,
        pAtkT: 0,
        mAtkT: 0,
        stabT: 0,
      },
      dex: {
        pAtkT: 3,
        stabT: 0.05,
        aspdT: 0.2,
        mAtkT: 0,
      },
    },
    weaAtk_Matk_Convert: 0,
    weaAtk_Patk_Convert: 1,
  },
  BOWGUN: {
    baseHit: 0.05,
    baseAspd: 100,
    abi_Attr_Convert: {
      str: {
        stabT: 0.05,
        pAtkT: 0,
        mAtkT: 0,
        aspdT: 0,
      },
      int: {
        mAtkT: 3,
        pAtkT: 0,
        aspdT: 0,
        stabT: 0,
      },
      agi: {
        aspdT: 2.2,
        pAtkT: 0,
        mAtkT: 0,
        stabT: 0,
      },
      dex: {
        pAtkT: 4,
        aspdT: 0.2,
        mAtkT: 0,
        stabT: 0,
      },
    },
    weaAtk_Matk_Convert: 0,
    weaAtk_Patk_Convert: 1,
  },
  STAFF: {
    baseHit: 0.3,
    baseAspd: 60,
    abi_Attr_Convert: {
      str: {
        pAtkT: 3,
        stabT: 0.05,
        mAtkT: 0,
        aspdT: 0,
      },
      int: {
        mAtkT: 4,
        pAtkT: 1,
        aspdT: 0.2,
        stabT: 0,
      },
      agi: {
        aspdT: 1.8,
        pAtkT: 0,
        mAtkT: 0,
        stabT: 0,
      },
      dex: {
        aspdT: 0.2,
        pAtkT: 0,
        mAtkT: 0,
        stabT: 0,
      },
    },
    weaAtk_Matk_Convert: 1,
    weaAtk_Patk_Convert: 1,
  },
  MAGIC_DEVICE: {
    baseHit: 0.1,
    baseAspd: 90,
    abi_Attr_Convert: {
      str: {
        pAtkT: 0,
        mAtkT: 0,
        aspdT: 0,
        stabT: 0,
      },
      int: {
        mAtkT: 4,
        pAtkT: 2,
        aspdT: 0.2,
        stabT: 0,
      },
      agi: {
        pAtkT: 2,
        aspdT: 4,
        mAtkT: 0,
        stabT: 0,
      },
      dex: {
        stabT: 0.1,
        pAtkT: 0,
        mAtkT: 1,
        aspdT: 0,
      },
    },
    weaAtk_Matk_Convert: 1,
    weaAtk_Patk_Convert: 1,
  },
  KNUCKLE: {
    baseHit: 0.1,
    baseAspd: 120,
    abi_Attr_Convert: {
      str: {
        aspdT: 0.1,
        pAtkT: 0,
        mAtkT: 0,
        stabT: 0,
      },
      int: {
        mAtkT: 4,
        pAtkT: 0,
        aspdT: 0,
        stabT: 0,
      },
      agi: {
        pAtkT: 2,
        aspdT: 4.6,
        mAtkT: 0,
        stabT: 0,
      },
      dex: {
        pAtkT: 0.5,
        stabT: 0.025,
        mAtkT: 0,
        aspdT: 0.1,
      },
    },
    weaAtk_Matk_Convert: 0.5,
    weaAtk_Patk_Convert: 1,
  },
  HALBERD: {
    baseHit: 0.25,
    baseAspd: 20,
    abi_Attr_Convert: {
      str: {
        pAtkT: 2.5,
        stabT: 0.05,
        aspdT: 0.2,
        mAtkT: 0,
      },
      int: {
        mAtkT: 2,
        pAtkT: 0,
        aspdT: 0,
        stabT: 0,
      },
      agi: {
        aspdT: 3.5,
        pAtkT: 1.5,
        mAtkT: 1,
        stabT: 0,
      },
      dex: {
        stabT: 0.05,
        pAtkT: 0,
        mAtkT: 0,
        aspdT: 0,
      },
    },
    weaAtk_Matk_Convert: 0,
    weaAtk_Patk_Convert: 1,
  },
  NO_WEAPON: {
    baseHit: 50,
    baseAspd: 1000,
    abi_Attr_Convert: {
      str: {
        pAtkT: 1,
        mAtkT: 0,
        aspdT: 0,
        stabT: 0,
      },
      int: {
        mAtkT: 3,
        pAtkT: 0,
        aspdT: 0,
        stabT: 0,
      },
      agi: {
        aspdT: 9.6,
        pAtkT: 0,
        mAtkT: 0,
        stabT: 0,
      },
      dex: {
        pAtkT: 0,
        mAtkT: 0,
        aspdT: 0,
        stabT: 0,
      },
    },
    weaAtk_Matk_Convert: 0,
    weaAtk_Patk_Convert: 1,
  },
};

const enum ValueType {
  system,
  user,
  both,
}

const enum OriginType {
  baseValue,
  staticConstant,
  staticPercentage,
  dynamicConstant,
  dynamicPercentage,
}

// const characterData = (character: Character) => {
//   return {
//     [ModifierType.STR]: {
//       type: ValueType.user,
//       baseValue: character.baseStr,
//       modifiers: {},
//       relation: [
//         {
//           name: ModifierType.PHYSICAL_ATK,
//           rate: weaponAbiT[character.mainWeapon.mainWeaponType].abi_Attr_Convert.str.pAtkT,
//           originType: OriginType.baseValue,
//         },
//         {
//           name: ModifierType.PHYSICAL_STABILITY,
//           rate: weaponAbiT[character.mainWeapon.mainWeaponType].abi_Attr_Convert.str.stabT,
//           originType: OriginType.baseValue,
//         },
//       ],
//     },
//   };
// };

const characterData = (character: Character) => {
  const characterMap = new Map<
    ModifierType,
    {
      type: ValueType;
      baseValue: number;
      modifiers: {};
      relation: {
        name: ModifierType;
        rate: number;
        originType: OriginType;
      }[];
    }
  >();
  characterMap.set(ModifierType.STR, {
    type: ValueType.user,
    baseValue: character.baseStr,
    modifiers: {},
    relation: [
      {
        name: ModifierType.PHYSICAL_ATK,
        rate: weaponAbiT[character.mainWeapon.mainWeaponType].abi_Attr_Convert.str.pAtkT,
        originType: OriginType.baseValue,
      },
      {
        name: ModifierType.MAGICAL_ATK,
        rate: weaponAbiT[character.mainWeapon.mainWeaponType].abi_Attr_Convert.str.mAtkT,
        originType: OriginType.baseValue,
      },
      {
        name: ModifierType.PHYSICAL_STABILITY,
        rate: weaponAbiT[character.mainWeapon.mainWeaponType].abi_Attr_Convert.str.stabT,
        originType: OriginType.baseValue,
      },
      {
        name: ModifierType.ASPD,
        rate: weaponAbiT[character.mainWeapon.mainWeaponType].abi_Attr_Convert.str.aspdT,
        originType: OriginType.baseValue,
      },
      {
        name: ModifierType.PHYSICAL_CRITICAL_DAMAGE,
        rate: (characterMap.get(ModifierType.STR) ?? 1) > (characterMap.get(ModifierType.AGI) ?? 1) ? 0.2 : 0,
        originType: OriginType.baseValue,
      },
    ],
  });
  characterMap.set(ModifierType.INT, {
    type: ValueType.user,
    baseValue: character.baseStr,
    modifiers: {},
    relation: [
      {
        name: ModifierType.PHYSICAL_ATK,
        rate: weaponAbiT[character.mainWeapon.mainWeaponType].abi_Attr_Convert.int.pAtkT,
        originType: OriginType.baseValue,
      },
      {
        name: ModifierType.PHYSICAL_STABILITY,
        rate: weaponAbiT[character.mainWeapon.mainWeaponType].abi_Attr_Convert.int.stabT,
        originType: OriginType.baseValue,
      },
    ],
  });
  return characterMap;
};
