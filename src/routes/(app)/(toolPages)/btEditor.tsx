import { createSignal, onMount } from "solid-js";
import { BtEditor } from "~/components/features/BtEditor/App";

export default function BtEditorPage() {
  // 是否显示调试布局
  const [debugLayout, setDebugLayout] = createSignal<boolean>(true);
  const [data, setData] = createSignal<any>({});
  const [state, setState] = createSignal<any[]>([]);
  const [mdslDefinition, setMdslDefinition] = createSignal<string>("");

  onMount(() => {
  });

  return <BtEditor />;
}
