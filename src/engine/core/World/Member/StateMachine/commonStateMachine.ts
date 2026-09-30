import type { MemberSharedRuntime } from "../runtime/SharedRuntime";

/** 公共成员状态机所需的最小运行时接口。 */
export type CommonStateMachineEnv<TRuntime extends MemberSharedRuntime = MemberSharedRuntime> = {
	runtime: TRuntime;
};

/**
 * 所有成员共用的垂直运动状态图。
 *
 * Player、Mob 等成员状态机只组合这份配置，不重复声明跳跃和落地转换。
 * 状态转换和对应的运行时修改都由此片段统一定义。
 */
export const createCommonVerticalState = <TRuntime extends MemberSharedRuntime>(
	env: CommonStateMachineEnv<TRuntime>,
) => ({
	initial: "着地",
	states: {
		着地: {
			on: {
				跳跃: {
					target: "腾空",
					guard: () => env.runtime.grounded,
					actions: () => {
						env.runtime.grounded = false;
						env.runtime.verticalVelocity = env.runtime.locomotion.jumpSpeed;
					},
				},
			},
		},
		腾空: {
			tags: "airborne",
			on: { 落地: { target: "着地" } },
		},
	},
});
