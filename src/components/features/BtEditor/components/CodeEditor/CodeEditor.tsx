import { Component, onMount, onCleanup, createEffect, createMemo } from "solid-js";
import * as monaco from "monaco-editor";
import { mdslLanguageDefinition } from "../../modes/mdsl";
import { store } from "~/store";

// 使用 Vite 的 worker 导入方式，让 Vite 自动处理 worker 的打包和路径
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker&url";
import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker&url";
import CssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker&url";
import HtmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker&url";
import TsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker&url";
import { rgbToBase16 } from "~/lib/utils/color";

// 配置 Monaco Editor 的 worker
if (typeof window !== "undefined" && !(self as any).MonacoEnvironment) {
  (self as any).MonacoEnvironment = {
    getWorkerUrl: function (_moduleId: string, label: string) {
      if (label === "json") {
        return JsonWorker;
      }
      if (label === "css" || label === "scss" || label === "less") {
        return CssWorker;
      }
      if (label === "html" || label === "handlebars" || label === "razor") {
        return HtmlWorker;
      }
      if (label === "typescript" || label === "javascript") {
        return TsWorker;
      }
      // 默认 editor worker（用于 MDSL 和其他语言）
      return EditorWorker;
    },
  };
}

export type CodeEditorProps = {
  value: string;
  mode?: "mdsl" | "json" | "javascript";
  theme?: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  class?: string;
  style?: string | Record<string, string>;
};

// 注册 MDSL 语言（只需要注册一次）
let languageInitialized = false;

const initializeMDSLLanguage = () => {
  if (languageInitialized) {
    return;
  }

  // 注册 MDSL 语言
  monaco.languages.register({ id: "mdsl" });
  monaco.languages.setMonarchTokensProvider("mdsl", mdslLanguageDefinition);

  // 设置 MDSL 语言配置
  monaco.languages.setLanguageConfiguration("mdsl", {
    comments: {
      lineComment: "--",
      blockComment: ["/*", "*/"],
    },
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: "`", close: "`" },
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: "`", close: "`" },
    ],
  });

  languageInitialized = true;
};

