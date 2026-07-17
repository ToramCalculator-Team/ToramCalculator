import { type JSX, type ParentProps, splitProps } from "solid-js";

export type ConcaveFrameProps = ParentProps<JSX.HTMLAttributes<HTMLDivElement>> & {
	contentClass?: string;
	decorationClass?: string;
};

/**
 * 可伸缩的内凹角容器。
 *
 * 边框负责复现 Figma 组件的双层轮廓与 24px 内容槽，尺寸、交互语义和前景色由调用方决定，
 * 因此同一组件可以承载方案卡、加载态等不同内容，而不会形成另一套卡片状态。
 */
export function ConcaveFrame(props: ConcaveFrameProps) {
	const [local, containerProps] = splitProps(props, ["children", "class", "contentClass", "decorationClass"]);

	return (
		<div {...containerProps} class={`relative isolate h-full w-full overflow-hidden ${local.class ?? ""}`}>
			<div
				aria-hidden="true"
				class={`bg-area-color pointer-events-none absolute inset-0 backdrop-blur ${local.decorationClass ?? ""}`}
				style={{
					"clip-path":
						"polygon(14px 0, calc(100% - 14px) 0, calc(100% - 12px) 8px, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) calc(100% - 8px), calc(100% - 14px) 100%, 14px 100%, 12px calc(100% - 8px), 0 calc(100% - 12px), 0 12px, 12px 8px)",
				}}
			/>
			<svg
				aria-hidden="true"
				viewBox="0 0 200 200"
				preserveAspectRatio="none"
				class={`pointer-events-none absolute inset-0 h-full w-full ${local.decorationClass ?? ""}`}
			>
				<path
					d="M14 1H186C186 7.5 188 10 199 13V187C188 190 186 192.5 186 199H14C14 192.5 12 190 1 187V13C12 10 14 7.5 14 1Z"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					vector-effect="non-scaling-stroke"
				/>
				<path
					d="M23 11H177C177 17.5 179 20 189 23V177C179 180 177 182.5 177 189H23C23 182.5 21 180 11 177V23C21 20 23 17.5 23 11Z"
					fill="none"
					stroke="currentColor"
					stroke-opacity="0.72"
					stroke-width="1"
					vector-effect="non-scaling-stroke"
				/>
			</svg>
			<div class={`relative h-full w-full p-6 ${local.contentClass ?? ""}`}>{local.children}</div>
		</div>
	);
}
