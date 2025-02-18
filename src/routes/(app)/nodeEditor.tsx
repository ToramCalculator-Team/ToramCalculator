import { createSignal, onMount } from "solid-js";
import Drawflow from "~/components/module/nodeEditor/nodeEditor";

export default function Editor() {
  const [editorDivRef, setEditorDivRef] = createSignal<HTMLDivElement>();
  type CustomNode = {
    name: string;
    inputs: number;
    outputs: number;
    posx: number;
    posy: number;
    className: string;
    data: any;
    html: string;
    typenode: boolean | string;
  };
  const customNodes: Record<string, CustomNode> = {
    github: {
      name: "",
      inputs: 0,
      outputs: 0,
      posx: 0,
      posy: 0,
      className: "",
      data: { name: "" },
      html: `<div></div>`,
      typenode: "",
    },
  };

  onMount(() => {
    console.log("Mount");
    const editorDiv = editorDivRef();
    if (editorDiv) {
      const editor = new Drawflow(editorDiv);
      editor.start();
      editor.addNode("github", 0, 1, 150, 300, "github", customNodes.github.data, customNodes.github.html, false);
    }
  });

  return (
    <>
      <div ref={setEditorDivRef} class="h-dvh w-dvw"></div>
    </>
  );
}
