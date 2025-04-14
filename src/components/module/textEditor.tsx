// tools.js
import EditorJS, { OutputData } from "@editorjs/editorjs";
import List from "@editorjs/list";
import Header from "@editorjs/header";
import Quote from "@editorjs/quote";

import { createSignal, JSX, onMount, Show } from "solid-js";

interface TextEditorProps extends JSX.InputHTMLAttributes<HTMLDivElement> {
  data: OutputData;
  setData: (data: OutputData) => void;
}

function TextEditor(props: TextEditorProps) {
  const [editorIsReady, setReady] = createSignal(false);

  const randomHolderId = "myHolder";

  const createEditor = async () => {
    const instance = new EditorJS({
      autofocus: false,
      holder: randomHolderId,
      data: props.data,
      tools: {
        list: List,
        header: Header,
        quote: Quote,
      },
    });

    console.log(instance);
    await instance.isReady;
    setReady(true);
  };

  onMount(createEditor);

  return (
    <div id={randomHolderId} class={props.class ? ` ` + " " + props.class : `h-full w-full`}>
      <span></span>
      <Show when={!editorIsReady()}>loading...</Show>
    </div>
  );
}

export default TextEditor;
