import hotkeys from "hotkeys-js";
import { createEffect, createSignal, lazy, on, onMount, type ParentProps, Show, Suspense } from "solid-js";
import { Motion } from "solid-motionone";
import { globalCardGroup } from "~/components/business/card/globalCardGroup";
import { globalFormGroup } from "~/components/business/form/globalFormGroup";
import { RandomBallBackground } from "~/components/effects/randomBg";
import { LoginDialog } from "~/components/features/loginDialog";
import { Setting } from "~/components/features/setting";
import { MediaProvider } from "~/contexts/Media-component";
import { BootstrapProvider } from "~/lib/bootstrap/BootstrapContext";
import { EngineProvider } from "~/lib/engine/core/thread/EngineContext";
import { SceneCanvas, SceneRuntimeProvider } from "~/lib/engine/render/SceneRuntime";
import { AppActorProvider } from "~/machines/AppActorContext";
import { SceneIntentBridge } from "~/machines/projections/SceneIntentBridge";
import { setStore, store } from "~/store";
import { applyColorSystem } from "~/styles/colorSystem/colorSystemController";

const GlobalCardContainer = lazy(async () => {
	const module = await import("~/components/business/card/GlobalCardContainer");
	return { default: module.GlobalCardContainer };
});

const GlobalFormContainer = lazy(async () => {
	const module = await import("~/components/business/form/GlobalFormContainer");
	return { default: module.GlobalFormContainer };
});

