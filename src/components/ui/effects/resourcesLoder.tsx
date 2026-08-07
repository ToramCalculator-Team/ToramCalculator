export const ResourcesLoader = () => {
	return (
		<div id="loader" class="bg-primary-color fixed top-0 left-0 z-50 flex h-dvh w-dvw flex-col items-end justify-end">
			<div
				id="resource-list"
				class="w-dvw overflow-hidden p-6 text-xs text-nowrap text-ellipsis text-dividing-color"
			></div>
			<div class="w-dvw px-6 pb-3">
				<div class="bg-dividing-color/30 h-1 w-full overflow-hidden rounded">
					{/* 生产模式下由 entry-client 按 startup manifest 的已加载字节数更新宽度。 */}
					<div id="startup-progress-bar" class="bg-accent-color h-full w-0 transition-[width] duration-200"></div>
				</div>
			</div>
			<div id="loadingBox">
				<div class="Shadow shadow-none">
					<div class="Circle"></div>
					<div class="Circle"></div>
					<div class="Circle"></div>
					<div class="Circle"></div>
					<div class="Circle"></div>
					<div class="Circle"></div>
					<div class="Circle"></div>
					<div class="Circle"></div>
					<div class="Circle"></div>
					<div class="Circle"></div>
					<div class="Circle"></div>
					<div class="Circle"></div>
					<div class="Circle"></div>
					<div class="Circle"></div>
					<div class="Circle"></div>
					<div class="Circle"></div>
				</div>
				<div id="maskElement2"></div>
				<div id="maskElement3"></div>
				<div class="line">
					<div class="Circle"></div>
					<div class="Circle"></div>
					<div class="Circle"></div>
					<div class="Circle"></div>
					<div class="Circle"></div>
					<div class="Circle"></div>
					<div class="Circle"></div>
					<div class="Circle"></div>
					<div class="Circle"></div>
					<div class="Circle"></div>
					<div class="Circle"></div>
					<div class="Circle"></div>
					<div class="Circle"></div>
					<div class="Circle"></div>
					<div class="Circle"></div>
					<div class="Circle"></div>
				</div>
			</div>
		</div>
	);
};
