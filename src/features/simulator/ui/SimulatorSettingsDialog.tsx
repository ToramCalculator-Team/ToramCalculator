import { type Accessor, For, Show } from "solid-js";
import { Button } from "~/components/ui/controls/button";
import type { DesignCopy, DesignFieldDifference } from "../edit/designCopy";

type Props = {
	copy: Accessor<DesignCopy | null>;
	differences: Accessor<DesignFieldDifference[]>;
	error: Accessor<string | null>;
	onNumberChange: (field: "randomSeed" | "logicHz", value: number) => void;
	onApply: () => void;
};

const formatDifferenceValue = (value: unknown): string => {
	if (value === null) return "null";
	if (typeof value === "object") return JSON.stringify(value);
	return String(value);
};

/** Simulator 设置只编辑设计级运行参数；成员机体通过设计页的成员入口单独编辑。 */
export function SimulatorSettingsDialog(props: Props) {
	return (
		<Show
			when={props.copy()}
			fallback={<div class="flex h-full items-center justify-center p-6">当前没有可设置的设计</div>}
		>
			{(copy) => (
				<div class="mx-auto flex w-full max-w-3xl flex-col gap-5 px-2 py-3 sm:px-4">
					<p class="text-accent-color-70 truncate text-sm">{copy().design.name || "未命名 Simulator"}</p>
					<section aria-labelledby="simulator-runtime-settings">
						<h2 id="simulator-runtime-settings" class="mb-3 text-sm font-bold">
							运行参数
						</h2>
						<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<label class="flex min-w-0 flex-col gap-1.5 text-sm">
								随机种子
								<input
									type="number"
									min="0"
									value={copy().design.randomSeed}
									onInput={(event) => props.onNumberChange("randomSeed", Number(event.currentTarget.value))}
									class="border-dividing-color bg-area-color min-w-0 rounded-lg border px-3 py-2.5"
								/>
							</label>
							<label class="flex min-w-0 flex-col gap-1.5 text-sm">
								逻辑频率
								<input
									type="number"
									min="1"
									value={copy().design.logicHz}
									onInput={(event) => props.onNumberChange("logicHz", Number(event.currentTarget.value))}
									class="border-dividing-color bg-area-color min-w-0 rounded-lg border px-3 py-2.5"
								/>
							</label>
						</div>
					</section>

					<Show when={props.differences().length > 0}>
						<section class="border-dividing-color border-t pt-6" aria-labelledby="simulator-design-differences">
							<h2 id="simulator-design-differences" class="mb-3 text-sm font-bold">
								正式设计差异
							</h2>
							<div class="border-dividing-color max-h-64 overflow-y-auto border-y">
								<For each={props.differences()}>
									{(difference) => (
										<div class="border-dividing-color grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b px-1 py-2.5 text-xs last:border-b-0">
											<span class="min-w-0 truncate">
												{difference.entityType}.{difference.field}
											</span>
											<span class="min-w-0 text-right break-words">
												{formatDifferenceValue(difference.before)} → {formatDifferenceValue(difference.after)}
											</span>
										</div>
									)}
								</For>
							</div>
							<Button level="secondary" onClick={props.onApply} class="mt-3 w-full">
								应用为正式设计
							</Button>
						</section>
					</Show>

					<Show when={props.error()}>{(message) => <p class="text-danger-color text-sm">{message()}</p>}</Show>
				</div>
			)}
		</Show>
	);
}
