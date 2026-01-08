/**
 * 成员控制器面板组件
 *
 * 功能：
 * - 完全独立的成员控制面板
 * - 显示绑定成员的状态、技能、属性
 * - 提供移动、技能、目标选择、停止等操作
 */

import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { Button } from "~/components/controls/button";
import { MemberStatusPanel } from "../core/Member/MemberStatusPanel";
import type { MemberController } from "./MemberController";
import type { FrameSnapshot } from "../core/GameEngine";
import type { MemberSerializeData } from "../core/Member/Member";
import { Icons } from "~/components/icons";
import { realtimeSimulatorPool } from "../core/thread/SimulatorPool";

type ControllerEventState = {
	skillAvailability?: Record<string, boolean>;
	hp?: number | null;
	mp?: number | null;
	position?: { x: number; y: number; z: number };
};

interface MemberControllerPanelProps {
	controller: MemberController;
	boundMemberId: string;
	latestSnapshot: () => FrameSnapshot | null;
	members: () => MemberSerializeData[];
	controllerEventState: () => Record<string, ControllerEventState>;
	onRemove: () => Promise<void>;
}

export function MemberControllerPanel(props: MemberControllerPanelProps) {
	const [skillList, setSkillList] = createSignal<Array<{ id: string; name: string; level: number }>>([]);

	// 从快照中提取该控制器的视图
	const controllerView = createMemo(() => {
		const snapshot = props.latestSnapshot();
		if (!snapshot) return null;
		return snapshot.byController?.[props.controller.controllerId];
	});

	// 获取绑定成员的完整信息
	const boundMember = createMemo(() => {
		return props.members().find((m) => m.id === props.boundMemberId);
	});

	// 获取绑定成员的实时状态（从快照投影）
	const memberStatus = createMemo(() => {
		const view = controllerView();
		const member = boundMember();
		if (!view || !member) return null;

		// 从快照中获取成员基础信息
		const snapshot = props.latestSnapshot();
		const memberBasic = snapshot?.members.find((m) => m.id === props.boundMemberId);

		return {
			...member,
			attrs: view.boundMemberDetail?.attrs ?? member.attrs ?? {},
			position: memberBasic?.position ?? member.position,
		} satisfies MemberSerializeData;
	});

	const controllerEvents = createMemo<ControllerEventState>(() => {
		return props.controllerEventState()[props.controller.controllerId] ?? {};
	});

	createEffect(() => {
		const memberId = props.boundMemberId;
		if (!memberId) return;
		// 绑定时拉一次静态技能列表（不依赖 frame_snapshot）
		realtimeSimulatorPool.getMemberSkillList(memberId).then(setSkillList).catch(console.error);
	});

	const handleCastSkill = (skillId: string) => {
		props.controller.castSkill(skillId).catch(console.error);
	};

	return (
		<div class="MemberControllerPanel w-full h-full grid grid-cols-8 grid-rows-8 gap-2 p-2 bg-accent-color rounded overflow-hidden">
			<div class="col-span-8 row-span-1 grid grid-cols-8 grid-rows-1 gap-2 items-center justify-between">
				<div class="col-span-1 row-span-1 flex w-full h-full">
					{/* 成员状态：优先用 byController 投影；否则用成员静态数据兜底（避免“只有壳”） */}
					<Show
						when={memberStatus()}
						fallback={
							<MemberStatusPanel controllerId={props.controller.controllerId} member={() => boundMember() ?? null} />
						}
					>
						{(status) => <MemberStatusPanel controllerId={props.controller.controllerId} member={status} />}
					</Show>
				</div>
				<div class="StatusPanel col-start-3 col-span-4 h-full row-span-1 flex flex-col gap-0.5 w-full">
					<div class="HealthBar bg-accent-color rounded-sm h-6 p-0.5">
						<div class="bg-brand-color-1st rounded-sm h-full w-full flex items-center justify-center">
							<span class="font-bold text-xs text-primary-color">9999</span>
						</div>
					</div>
					<div class="ManaBar bg-accent-color rounded-sm h-4 grid grid-cols-10 grid-rows-1 p-0.5 gap-0.5">
						<For each={Array(10)}>
							{() => (
								<div class="bg-brand-color-2nd col-span-1 row-span-1 rounded-sm h-full w-full flex items-center justify-center"></div>
							)}
						</For>
					</div>
				</div>
				<div class="col-span-1 col-start-8 row-span-1 w-full h-full  flex justify-end">
					<Button onClick={props.onRemove} level="secondary" class="w-fit h-fit">
						<Icons.Outline.Close />
					</Button>
				</div>
			</div>

			<div class="row-start-8 col-start-3 col-span-4 row-span-1 flex flex-col gap-2">
				{/* 技能面板 */}
				<Show when={skillList().length > 0} fallback={<div class="text-xs">暂无技能</div>}>
					<div class="grid grid-rows-1 grid-cols-10 gap-2">
						<For each={skillList()}>
							{(skill) => (
								<Button
									onClick={() => handleCastSkill(skill.id)}
									disabled={controllerEvents().skillAvailability?.[skill.id] === false}
									class="text-xs col-span-1 row-span-1 shadow-card shadow-brand-color-1st"
								>
									<Icons.Spirits iconName={skill.name} />
									{/* {skill.name} (Lv.{skill.level}) */}
								</Button>
							)}
						</For>
					</div>
				</Show>
			</div>
		</div>
	);
}
