import { DB } from "@db/generated/zod";
import { ElementType, MOB_DIFFICULTY_FLAG, MobDifficultyFlag, MobType } from "@db/schema/enums";
import { AnyFieldApi } from "@tanstack/solid-form";
import { Cell, ColumnDef } from "@tanstack/solid-table";
import { Accessor, createEffect, createSignal, JSX, Show } from "solid-js";
import { ZodObject, ZodType } from "zod/v4";
import { FieldGenMap } from "~/components/dataDisplay/objRender";
import Icons from "~/components/icons";
import { Dic, FieldDict } from "~/locales/type";
import { store } from "~/store";
import { LogicEditor } from "../features/logicEditor/LogicEditor";
import { MemberBaseNestedSchema } from "../features/simulator/core/member/MemberBaseSchema";
import { Select } from "../controls/select";
import { generateBossDataByFlag } from "~/lib/utils/mob";

export type DataConfig = Partial<{
  [T in keyof DB]: {
    fieldGroupMap: Record<string, Array<keyof DB[T]>>;
    table: {
      measure?: {
        estimateSize: number;
      };
      columnsDef: ColumnDef<DB[T]>[];
      hiddenColumnDef: Array<keyof DB[T]>;
      defaultSort: { id: keyof DB[T]; desc: boolean };
      tdGenerator: Partial<{
        [K in keyof DB[T]]: (props: { cell: Cell<DB[T], unknown>; dic: Dic<DB[T]> }) => JSX.Element;
      }>;
    };
    form: {
      hiddenFields: Array<keyof DB[T]>;
      fieldGenerator?: Partial<{
        [K in keyof DB[T]]: (
          field: Accessor<AnyFieldApi>,
          dictionary: Dic<DB[T]>,
          dataSchema: ZodObject<Record<keyof DB[T], ZodType>>,
        ) => JSX.Element;
      }>;
    };
    card: {
      hiddenFields: Array<keyof DB[T]>;
      fieldGenerator?: FieldGenMap<DB[T]>;
      before?: (
        data: DB[T],
        setData: (data: DB[T]) => void,
        dataSchema: ZodObject<Record<keyof DB[T], ZodType>>,
        dictionary: Dic<DB[T]>,
      ) => JSX.Element;
      after?: (
        data: DB[T],
        setData: (data: DB[T]) => void,
        dataSchema: ZodObject<Record<keyof DB[T], ZodType>>,
        dictionary: Dic<DB[T]>,
      ) => JSX.Element;
    };
  };
}>;

