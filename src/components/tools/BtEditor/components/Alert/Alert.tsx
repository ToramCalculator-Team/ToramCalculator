import { type Component, type JSX, splitProps } from "solid-js";

export type AlertProps = {
	severity?: "error" | "warning" | "info" | "success";
	children?: JSX.Element;
	class?: string;
};

const Alert: Component<AlertProps> = (props) => {
	const [local, others] = splitProps(props, ["severity", "children", "class"]);

	const severity = () => local.severity || "info";

	const severityClasses = () => {
		const sev = severity();
		if (sev === "error") {
			return "bg-fire/10 text-fire border-l-4 border-fire";
		} else if (sev === "warning") {
			return "bg-earth/10 text-earth border-l-4 border-earth";
		} else if (sev === "success") {
			return "bg-wind/10 text-wind border-l-4 border-wind";
		}
		return "bg-water/10 text-water border-l-4 border-water";
	};

	return (
		<div
			class={`flex items-center p-4 rounded-none ${severityClasses()} ${local.class || ""}`}
			role="alert"
			{...others}
		>
			{local.children}
		</div>
	);
};

export { Alert };
