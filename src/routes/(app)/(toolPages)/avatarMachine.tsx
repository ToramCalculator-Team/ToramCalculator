import { createEffect, createMemo, createResource, createSignal, For, Index, onMount, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { Motion, Presence } from "solid-motionone";
import { Card } from "~/components/containers/card";
import { Button } from "~/components/controls/button";
import { SchemaFlattener } from "~/components/features/simulator/core/dataSys/SchemaTypes";
import { PlayerAttrType } from "~/components/features/simulator/core/member/player/Player";
import Icons from "~/components/icons";
import { store } from "~/store";

// 能力值【1~10】
// 能力值【1%~3%】
// 体力值【100，200...1000】
// 体力值【5%，10%，15%】
// 魔法值【10，20...100】
// 武器攻击【3，6...30】
// 武器攻击【1%~3%】
// 物理/魔法攻击力【3，6...30】
// 物理/魔法攻击力【1%~3%】
// 稳定率【1%~3%】
// 命中/回避【3，6...30】
// 命中/回避【1%~3%】
// 物理/魔法防御【10，20...100】
// 物理/魔法防御【1%~5%】
// 攻速/咏速【10，20...100】
// 攻速/咏速【1%~10%】
// 体力值自回【10，20...100】
// 魔法值自回【1，2...10】
// 体力值/魔法值自回【5%，10%...25%】
// 攻回【1，2...10】
// 暴击率/爆伤【1~5】
// 暴击率/爆伤【1%~3%】
// 异常抗性【1%~10%】
// 格挡回复/格挡力/闪躲回复【1%~3%】
// 物理/魔法抗性【1%~10%】
// 物理/魔法贯穿【1%~10%】
// 对属【1%~3%】
// 仇恨值增加/减少【1%~10%】
// 属抗【1%~10%】
// 近/远威力【1%~3%】
// 识破/破防【1%~3%】
// 物理/魔法追击【10%，20%...50%】
// 反弹伤害【5%，10%，15%】
// 物理/魔法护罩【100，200...1000】
// 物理/魔法护罩【1%~10%】
// 护罩速度【3%，6%...15%】

const attrsMap = {
  // 基础能力值【1~10】【1%~3%】
  str: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "1%", "2%", "3%"],
  int: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "1%", "2%", "3%"],
  vit: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "1%", "2%", "3%"],
  agi: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "1%", "2%", "3%"],
  dex: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "1%", "2%", "3%"],
  // 体力值【100~1000】【5%，10%，15%】
  "hp.max": ["100", "200", "300", "400", "500", "600", "700", "800", "900", "1000", "5%", "10%", "15%"],
  // 魔法值【10~100】
  "mp.max": ["10", "20", "30", "40", "50", "60", "70", "80", "90", "100"],
  // 武器攻击【3~30】【1%~3%】
  "weaponAtk.p": ["3", "6", "9", "12", "15", "18", "21", "24", "27", "30", "1%", "2%", "3%"],
  // 物理/魔法攻击力【3~30】【1%~3%】
  "atk.p": ["3", "6", "9", "12", "15", "18", "21", "24", "27", "30", "1%", "2%", "3%"],
  "atk.m": ["3", "6", "9", "12", "15", "18", "21", "24", "27", "30", "1%", "2%", "3%"],
  // 稳定率【1%~3%】
  "stab.p": ["1%", "2%", "3%"],
  // 命中/回避【3~30】【1%~3%】
  accuracy: ["3", "6", "9", "12", "15", "18", "21", "24", "27", "30", "1%", "2%", "3%"],
  avoid: ["3", "6", "9", "12", "15", "18", "21", "24", "27", "30", "1%", "2%", "3%"],
  // 物理/魔法防御【10~100】【1%~5%】
  "def.p": ["10", "20", "30", "40", "50", "60", "70", "80", "90", "100", "1%", "2%", "3%", "4%", "5%"],
  "def.m": ["10", "20", "30", "40", "50", "60", "70", "80", "90", "100", "1%", "2%", "3%", "4%", "5%"],
  // 攻速/咏速【10~100】【1%~10%】
  aspd: [
    "10",
    "20",
    "30",
    "40",
    "50",
    "60",
    "70",
    "80",
    "90",
    "100",
    "1%",
    "2%",
    "3%",
    "4%",
    "5%",
    "6%",
    "7%",
    "8%",
    "9%",
    "10%",
  ],
  cspd: [
    "10",
    "20",
    "30",
    "40",
    "50",
    "60",
    "70",
    "80",
    "90",
    "100",
    "1%",
    "2%",
    "3%",
    "4%",
    "5%",
    "6%",
    "7%",
    "8%",
    "9%",
    "10%",
  ],
  // 体力值自回【10~100】
  "hp.recovery": ["10", "20", "30", "40", "50", "60", "70", "80", "90", "100", "5%", "10%", "15%"],
  // 魔法值自回【1~10】
  "mp.recovery": ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "5%", "10%", "15%"],
  // 攻回【1~10】
  "mp.atkRegen": ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  // 暴击率/爆伤【1~5】【1%~3%】
  "c.rate.p": ["1", "2", "3", "4", "5", "1%", "2%", "3%"],
  "c.dmg.p": ["1", "2", "3", "4", "5", "1%", "2%", "3%"],
  // 异常抗性【1%~10%】
  antiVirus: ["1%", "2%", "3%", "4%", "5%", "6%", "7%", "8%", "9%", "10%"],
  // 格挡回复/格挡力/闪躲回复【1%~3%】
  "guard.recharge": ["1%", "2%", "3%"],
  "guard.power": ["1%", "2%", "3%"],
  "dodge.recharge": ["1%", "2%", "3%"],
  // 物理/魔法抗性【1%~10%】
  "red.p": ["1%", "2%", "3%", "4%", "5%", "6%", "7%", "8%", "9%", "10%"],
  "red.m": ["1%", "2%", "3%", "4%", "5%", "6%", "7%", "8%", "9%", "10%"],
  // 物理/魔法贯穿【1%~10%】
  "pie.p": ["1%", "2%", "3%", "4%", "5%", "6%", "7%", "8%", "9%", "10%"],
  "pie.m": ["1%", "2%", "3%", "4%", "5%", "6%", "7%", "8%", "9%", "10%"],
  // 对属性增强【1%~3%】
  "amp.water": ["1%", "2%", "3%"],
  "amp.fire": ["1%", "2%", "3%"],
  "amp.earth": ["1%", "2%", "3%"],
  "amp.wind": ["1%", "2%", "3%"],
  "amp.light": ["1%", "2%", "3%"],
  "amp.dark": ["1%", "2%", "3%"],
  "amp.normal": ["1%", "2%", "3%"],
  // 属性伤害减轻【1%~10%】
  "red.water": ["1%", "2%", "3%", "4%", "5%", "6%", "7%", "8%", "9%", "10%"],
  "red.fire": ["1%", "2%", "3%", "4%", "5%", "6%", "7%", "8%", "9%", "10%"],
  "red.earth": ["1%", "2%", "3%", "4%", "5%", "6%", "7%", "8%", "9%", "10%"],
  "red.wind": ["1%", "2%", "3%", "4%", "5%", "6%", "7%", "8%", "9%", "10%"],
  "red.light": ["1%", "2%", "3%", "4%", "5%", "6%", "7%", "8%", "9%", "10%"],
  "red.dark": ["1%", "2%", "3%", "4%", "5%", "6%", "7%", "8%", "9%", "10%"],
  "red.normal": ["1%", "2%", "3%", "4%", "5%", "6%", "7%", "8%", "9%", "10%"],
  // 仇恨值增加/减少【1%~10%】
  "aggro.rate": [
    "1%",
    "2%",
    "3%",
    "4%",
    "5%",
    "6%",
    "7%",
    "8%",
    "9%",
    "10%",
    "-1%",
    "-2%",
    "-3%",
    "-4%",
    "-5%",
    "-6%",
    "-7%",
    "-8%",
    "-9%",
    "-10%",
  ],
  // 近距离/远距离威力【1%~3%】
  "distanceDmg.short": ["1%", "2%", "3%"],
  "distanceDmg.long": ["1%", "2%", "3%"],
  // 识破/破防【1%~3%】
  anticipate: ["1%", "2%", "3%"],
  guardBreak: ["1%", "2%", "3%"],
  // 物理/魔法追击【10%~50%】
  "pursuit.rate.p": ["10%", "20%", "30%", "40%", "50%"],
  "pursuit.rate.m": ["10%", "20%", "30%", "40%", "50%"],
  // 反弹伤害【5%，10%，15%】
  reflect: ["5%", "10%", "15%"],
  // 物理/魔法护罩【100~1000】【1%~10%】
  "barrier.p": [
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
    "1000",
    "1%",
    "2%",
    "3%",
    "4%",
    "5%",
    "6%",
    "7%",
    "8%",
    "9%",
    "10%",
  ],
  "barrier.m": [
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
    "1000",
    "1%",
    "2%",
    "3%",
    "4%",
    "5%",
    "6%",
    "7%",
    "8%",
    "9%",
    "10%",
  ],
  // 护罩速度【3%，6%...15%】
  "barrier.recharge": ["3%", "6%", "9%", "12%", "15%"],
} satisfies Partial<Record<PlayerAttrType, string[]>>;

