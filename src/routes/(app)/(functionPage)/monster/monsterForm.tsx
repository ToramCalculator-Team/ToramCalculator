"use client";
import React, { useEffect } from "react";
import "@mdxeditor/editor/style.css";
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CodeToggle,
  DiffSourceToggleWrapper,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  MDXEditor,
  type MDXEditorMethods,
  Separator,
  UndoRedo,
  diffSourcePlugin,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  tablePlugin,
  toolbarPlugin,
  thematicBreakPlugin,
} from "@mdxeditor/editor";
import { rApi } from "~/trpc/react";
import type { getDictionary } from "~/app/get-dictionary";
import Button from "../../_components/button";
import { type FieldApi, useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { ZodFirstPartyTypeKind, type z } from "zod";
import { type $Enums } from "@prisma/client";
import { useStore } from "~/app/store";
import { type Session } from "next-auth";
import {
  IconElementWater,
  IconElementFire,
  IconElementEarth,
  IconElementWind,
  IconElementLight,
  IconElementDark,
  IconElementNoElement,
} from "../../_components/iconsList";
import { useTheme } from "next-themes";
import LineWrappingInput from "../../_components/autoLineWrappingInput";
import { type Monster, MonsterInputSchema, defaultMonster } from "~/schema/monster";
import { type Statistics } from "~/schema/statistics";

export default function MonsterForm(props: {
  dictionary: ReturnType<typeof getDictionary>;
  session: Session | null;
  basicMonsterList: Monster[];
  setBasicMonsterList: (list: Monster[]) => void;
}) {
  const { dictionary, session, basicMonsterList, setBasicMonsterList } = props;
  // 状态管理参数
  const {
    augmented,
    monsterDialogState,
    setMonsterList,
    setMonsterDialogState,
    monsterFormState,
    setMonsterFormState,
  } = useStore((state) => state.monsterPage);
  const { monster, setMonster } = useStore((state) => state);
  let newMonster: Monster;
  const formTitle = {
    CREATE: dictionary.ui.upload,
    UPDATE: dictionary.ui.modify,
    DISPLAY: monster.name,
  }[monsterFormState];
  const [dataUploadingState, setDataUploadingState] = React.useState(false);
  const theme = useTheme();
  const mdxEditorRef = React.useRef<MDXEditorMethods>(null);

  function FieldInfo({
    field,
  }: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    field: FieldApi<Monster, keyof Monster, any, any>;
  }) {
    return (
      <React.Fragment>
        {field.state.meta.errors ? (
          <span className=" text-brand-color-2nd">
            {` `} : {field.state.meta.errors}
          </span>
        ) : null}
        {/* {field.state.meta.isValidating ? "正在检查..." : null} */}
      </React.Fragment>
    );
  }

  // 定义不需要手动输入的值
  const monsterHiddenData: Array<keyof Monster> = [
    "id",
    "createdAt",
    "updatedAt",
    "createdByUserId",
    "updatedByUserId",
  ];

  // 定义表单
  const form = useForm({
    defaultValues: {
      CREATE: defaultMonster,
      UPDATE: monster,
      DISPLAY: monster,
    }[monsterFormState],
    onSubmit: async ({ value }) => {
      setDataUploadingState(true);
      newMonster = {
        ...value,
        createdAt: new Date(),
        updatedAt: new Date(),
      } satisfies Monster;
      switch (monsterFormState) {
        case "CREATE":
          createMonster.mutate(newMonster as Monster & { statistics: Statistics });
          break;

        case "UPDATE":
          updateMonster.mutate(newMonster as Monster & { statistics: Statistics });
          break;

        default:
          break;
      }
      setMonsterDialogState(false);
    },
    validatorAdapter: zodValidator,
  });

  const getZodType = <T extends z.ZodTypeAny>(schema: T): ZodFirstPartyTypeKind => {
    if (schema === undefined || schema == null) {
      return ZodFirstPartyTypeKind.ZodUndefined;
    }
    if ("_def" in schema) {
      if ("innerType" in schema._def) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return getZodType(schema._def.innerType);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return schema._def.typeName as ZodFirstPartyTypeKind;
      }
    }
    return ZodFirstPartyTypeKind.ZodUndefined;
  };

  const createMonster = rApi.monster.create.useMutation({
    onSuccess(data) {
      const newList = [...basicMonsterList, data];
      // 创建成功后更新数据
      setBasicMonsterList(newList);
      setMonsterList(newList);
      // 上传成功后表单转换为展示状态
      setDataUploadingState(false);
      setMonsterFormState("DISPLAY");
    },
  });

  const updateMonster = rApi.monster.update.useMutation({
    onSuccess(data) {
      const newList = basicMonsterList.map((monster) => {
        if (monster.id === data.id) {
          return data;
        }
        return monster;
      });
      // 更新成功后更新数据
      setBasicMonsterList(newList);
      setMonsterList(newList);
      // 上传成功后表单转换为展示状态
      setDataUploadingState(false);
      setMonsterFormState("DISPLAY");
    },
  });

  useEffect(() => {
    console.log("---MonsterForm render");
    mdxEditorRef.current?.setMarkdown(monster.extraDetails ?? "");
    // escape键监听
    const handleEscapeKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMonsterDialogState(!monsterDialogState);
      }
    };

    // 监听绑带与清除
    document.addEventListener("keydown", handleEscapeKeyPress);

    return () => {
      console.log("---MonsterForm unmount");
      document.removeEventListener("keydown", handleEscapeKeyPress);
    };
  }, [form, monster, monsterDialogState, monsterFormState, setMonsterDialogState]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
      className={`CreateMonsterFrom flex w-full flex-col gap-4 overflow-y-auto rounded px-3`}
    >
      <div className="title flex items-center gap-6 pt-4">
        <div className="h-[2px] flex-1 bg-accent-color"></div>
        <span className="text-lg font-bold lg:text-2xl">{formTitle}</span>
        <div className="h-[2px] flex-1 bg-accent-color"></div>
      </div>
      <div className="inputArea flex-1 overflow-y-auto">
        {monsterFormState !== "DISPLAY" && (
          <div className="mb-4 rounded-sm bg-transition-color-8 p-4">
            {dictionary.ui.monster.monsterForm.discription}
          </div>
        )}
        <fieldset className="dataKinds flex flex-row flex-wrap gap-y-[4px]">
          {Object.entries(monster).map(([key, _]) => {
            // 遍历怪物模型
            // 过滤掉隐藏的数据
            if (monsterHiddenData.includes(key as keyof Monster)) return undefined;
            // 输入框的类型计算
            const zodValue = MonsterInputSchema.shape[key as keyof Monster];
            const valueType = getZodType(zodValue);
            // 由于数组类型的值与常规变量值存在结构差异，因此在此进行区分
            switch (valueType) {
              case ZodFirstPartyTypeKind.ZodEnum: {
                return (
                  <form.Field
                    key={key}
                    name={key as keyof Monster}
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: MonsterInputSchema.shape[key as keyof Monster],
                    }}
                  >
                    {(field) => {
                      const defaultFieldsetClass = "flex basis-full flex-col gap-1 p-2";
                      const fieldsetClass: string = defaultFieldsetClass;
                      switch (key as keyof Monster) {
                        case "monsterType":
                        case "element":
                        default:
                          break;
                      }
                      return (
                        <fieldset key={key} className={fieldsetClass}>
                          <span>
                            {typeof dictionary.db.models.monster[key as keyof Monster] === "string"
                              ? (dictionary.db.models.monster[key as keyof Monster] as string)
                              : key}
                            <FieldInfo field={field} />
                          </span>
                          <div
                            className={`inputContianer mt-1 flex flex-wrap self-start rounded lg:gap-2 ${monsterFormState === "DISPLAY" ? " outline-transition-color-20" : ""}`}
                          >
                            {"options" in zodValue &&
                              zodValue.options.map((option) => {
                                const defaultInputClass = "mt-0.5 rounded px-4 py-2";
                                const defaultLabelSizeClass = "";
                                let inputClass = defaultInputClass;
                                let labelSizeClass = defaultLabelSizeClass;
                                let icon: React.ReactNode = null;
                                switch (option) {
                                  // case "PRIVATE":
                                  // case "PUBLIC":
                                  // case "COMMON_MOBS":
                                  // case "COMMON_MINI_BOSS":
                                  // case "EVENT_MOBS":
                                  // case "EVENT_MINI_BOSS":
                                  // case "EVENT_BOSS":
                                  case "NO_ELEMENT":
                                    {
                                      icon = <IconElementNoElement className="h-6 w-6" />;
                                      inputClass = "mt-0.5 hidden rounded px-4 py-2";
                                      labelSizeClass = "no-element basis-1/3";
                                    }
                                    break;
                                  case "LIGHT":
                                    {
                                      icon = <IconElementLight className="h-6 w-6" />;
                                      inputClass = "mt-0.5 hidden rounded px-4 py-2";
                                      labelSizeClass = "light basis-1/3";
                                    }
                                    break;
                                  case "DARK":
                                    {
                                      (icon = <IconElementDark className="h-6 w-6" />),
                                        (inputClass = "mt-0.5 hidden rounded px-4 py-2");
                                      labelSizeClass = "dark basis-1/3";
                                    }
                                    break;
                                  case "WATER":
                                    {
                                      icon = <IconElementWater className="h-6 w-6" />;
                                      inputClass = "mt-0.5 hidden rounded px-4 py-2";
                                      labelSizeClass = "water basis-1/3";
                                    }
                                    break;
                                  case "FIRE":
                                    {
                                      icon = <IconElementFire className="h-6 w-6" />;
                                      inputClass = "mt-0.5 hidden rounded px-4 py-2";
                                      labelSizeClass = "fire basis-1/3";
                                    }
                                    break;
                                  case "EARTH":
                                    {
                                      icon = <IconElementEarth className="h-6 w-6" />;
                                      inputClass = "mt-0.5 hidden rounded px-4 py-2";
                                      labelSizeClass = "earth basis-1/3";
                                    }
                                    break;
                                  case "WIND":
                                    {
                                      icon = <IconElementWind className="h-6 w-6" />;
                                      inputClass = "mt-0.5 hidden rounded px-4 py-2";
                                      labelSizeClass = "wind basis-1/3";
                                    }
                                    break;
                                  default:
                                    break;
                                }
                                return (
                                  <label
                                    key={key + option}
                                    className={`flex ${labelSizeClass} cursor-pointer items-center justify-between gap-1 rounded-full p-2 px-4 hover:border-transition-color-20 lg:basis-auto lg:flex-row-reverse lg:justify-end lg:gap-2 lg:rounded-sm lg:hover:opacity-100 ${field.getValue() === option ? "opacity-100" : "opacity-20"} ${monsterFormState === "DISPLAY" ? " pointer-events-none border-transparent bg-transparent" : " pointer-events-auto border-transition-color-8 bg-transition-color-8"}`}
                                  >
                                    {
                                      dictionary.db.enums[
                                        (key.charAt(0).toLocaleUpperCase() + key.slice(1)) as keyof typeof $Enums
                                      ][option as keyof (typeof $Enums)[keyof typeof $Enums]]
                                    }
                                    <input
                                      disabled={monsterFormState === "DISPLAY"}
                                      id={field.name + option}
                                      name={field.name}
                                      value={option}
                                      checked={field.getValue() === option}
                                      type="radio"
                                      onBlur={field.handleBlur}
                                      onChange={(e) => field.handleChange(e.target.value)}
                                      className={inputClass}
                                    />
                                    {icon}
                                  </label>
                                );
                              })}
                          </div>
                        </fieldset>
                      );
                    }}
                  </form.Field>
                );
              }

              case ZodFirstPartyTypeKind.ZodNumber: {
                return (
                  <form.Field
                    key={key}
                    name={key as keyof Monster}
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: MonsterInputSchema.shape[key as keyof Monster],
                    }}
                  >
                    {(field) => {
                      const defaultFieldsetClass = "flex basis-1/2 flex-col gap-1 p-2 lg:basis-1/4";
                      const defaultInputBox = (
                        <input
                          autoComplete="off"
                          disabled={monsterFormState === "DISPLAY"}
                          id={field.name}
                          name={field.name}
                          value={typeof field.state.value !== "object" ? field.state.value : undefined}
                          type="number"
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(parseFloat(e.target.value))}
                          className={`mt-1 w-full flex-1 rounded px-4 py-2 ${monsterFormState === "DISPLAY" ? " pointer-events-none bg-transparent outline-transition-color-20" : " pointer-events-auto bg-transition-color-8"}`}
                        />
                      );
                      const fieldsetClass: string = defaultFieldsetClass;
                      const inputBox: React.ReactNode = defaultInputBox;
                      switch (key as keyof Monster) {
                        // case "radius":
                        // case "maxhp":
                        // case "physicalDefense":
                        // case "physicalResistance":
                        // case "magicalDefense":
                        // case "magicalResistance":
                        // case "criticalResistance":
                        // case "avoidance":
                        // case "dodge":
                        // case "block":
                        // case "normalAttackResistanceModifier":
                        // case "physicalAttackResistanceModifier":
                        // case "magicalAttackResistanceModifier":
                        // case "difficultyOfTank":
                        // case "difficultyOfMelee":
                        // case "difficultyOfRanged":
                        // case "possibilityOfRunningAround":

                        default:
                          break;
                      }
                      return (
                        <fieldset key={key} className={fieldsetClass}>
                          <label htmlFor={field.name} className="flex w-full flex-col gap-1">
                            <span>
                              {typeof dictionary.db.models.monster[key as keyof Monster] === "string"
                                ? (dictionary.db.models.monster[key as keyof Monster] as string)
                                : key}
                              <FieldInfo field={field} />
                            </span>
                            {inputBox}
                          </label>
                        </fieldset>
                      );
                    }}
                  </form.Field>
                );
              }
              case ZodFirstPartyTypeKind.ZodArray:
              case ZodFirstPartyTypeKind.ZodObject: {
                return key;
              }

              default: {
                return (
                  <form.Field
                    key={key}
                    name={key as keyof Monster}
                    validators={{
                      onChangeAsyncDebounceMs: 500,
                      onChangeAsync: MonsterInputSchema.shape[key as keyof Monster],
                    }}
                  >
                    {(field) => {
                      const defaultFieldsetClass = "flex basis-1/2 flex-col gap-1 p-2 lg:basis-1/4";
                      const defaultInputBox = (
                        <LineWrappingInput
                          value={field.state.value as string}
                          id={field.name}
                          name={field.name}
                          type="text"
                          onBlur={field.handleBlur}
                          readOnly={monsterFormState === "DISPLAY"}
                          autoComplete="off"
                          onChange={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            field.handleChange(target.value);
                          }}
                          className=""
                        />
                      );
                      let fieldsetClass: string = defaultFieldsetClass;
                      let inputBox: React.ReactNode = defaultInputBox;
                      switch (key as keyof Monster) {
                        // case "id":
                        // case "state":
                        case "name":
                          {
                            fieldsetClass = "flex basis-full flex-col gap-1 p-2 lg:basis-1/4";
                          }
                          break;
                        // case "monsterType":
                        // case "baseLv":
                        // case "experience":
                        case "address":
                          {
                            fieldsetClass = "flex basis-full flex-col gap-1 p-2 lg:basis-1/4";
                          }
                          break;
                        // case "element":
                        // case "updatedByUserId":
                        // case "createdByUserId":
                        // case "viewCount":
                        // case "usageCount":
                        // case "createdAt":
                        // case "updatedAt":
                        // case "usageTimestamps":
                        // case "viewTimestamps":
                        case "extraDetails":
                          {
                            inputBox = (
                              <>
                                <input id={field.name} name={field.name} className="hidden" />
                                <MDXEditor
                                  ref={mdxEditorRef}
                                  contentEditableClassName="prose"
                                  markdown={monster.extraDetails ?? ""}
                                  onBlur={field.handleBlur}
                                  onChange={(markdown) => field.handleChange(markdown)}
                                  plugins={[
                                    diffSourcePlugin(),
                                    headingsPlugin(),
                                    listsPlugin(),
                                    quotePlugin(),
                                    // linkDialogPlugin(),
                                    // imagePlugin(),
                                    tablePlugin(),
                                    thematicBreakPlugin(),
                                  ].concat(
                                    window.innerWidth < 1024
                                      ? []
                                      : [
                                          toolbarPlugin({
                                            toolbarContents: () => (
                                              <>
                                                <DiffSourceToggleWrapper>
                                                  {" "}
                                                  <UndoRedo />
                                                  <Separator />
                                                  <BoldItalicUnderlineToggles />
                                                  <BlockTypeSelect />
                                                  <CodeToggle />
                                                  <Separator />
                                                  <ListsToggle />
                                                  {/* <Separator />
                                                <CreateLink />
                                                <InsertImage /> */}
                                                  <Separator />
                                                  <InsertTable />
                                                  <InsertThematicBreak />
                                                </DiffSourceToggleWrapper>
                                              </>
                                            ),
                                          }),
                                        ],
                                  )}
                                  className={`mt-1 w-full flex-1 rounded outline-transition-color-20 ${monsterFormState === "DISPLAY" ? "display pointer-events-none" : " pointer-events-auto"} ${theme.theme === "dark" && "dark-theme dark-editor"}`}
                                />
                              </>
                            );
                            fieldsetClass = "flex basis-full flex-col gap-1 p-2";
                          }
                          break;

                        default:
                          break;
                      }
                      return (
                        <fieldset key={key} className={fieldsetClass}>
                          <label htmlFor={field.name} className="flex w-full flex-col gap-1">
                            <span>
                              {typeof dictionary.db.models.monster[key as keyof Monster] === "string"
                                ? (dictionary.db.models.monster[key as keyof Monster] as string)
                                : key}
                              <FieldInfo field={field} />
                            </span>
                            {inputBox}
                          </label>
                        </fieldset>
                      );
                    }}
                  </form.Field>
                );
              }
            }
          })}
        </fieldset>
      </div>
      <div className="functionArea flex justify-end border-t-1.5 border-brand-color-1st py-3">
        <div className="btnGroup flex gap-2">
          <Button
            onClick={() => {
              setMonsterFormState("DISPLAY");
              setMonsterDialogState(!monsterDialogState);
            }}
          >
            {dictionary.ui.close} [Esc]
          </Button>
          {monsterFormState == "DISPLAY" &&
            session?.user.id === monster.createdByUserId &&
            (monster.id.endsWith("*") ? (
              <Button disabled>{dictionary.ui.monster.canNotModify}</Button>
            ) : (
              <Button
                onClick={() => {
                  // 如果处于所有星级都展示的状态，则一星怪物名称后面会附加额外字段，进入编辑状态前去除
                  if (monster.monsterType === "COMMON_BOSS" && augmented) {
                    const name = monster.name;
                    const lastIndex = name.lastIndexOf(" ");
                    const result = lastIndex !== -1 ? name.substring(0, lastIndex) : name;
                    setMonster({
                      ...monster,
                      name: result,
                    });
                  }
                  setMonsterFormState("UPDATE");
                }}
              >
                {dictionary.ui.modify} [Enter]
              </Button>
            ))}
          {monsterFormState !== "DISPLAY" && (
            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit]) => (
                <Button type="submit" level="primary" disabled={!(canSubmit && !dataUploadingState)}>
                  {dataUploadingState ? dictionary.ui.upload + "..." : dictionary.ui.upload + " [Enter]"}
                </Button>
              )}
            </form.Subscribe>
          )}
        </div>
      </div>
    </form>
  );
}
