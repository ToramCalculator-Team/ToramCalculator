import { type Component, createSignal, For, Show, createResource } from "solid-js";
import { A } from "@solidjs/router";
import { Button } from "~/components/controls/button";
import { Icons } from "~/components/icons";
import { Divider, Menu, MenuItem, MenuList } from "../";

export type DishMenuProps = {
	// 可选：点击料理项的回调
	onDishSelect?: (dish: { id: string; name: string; level: number; playerId: string }) => void;
};

// 获取已审核的料理列表
async function fetchApprovedDishes() {
	try {
		const response = await fetch("/api/dish?status=Approved&pageSize=50");
		if (!response.ok) {
			console.error("获取料理列表失败:", response.status);
			return [];
		}
		const data = await response.json();
		return data.data as Array<{
			id: string;
			name: string;
			level: number;
			playerId: string;
		}> ?? [];
	} catch (error) {
		console.error("获取料理列表失败:", error);
		return [];
	}
}

export const DishMenu: Component<DishMenuProps> = (props) => {
	const [anchorEl, setAnchorEl] = createSignal<HTMLElement | null>(null);
	const open = () => Boolean(anchorEl());

	const [dishes] = createResource(fetchApprovedDishes);

	const handleClick = (e: MouseEvent) => {
		setAnchorEl(e.currentTarget as HTMLElement);
	};

	const handleClose = () => {
		setAnchorEl(null);
	};

	const handleDishClick = (dish: { id: string; name: string; level: number; playerId: string }) => {
		setAnchorEl(null);
		props.onDishSelect?.(dish);
	};

	// 格式化显示：料理名字(等级)门牌号
	const formatDish = (dish: { name: string; level: number; playerId: string }) => {
		return `${dish.name}(${dish.level})${dish.playerId}`;
	};

	return (
		<>
			<Button level="quaternary" onClick={handleClick} class="p-1" title="料理名单">
				<Icons.Outline.Burger />
			</Button>
			<Menu anchorEl={anchorEl()} open={open()} onClose={handleClose}>
				<div class="text-accent-color/70 px-1.25 py-0.5 text-xs font-bold">
					料理名单
				</div>
				<Show when={dishes.loading}>
					<div class="px-3 py-2 text-sm text-muted-color">加载中...</div>
				</Show>
				<Show when={!dishes.loading && dishes()?.length === 0}>
					<div class="px-3 py-2 text-sm text-muted-color">暂无已审核的料理</div>
				</Show>
				<Show when={!dishes.loading && dishes()?.length}>
					<MenuList dense>
						<For each={dishes()}>
							{(dish) => (
								<MenuItem dense onClick={() => handleDishClick(dish)}>
									<span class="truncate">{formatDish(dish)}</span>
								</MenuItem>
							)}
						</For>
					</MenuList>
				</Show>
				<Divider />
				<MenuItem dense>
					<A href="/dish" class="w-full" onClick={handleClose}>
						<div class="flex items-center gap-1">
							<Icons.Outline.Category2 class="w-4 h-4" />
							<span>料理管理</span>
						</div>
					</A>
				</MenuItem>
			</Menu>
		</>
	);
};
