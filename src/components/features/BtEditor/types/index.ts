/**
 * An example definition and board combination category.
 */
export type ExampleCategory =
	| "advanced"
	| "leaf"
	| "composite"
	| "decorator"
	| "misc";

/**
 * An example definition and board combination.
 */
export type Example = {
	name: string;
	caption: string;
	category: ExampleCategory;
	definition: string;
	board: string;
};

export type SkillExampleCategory = "common" | "buff";

export type SkillExample = {
	name: string;
	caption: string;
	category: SkillExampleCategory;
	definition: string;
	board: string;
};
