import { A } from "@solidjs/router";
import { createMemo, createResource, For, onMount, Show } from "solid-js";
import { Button } from "~/components/controls/button";
import { Select } from "~/components/controls/select";
import { Icons } from "~/components/icons";
import type { RunInputRecord } from "~/lib/engine/core/runOutput";
import { collectTickStateHistoryDiagnostics } from "~/lib/engine/core/tickStateHistory";
import { projectRunComparisonMetrics, type RunComparisonMetric } from "~/features/simulator/analysis";
import { useSimulatorSession } from "~/features/simulator/SimulatorSession";
import { completeSimulatorPerformanceMeasureAfterPaint } from "~/features/simulator/simulatorPerformance";

const inputActionLabel = (input: RunInputRecord) => {
	return "skillId" in input.action.payload
		? `${input.action.type} (${input.action.payload.skillId})`
		: input.action.type;
};

const signed = (value: number, fractionDigits: number) => `${value >= 0 ? "+" : ""}${value.toFixed(fractionDigits)}`;

const simulationTime = (timeMs: number) => `${(timeMs / 1000).toFixed(3)}s`;

const relativePercent = (value: number | null) =>
	value === null ? "不可计算" : `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;

const metricValue = (metric: RunComparisonMetric, value: number) => {
	if (metric.key === "durationMs") return `${(value / 1000).toFixed(2)}s`;
	if (metric.key === "totalDamage") return value.toFixed(0);
	return value.toFixed(2);
};

const metricDelta = (metric: RunComparisonMetric) => {
	if (metric.key === "durationMs") return `${signed(metric.delta / 1000, 2)}s`;
	return signed(metric.delta, metric.key === "totalDamage" ? 0 : 2);
};

function RejectedInputs(props: { inputs: RunInputRecord[] }) {
	const rejected = createMemo(() => props.inputs.filter((input) => input.status === "rejected"));
	return (
		<Show when={rejected().length > 0}>
			<div class="text-accent-color-70 mt-2">
				<strong>被拒绝输入 {rejected().length}</strong>
				<For each={rejected()}>
					{(input) => (
						<p>
							{simulationTime(input.timeMs)}: {inputActionLabel(input)} · {input.reason ?? "未提供原因"}
						</p>
					)}
				</For>
			</div>
		</Show>
	);
}

export function SimulatorAnalysisView() {
	const session = useSimulatorSession();
	onMount(() =>
		completeSimulatorPerformanceMeasureAfterPaint("finish-to-analysis", () => {
			if (!import.meta.env.DEV) return;
			const latestRun = session.runRecords().at(-1);
			if (!latestRun) return;
			const report = () => {
				try {
					console.info("[Simulator][TickHistoryReader]", {
						runId: latestRun.id,
						...collectTickStateHistoryDiagnostics(latestRun.output.stateHistory),
					});
				} catch (error) {
					console.error("[Simulator][TickHistoryReader] 诊断失败", error);
				}
			};
			if (typeof requestIdleCallback === "function") requestIdleCallback(report, { timeout: 1_000 });
			else setTimeout(report, 0);
		}),
	);
	const copy = createMemo(() => session.currentDesignCopy());
	const copyOptions = createMemo(() =>
		session.designCopies().map((item, index) => ({
			value: item.id,
			label: `方案 ${index + 1}${item.hasRun ? " · 已验证" : ""}`,
		})),
	);
	const runOptions = createMemo(() =>
		session.runRecords().map((record, index) => ({
			value: record.id,
			label: `运行 ${index + 1} · ${simulationTime(record.output.durationMs)}`,
		})),
	);
	const [latestSummary] = createResource(
		() => session.runRecords().at(-1)?.id,
		(runId) => (runId ? session.readSummary(runId) : null),
	);
	const [comparison, { refetch: refetchComparison }] = createResource(
		() => session.selectedRunIds().join(":"),
		() => session.readComparison(),
	);

	return (
		<>
			<div class="pointer-events-auto absolute left-3 top-3 flex max-w-[min(94vw,760px)] items-start gap-2">
				<A href="/simulator" class="bg-primary-color-70 hidden rounded px-3 py-2 backdrop-blur-md landscape:flex">
					<Icons.Brand.NoPaddingLogoText class="h-6 w-40" />
				</A>
				<div class="bg-primary-color-80 border-dividing-color flex min-w-72 flex-col gap-2 rounded border p-3 backdrop-blur-md">
					<div class="flex items-center justify-between gap-3">
						<strong>{copy()?.design.name || "未命名 Simulator"}</strong>
						<span class="text-accent-color-70 text-xs">分析</span>
					</div>
					<Select
						value={copy()?.id ?? ""}
						setValue={(copyId) => session.send({ type: "design.copy.selected", copyId })}
						options={copyOptions()}
						placeholder="选择设计副本"
					/>
					<Button level="secondary" onClick={() => session.send({ type: "session.end.requested" })}>
						结束会话
					</Button>
					<Show when={session.error()}>{(message) => <p class="text-danger-color text-sm">{message()}</p>}</Show>
				</div>
			</div>

			<div class="pointer-events-auto absolute bottom-3 left-3 right-3 top-28 overflow-y-auto">
				<div class="bg-primary-color-90 border-dividing-color mx-auto flex max-w-5xl flex-col gap-4 rounded border p-4 backdrop-blur-md">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<h2 class="font-bold">运行分析</h2>
						<Button level="secondary" onClick={() => session.send({ type: "validation.returnToDesign.requested" })}>
							返回设计
						</Button>
					</div>
					<Show when={latestSummary()}>
						{(summary) => (
							<>
								<section class="grid grid-cols-1 gap-2 sm:grid-cols-3">
									<div class="border-dividing-color border p-3">
										<span class="text-xs">时长</span>
										<strong class="block">{(summary().durationMs / 1000).toFixed(2)}s</strong>
									</div>
									<div class="border-dividing-color border p-3">
										<span class="text-xs">总伤害</span>
										<strong class="block">{summary().totalDamage.toFixed(0)}</strong>
									</div>
									<div class="border-dividing-color border p-3">
										<span class="text-xs">平均 DPS</span>
										<strong class="block">{summary().dps.toFixed(2)}</strong>
									</div>
								</section>
								<section class="border-dividing-color mt-3 overflow-x-auto border">
									<table class="w-full min-w-[560px] text-left text-sm">
										<thead>
											<tr class="border-dividing-color border-b">
												<th class="p-2">技能</th>
												<th class="p-2">释放</th>
												<th class="p-2">命中</th>
												<th class="p-2">伤害</th>
												<th class="p-2">占比</th>
												<th class="p-2">平均/次</th>
											</tr>
										</thead>
										<tbody>
											<For each={summary().skills}>
												{(skill) => (
													<tr class="border-dividing-color border-b">
														<td class="p-2">{skill.skillName}</td>
														<td class="p-2">{skill.releaseCount}</td>
														<td class="p-2">{skill.hitCount}</td>
														<td class="p-2">{skill.totalDamage.toFixed(0)}</td>
														<td class="p-2">{(skill.damageShare * 100).toFixed(1)}%</td>
														<td class="p-2">{skill.averageDamagePerRelease.toFixed(1)}</td>
													</tr>
												)}
											</For>
										</tbody>
									</table>
									<div class="p-2 text-xs">
										成功技能顺序：
										{summary()
											.successfulSkillSequence.map((skill) => `${simulationTime(skill.timeMs)}:${skill.skillName}`)
											.join(" → ") || "无"}
									</div>
								</section>
							</>
						)}
					</Show>
					<Show when={session.runRecords().length > 0}>
						<section class="border-dividing-color border p-3">
							<h3 class="mb-2 text-sm font-bold">行动录制</h3>
							<div class="flex flex-wrap gap-2">
								<For each={session.runRecords()}>
									{(record, index) => (
										<Button
											level="secondary"
											onClick={() => session.send({ type: "run.behavior.save.requested", runId: record.id })}
										>
											运行 {index() + 1} 保存为成员流程
										</Button>
									)}
								</For>
							</div>
						</section>
					</Show>
					<section class="grid grid-cols-1 gap-2 md:grid-cols-2">
						<Select
							value={session.selectedRunIds()[0] ?? ""}
							setValue={(value) => {
								session.send({ type: "run.selected", side: "A", runId: value || null });
								void refetchComparison();
							}}
							options={runOptions()}
							placeholder="选择运行 A"
						/>
						<Select
							value={session.selectedRunIds()[1] ?? ""}
							setValue={(value) => {
								session.send({ type: "run.selected", side: "B", runId: value || null });
								void refetchComparison();
							}}
							options={runOptions()}
							placeholder="选择运行 B"
						/>
					</section>
					<Show when={comparison()}>
						{(result) => (
							<section class="border-dividing-color border p-3">
								<h3 class="mb-2 text-sm font-bold">运行结果 A/B 对比</h3>
								<div class="overflow-x-auto">
									<table class="w-full min-w-[620px] text-left text-sm">
										<thead>
											<tr class="border-dividing-color border-b">
												<th class="p-2">指标</th>
												<th class="p-2">A</th>
												<th class="p-2">B</th>
												<th class="p-2">B - A</th>
												<th class="p-2">相对 A</th>
											</tr>
										</thead>
										<tbody>
											<For each={projectRunComparisonMetrics(result())}>
												{(metric) => (
													<tr class="border-dividing-color border-b last:border-b-0">
														<td class="p-2">{metric.label}</td>
														<td class="p-2">{metricValue(metric, metric.a)}</td>
														<td class="p-2">{metricValue(metric, metric.b)}</td>
														<td class="p-2">{metricDelta(metric)}</td>
														<td class="p-2">{relativePercent(metric.percentFromA)}</td>
													</tr>
												)}
											</For>
										</tbody>
									</table>
								</div>
								<Show when={result().characterA && result().characterB && result().characterDelta}>
									<div class="mt-3 overflow-x-auto">
										<table class="w-full min-w-[520px] text-left text-xs">
											<thead>
												<tr>
													<th class="p-1">输入</th>
													<th class="p-1">A</th>
													<th class="p-1">B</th>
													<th class="p-1">差值</th>
												</tr>
											</thead>
											<tbody>
												<For each={["level", "str", "int", "vit", "agi", "dex", "baseStatTotal"] as const}>
													{(field) => (
														<tr class="border-dividing-color border-t">
															<td class="p-1">{field}</td>
															<td class="p-1">{result().characterA?.[field]}</td>
															<td class="p-1">{result().characterB?.[field]}</td>
															<td class="p-1">{result().characterDelta?.[field]}</td>
														</tr>
													)}
												</For>
											</tbody>
										</table>
									</div>
								</Show>
								<div class="mt-3 grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
									<div>
										<strong>A 已接纳操作</strong>
										<p>
											{result()
												.a.successfulSkillSequence.map((skill) => `${simulationTime(skill.timeMs)}:${skill.skillName}`)
												.join(" → ") || "无"}
										</p>
										<RejectedInputs inputs={result().inputsA} />
									</div>
									<div>
										<strong>B 已接纳操作</strong>
										<p>
											{result()
												.b.successfulSkillSequence.map((skill) => `${simulationTime(skill.timeMs)}:${skill.skillName}`)
												.join(" → ") || "无"}
										</p>
										<RejectedInputs inputs={result().inputsB} />
									</div>
								</div>
								<p class="text-accent-color-70 mt-3 text-xs">
									这里只陈述两次运行的输入、操作与结果差异，不作单变量因果判断。
								</p>
							</section>
						)}
					</Show>
				</div>
			</div>
		</>
	);
}