const attrDisplayNames: Record<keyof typeof attrsMap, string> = {
  str: "力量",
  int: "智力",
  vit: "体力",
  agi: "敏捷",
  dex: "灵巧",
  "hp.max": "体力值",
  "mp.max": "魔法值",
  "weaponAtk.p": "武器攻击",
  "atk.p": "物理攻击",
  "atk.m": "魔法攻击",
  "stab.p": "稳定率",
  accuracy: "命中",
  avoid: "回避",
  "def.p": "物理防御",
  "def.m": "魔法防御",
  aspd: "攻速",
  cspd: "咏速",
  "hp.recovery": "体力值自回",
  "mp.recovery": "魔法值自回",
  "mp.atkRegen": "攻回",
  "c.rate.p": "暴击率",
  "c.dmg.p": "爆伤",
  antiVirus: "异常抗性",
  "guard.recharge": "格挡回复",
  "guard.power": "格挡力",
  "dodge.recharge": "闪躲回复",
  "red.p": "物理抗性",
  "red.m": "魔法抗性",
  "pie.p": "物理贯穿",
  "pie.m": "魔法贯穿",
  "amp.water": "对水属性增强",
  "amp.fire": "对火属性增强",
  "amp.earth": "对地属性增强",
  "amp.wind": "对风属性增强",
  "amp.light": "对光属性增强",
  "amp.dark": "对暗属性增强",
  "amp.normal": "对无属性增强",
  "red.water": "水属性伤害减轻",
  "red.fire": "火属性伤害减轻",
  "red.earth": "地属性伤害减轻",
  "red.wind": "风属性伤害减轻",
  "red.light": "光属性伤害减轻",
  "red.dark": "暗属性伤害减轻",
  "red.normal": "无属性伤害减轻",
  "aggro.rate": "仇恨值增加",
  "distanceDmg.short": "近距离威力",
  "distanceDmg.long": "远距离威力",
  anticipate: "识破",
  guardBreak: "破防",
  "pursuit.rate.p": "物理追击",
  "pursuit.rate.m": "魔法追击",
  reflect: "反弹伤害",
  "barrier.p": "物理护罩",
  "barrier.m": "魔法护罩",
  "barrier.recharge": "护罩速度",
};

