import { Component, For } from 'solid-js';
import { DefaultNodeArgument } from './DefaultNode';

export type DefaultNodeGuardTagProps = {
  type: 'while' | 'until';
  condition: string;
  args: DefaultNodeArgument[];
  succeedOnAbort: boolean;
};

export const DefaultNodeGuardTag: Component<DefaultNodeGuardTagProps> = (props) => {
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
    <div class="flex flex-row m-0.5 text-xs border border-[#be2f5f] bg-white rounded-md">
      <div class="flex flex-col justify-center px-1.5 py-1 text-white bg-[#be2f5f] rounded-l-md">
        <p class="m-0">{props.type}</p>
      </div>
      <div class="flex flex-row items-baseline px-1.5 py-1">
        <p class="m-0">{props.condition}</p>
        <For each={props.args}>{(arg, index) => getArgument(arg, index())}</For>
      </div>
      <div class="flex flex-col justify-center px-1.5 py-1 text-white bg-[#be2f5f] rounded-r-md">
        <p class="m-0">{`then ${props.succeedOnAbort ? 'succeed' : 'fail'}`}</p>
      </div>
    </div>
  );
};

