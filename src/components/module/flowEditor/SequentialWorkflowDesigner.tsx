import { createEffect, createSignal, JSX, onMount } from "solid-js";
import type {
  Definition,
  ToolboxConfiguration,
  RootEditorContext,
  Step,
  StepEditorContext,
  StepsConfiguration,
  DesignerExtension,
  CustomActionHandler,
  ValidatorConfiguration,
  RootEditorProvider,
  StepEditorProvider,
  KeyboardConfiguration,
  I18n,
  PreferenceStorage,
} from "sequential-workflow-designer";
import { Designer } from "sequential-workflow-designer";
import { RootEditorWrapperContext } from "./RootEditorWrapper";
import { StepEditorWrapperContext } from "./StepEditorWrapper";
import { wrapDefinition, WrappedDefinition } from "./WrappedDefinition";
import { render } from "solid-js/web";

const externalEditorClassName = "sqd-editor-solid";

export type ReactToolboxConfiguration = Omit<ToolboxConfiguration, "isCollapsed">;

export interface SequentialWorkflowDesignerProps<TDefinition extends Definition> {
  definition: WrappedDefinition<TDefinition>;
  onDefinitionChange: (state: WrappedDefinition<TDefinition>) => void;
  selectedStepId?: string | null;
  onSelectedStepIdChanged?: (stepId: string | null) => void;
  isFollowingSelectedStep?: boolean;
  onIsFollowingSelectedStepChanged?: (isFollowing: boolean) => void;
  isReadonly?: boolean;

  rootEditor: false | (() => JSX.Element | RootEditorProvider);
  stepEditor: false | (() => JSX.Element | StepEditorProvider);
  isEditorCollapsed?: boolean;
  onIsEditorCollapsedChanged?: (isCollapsed: boolean) => void;

  theme?: string;
  undoStackSize?: number;
  stepsConfiguration: StepsConfiguration;
  validatorConfiguration?: ValidatorConfiguration;
  toolboxConfiguration: false | ReactToolboxConfiguration;
  isToolboxCollapsed?: boolean;
  onIsToolboxCollapsedChanged?: (isCollapsed: boolean) => void;
  controlBar: boolean;
  contextMenu?: boolean;
  keyboard?: boolean | KeyboardConfiguration;
  preferenceStorage?: PreferenceStorage;
  customActionHandler?: CustomActionHandler;
  extensions?: DesignerExtension[];
  i18n?: I18n;
}

