/** 游戏系统运行生命周期的共享状态转换定义。 */
export const GameSystemLifecycleStateGraph = {
	Stopped: {
		start: "Running",
	},
	Running: {
		pause: "Paused",
		stop: "Stopped",
	},
	Paused: {
		resume: "Running",
		stop: "Stopped",
	},
} as const;
