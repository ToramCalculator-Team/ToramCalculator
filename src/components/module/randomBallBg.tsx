import { createEffect, For, JSX, onMount } from "solid-js";
import { Motion } from "solid-motionone";
import { store } from "~/store";

export const Keyframes = (props: { name: string; [key: string]: JSX.CSSProperties | string }) => {
  const toCss = (cssObject: JSX.CSSProperties | string) =>
    typeof cssObject === "string"
      ? cssObject
      : Object.keys(cssObject).reduce((accumulator, key) => {
          const cssKey = key.replace(/[A-Z]/g, (v) => `-${v.toLowerCase()}`);
          const cssValue = cssObject[key as keyof typeof cssObject]!.toString().replace("'", "");
          return `${accumulator}${cssKey}:${cssValue};`;
        }, "");

  return (
    <style>
      {`@keyframes ${props.name} {
        ${Object.keys(props)
          .map((key) => {
            return ["from", "to"].includes(key)
              ? `${key} { ${toCss(props[key] ?? "")} }`
              : /^_[0-9]+$/.test(key)
                ? `${key.replace("_", "")}% { ${toCss(props[key] ?? "")} }`
                : "";
          })
          .join(" ")}
      }`}
    </style>
  );
};

export default function RandomBallBackground() {
  // 背景随机动画
  const ballsSize = [0.33, 1.25, 0.76, 2.89, 1.13, 1.42, 0.92, 0.45, 2.54, 0.83];
  const ballsRef: HTMLDivElement[] = [];

  onMount(() => {
    createEffect(() => {
      console.log(store.theme);
      store.theme === "dark" ?
        ballsRef.forEach((ball, i) => {
          ball.style.filter = "drop-shadow(0 0 " + ballsSize[i] * 2 + "px currentcolor)";
        }) :
        ballsRef.forEach((ball, i) => {
          ball.style.filter = "drop-shadow(0 0 0px currentcolor)";
        })
    });
  });

  return (
    <Motion.div
      animate={{ opacity: [0, 1] }}
      transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 2 : 0 }}
      class="Background fixed -z-10 h-dvh w-dvw opacity-0"
    >
      <div class="Balls -z-10">
        <For each={ballsSize}>
          {(size, i) => {
            const keyFramesName = "randomMove" + i();
            const color = `rgb(var(--brand-${i() % 3 === 0 ? "3rd" : i() % 3 === 1 ? "2nd" : "1st"}))`;
            return (
              <>
                <Keyframes
                  name={keyFramesName}
                  from={{ transform: "translate(0, 0)" }}
                  to={{
                    transform: `translate(${Math.random() * (i() % 2 === 0 ? -24 : 24)}rem, ${Math.random() * (i() % 2 === 0 ? -24 : 24)}rem)`,
                  }}
                />
                <div
                  ref={(el) => (ballsRef[i()] = el!)}
                  class={`Ball absolute aspect-square rounded-full`}
                  style={{
                    color,
                    "background-color": "currentcolor",
                    width: `${size}vw`,
                    top: `${Math.random() * 100}vh`,
                    left: `${Math.random() * 100}vw`,
                    "animation-name": keyFramesName,
                    "animation-duration": `${(Math.random() + 1) * 30000}ms`,
                    "animation-delay": `${Math.random() * 300}ms`,
                    "animation-direction": "alternate",
                    "animation-fill-mode": "both",
                    "animation-iteration-count": "infinite",
                    "animation-timing-function": "ease-in-out",
                    filter: `drop-shadow(0 0 0px currentcolor)`,
                  }}
                ></div>
              </>
            );
          }}
        </For>
      </div>
    </Motion.div>
  );
}
