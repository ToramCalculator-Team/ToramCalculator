import { Component, For, Show } from "solid-js";
import { State, NodeDetails } from "mistreevous";
import { DefaultNodeGuardTag } from "./DefaultNodeGuardTag";
import { DefaultNodeCallbackTag } from "./DefaultNodeCallbackTag";
import Icons from "../../../../icons";

export type DefaultNodeArgument = string | number | boolean | null | { $: string };

export type DefaultNodeProps = {
  id: string;
  caption: string;
  type: string;
  state: State;
  args: DefaultNodeArgument[];
  whileGuard?: NodeDetails["while"];
  untilGuard?: NodeDetails["until"];
  entryCallback?: NodeDetails["entry"];
  stepCallback?: NodeDetails["step"];
  exitCallback?: NodeDetails["exit"];
};

export const DefaultNode: Component<DefaultNodeProps> = (props) => {
  const getStateClasses = () => {
    switch (props.state) {
      case State.RUNNING:
        return "border-[#0388fc]";
      case State.SUCCEEDED:
        return "border-[#02c93e] bg-[#d1ffde]";
      case State.FAILED:
        return "border-[#e63b02] bg-[#ffe5e5]";
      default:
        return "border-[#868686]";
    }
  };

  const getIcon = (nodeType: string) => {
    return {
      action: <Icons.Outline.Edit class="text-primary-color flex-none rounded-md h-6 w-6 bg-[#3772ff] p-1" />,
      condition: <Icons.Outline.Filter class="text-primary-color flex-none rounded-md h-6 w-6 bg-[#eac435] p-1" />,
      fail: <Icons.Outline.Close class="text-primary-color flex-none rounded-md h-6 w-6 bg-[#e40066] p-1" />,
      flip: <Icons.Outline.Swap class="text-primary-color flex-none rounded-md h-6 w-6 bg-[#f29e4c] p-1" />,
      lotto: <Icons.Outline.Coins class="text-primary-color flex-none rounded-md h-6 w-6 bg-[#83e377] p-1" />,
      parallel: <Icons.Outline.Category2 class="text-primary-color flex-none rounded-md h-6 w-6 bg-[#0db39e] p-1" />,
      race: <Icons.Outline.Category2 class="text-primary-color flex-none rounded-md h-6 w-6 bg-[#16db93] p-1" />,
      all: <Icons.Outline.Category2 class="text-primary-color flex-none rounded-md h-6 w-6 bg-[#16db93] p-1" />,
      repeat: <Icons.Outline.Loading class="text-primary-color flex-none rounded-md h-6 w-6 bg-[#6c91bf] p-1" />,
      retry: <Icons.Outline.Loading class="text-primary-color flex-none rounded-md h-6 w-6 bg-[#a14ebf] p-1" />,
      root: <Icons.Outline.Home class="text-primary-color flex-none rounded-md h-6 w-6 bg-[rgb(99,98,104)] p-1" />,
      selector: <Icons.Outline.Category class="text-primary-color flex-none rounded-md h-6 w-6 bg-[#54478c] p-1" />,
      sequence: <Icons.Outline.Box2 class="text-primary-color flex-none rounded-md h-6 w-6 bg-[#e40066] p-1" />,
      succeed: <Icons.Outline.Flag class="text-primary-color flex-none rounded-md h-6 w-6 bg-[rgb(0,190,32)] p-1" />,
      wait: <Icons.Outline.Calendar class="text-primary-color flex-none rounded-md h-6 w-6 bg-[#826aed] p-1" />,
    }[nodeType];
  };

  const getArgument = (arg: DefaultNodeArgument, index: number) => {
    if (typeof arg === "string") {
      return (
        <p class="m-0 mx-0.5 rounded-md bg-area-color px-1.5 text-xs leading-[26px] font-semibold text-[#d80085]">{`"${arg}"`}</p>
      );
    } else if (typeof arg === "number") {
      return (
        <p class="m-0 mx-0.5 rounded-md bg-area-color px-1.5 text-xs leading-[26px] font-semibold text-[#29c29c]">{arg}</p>
      );
    } else if (typeof arg === "boolean") {
      return (
        <p class="m-0 mx-0.5 rounded-md bg-area-color px-1.5 text-xs leading-[26px] font-semibold text-[#902fff]">
          {arg ? "true" : "false"}
        </p>
      );
    } else if (arg === null || arg === undefined) {
      return (
        <p class="m-0 mx-0.5 rounded-md bg-area-color px-1.5 text-xs leading-[26px] font-semibold text-[#517075]">
          {arg === null ? "null" : "undefined"}
        </p>
      );
    } else if (
      typeof arg === "object" &&
      Object.keys(arg).length === 1 &&
      Object.prototype.hasOwnProperty.call(arg, "$")
    ) {
      return (
        <p class="m-0 mx-0.5 rounded-md bg-area-color px-1.5 text-xs leading-[26px] font-semibold text-[#009fc7]">
          {arg["$"]}
        </p>
      );
    } else {
      return (
        <p class="m-0 mx-0.5 rounded-md bg-area-color px-1.5 text-xs leading-[26px] font-semibold text-[#ff4b5a]">
          {JSON.stringify(arg)}
        </p>
      );
    }
  };
  return (
    <div
      class={`bg-primary-color shadow-dividing-color flex flex-row items-center rounded-md p-1 whitespace-nowrap shadow ${getStateClasses()}`}
    >
      {getIcon(props.type)}
      <div class="flex flex-col">
        <div class="flex flex-row">
          <p class="m-0 mx-1.5 ml-2 leading-[26px]">{props.caption}</p>
          <For each={props.args}>{(arg, index) => getArgument(arg, index())}</For>
        </div>
        <div class="flex flex-col items-start">
          <Show when={props.whileGuard}>
            <DefaultNodeGuardTag
              type="while"
              condition={props.whileGuard!.calls}
              args={props.whileGuard!.args}
              succeedOnAbort={props.whileGuard!.succeedOnAbort}
            />
          </Show>
          <Show when={props.untilGuard}>
            <DefaultNodeGuardTag
              type="until"
              condition={props.untilGuard!.calls}
              args={props.untilGuard!.args}
              succeedOnAbort={props.untilGuard!.succeedOnAbort}
            />
          </Show>
          <Show when={props.entryCallback}>
            <DefaultNodeCallbackTag
              type="entry"
              functionName={props.entryCallback!.calls}
              args={props.entryCallback!.args}
            />
          </Show>
          <Show when={props.stepCallback}>
            <DefaultNodeCallbackTag
              type="step"
              functionName={props.stepCallback!.calls}
              args={props.stepCallback!.args}
            />
          </Show>
          <Show when={props.exitCallback}>
            <DefaultNodeCallbackTag
              type="exit"
              functionName={props.exitCallback!.calls}
              args={props.exitCallback!.args}
            />
          </Show>
        </div>
      </div>
    </div>
  );
};