export default function AppMainContet(props: ParentProps) {
	let warmCacheScheduled = false;
	const [globalCardRequested, setGlobalCardRequested] = createSignal(false);
	const [globalFormRequested, setGlobalFormRequested] = createSignal(false);

	const scheduleWarmCache = () => {
		if (warmCacheScheduled || typeof window === "undefined" || !("serviceWorker" in navigator)) {
			return;
		}

		const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
		if (connection?.saveData) {
			return;
		}

		warmCacheScheduled = true;
		const startWarmCache = async () => {
			try {
				const { waitFor } = await import("~/lib/bootstrap/context-standalone");
				// 设计目的：离线缓存会批量下载工具页、Worker、wasm 和图片；等待首轮数据同步后再启动，保证数据搜索先获得网络资源。
				await waitFor("electricInitialSync");
			} catch (error) {
				console.warn("数据启动阶段未完成，离线缓存延后到 bootstrap 判定后继续:", error);
			}
			const { warmCache } = await import("~/worker/sw/client");
			warmCache({ mode: "all" });
		};

		// Warm cache starts after the app shell is interactive; startWarmCache then waits for data readiness.
		if ("requestIdleCallback" in window) {
			(
				window as Window & { requestIdleCallback: (callback: () => void, options?: { timeout: number }) => void }
			).requestIdleCallback(() => void startWarmCache(), { timeout: 5000 });
		} else {
			setTimeout(() => void startWarmCache(), 3000);
		}
	};
	// 热键
	hotkeys("ctrl+a,ctrl+b,r,f,enter,esc", (_event, handler) => {
		switch (
		handler.key
		//   case "enter":
		//     alert("you pressed enter!");
		//     break;
		//   case "esc":
		//     alert("you pressed esc!");
		//     break;
		//   case "ctrl+a":
		//     alert("you pressed ctrl+a!");
		//     break;
		// case "ctrl+b":
		//   break;
		//   case "r":
		//     alert("you pressed r!");
		//     break;
		//   case "f":
		//     alert("you pressed f!");
		//     break;
		//   default:
		//     alert(event);
		) {
		}
	});

	// 关闭过渡动画
	const disableTransition = () => {
		document.documentElement.classList.add("transitionColorNone");
		// 防止过渡效果
		setStore("settings", "userInterface", "isAnimationEnabled", false);
	};

	// 打开过渡动画
	const enableTransition = () => {
		document.documentElement.classList.remove("transitionColorNone");
		setStore("settings", "userInterface", "isAnimationEnabled", true);
	};

	// 主题切换
	createEffect(
		on(
			() => [store.settings.userInterface.theme, store.settings.userInterface.themeVersion] as const,
			([theme, themeVersion]) => {
				console.log("主题切换");
				disableTransition();
				applyColorSystem({
					mode: theme,
					version: themeVersion,
				});
				setTimeout(() => {
					enableTransition();
				}, 1);
			},
			{
				defer: true,
			},
		),
	);
	// 禁用、启用动画
	createEffect(
		on(
			() => store.settings.userInterface.isAnimationEnabled,
			() => {
				console.log("动画禁用状态切换");
				store.settings.userInterface.isAnimationEnabled
					? document.documentElement.classList.remove("transitionNone")
					: document.documentElement.classList.add("transitionNone");
			},
			{
				defer: true,
			},
		),
	);
	// 动态设置语言
	createEffect(
		on(
			() => store.settings.userInterface.language,
			() => {
				console.log("语言切换");
				disableTransition();
				document.documentElement.lang = store.settings.userInterface.language;
				document.cookie = `lang=${store.settings.userInterface.language}; path=/; max-age=31536000;`;
				setTimeout(() => {
					enableTransition();
				}, 1);
			},
			{
				defer: true,
			},
		),
	);
	// 实时更新本地存储
	createEffect(() => {
		localStorage.setItem("store", JSON.stringify(store));
		// console.log("本地存储更新");
	});

	// 非首屏弹层首次打开时才下载对应 chunk；下载后保持挂载，交给组件内部 Presence 处理退出动画。
	createEffect(() => {
		if (globalCardGroup.size() > 0) {
			setGlobalCardRequested(true);
		}
		if (globalFormGroup.size() > 0) {
			setGlobalFormRequested(true);
		}
	});

	// 移除全局加载动画
	// 此处移除是为了客户端在初次下载完资源时，将画面从加载过渡到正常页面，preload.js中的是为了保证之后的每次页面都不展示加载动画
	createEffect(
		on(
			() => store.pages.resourcesLoaded,
			() => {
				console.log("移除全局加载动画");
				const loader = document.getElementById("loader");
				if (loader) {
					loader.style.opacity = "0";
					loader.style.scale = "1.1";
					setTimeout(() => {
						loader.remove();
					}, 1000);
				}
				scheduleWarmCache();
			},
			{
				defer: true,
			},
		),
	);

	// 本地状态更新
	onMount(() => {
		// 首屏完成要晚于组件挂载一个绘制周期，避免把“已挂载”误判成“已可见”。
		// 设计说明：全局资源 loader 只表达应用外壳绘制完成；数据库查询由 repository 和表级 loading 按需等待。
		const markFirstScreenReady = () => {
			window.dispatchEvent(new Event("app:first-screen-ready"));
			setStore("pages", "resourcesLoaded", true);
		};

		if ("requestAnimationFrame" in window) {
			window.requestAnimationFrame(() => {
				window.requestAnimationFrame(() => {
					markFirstScreenReady();
				});
			});
		} else {
			setTimeout(() => {
				markFirstScreenReady();
			}, 0);
		}
	});

	return (
		<BootstrapProvider>
			<MediaProvider>
				<EngineProvider>
					<AppActorProvider>
						<SceneRuntimeProvider enabled={store.settings.userInterface.is3DSceneEnabled}>
							<RandomBallBackground />
							<Motion.div
								id="AppMainContet"
								class={`fixed left-0 top-0 h-dvh w-dvw overflow-hidden ${store.pages.settingsDialogState ? "scale-[95%] opacity-0 blur-xs" : "blur-0 scale-100 opacity-100"}`}
							>
								<SceneCanvas />
								<SceneIntentBridge />
								{props.children}
								<LoginDialog />
								<Show when={globalCardRequested()}>
									<GlobalCardContainer />
								</Show>
								<Show when={globalFormRequested()}>
									<GlobalFormContainer />
								</Show>
							</Motion.div>
							<Setting />
						</SceneRuntimeProvider>
					</AppActorProvider>
				</EngineProvider>
			</MediaProvider>
		</BootstrapProvider>
	);
}
