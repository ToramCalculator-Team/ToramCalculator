import { JSX } from "solid-js";
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
  const balls: JSX.Element[] = [];
  // 背景随机动画
  const numBalls = 10;

  for (let i = 0; i < numBalls; i++) {
    const keyFramesName = "randomMove" + i;
    const color = `rgb(var(--brand-${i % 3 === 0 ? "3rd" : i % 3 === 1 ? "2nd" : "1st"}))`;
    const size = Math.random();
    const ball = (
      <>
        <Keyframes
          name={keyFramesName}
          from={{ transform: "translate(0, 0)" }}
          to={{
            transform: `translate(${Math.random() * (i % 2 === 0 ? -24 : 24)}rem, ${Math.random() * (i % 2 === 0 ? -24 : 24)}rem)`,
          }}
        />
        <div
          class={`Bll absolute aspect-square rounded-full`}
          style={{
            "background-color": color,
            width: `${Math.random() > 0.8 ? 3 : Math.random() * 2}vw`,
            top: `${Math.random() * 100}vh`,
            left: `${Math.random() * 100}vw`,
            transform: `scale(${size})`,
            "animation-name": keyFramesName,
            "animation-duration": `${(Math.random() + 1) * 30000}ms`,
            "animation-delay": `${Math.random() * 300}ms`,
            "animation-direction": "alternate",
            "animation-fill-mode": "both",
            "animation-iteration-count": "infinite",
            "animation-timing-function": "ease-in-out",
            filter: store.theme === "dark" ? `drop-shadow(0 0 ${size * 10}px ${color})` : "",
          }}
        ></div>
      </>
    );

    balls.push(ball);
  }

  return (
    <Motion.div
      animate={{ opacity: [0, 1] }}
      transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 2 : 0 }}
      class="Background fixed -z-10 h-dvh w-dvw opacity-0"
    >
      <div class="Balls -z-10">{balls}</div>
    </Motion.div>
  );
}
