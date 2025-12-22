import { Component, Show } from 'solid-js';
import { CodeEditor, Chip, Divider, Alert, ExamplesMenu } from '../';
import { DefinitionType } from '../../types/app';

export type DefinitionTabProps = {
  definition: string;
  definitionType: DefinitionType;
  onChange(value: string): void;
  errorMessage?: string;
  readOnly: boolean;
};

export const DefinitionTab: Component<DefinitionTabProps> = (props) => {
  const mode = () => (props.definitionType === DefinitionType.JSON ? 'json' : 'mdsl');

  return (
    <div class="flex flex-col w-full h-full basis-1/2 overflow-hidden">
      <div class="flex flex-row items-center px-3 py-2">
        <span class="tracking-wider text-accent-color font-bold">Definition</span>
        <div class="flex items-center h-[18px] ml-auto mr-1.5">
          <Show when={props.definitionType === DefinitionType.MDSL}>
            <Chip size="small" label="MDSL" />
          </Show>
          <Show when={props.definitionType === DefinitionType.JSON}>
            <Chip size="small" label="JSON" />
          </Show>
        </div>
      </div>
      <Divider />
      <div class="flex-1 min-h-0">
        <CodeEditor
          value={props.definition}
          onChange={props.onChange}
          readOnly={props.readOnly}
          mode={mode()}
          theme="sqlserver"
        />
      </div>
      <Show when={props.errorMessage}>
        <Alert severity="error" class="rounded-none">{props.errorMessage}</Alert>
      </Show>
    </div>
  );
};

