import { type Component, createSignal, createResource, For, Show, createEffect, onMount, onCleanup } from "solid-js";
import { Button } from "~/components/controls/button";
import { Input } from "~/components/controls/input";
import { Select } from "~/components/controls/select";
import { Icons } from "~/components/icons";

// 料理数据类型
type Dish = {
	id: string;
	name: string;
	level: number;
	playerId: string;
	source: string;
	status: string;
	qqNumber: string | null;
	remark: string | null;
	createdAt: string;
	updatedAt: string;
	reviewedAt: string | null;
	reviewedById: string | null;
	submittedById: string;
};

// 配置数据类型
type DishConfig = {
	id: string;
	key: string;
	value: string;
	remark: string | null;
};

// 获取料理列表
async function fetchDishes(params: {
	status?: string;
	level?: number;
	page?: number;
	pageSize?: number;
	search?: string;
}) {
	try {
		const searchParams = new URLSearchParams();
		if (params.status) searchParams.set("status", params.status);
		if (params.level) searchParams.set("level", String(params.level));
		if (params.page) searchParams.set("page", String(params.page));
		if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
		// 限制搜索词长度，防止过长查询
		if (params.search && params.search.length <= 50) {
			searchParams.set("search", params.search);
		}

		const response = await fetch(`/api/dish?${searchParams.toString()}`);
		if (!response.ok) {
			console.error("获取料理列表失败:", response.status);
			return { data: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
		}
		return response.json();
	} catch (error) {
		console.error("获取料理列表失败:", error);
		return { data: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
	}
}

// 获取配置
async function fetchConfigs() {
	try {
		const response = await fetch("/api/dish/config");
		if (!response.ok) {
			console.error("获取配置失败:", response.status);
			return { data: [] };
		}
		return response.json();
	} catch (error) {
		console.error("获取配置失败:", error);
		return { data: [] };
	}
}

// 检查是否为管理员（从配置API响应中获取）
async function checkIsAdmin(): Promise<boolean> {
	try {
		const response = await fetch("/api/dish/config");
		if (response.ok) {
			const data = await response.json();
			return data.isAdmin === true;
		}
		return false;
	} catch {
		return false;
	}
}

// 审核状态选项
const statusOptions = [
	{ label: "全部", value: "" },
	{ label: "待审核", value: "Pending" },
	{ label: "已通过", value: "Approved" },
	{ label: "已拒绝", value: "Rejected" },
];

// 等级选项（倒序：10级在最上面）
const levelOptions = [
	{ label: "全部", value: 0 },
	...Array.from({ length: 10 }, (_, i) => ({ label: `等级 ${10 - i}`, value: 10 - i })),
];

// 审核料理
async function reviewDish(id: string, status: "Approved" | "Rejected", remark?: string) {
	const response = await fetch("/api/dish/review", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ id, status, remark }),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "审核失败");
	}
	return response.json();
}

// 提交料理
async function submitDish(data: { name: string; level: number; playerId: string; qqNumber?: string }) {
	const response = await fetch("/api/dish", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "提交失败");
	}
	return response.json();
}

// 更新配置
async function updateConfig(key: string, value: string, remark?: string) {
	const response = await fetch("/api/dish/config", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ key, value, remark }),
	});
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || "更新配置失败");
	}
	return response.json();
}

