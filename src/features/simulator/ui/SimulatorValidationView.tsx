import { A } from "@solidjs/router";
import { createMemo, For, Show } from "solid-js";
import { Button } from "~/components/ui/controls/button";
import { Select } from "~/components/ui/controls/select";
import { Icons } from "~/components/ui/icons";
import { MemberStatusPanel } from "~/engine/core/World/Member/MemberStatusPanel";
import {
	type AttributeSnapshot,
	type DataStorage,
	type ModifierSource,
	ModifierType,
} from "~/engine/core/World/Member/runtime/AttributeContainer/AttributeContainer";
import { useSimulatorRuntimeProjection, useSimulatorSession } from "~/features/simulator/session/SimulatorSession";

export function SimulatorValidationView() {
	const session = useSimulatorSession();
	const runtime = useSimulatorRuntimeProjection();
	const modifierSourceCaches = new WeakMap<object, Map<string, ModifierSource>>();
	const activeController = createMemo(
		() =>
			session.controllers().find((entry) => entry.controllerId === session.activeControllerId()) ??
			session.controllers()[0] ??
			null,
	);
	const activeMember = createMemo(() => {
		const entry = activeController();
		if (!entry) return null;
		const staticMember = session.members().find((member) => member.id === entry.boundMemberId);
		const layout = runtime.renderSource().getWorldStateLayout();
		const slotIndex = layout?.memberDirectory.findIndex((member) => member.id === entry.boundMemberId) ?? -1;
		const worldState = runtime.worldState();
		const stateMember = slotIndex < 0 ? null : (worldState?.members[slotIndex] ?? null);
		if (staticMember && stateMember && layout && slotIndex >= 0) {
			let modifierSourceCache = modifierSourceCaches.get(layout);
			if (!modifierSourceCache) {
				modifierSourceCache = new Map();
				modifierSourceCaches.set(layout, modifierSourceCache);
			}
			const memberLayout = layout.memberDirectory[slotIndex];
			const attrs: AttributeSnapshot = { ...staticMember.attrs };
			const projectedAttributes: DataStorage[] = [];
			for (let index = 0; index < memberLayout.attributeCount; index++) {
				const schema = layout.attributeSchema[memberLayout.attributeOffset + index];
				const value = stateMember.attributes[index];
				if (!schema || !value) continue;
				const previous = attrs[schema.path];
				if (!previous) continue;
				const projected: DataStorage = {
					...previous,
					baseValue: value.base,
					actValue: value.act,
					baseSources: [],
					static: { fixed: [], percentage: [] },
					dynamic: { fixed: [], percentage: [] },
				};
				attrs[schema.path] = projected;
				projectedAttributes[index] = projected;
			}
			for (const modifier of stateMember.modifiers) {
				const attribute = projectedAttributes[modifier.attributeIndex];
				if (!attribute) continue;
				const sourceEntry = worldState?.modifierSources[modifier.sourceIndex ?? -1];
				const sourceHash = sourceEntry?.idHash ?? 0;
				const cacheKey = `${entry.boundMemberId}:${sourceHash}`;
				let source = modifierSourceCache.get(cacheKey);
				if (!source) {
					source = layout.modifierSourceMetadata.find((metadata) => metadata.idHash === sourceHash)?.source ?? {
						key: `realtime:${sourceHash}`,
						name: `来源 ${sourceHash}`,
						type: "system",
						chain: [{ kind: "member", id: entry.boundMemberId }],
					};
					modifierSourceCache.set(cacheKey, source);
				}
				const projectedModifier = { source, value: modifier.value };
				switch (modifier.type) {
					case ModifierType.BASE_VALUE:
						attribute.baseSources.push(projectedModifier);
						break;
					case ModifierType.STATIC_FIXED:
						attribute.static.fixed.push(projectedModifier);
						break;
					case ModifierType.STATIC_PERCENTAGE:
						attribute.static.percentage.push(projectedModifier);
						break;
					case ModifierType.DYNAMIC_FIXED:
						attribute.dynamic.fixed.push(projectedModifier);
						break;
					case ModifierType.DYNAMIC_PERCENTAGE:
						attribute.dynamic.percentage.push(projectedModifier);
						break;
				}
			}
			return {
				...staticMember,
				position: stateMember.position,
				attrs,
			};
		}
		return staticMember ?? null;
	});
	const controllerOptions = createMemo(() =>
		session.controllers().map((entry, index) => ({
			value: entry.controllerId,
			label: `${index + 1}. ${session.members().find((member) => member.id === entry.boundMemberId)?.name ?? entry.boundMemberId}`,
		})),
	);
	const controlsEnabled = createMemo(() => session.snapshot().matches("runActive"));
	const validationFailed = createMemo(
		() =>
			session.snapshot().matches("finishFailed") ||
			session.snapshot().matches("outputReleaseFailed") ||
			session.snapshot().matches("validationFailedDecision"),
	);
	const outputReleaseFailed = createMemo(() => session.snapshot().matches("outputReleaseFailed"));
	const statusText = createMemo(() => {
		if (validationFailed()) return "验证异常";
		if (!controlsEnabled()) return "处理中";
		return runtime.isRunning() ? "运行中" : "已暂停";
	});

	return (
		<>
			<div class="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-3 portrait:flex-col">
				<div class="pointer-events-auto flex max-w-[min(92vw,720px)] items-start gap-2 portrait:w-full portrait:max-w-none">
					<A href="/" class="bg-primary-color-60 hidden rounded px-3 py-2 backdrop-blur-md landscape:flex">
						<Icons.Brand.NoPaddingLogoText class="h-6 w-40" />
					</A>
					<div class="flex min-w-72 flex-1 flex-col gap-2 p-2">
						<div class="flex items-center justify-between gap-2 text-sm">
							<span class="font-bold">{statusText()}</span>
							<Show when={runtime.telemetry()}>
								{(telemetry) => (
									<span class="text-accent-color-70">
										TPS {telemetry().ticksPerSecond.toFixed(0)} · 舍弃时间{" "}
										{telemetry().discardedVirtualTimeMs.toFixed(0)}ms · tick耗时{" "}
										{telemetry().lastStepTickDurationMs.toFixed(1)}ms · {telemetry().memberCount} 成员
									</span>
								)}
							</Show>
						</div>
					</div>
				</div>

				<div class="pointer-events-auto flex w-[min(92vw,360px)] flex-col gap-2 portrait:w-full">
					<div class="bg-primary-color-70 border-dividing-color flex items-center gap-2 rounded border p-2 backdrop-blur-md">
						<Select
							value={activeController()?.controllerId ?? ""}
							setValue={(controllerId) => controllerId && session.send({ type: "controller.selected", controllerId })}
							options={controllerOptions()}
							placeholder="选择主控成员"
							class="min-w-0 flex-1"
						/>
						<MemberStatusPanel
							controllerId={activeController()?.controllerId ?? "active-controller"}
							member={() => activeMember()}
						/>
					</div>
					<Show when={session.controllers().length > 1}>
						<div class="bg-primary-color-70 border-dividing-color flex flex-wrap gap-1 rounded border p-2 backdrop-blur-md">
							<For each={session.controllers()}>
								{(entry) => {
									const memberName = () =>
										session.members().find((member) => member.id === entry.boundMemberId)?.name ?? entry.boundMemberId;
									return (
										<Button
											level={activeController()?.controllerId === entry.controllerId ? "primary" : "secondary"}
											onClick={() => session.send({ type: "controller.selected", controllerId: entry.controllerId })}
											class="min-w-0 flex-1"
										>
											<span class="truncate text-xs">{memberName()}</span>
										</Button>
									);
								}}
							</For>
						</div>
					</Show>
				</div>
			</div>

			<Show when={validationFailed()}>
				<div class="pointer-events-auto absolute left-1/2 top-1/2 flex w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 flex-col gap-3">
					<div class="bg-primary-color-90 border-danger-color rounded border p-3 backdrop-blur-md">
						<strong class="text-danger-color">
							{outputReleaseFailed() ? "运行结果已保存，但资源释放失败" : "验证未能继续"}
						</strong>
						<Show when={session.error()}>{(message) => <p class="mt-1 text-sm">{message()}</p>}</Show>
						<div class="mt-3 flex gap-2">
							<Button
								level="primary"
								icon={<Icons.Outline.Replay />}
								onClick={() =>
									session.send({
										type:
											session.snapshot().matches("finishFailed") || outputReleaseFailed()
												? "validation.finish.retry"
												: "validation.retry.requested",
									})
								}
								class="flex-1"
							>
								{outputReleaseFailed() ? "重试释放资源" : "重试验证"}
							</Button>
							<Button
								level="secondary"
								icon={<Icons.Outline.Back />}
								disabled={outputReleaseFailed()}
								onClick={() => session.send({ type: "validation.returnToDesign.requested" })}
								class="flex-1"
							>
								返回设计
							</Button>
						</div>
					</div>
				</div>
			</Show>

			<div class="pointer-events-auto absolute bottom-3 left-1/2 flex w-[min(96vw,960px)] -translate-x-1/2 flex-col gap-2">
				<div class="bg-primary-color-70 border-dividing-color flex gap-2 rounded border p-2 backdrop-blur-md">
					<Button
						level="secondary"
						icon={runtime.isRunning() ? <Icons.Outline.Pause /> : <Icons.Outline.Play />}
						disabled={!controlsEnabled()}
						onClick={() =>
							session.send({ type: runtime.isRunning() ? "validation.pause.requested" : "validation.resume.requested" })
						}
						class="min-w-0 flex-1"
						title={runtime.isRunning() ? "暂停" : "继续"}
						aria-label={runtime.isRunning() ? "暂停" : "继续"}
					>
						<span class="hidden sm:inline">{runtime.isRunning() ? "暂停" : "继续"}</span>
					</Button>
					<Button
						level="primary"
						icon={<Icons.Outline.Stop />}
						disabled={!controlsEnabled()}
						onClick={() => session.send({ type: "validation.finish.requested" })}
						class="min-w-0 flex-1"
						title="结束验证"
						aria-label="结束验证"
					>
						<span class="hidden sm:inline">结束验证</span>
					</Button>
					<Button
						level="secondary"
						icon={<Icons.Outline.Replay />}
						disabled={!controlsEnabled() || runtime.isRunning()}
						onClick={() => session.send({ type: "validation.step.requested" })}
						class="min-w-0 flex-1"
						title="单步推进"
						aria-label="单步推进"
					>
						<span class="hidden sm:inline">单步推进</span>
					</Button>
				</div>
				<div class="bg-primary-color-70 border-dividing-color grid min-h-16 grid-flow-col grid-rows-1 gap-2 overflow-x-auto rounded border p-2 backdrop-blur-md auto-cols-[minmax(5.5rem,1fr)]">
					<Show
						when={session.activeSkills().length > 0}
						fallback={<div class="flex h-12 items-center justify-center text-sm opacity-70">暂无可用技能</div>}
					>
						<For each={session.activeSkills()}>
							{(skill) => (
								<Button
									onClick={() => session.send({ type: "skill.cast.requested", skillId: skill.id })}
									disabled={!controlsEnabled()}
									class="h-12 min-w-0"
									level="secondary"
								>
									<Icons.Spirits iconName={skill.name} />
									<span class="truncate text-xs">{skill.name}</span>
								</Button>
							)}
						</For>
					</Show>
				</div>
			</div>
		</>
	);
}
