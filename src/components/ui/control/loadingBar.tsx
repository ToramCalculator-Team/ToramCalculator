import { JSX } from "solid-js";
import { Motion } from "solid-motionone";

export function LoadingBar(props: JSX.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} class={`Loading relative overflow-x-hidden ${{ ...props }.class}`}>
      <div class="line bg-accent-color z-0 h-0.5 w-full rounded-full"></div>
      <Motion.div
        animate={{
          left: ["0", "100%"],
          transition: { duration: 5, repeat: Infinity, delay: 0.5 },
        }}
        class="Break dot1 bg-primary-color absolute top-0 z-10 h-0.5 w-1"
      ></Motion.div>
      <Motion.div
        animate={{
          left: ["0", "100%"],
          transition: { duration: 5, repeat: Infinity, delay: 1.5 },
        }}
        class="Break dot2 bg-primary-color absolute top-0 z-10 h-0.5 w-1"
      ></Motion.div>
      <Motion.div
        animate={{
          left: ["0", "100%"],
          transition: { duration: 5, repeat: Infinity, delay: 2.5 },
        }}
        class="Break dot3 bg-primary-color absolute top-0 z-10 h-0.5 w-1"
      ></Motion.div>
    </div>
  );
}
