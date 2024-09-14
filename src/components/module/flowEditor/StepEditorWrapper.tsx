import { StepEditorContext, PropertyValue, Step, Definition } from "sequential-workflow-designer";
import { Context, createContext, createEffect, createSignal, JSX, onMount, useContext } from "solid-js";

declare global {
  interface Window {
    sqdStepEditorContext?: Context<StepEditorWrapper | null>;
  }
}

if (!window.sqdStepEditorContext) {
  window.sqdStepEditorContext = createContext<StepEditorWrapper | null>(null);
}
const stepEditorContext = window.sqdStepEditorContext;

export interface StepEditorWrapper<TStep extends Step = Step, TDefinition extends Definition = Definition> {
  readonly id: string;
  readonly type: TStep["type"];
  readonly componentType: TStep["componentType"];
  readonly name: string;
  readonly properties: TStep["properties"];
  readonly step: TStep;
  readonly definition: TDefinition;
  readonly isReadonly: boolean;

  setName(name: string): void;
  setProperty(name: keyof TStep["properties"], value: TStep["properties"][typeof name]): void;
  notifyPropertiesChanged(): void;
  notifyChildrenChanged(): void;
}

export function useStepEditor<
  TStep extends Step = Step,
  TDefinition extends Definition = Definition,
>(): StepEditorWrapper<TStep, TDefinition> {
  const wrapper = useContext(stepEditorContext);
  if (!wrapper) {
    throw new Error("Cannot find step editor context");
  }
  return wrapper as unknown as StepEditorWrapper<TStep, TDefinition>;
}

export interface StepEditorWrapperContextProps {
  children: JSX.Element;
  step: Step;
  definition: Definition;
  context: StepEditorContext;
  isReadonly: boolean;
}

export function StepEditorWrapperContext(props: StepEditorWrapperContextProps) {
  const [wrapper, setWrapper] = createSignal<StepEditorWrapper>({
    id: props.step.id,
    type: props.step.type,
    componentType: props.step.componentType,
    name: props.step.name,
    properties: props.step.properties,
    step: props.step,
    definition: props.definition,
    isReadonly: props.isReadonly,
    setName,
    setProperty,
    notifyPropertiesChanged,
    notifyChildrenChanged,
  });

  function setName(name: string) {
    props.step.name = name;
    notifyNameChanged();
    setWrapper({ ...wrapper(), name });
  }

  function setProperty(name: string, value: PropertyValue) {
    props.step.properties[name] = value;
    notifyPropertiesChanged();
    setWrapper({ ...wrapper(), properties: { ...props.step.properties } });
  }

  function notifyNameChanged() {
    props.context.notifyNameChanged();
  }

  function notifyPropertiesChanged() {
    props.context.notifyPropertiesChanged();
  }

  function notifyChildrenChanged() {
    props.context.notifyChildrenChanged();
  }

  return <stepEditorContext.Provider value={wrapper()}>{props.children}</stepEditorContext.Provider>;
}
