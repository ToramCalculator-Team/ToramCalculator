import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { LoadingBar } from "~/components/controls/loadingBar";
import { getDictionary } from "~/locales/i18n";
import { store } from "~/store";

export default function Loading() {
  const [dictionary, setDictionary] = createSignal(getDictionary("en"));
  const [loadingPageRef, setLoadingPageRef] = createSignal<HTMLDivElement | null>(null);
  
  let img1Ref: HTMLDivElement
  let img2Ref: HTMLDivElement
  let img3Ref: HTMLDivElement

  const bgParallaxFn = (event: MouseEvent) => {
    const speed = 0.02;
    const offsetX = event.pageX * speed;
    const offsetY = event.pageY * speed;
    img1Ref!.style.transform = `translateX(${offsetX * 0.125}px) translateY(${offsetY * 0.125}px)`;
    img2Ref!.style.transform = `translateX(${offsetX * 0.25}px) translateY(${offsetY * 0.25}px)`;
    img3Ref!.style.transform = `translateX(${offsetX * 0.5}px) translateY(${offsetY * 0.5}px)`;
  }
  
  onMount(() => {
    loadingPageRef()?.addEventListener('mousemove', bgParallaxFn);
  })

  onCleanup(() => {
    loadingPageRef()?.removeEventListener('mousemove', bgParallaxFn);
  })

  createEffect(() => {
    setDictionary(getDictionary(store.settings.userInterface.language));
  });

  return (
    <div
      ref={setLoadingPageRef}
      onclick={() => history.back()}
      class="LoadingPage fixed left-0 top-0 flex h-dvh w-dvw items-center justify-center bg-aeskl bg-cover bg-center"
    >
      <div
        class="hidden lg:block absolute h-full w-full bg-cover bg-bottom bg-no-repeat"
        style={{ "background-image": "url(/app-image/404/0.png)" }}
      ></div>
      <div
        ref={img1Ref!}
        class="hidden lg:block absolute h-full w-full bg-contain bg-bottom bg-no-repeat"
        style={{ "background-image": "url(/app-image/404/1.png)","transition": "all 0s" }}
      ></div>
      <div
        ref={img2Ref!}
        class="hidden lg:block absolute h-full w-full bg-contain bg-bottom bg-no-repeat"
        style={{ "background-image": "url(/app-image/404/2.png)","transition": "all 0s" }}
      ></div>
      <div
        ref={img3Ref!}
        class="hidden lg:block absolute h-full w-full bg-contain bg-bottom bg-no-repeat blur-[2px]"
        style={{ "background-image": "url(/app-image/404/3.png)","transition": "all 0s" }}
      ></div>
      <div class="LoadingMask1 fixed left-0 top-0 h-full w-full bg-linear-to-t from-primary-color from-10% to-primary-color-0 to-25% lg:from-5% lg:to-25%"></div>
      <div class="LoadingMask1 fixed left-0 top-0 h-full w-full bg-linear-to-b from-primary-color from-5% to-primary-color-0 to-20% lg:from-5% lg:to-25%"></div>
      <div class="LoadingState fixed h-fit bottom-[calc(2%+67px)] left-[4dvw] flex flex-col gap-3 lg:left-[10dvw] lg:top-[97%] lg:-translate-y-full">
        <h1 class="animate-pulse">{dictionary().ui.errorPage.tips}</h1>
        <LoadingBar class="w-[92dvw] lg:w-[80dvw]" />
      </div>
    </div>
  );
}
