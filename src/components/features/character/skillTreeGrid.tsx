import { Show } from "solid-js";

// 设计说明：技能树网格的几何计算与连线渲染是角色页技能面板和 wiki 技能页共用的逻辑。
// 这里只依赖节点的坐标与前置关系（id/posX/posY/preSkillId），不绑定具体的 skill 实体类型，
// 让只读浏览（wiki）和可编辑配置（character）共享同一套网格与连线算法。

export type SkillTreeGridNode = {
	id: string;
	posX: number;
	posY: number;
	preSkillId: string | null;
};

export type SkillTreeGridBounds = {
	minX: number;
	minY: number;
	columnCount: number;
	rowCount: number;
};

export type SkillLinkDirection = "left" | "right" | "top" | "bottom";

export type SkillLinkCell = Record<SkillLinkDirection, boolean> & {
	key: string;
	x: number;
	y: number;
	hasJunction: boolean;
};

export const SKILL_GRID_CELL_WIDTH = 68;
export const SKILL_GRID_CELL_HEIGHT = 56;
const SKILL_TREE_MIN_COLUMN_COUNT = 12;
const SKILL_TREE_MIN_ROW_COUNT = 1;

function getGridCoordinateKey(x: number, y: number): string {
	return `${x}:${y}`;
}

export function getSkillGridX(node: SkillTreeGridNode): number {
	return node.posX;
}

export function getSkillGridY(node: SkillTreeGridNode): number {
	return node.posY;
}

export function getCssGridRow(y: number, bounds: SkillTreeGridBounds): number {
	return bounds.rowCount - (y - bounds.minY);
}

export function getSkillTreeGridBounds(nodes: SkillTreeGridNode[]): SkillTreeGridBounds {
	if (nodes.length === 0) {
		return { minX: 0, minY: 0, columnCount: SKILL_TREE_MIN_COLUMN_COUNT, rowCount: SKILL_TREE_MIN_ROW_COUNT };
	}
	const xs = nodes.map(getSkillGridX);
	const ys = nodes.map(getSkillGridY);
	// 设计说明：模板坐标直接等于渲染网格坐标，布局密度由技能数据维护者控制。
	const minX = Math.min(0, ...xs);
	const maxX = Math.max(...xs);
	const minY = Math.min(0, ...ys);
	const maxY = Math.max(...ys);
	return {
		minX,
		minY,
		columnCount: Math.max(SKILL_TREE_MIN_COLUMN_COUNT, maxX - minX + 1),
		rowCount: Math.max(SKILL_TREE_MIN_ROW_COUNT, maxY - minY + 1),
	};
}

function appendHorizontalSkillLinkPath(path: Array<{ x: number; y: number }>, targetX: number, y: number): void {
	const current = path.at(-1);
	if (!current || current.x === targetX) return;
	const step = Math.sign(targetX - current.x);
	for (let x = current.x + step; x !== targetX + step; x += step) {
		path.push({ x, y });
	}
}

function appendVerticalSkillLinkPath(path: Array<{ x: number; y: number }>, x: number, targetY: number): void {
	const current = path.at(-1);
	if (!current || current.y === targetY) return;
	const step = Math.sign(targetY - current.y);
	for (let y = current.y + step; y !== targetY + step; y += step) {
		path.push({ x, y });
	}
}

function buildSkillLinkPath(
	preSkill: SkillTreeGridNode,
	nextSkill: SkillTreeGridNode,
): Array<{ x: number; y: number }> {
	const from = { x: getSkillGridX(preSkill), y: getSkillGridY(preSkill) };
	const to = { x: getSkillGridX(nextSkill), y: getSkillGridY(nextSkill) };
	const path = [from];

	if (from.y === to.y) {
		appendHorizontalSkillLinkPath(path, to.x, to.y);
		return path;
	}
	if (from.x === to.x) {
		appendVerticalSkillLinkPath(path, to.x, to.y);
		return path;
	}

	// 设计说明：技能数据只提供父子坐标，没有连线节点；这里用父子中心点生成正交折线，再把经过的格子聚合成可复用线段。
	appendHorizontalSkillLinkPath(path, from.x + Math.sign(to.x - from.x), from.y);
	const bend = path.at(-1);
	if (!bend) return path;
	appendVerticalSkillLinkPath(path, bend.x, to.y);
	appendHorizontalSkillLinkPath(path, to.x, to.y);
	return path;
}