export const DATA_CONFIG: DataConfig = {
  activity: {
    fieldGroupMap: {},
    table: {
      columnsDef: [
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
      hiddenColumnDef: ["id"],
      defaultSort: { id: "name", desc: false },
      tdGenerator: {},
    },
    form: {
      hiddenFields: [],
      fieldGenerator: {},
    },
    card: {
      hiddenFields: [],
      fieldGenerator: {},
    },
  },
  address: {
    fieldGroupMap: {
      基本信息: ["name", "type"],
      坐标信息: ["posX", "posY"],
    },
    table: {
      columnsDef: [
        { accessorKey: "id", cell: (info: any) => info.getValue(), size: 200 },
        { accessorKey: "name", cell: (info: any) => info.getValue(), size: 200 },
        { accessorKey: "type", cell: (info: any) => info.getValue(), size: 160 },
        { accessorKey: "posX", cell: (info: any) => info.getValue(), size: 160 },
        { accessorKey: "posY", cell: (info: any) => info.getValue(), size: 160 },
      ],
      hiddenColumnDef: ["id"],
      defaultSort: { id: "name", desc: false },
      tdGenerator: {},
    },
    form: {
      hiddenFields: [],
      fieldGenerator: {},
    },
    card: {
      hiddenFields: [],
      fieldGenerator: {},
    },
  },
  armor: {
    fieldGroupMap: {
      基本信息: ["name", "baseAbi"],
      其他属性: ["modifiers"],
      颜色信息: ["colorA", "colorB", "colorC"],
    },
    table: {
      columnsDef: [
        { accessorKey: "name", cell: (info: any) => info.getValue(), size: 200 },
        { accessorKey: "itemId", cell: (info: any) => info.getValue(), size: 200 },
        { accessorKey: "baseAbi", cell: (info: any) => info.getValue(), size: 100 },
      ],
      hiddenColumnDef: [],
      defaultSort: { id: "itemId", desc: false },
      tdGenerator: {},
    },
    form: {
      hiddenFields: [],
      fieldGenerator: {},
    },
    card: {
      hiddenFields: [],
      fieldGenerator: {},
    },
  },
  consumable: {
    fieldGroupMap: {},
    table: {
      columnsDef: [
        { accessorKey: "name", cell: (info: any) => info.getValue(), size: 200 },
        { accessorKey: "itemId", cell: (info: any) => info.getValue(), size: 200 },
        { accessorKey: "type", cell: (info: any) => info.getValue(), size: 150 },
        { accessorKey: "effectDuration", cell: (info: any) => info.getValue(), size: 100 },
        { accessorKey: "effects", cell: (info: any) => info.getValue(), size: 150 },
      ],
      hiddenColumnDef: [],
      defaultSort: { id: "itemId", desc: false },
      tdGenerator: {},
    },
    form: {
      hiddenFields: [],
      fieldGenerator: {},
    },
    card: {
      hiddenFields: [],
      fieldGenerator: {},
    },
  },
  crystal: {
    fieldGroupMap: {
      基本信息: ["name", "type", "modifiers"],
    },
    table: {
      measure: {
        estimateSize: 200,
      },
      columnsDef: [
        { accessorKey: "name", cell: (info: any) => info.getValue(), size: 150 },
        { accessorKey: "itemId", cell: (info: any) => info.getValue(), size: 200 },
        { accessorKey: "modifiers", cell: (info: any) => info.getValue(), size: 480 },
        { accessorKey: "type", cell: (info: any) => info.getValue(), size: 100 },
      ],
      hiddenColumnDef: [],
      defaultSort: { id: "name", desc: false },
      tdGenerator: {},
    },
    form: {
      hiddenFields: [],
      fieldGenerator: {},
    },
    card: {
      hiddenFields: [],
      fieldGenerator: {
        name: (data, key, dictionary) => {
          return (
            <div class="Field flex gap-2">
              <span class="text-main-text-color text-nowrap">{dictionary.fields[key].key}</span>:
              <span class="flex items-center gap-2 font-bold">
                <Icons.Spirits iconName={data.type} size={24} /> {String(data[key])}
              </span>
            </div>
          );
        },
      },
    },
  },
  mob: {
    fieldGroupMap: {
      常规属性: ["name", "baseLv", "experience", "partsExperience", "maxhp"],
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
        "normalDefExp",
        "physicDefExp",
        "magicDefExp",
      ],
      额外说明: ["details"],
      怪物行为: ["actions"],
      词条信息: ["dataSources"],
      关联数据: ["createdByAccountId", "updatedByAccountId"],
    },
    table: {
      columnsDef: [
        {
          id: "id",
          accessorFn: (row) => row.id,
          cell: (info) => info.getValue(),
          size: {
            "zh-CN": 160,
            "zh-TW": 160,
            ja: 160,
            en: 160,
          }[store.settings.userInterface.language],
        },
        {
          id: "name",
          accessorFn: (row) => row.name,
          cell: (info) => info.getValue(),
          size: {
            "zh-CN": 180,
            "zh-TW": 180,
            ja: 260,
            en: 260,
          }[store.settings.userInterface.language],
        },
        {
          id: "initialElement",
          accessorFn: (row) => row.initialElement,
          cell: (info) => info.getValue<ElementType>(),
          size: {
            "zh-CN": 115,
            "zh-TW": 115,
            ja: 115,
            en: 180,
          }[store.settings.userInterface.language],
        },
        {
          id: "type",
          accessorFn: (row) => row.type,
          cell: (info) => info.getValue<MobType>(),
          size: {
            "zh-CN": 80,
            "zh-TW": 80,
            ja: 120,
            en: 120,
          }[store.settings.userInterface.language],
        },
        {
          id: "captureable",
          accessorFn: (row) => row.captureable,
          cell: (info) => info.getValue<Boolean>().toString(),
          size: {
            "zh-CN": 100,
            "zh-TW": 100,
            ja: 100,
            en: 100,
          }[store.settings.userInterface.language],
        },
        {
          id: "baseLv",
          accessorFn: (row) => row.baseLv,
          cell: (info) => info.getValue(),
          size: {
            "zh-CN": 115,
            "zh-TW": 115,
            ja: 180,
            en: 140,
          }[store.settings.userInterface.language],
        },
        {
          id: "experience",
          accessorFn: (row) => row.experience,
          size: {
            "zh-CN": 115,
            "zh-TW": 115,
            ja: 180,
            en: 180,
          }[store.settings.userInterface.language],
        },
        {
          id: "physicalDefense",
          accessorFn: (row) => row.physicalDefense,
          size: {
            "zh-CN": 115,
            "zh-TW": 115,
            ja: 180,
            en: 180,
          }[store.settings.userInterface.language],
        },
        {
          id: "physicalResistance",
          accessorFn: (row) => row.physicalResistance,
          size: {
            "zh-CN": 115,
            "zh-TW": 115,
            ja: 180,
            en: 180,
          }[store.settings.userInterface.language],
        },
        {
          id: "magicalDefense",
          accessorFn: (row) => row.magicalDefense,
          size: {
            "zh-CN": 115,
            "zh-TW": 115,
            ja: 180,
            en: 180,
          }[store.settings.userInterface.language],
        },
        {
          id: "magicalResistance",
          accessorFn: (row) => row.magicalResistance,
          size: {
            "zh-CN": 115,
            "zh-TW": 115,
            ja: 180,
            en: 180,
          }[store.settings.userInterface.language],
        },
        {
          id: "criticalResistance",
          accessorFn: (row) => row.criticalResistance,
          size: {
            "zh-CN": 115,
            "zh-TW": 115,
            ja: 180,
            en: 180,
          }[store.settings.userInterface.language],
        },
        {
          id: "avoidance",
          accessorFn: (row) => row.avoidance,
          size: {
            "zh-CN": 100,
            "zh-TW": 100,
            ja: 180,
            en: 180,
          }[store.settings.userInterface.language],
        },
        {
          id: "dodge",
          accessorFn: (row) => row.dodge,
          size: {
            "zh-CN": 100,
            "zh-TW": 100,
            ja: 180,
            en: 180,
          }[store.settings.userInterface.language],
        },
        {
          id: "block",
          accessorFn: (row) => row.block,
          size: {
            "zh-CN": 100,
            "zh-TW": 100,
            ja: 180,
            en: 180,
          }[store.settings.userInterface.language],
        },
        {
          id: "actions",
          accessorFn: (row) => row.actions,
          size: {
            "zh-CN": 120,
            "zh-TW": 120,
            ja: 180,
            en: 180,
          }[store.settings.userInterface.language],
        },
      ],
      hiddenColumnDef: ["id", "captureable", "actions", "createdByAccountId", "updatedByAccountId"],
      defaultSort: { id: "experience", desc: true },
      tdGenerator: {
        initialElement: (props) =>
          ({
            Water: <Icons.Game.ElementWater class="h-12 w-12" />,
            Fire: <Icons.Game.ElementFire class="h-12 w-12" />,
            Earth: <Icons.Game.ElementEarth class="h-12 w-12" />,
            Wind: <Icons.Game.ElementWind class="h-12 w-12" />,
            Light: <Icons.Game.ElementLight class="h-12 w-12" />,
            Dark: <Icons.Game.ElementDark class="h-12 w-12" />,
            Normal: <Icons.Game.ElementNoElement class="h-12 w-12" />,
          })[props.cell.getValue<ElementType>()],
        name: (props) => (
          <div class="text-accent-color flex flex-col gap-1">
            <span>{props.cell.getValue<string>()}</span>
            <Show when={props.cell.row.original.type === "Mob"}>
              <span class="text-main-text-color text-xs">{props.cell.row.original.captureable}</span>
            </Show>
          </div>
        ),
      },
    },
    form: {
      hiddenFields: ["id", "createdByAccountId", "updatedByAccountId"],
      fieldGenerator: {
        actions: (field, dictionary, dataSchema) => {
          return (
            <LogicEditor
              data={field().state.value}
              schema={MemberBaseNestedSchema}
              targetSchema={MemberBaseNestedSchema}
              setData={(data) => field().setValue(data)}
              state={true}
            />
          );
        },
      },
    },
    card: {
      hiddenFields: ["id", "createdByAccountId", "updatedByAccountId"],
      before: (data, setData, dataSchema, dictionary) => {
        const [difficulty, setDifficulty] = createSignal<MobDifficultyFlag>(MOB_DIFFICULTY_FLAG[1]);
        
        createEffect(() => {
          setData(generateBossDataByFlag(data, difficulty()));
        });
      
        return (
          <Show when={data.type === "Boss"}>
            <Select
              value={difficulty()}
              setValue={(value) => {
                setDifficulty(value as MobDifficultyFlag);
              }}
              options={MOB_DIFFICULTY_FLAG.map((flag) => ({
                label: flag,
                value: flag,
              }))}
              optionGenerator={(option, selected, handleSelect) => {
                return (
                  <div
                    class={`hover:bg-area-color flex cursor-pointer gap-3 px-3 py-2 ${selected ? "bg-area-color" : ""}`}
                    onClick={handleSelect}
                  >
                    <div class="text-accent-color flex gap-1">
                      <Icons.Filled.Star
                        class={
                          ["Normal", "Hard", "Lunatic", "Ultimate"].includes(option.value)
                            ? "fill-brand-color-1st!"
                            : "fill-none!"
                        }
                      />
                      <Icons.Filled.Star
                        class={
                          ["Hard", "Lunatic", "Ultimate"].includes(option.value)
                            ? "fill-brand-color-2nd!"
                            : "fill-none!"
                        }
                      />
                      <Icons.Filled.Star
                        class={["Lunatic", "Ultimate"].includes(option.value) ? "fill-brand-color-3rd!" : "fill-none!"}
                      />
                      <Icons.Filled.Star
                        class={["Ultimate"].includes(option.value) ? "fill-brand-color-4th!" : "fill-none!"}
                      />
                    </div>
                    <span class="text-accent-color">
                      Lv:
                      {data.baseLv +
                        ({
                          Easy: -1,
                          Normal: 0,
                          Hard: 1,
                          Lunatic: 2,
                          Ultimate: 4,
                        }[option.value] ?? 0) *
                          10}
                    </span>
                  </div>
                );
              }}
            />
          </Show>
        );
      },
    },
  },
  player_weapon: {
    fieldGroupMap: {
      基础属性: ["type", "name", "baseAbi", "stability", "elementType"],
      附加属性: ["extraAbi", "refinement", "modifiers"],
    },
    table: {
      columnsDef: [],
      hiddenColumnDef: [],
      defaultSort: {
        id: "type",
        desc: false,
      },
      tdGenerator: {},
    },
    form: {
      hiddenFields: [],
      fieldGenerator: {},
    },
    card: {
      hiddenFields: [],
      fieldGenerator: {
        name: (data, key, dictionary) => (
          <div class="text-accent-color flex flex-col gap-1">
            <span>
              {key}: {data[key]} --- {dictionary.fields[key].key}
            </span>
          </div>
        ),
      },
    },
  },
};
