import type { CharacterSkillWithRelations } from "@db/generated/repositories/character_skill";
import { createMemo, For, Show } from "solid-js";
import { Button } from "~/components/controls/button";
import { useCharacterSession } from "~/features/character/session/CharacterSession";
import type { CharacterPreviewTaskState } from "~/features/character/session/characterSessionMachine";
import type { SkillRejectionReason } from "~/lib/engine/core/types";

const rejectionReasonText: Record<SkillRejectionReason, string> = {
	skill_not_found: "技能未装载到成员运行时",
	variant_not_found: "当前装备没有匹配的技能变体",
	no_active_behavior: "技能没有可执行的主动行为",
	cooldown_active: "技能仍在冷却中",
	cost_resolution_failed: "技能消耗计算失败",
	insufficient_hp: "HP 不足",
	insufficient_mp: "MP 不足",
	member_busy: "前一动作尚未结束",
};

type SkillRow = {
	id: string;
	name: string;
	level: number;
	damage: number;
	loading: boolean;
	error?: string;
	note?: string;
};

const projectSkillState = (
	skill: CharacterSkillWithRelations,
	state: CharacterPreviewTaskState | undefined,
): SkillRow => {
	const base = {
		id: skill.id,
		name: skill.template?.name ?? skill.id,
		level: skill.lv,
		damage: 0,
		loading: state?.status === "running",
	};
	if (!state || state.status === "running") return base;
	if (state.status === "failed") return { ...base, loading: false, error: state.error };
	const result = state.result;
	if (result.status === "rejected") {
		return { ...base, loading: false, error: rejectionReasonText[result.reason] };
	}
	if (result.status === "setup_failed") {
		const reason = result.reason === "missing_verdict" ? "FSM 未返回接纳结果" : rejectionReasonText[result.reason];
		return {
			...base,
			loading: false,
			error: `基础技能 ${result.failedSetupSkillId} 执行失败：${reason}`,
		};
	}
	return { ...base, loading: false, damage: result.damage, note: result.note };
};

/** 技能预览只渲染 CharacterSession 已编排的结果，不构造任务、不管理 token 或 debounce。 */
export function SkillPreviewPanel(props: { learnedSkills?: CharacterSkillWithRelations[] }) {
	const session = useCharacterSession();
	const validation = session.validation;
	const rows = createMemo(() =>
		(props.learnedSkills ?? [])
			.filter((skill) => skill.lv > 0)
			.map((skill) => projectSkillState(skill, validation().previews[skill.id])),
	);

	return (
		<div class="SkillPreviewPanel flex flex-col gap-3">
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-bold">技能伤害预览</h2>
				<Show when={rows().length > 0}>
					<Button
						onClick={() => session.send({ type: "character.preview.refresh" })}
						class="text-link-color text-xs hover:underline"
						disabled={validation().status === "running"}
					>
						{validation().status === "running" ? "计算中..." : "重新计算"}
					</Button>
				</Show>
			</div>

			<Show when={validation().status === "running"}>
				<div class="text-muted-color flex items-center gap-2 text-sm">
					<span class="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
					计算中...
				</div>
			</Show>

			<Show when={validation().error}>
				{(error) => (
					<div class="bg-error-bg text-error-color rounded p-2 text-sm">
						{error()}
						<Show when={Object.values(validation().previews).some((state) => state.status === "failed")}>
							<Button
								level="quaternary"
								onClick={() => session.send({ type: "character.preview.retryFailed" })}
								class="ml-2 text-xs"
							>
								重试失败项
							</Button>
						</Show>
					</div>
				)}
			</Show>

			<Show
				when={rows().length > 0}
				fallback={<div class="text-muted-color text-sm italic">暂无可用的技能数据，请先在配置面板中添加技能</div>}
			>
				<div class="flex flex-col gap-1">
					<div class="bg-black/5 flex gap-2 rounded px-3 py-1.5 text-xs font-semibold dark:bg-white/5">
						<span class="flex-1">技能</span>
						<span class="w-20 text-right">等级</span>
						<span class="w-28 text-right">伤害</span>
					</div>
					<For each={rows()}>
						{(skill) => (
							<div class="flex items-center gap-2 rounded px-3 py-2 odd:bg-black/5 dark:odd:bg-white/5">
								<div class="flex-1 truncate text-sm">{skill.name}</div>
								<div class="text-muted-color w-20 text-right text-xs">Lv.{skill.level}</div>
								<div class="w-28 text-right font-mono text-sm tabular-nums">
									<Show when={!skill.loading} fallback={<span class="text-muted-color">...</span>}>
										<Show
											when={skill.error}
											fallback={
												<span class={skill.damage > 0 ? "text-success-color" : "text-muted-color"} title={skill.note}>
													{skill.damage.toLocaleString()}
												</span>
											}
										>
											<span class="text-error-color text-xs" title={skill.error}>
												不可用
											</span>
										</Show>
									</Show>
								</div>
								<Show when={skill.error || skill.note}>
									<div
										class={`max-w-48 truncate text-xs ${skill.error ? "text-error-color" : "text-muted-color"}`}
										title={skill.error ?? skill.note}
									>
										{skill.error ?? skill.note}
									</div>
								</Show>
							</div>
						)}
					</For>
				</div>
			</Show>
		</div>
	);
}
