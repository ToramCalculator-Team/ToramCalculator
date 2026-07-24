import { getDB } from "@db/repositories/database";
import { A } from "@solidjs/router";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { createResource, createSignal, Index, type JSX, Show } from "solid-js";
import { Motion, Presence } from "solid-motionone";
import { Button } from "~/components/controls/button";
import { CheckBox } from "~/components/controls/checkBox";
import { Input, type InputComponentType } from "~/components/controls/input";
import { Radio } from "~/components/controls/radio";
import { Toggle } from "~/components/controls/toggle";
import { Icons } from "~/components/icons/index";
import { useDictionary } from "~/contexts/Dictionary";
import { createPgWorker, syncControl } from "~/lib/pglite/pg";
import { getActStore, setStore, store } from "~/store";
import { ServiceWorkerManager } from "./swManager";

// pwa的非标准类型定义
type UserChoice = Promise<{
	outcome: "accepted" | "dismissed";
	platform: string;
}>;

interface BeforeInstallPromptEvent extends Event {
	readonly platforms: string[];
	readonly userChoice: UserChoice;
	prompt(): Promise<UserChoice>;
}

async function getStorageUsageInfo(): Promise<{
	quota: number;
	usage: number;
	percent: string;
}> {
	if ("storage" in navigator && "estimate" in navigator.storage) {
		const { usage = 0, quota = 0 } = await navigator.storage.estimate();
		const percent = ((usage / quota) * 100).toFixed(2);
		return {
			usage,
			quota,
			percent: `${percent}%`,
		};
	} else {
		return {
			usage: 0,
			quota: 0,
			percent: "不支持",
		};
	}
}

