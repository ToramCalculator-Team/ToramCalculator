import { JSX } from "solid-js";

export default function LoadingBox(props: JSX.HTMLAttributes<HTMLDivElement>) {
  return (
    <div class="LoadingPage fixed left-0 top-0 z-20 flex h-dvh w-dvw items-center justify-center bg-aeskl bg-cover bg-center">
      <div class="LoadingMask fixed left-0 top-0 h-full w-full bg-gradient-to-b from-primary-color from-10% to-primary-color-0 to-25% lg:bg-gradient-to-t lg:from-5% lg:to-[25%]"></div>
      <div class="LoadingState fixed left-[4dvw] top-[2%] flex flex-col gap-3 lg:left-[10dvw] lg:top-[97%] lg:-translate-y-full">
        <h1 class="animate-pulse">施工中...</h1>
        <LoadingBox class="w-[92dvw] lg:w-[80dvw]" />
      </div>
    </div>
  );
}
