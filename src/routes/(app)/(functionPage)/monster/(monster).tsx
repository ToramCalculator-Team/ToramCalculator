import Button from "~/components/button";
import * as Icon from "~/components/icon";
import Dialog from "~/components/dialog";
import { setStore, store } from "~/store";
import { type SelectMonster, defaultSelectMonster, testMonsterQueryData } from "~/schema/monster";
import { createEffect, createMemo, createSignal, For, onMount } from "solid-js";
import { getDictionary } from "~/i18n";
import * as _ from "lodash-es";
import Fuse from "fuse.js";
import { generateAugmentedMonsterList } from "~/lib/untils/generateAugmentedMonsterList";

export default function MonsterCategoryViewPage() {

  /**
   * @页面逻辑 获取原始数据，并根据配置生成分类数据
   **/
  
  /**
   * @表类型配置
   * key: 需要分类的字段
   * value: 展示的顺序
   */
  const tableTypeConfig: Record<keyof Pick<SelectMonster, "monsterType" | "element">, number> = {
    element: 1,
    monsterType: 2,
  };

  

  // 状态管理参数
  const { monsterDialogState } = store.monsterPage;
  const { monster } = store;
  const setMonsterDialogState = (newState: boolean): void => {
    setStore("monsterPage", {
      monsterDialogState: newState,
    });
  };
  const [dictionary, setDictionary] = createSignal(getDictionary("en"));

  // table原始数据
  const [rawMonsterList] = createSignal<SelectMonster[]>(testMonsterQueryData ?? []);

  // 搜索使用的基准列表
  let actualList = generateAugmentedMonsterList(rawMonsterList(), dictionary());

  // 搜索框行为函数
  // 定义搜索时需要忽略的数据
  const monsterSearchHiddenData: Array<keyof SelectMonster> = [
    "id",
    "experience",
    "radius",
    "difficultyOfMelee",
    "difficultyOfRanged",
    "difficultyOfTank",
    "updatedAt",
    "updatedByUserId",
    "createdAt",
    "createdByUserId",
  ];

  // 搜索
  const searchMonster = (value: string, list: SelectMonster[]) => {
    const fuse = new Fuse(list, {
      keys: Object.keys(defaultSelectMonster).filter(
        (key) => !monsterSearchHiddenData.includes(key as keyof SelectMonster),
      ),
    });
    return fuse.search(value).map((result) => result.item);
  };

  const handleSearchChange = (key: string) => {
    if (key === "" || key === null) {
      console.log(actualList);
    } else {
      console.log(searchMonster(key, actualList));
    }
  };

  onMount(() => {
    console.log("--Monster Client Render");
    // u键监听
    const handleUKeyPress = (e: KeyboardEvent) => {
      if (e.key === "u") {
        setStore("monsterPage", {
          monsterDialogState: true,
          monsterFormState: "CREATE",
        });
      }
    };
    document.addEventListener("keydown", handleUKeyPress);
    return () => {
      console.log("--Monster Client Unmount");
      document.removeEventListener("keydown", handleUKeyPress);
    };
  });

  createEffect(() => {
    setDictionary(getDictionary(store.settings.language));
  });

  return (
    <>
      <div class="Title sticky left-0 mt-3 flex flex-col gap-9 py-5 lg:pt-20">
        <div class="Row flex flex-col items-center justify-between gap-10 lg:flex-row lg:justify-start lg:gap-4">
          <h1 class="Text text-left text-3xl lg:bg-transparent lg:text-4xl">{dictionary().ui.monster.pageTitle}</h1>
          <div class="Control flex flex-1 gap-2">
            <input
              id="MonsterSearchBox"
              type="search"
              placeholder={dictionary().ui.searchPlaceholder}
              class="w-full flex-1 rounded-sm border-transition-color-20 bg-transition-color-8 px-3 py-2 backdrop-blur-xl placeholder:text-accent-color-50 hover:border-accent-color-70 hover:bg-transition-color-8 focus:border-accent-color-70 focus:outline-none lg:flex-1 lg:rounded-none lg:border-b-1.5 lg:bg-transparent lg:px-5 lg:font-normal"
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            <Button // 仅移动端显示
              size="sm"
              level="tertiary"
              icon={<Icon.Line.CloudUpload />}
              class="flex lg:hidden"
              onClick={() => {
                setStore("monster", defaultSelectMonster);
                setStore("monsterPage", {
                  monsterDialogState: true,
                  monsterFormState: "CREATE",
                });
              }}
            ></Button>
            <Button // 仅PC端显示
              level="primary"
              icon={<Icon.Line.CloudUpload />}
              class="hidden lg:flex"
              onClick={() => {
                setStore("monster", defaultSelectMonster);
                setStore("monsterPage", {
                  monsterDialogState: true,
                  monsterFormState: "CREATE",
                });
              }}
            >
              {dictionary().ui.actions.upload} [u]
            </Button>
          </div>
        </div>
        <div class="Content flex flex-col gap-2">
          <div class="Discription my-3 hidden rounded-sm bg-transition-color-8 p-3 lg:block">
            {dictionary().ui.monster.discription}
          </div>
        </div>
      </div>
      <For each={actualList}>{(monster) => monster.name}</For>
      <Dialog
        state={monsterDialogState}
        setState={(dialogState) => setStore("monsterPage", { monsterDialogState: dialogState })}
      >
        {"emmm..."}
      </Dialog>
    </>
  );
}
