import { For, JSX, Show } from "solid-js";
import { Button } from "~/components/ui/control/button";

interface CardSectionProps<T> {
  title: string;
  data: T[] | undefined;
  dataRender: (item: T) => JSX.Element;
}

export function CardSection<T>(props: CardSectionProps<T>) {
  return (
    <Show when={props.data?.length}>
      <section class="FieldGroup w-full gap-2">
        <h3 class="text-accent-color flex items-center gap-2 font-bold">
          {props.title}
          <div class="Divider bg-dividing-color h-[1px] w-full flex-1" />
        </h3>
        <div class="Content flex flex-col gap-3 p-1">
          <Show when={props.data}>
            <For each={props.data}>
              {(item) => props.dataRender(item)}
            </For>
          </Show>
        </div>
      </section>
    </Show>
  );
}
