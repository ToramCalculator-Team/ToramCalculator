import * as math from "mathjs";
import { type computeInput, type computeOutput, type tSkill, type FrameData } from "~/worker/evaluate.old.worker";
import { defaultMob, Mob } from "~/repositories/mob";
import { defaultCharacter, Character } from "~/repositories/character";
import { createEffect, createMemo, createSignal, JSX, onMount, Show } from "solid-js";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";
import Button from "~/components/controls/button";
import Dialog from "~/components/controls/dialog";
import { defaultSimulator, Simulator } from "~/repositories/simulator";
import { generateAugmentedMobList } from "~/lib/mob";
import { test } from "~/../test/testData";

export type skillSequenceList = {
  name: string;
  data: tSkill[];
};

export default function SimulatorIndexClient() {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));

  // const calculatorWorker = new evaluateWorker();

  // 状态管理参数
  const mobList = store.mobPage.mobList;
  const setMobList = (value: Mob[]) => setStore("mobPage", "mobList", value);
  const characterList = store.characterPage.characterList;
  const setCharacterList = (value: Character[]) => setStore("characterPage", "characterList", value);
  const analyzeList = store.simulatorPage.simulatorList;
  const setAnalyzeList = (value: Simulator[]) => setStore("simulatorPage", "simulatorList", value);
  const mob = defaultMob;
  const character = defaultCharacter;
  const simulator = defaultSimulator;

  const [dialogState, setDialogState] = createSignal(false);
  const [computeResult, setComputeResult] = createSignal<JSX.Element | null>(null);
  const [dialogFrameData, setDialogFrameData] = createSignal<FrameData | null>(null);
  const [dialogMeberIndex, setDialogMeberIndex] = createSignal<number>(0);
  const [defaultMobList] = createSignal(store.mobPage.mobList);

  function stringToColor(str: string): string {
    // 预定义的颜色数组
    const colors: string[] = [];
    // 生成 14 个颜色值
    for (let i = 0; i < 15; i++) {
      const hue = math.floor((i * (360 / 15)) % 360); // 色相值，从蓝色开始逐渐增加
      const saturation = "60%"; // 饱和度设置为 100%
      const lightness = "50%"; // 亮度设置为 50%

      // 将 HSL 颜色值转换为 CSS 格式的字符串
      const color = `hsl(${hue}, ${saturation}, ${lightness})`;

      colors.push(color);
    }
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash += str.charCodeAt(i);
    }

    // 将散列值映射到颜色数组的索引范围内
    const index = hash % colors.length;

    // 返回对应索引的颜色值
    return colors[index]!;
  }

  // function generateResultDom(frameData: FrameData[]) {
  //   const result = frameData;
  //   const lastFrameData = result.at(-1);
  //   const RemainingHp = lastFrameData ? dynamicTotalValue(lastFrameData.mobData.hp) : 0;
  //   const totalDamge = (lastFrameData?.mobData.hp.baseValue ?? 0) - RemainingHp;
  //   const totalDuration = result.length / 60;
  //   const dps = totalDamge / totalDuration;
  //   return (
  //     <>
  //       <div class="Result my-10 flex flex-col gap-4 lg:flex-row lg:items-end">
  //         <div class="DPS flex flex-col gap-2">
  //           <span class="Key py-2 text-sm">DPS</span>
  //           <span class="Value border-y-[1px] border-brand-color-1st p-4 text-6xl lg:border-none lg:p-0 lg:text-8xl lg:text-accent-color">
  //             {math.floor(math.abs(dps))}
  //           </span>
  //         </div>
  //         <div class="OtherData flex flex-1 gap-2">
  //           <div class="Duration flex flex-1 flex-col gap-1 rounded bg-area-color lg:p-4">
  //             <span class="Key p-1 text-sm text-mainText-color">总耗时</span>
  //             <span class="Value p-1 text-xl lg:text-2xl lg:text-accent-color">
  //               {math.floor(math.abs(totalDuration))} 秒
  //             </span>
  //           </div>
  //           <div class="Duration flex flex-1 flex-col gap-1 rounded bg-area-color lg:p-4">
  //             <span class="Key p-1 text-sm text-mainText-color">总伤害</span>
  //             <span class="Value p-1 text-xl lg:text-2xl lg:text-accent-color">
  //               {math.floor(math.abs(totalDamge) / 10000)} 万
  //             </span>
  //           </div>
  //           <div class="Duration flex flex-1 flex-col gap-1 rounded bg-area-color lg:p-4">
  //             <span class="Key p-1 text-sm text-mainText-color">怪物剩余HP</span>
  //             <span class="Value p-1 text-xl lg:text-2xl lg:text-accent-color">
  //               {math.floor(math.abs(RemainingHp) / 10000)}万
  //             </span>
  //           </div>
  //         </div>
  //       </div>
  //       <div class="TimeLine flex flex-col gap-4">
  //         <div class="Title border-b-2 border-brand-color-1st p-2">
  //           <span class="Key p-1">时间轴</span>
  //         </div>
  //         <div class="Content flex flex-1 flex-wrap gap-y-4 shadow-dividing-color drop-shadow-2xl">
  //           {result.map((frameData, frame) => {
  //             return (
  //               <div class={`FrameData${frame} flex flex-col justify-around gap-1`}>
  //                 {frameData.teamState.map((member, memberIndex) => {
  //                   const color = stringToColor(member?.skillData.name ?? "");
  //                   return frame === 0 ? (
  //                     <button class="MemberName p-1 text-sm">{member?.name}</button>
  //                   ) : (
  //                     <button
  //                       class={`MemberData group relative h-4 px-[1px]`}
  //                       style={{
  //                         "background-color": member ? color : "transparent",
  //                       }}
  //                       onClick={() => {
  //                         console.log("点击了队员：", member?.name, "的第：", frame, "帧");
  //                         if (member) {
  //                           setDialogFrameData(frameData);
  //                           setDialogState(true);
  //                         }
  //                       }}
  //                     >
  //                       {member ? (
  //                         <div class="absolute -left-4 bottom-14 z-10 hidden w-fit min-w-[300px] flex-col gap-2 rounded bg-primary-color p-2 text-left shadow-2xl shadow-dividing-color backdrop-blur-xl lg:group-hover:z-20 lg:group-hover:flex">
  //                           <div class="FrameAttr flex flex-col gap-1 bg-area-color p-1">
  //                             <span class="Title font-bold">队员: {member?.name}</span>
  //                             <span class="Content">
  //                               第 {math.floor(frame / 60)} 秒的第 {frame % 60} 帧
  //                               <br />
  //                             </span>

  //                             <span class="Content">
  //                               技能 {(member?.actionIndex ?? 0) + 1} {member?.skillData.name} 的第：
  //                               {member?.actionFrameIndex} / {member?.skillData.skillDuration} 帧
  //                               <br />
  //                             </span>
  //                           </div>
  //                         </div>
  //                       ) : null}
  //                     </button>
  //                   );
  //                 })}
  //               </div>
  //             );
  //           })}
  //         </div>
  //       </div>
  //     </>
  //   );
  // }

  onMount(() => {
    console.log("--ComboAnalyze Client Render");
    setMobList(generateAugmentedMobList(defaultMobList()));
    setCharacterList([defaultCharacter, defaultCharacter]);

    // calculatorWorker.onmessage = (e: MessageEvent<computeOutput>) => {
    //   const { type, computeResult } = e.data;
    //   switch (type) {
    //     case "progress":
    //       {
    //         const result = computeResult as string;
    //         setComputeResult(<div class="Result my-10 flex items-end">{result}</div>);
    //       }
    //       break;
    //     case "success":
    //       {
    //         // setComputeResult(generateResultDom(computeResult as FrameData[]));
    //         setComputeResult(<div class="Result my-10 flex items-end"></div>);
    //       }
    //       break;
    //     case "error":
    //       {
    //         setComputeResult(<div class="Result my-10 flex items-end">发生错误</div>);
    //       }
    //       break;
    //     default:
    //       break;
    //   }
    // };
    // calculatorWorker.onerror = (error) => {
    //   console.error("Worker error:", error);
    // };

    return () => {
      console.log("--ComboAnalyze Client Unmount");
      // if (calculatorWorker) {
      //   calculatorWorker.terminate();
      // }
    };
  });

  const startCompute = () => {
    setComputeResult(null);
    const workerMessage: computeInput = JSON.parse(
      JSON.stringify({
        type: "start",
        arg: {
          dictionary: dictionary(),
          team: [],
          mob: mob,
        },
      }),
    );
    // calculatorWorker.postMessage(workerMessage);
  };

  return (
    <>
      <div class="Title sticky left-0 mt-3 flex flex-col gap-9 p-3 py-5 lg:pt-12">
        <div class="Row flex flex-col items-center justify-between gap-10 lg:flex-row lg:justify-start lg:gap-4">
          <h1 class="Text text-left text-3xl lg:bg-transparent lg:text-4xl">{dictionary().ui.simulator.pageTitle}</h1>
          <div class="Control flex flex-1 gap-2">
            <input
              type="search"
              placeholder={dictionary().ui.searchPlaceholder}
              class="lg:border-b-1.5 w-full flex-1 rounded-sm border-dividing-color bg-area-color px-3 py-2 backdrop-blur-xl placeholder:text-dividing-color hover:border-mainText-color hover:bg-area-color focus:border-mainText-color focus:outline-none lg:flex-1 lg:rounded-none lg:bg-transparent lg:px-5 lg:font-normal"
            />
          </div>
        </div>
        <div class="Discription my-3 hidden rounded-sm bg-area-color p-3 lg:block">
          {dictionary().ui.simulator.description}
        </div>
      </div>
      <div class="Content flex flex-col gap-4 p-3">
        <div class="mobsConfig flex flex-col gap-4 lg:flex-row lg:items-center">
          <div class="Title flex gap-4">
            <span class="Key">怪物：</span>
            <span class="MobName font-bold">{mob.name[store.settings.language]}</span>
          </div>
          {/* <LongSearchBox dictionary={dictionary} mobList={mobList} setMob={setMob} /> */}
        </div>
        <div class="TeamConfig flex flex-col gap-4 lg:flex-row lg:items-center">
          <div class="Title flex flex-col gap-4">队伍配置：</div>
          <div class="Content flex flex-col">
            {/* {team().map((member, index) => {
              return (
                <div class="Member flex flex-col gap-4 border-b border-dividing-color p-4 lg:flex-row lg:items-center">
                  <div class="CharacterConfig flex flex-col gap-4 lg:flex-row lg:items-center">
                    <div class="Title flex gap-4">
                      <span class="Key">角色：</span>
                      <span class="CharacterName font-bold">{member.config.name}</span>
                    </div>
                  </div>
                  <div class="SkillSequence flex flex-col gap-4 lg:flex-row lg:items-center">
                    <div class="Title">流程：</div>
                    <div class="Content flex flex-wrap gap-2">
                      {member.actionQueue.map((skill, index) => {
                        return <Button size="sm">{skill.name}</Button>;
                      })}
                    </div>
                  </div>
                </div>
              );
            })} */}
          </div>
        </div>

        <Button size="sm" level="primary" onClick={startCompute}>
          开始计算
        </Button>
        <a href="./simulator/sss">configPage</a>
        {computeResult()}
      </div>
      {/* <FlowEditor /> */}
      <Dialog state={dialogState()} setState={setDialogState}>
        <div class="Content flex w-full flex-col overflow-y-auto p-2 lg:p-4">
          <div class="Title flex items-center gap-6">
            {/* <div class="h-[2px] flex-1 bg-accent-color"></div> */}
            <span class="text-lg font-bold lg:text-2xl">当前帧属性</span>
            <div class="h-[2px] flex-1 bg-accent-color"></div>
          </div>
          <div class="Content flex flex-col gap-4 overflow-y-auto">
            <div class="FrameAttr mt-4 flex flex-col gap-1 bg-area-color p-2 lg:flex-row">
              <span class="Content">
                帧信息： {math.floor((dialogFrameData()?.frame ?? 0) / 60)} 秒的第{" "}
                {(dialogFrameData()?.frame ?? 0) % 60} 帧
              </span>
            </div>
            <div class="CharacterData flex flex-col gap-1">
              <div class="Title sticky top-0 z-10 flex items-center gap-6 bg-primary-color pt-4">
                <span class="Title text-base font-bold lg:text-xl">Character</span>
                <div class="h-[1px] flex-1 bg-brand-color-1st"></div>
              </div>
              <div class="Content flex flex-wrap outline-[1px] lg:gap-1">
                <div class="Tab flex flex-wrap gap-1">
                  {dialogFrameData()?.teamState.map((member, memberIndex) => {
                    return (
                      <Button onClick={() => setDialogMeberIndex(memberIndex)} size="sm">
                        {member?.name}
                      </Button>
                    );
                  })}
                </div>
                {dialogFrameData()?.teamState.map((member, memberIndex) => {
                  return <></>;
                })}
                <div class="Title flex items-center gap-6 bg-primary-color pt-4">
                  <span class="Title text-base font-bold">Skill</span>
                  <div class="h-[1px] flex-1 bg-brand-color-1st"></div>
                </div>
                {dialogFrameData()?.teamState.map((member, memberIndex) => {
                  return <></>;
                })}
              </div>
            </div>
            <div class="MobData flex flex-col gap-1">
              <div class="Title sticky top-0 z-10 flex items-center gap-6 bg-primary-color pt-4">
                <span class="Title text-base font-bold lg:text-xl">Mob</span>
                <div class="h-[1px] flex-1 bg-brand-color-1st"></div>
              </div>
              <div class="Content flex flex-wrap outline-[1px] lg:gap-1">
                {/* {dialogFrameData() ? (
                  <ObjectRenderer dictionary={dictionary()} data={dialogFrameData()?.mobData} display />
                ) : null} */}
              </div>
            </div>
          </div>
          <div class="FunctionArea flex flex-col justify-end gap-4 bg-primary-color">
            <div class="h-[1px] flex-none bg-brand-color-1st"></div>
            <div class="btnGroup flex gap-2">
              <Button
                onClick={() => {
                  setDialogState(false);
                }}
              >
                {dictionary().ui.actions.close} [Esc]
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
}
