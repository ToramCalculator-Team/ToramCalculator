import { Component, onMount, onCleanup, createEffect } from 'solid-js';
// @ts-ignore - ace-builds 没有完整的类型定义
import ace from 'ace-builds/src-noconflict/ace';
import 'ace-builds/src-noconflict/theme-sqlserver';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/mode-javascript';
import { defineMDSLMode } from '../../modes/mdsl';

export type CodeEditorProps = {
  value: string;
  mode?: 'mdsl' | 'json' | 'javascript';
  theme?: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  class?: string;
  style?: string | Record<string, string>;
};

const CodeEditor: Component<CodeEditorProps> = (props) => {
  let editorRef: HTMLDivElement | undefined;
  let editor: any = null; // ace.Ace.Editor 类型
  let isInitialized = false;

  // 定义 MDSL 模式（只需要执行一次，使用全局标记避免重复定义）
  if (typeof window !== 'undefined' && !(window as any).__mdslModeDefined) {
    defineMDSLMode(ace);
    (window as any).__mdslModeDefined = true;
  }

  onMount(() => {
    if (!editorRef) return;

    // 初始化编辑器
    editor = ace.edit(editorRef, {
      theme: 'ace/theme/sqlserver',
      mode: props.mode === 'mdsl' ? 'ace/mode/mdsl' : `ace/mode/${props.mode || 'javascript'}`,
      readOnly: props.readOnly || false,
      fontSize: 14,
      showPrintMargin: false,
      useWorker: false, // 禁用 worker，避免路径问题
      tabSize: 2,
      useSoftTabs: true,
    });

    // 设置初始值
    if (props.value) {
      editor.setValue(props.value, -1);
    }

    // 监听内容变化
    editor.on('change', () => {
      if (editor && props.onChange) {
        const value = editor.getValue();
        props.onChange(value);
      }
    });

    isInitialized = true;
  });

  // 响应 props.value 变化
  createEffect(() => {
    if (editor && isInitialized && props.value !== undefined) {
      const currentValue = editor.getValue();
      if (currentValue !== props.value) {
        editor.setValue(props.value, -1);
      }
    }
  });

  // 响应 mode 变化
  createEffect(() => {
    if (editor && isInitialized && props.mode) {
      const mode = props.mode === 'mdsl' ? 'ace/mode/mdsl' : `ace/mode/${props.mode}`;
      editor.session.setMode(mode);
    }
  });

  // 响应 readOnly 变化
  createEffect(() => {
    if (editor && isInitialized) {
      editor.setReadOnly(props.readOnly || false);
    }
  });

  // 响应 theme 变化
  createEffect(() => {
    if (editor && isInitialized && props.theme) {
      editor.setTheme(`ace/theme/${props.theme}`);
    }
  });

  onCleanup(() => {
    if (editor) {
      editor.destroy();
      editor = null;
    }
  });

  const styleProps = () => {
    if (!props.style) return {};
    if (typeof props.style === 'string') {
      return { style: props.style };
    }
    return { style: props.style };
  };

  return (
    <div
      ref={editorRef}
      class={`w-full h-full min-h-[200px] ${props.class || ''}`}
      {...styleProps()}
    />
  );
};

export { CodeEditor };

