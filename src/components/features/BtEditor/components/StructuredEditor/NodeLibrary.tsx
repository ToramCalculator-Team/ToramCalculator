import { type Component, For } from "solid-js";
import type { JSX } from "solid-js/jsx-runtime";
import { Icons } from "~/components/icons";
import type { EditableBtNodeType } from "../../model/editableTree";

export type NodeLibraryProps = {
	onAdd: (type: EditableBtNodeType) => void;
	onDragStart?: (type: EditableBtNodeType) => void;
	onDragEnd?: () => void;
	disabled?: boolean;
};

const dragMimeType = "application/x-bt-node-type";
const nodeIconClass = "h-8 w-8 flex-none rounded-md p-1.5 text-primary-color";

type NodeIcon = (props: JSX.IntrinsicElements["svg"]) => JSX.Element;

const nodeIconConfig: Record<EditableBtNodeType, { icon: NodeIcon; colorClass: string }> = {
	action: { icon: Icons.Outline.Edit, colorClass: "bg-[#3772ff]" },
	condition: { icon: Icons.Outline.Filter, colorClass: "bg-[#eac435]" },
	fail: { icon: Icons.Outline.Close, colorClass: "bg-[#e40066]" },
	flip: { icon: Icons.Outline.Swap, colorClass: "bg-[#f29e4c]" },
	lotto: { icon: Icons.Outline.Coins, colorClass: "bg-[#83e377]" },
	parallel: { icon: Icons.Outline.Category2, colorClass: "bg-[#0db39e]" },
	race: { icon: Icons.Outline.Category2, colorClass: "bg-[#16db93]" },
	all: { icon: Icons.Outline.Category2, colorClass: "bg-[#16db93]" },
	repeat: { icon: Icons.Outline.Loading, colorClass: "bg-[#6c91bf]" },
	retry: { icon: Icons.Outline.Loading, colorClass: "bg-[#a14ebf]" },
	root: { icon: Icons.Outline.Home, colorClass: "bg-[rgb(99,98,104)]" },
	selector: { icon: Icons.Outline.Category, colorClass: "bg-[#54478c]" },
	sequence: { icon: Icons.Outline.Box2, colorClass: "bg-[#e40066]" },
	succeed: { icon: Icons.Outline.Flag, colorClass: "bg-[rgb(0,190,32)]" },
	wait: { icon: Icons.Outline.Calendar, colorClass: "bg-[#826aed]" },
	branch: { icon: Icons.Outline.Location, colorClass: "bg-[#6c91bf]" },
};

const getNodeIcon = (type: EditableBtNodeType) => {
	const config = nodeIconConfig[type];
	const Icon = config.icon;
	return <Icon class={`${nodeIconClass} ${config.colorClass}`} />;
};

const groups: Array<{
	title: string;
	description: string;
	nodes: Array<{ type: EditableBtNodeType; label: string; description: string }>;
}> = [
	{
		title: "控制",
		description: "组织多个子节点的执行顺序和选择策略。",
		nodes: [
			{ type: "sequence", label: "顺序", description: "按顺序执行子节点，失败时停止。" },
			{ type: "selector", label: "选择", description: "依次尝试子节点，成功时停止。" },
			{ type: "parallel", label: "并行", description: "并行推进多个子节点。" },
			{ type: "race", label: "竞争", description: "以最先完成的子节点决定结果。" },
			{ type: "all", label: "全部", description: "要求全部子节点满足结果条件。" },
			{ type: "lotto", label: "随机", description: "按权重随机选择子节点。" },
		],
	},
	{
		title: "修饰",
		description: "包裹一个子节点，改变执行次数、结果或重试策略。",
		nodes: [
			{ type: "repeat", label: "重复", description: "按次数重复执行子节点。" },
			{ type: "retry", label: "重试", description: "失败后继续尝试子节点。" },
			{ type: "flip", label: "反转", description: "交换成功和失败结果。" },
			{ type: "succeed", label: "成功包装", description: "把子节点结果改写为成功。" },
			{ type: "fail", label: "失败包装", description: "把子节点结果改写为失败。" },
		],
	},
	{
		title: "叶子",
		description: "执行具体调用、判断、等待或跳转到子树。",
		nodes: [
			{ type: "action", label: "动作", description: "调用 Agent action，返回执行状态。" },
			{ type: "condition", label: "条件", description: "调用 Agent condition，返回布尔结果。" },
			{ type: "wait", label: "等待", description: "等待固定毫秒或属性表达式。" },
			{ type: "branch", label: "子树", description: "跳转执行另一个命名行为树。" },
		],
	},
];

export const NodeLibrary: Component<NodeLibraryProps> = (props) => {
	return (
		<div class="flex h-full min-h-0 flex-col overflow-auto">
			<For each={groups}>
				{(group) => (
					<section class="border-dividing-color flex flex-col border-b">
						<div class="px-3 py-3">
							<div class="text-accent-color text-xs font-bold tracking-wide">{group.title}</div>
							<div class="text-main-text-color mt-1 text-xs leading-5">{group.description}</div>
						</div>
						<div class="border-dividing-color border-t">
							<For each={group.nodes}>
								{(node) => (
									<button
										type="button"
										class="border-dividing-color hover:bg-area-color flex min-h-16 w-full cursor-grab items-center gap-3 border-b px-3 py-2 text-left transition-colors last:border-b-0 active:cursor-grabbing disabled:pointer-events-none disabled:opacity-50"
										disabled={props.disabled}
										draggable={!props.disabled}
										onDragStart={(event) => {
											event.dataTransfer?.setData(dragMimeType, node.type);
											event.dataTransfer?.setData("text/plain", node.type);
											if (event.dataTransfer) event.dataTransfer.effectAllowed = "copy";
											props.onDragStart?.(node.type);
										}}
										onDragEnd={() => props.onDragEnd?.()}
										onClick={() => props.onAdd(node.type)}
									>
										{getNodeIcon(node.type)}
										<span class="min-w-0">
											<span class="block text-sm font-bold">{node.label}</span>
											<span class="text-main-text-color line-clamp-2 text-xs">{node.description}</span>
										</span>
									</button>
								)}
							</For>
						</div>
					</section>
				)}
			</For>
		</div>
	);
};