export function SequentialWorkflowDesigner<TDefinition extends Definition>(
  props: SequentialWorkflowDesignerProps<TDefinition>,
) {
  const [placeholder, setPlaceholder] = createSignal<HTMLElement | null>(null);

  const onDefinitionChange = props.onDefinitionChange;
  const onSelectedStepIdChanged = props.onSelectedStepIdChanged;
  const onIsEditorCollapsedChanged = props.onIsEditorCollapsedChanged;
  const onIsToolboxCollapsedChanged = props.onIsToolboxCollapsedChanged;
  const rootEditor = props.rootEditor;
  const stepEditor = props.stepEditor;
  const customActionHandler = props.customActionHandler;
  const definition = props.definition;
  const theme = props.theme;
  const undoStackSize = props.undoStackSize;
  const stepsConfiguration = props.stepsConfiguration;
  const validatorConfiguration = props.validatorConfiguration;
  const toolboxConfiguration = props.toolboxConfiguration;
  const controlBar = props.controlBar;
  const contextMenu = props.contextMenu;
  const keyboard = props.keyboard;
  const preferenceStorage = props.preferenceStorage;
  const extensions = props.extensions;
  const i18n = props.i18n;

  const [designer, setDesigner] = createSignal<Designer<TDefinition> | null>(null);

  function forwardDefinition() {
    if (designer()) {
      const wd = wrapDefinition(designer()!.getDefinition(), designer()!.isValid());
      onDefinitionChange(wd);
    }
  }

  function rootEditorProvider(def: TDefinition, context: RootEditorContext, isReadonly: boolean) {
    if (!rootEditor) {
      throw new Error("Root editor is not provided");
    }
    const container = document.createElement("div");
    container.className = externalEditorClassName;
    render(
      () => (
        <RootEditorWrapperContext definition={def} context={context} isReadonly={isReadonly}>
          {rootEditor() as JSX.Element}
        </RootEditorWrapperContext>
      ),
      container,
    );
    return container;
  }

  function stepEditorProvider(step: Step, context: StepEditorContext, def: Definition, isReadonly: boolean) {
    if (!stepEditor) {
      throw new Error("Step editor is not provided");
    }
    const container = document.createElement("div");
    container.className = externalEditorClassName;
    render(
      () => (
        <StepEditorWrapperContext step={step} definition={def} context={context} isReadonly={isReadonly}>
          {stepEditor() as JSX.Element}
        </StepEditorWrapperContext>
      ),
      container,
    );

    return container;
  }

  function tryDestroy() {
    if (designer()) {
      designer()!.destroy();
      setDesigner(null);
    }
  }

  onMount(() => {
    console.log("designer mounted");
    setDesigner(
      Designer.create(placeholder()!, definition.value, {
        theme,
        undoStackSize,
        toolbox: toolboxConfiguration
          ? {
              ...toolboxConfiguration,
              isCollapsed: props.isToolboxCollapsed,
            }
          : false,
        steps: stepsConfiguration,
        validator: validatorConfiguration,
        controlBar,
        contextMenu,
        keyboard,
        preferenceStorage,
        editors:
          rootEditor && stepEditor
            ? {
                isCollapsed: props.isEditorCollapsed,
                rootEditorProvider,
                stepEditorProvider,
              }
            : false,
        customActionHandler: customActionHandler ?? (() => {}),
        extensions,
        i18n,
        isReadonly: props.isReadonly,
      }),
    );
    if (props.selectedStepId) {
      designer()?.selectStepById(props.selectedStepId);
    }

    // 由于不清楚subscribe内部执行逻辑，暂时保留其源生用法，作为Designer属性变化的副作用
    // createEffect用于实时更新Designer属性

    designer()?.onReady.subscribe(forwardDefinition);

    createEffect(() => {
      props.definition.value &&
        props.definition.value !== designer()?.getDefinition() &&
        designer()?.replaceDefinition(props.definition.value);
    });
    designer()?.onDefinitionChanged.subscribe(forwardDefinition);

    createEffect(() => {
      props.selectedStepId && designer()?.selectStepById(props.selectedStepId);
      props.isFollowingSelectedStep && props.selectedStepId && designer()?.moveViewportToStep(props.selectedStepId);
    });
    designer()?.onSelectedStepIdChanged.subscribe((stepId) => {
      onSelectedStepIdChanged?.(stepId);
    });

    createEffect(() => {
      props.isToolboxCollapsed && designer()?.setIsToolboxCollapsed(props.isToolboxCollapsed);
    });
    designer()?.onIsToolboxCollapsedChanged.subscribe((isCollapsed) => {
      onIsToolboxCollapsedChanged?.(isCollapsed);
    });

    createEffect(() => {
      props.isEditorCollapsed && designer()?.setIsEditorCollapsed(props.isEditorCollapsed);
    });
    designer()?.onIsEditorCollapsedChanged.subscribe((isCollapsed) => {
      onIsEditorCollapsedChanged?.(isCollapsed);
    });

    createEffect(() => {
      props.isReadonly && designer()?.setIsReadonly(props.isReadonly);
    });

    createEffect(() => {
      props.isFollowingSelectedStep && props.selectedStepId && designer()?.moveViewportToStep(props.selectedStepId);
    });
  });

  onMount(() => {
    return tryDestroy;
  });

  return <div ref={setPlaceholder} data-testid="designer" class="sqd-designer-solid h-full w-full"></div>;
}
