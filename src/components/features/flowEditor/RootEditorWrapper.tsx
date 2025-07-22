import { Definition, RootEditorContext, PropertyValue } from "sequential-workflow-designer";
import { Context, createContext, createSignal, JSX, useContext } from "solid-js";

declare global {
  interface Window {
    sqdRootEditorContext?: Context<RootEditorWrapper<Definition> | null>;
  }
}

if (!window.sqdRootEditorContext) {
  window.sqdRootEditorContext = createContext<RootEditorWrapper<Definition> | null>(null);
}
const rootEditorContext = window.sqdRootEditorContext;

export interface RootEditorWrapper<TDefinition extends Definition> {
  readonly properties: TDefinition["properties"];
  readonly definition: TDefinition;
  readonly isReadonly: boolean;

  setProperty(name: keyof TDefinition["properties"], value: TDefinition["properties"][typeof name]): void;
}

export function useRootEditor<TDefinition extends Definition = Definition>(): RootEditorWrapper<TDefinition> {
  const wrapper = useContext(rootEditorContext);
  if (!wrapper) {
    throw new Error("Cannot find root editor context");
  }
  return wrapper as unknown as RootEditorWrapper<TDefinition>;
}

export interface RootEditorWrapperContextProps {
  children: JSX.Element;
  definition: Definition;
  context: RootEditorContext;
  isReadonly: boolean;
}

export function RootEditorWrapperContext(props: RootEditorWrapperContextProps) {
  const [wrapper, setWrapper] = createSignal({
    properties: props.definition.properties,
    definition: props.definition,
    isReadonly: props.isReadonly,
    setProperty,
  });

  function setProperty(name: string, value: PropertyValue) {
    props.definition.properties[name] = value;
    props.context.notifyPropertiesChanged();
    setWrapper({
      ...wrapper(),
		properties: {
			...props.definition.properties
		  
	   },
    });
  }

  return <rootEditorContext.Provider value={wrapper()}>{props.children}</rootEditorContext.Provider>;
}
