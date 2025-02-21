import { Component, createSignal, For, JSX, JSXElement, onMount, Show } from "solid-js";

// 节点类型
interface NodeEditorNode {
  id: number;
  class: string;
  name: string;
  data: any;
  html: Component;
  inputs: Record<string, NodeEditorConnection>;
  outputs: Record<string, NodeEditorConnection>;
  posX: number;
  posY: number;
}

// 单个链接
interface NodeEditorConnection {
  inputClass: string;
  outputClass: string;
  inputId: number;
  outputId: number;
}

// 编辑器数据结构
interface NodeEditorExport {
  mode: string;
  zoom: number;
  nodes: NodeEditorNode[];
}


export default function NodeEditor(props: { data: NodeEditorExport }) {
  const defaultFlow: NodeEditorNode[] = [{
    id: 0,
    class: "",
    name: "",
    data: undefined,
    html: function (props: {}): JSX.Element {
      throw new Error("Function not implemented.");
    },
    inputs: {},
    outputs: {},
    posX: 0,
    posY: 0
  }];
  const [drawflow, setNodeEditorFlow] = createSignal<NodeEditorNode[]>(props.data.nodes ?? defaultFlow);
  const [container, setContainer] = createSignal<HTMLDivElement>();
  const [precanvas, setPrecanvas] = createSignal<HTMLDivElement>();
  const [nodeId, setNodeId] = createSignal(1);
  const [ele_selected, setEleSelected] = createSignal<HTMLDivElement>();
  const [node_selected, setNodeSelected] = createSignal<HTMLDivElement>();

  const events: Record<string, { listeners: Array<(args: any) => void> }> = {};
  const drag = false;
  const reroute = false;
  const reroute_fix_curvature = false;
  const curvature = 0.5;
  const reroute_curvature_start_end = 0.5;
  const reroute_curvature = 0.5;
  const reroute_width = 6;
  const drag_point = false;
  const editor_selected = false;
  const connection = false;
  const connection_ele = null;
  const connection_selected = null;
  const canvas_x = 0;
  const canvas_y = 0;
  const pos_x = 0;
  const pos_x_start = 0;
  const pos_y = 0;
  const pos_y_start = 0;
  const mouse_x = 0;
  const mouse_y = 0;
  const line_path = 5;
  const first_click = null;
  const force_first_input = false;
  const draggable_inputs = true;
  const useuuid = false;
  const parent = null;

  const noderegister: Record<string, { html: HTMLDivElement }> = {};
  const render = null;
  // Configurable options
  const module = "Home";
  const editor_mode = "edit";
  const zoom = 1;
  const zoom_max = 1.6;
  const zoom_min = 0.5;
  const zoom_value = 0.1;
  const zoom_last_value = 1;

  // Mobile
  const evCache = new Array();
  const prevDiff = -1;

  onMount(() => {
    console.info("Start NodeEditor!!");
    const canvas = container();
    if (canvas) {
      
      /* Mouse and Touch Actions */
      // canvas.addEventListener('mouseup', dragEnd);
      // canvas.addEventListener('mousemove', position);
      // canvas.addEventListener('mousedown', click);

      // canvas.addEventListener('touchend', dragEnd);
      // canvas.addEventListener('touchmove', position, { passive: false });
      // canvas.addEventListener('touchstart', click, { passive: false });

      // /* Context Menu */
      // canvas.addEventListener('contextmenu', contextmenu);
      // /* Delete */
      // canvas.addEventListener('keydown', key);

      // /* Zoom Mouse */
      // canvas.addEventListener('wheel', zoom_enter, { passive: false });
      // /* Update data Nodes */
      // canvas.addEventListener('input', updateNodeValue);

      // canvas.addEventListener('dblclick', dblclick);
      // /* Mobile zoom */
      // canvas.onpointerdown = pointerdown_handler;
      // canvas.onpointermove = pointermove_handler;
      // canvas.onpointerup = pointerup_handler;
      // canvas.onpointercancel = pointerup_handler;
      // canvas.onpointerout = pointerup_handler;
      // canvas.onpointerleave = pointerup_handler;
    }
    });

  return (
    <div ref={setContainer} tabIndex={0} id="NodeEditor" class="NodeEditor h-full w-full">
    </div>
  );
}
