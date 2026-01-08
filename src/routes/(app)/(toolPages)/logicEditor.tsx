import { createSignal, onMount, Show } from "solid-js";
import defaultData from "~/components/features/logicEditor/defaultData.json";
import { LogicEditor } from "~/components/features/logicEditor/LogicEditor";

export default function LogicEditorTestPage() {
	// 是否显示调试布局
	const [debugLayout, setDebugLayout] = createSignal<boolean>(true);
	const [data, setData] = createSignal<any>({});
	const [state, setState] = createSignal<any[]>([]);
	const [code, setCode] = createSignal<string>("");

	onMount(() => {
		setData(defaultData);
	});

	return (
		<div class="grid h-full grid-cols-12 grid-rows-12 gap-2 p-3">
			<div class="col-span-12 row-span-8">
				<LogicEditor data={data()} setData={setData} state={state()} setCode={setCode} memberType={"Player"} />
			</div>
			<Show when={debugLayout()} fallback={<pre class="col-span-12 row-span-4 overflow-y-auto">{code()}</pre>}>
				<div class="col-span-12 row-span-4 flex overflow-y-auto gap-2">
					<div class="flex gap-2 flex-1 min-h-0">
						<h3 class="font-bold mb-1">Workspace JSON</h3>
						<pre class="text-xs">{JSON.stringify(data(), null, 2)}</pre>
					</div>
					<div class="flex-1 overflow-y-auto">
						<h3 class="font-bold mb-1">JS Code</h3>
						<pre class="text-xs">{code()}</pre>
					</div>
				</div>
			</Show>
		</div>
	);
}