function addSkillLinkArm(
	linkCellMap: Map<string, Set<SkillLinkDirection>>,
	skillCoordinateSet: Set<string>,
	x: number,
	y: number,
	direction: SkillLinkDirection,
): void {
	const key = getGridCoordinateKey(x, y);
	if (skillCoordinateSet.has(key)) return;
	const cell = linkCellMap.get(key) ?? new Set<SkillLinkDirection>();
	cell.add(direction);
	linkCellMap.set(key, cell);
}

export function buildSkillLinkCells(nodes: SkillTreeGridNode[]): SkillLinkCell[] {
	const skillCoordinateSet = new Set(
		nodes.map((node) => getGridCoordinateKey(getSkillGridX(node), getSkillGridY(node))),
	);
	const skillTemplateById = new Map(nodes.map((node) => [node.id, node]));
	const linkCellMap = new Map<string, Set<SkillLinkDirection>>();

	for (const node of nodes) {
		const preSkillId = node.preSkillId;
		if (!preSkillId) continue;
		const preSkill = skillTemplateById.get(preSkillId);
		if (!preSkill) continue;

		const path = buildSkillLinkPath(preSkill, node);
		for (let index = 0; index < path.length - 1; index += 1) {
			const current = path[index];
			const next = path[index + 1];
			if (!current || !next) continue;
			if (next.x > current.x) {
				addSkillLinkArm(linkCellMap, skillCoordinateSet, current.x, current.y, "right");
				addSkillLinkArm(linkCellMap, skillCoordinateSet, next.x, next.y, "left");
				continue;
			}
			if (next.x < current.x) {
				addSkillLinkArm(linkCellMap, skillCoordinateSet, current.x, current.y, "left");
				addSkillLinkArm(linkCellMap, skillCoordinateSet, next.x, next.y, "right");
				continue;
			}
			if (next.y > current.y) {
				addSkillLinkArm(linkCellMap, skillCoordinateSet, current.x, current.y, "top");
				addSkillLinkArm(linkCellMap, skillCoordinateSet, next.x, next.y, "bottom");
				continue;
			}
			if (next.y < current.y) {
				addSkillLinkArm(linkCellMap, skillCoordinateSet, current.x, current.y, "bottom");
				addSkillLinkArm(linkCellMap, skillCoordinateSet, next.x, next.y, "top");
			}
		}
	}

	return Array.from(linkCellMap.entries())
		.map(([key, directions]) => {
			const [x, y] = key.split(":").map(Number) as [number, number];
			const hasHorizontal = directions.has("left") || directions.has("right");
			const hasVertical = directions.has("top") || directions.has("bottom");
			return {
				key,
				x,
				y,
				left: directions.has("left"),
				right: directions.has("right"),
				top: directions.has("top"),
				bottom: directions.has("bottom"),
				hasJunction: hasHorizontal && hasVertical,
			};
		})
		.sort((a, b) => a.y - b.y || a.x - b.x);
}

export function SkillLinkCellBlock(props: { cell: SkillLinkCell; bounds: SkillTreeGridBounds }) {
	return (
		<div
			aria-hidden="true"
			class="SkillLinkCellBlock pointer-events-none relative overflow-hidden"
			style={{
				"grid-column": props.cell.x - props.bounds.minX + 1,
				"grid-row": getCssGridRow(props.cell.y, props.bounds),
				"z-index": "0",
			}}
		>
			<Show when={props.cell.left}>
				<div
					class={`absolute left-0 top-[calc(50%-1px)] bg-brand-color-1st`}
					style={{
						width: `${SKILL_GRID_CELL_WIDTH * 0.5}px`,
						height: `2px`,
					}}
				/>
			</Show>
			<Show when={props.cell.right}>
				<div
					class={`absolute right-0 top-[calc(50%-1px)] bg-brand-color-1st`}
					style={{
						width: `${SKILL_GRID_CELL_WIDTH * 0.5}px`,
						height: `2px`,
					}}
				/>
			</Show>
			<Show when={props.cell.top}>
				<div
					class={`absolute left-[calc(50%-1px)] top-0 bg-brand-color-1st`}
					style={{
						width: `2px`,
						height: `${SKILL_GRID_CELL_HEIGHT * 0.5}px`,
					}}
				/>
			</Show>
			<Show when={props.cell.bottom}>
				<div
					class={`absolute bottom-0 left-[calc(50%-1px)] bg-brand-color-1st`}
					style={{
						width: `2px`,
						height: `${SKILL_GRID_CELL_HEIGHT * 0.5}px`,
					}}
				/>
			</Show>
			<Show when={props.cell.hasJunction}>
				<div class="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-[2px] bg-brand-color-1st" />
			</Show>
		</div>
	);
}
