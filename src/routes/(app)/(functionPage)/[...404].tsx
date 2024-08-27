import { createEffect, createSignal } from "solid-js";
import LoadingBox from "~/components/loadingBox";
import { getDictionary } from "~/i18n";
import { store } from "~/store";

export default function Loading() {
  const [dictionary, setDictionary] = createSignal(getDictionary("en"));

  createEffect(() => {
    setDictionary(getDictionary(store.settings.language));
  });

  return (
    <div onclick={() => history.back()} class="LoadingPage fixed left-0 top-0 z-20 flex h-dvh w-dvw items-center justify-center bg-aeskl bg-cover bg-center">
      <div class="LoadingMask fixed left-0 top-0 h-full w-full bg-gradient-to-t from-primary-color from-10% to-primary-color-0 to-25% lg:from-5% lg:to-[25%]"></div>
      <div class="LoadingState fixed bottom-[2%] left-[4dvw] flex flex-col gap-3 lg:left-[10dvw] lg:top-[97%] lg:-translate-y-full">
        <h1 class="animate-pulse">{dictionary().ui.errorPage.tips}</h1>
        <LoadingBox class="w-[92dvw] lg:w-[80dvw]" />
      </div>
    </div>
  );
}