const DishPage: Component = () => {
	// 管理员状态
	const [isAdmin, setIsAdmin] = createSignal(false);
	
	// 搜索和筛选
	const [searchText, setSearchText] = createSignal("");
	const [filterStatus, setFilterStatus] = createSignal("");
	const [filterLevel, setFilterLevel] = createSignal(0);
	const [page, setPage] = createSignal(1);

	// 料理列表
	const [dishes, { refetch: refetchDishes }] = createResource(
		() => ({
			status: filterStatus() || undefined,
			level: filterLevel() || undefined,
			page: page(),
			pageSize: 20,
			search: searchText() || undefined,
		}),
		fetchDishes
	);

	// 配置列表
	const [configs, { refetch: refetchConfigs }] = createResource(fetchConfigs);

	// 提交表单（支持两个料理）
	const [submitForm, setSubmitForm] = createSignal({
		playerId: "",
		qqNumber: "",
		dish1Name: "",
		dish1Level: 1,
		dish2Name: "",
		dish2Level: 1,
	});
	const [submitting, setSubmitting] = createSignal(false);

	// 审核表单
	const [reviewRemark, setReviewRemark] = createSignal("");
	const [reviewing, setReviewing] = createSignal<string | null>(null);

	// WebSocket配置表单
	const [wsUrl, setWsUrl] = createSignal("");
	const [wsToken, setWsToken] = createSignal("");
	const [wsEnabled, setWsEnabled] = createSignal(false);
	const [wsTrigger, setWsTrigger] = createSignal("."); // 触发头
	const [dishAliases, setDishAliases] = createSignal<Record<string, string>>({}); // 别名映射
	const [savingConfig, setSavingConfig] = createSignal(false);

	// WebSocket状态和日志
	const [wsStatus, setWsStatus] = createSignal({ isConnected: false, url: "", messageCount: 0, activeGroups: 0 });
	const [wsLogs, setWsLogs] = createSignal<string[]>([]);
	const MAX_LOGS = 50;
	let wsStatusTimer: number | null = null;

	// 添加日志
	const addLog = (msg: string) => {
		const time = new Date().toLocaleTimeString("zh-CN");
		setWsLogs(logs => [`[${time}] ${msg}`, ...logs.slice(0, MAX_LOGS - 1)]);
	};

	// 获取WebSocket状态
	const fetchWSStatus = async () => {
		try {
			const response = await fetch("/api/dish/ws/status");
			if (response.ok) {
				const status = await response.json();
				setWsStatus(status);
			}
		} catch {}
	};

	// 初始化：检查管理员权限
	onMount(async () => {
		const admin = await checkIsAdmin();
		setIsAdmin(admin);
		
		if (admin) {
			fetchWSStatus();
			wsStatusTimer = setInterval(fetchWSStatus, 5000) as unknown as number;
		}
	});

	onCleanup(() => {
		if (wsStatusTimer) clearInterval(wsStatusTimer);
	});

	// 初始化配置（使用createEffect监听configs数据变化）
	createEffect(() => {
		const configsData = configs();
		if (configsData?.data) {
			const wsUrlConfig = configsData.data.find((c: DishConfig) => c.key === "ws_url");
			const wsTokenConfig = configsData.data.find((c: DishConfig) => c.key === "ws_token");
			const wsEnabledConfig = configsData.data.find((c: DishConfig) => c.key === "ws_enabled");
			const wsTriggerConfig = configsData.data.find((c: DishConfig) => c.key === "ws_trigger");
			const aliasesConfig = configsData.data.find((c: DishConfig) => c.key === "dish_aliases");
			
			if (wsUrlConfig) setWsUrl(wsUrlConfig.value);
			if (wsTokenConfig) setWsToken(wsTokenConfig.value);
			if (wsEnabledConfig) setWsEnabled(wsEnabledConfig.value === "true");
			if (wsTriggerConfig) setWsTrigger(wsTriggerConfig.value);
			if (aliasesConfig?.value) {
				try {
					setDishAliases(JSON.parse(aliasesConfig.value));
				} catch {}
			}
		}
	});

	// 处理提交
	const handleSubmit = async () => {
		const form = submitForm();
		
		// 输入验证
		if (!form.playerId) {
			alert("请填写门牌号");
			return;
		}
		if (form.playerId.length > 20) {
			alert("门牌号过长");
			return;
		}
		if (!form.dish1Name) {
			alert("请填写至少一个料理名称");
			return;
		}
		if (form.dish1Name.length > 50) {
			alert("料理名称过长");
			return;
		}
		if (form.dish2Name && form.dish2Name.length > 50) {
			alert("料理2名称过长");
			return;
		}
		if (form.qqNumber && !/^\d{5,15}$/.test(form.qqNumber)) {
			alert("QQ号格式不正确");
			return;
		}

		setSubmitting(true);
		try {
			await submitDish({
				name: form.dish1Name,
				level: form.dish1Level,
				playerId: form.playerId,
				qqNumber: form.qqNumber || undefined,
			});

			if (form.dish2Name) {
				await submitDish({
					name: form.dish2Name,
					level: form.dish2Level,
					playerId: form.playerId,
					qqNumber: form.qqNumber || undefined,
				});
			}

			setSubmitForm({
				playerId: "",
				qqNumber: "",
				dish1Name: "",
				dish1Level: 1,
				dish2Name: "",
				dish2Level: 1,
			});
			refetchDishes();
			alert(form.dish2Name ? "两个料理提交成功，等待审核" : "料理提交成功，等待审核");
		} catch (error) {
			alert(error instanceof Error ? error.message : "提交失败");
		} finally {
			setSubmitting(false);
		}
	};

	// 处理审核
	const handleReview = async (id: string, status: "Approved" | "Rejected") => {
		setReviewing(id);
		try {
			await reviewDish(id, status, reviewRemark() || undefined);
			setReviewRemark("");
			refetchDishes();
		} catch (error) {
			alert(error instanceof Error ? error.message : "审核失败");
		} finally {
			setReviewing(null);
		}
	};

	// 保存WebSocket配置
	const handleSaveConfig = async () => {
		setSavingConfig(true);
		addLog("保存配置中...");
		try {
			await updateConfig("ws_url", wsUrl(), "WebSocket连接地址");
			await updateConfig("ws_token", wsToken(), "WebSocket认证Token");
			await updateConfig("ws_enabled", wsEnabled() ? "true" : "false", "是否启用WebSocket");
			await updateConfig("ws_trigger", wsTrigger(), "命令触发头");
			await updateConfig("dish_aliases", JSON.stringify(dishAliases()), "料理别名映射");
			refetchConfigs();
			addLog("配置保存成功");
			
			// 如果启用了WebSocket，尝试连接
			if (wsEnabled()) {
				addLog("正在连接...");
				const response = await fetch("/api/dish/ws/connect", { method: "POST" });
				const result = await response.json();
				if (result.success) {
					addLog(`连接成功: ${wsUrl()}`);
					fetchWSStatus();
				} else {
					addLog(`连接失败: ${result.message || '未知错误'}`);
				}
			} else {
				addLog("WebSocket未启用");
			}
		} catch (error) {
			addLog(`保存失败: ${error instanceof Error ? error.message : "未知错误"}`);
		} finally {
			setSavingConfig(false);
		}
	};

	// 添加别名
	const addAlias = () => {
		const alias = prompt("输入别名（如：攻回）");
		if (!alias) return;
		const name = prompt("输入对应料理名（如：攻击回复）");
		if (!name) return;
		setDishAliases(prev => ({ ...prev, [alias]: name }));
	};

	// 删除别名
	const removeAlias = (alias: string) => {
		setDishAliases(prev => {
			const next = { ...prev };
			delete next[alias];
			return next;
		});
	};

	// 格式化日期
	const formatDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleString("zh-CN");
	};

	// 获取状态样式
	const getStatusStyle = (status: string) => {
		switch (status) {
			case "Approved":
				return "bg-green-500/20 text-green-500";
			case "Rejected":
				return "bg-red-500/20 text-red-500";
			default:
				return "bg-yellow-500/20 text-yellow-500";
		}
	};

	// 获取状态文本
	const getStatusText = (status: string) => {
		switch (status) {
			case "Approved":
				return "已通过";
			case "Rejected":
				return "已拒绝";
			default:
				return "待审核";
		}
	};

	// 按门牌号分组的料理数据
	const getGroupedDishes = () => {
		const data = dishes()?.data || [];
		const groups: Record<string, Dish[]> = {};
		
		for (const dish of data) {
			if (!groups[dish.playerId]) {
				groups[dish.playerId] = [];
			}
			groups[dish.playerId].push(dish);
		}
		
		return Object.entries(groups).map(([playerId, dishes]) => ({
			playerId,
			dishes,
		}));
	};

	// 复制到剪贴板
	const copyToClipboard = async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);
			// 简单的复制成功提示
			const toast = document.createElement("div");
			toast.textContent = `已复制: ${text}`;
			toast.className = "fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-pulse";
			document.body.appendChild(toast);
			setTimeout(() => toast.remove(), 2000);
		} catch (err) {
			console.error("复制失败:", err);
		}
	};

	return (
		<div class="DishPage p-4 md:p-6 space-y-4 overflow-y-auto">
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* 左侧：料理列表 */}
				<div class="space-y-4">
					<div class="bg-area-color rounded p-4">
						{/* 筛选区域 */}
						<div class="space-y-3 mb-4">
							<input
								type="text"
								value={searchText()}
								onInput={(e) => { setSearchText(e.currentTarget.value); setPage(1); }}
								placeholder="搜索门牌号或料理名称..."
								class="w-full bg-primary-color text-accent-color rounded-lg px-4 py-2 border border-dividing-color focus:outline-none focus:border-brand-color-1st"
							/>
							<div class="flex gap-3">
								<Show when={isAdmin()}>
									<Select
										value={filterStatus()}
										setValue={(v) => { setFilterStatus(v); setPage(1); }}
										options={statusOptions}
										class="w-28"
									/>
								</Show>
								<Select
									value={filterLevel()}
									setValue={(v) => { setFilterLevel(v as number); setPage(1); }}
									options={levelOptions}
									class="w-28"
								/>
							</div>
						</div>
						
						<h2 class="text-lg font-semibold mb-3">料理列表</h2>
						<Show when={dishes.loading}>
							<div class="text-center py-8 text-muted-color">加载中...</div>
						</Show>
						<Show when={!dishes.loading && dishes()?.data?.length === 0}>
							<div class="text-center py-8 text-muted-color">暂无数据</div>
						</Show>
												<Show when={!dishes.loading && dishes()?.data?.length > 0}>
													<div class="space-y-3">
														<For each={getGroupedDishes()}>
															{(group: { playerId: string; dishes: Dish[] }) => (
																<div 
																	class="bg-primary-color rounded-lg p-4 border border-dividing-color shadow-sm cursor-pointer hover:bg-accent-color/5 transition-colors"
																	onClick={() => copyToClipboard(group.playerId)}
																	title="点击复制门牌号"
																>
																	{/* 料理名称横向排列 */}
																	<div class="flex items-center flex-wrap gap-x-4 gap-y-1">
																		<For each={group.dishes}>
																			{(dish: Dish) => (
																				<span class="text-lg font-semibold text-accent-color">
																					{dish.name}({dish.level})
																				</span>
																			)}
																		</For>
																	</div>
																	
																	{/* 管理员状态标签 */}
																	<Show when={isAdmin()}>
																		<div class="mt-2 flex gap-2">
																			<For each={group.dishes}>
																				{(dish: Dish) => (
																					<span class={`px-2 py-0.5 rounded text-xs font-medium ${getStatusStyle(dish.status)}`}>
																						{dish.name}: {getStatusText(dish.status)}
																					</span>
																				)}
																			</For>
																		</div>
																	</Show>
																	
																	{/* 门牌号（次要信息） */}
																	<div class="mt-3 pt-2 border-t border-dividing-color/50 flex items-center justify-between text-sm text-muted-color">
																		<span>门牌号: <span class="font-medium">{group.playerId}</span></span>
																		<span class="text-xs opacity-60">点击复制</span>
																	</div>
																	
																	{/* 审核操作（仅管理员可见，且有待审核的料理） */}
																	<Show when={isAdmin() && group.dishes.some(d => d.status === "Pending")}>
																		<div class="mt-4 pt-4 border-t border-dividing-color space-y-3" onClick={(e) => e.stopPropagation()}>
																			<Input
																				type="text"
																				value={reviewRemark()}
																				setValue={setReviewRemark}
																				placeholder="审核意见（可选）"
																				class="w-full"
																			/>
																			<div class="flex gap-2 flex-wrap">
																				<For each={group.dishes.filter(d => d.status === 'Pending')}>
						
						
															{(dish: Dish) => (
																<div class="flex gap-1 items-center text-sm">
																	<span class="text-muted-color">{dish.name}:</span>
																	<Button
																		level="primary"
																		onClick={() => handleReview(dish.id, "Approved")}
																		disabled={reviewing() === dish.id}
																		class="text-xs px-2 py-1"
																	>
																		通过
																	</Button>
																	<Button
																		level="secondary"
																		onClick={() => handleReview(dish.id, "Rejected")}
																		disabled={reviewing() === dish.id}
																		class="text-xs px-2 py-1"
																	>
																		拒绝
																	</Button>
																</div>
															)}
														</For>
													</div>
												</div>
											</Show>
											
											<Show when={group.dishes.some(d => d.remark)}>
												<div class="mt-3 text-sm text-muted-color bg-area-color/50 rounded p-2">
													审核意见: {group.dishes.find(d => d.remark)?.remark}
												</div>
											</Show>
										</div>
									)}
								</For>
							</div>
							{/* 分页 */}
							<Show when={dishes()?.pagination}>
								<div class="mt-6 flex items-center justify-center gap-4">
									<Button
										level="quaternary"
										onClick={() => setPage(p => Math.max(1, p - 1))}
										disabled={page() === 1}
									>
										上一页
									</Button>
									<span class="text-sm text-muted-color">
										第 {page()} / {dishes()?.pagination?.totalPages || 1} 页
									</span>
									<Button
										level="quaternary"
										onClick={() => setPage(p => p + 1)}
										disabled={page() >= (dishes()?.pagination?.totalPages || 1)}
									>
										下一页
									</Button>
								</div>
							</Show>
						</Show>
					</div>
				</div>

				{/* 右侧：提交表单和配置 */}
				<div class="space-y-4">
					{/* 提交料理表单 */}
					<div class="bg-area-color rounded p-4 space-y-3">
						<h2 class="text-lg font-semibold">提交料理</h2>
						
						<div class="space-y-2">
							<label class="block text-sm font-medium">门牌号</label>
							<Input
								type="text"
								value={submitForm().playerId}
								setValue={(v) => setSubmitForm(f => ({ ...f, playerId: v }))}
								placeholder="输入门牌号"
							/>
						</div>

						<div class="border-t border-dividing-color pt-3 mt-3">
							<label class="block text-sm font-medium mb-2">料理 1（必填）</label>
							<div class="space-y-2">
								<Input
									type="text"
									value={submitForm().dish1Name}
									setValue={(v) => setSubmitForm(f => ({ ...f, dish1Name: v }))}
									placeholder="输入料理名称"
								/>
								<Select
									value={submitForm().dish1Level}
									setValue={(v) => setSubmitForm(f => ({ ...f, dish1Level: v as number }))}
									options={Array.from({ length: 10 }, (_, i) => ({
										label: `等级 ${10 - i}`,
										value: 10 - i,
									}))}
								/>
							</div>
						</div>

						<div class="border-t border-dividing-color pt-3 mt-3">
							<label class="block text-sm font-medium mb-2">料理 2（可选）</label>
							<div class="space-y-2">
								<Input
									type="text"
									value={submitForm().dish2Name}
									setValue={(v) => setSubmitForm(f => ({ ...f, dish2Name: v }))}
									placeholder="输入料理名称（可选）"
								/>
								<Select
									value={submitForm().dish2Level}
									setValue={(v) => setSubmitForm(f => ({ ...f, dish2Level: v as number }))}
									options={Array.from({ length: 10 }, (_, i) => ({
										label: `等级 ${10 - i}`,
										value: 10 - i,
									}))}
								/>
							</div>
						</div>

						<div class="border-t border-dividing-color pt-3 mt-3 space-y-2">
							<label class="block text-sm">QQ号（可选）</label>
							<Input
								type="text"
								value={submitForm().qqNumber}
								setValue={(v) => setSubmitForm(f => ({ ...f, qqNumber: v }))}
								placeholder="输入QQ号"
							/>
						</div>

						<Button
							level="primary"
							onClick={handleSubmit}
							disabled={submitting()}
							class="w-full"
						>
							{submitting() ? "提交中..." : "提交"}
						</Button>
					</div>

					{/* WebSocket配置（仅管理员可见） */}
					<Show when={isAdmin()}>
						<div class="bg-area-color rounded p-4 space-y-3">
							<div class="flex items-center justify-between">
								<h2 class="text-lg font-semibold">机器人配置</h2>
								<div class={`flex items-center gap-1 text-sm ${wsStatus().isConnected ? 'text-green-500' : 'text-red-500'}`}>
									<span class={`w-2 h-2 rounded-full ${wsStatus().isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
									{wsStatus().isConnected ? '已连接' : '未连接'}
								</div>
							</div>
							<div class="space-y-2">
								<label class="block text-sm">WebSocket 地址</label>
								<Input
									type="text"
									value={wsUrl()}
									setValue={setWsUrl}
									placeholder="ws://localhost:8080"
								/>
							</div>
							<div class="space-y-2">
								<label class="block text-sm">认证 Token</label>
								<Input
									type="password"
									value={wsToken()}
									setValue={setWsToken}
									placeholder="输入认证Token"
								/>
							</div>
							<div class="space-y-2">
								<label class="block text-sm">命令触发头（多个用逗号分隔）</label>
								<Input
									type="text"
									value={wsTrigger()}
									setValue={setWsTrigger}
									placeholder=".,#"
								/>
							</div>
							<div class="flex items-center gap-2">
								<input
									type="checkbox"
									checked={wsEnabled()}
									onChange={(e) => setWsEnabled(e.currentTarget.checked)}
									class="w-4 h-4"
								/>
								<label class="text-sm">启用 WebSocket 连接</label>
							</div>
							<Button
								level="primary"
								onClick={handleSaveConfig}
								disabled={savingConfig()}
								class="w-full"
							>
								{savingConfig() ? "保存中..." : "保存配置"}
							</Button>
						</div>
						{/* 别名配置 */}
						<div class="bg-area-color rounded p-3">
							<div class="flex items-center justify-between mb-2">
								<span class="text-sm font-medium">料理别名</span>
								<Button level="quaternary" onClick={addAlias} class="text-xs px-2 py-1">添加</Button>
							</div>
							<div class="space-y-1 text-xs">
								<Show when={Object.keys(dishAliases()).length === 0}>
									<div class="text-muted-color opacity-50">暂无别名，例：攻回→攻击回复</div>
								</Show>
								<For each={Object.entries(dishAliases())}>
									{([alias, name]) => (
										<div class="flex items-center justify-between bg-primary-color rounded px-2 py-1">
											<span><span class="text-accent-color">{alias}</span> → {name}</span>
											<button onClick={() => removeAlias(alias)} class="text-red-400 hover:text-red-300">×</button>
										</div>
									)}
								</For>
							</div>
						</div>
						{/* 日志框 */}
						<div class="bg-area-color rounded p-3">
							<div class="flex items-center justify-between mb-2">
								<span class="text-sm font-medium text-muted-color">运行日志</span>
								<span class="text-xs text-muted-color">消息: {wsStatus().messageCount} | 群: {wsStatus().activeGroups}</span>
							</div>
							<div class="bg-primary-color rounded p-2 h-32 overflow-y-auto text-xs font-mono text-muted-color space-y-0.5">
								<Show when={wsLogs().length === 0}>
									<div class="opacity-50">暂无日志...</div>
								</Show>
								<For each={wsLogs()}>
									{(log) => <div class={log.includes('失败') || log.includes('错误') ? 'text-red-400' : log.includes('成功') ? 'text-green-400' : ''}>{log}</div>}
								</For>
							</div>
						</div>
					</Show>
				</div>
			</div>
		</div>
	);
};

export default DishPage;