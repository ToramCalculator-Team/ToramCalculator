import { type ParentProps, Show } from "solid-js";
import { useBootstrap } from "./BootstrapContext";

const BLOCKING_MODULES = ["pgworker", "electricInitialSync"] as const;

export function AppBootGate(props: ParentProps) {
	const bootstrap = useBootstrap();
	const dataReady = bootstrap.ready("electricInitialSync");
	const blockingError = () => {
		for (const name of BLOCKING_MODULES) {
			const status = bootstrap.status(name)();
			if (status === "error" || status === "skipped") {
				return bootstrap.error(name)()?.message ?? `${name} failed`;
			}
		}
		return undefined;
	};

	return (
		<Show
			when={dataReady()}
			fallback={
				<div class="fixed inset-0 z-9999 flex items-center justify-center bg-(--color-background) text-(--color-text-primary)">
					<div class="flex max-w-md flex-col gap-3 px-6 text-center">
						<div class="text-base font-medium">{blockingError() ? "启动恢复" : "启动中"}</div>
						<div class="text-sm opacity-70">{blockingError() ?? "正在准备本地数据库和同步数据"}</div>
					</div>
				</div>
			}
		>
			{props.children}
		</Show>
	);
}
