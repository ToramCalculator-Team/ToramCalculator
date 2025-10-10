import { createEffect, createMemo, createResource, createSignal, JSX, onMount, ParentProps, Show } from "solid-js";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";
import { useNavigate } from "@solidjs/router";

// 此页面仅作为中转

export default function CharacterIndexPage(props: ParentProps) {
  // 导航
  const navigate = useNavigate();

  if (store.session.account?.player?.character?.id) {
    navigate(`/character/${store.session.account?.player?.character?.id}`);
  } else {
    navigate(`/character/create`);
  }

  onMount(() => {
    console.log("--CharacterIndexPage Render");

    return () => {
      console.log("--CharacterIndexPage Unmount");
    };
  });

  return <></>;
}
