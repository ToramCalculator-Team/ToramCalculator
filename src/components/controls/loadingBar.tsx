import type { JSX } from "solid-js";
import { Motion } from "solid-motionone";

type LoadingBarProps = JSX.HTMLAttributes<HTMLDivElement> & {
	center?: boolean;
};

export function LoadingBar(props: LoadingBarProps) {
	return (
		<div {...props} class={`Loading relative overflow-x-hidden ${{ ...props }.class}`}>
			<div
				class={`${props.center ? "absolute top-1/2 transform -translate-y-1/2" : ""} line bg-accent-color z-0 h-0.5 w-full rounded-full`}
			></div>
			<Motion.div
				animate={{
					left: ["0", "100%"],
					transition: { duration: 5, repeat: Infinity, delay: 0.5 },
				}}
				class={`Break ${props.center ? "top-1/2 transform -translate-y-1/2" : ""} dot1 bg-primary-color absolute z-10 h-0.5 w-1`}
			></Motion.div>
			<Motion.div
				animate={{
					left: ["0", "100%"],
					transition: { duration: 5, repeat: Infinity, delay: 1.5 },
				}}
				class={`Break ${props.center ? "top-1/2 transform -translate-y-1/2" : ""} dot2 bg-primary-color absolute z-10 h-0.5 w-1`}
			></Motion.div>
			<Motion.div
				animate={{
					left: ["0", "100%"],
					transition: { duration: 5, repeat: Infinity, delay: 2.5 },
				}}
				class={`Break ${props.center ? "top-1/2 transform -translate-y-1/2" : ""} dot3 bg-primary-color absolute z-10 h-0.5 w-1`}
			></Motion.div>
		</div>
	);
}
