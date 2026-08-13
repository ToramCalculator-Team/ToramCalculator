import { createSignal, For, type JSX, onCleanup, onMount, Show } from "solid-js";
import { Button } from "~/components/ui/controls/button";
import {
	ArcRotateCamera,
	Color3,
	Color4,
	Engine,
	MeshBuilder,
	Scene,
	StandardMaterial,
	Vector3,
} from "~/platform/render/babylon/runtime";
import { readSharedMovementState, SceneInputController } from "~/platform/render/scene/input/controller";
import type { ControllerActionEvent, SharedMovementStateSnapshot } from "~/platform/render/scene/input/controllerTypes";

const TEST_TICK_HZ = 20;
const MAX_LOG_ENTRIES = 30;

interface TickSample {
	tick: number;
	sampledAtMs: number;
	state: SharedMovementStateSnapshot;
}

const formatDirection = (snapshot: SharedMovementStateSnapshot | undefined): string => {
	if (!snapshot?.moving) return "停止";
	return `(${snapshot.direction.x.toFixed(4)}, ${snapshot.direction.z.toFixed(4)})`;
};

/** 独立验证控制器 SAB 最新状态通道，不接入 SceneRuntime、Worker 或 MemberController。 */
export default function ControllerTestPage(): JSX.Element {
	let canvas!: HTMLCanvasElement;
	let engine: Engine | undefined;
	let scene: Scene | undefined;
	let camera: ArcRotateCamera | undefined;
	let controller: SceneInputController | undefined;
	let tickTimer: number | undefined;

	const [actions, setActions] = createSignal<readonly ControllerActionEvent[]>([]);
	const [tickSamples, setTickSamples] = createSignal<readonly TickSample[]>([]);
	const [producerState, setProducerState] = createSignal<SharedMovementStateSnapshot>();
	const [consumerState, setConsumerState] = createSignal<SharedMovementStateSnapshot>();
	const [yaw, setYaw] = createSignal(0);
	const [pressedKeys, setPressedKeys] = createSignal<readonly string[]>([]);
	const [publishedCount, setPublishedCount] = createSignal(0);
	const [tickCount, setTickCount] = createSignal(0);
	const [consumedRevisionCount, setConsumedRevisionCount] = createSignal(0);
	const [overwrittenCount, setOverwrittenCount] = createSignal(0);
	const [unstableReadCount, setUnstableReadCount] = createSignal(0);
	const [error, setError] = createSignal<string>();

	const appendAction = (action: ControllerActionEvent) => {
		console.log("[controller-test:action]", action);
		setActions((current) => [action, ...current].slice(0, MAX_LOG_ENTRIES));
	};

	const handleResize = () => engine?.resize();
	const clearLogs = () => {
		setActions([]);
		setTickSamples([]);
	};

	onMount(() => {
		try {
			engine = new Engine(canvas, true);
			scene = new Scene(engine);
			scene.clearColor = new Color4(0.035, 0.047, 0.067, 1);

			camera = new ArcRotateCamera("controller-test-camera", Math.PI / 4, 1.05, 9, new Vector3(0, 0, 0), scene);
			camera.attachControl(canvas, true);
			camera.lowerBetaLimit = 0.35;
			camera.upperBetaLimit = Math.PI / 2.15;
			camera.lowerRadiusLimit = 5;
			camera.upperRadiusLimit = 16;

			const ground = MeshBuilder.CreateGround("controller-test-ground", { width: 30, height: 30 }, scene);
			const groundMaterial = new StandardMaterial("controller-test-ground-material", scene);
			groundMaterial.diffuseColor = new Color3(0.12, 0.17, 0.23);
			ground.material = groundMaterial;

			const marker = MeshBuilder.CreateBox("controller-test-marker", { size: 1.2 }, scene);
			marker.position.y = 0.6;
			const markerMaterial = new StandardMaterial("controller-test-marker-material", scene);
			markerMaterial.emissiveColor = new Color3(0.25, 0.72, 0.65);
			marker.material = markerMaterial;

			const createDirectionMarker = (name: string, position: Vector3, color: Color3) => {
				const directionMarker = MeshBuilder.CreateBox(name, { width: 0.8, height: 0.2, depth: 0.8 }, scene);
				directionMarker.position = position;
				const material = new StandardMaterial(`${name}-material`, scene);
				material.emissiveColor = color;
				directionMarker.material = material;
			};
			createDirectionMarker("world-positive-z", new Vector3(0, 0.1, 3), new Color3(0.2, 0.65, 1));
			createDirectionMarker("world-positive-x", new Vector3(3, 0.1, 0), new Color3(1, 0.35, 0.3));
			createDirectionMarker("world-negative-z", new Vector3(0, 0.1, -3), new Color3(1, 0.75, 0.2));

			const getCameraBasis = () => {
				const forward = camera?.getDirection(Vector3.Forward()) ?? Vector3.Forward();
				forward.y = 0;
				forward.normalize();
				const right = Vector3.Cross(Vector3.Up(), forward).normalize();
				return {
					forward: { x: forward.x, z: forward.z },
					right: { x: right.x, z: right.z },
				};
			};

			controller = new SceneInputController({
				controllerId: "controller-test",
				source: "keyboard",
				getCameraBasis,
				skillBindings: { Space: "basic_attack" },
				onAction: appendAction,
			});
			const movementBuffer = controller.getMovementStateBuffer();
			let lastProducerRevision = 0;
			let lastConsumedRevision = 0;
			let tickSequence = 0;

			scene.registerBeforeRender(() => {
				if (!camera || !controller) return;
				setYaw(camera.alpha);
				setPressedKeys(controller.getPressedKeys());
				controller.updateMovementState();

				const snapshot = readSharedMovementState(movementBuffer);
				if (snapshot === null || snapshot.revision === lastProducerRevision) return;
				lastProducerRevision = snapshot.revision;
				setProducerState(snapshot);
				setPublishedCount(snapshot.revision / 2);
			});

			const initialState = readSharedMovementState(movementBuffer);
			if (initialState !== null) {
				lastProducerRevision = initialState.revision;
				setProducerState(initialState);
				setPublishedCount(initialState.revision / 2);
			}

			tickTimer = window.setInterval(() => {
				tickSequence += 1;
				setTickCount(tickSequence);
				const snapshot = readSharedMovementState(movementBuffer);
				if (snapshot === null) {
					setUnstableReadCount((count) => count + 1);
					return;
				}
				setConsumerState(snapshot);
				if (snapshot.revision === lastConsumedRevision) return;

				const skippedPublications = Math.max(0, (snapshot.revision - lastConsumedRevision) / 2 - 1);
				lastConsumedRevision = snapshot.revision;
				setConsumedRevisionCount((count) => count + 1);
				setOverwrittenCount((count) => count + skippedPublications);
				const sample = { tick: tickSequence, sampledAtMs: performance.now(), state: snapshot };
				console.log("[controller-test:tick]", sample);
				setTickSamples((current) => [sample, ...current].slice(0, MAX_LOG_ENTRIES));
			}, 1000 / TEST_TICK_HZ);

			engine.runRenderLoop(() => scene?.render());
			window.addEventListener("resize", handleResize);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : String(cause));
		}
	});

	onCleanup(() => {
		window.removeEventListener("resize", handleResize);
		if (tickTimer !== undefined) window.clearInterval(tickTimer);
		controller?.dispose();
		scene?.dispose();
		engine?.dispose();
	});

	return (
		<main class="grid h-full min-h-0 w-full grid-rows-[minmax(14rem,45%)_minmax(0,1fr)] overflow-hidden bg-slate-950 text-slate-100 lg:grid-cols-[minmax(0,1fr)_30rem] lg:grid-rows-1">
			<div class="relative min-h-0 border-b border-slate-700 lg:border-r lg:border-b-0">
				<canvas ref={canvas} class="absolute inset-0 h-full w-full touch-none outline-none">
					当前浏览器不支持 canvas。
				</canvas>
				<div class="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-3 text-xs font-medium">
					<span class="text-sky-400">蓝：世界 +Z</span>
					<span class="text-red-400">红：世界 +X</span>
					<span class="text-amber-400">黄：世界 -Z</span>
				</div>
			</div>

			<section class="flex min-h-0 flex-col gap-4 overflow-hidden p-4">
				<header class="flex items-start justify-between gap-3 border-b border-slate-700 pb-3">
					<div>
						<h1 class="text-lg font-semibold">控制器 SAB 测试</h1>
						<p class="mt-1 text-xs text-slate-400">模拟 Engine Tick：{TEST_TICK_HZ} Hz</p>
					</div>
					<Button level="quaternary" onClick={clearLogs} aria-label="清空采样记录">
						清空记录
					</Button>
				</header>

				<Show when={error()}>
					{(message) => <p class="border border-red-700 p-3 text-sm text-red-300">{message()}</p>}
				</Show>

				<dl class="grid grid-cols-3 gap-x-3 gap-y-3 border-b border-slate-700 pb-4 text-xs">
					<div>
						<dt class="text-slate-400">相机 yaw</dt>
						<dd class="mt-1 font-mono">{yaw().toFixed(3)}</dd>
					</div>
					<div class="col-span-2">
						<dt class="text-slate-400">当前按键</dt>
						<dd class="mt-1 break-words font-mono">{pressedKeys().join(" + ") || "无"}</dd>
					</div>
					<div>
						<dt class="text-slate-400">SAB 发布</dt>
						<dd class="mt-1 font-mono text-cyan-300">{publishedCount()}</dd>
					</div>
					<div>
						<dt class="text-slate-400">Tick 数</dt>
						<dd class="mt-1 font-mono">{tickCount()}</dd>
					</div>
					<div>
						<dt class="text-slate-400">新版本消费</dt>
						<dd class="mt-1 font-mono text-emerald-300">{consumedRevisionCount()}</dd>
					</div>
					<div>
						<dt class="text-slate-400">中间版本覆盖</dt>
						<dd class="mt-1 font-mono text-amber-300">{overwrittenCount()}</dd>
					</div>
					<div>
						<dt class="text-slate-400">不稳定读取</dt>
						<dd class="mt-1 font-mono">{unstableReadCount()}</dd>
					</div>
				</dl>

				<div class="grid grid-cols-2 gap-3 border-b border-slate-700 pb-4 text-xs">
					<div class="min-w-0 border-l-2 border-cyan-500 pl-3">
						<div class="text-slate-400">场景最新发布</div>
						<div class="mt-1 truncate font-mono">revision {producerState()?.revision ?? "-"}</div>
						<div class="mt-1 font-mono">{formatDirection(producerState())}</div>
					</div>
					<div class="min-w-0 border-l-2 border-emerald-500 pl-3">
						<div class="text-slate-400">Tick 最新消费</div>
						<div class="mt-1 truncate font-mono">revision {consumerState()?.revision ?? "-"}</div>
						<div class="mt-1 font-mono">{formatDirection(consumerState())}</div>
					</div>
				</div>

				<div class="grid min-h-0 flex-1 grid-cols-2 gap-4 overflow-hidden">
					<section class="min-h-0 overflow-y-auto">
						<h2 class="mb-2 text-xs font-medium text-slate-400">Tick 新版本</h2>
						<For each={tickSamples()} fallback={<p class="text-xs text-slate-500">暂无采样</p>}>
							{(sample) => (
								<div class="mb-2 border-l border-slate-600 pl-2 text-[11px] leading-relaxed">
									<div class="font-mono">
										tick {sample.tick} / rev {sample.state.revision}
									</div>
									<div class="font-mono text-slate-400">{formatDirection(sample.state)}</div>
								</div>
							)}
						</For>
					</section>
					<section class="min-h-0 overflow-y-auto">
						<h2 class="mb-2 text-xs font-medium text-slate-400">离散动作</h2>
						<For each={actions()} fallback={<p class="text-xs text-slate-500">暂无动作</p>}>
							{(action) => (
								<pre class="mb-2 overflow-x-auto border-l border-violet-500 pl-2 text-[10px] leading-relaxed text-slate-300">
									{JSON.stringify(action, null, 2)}
								</pre>
							)}
						</For>
					</section>
				</div>
			</section>
		</main>
	);
}
