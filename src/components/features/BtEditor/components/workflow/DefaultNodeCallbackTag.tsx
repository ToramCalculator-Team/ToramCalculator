import { Component, For } from 'solid-js';
import { DefaultNodeArgument } from './DefaultNode';

export type DefaultNodeCallbackTagProps = {
  type: 'entry' | 'exit' | 'step';
  functionName: string;
  args: DefaultNodeArgument[];
};

export const DefaultNodeCallbackTag: Component<DefaultNodeCallbackTagProps> = (props) => {
  const getArgument = (arg: DefaultNodeArgument, index: number) => {
    if (typeof arg === 'string') {
      return <p class="default-node-argument string">{`"${arg}"`}</p>;
    } else if (typeof arg === 'number') {
      return <p class="default-node-argument number">{arg}</p>;
    } else if (typeof arg === 'boolean') {
      return <p class="default-node-argument boolean">{arg ? 'true' : 'false'}</p>;
    } else if (arg === null || arg === undefined) {
      return <p class="default-node-argument null">{arg === null ? 'null' : 'undefined'}</p>;
    } else if (typeof arg === 'object' && Object.keys(arg).length === 1 && Object.prototype.hasOwnProperty.call(arg, '$')) {
      return <p class="default-node-argument agent-property-reference">{arg['$']}</p>;
    } else {
      return <p class="default-node-argument unknown">{JSON.stringify(arg)}</p>;
    }
  };

  return (
    <div class="flex flex-row m-0.5 text-xs border border-[#3137ac] bg-white rounded">
      <div class="flex flex-col justify-center px-1.5 py-1 text-white bg-[#3137ac] rounded-l">
        <p class="m-0">{props.type}</p>
      </div>
      <div class="flex flex-row items-baseline px-1.5 py-1">
        <p class="m-0">{props.functionName}</p>
        <For each={props.args}>{(arg, index) => getArgument(arg, index())}</For>
      </div>
    </div>
  );
};