const CodeEditor: Component<CodeEditorProps> = (props) => {
  let editorRef: HTMLDivElement | undefined;
  let editor: monaco.editor.IStandaloneCodeEditor | null = null;
  let isInitialized = false;

  // 初始化 MDSL 语言
  if (typeof window !== "undefined") {
    initializeMDSLLanguage();
  }

  const darkTheme = "app-theme-dark";
  const lightTheme = "app-theme-light";

  const colorTokens = {
    /* 背景色 */
    white: [255, 255, 255],
    black: [0, 0, 0],
    grey: [40, 40, 40],
    /* 对比度控制颜色 */
    brown: [47, 26, 73],
    /* 品牌色 */
    greenBlue: [110, 221, 229],
    yellow: [255, 153, 25],
    orange: [253, 116, 66],
    navyBlue: [78, 133, 226],
    /* 装饰色 */
    water: [0, 140, 229],
    fire: [233, 62, 38],
    earth: [255, 151, 54],
    wind: [0, 143, 84],
    light: [248, 193, 56],
    dark: [141, 56, 240],
  } as const satisfies Record<string, [number, number, number]>;


  const darkThemeTokens = {
    accent: colorTokens.white,
    primary: colorTokens.grey,
    transition: colorTokens.black,
    brand1st: colorTokens.greenBlue,
    brand2nd: colorTokens.yellow,
    brand3rd: colorTokens.orange,
    brand4th: colorTokens.navyBlue,
  };

  const lightThemeTokens = {
    accent: colorTokens.brown,
    primary: colorTokens.white,
    transition: colorTokens.navyBlue,
    brand1st: colorTokens.greenBlue,
    brand2nd: colorTokens.yellow,
    brand3rd: colorTokens.orange,
    brand4th: colorTokens.navyBlue,
  };

  const darkThemeBase16Colors = {
    brand1st: rgbToBase16(darkThemeTokens.brand1st),
    brand2nd: rgbToBase16(darkThemeTokens.brand2nd),
    brand3rd: rgbToBase16(darkThemeTokens.brand3rd),
    accent: rgbToBase16(darkThemeTokens.accent),
    transition: rgbToBase16(darkThemeTokens.transition),
    primary: rgbToBase16(darkThemeTokens.primary),
  }

  const lightThemeBase16Colors = {
    brand1st: rgbToBase16(lightThemeTokens.brand1st),
    brand2nd: rgbToBase16(lightThemeTokens.brand2nd),
    brand3rd: rgbToBase16(lightThemeTokens.brand3rd),
    accent: rgbToBase16(lightThemeTokens.accent),
    transition: rgbToBase16(lightThemeTokens.transition),
    primary: rgbToBase16(lightThemeTokens.primary),
  }

  // 颜色值应该是base16的值
  monaco.editor.defineTheme(darkTheme, {
    base: "vs-dark",
    inherit: true,
    rules: [
      // // 所有语法高亮颜色都使用 CSS 变量中的品牌色
      { token: "keyword", foreground: darkThemeBase16Colors.accent, fontStyle: "bold" },
      // { token: "operator", foreground: darkThemeBase16Colors.accent },
      // { token: "identifier", foreground: darkThemeBase16Colors.accent },
      // { token: "support.function", foreground: darkThemeBase16Colors.brand2nd },
      // { token: "variable.language", foreground: darkThemeBase16Colors.brand1st },
      // { token: "constant.language", foreground: darkThemeBase16Colors.brand3rd },
      // // 注释、字符串、数字等使用 base 主题的默认颜色（会根据 vs/vs-dark 自动调整）
    ],
    colors: {
      "editor.background": darkThemeBase16Colors.primary,
      // "editor.foreground": darkThemeBase16Colors.accent,
      // "editorLineNumber.foreground": darkThemeBase16Colors.transition,
      // "editor.selectionBackground": 'rgba(0, 0, 0, 0.5)',
      // "editor.lineHighlightBackground": `#red`,
      // "editorCursor.foreground": darkThemeBase16Colors.accent,
      // "editorWhitespace.foreground": darkThemeBase16Colors.transition,
    },
  });

  monaco.editor.defineTheme(lightTheme, {
    base: "vs",
    inherit: true,
    rules: [
      // // 所有语法高亮颜色都使用 CSS 变量中的品牌色
      { token: "keyword", foreground: lightThemeBase16Colors.accent, fontStyle: "bold" },
      // { token: "operator", foreground: lightThemeBase16Colors.accent },
      // { token: "identifier", foreground: lightThemeBase16Colors.accent },
      // { token: "support.function", foreground: lightThemeBase16Colors.brand2nd },
      // { token: "variable.language", foreground: lightThemeBase16Colors.brand1st },
      // { token: "constant.language", foreground: lightThemeBase16Colors.brand3rd },
      // // 注释、字符串、数字等使用 base 主题的默认颜色（会根据 vs/vs-dark 自动调整）
    ],
    colors: {
      "editor.background": `${lightThemeBase16Colors.primary}`,
      "editor.foreground": lightThemeBase16Colors.accent,
      // "editorLineNumber.foreground": lightThemeBase16Colors.transition,
      // "editor.selectionBackground": 'rgba(0, 0, 0, 0.5)',
      // "editor.lineHighlightBackground": `#red`,
      // "editorCursor.foreground": lightThemeBase16Colors.accent,
      // "editorWhitespace.foreground": lightThemeBase16Colors.transition,
    },
  });

  onMount(() => {
    if (!editorRef) return;
    // 创建编辑器实例
    editor = monaco.editor.create(editorRef, {
      value: props.value || "",
      language: props.mode || "javascript",
      theme: store.settings.userInterface.theme === "dark" ? darkTheme : lightTheme,
      readOnly: props.readOnly || false,
      fontSize: 16,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      insertSpaces: true,
      wordWrap: "on",
      lineNumbers: "on",
      renderLineHighlight: "all",
      scrollbar: {
        vertical: "auto",
        horizontal: "auto",
      },
    });

    // 设置初始值
    if (props.value) {
      editor.setValue(props.value);
    }

    // 监听内容变化
    editor.onDidChangeModelContent(() => {
      if (editor && props.onChange) {
        const value = editor.getValue();
        props.onChange(value);
      }
    });

    isInitialized = true;
  });

  createEffect(() => {
    // 设置主题
    monaco.editor.setTheme(store.settings.userInterface.theme === "dark" ? darkTheme : lightTheme);
  });

  // 响应 props.value 变化
  createEffect(() => {
    if (editor && isInitialized && props.value !== undefined) {
      const currentValue = editor.getValue();
      if (currentValue !== props.value) {
        // 保存光标位置
        const position = editor.getPosition();
        editor.setValue(props.value);
        // 恢复光标位置
        if (position) {
          editor.setPosition(position);
        }
      }
    }
  });

  // 响应 mode 变化
  createEffect(() => {
    if (editor && isInitialized && props.mode) {
      const model = editor.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, props.mode);
      }
    }
  });

  // 响应 readOnly 变化
  createEffect(() => {
    if (editor && isInitialized) {
      editor.updateOptions({
        readOnly: props.readOnly || false,
      });
    }
  });

  onCleanup(() => {
    if (editor) {
      editor.dispose();
      editor = null;
    }
  });

  const styleProps = () => {
    if (!props.style) return {};
    if (typeof props.style === "string") {
      return { style: props.style };
    }
    return { style: props.style };
  };

  return <div ref={editorRef} class={`h-full min-h-[200px] w-full ${props.class || ""}`} {...styleProps()} />;
};

export { CodeEditor };