export const Setting = () => {
	const dictionary = useDictionary();
	const [hasInstalled, setHasInstalled] = createSignal(true);
	const [deferredPrompt, setDeferredPrompt] = createSignal<BeforeInstallPromptEvent | null>(null);
	const [storageUsageInfo, { mutate: mutateStorageUsageInfo }] = createResource(getStorageUsageInfo);

	// 开发模式：按需往返延迟测量。
	// 原理：向 sync_heartbeat 写一行（带唯一 marker），触发 changes 日志 → 上传 /api/changes →
	// 服务端写 PG → Electric 回传到 sync_heartbeat_synced；订阅该 synced 表，看到 marker 匹配即停表。
	// 用 performance.now() 单边计时，测“发送→收到同步回传”的完整往返，无客户端/服务端时钟偏移问题。
	const PROBE_ID = "dev-roundtrip-probe";
	const [roundTripMs, setRoundTripMs] = createSignal<number | undefined>();
	const [measuring, setMeasuring] = createSignal(false);

	const measureRoundTrip = async () => {
		if (measuring()) return;
		setMeasuring(true);
		setRoundTripMs(undefined);
		// 唯一 marker：写入 seq（BIGINT）。用 Date.now() 拼随机后两位降低同毫秒碰撞概率，
		// 回传时按 String(marker) 匹配本次探测，避免命中历史行。
		const marker = Date.now() * 100 + Math.floor(Math.random() * 100);
		const markerStr = String(marker);
		const startedAt = performance.now();
		try {
			const db = await getDB();
			const pgWorker = await createPgWorker();
			// 确保写入上行通道已开启，否则 changes 不会被上传。
			syncControl.start();

			// 写入探测行：客户端 sync_heartbeat 是 view（synced + local），无唯一约束，不能用 ON CONFLICT。
			// 先查存在性，再走 INSERT 或 UPDATE 触发器；固定 PROBE_ID 避免本地表行无限增长。
			const existing = await db.selectFrom("sync_heartbeat").select("id").where("id", "=", PROBE_ID).executeTakeFirst();
			if (existing) {
				await db
					.updateTable("sync_heartbeat")
					.set({ seq: markerStr, emitted_at: new Date().toISOString() })
					.where("id", "=", PROBE_ID)
					.execute();
			} else {
				await db
					.insertInto("sync_heartbeat")
					.values({ id: PROBE_ID, seq: markerStr, emitted_at: new Date().toISOString() })
					.execute();
			}

			// 轮询 synced 表等待服务端回传：electric-sync 批量写 _synced 表不保证触发 live.query 回调，
			// 改用一次性 query 轮询最稳。必须查 _synced 而非 view（view 里本地写入会立即命中造成假阳性）。
			const worker = pgWorker as unknown as {
				query: (sql: string, params: unknown[]) => Promise<{ rows: Array<{ seq: string | number }> }>;
			};
			const POLL_INTERVAL_MS = 150;
			const TIMEOUT_MS = 15_000;
			let elapsed: number | undefined;
			while (performance.now() - startedAt < TIMEOUT_MS) {
				const res = await worker.query(`SELECT seq FROM sync_heartbeat_synced WHERE id = $1`, [PROBE_ID]);
				if (res.rows.some((r) => String(r.seq) === markerStr)) {
					elapsed = performance.now() - startedAt;
					break;
				}
				await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
			}
			if (elapsed === undefined) {
				throw new Error("测量超时（15s 未收到回传）");
			}
			setRoundTripMs(Math.round(elapsed));
		} catch (error) {
			console.warn("[devRoundTrip] 往返测量失败:", error);
			setRoundTripMs(undefined);
		} finally {
			setMeasuring(false);
		}
	};

	// pwa安装条件满足时
	window.addEventListener("beforeinstallprompt", (e) => {
		e.preventDefault();
		setDeferredPrompt(e as BeforeInstallPromptEvent);
		setHasInstalled(false);
	});

	const SettingPageContentModule = (props: {
		moduleName: string;
		labelName: string;
		content: {
			title: string;
			description: string;
			children: JSX.Element;
			type?: InputComponentType;
		}[];
	}) => (
		<div class={`Module ${props.moduleName} flex flex-col gap-1 lg:gap-2 lg:px-3`}>
			<h2 class="ModuleTitle py-2 text-xl font-bold lg:px-2">{props.labelName}</h2>
			<div class="LabelGroup flex flex-col gap-2">
				<Index each={props.content}>
					{(item) => (
						<Input title={item().title} description={item().description}>
							{item().children}
						</Input>
					)}
				</Index>
			</div>
		</div>
	);

	const Divider = () => <div class="Divider bg-dividing-color h-px w-full flex-none"></div>;

	return (
		<Presence exitBeforeEnter>
			<Show when={store.pages.settingsDialogState}>
				<Motion.div
					animate={{ transform: ["scale(1.05)", "scale(1)"], opacity: [0, 1] }}
					exit={{ transform: ["scale(1)", "scale(1.05)"], opacity: [1, 0] }}
					transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
					class={`SettingBox bg-primary-color-10 fixed top-0 left-0 grid h-dvh w-dvw transform place-items-center backdrop-blur`}
				>
					<Button
						class={`CloseBtn absolute top-3 right-3`}
						onClick={() => setStore("pages", "settingsDialogState", false)}
					>
						<Icons.Outline.Close />
					</Button>
					<div
						class={`SettingForm flex h-dvh w-full flex-1 flex-col gap-3 rounded p-6 lg:max-w-(--breakpoint-2xl) lg:p-3`}
					>
						<div class="FormTitle flex items-center">
							<h1 class="text-2xl font-bold">{dictionary().ui.settings.title}</h1>
						</div>
						<div class="FormContent flex flex-1 flex-row items-start gap-3 overflow-hidden">
							<div class="Nav hidden w-fit min-w-60 flex-col gap-2 rounded lg:flex">
								<Button level="quaternary" active>
									<Icons.Outline.Laptop />
									<span class="w-full text-left">{dictionary().ui.settings.userInterface.title}</span>
								</Button>
								<Button level="quaternary">
									<Icons.Outline.Location />
									<span class="w-full text-left">{dictionary().ui.settings.language.title}</span>
								</Button>
								<Button level="quaternary">
									<Icons.Outline.CloudUpload />
									<span class="w-full text-left">{dictionary().ui.settings.statusAndSync.title}</span>
								</Button>
								<Button level="quaternary">
									<Icons.Outline.ColorPalette />
									<span class="w-full text-left">{dictionary().ui.settings.privacy.title}</span>
								</Button>
								<Button level="quaternary">
									<Icons.Outline.VolumeDown />
									<span class="w-full text-left">{dictionary().ui.settings.messages.title}</span>
								</Button>
								<Button level="quaternary">
									<Icons.Outline.Flag />
									<span class="w-full text-left">{dictionary().ui.settings.about.title}</span>
								</Button>
								<Button level="quaternary">
									<Icons.Outline.CloudUpload />
									<span class="w-full text-left">Service Worker</span>
								</Button>
							</div>
							<div class="Divider bg-dividing-color hidden h-full w-px lg:block"></div>
							<OverlayScrollbarsComponent
								element="div"
								options={{ scrollbars: { autoHide: "scroll" } }}
								class="h-full w-full"
								defer
							>
								<div class="List flex h-full flex-1 flex-col gap-6 rounded">
									<SettingPageContentModule
										moduleName="Language"
										labelName={dictionary().ui.settings.language.title}
										content={[
											{
												title: dictionary().ui.settings.language.selectedLanguage.title,
												description: dictionary().ui.settings.language.selectedLanguage.description,
												children: (
													<div class="Selector flex flex-col">
														<Radio
															name={"zh-CN"}
															checked={store.settings.userInterface.language === "zh-CN"}
															onClick={() => setStore("settings", "userInterface", "language", "zh-CN")}
														>
															{dictionary().ui.settings.language.selectedLanguage.zhCN}
														</Radio>
														<Radio
															name="zh-TW"
															checked={store.settings.userInterface.language === "zh-TW"}
															onClick={() => setStore("settings", "userInterface", "language", "zh-TW")}
														>
															{dictionary().ui.settings.language.selectedLanguage.zhTW}
														</Radio>
														<Radio
															name="en"
															checked={store.settings.userInterface.language === "en"}
															onClick={() => setStore("settings", "userInterface", "language", "en")}
														>
															{dictionary().ui.settings.language.selectedLanguage.enUS}
														</Radio>
														<Radio
															name="ja"
															checked={store.settings.userInterface.language === "ja"}
															onClick={() => setStore("settings", "userInterface", "language", "ja")}
														>
															{dictionary().ui.settings.language.selectedLanguage.jaJP}
														</Radio>
													</div>
												),
											},
										]}
									/>
									<Divider />
									<SettingPageContentModule
										moduleName="UserInterface"
										labelName={dictionary().ui.settings.userInterface.title}
										content={[
											{
												title: dictionary().ui.settings.userInterface.colorTheme.title,
												description: dictionary().ui.settings.userInterface.colorTheme.description,
												children: (
													<div class="Selector flex flex-col">
														<Radio
															name={"Light"}
															checked={store.settings.userInterface.theme === "light"}
															onClick={() => setStore("settings", "userInterface", "theme", "light")}
														>
															Light
														</Radio>
														<Radio
															name="Dark"
															checked={store.settings.userInterface.theme === "dark"}
															onClick={() => setStore("settings", "userInterface", "theme", "dark")}
														>
															Dark
														</Radio>
													</div>
												),
											},
											{
												title: dictionary().ui.settings.userInterface.themeVersion.title,
												description: dictionary().ui.settings.userInterface.themeVersion.description,
												children: (
													<div class="Selector flex flex-col">
														<Radio
															name="v1"
															checked={store.settings.userInterface.themeVersion === "v1"}
															onClick={() => setStore("settings", "userInterface", "themeVersion", "v1")}
														>
															{dictionary().ui.settings.userInterface.themeVersion.v1}
														</Radio>
														<Radio
															name="v2"
															checked={store.settings.userInterface.themeVersion === "v2"}
															onClick={() => setStore("settings", "userInterface", "themeVersion", "v2")}
														>
															{dictionary().ui.settings.userInterface.themeVersion.v2}
														</Radio>
														<Radio
															name="v3"
															checked={store.settings.userInterface.themeVersion === "v3"}
															onClick={() => setStore("settings", "userInterface", "themeVersion", "v3")}
														>
															{dictionary().ui.settings.userInterface.themeVersion.v3}
														</Radio>
													</div>
												),
											},
											{
												title: dictionary().ui.settings.userInterface.isAnimationEnabled.title,
												description: dictionary().ui.settings.userInterface.isAnimationEnabled.description,
												children: (
													<Toggle
														name={dictionary().ui.settings.userInterface.isAnimationEnabled.title}
														onClick={() => setStore("settings", "userInterface", "isAnimationEnabled", (prev) => !prev)}
														checked={store.settings.userInterface.isAnimationEnabled}
													/>
												),
											},
											{
												title: dictionary().ui.settings.userInterface.is3DSceneEnabled.title,
												description: dictionary().ui.settings.userInterface.is3DSceneEnabled.description,
												children: (
													<Toggle
														name={dictionary().ui.settings.userInterface.is3DSceneEnabled.title}
														onClick={() => setStore("settings", "userInterface", "is3DSceneEnabled", (prev) => !prev)}
														checked={store.settings.userInterface.is3DSceneEnabled}
													/>
												),
											},
										]}
									/>
									<Divider />
									<SettingPageContentModule
										moduleName="StatusAndSync"
										labelName={dictionary().ui.settings.statusAndSync.title}
										content={[
											{
												title: dictionary().ui.settings.statusAndSync.restorePreviousStateOnStartup.title,
												description: dictionary().ui.settings.statusAndSync.restorePreviousStateOnStartup.description,
												children: (
													<Toggle
														name={dictionary().ui.settings.statusAndSync.restorePreviousStateOnStartup.title}
														onClick={() =>
															setStore("settings", "statusAndSync", "restorePreviousStateOnStartup", (prev) => !prev)
														}
														checked={store.settings.statusAndSync.restorePreviousStateOnStartup}
													/>
												),
											},
											// 开发模式：按需往返延迟测量（测“发送→收到同步回传”的完整往返耗时）。
											...(import.meta.env.DEV
												? [
														{
															title: "数据同步延迟测量",
															description: "向服务端写入一条探测数据，测量其经服务端往返同步回本地的耗时。",
															children: (
																<div class="flex items-center gap-3">
																	<Button onClick={() => void measureRoundTrip()} disabled={measuring()}>
																		{measuring() ? "测量中…" : "开始测量"}
																	</Button>
																	<Show when={roundTripMs() !== undefined}>
																		<span class="text-main-text-color text-sm">往返延迟：{roundTripMs()}ms</span>
																	</Show>
																</div>
															),
														},
													]
												: []),
										]}
									/>
									<Divider />
									<SettingPageContentModule
										moduleName="Privacy"
										labelName={dictionary().ui.settings.privacy.title}
										content={[
											{
												title: dictionary().ui.settings.privacy.postVisibility.title,
												description: dictionary().ui.settings.privacy.postVisibility.description,
												children: (
													<div class="Selector flex flex-col">
														<Radio
															name="everyone"
															checked={store.settings.privacy.postVisibility === "everyone"}
															onClick={() => setStore("settings", "privacy", "postVisibility", "everyone")}
														>
															{dictionary().ui.settings.privacy.postVisibility.everyone}
														</Radio>
														<Radio
															name="friends"
															checked={store.settings.privacy.postVisibility === "friends"}
															onClick={() => setStore("settings", "privacy", "postVisibility", "friends")}
														>
															{dictionary().ui.settings.privacy.postVisibility.friends}
														</Radio>
														<Radio
															name="onlyMe"
															checked={store.settings.privacy.postVisibility === "onlyMe"}
															onClick={() => setStore("settings", "privacy", "postVisibility", "onlyMe")}
														>
															{dictionary().ui.settings.privacy.postVisibility.onlyMe}
														</Radio>
													</div>
												),
											},
										]}
									/>
									<Divider />
									<SettingPageContentModule
										moduleName="Messages"
										labelName={dictionary().ui.settings.messages.title}
										content={[
											{
												title: dictionary().ui.settings.messages.notifyOnContentChange.title,
												description: dictionary().ui.settings.messages.notifyOnContentChange.description,
												children: (
													<div class="Selector flex flex-col">
														<CheckBox
															name="notifyOnReferencedContentChange"
															checked={store.settings.messages.notifyOnContentChange.notifyOnReferencedContentChange}
															onClick={() =>
																setStore(
																	"settings",
																	"messages",
																	"notifyOnContentChange",
																	"notifyOnReferencedContentChange",
																	(prev) => !prev,
																)
															}
														>
															{dictionary().ui.settings.messages.notifyOnContentChange.notifyOnReferencedContentChange}
														</CheckBox>
														<CheckBox
															name="notifyOnLike"
															checked={store.settings.messages.notifyOnContentChange.notifyOnLike}
															onClick={() =>
																setStore(
																	"settings",
																	"messages",
																	"notifyOnContentChange",
																	"notifyOnLike",
																	(prev) => !prev,
																)
															}
														>
															{dictionary().ui.settings.messages.notifyOnContentChange.notifyOnLike}
														</CheckBox>
														<CheckBox
															name="notifyOnBookmark"
															checked={store.settings.messages.notifyOnContentChange.notifyOnBookmark}
															onClick={() =>
																setStore(
																	"settings",
																	"messages",
																	"notifyOnContentChange",
																	"notifyOnBookmark",
																	(prev) => !prev,
																)
															}
														>
															{dictionary().ui.settings.messages.notifyOnContentChange.notifyOnBookmark}
														</CheckBox>
													</div>
												),
											},
										]}
									/>
									<Divider />
									<SettingPageContentModule
										moduleName="About"
										labelName={dictionary().ui.settings.about.title}
										content={[
											{
												title: dictionary().ui.settings.about.version.title,
												description: dictionary().ui.settings.about.version.description,
												children: <></>,
											},
											{
												title: dictionary().ui.settings.about.description.title,
												description: dictionary().ui.settings.about.description.description,
												children: <></>,
											},
											{
												title: "Repository",
												description: "Github Repository",
												children: (
													<A
														target="_blank"
														href="https://github.com/ToramCalculator-Team/ToramCalculator"
														class="hover:underline"
													>
														https://github.com/ToramCalculator-Team/ToramCalculator
													</A>
												),
											},
										]}
									/>
									<Divider />
									<SettingPageContentModule
										moduleName="Tool"
										labelName={dictionary().ui.settings.tool.title}
										content={[
											{
												title: dictionary().ui.settings.tool.pwa.title,
												description: dictionary().ui.settings.tool.pwa.description,
												children: hasInstalled() ? (
													dictionary().ui.settings.tool.pwa.notSupported
												) : (
													<Button
														onClick={async () => {
															deferredPrompt()?.prompt();
															setDeferredPrompt(null);
														}}
													>
														{dictionary().ui.actions.install}
													</Button>
												),
											},
											{
												title: dictionary().ui.settings.tool.storageInfo.title,
												description: dictionary().ui.settings.tool.storageInfo.description,
												children: (
													<>
														<p>
															{dictionary().ui.settings.tool.storageInfo.usage}:{" "}
															{((storageUsageInfo()?.usage ?? 0) / 1024 / 1024).toFixed(2)} MB
														</p>
														<Button
															onClick={async () => {
																// 清除 localStorage 和 sessionStorage
																localStorage.clear();
																sessionStorage.clear();
																// 重置内存中的store
																setStore(getActStore());
																// 刷新页面
																window.location.reload();

																// 清除所有 IndexedDB 数据库
																const dbs = await indexedDB.databases?.();
																if (dbs && dbs.length > 0) {
																	for (const db of dbs) {
																		if (db.name) {
																			indexedDB.deleteDatabase(db.name);
																		}
																	}
																}

																// 清除 PWA Cache
																const cacheNames = await caches.keys();
																await Promise.all(cacheNames.map((name) => caches.delete(name)));

																// 注销所有 service workers
																if ("serviceWorker" in navigator) {
																	const registrations = await navigator.serviceWorker.getRegistrations();
																	await Promise.all(registrations.map((r) => r.unregister()));
																}

																mutateStorageUsageInfo({
																	quota: 0,
																	usage: 0,
																	percent: "0",
																});
															}}
														>
															{dictionary().ui.settings.tool.storageInfo.clearStorage}
														</Button>
													</>
												),
											},
										]}
									/>
									<Divider />
									<div class="ServiceWorkerSection">
										<ServiceWorkerManager />
									</div>
								</div>
							</OverlayScrollbarsComponent>
						</div>
					</div>
				</Motion.div>
			</Show>
		</Presence>
	);
};
