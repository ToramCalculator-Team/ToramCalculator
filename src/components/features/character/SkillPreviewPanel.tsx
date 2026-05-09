import { createEffect, createSignal, For, Show } from "solid-js";
import { Button } from "~/components/controls/button";
import { useEngine } from "~/lib/engine/core/thread/EngineContext";

export interface SkillRow {
	id: string;
	name: string;
	level: number;
	damage: number;
	loading: boolean;
	/** 技能执行失败时的错误信息（无变体、无目标等） */
	error?: string;
}

/**
 * 技能伤害预览面板。
 *
 * 对每个已习得技能，通过原子分支任务（BranchTask）计算 DPS：
 *   1. 从主引擎捕获检查点
 *   2. 为每个技能创建分支任务（注入对应 skillId 的动作序列）
 *   3. 通过 batchPool 并行执行所有分支任务
 *   4. 收集伤害结果并展示
 */
export function SkillPreviewPanel(props: { memberId: string }) {
	const engine = useEngine();
	const [skills, setSkills] = createSignal<SkillRow[]>([]);
	const [computing, setComputing] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);

	const compute = async () => {
		const memberId = props.memberId;
		if (!memberId || !engine.ready()) return;

		setComputing(true);
		setError(null);
		setSkills([]);

		try {
			const defaultEngine = engine.service.getDefaultEngine();

			// 1. 获取成员已习得的技能列表
			const rawSkills = await defaultEngine.getComputedSkills(memberId);
			const skillList = (rawSkills as Array<{
				id: string; name: string; level: number; computed: { isAvailable: boolean; mpCost: number };
			}>).filter((s) => s.computed?.isAvailable ?? true);

			if (skillList.length === 0) {
				setSkills([]);
				setComputing(false);
				return;
			}

			setSkills(skillList.map((s) => ({ id: s.id, name: s.name, level: s.level, damage: 0, loading: true })));

			// 2. 捕获检查点 + 表达式字典
			const [checkpoint, exprDict] = await Promise.all([
				defaultEngine.captureCheckpoint(),
				defaultEngine.exportExprDict(),
			]);

			// 3. 为每个技能构建原子分支任务
			const tasks = skillList.map((skill) => ({
				checkpoint,
				exprDict,
				patches: [{
					type: "action_sequence" as const,
					memberId,
					sequence: [{ skillId: skill.id }],
				}],
				runtimeConfig: {
					stopPolicy: { kind: "untilMemberActionEnds", memberId },
					outputPolicy: "returnPreviewReport",
				} as Record<string, unknown>,
				outputSelector: { type: "dps_impact" as const },
			}));

			// 4. 并行执行所有分支任务
			const results = await engine.service.executeBranchBatch(tasks as Parameters<typeof engine.service.executeBranchBatch>[0]);

			// 5. 更新结果
			setSkills((prev) =>
				prev.map((row, i) => {
					const res = results[i];
					if (!res || !res.ok) {
						return { ...row, loading: false, damage: 0, error: res?.error ?? "task failed" };
					}
					const data = res.data as { damage?: number; error?: string };
					return { ...row, loading: false, damage: data.damage ?? 0, error: data.error };
				}),
			);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setComputing(false);
		}
	};

	createEffect(() => {
		if (props.memberId && engine.ready()) {
			void compute();
		}
	});

	return (
		<div class="SkillPreviewPanel flex flex-col gap-3">
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-bold">技能伤害预览</h2>
				<Show when={skills().length > 0}>
					<Button
						onClick={() => compute()}
						class="text-xs text-link-color hover:underline"
						disabled={computing()}
					>
						{computing() ? "计算中..." : "重新计算"}
					</Button>
				</Show>
			</div>

			<Show when={computing()}>
				<div class="flex items-center gap-2 text-sm text-muted-color">
					<span class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
					计算中...
				</div>
			</Show>

			<Show when={error()}>
				<div class="rounded bg-error-bg p-2 text-sm text-error-color">{error()}</div>
			</Show>

			<Show
				when={skills().length > 0}
				fallback={
					<div class="text-sm text-muted-color italic">
						{computing() ? "" : "暂无可用的技能数据，请先在配置面板中添加技能"}
					</div>
				}
			>
				<div class="flex flex-col gap-1">
					<div class="flex gap-2 rounded bg-black/5 px-3 py-1.5 text-xs font-semibold dark:bg-white/5">
						<span class="flex-1">技能</span>
						<span class="w-20 text-right">等级</span>
						<span class="w-28 text-right">伤害</span>
					</div>
					<For each={skills()}>
						{(skill) => (
							<div class="flex items-center gap-2 rounded px-3 py-2 odd:bg-black/5 dark:odd:bg-white/5">
								<div class="flex-1 truncate text-sm">{skill.name}</div>
								<div class="w-20 text-right text-xs text-muted-color">Lv.{skill.level}</div>
								<div class="w-28 text-right text-sm font-mono tabular-nums">
									<Show when={!skill.loading} fallback={<span class="text-muted-color">...</span>}>
										<Show
											when={skill.error}
											fallback={
												<span class={skill.damage > 0 ? "text-success-color" : "text-muted-color"}>
													{skill.damage.toLocaleString()}
												</span>
											}
										>
											<span class="text-xs text-error-color" title={skill.error}>错误</span>
										</Show>
									</Show>
								</div>
								<Show when={skill.error}>
									<div class="text-xs text-error-color" title={skill.error}>⚠</div>
								</Show>
							</div>
						)}
					</For>
				</div>
			</Show>
		</div>
	);
}
