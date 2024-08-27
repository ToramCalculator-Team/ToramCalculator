import { JSX } from "solid-js";

export default function LoadingBox(props: JSX.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} class={`Loading relative overflow-x-hidden ${{ ...props }.class}`}>
      <div class="line z-0 h-0.5 w-full bg-accent-color rounded-full"></div>
      <div class="break dot1 absolute top-0 z-10 h-0.5 w-1 bg-primary-color"></div>
      <div class="break dot2 absolute top-0 z-10 h-0.5 w-1 bg-primary-color"></div>
      <div class="break dot3 absolute top-0 z-10 h-0.5 w-1 bg-primary-color"></div>
    </div>
  );
}
