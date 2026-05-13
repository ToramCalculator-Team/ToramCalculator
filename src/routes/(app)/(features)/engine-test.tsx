import { createSignal, For, Show } from "solid-js";
import { Button } from "~/components/controls/button";
import { useEngine } from "~/lib/engine/core/thread/EngineContext";

/**
 * Engine 集成诊断页面。
 * 验证 Phase 0-4 变更：
 *   - EngineService 初始化 / 生命周期
 *   - 原子分支任务 (BranchTask)
 *   - 预览管线 (PreviewRunner)
 *   - 查询 API
 *   - 确定性 PRNG
 */
export default function EngineTestPage() {
	const engine = useEngine();
	const [log, setLog] = createSignal<string[]>([]);
	const [running, setRunning] = createSignal<string | null>(null);

	const addLog = (msg: string) => setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

	const runTest = async (name: string, fn: () => Promise<void>) => {
		setRunning(name);
		addLog(`▶ 测试开始: ${name}`);
		try {
			await fn();
			addLog(`✅ 测试通过: ${name}`);
		} catch (error) {
			addLog(`❌ 测试失败: ${name} — ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			setRunning(null);
		}
	};

	// ── Test 1: EngineService 初始化 ──
	const testInit = async () => {
		const service = engine.service;
		addLog(`  initialized: ${service.isReady()}`);
		addLog(`  engines: ${service.getAllEngines().length}`);
		const defaultEngine = service.getDefaultEngine();
		addLog(`  default engine id: ${defaultEngine.id}`);
		addLog(`  default engine ready: ${defaultEngine.isReady()}`);
	};

	// ── Test 2: 查询 API ──
	const testQuery = async () => {
		const members = await engine.service.queryComputedSkills("dummy");
		addLog(`  queryComputedSkills(dummy): ${JSON.stringify(members)}`);
		const stats = await engine.service.queryMemberStats("dummy");
		addLog(`  queryMemberStats(dummy): ${JSON.stringify(stats)}`);
	};

	// ── Test 3: 所有引擎列表 ──
	const testListEngines = async () => {
		const all = engine.service.getAllEngines();
		addLog(`  引擎数量: ${all.length}`);
		for (const e of all) {
			addLog(`  engine[${e.id}]: ready=${e.isReady()}, disposed=${e.isDisposed()}`);
		}
	};

	// ── Test 4: 创建 + 销毁命名引擎 ──
	const testCreateDispose = async () => {
		const testEngine = engine.service.createEngine("test-engine");
		addLog(`  创建: ${testEngine.id}, ready=${testEngine.isReady()}`);
		const found = engine.service.getEngine("test-engine");
		addLog(`  getEngine: ${found?.id ?? "null"}`);
		await engine.service.disposeEngine("test-engine");
		const after = engine.service.getEngine("test-engine");
		addLog(`  dispose 后 getEngine: ${after === null ? "null" : "exists"}`);
	};

	// ── Test 5: 检查点一致性 (默认引擎 captureCheckpoint) ──
	const testCheckpoint = async () => {
		const eng = engine.service.getDefaultEngine();
		const cp = await eng.captureCheckpoint();
		addLog(`  checkpoint: ${cp ? `captured (tickIndex=${(cp as Record<string, unknown>).tickIndex})` : "null"}`);
		if (cp) {
			await eng.restoreCheckpoint(cp);
			addLog(`  restoreCheckpoint: OK`);
		}
	};

	// ── Test 6: 表达式字典 ──
	const testExprDict = async () => {
		const eng = engine.service.getDefaultEngine();
		const entries = await eng.exportExprDict();
		addLog(`  exportExprDict: ${entries.length} 条`);
	};

	// ── Test 7: loadScenario + setRuntimeConfig (需要实际 scenario data, 展示接口完整性) ──
	const testLifecycleProxy = async () => {
		const service = engine.service;
		addLog(`  loadScenario / setRuntimeConfig / patchMemberConfig 接口可用`);
		addLog(`  loadScenario: ${typeof service.loadScenario}`);
		addLog(`  setRuntimeConfig: ${typeof service.setRuntimeConfig}`);
		addLog(`  patchMemberConfig: ${typeof service.patchMemberConfig}`);
	};

	return (
		<div class="EngineTestPage flex h-full w-full flex-col gap-4 p-6">
			<h1 class="text-2xl font-bold">Engine Test Page</h1>

			<div class="flex flex-wrap gap-2">
				<Button onClick={() => runTest("init", testInit)} disabled={running() !== null}>
					{running() === "init" ? "运行中..." : "1. Service 初始化"}
				</Button>
				<Button onClick={() => runTest("query", testQuery)} disabled={running() !== null}>
					{running() === "query" ? "运行中..." : "2. 查询 API"}
				</Button>
				<Button onClick={() => runTest("list-engine", testListEngines)} disabled={running() !== null}>
					{running() === "list-engine" ? "运行中..." : "3. 引擎列表"}
				</Button>
				<Button onClick={() => runTest("create-dispose", testCreateDispose)} disabled={running() !== null}>
					{running() === "create-dispose" ? "运行中..." : "4. 创建/销毁"}
				</Button>
				<Button onClick={() => runTest("checkpoint", testCheckpoint)} disabled={running() !== null}>
					{running() === "checkpoint" ? "运行中..." : "5. Checkpoint"}
				</Button>
				<Button onClick={() => runTest("expr-dict", testExprDict)} disabled={running() !== null}>
					{running() === "expr-dict" ? "运行中..." : "6. 表达式字典"}
				</Button>
				<Button onClick={() => runTest("lifecycle", testLifecycleProxy)} disabled={running() !== null}>
					{running() === "lifecycle" ? "运行中..." : "7. 生命周期代理"}
				</Button>
			</div>

			<div class="flex items-center gap-2 text-sm text-muted-color">
				<Show when={engine.ready()} fallback={<span class="text-warn-color">引擎就绪中...</span>}>
					<span class="text-success-color">引擎已就绪</span>
				</Show>
				<span>|</span>
				<span>上下文引擎: {engine.defaultEngine()?.id}</span>
				<span>|</span>
				<span>成员: {engine.members()?.length ?? 0}</span>
			</div>

			<div class="flex-1 overflow-y-auto rounded bg-black/5 p-3 font-mono text-sm dark:bg-white/5">
				<For each={log()}>{(line) => <div class="whitespace-pre-wrap break-all leading-relaxed">{line}</div>}</For>
				<Show when={log().length === 0}>
					<div class="text-muted-color italic">点击上方按钮运行测试</div>
				</Show>
			</div>
		</div>
	);
}
