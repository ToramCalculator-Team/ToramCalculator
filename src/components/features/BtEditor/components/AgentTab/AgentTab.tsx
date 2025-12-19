import { Component, Show } from 'solid-js';
import { CodeEditor, Divider, Alert } from '../';

export type AgentTabProps = {
  value: string;
  onChange(value: string): void;
  errorMessage?: string;
  readOnly: boolean;
};

export const AgentTab: Component<AgentTabProps> = (props) => {
  return (
    <div class="flex flex-col h-full">
      <div class="px-3 py-2">
        <span class="text-xs uppercase tracking-wider text-accent-color/70">Agent</span>
      </div>
      <Divider />
      <div class="flex-1 min-h-0">
        <CodeEditor
          value={props.value}
          onChange={props.onChange}
          readOnly={props.readOnly}
          mode="javascript"
          theme="sqlserver"
        />
      </div>
      <Show when={props.errorMessage}>
        <Alert severity="error">{props.errorMessage}</Alert>
      </Show>
    </div>
  );
};

