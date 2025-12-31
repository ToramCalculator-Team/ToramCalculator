import { type Component, type JSX, splitProps } from "solid-js";

export type CardProps = {
	elevation?: 0 | 1 | 2 | 3 | 4 | 5;
	children?: JSX.Element;
	class?: string;
	style?: JSX.CSSProperties;
};

const Card: Component<CardProps> = (props) => {
	const [local, others] = splitProps(props, [
		"elevation",
		"children",
		"class",
		"style",
	]);

	const elevation = () => local.elevation ?? 1;

	const elevationClasses = () => {
		const elev = elevation();
		if (elev === 0) return "";
		if (elev === 1) return "shadow-sm";
		if (elev === 2) return "shadow";
		if (elev === 3) return "shadow-md";
		if (elev === 4) return "shadow-lg";
		return "shadow-xl";
	};

	return (
		<div
			class={`bg-primary-color rounded ${elevationClasses()} ${local.class || ""}`}
			style={local.style}
			{...others}
		>
			{local.children}
		</div>
	);
};

export { Card };
