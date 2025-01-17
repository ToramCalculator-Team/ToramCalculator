import {
  ModifierType,
  UserRole,
  ElementType,
  MobType,
  PersonalityType,
  ArmorType,
  SkillTargetType,
  SkillChargingType,
  YieldType,
  DurationType,
  MobDifficultyFlag,
  MobDamageType,
  AddressType,
  MaterialType,
  PartBreakReward,
  MobPart,
  AcquisitionMethodType,
  SkillDistanceResistType,
  PetPersonaType,
  PetType,
  MercenaryType,
  MercenarySkillType,
  Visibility,
  AccountType,
  MainWeaponType,
  SubWeaponType,
  WeaponType,
  EquipType,
  CrystalType,
  ItemType,
  TaskRewardType,
  AbnormalType,
  SkillTreeType,
  SkillAttackType,
  SkillComboType,
} from "~/repositories/enums";

type UnionToObject<A extends string> = {
  [K in A | "selfName"]: string;
};

export interface Enums {
  ModifierType: UnionToObject<ModifierType>;
  UserRole: UnionToObject<UserRole>;
  Element: UnionToObject<ElementType>;
  MobType: UnionToObject<MobType>;
  PersonalityType: UnionToObject<PersonalityType>;
  ArmorType: UnionToObject<ArmorType>;
  SkillTargetType: UnionToObject<SkillTargetType>;
  SkillChargingType: UnionToObject<SkillChargingType>;
  YieldType: UnionToObject<YieldType>;
  DurationType: UnionToObject<DurationType>;
  MobDifficultyFlag: UnionToObject<MobDifficultyFlag>;
  MobDamageType: UnionToObject<MobDamageType>;
  AddressType: UnionToObject<AddressType>;
  MaterialType: UnionToObject<MaterialType>;
  PartBreakReward: UnionToObject<PartBreakReward>;
  MobPart: UnionToObject<MobPart>;
  AcquisitionMethodType: UnionToObject<AcquisitionMethodType>;
  SkillDistanceResistType: UnionToObject<SkillDistanceResistType>;
  PetPersonaType: UnionToObject<PetPersonaType>;
  PetType: UnionToObject<PetType>;
  MercenaryType: UnionToObject<MercenaryType>;
  MercenarySkillType: UnionToObject<MercenarySkillType>;
  Visibility: UnionToObject<Visibility>;
  AccountType: UnionToObject<AccountType>;
  MainWeaponType: UnionToObject<MainWeaponType>;
  SubWeaponType: UnionToObject<SubWeaponType>;
  WeaponType: UnionToObject<WeaponType>;
  EquipType: UnionToObject<EquipType>;
  CrystalType: UnionToObject<CrystalType>;
  ItemType: UnionToObject<ItemType>;
  TaskRewardType: UnionToObject<TaskRewardType>;
  AbnormalType: UnionToObject<AbnormalType>;
  SkillTreeType: UnionToObject<SkillTreeType>;
  SkillAttackType: UnionToObject<SkillAttackType>;
  SkillComboType: UnionToObject<SkillComboType>;
}

export interface dictionary {
  ui: {
    searchPlaceholder: string;
    columnsHidden: string;
    actions: {
      add: string;
      create: string;
      remove: string;
      upload: string;
      update: string;
      save: string;
      swap: string;
      reset: string;
      modify: string;
      cancel: string;
      open: string;
      close: string;
      back: string;
      filter: string;
      generateImage: string;
      checkInfo: string;
      zoomIn: string;
      zoomOut: string;
    };
    nav: {
      home: string;
      mobs: string;
      skills: string;
      equipments: string;
      crystals: string;
      pets: string;
      items: string;
      character: string;
      simulator: string;
    };
    errorPage: {
      tips: string;
    };
    settings: {
      title: string;
      userInterface: {
        title: string;
        isAnimationEnabled: {
          title: string;
          description: string;
        };
        is3DbackgroundDisabled: {
          title: string;
          description: string;
        };
      };
      language: {
        title: string;
        selectedLanguage: {
          title: string;
          description: string;
          zhCN: string;
          zhTW: string;
          enUS: string;
          jaJP: string;
        };
      };
      statusAndSync: {
        title: string;
        restorePreviousStateOnStartup: {
          title: string;
          description: string;
        };
        syncStateAcrossClients: {
          title: string;
          description: string;
        };
      };
      privacy: {
        title: string;
        postVisibility: {
          title: string;
          description: string;
          everyone: string;
          friends: string;
          onlyMe: string;
        };
      };
      messages: {
        title: string;
        notifyOnContentChange: {
          title: string;
          description: string;
          notifyOnReferencedContentChange: string;
          notifyOnLike: string;
          notifyOnBookmark: string;
        };
      };
      about: {
        title: string;
        description: {
          title: string;
          description: string;
        };
        version: {
          title: string;
          description: string;
        };
      };
    };
    index: {
      adventurer: string;
      goodMorning: string;
      goodAfternoon: string;
      goodEvening: string;
      nullSearchResultWarring: string;
      nullSearchResultTips: string;
    };
    mob: {
      pageTitle: string;
      table: {
        title: string;
        description: string;
      };
      news: {
        title: string;
      };
      augmented: string;
      canNotModify: string;
      difficultyflag: {
        Easy: string;
        Normal: string;
        Hard: string;
        Lunatic: string;
        Ultimate: string;
      };
      mobForm: {
        description: string;
      };
    };
    crystal: {
      pageTitle: string;
      description: string;
      canNotModify: string;
      crystalForm: {
        description: string;
      };
    };
    skill: {
      pageTitle: string;
      description: string;
    };
    simulator: {
      pageTitle: string;
      description: string;
      actualValue: string;
      baseValue: string;
      modifiers: string;
      staticModifiers: string;
      dynamicModifiers: string;
      // dialogData: ConvertToAllString<CharacterData>;
      simulatorPage: {
        mobsConfig: {
          title: string;
        };
        teamConfig: {
          title: string;
        };
      };
    };
    character: {
      pageTitle: string;
      description: string;
    };
  };
  enums: Enums;
}