type AttrType = keyof typeof attrsMap;
type AttrValue<T extends AttrType> = (typeof attrsMap)[T][number];

export default function AvatarMachinePage() {
  const [animationEnabled, setAnimationEnabled] = createSignal(false); // 控制动画是否启用
  const [displayHistory, setDisplayHistory] = createSignal(false); // 控制是否显示历史记录
  const [history, setHistory] = createSignal<
    Record<
      Postion,
      {
        attrType: AttrType;
        attrValue: AttrValue<AttrType>;
      }
    >[]
  >([]);
  const [attrs, setAttrs] = createSignal<
    Record<
      Postion,
      {
        attrType: AttrType;
        attrValue: AttrValue<AttrType>;
      }
    >
  >();

  type Postion = "A" | "B" | "C";

  /**
   * 时装属性生成器
   * 根据时间戳，随机生成3条属性
   * 第一条必定生成，第二条有50%概率生成，第三条有25%概率生成
   * 每个属性从可选属性里随机选择
   *
   * @param timeStamp
   * @returns
   */
  const generateAttrs = (
    timeStamp: number,
  ): Record<
    Postion,
    {
      attrType: AttrType;
      attrValue: AttrValue<AttrType>;
    }
  > => {
    // 使用时间戳作为随机种子
    let seed = timeStamp;

    // 简单的线性同余生成器，确保可重复的随机数
    const random = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    // 获取所有可用的属性类型
    const attrTypes = Object.keys(attrsMap) as AttrType[];

    // 生成随机属性的辅助函数
    const generateRandomAttr = (): { attrType: AttrType; attrValue: AttrValue<AttrType> } => {
      const randomAttrType = attrTypes[Math.floor(random() * attrTypes.length)];
      const availableValues = attrsMap[randomAttrType];
      const randomValue = availableValues[Math.floor(random() * availableValues.length)];

      return {
        attrType: randomAttrType,
        attrValue: randomValue as AttrValue<AttrType>,
      };
    };

    const result: Record<Postion, { attrType: AttrType; attrValue: AttrValue<AttrType> }> = {} as any;

    // 第一条属性：必定生成
    result.A = generateRandomAttr();

    // 第二条属性：50% 概率生成
    if (random() < 0.5) {
      result.B = generateRandomAttr();
    }

    // 第三条属性：25% 概率生成
    if (random() < 0.25) {
      result.C = generateRandomAttr();
    }

    console.log("Generated attrs with timestamp:", timeStamp, result);
    return result;
  };

  // 随机添加属性
  return (
    <div class="flex h-full flex-col">
      <div class="Title flex h-12 items-center justify-between px-6">
        <span class="TitleText w-full text-center text-xl font-bold">非酋测试器</span>
      </div>
      <div class="Content flex h-full flex-1 flex-col">
        <div class="AnimationArea flex h-[40dvh] w-full items-center justify-center">
          <div
            id="loadingBox"
            style={{
              transform: "none",
              position: "relative",
              left: "unset",
              bottom: "unset",
            }}
          >
            <div class="Shadow shadow-none">
              <div class="Circle"></div>
              <div class="Circle"></div>
              <div class="Circle"></div>
              <div class="Circle"></div>
              <div class="Circle"></div>
              <div class="Circle"></div>
              <div class="Circle"></div>
              <div class="Circle"></div>
              <div class="Circle"></div>
              <div class="Circle"></div>
              <div class="Circle"></div>
              <div class="Circle"></div>
              <div class="Circle"></div>
              <div class="Circle"></div>
              <div class="Circle"></div>
              <div class="Circle"></div>
            </div>
            <div id="maskElement2"></div>
            <div id="maskElement3"></div>
            <div class="line">
              <div class="Circle"></div>
              <div class="Circle"></div>
              <div class="Circle"></div>
              <div class="Circle"></div>
              <div class="Circle"></div>
              <div class="Circle"></div>
              <div class="Circle"></div>
              <div class="Circle"></div>
              <div class="Circle"></div>
              <div class="Circle"></div>
              <div class="Circle"></div>
              <div class="Circle"></div>
              <div class="Circle"></div>
              <div class="Circle"></div>
              <div class="Circle"></div>
              <div class="Circle"></div>
            </div>
          </div>
        </div>
        <div class="FunctionArea flex h-full flex-col gap-3 p-6">
          <div class="InfoArea bg-area-color flex h-full flex-col gap-2 rounded p-2">
            {/* 使用 animationKey 作为关键依赖来强制重新渲染整个列表 */}
            <Show when={attrs()} keyed>
              {(currentAttrs) => (
                <Index each={Object.values(currentAttrs)}>
                  {(attr, index) => {
                    return (
                      <Motion.div
                        animate={{
                          opacity: [0, 1],
                          transform: ["translateY(30px)", "translateY(0)"],
                        }}
                        transition={{
                          duration: animationEnabled() && store.settings.userInterface.isAnimationEnabled ? 0.7 : 0,
                          delay:
                            animationEnabled() && store.settings.userInterface.isAnimationEnabled ? index * 0.3 : 0,
                        }}
                        class="Field bg-primary-color border-dividing-color flex h-16 items-center justify-center gap-1 rounded border-1"
                      >
                        {attrDisplayNames[attr().attrType] || attr().attrType} + {attr().attrValue}
                      </Motion.div>
                    );
                  }}
                </Index>
              )}
            </Show>
          </div>
          <div class="ControlArea flex gap-1">
            <Button icon={<Icons.Outline.Chart />} onClick={() => setDisplayHistory(!displayHistory())}></Button>
            <Button
              icon={<Icons.Outline.Flag />}
              class="w-full"
              onClick={() => {
                // 启用动画
                setAnimationEnabled(true);
                // 先清空属性来触发重新渲染
                setAttrs(undefined);
                // 使用 requestAnimationFrame 确保清空后再设置新值
                requestAnimationFrame(() => {
                  const newAttrs = generateAttrs(new Date().getTime());
                  // 添加到历史记录
                  setHistory((prev) => [...prev, newAttrs]);
                  // 更新当前显示的属性
                  setAttrs(newAttrs);
                });
                // 1秒后禁用动画
                setTimeout(() => {
                  setAnimationEnabled(false);
                }, 1000);
              }}
              disabled={animationEnabled()}
            >
              再来一发
            </Button>
          </div>
        </div>
      </div>

      <Portal>
        <Presence exitBeforeEnter>
          <Show when={displayHistory()}>
            <Motion.div
              animate={{ transform: ["scale(1.05)", "scale(1)"], opacity: [0, 1] }}
              exit={{ transform: ["scale(1)", "scale(1.05)"], opacity: [1, 0] }}
              transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
              class={`DialogBG bg-primary-color-10 fixed top-0 left-0 z-40 grid h-dvh w-dvw transform place-items-center backdrop-blur`}
              onClick={() => setDisplayHistory(false)}
            >
              <Card title="属性详情" index={0} total={1} display={displayHistory()}>
                <For each={history()}>
                  {(item) => {
                    return (
                      <div class="Field bg-primary-color border-dividing-color flex h-16 flex-col items-center justify-center gap-1 rounded border-1">
                        <For each={Object.values(item)}>
                          {(item, index) => {
                            return (
                              <div
                                class={`Field bg-primary-color border-dividing-color flex h-16 items-center justify-center gap-1 ${index() === 0 ? "" : "border-t-1"}`}
                              >
                                {attrDisplayNames[item.attrType] || item.attrType} + {item.attrValue}
                              </div>
                            );
                          }}
                        </For>
                      </div>
                    );
                  }}
                </For>
              </Card>
            </Motion.div>
          </Show>
        </Presence>
      </Portal>
    </div>
  );
}
