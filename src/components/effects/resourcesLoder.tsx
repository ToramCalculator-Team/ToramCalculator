export const ResourcesLoader = () => {
	return (
		<div id="loader" class="bg-primary-color fixed top-0 left-0 z-50 flex h-dvh w-dvw flex-col items-end justify-end">
			<div
				id="resource-list"
				class="w-dvw overflow-hidden p-6 text-xs text-nowrap text-ellipsis text-dividing-color"
			></div>
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
