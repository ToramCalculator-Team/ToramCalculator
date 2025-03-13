import { createEffect, createMemo, createResource } from "solid-js";

import { findMobs } from "~/repositories/mob";

export default function test3() {
  const [mobList, { refetch: refetchMobList }] = createResource(findMobs);
  
  createMemo(() => {
    console.log("Memo", mobList()?.length);
  });

  createEffect(() => {
    console.log("Effect1", mobList()?.length);
  });

  createEffect(() => {
    console.log("Effect2", mobList()?.length);
  });

  return <></>;
}
