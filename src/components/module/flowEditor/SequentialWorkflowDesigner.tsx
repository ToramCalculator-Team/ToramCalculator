import { createSignal, JSX, onMount } from "solid-js";
import {
  Definition,
  ToolboxConfiguration,
  Designer,
  RootEditorContext,
  Step,
  StepEditorContext,
  StepsConfiguration,
  DesignerExtension,
  CustomActionHandler,
  CustomActionHandlerContext,
  CustomAction,
  Sequence,
  ValidatorConfiguration,
  RootEditorProvider,
  StepEditorProvider,
  KeyboardConfiguration,
  I18n,
  PreferenceStorage,
} from "sequential-workflow-designer";
import { RootEditorWrapperContext } from "./RootEditorWrapper";
import { StepEditorWrapperContext } from "./StepEditorWrapper";
import { wrapDefinition, WrappedDefinition } from "./WrappedDefinition";
import { Presenter } from "./Presenter";
import { SequentialWorkflowDesignerController } from "./SequentialWorkflowDesignerController";

const externalEditorClassName = "sqd-editor-react";

export type ReactToolboxConfiguration = Omit<ToolboxConfiguration, "isCollapsed">;

export interface SequentialWorkflowDesignerProps<TDefinition extends Definition> {
  definition: WrappedDefinition<TDefinition>;
  onDefinitionChange: (state: WrappedDefinition<TDefinition>) => void;
  selectedStepId?: string | null;
  onSelectedStepIdChanged?: (stepId: string | null) => void;
  isReadonly?: boolean;

  rootEditor: false | JSX.Element | RootEditorProvider;
  stepEditor: false | JSX.Element | StepEditorProvider;
  isEditorCollapsed?: boolean;
  onIsEditorCollapsedChanged?: (isCollapsed: boolean) => void;

  theme?: string;
  undoStackSize?: number;
  stepsConfiguration: StepsConfiguration;
  validatorConfiguration?: ValidatorConfiguration;
  toolboxConfiguration: false | ReactToolboxConfiguration;
  isToolboxCollapsed?: boolean;
  onIsToolboxCollapsedChanged?: (isCollapsed: boolean) => void;
  /**
   * @description If true, the control bar will be displayed.
   */
  controlBar: boolean;
  contextMenu?: boolean;
  keyboard?: boolean | KeyboardConfiguration;
  preferenceStorage?: PreferenceStorage;
  controller?: SequentialWorkflowDesignerController;
  customActionHandler?: CustomActionHandler;
  extensions?: DesignerExtension[];
  i18n?: I18n;
}

