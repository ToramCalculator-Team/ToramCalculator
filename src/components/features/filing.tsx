import { A } from "@solidjs/router";
import type { JSX } from "solid-js";

export function Filing(): JSX.Element {

  return (
    <A class="Filing_info hidden lg:block fixed right-6 bottom-3 p-1 rounded-sm text-sm text-main-text-color" href="https://beian.miit.gov.cn">
      蜀ICP备2023022111号
    </A>
  )
}
