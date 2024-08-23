import { JSX } from "solid-js";
import { Keyframes } from "./keyframes";

export default function RandomBallBackground() {
  const balls: JSX.Element[] = [];
  // 背景随机动画
  const numBalls = 10;

  for (let i = 0; i < numBalls; i++) {
    const keyFramesName = "randomMove" + i;
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
            "background-color": `rgb(var(--brand-${i % 3 === 0 ? "3rd" : i % 3 === 1 ? "2nd" : "1st"}))`,
            width: `${Math.random() > 0.8 ? 3 : Math.random() * 2}vw`,
            top: `${Math.random() * 100}vh`,
            left: `${Math.random() * 100}vw`,
            transform: `scale(${Math.random()})`,
            "animation-name": keyFramesName,
            "animation-duration": `${(Math.random() + 1) * 30000}ms`,
            "animation-delay": `${Math.random() * 300}ms`,
            "animation-direction": "alternate",
            "animation-fill-mode": "both",
            "animation-iteration-count": "infinite",
            "animation-timing-function": "ease-in-out",
          }}
        ></div>
      </>
    );

    balls.push(ball);
  }

  return (
    <div class="Background fixed -z-10 h-dvh w-dvw">
      <div class="Balls -z-10">{balls}</div>
      <div class="Mask -z-10 h-dvh w-dvw backdrop-blur-none dark:backdrop-blur-sm"></div>
    </div>
  );
}
