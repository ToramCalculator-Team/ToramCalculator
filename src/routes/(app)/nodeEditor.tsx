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
      

    editor.reroute = true;
    editor.reroute_fix_curvature = true;

    editor.start();

    const data = {
      name: ''
    };

    editor.addNode('foo', 1, 1, 100, 200, 'foo', data, 'Foo', false);
    editor.addNode('bar', 1, 1, 400, 100, 'bar', data, 'Bar A', false);
    editor.addNode('bar', 1, 1, 400, 300, 'bar', data, 'Bar B', false);

    editor.addConnection(1, 2, "output_1", "input_1");
    editor.addConnection(1, 3, "output_1", "input_1");
    }
  });

  return (
    <>
      <div ref={setEditorDivRef} class="h-dvh w-dvw"></div>
    </>
  );
}