export function SequentialWorkflowDesigner<TDefinition extends Definition>(
  props: SequentialWorkflowDesignerProps<TDefinition>,
) {
  // debugger;
  const [placeholder, setPlaceholder] = createSignal<HTMLElement | null>(null);

  const onDefinitionChangeRef = props.onDefinitionChange;
  const onSelectedStepIdChangedRef = props.onSelectedStepIdChanged;
  const onIsEditorCollapsedChangedRef = props.onIsEditorCollapsedChanged;
  const onIsToolboxCollapsedChangedRef = props.onIsToolboxCollapsedChanged;
  const rootEditorRef = props.rootEditor;
  const stepEditorRef = props.stepEditor;
  const controllerRef = props.controller;
  const customActionHandlerRef = props.customActionHandler;

  let designerRef: Designer<TDefinition> | null = null;
  let editorRootRef: HTMLElement | null = null;

  const definition = props.definition;
  const selectedStepId = props.selectedStepId;
  const isReadonly = props.isReadonly;
  const theme = props.theme;
  const undoStackSize = props.undoStackSize;
  const steps = props.stepsConfiguration;
  const validator = props.validatorConfiguration;
  const toolbox = props.toolboxConfiguration;
  const isEditorCollapsed = props.isEditorCollapsed;
  const isToolboxCollapsed = props.isToolboxCollapsed;
  const controlBar = props.controlBar;
  const contextMenu = props.contextMenu;
  const keyboard = props.keyboard;
  const preferenceStorage = props.preferenceStorage;
  const extensions = props.extensions;
  const i18n = props.i18n;

  function forwardDefinition() {
    if (designerRef) {
      const wd = wrapDefinition(designerRef.getDefinition(), designerRef.isValid());
      onDefinitionChangeRef(wd);
    }
  }

  function rootEditorProvider(def: TDefinition, context: RootEditorContext, isReadonly: boolean) {
    if (!rootEditorRef) {
      throw new Error("Root editor is not provided");
    }
    return Presenter.render(
      externalEditorClassName,
      editorRootRef,
      <RootEditorWrapperContext definition={def} context={context} isReadonly={isReadonly}>
        {rootEditorRef as JSX.Element}
      </RootEditorWrapperContext>,
    );
  }

  function stepEditorProvider(step: Step, context: StepEditorContext, def: Definition, isReadonly: boolean) {
    if (!stepEditorRef) {
      throw new Error("Step editor is not provided");
    }
    return Presenter.render(
      externalEditorClassName,
      editorRootRef,
      <StepEditorWrapperContext step={step} definition={def} context={context} isReadonly={isReadonly}>
        {stepEditorRef as JSX.Element}
      </StepEditorWrapperContext>,
    );
  }

  function customActionHandler(
    action: CustomAction,
    step: Step | null,
    sequence: Sequence,
    context: CustomActionHandlerContext,
  ) {
    if (customActionHandlerRef) {
      customActionHandlerRef(action, step, sequence, context);
    }
  }

  function tryDestroy() {
    Presenter.tryDestroy(editorRootRef);

    if (controllerRef) {
      controllerRef.setDesigner(null);
    }
    if (designerRef) {
      designerRef.destroy();
      designerRef = null;
      // console.log('sqd: designer destroyed');
    }
  }

//   onMount(() => {
//     onDefinitionChangeRef = props.onDefinitionChange;
//   });

//   onMount(() => {
//     onSelectedStepIdChangedRef = props.onSelectedStepIdChanged;
//   });

//   onMount(() => {
//     onIsEditorCollapsedChangedRef = props.onIsEditorCollapsedChanged;
//   });

//   onMount(() => {
//     onIsToolboxCollapsedChangedRef = props.onIsToolboxCollapsedChanged;
//   });

//   onMount(() => {
//     rootEditorRef = props.rootEditor;
//   });

//   onMount(() => {
//     stepEditorRef = props.stepEditor;
//   });

//   onMount(() => {
//     customActionHandlerRef = props.customActionHandler;
//   });

  onMount(() => {
    if (!placeholder) {
      return;
    }

    if (designerRef) {
      const isNotChanged = definition.value === designerRef.getDefinition();
      if (isNotChanged) {
        if (selectedStepId !== undefined && selectedStepId !== designerRef.getSelectedStepId()) {
          if (selectedStepId) {
            designerRef.selectStepById(selectedStepId);
          } else {
            designerRef.clearSelectedStep();
          }
          // console.log('sqd: selected step updated');
        }

        if (isReadonly !== undefined && isReadonly !== designerRef.isReadonly()) {
          designerRef.setIsReadonly(isReadonly);
          // console.log('sqd: isReadonly updated');
        }
        if (isToolboxCollapsed !== undefined && isToolboxCollapsed !== designerRef.isToolboxCollapsed()) {
          designerRef.setIsToolboxCollapsed(isToolboxCollapsed);
          // console.log('sqd: isToolboxCollapsed updated');
        }
        if (isEditorCollapsed !== undefined && isEditorCollapsed !== designerRef.isEditorCollapsed()) {
          designerRef.setIsEditorCollapsed(isEditorCollapsed);
          // console.log('sqd: isEditorCollapsed updated');
        }
        return;
      }

      tryDestroy();
    }

    const designer = Designer.create(placeholder()!, definition.value, {
      theme,
      undoStackSize,
      toolbox: toolbox
        ? {
            ...toolbox,
            isCollapsed: isToolboxCollapsed,
          }
        : false,
      steps,
      validator,
      controlBar,
      contextMenu,
      keyboard,
      preferenceStorage,
      editors:
        rootEditorRef && stepEditorRef
          ? {
              isCollapsed: isEditorCollapsed,
              rootEditorProvider,
              stepEditorProvider,
            }
          : false,
      customActionHandler: customActionHandlerRef && customActionHandler,
      extensions,
      i18n,
      isReadonly,
    });
    if (controllerRef) {
      controllerRef.setDesigner(designer as unknown as Designer<Definition>);
    }
    if (selectedStepId) {
      designer.selectStepById(selectedStepId);
    }
    // console.log('sqd: designer rendered');

    designer.onReady.subscribe(forwardDefinition);
    designer.onDefinitionChanged.subscribe(forwardDefinition);

    designer.onSelectedStepIdChanged.subscribe((stepId) => {
      if (onSelectedStepIdChangedRef) {
        onSelectedStepIdChangedRef(stepId);
      }
    });
    designer.onIsToolboxCollapsedChanged.subscribe((isCollapsed) => {
      if (onIsToolboxCollapsedChangedRef) {
        onIsToolboxCollapsedChangedRef(isCollapsed);
      }
    });
    designer.onIsEditorCollapsedChanged.subscribe((isCollapsed) => {
      if (onIsEditorCollapsedChangedRef) {
        onIsEditorCollapsedChangedRef(isCollapsed);
      }
    });

    designerRef = designer;
  });

  onMount(() => {
    return tryDestroy;
  });
  
  return <div ref={setPlaceholder} data-testid="designer" class="sqd-designer-react"></div>;
}
