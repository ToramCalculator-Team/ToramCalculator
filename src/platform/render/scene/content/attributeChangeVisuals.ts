import type {
	WorldStateLayoutDescriptor,
	WorldStateMember,
	WorldStateSnapshot,
} from "~/engine/core/thread/worldStateBuffer";

export type AttributeChangeVisualDefinition = {
	/** 与 WorldStateLayoutDescriptor.attributeSchema.path 对应的属性路径。 */
	path: string;
	/** 将属性差异转换为浮动文字；返回 null 表示该变化不需要展示。 */
	format: (delta: number, previousValue: number, currentValue: number) => string | null;
	/** 该属性变化的文字颜色，由渲染层本地表现策略决定。 */
	color: (delta: number, previousValue: number, currentValue: number) => string;
};

export type AttributeChange = {
	memberSlot: number;
	generation: number;
	path: string;
	previousValue: number;
	currentValue: number;
	delta: number;
	occurredAtLogicalTimeMs: number;
	text: string;
	color: string;
};

function formatSignedInteger(value: number): string {
	const rounded = Math.round(value);
	const sign = rounded > 0 ? "+" : "";
	return `${sign}${rounded.toLocaleString("zh-CN")}`;
}

/**
 * 属性变化表现注册表。
 *
 * 新增可视化属性时只需添加一项，属性读取、成员代次校验和 Babylon 表现仍由同一套系统处理。
 * HP 先按当前生命值的净变化显示，渲染层不依赖命中事件或伤害来源。
 */
export const ATTRIBUTE_CHANGE_VISUALIZERS: readonly AttributeChangeVisualDefinition[] = [
	{
		path: "hp.current",
		format: (delta) => (delta === 0 || !Number.isFinite(delta) ? null : formatSignedInteger(delta)),
		color: (delta) => (delta < 0 ? "#ff6b6b" : "#65d98a"),
	},
];

function readAttributeValue(member: WorldStateMember, localIndex: number): number {
	return member.attributes[localIndex]?.act ?? 0;
}

function findLocalAttributeIndex(layout: WorldStateLayoutDescriptor, memberSlot: number, path: string): number | null {
	const memberLayout = layout.memberDirectory[memberSlot];
	if (!memberLayout) return null;
	const globalIndex = layout.attributeSchema.findIndex(
		(entry, index) =>
			index >= memberLayout.attributeOffset &&
			index < memberLayout.attributeOffset + memberLayout.attributeCount &&
			entry.path === path,
	);
	return globalIndex < 0 ? null : globalIndex - memberLayout.attributeOffset;
}

/**
 * 从两个完整 SAB 提交中提取可视化的属性变化。
 *
 * 这是 latest-state 的差分投影：如果渲染器跳过中间提交，返回的是两个已观察状态之间的净变化，
 * 不尝试恢复未读取到的领域事件。首次观察成员或成员代次变化时只建立基线，避免初始化误播。
 */
export function collectAttributeChanges(
	previous: WorldStateSnapshot | null,
	latest: WorldStateSnapshot,
	layout: WorldStateLayoutDescriptor,
	visualizers: readonly AttributeChangeVisualDefinition[] = ATTRIBUTE_CHANGE_VISUALIZERS,
): AttributeChange[] {
	if (!previous || previous.commitVersion === latest.commitVersion) return [];

	const changes: AttributeChange[] = [];
	for (let memberSlot = 0; memberSlot < latest.members.length; memberSlot++) {
		const currentMember = latest.members[memberSlot];
		const previousMember = previous.members[memberSlot];
		if (!currentMember?.active || !previousMember?.active) continue;
		if (currentMember.generation !== previousMember.generation) continue;

		for (const visualizer of visualizers) {
			const localIndex = findLocalAttributeIndex(layout, memberSlot, visualizer.path);
			if (localIndex === null) continue;
			const previousValue = readAttributeValue(previousMember, localIndex);
			const currentValue = readAttributeValue(currentMember, localIndex);
			const delta = currentValue - previousValue;
			const text = visualizer.format(delta, previousValue, currentValue);
			if (text === null) continue;
			changes.push({
				memberSlot,
				generation: currentMember.generation,
				path: visualizer.path,
				previousValue,
				currentValue,
				delta,
				occurredAtLogicalTimeMs: latest.logicalTimeMs,
				text,
				color: visualizer.color(delta, previousValue, currentValue),
			});
		}
	}
	return changes;
}
