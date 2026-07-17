import { getDB } from "@db/repositories/database";
import { createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js";
import { createCharacterLiveModel } from "~/features/character/data/CharacterLiveModel";
import type { CharacterEdit } from "~/features/character/edit/characterEditProtocol";
import { persistCharacterEditBatch } from "~/features/character/edit/persistCharacterEdits";
import { CharacterEditQueue } from "~/features/character/session/CharacterEditQueue";

const DEFAULT_CHARACTER_ID = "defaultCharacterId";
const DEFAULT_PLAYER_ID = "defaultPlayerId";
const FORMAL_SAMPLE_COUNT = 100;
const WARMUP_SAMPLE_COUNT = 10;
const OPERATION_INTERVAL_MS = 100;

type PendingInputMeasurement = {
	sequence: number;
	delta: -1 | 1;
	startedAt: number;
	startedAtEpochMs: number;
	measured: boolean;
	batchId?: number;
	batchSize?: number;
	writeCompletedAt?: number;
};

type PendingBatchMeasurement = {
	batchId: number;
	targetValue: number;
	inputs: PendingInputMeasurement[];
};

type LatencyRecord = {
	sequence: number;
	batchId: number;
	batchSize: number;
	delta: -1 | 1;
	startedAtEpochMs: number;
	targetValue: number;
	aggregateRevision: number;
	writeMs: number;
	liveMs: number;
	nextFrameMs: number;
};

type MetricField = "writeMs" | "liveMs" | "nextFrameMs";

type MetricSummary = {
	average: number;
	p50: number;
	p95: number;
	max: number;
};

const roundMs = (value: number) => Math.round(value * 100) / 100;
const delay = (durationMs: number) => new Promise<void>((resolve) => window.setTimeout(resolve, durationMs));

const percentile = (sortedValues: readonly number[], ratio: number): number => {
	if (sortedValues.length === 0) return 0;
	const index = Math.max(0, Math.ceil(sortedValues.length * ratio) - 1);
	return sortedValues[index] ?? 0;
};

const summarize = (records: readonly LatencyRecord[], field: MetricField): MetricSummary | null => {
	if (records.length === 0) return null;
	const values = records.map((record) => record[field]).sort((left, right) => left - right);
	return {
		average: roundMs(values.reduce((total, value) => total + value, 0) / values.length),
		p50: roundMs(percentile(values, 0.5)),
		p95: roundMs(percentile(values, 0.95)),
		max: roundMs(values.at(-1) ?? 0),
	};
};

export default function RangeLatencyPage() {
	const liveModel = createCharacterLiveModel({
		playerId: DEFAULT_PLAYER_ID,
		characterId: DEFAULT_CHARACTER_ID,
	});
	const [snapshot, setSnapshot] = createSignal(liveModel.getSnapshot(), { equals: false });
	const releaseLiveModel = liveModel.subscribe(setSnapshot);
	liveModel.start();
	const currentStr = createMemo(() => snapshot().aggregate?.character.str);
	const [queueStatus, setQueueStatus] = createSignal<"idle" | "committing" | "failed">("idle");
	const [running, setRunning] = createSignal(false);
	const [error, setError] = createSignal<string>();
	const [records, setRecords] = createSignal<readonly LatencyRecord[]>([]);
	const [latestCommittedValue, setLatestCommittedValue] = createSignal<number>();
	let sequence = 0;
	let batchSequence = 0;
	let benchmarkGeneration = 0;
	let pendingInputsByEdit = new Map<CharacterEdit, PendingInputMeasurement>();
	let pendingBatches: PendingBatchMeasurement[] = [];

	const observeLiveValue = (value: number | undefined, aggregateRevision: number) => {
		if (value === undefined || pendingBatches.length === 0) return;
		let matchedIndex = -1;
		for (let index = 0; index < pendingBatches.length; index += 1) {
			if (pendingBatches[index]?.targetValue === value) matchedIndex = index;
		}
		if (matchedIndex < 0) return;
		const convergedBatches = pendingBatches.splice(0, matchedIndex + 1);
		const liveUpdatedAt = performance.now();
		requestAnimationFrame(() => {
			const nextFrameAt = performance.now();
			const completed = convergedBatches.flatMap((batch) =>
				batch.inputs
					.filter((input) => input.measured && input.writeCompletedAt !== undefined)
					.map(
						(input): LatencyRecord => ({
							sequence: input.sequence,
							batchId: batch.batchId,
							batchSize: input.batchSize ?? batch.inputs.length,
							delta: input.delta,
							startedAtEpochMs: input.startedAtEpochMs,
							targetValue: batch.targetValue,
							aggregateRevision,
							writeMs: roundMs((input.writeCompletedAt ?? nextFrameAt) - input.startedAt),
							liveMs: roundMs(liveUpdatedAt - input.startedAt),
							nextFrameMs: roundMs(nextFrameAt - input.startedAt),
						}),
					),
			);
			if (completed.length === 0) return;
			setRecords((current) => [...current, ...completed].sort((left, right) => left.sequence - right.sequence));
			console.table(completed);
		});
	};

	const editQueue = new CharacterEditQueue({
		persistBatch: async (characterId, edits) => {
			const batchId = ++batchSequence;
			const inputs = edits.flatMap((edit) => {
				const input = pendingInputsByEdit.get(edit);
				return input ? [input] : [];
			});
			for (const input of inputs) {
				input.batchId = batchId;
				input.batchSize = edits.length;
			}
			try {
				const database = await getDB();
				await persistCharacterEditBatch(database, characterId, edits);
				const writeCompletedAt = performance.now();
				for (const input of inputs) {
					input.writeCompletedAt = writeCompletedAt;
				}
				const committed = await database
					.selectFrom("character")
					.where("id", "=", characterId)
					.select("str")
					.executeTakeFirstOrThrow();
				setLatestCommittedValue(committed.str);
				if (inputs.some((input) => input.measured)) {
					pendingBatches.push({ batchId, targetValue: committed.str, inputs });
				}
				for (const edit of edits) pendingInputsByEdit.delete(edit);
				observeLiveValue(currentStr(), snapshot().aggregateRevision);
			} catch (cause) {
				setError(cause instanceof Error ? cause.message : String(cause));
				throw cause;
			}
		},
	});
	const releaseEditQueue = editQueue.subscribe((state) => {
		setQueueStatus(state.status);
		if (state.status === "failed") setError(state.error);
	});

	createEffect(() => {
		observeLiveValue(currentStr(), snapshot().aggregateRevision);
	});

	onCleanup(() => {
		benchmarkGeneration += 1;
		releaseEditQueue();
		editQueue.stop();
		releaseLiveModel();
		void liveModel.stop();
	});

	const acceptEdit = (edit: CharacterEdit, delta: -1 | 1, measured: boolean) => {
		setError(undefined);
		const input: PendingInputMeasurement = {
			sequence: measured ? ++sequence : 0,
			delta,
			startedAt: performance.now(),
			startedAtEpochMs: Date.now(),
			measured,
		};
		pendingInputsByEdit.set(edit, input);
		try {
			editQueue.accept(DEFAULT_CHARACTER_ID, edit);
		} catch (cause) {
			pendingInputsByEdit.delete(edit);
			setError(cause instanceof Error ? cause.message : String(cause));
		}
	};

	const adjustStrength = (delta: -1 | 1, measured = true) => {
		acceptEdit({ type: "character.numeric.adjust", field: "str", delta }, delta, measured);
	};

	const setStrength = (value: number) => {
		acceptEdit({ type: "character.numeric.set", field: "str", value }, 1, false);
	};

	const waitForSettled = async (generation: number, timeoutMs = 15_000) => {
		const startedAt = performance.now();
		while (generation === benchmarkGeneration) {
			const committedValue = latestCommittedValue();
			if (
				queueStatus() === "idle" &&
				pendingBatches.length === 0 &&
				(committedValue === undefined || currentStr() === committedValue)
			) {
				return;
			}
			if (queueStatus() === "failed") throw new Error(error() ?? "本地事务失败");
			if (performance.now() - startedAt > timeoutMs) throw new Error("等待数据库与 DOM 收敛超时");
			await delay(16);
		}
	};

	const runBenchmark = async () => {
		if (running() || snapshot().status !== "ready" || currentStr() === undefined) return;
		const generation = ++benchmarkGeneration;
		setRunning(true);
		setError(undefined);
		try {
			setStrength(100);
			await waitForSettled(generation);
			for (let index = 0; index < WARMUP_SAMPLE_COUNT; index += 1) {
				adjustStrength(1, false);
				await delay(OPERATION_INTERVAL_MS);
			}
			await waitForSettled(generation);
			sequence = 0;
			setRecords([]);
			for (let index = 0; index < FORMAL_SAMPLE_COUNT; index += 1) {
				adjustStrength(1, true);
				await delay(OPERATION_INTERVAL_MS);
			}
			await waitForSettled(generation, 30_000);
		} catch (cause) {
			if (generation === benchmarkGeneration) setError(cause instanceof Error ? cause.message : String(cause));
		} finally {
			if (generation === benchmarkGeneration) setRunning(false);
		}
	};

	const exportRecords = () => {
		const payload = {
			exportedAt: new Date().toISOString(),
			characterId: DEFAULT_CHARACTER_ID,
			operationIntervalMs: OPERATION_INTERVAL_MS,
			warmupSampleCount: WARMUP_SAMPLE_COUNT,
			formalSampleCount: records().length,
			records: records(),
		};
		const url = URL.createObjectURL(new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" }));
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = `range-latency-${new Date().toISOString().replaceAll(":", "-")}.json`;
		anchor.click();
		URL.revokeObjectURL(url);
	};

	const metricRows = createMemo(() => [
		{ label: "输入到本地事务完成", summary: summarize(records(), "writeMs") },
		{ label: "输入到完整聚合", summary: summarize(records(), "liveMs") },
		{ label: "输入到 DOM 下一帧", summary: summarize(records(), "nextFrameMs") },
	]);
	const formatMetric = (value: number | undefined) => (value === undefined ? "-" : `${value} ms`);

	return (
		<main class="h-full overflow-y-auto bg-white px-4 py-5 text-gray-950 sm:px-6 dark:bg-gray-950 dark:text-gray-50">
			<div class="mx-auto flex w-full max-w-5xl flex-col gap-6">
				<header class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4 dark:border-gray-800">
					<div>
						<h1 class="text-xl font-semibold">机体力量数据库响应延迟</h1>
						<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">{DEFAULT_CHARACTER_ID}</p>
					</div>
					<div class="flex flex-wrap gap-2">
						<button
							type="button"
							class="h-9 border border-gray-300 px-3 text-sm disabled:opacity-40 dark:border-gray-700"
							disabled={running() || snapshot().status !== "ready" || currentStr() === undefined}
							onClick={() => void runBenchmark()}
						>
							{running() ? "基准运行中" : "运行 100 次基准"}
						</button>
						<button
							type="button"
							class="h-9 border border-gray-300 px-3 text-sm disabled:opacity-40 dark:border-gray-700"
							disabled={records().length === 0}
							onClick={exportRecords}
						>
							导出 JSON
						</button>
					</div>
				</header>

				<section class="border-b border-gray-200 pb-6 dark:border-gray-800">
					<Show when={snapshot().status === "ready"} fallback={<div class="text-sm">数据库加载中...</div>}>
						<Show when={currentStr() !== undefined} fallback={<div class="text-sm">未找到测试机体</div>}>
							<div class="flex flex-wrap items-center gap-2">
								<button
									type="button"
									class="grid h-10 w-10 place-items-center border border-gray-300 text-xl disabled:opacity-40 dark:border-gray-700"
									disabled={running() || queueStatus() === "failed" || currentStr() === 1}
									onClick={() => adjustStrength(-1)}
									aria-label="力量减一"
								>
									-
								</button>
								<output class="grid h-10 min-w-28 place-items-center border-y border-gray-300 px-4 font-mono text-lg dark:border-gray-700">
									{currentStr()}
								</output>
								<button
									type="button"
									class="grid h-10 w-10 place-items-center border border-gray-300 text-xl disabled:opacity-40 dark:border-gray-700"
									disabled={running() || queueStatus() === "failed"}
									onClick={() => adjustStrength(1)}
									aria-label="力量加一"
								>
									+
								</button>
								<span class="ml-2 text-sm text-gray-500">{queueStatus()}</span>
							</div>
						</Show>
					</Show>
					<Show when={snapshot().error?.message ?? error()}>
						{(message) => <p class="mt-3 text-sm text-red-600">{message()}</p>}
					</Show>
					<Show when={queueStatus() === "failed"}>
						<div class="mt-3 flex gap-2">
							<button
								type="button"
								class="border border-gray-300 px-3 py-1 text-sm dark:border-gray-700"
								onClick={() => editQueue.retryFailed()}
							>
								重试失败修改
							</button>
							<button
								type="button"
								class="border border-gray-300 px-3 py-1 text-sm dark:border-gray-700"
								onClick={() => {
									pendingInputsByEdit = new Map();
									pendingBatches = [];
									editQueue.discardFailed();
								}}
							>
								放弃失败修改
							</button>
						</div>
					</Show>
				</section>

				<section class="overflow-x-auto">
					<table class="w-full border-collapse text-left text-sm">
						<thead>
							<tr class="border-b border-gray-200 dark:border-gray-800">
								<th class="py-2 font-medium">阶段</th>
								<th class="py-2 font-medium">平均</th>
								<th class="py-2 font-medium">P50</th>
								<th class="py-2 font-medium">P95</th>
								<th class="py-2 font-medium">最大值</th>
							</tr>
						</thead>
						<tbody>
							<For each={metricRows()}>
								{(metric) => (
									<tr class="border-b border-gray-100 dark:border-gray-900">
										<td class="py-2">{metric.label}</td>
										<td class="py-2 font-mono">{formatMetric(metric.summary?.average)}</td>
										<td class="py-2 font-mono">{formatMetric(metric.summary?.p50)}</td>
										<td class="py-2 font-mono">{formatMetric(metric.summary?.p95)}</td>
										<td class="py-2 font-mono">{formatMetric(metric.summary?.max)}</td>
									</tr>
								)}
							</For>
						</tbody>
					</table>
					<div class="mt-2 text-sm text-gray-500">
						正式样本 {records().length} / {FORMAL_SAMPLE_COUNT}
					</div>
				</section>

				<section class="overflow-x-auto">
					<table class="w-full border-collapse text-left text-sm">
						<thead>
							<tr class="border-b border-gray-200 dark:border-gray-800">
								<th class="py-2 font-medium">#</th>
								<th class="py-2 font-medium">批次</th>
								<th class="py-2 font-medium">操作数</th>
								<th class="py-2 font-medium">聚合 revision</th>
								<th class="py-2 font-medium">事务完成</th>
								<th class="py-2 font-medium">完整聚合</th>
								<th class="py-2 font-medium">DOM 下一帧</th>
							</tr>
						</thead>
						<tbody>
							<For each={records()}>
								{(record) => (
									<tr class="border-b border-gray-100 font-mono dark:border-gray-900">
										<td class="py-2">{record.sequence}</td>
										<td class="py-2">{record.batchId}</td>
										<td class="py-2">{record.batchSize}</td>
										<td class="py-2">{record.aggregateRevision}</td>
										<td class="py-2">{record.writeMs} ms</td>
										<td class="py-2">{record.liveMs} ms</td>
										<td class="py-2">{record.nextFrameMs} ms</td>
									</tr>
								)}
							</For>
						</tbody>
					</table>
				</section>
			</div>
		</main>
	);
}
