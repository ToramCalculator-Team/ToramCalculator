import type {
	ActionNodeDefinition,
	AllNodeDefinition,
	AnyChildNodeDefinition,
	AnyNodeDefinition,
	BranchNodeDefinition,
	ConditionNodeDefinition,
	FailNodeDefinition,
	FlipNodeDefinition,
	LottoNodeDefinition,
	ParallelNodeDefinition,
	RaceNodeDefinition,
	RepeatNodeDefinition,
	RetryNodeDefinition,
	RootNodeDefinition,
	SelectorNodeDefinition,
	SequenceNodeDefinition,
	SucceedNodeDefinition,
	WaitNodeDefinition,
} from "../BehaviourTreeDefinition";
import {
	isCompositeNodeDefinition,
	isDecoratorNodeDefinition,
	isLeafNodeDefinition,
	isNullOrUndefined,
	isRootNodeDefinition,
} from "../BehaviourTreeDefinitionUtilities";
import { getArgumentJsonValue } from "./MDSLArguments";
import { parseArgumentTokens } from "./MDSLNodeArgumentParser";
import { parseAttributeTokens } from "./MDSLNodeAttributeParser";
import {
	popAndCheck,
	type StringLiteralPlaceholders,
	tokenise,
} from "./MDSLUtilities";

/**
 * 将 MDSL 树定义字符串转换为等效的 JSON 定义。
 * @param definition 作为 MDSL 的树定义字符串。
 * @returns 根节点 JSON 定义。
 */
export function convertMDSLToJSON(definition: string): RootNodeDefinition[] {
	// 将定义字符串解析为一组标记。
	const { tokens, placeholders } = tokenise(definition);

	// 将从 MDSL 定义解析的标记转换为 JSON 并返回。
	return convertTokensToJSONDefinition(tokens, placeholders);
}

/**
 * 将指定的树定义标记转换为 JSON 定义。
 * @param tokens 树定义标记。
 * @param stringLiteralPlaceholders 替换的字符串字面量占位符。
 * @returns 根节点 JSON 定义。
 */
function convertTokensToJSONDefinition(
	tokens: string[],
	stringLiteralPlaceholders: StringLiteralPlaceholders,
): RootNodeDefinition[] {
	// 树定义必须至少包含 3 个标记才能有效：'ROOT'、'{' 和 '}'。
	if (tokens.length < 3) {
		throw new Error("invalid token count");
	}

	// 我们应该有匹配数量的 '{' 和 '}' 标记。如果没有，则存在未正确关闭的作用域。
	if (
		tokens.filter((token) => token === "{").length !==
		tokens.filter((token) => token === "}").length
	) {
		throw new Error("scope character mismatch");
	}

	// 创建一个树栈数组，其中根节点始终在底部，当前组合/装饰器节点在顶部。
	// 对于每个定义的根节点，此数组中应该有一个元素，每个元素应该是一个以根节点作为第一个元素的数组。
	// 例如，定义了两个根节点的定义：
	// [
	//    [root, lotto, sequence],
	//    [root, selector]
	// ]
	const treeStacks: [
		Partial<RootNodeDefinition>,
		...Partial<AnyChildNodeDefinition>[],
	][] = [];

	// 创建我们创建的所有根节点定义的数组。
	const rootNodes: Partial<RootNodeDefinition>[] = [];

	// 用于将节点定义推入树栈的辅助函数。
	const pushNode = (node: AnyNodeDefinition) => {
		// 如果节点是根节点，那么我们需要创建一个新的树栈数组，根节点在根部。
		if (isRootNodeDefinition(node)) {
			// 我们需要再次检查此根节点不是另一个节点的子节点。
			// 我们可以通过检查顶部树栈是否不为空（包含现有节点）来做到这一点。
			if (treeStacks[treeStacks.length - 1]?.length) {
				throw new Error("a root node cannot be the child of another node");
			}

			// 将根节点定义添加到我们所有已解析根节点定义的数组中。
			rootNodes.push(node);

			// 将根节点定义添加到新树栈的根部。
			treeStacks.push([node]);

			return;
		}

		// 所有非根节点应该在其根节点之后推入，因此处理
		// 我们可能没有任何树栈或最顶部树栈为空的情况。
		if (!treeStacks.length || !treeStacks[treeStacks.length - 1].length) {
			throw new Error("expected root node at base of definition");
		}

		// 获取我们正在填充的当前树栈。
		const topTreeStack = treeStacks[treeStacks.length - 1];

		// 获取当前树栈中最顶部的节点，这将是组合/装饰器节点
		// 如果是组合节点，我们将填充其子节点数组；如果是装饰器，则设置其子节点。
		const topTreeStackTopNode = topTreeStack[
			topTreeStack.length - 1
		] as AnyNodeDefinition;

		// 如果当前根栈中最顶部的节点是组合或装饰器
		// 节点，则当前节点应该作为最顶部节点的子节点添加。
		if (isCompositeNodeDefinition(topTreeStackTopNode)) {
			topTreeStackTopNode.children = topTreeStackTopNode.children || [];
			topTreeStackTopNode.children.push(node);
		} else if (isDecoratorNodeDefinition(topTreeStackTopNode)) {
			// 如果顶部节点已经设置了子节点，则抛出错误，因为装饰器应该只有一个子节点。
			if (topTreeStackTopNode.child) {
				throw new Error("a decorator node must only have a single child node");
			}

			topTreeStackTopNode.child = node;
		}

		// 如果我们正在添加的节点也是组合或装饰器节点，那么我们应该将其
		// 推入当前树栈，因为后续节点将作为其子节点/子节点添加。
		if (!isLeafNodeDefinition(node)) {
			topTreeStack.push(node);
		}
	};

	// 用于从树栈中弹出最顶部节点定义并返回它的辅助函数。
	const popNode = (): AnyNodeDefinition | null => {
		let poppedNode: AnyNodeDefinition | null = null;

		// 获取我们正在填充的当前树栈。
		const topTreeStack = treeStacks[treeStacks.length - 1];

		// 如果存在，则弹出当前树栈中最顶部的节点。
		if (topTreeStack.length) {
			poppedNode = topTreeStack.pop() as AnyNodeDefinition;
		}

		// 我们不希望在树栈堆栈中有任何空的树栈。
		if (!topTreeStack.length) {
			treeStacks.pop();
		}

		return poppedNode;
	};

	// 我们应该继续处理原始标记，直到用完它们。
	while (tokens.length) {
		// 获取下一个标记。
		const token = tokens.shift() as string;

		// 我们如何创建下一个节点取决于当前原始标记值。
		switch (token.toUpperCase()) {
			case "ROOT": {
				pushNode(createRootNode(tokens, stringLiteralPlaceholders));
				break;
			}

			case "SUCCEED": {
				pushNode(createSucceedNode(tokens, stringLiteralPlaceholders));
				break;
			}

			case "FAIL": {
				pushNode(createFailNode(tokens, stringLiteralPlaceholders));
				break;
			}

			case "FLIP": {
				pushNode(createFlipNode(tokens, stringLiteralPlaceholders));
				break;
			}

			case "REPEAT": {
				pushNode(createRepeatNode(tokens, stringLiteralPlaceholders));
				break;
			}

			case "RETRY": {
				pushNode(createRetryNode(tokens, stringLiteralPlaceholders));
				break;
			}

			case "SEQUENCE": {
				pushNode(createSequenceNode(tokens, stringLiteralPlaceholders));
				break;
			}

			case "SELECTOR": {
				pushNode(createSelectorNode(tokens, stringLiteralPlaceholders));
				break;
			}

			case "PARALLEL": {
				pushNode(createParallelNode(tokens, stringLiteralPlaceholders));
				break;
			}

			case "RACE": {
				pushNode(createRaceNode(tokens, stringLiteralPlaceholders));
				break;
			}

			case "ALL": {
				pushNode(createAllNode(tokens, stringLiteralPlaceholders));
				break;
			}

			case "LOTTO": {
				pushNode(createLottoNode(tokens, stringLiteralPlaceholders));
				break;
			}

			case "ACTION": {
				pushNode(createActionNode(tokens, stringLiteralPlaceholders));
				break;
			}

			case "CONDITION": {
				pushNode(createConditionNode(tokens, stringLiteralPlaceholders));
				break;
			}

			case "WAIT": {
				pushNode(createWaitNode(tokens, stringLiteralPlaceholders));
				break;
			}

			case "BRANCH": {
				pushNode(createBranchNode(tokens, stringLiteralPlaceholders));
				break;
			}

			case "}": {
				// '}' 字符关闭当前作用域，意味着我们必须从当前堆栈中弹出一个节点。
				const poppedNode = popNode();

				// 现在我们有了节点定义，我们可以执行任何可能需要节点完全填充的验证。
				if (poppedNode) {
					validatePoppedNode(poppedNode);
				}

				break;
			}

			default: {
				throw new Error(`unexpected token: ${token}`);
			}
		}
	}

	return rootNodes as RootNodeDefinition[];
}

/**
 * 创建根节点 JSON 定义。
 * @param tokens 树定义标记。
 * @param stringLiteralPlaceholders 替换的字符串字面量占位符。
 * @returns 根节点 JSON 定义。
 */
function createRootNode(
	tokens: string[],
	stringLiteralPlaceholders: StringLiteralPlaceholders,
): RootNodeDefinition {
	// 创建根节点定义。
	let node = {
		type: "root",
	} as Partial<RootNodeDefinition>;

	// 解析任何节点参数，如果有的话，我们应该只有一个，这将是根标识符的标识符参数。
	const nodeArguments = parseArgumentTokens(tokens, stringLiteralPlaceholders);

	// 检查是否定义了任何节点参数。
	if (nodeArguments.length) {
		// 如果有的话，我们应该只有一个参数，这将是根标识符的标识符参数。
		if (nodeArguments.length === 1 && nodeArguments[0].type === "identifier") {
			// 根节点标识符将是第一个也是唯一的节点参数值。
			node.id = nodeArguments[0].value as string;
		} else {
			throw new Error("expected single root name argument");
		}
	}

	// 获取任何节点属性定义并将它们展开到节点定义中。
	node = {
		...node,
		...parseAttributeTokens(tokens, stringLiteralPlaceholders),
	};

	// 这是一个装饰器节点，因此我们期望有一个开括号 '{'。
	popAndCheck(tokens, "{");

	// 返回根节点定义。
	return node as RootNodeDefinition;
}

/**
 * 创建成功节点 JSON 定义。
 * @param tokens 树定义标记。
 * @param stringLiteralPlaceholders 替换的字符串字面量占位符。
 * @returns 成功节点 JSON 定义。
 */
function createSucceedNode(
	tokens: string[],
	stringLiteralPlaceholders: StringLiteralPlaceholders,
): SucceedNodeDefinition {
	const node = {
		type: "succeed",
		...parseAttributeTokens(tokens, stringLiteralPlaceholders),
	} as SucceedNodeDefinition;

	// 这是一个装饰器节点，因此我们期望有一个开括号 '{'。
	popAndCheck(tokens, "{");

	// 返回成功节点定义。
	return node;
}

/**
 * 创建失败节点 JSON 定义。
 * @param tokens 树定义标记。
 * @param stringLiteralPlaceholders 替换的字符串字面量占位符。
 * @returns 失败节点 JSON 定义。
 */
function createFailNode(
	tokens: string[],
	stringLiteralPlaceholders: StringLiteralPlaceholders,
): FailNodeDefinition {
	const node = {
		type: "fail",
		...parseAttributeTokens(tokens, stringLiteralPlaceholders),
	} as FailNodeDefinition;

	// 这是一个装饰器节点，因此我们期望有一个开括号 '{'。
	popAndCheck(tokens, "{");

	// 返回失败节点定义。
	return node;
}

/**
 * 创建翻转节点 JSON 定义。
 * @param tokens 树定义标记。
 * @param stringLiteralPlaceholders 替换的字符串字面量占位符。
 * @returns 翻转节点 JSON 定义。
 */
function createFlipNode(
	tokens: string[],
	stringLiteralPlaceholders: StringLiteralPlaceholders,
): FlipNodeDefinition {
	const node = {
		type: "flip",
		...parseAttributeTokens(tokens, stringLiteralPlaceholders),
	} as FlipNodeDefinition;

	// 这是一个装饰器节点，因此我们期望有一个开括号 '{'。
	popAndCheck(tokens, "{");

	// 返回翻转节点定义。
	return node;
}

/**
 * 创建重复节点 JSON 定义。
 * @param tokens 树定义标记。
 * @param stringLiteralPlaceholders 替换的字符串字面量占位符。
 * @returns 重复节点 JSON 定义。
 */
function createRepeatNode(
	tokens: string[],
	stringLiteralPlaceholders: StringLiteralPlaceholders,
): RepeatNodeDefinition {
	let node = { type: "repeat" } as RepeatNodeDefinition;

	// 获取节点参数。
	const nodeArguments = parseArgumentTokens(tokens, stringLiteralPlaceholders);

	// 重复节点的参数是可选的。我们可能有：
	// - 没有节点参数，在这种情况下，重复节点将无限迭代。
	// - 一个节点参数，这将是明确的迭代次数。
	// - 两个节点参数，定义最小和最大迭代边界，从中将随机选择迭代计数。
	if (nodeArguments.length) {
		// 所有重复节点参数必须是 number 类型且必须是整数。
		nodeArguments
			.filter((arg) => arg.type !== "number" || !arg.isInteger)
			.forEach(() => {
				throw new Error(`repeat node iteration counts must be integer values`);
			});

		// 我们应该得到一个或两个迭代计数。
		if (nodeArguments.length === 1) {
			// 定义了静态迭代计数。
			node.iterations = nodeArguments[0].value as number;

			// 如果定义了，重复节点必须具有正数的迭代次数。
			if (node.iterations < 0) {
				throw new Error(
					"a repeat node must have a positive number of iterations if defined",
				);
			}
		} else if (nodeArguments.length === 2) {
			// 定义了最小和最大迭代计数。
			node.iterations = [
				nodeArguments[0].value as number,
				nodeArguments[1].value as number,
			];

			// 如果定义了，重复节点必须具有正数的最小和最大迭代计数。
			if (node.iterations[0] < 0 || node.iterations[1] < 0) {
				throw new Error(
					"a repeat node must have a positive minimum and maximum iteration count if defined",
				);
			}

			// 重复节点的最小迭代计数不能超过最大迭代计数。
			if (node.iterations[0] > node.iterations[1]) {
				throw new Error(
					"a repeat node must not have a minimum iteration count that exceeds the maximum iteration count",
				);
			}
		} else {
			// 定义了不正确的迭代计数数量。
			throw new Error(
				"invalid number of repeat node iteration count arguments defined",
			);
		}
	}

	// 获取任何节点属性定义并将它们展开到节点定义中。
	node = {
		...node,
		...parseAttributeTokens(tokens, stringLiteralPlaceholders),
	};

	// 这是一个装饰器节点，因此我们期望有一个开括号 '{'。
	popAndCheck(tokens, "{");

	// 返回重复节点定义。
	return node;
}

/**
 * 创建重试节点 JSON 定义。
 * @param tokens 树定义标记。
 * @param stringLiteralPlaceholders 替换的字符串字面量占位符。
 * @returns 重试节点 JSON 定义。
 */
function createRetryNode(
	tokens: string[],
	stringLiteralPlaceholders: StringLiteralPlaceholders,
): RetryNodeDefinition {
	let node = { type: "retry" } as RetryNodeDefinition;

	// 获取节点参数。
	const nodeArguments = parseArgumentTokens(tokens, stringLiteralPlaceholders);

	// 重试节点的参数是可选的。我们可能有：
	// - 没有节点参数，在这种情况下，重试节点将无限尝试。
	// - 一个节点参数，这将是明确的尝试次数。
	// - 两个节点参数，定义最小和最大尝试边界，从中将随机选择尝试计数。
	if (nodeArguments.length) {
		// 所有重试节点参数必须是 number 类型且必须是整数。
		nodeArguments
			.filter((arg) => arg.type !== "number" || !arg.isInteger)
			.forEach(() => {
				throw new Error(`retry node attempt counts must be integer values`);
			});

		// 我们应该得到一个或两个尝试计数。
		if (nodeArguments.length === 1) {
			// 定义了静态尝试计数。
			node.attempts = nodeArguments[0].value as number;

			// 如果定义了，重试节点必须具有正数的尝试次数。
			if (node.attempts < 0) {
				throw new Error(
					"a retry node must have a positive number of attempts if defined",
				);
			}
		} else if (nodeArguments.length === 2) {
			// 定义了最小和最大尝试计数。
			node.attempts = [
				nodeArguments[0].value as number,
				nodeArguments[1].value as number,
			];

			// 如果定义了，重试节点必须具有正数的最小和最大尝试计数。
			if (node.attempts[0] < 0 || node.attempts[1] < 0) {
				throw new Error(
					"a retry node must have a positive minimum and maximum attempt count if defined",
				);
			}

			// 重试节点的最小尝试计数不能超过最大尝试计数。
			if (node.attempts[0] > node.attempts[1]) {
				throw new Error(
					"a retry node must not have a minimum attempt count that exceeds the maximum attempt count",
				);
			}
		} else {
			// 定义了不正确的尝试计数数量。
			throw new Error(
				"invalid number of retry node attempt count arguments defined",
			);
		}
	}

	// 获取任何节点属性定义并将它们展开到节点定义中。
	node = {
		...node,
		...parseAttributeTokens(tokens, stringLiteralPlaceholders),
	};

	// 这是一个装饰器节点，因此我们期望有一个开括号 '{'。
	popAndCheck(tokens, "{");

	// 返回重试节点定义。
	return node;
}

/**
 * 创建序列节点 JSON 定义。
 * @param tokens 树定义标记。
 * @param stringLiteralPlaceholders 替换的字符串字面量占位符。
 * @returns 序列节点 JSON 定义。
 */
function createSequenceNode(
	tokens: string[],
	stringLiteralPlaceholders: StringLiteralPlaceholders,
): SequenceNodeDefinition {
	const node = {
		type: "sequence",
		...parseAttributeTokens(tokens, stringLiteralPlaceholders),
	} as SequenceNodeDefinition;

	// 这是一个组合节点，因此我们期望有一个开括号 '{'。
	popAndCheck(tokens, "{");

	// 返回序列节点定义。
	return node;
}

/**
 * 创建选择器节点 JSON 定义。
 * @param tokens 树定义标记。
 * @param stringLiteralPlaceholders 替换的字符串字面量占位符。
 * @returns 选择器节点 JSON 定义。
 */
function createSelectorNode(
	tokens: string[],
	stringLiteralPlaceholders: StringLiteralPlaceholders,
): SelectorNodeDefinition {
	const node = {
		type: "selector",
		...parseAttributeTokens(tokens, stringLiteralPlaceholders),
	} as SelectorNodeDefinition;

	// 这是一个组合节点，因此我们期望有一个开括号 '{'。
	popAndCheck(tokens, "{");

	// 返回选择器节点定义。
	return node;
}

/**
 * 创建并行节点 JSON 定义。
 * @param tokens 树定义标记。
 * @param stringLiteralPlaceholders 替换的字符串字面量占位符。
 * @returns 并行节点 JSON 定义。
 */
function createParallelNode(
	tokens: string[],
	stringLiteralPlaceholders: StringLiteralPlaceholders,
): ParallelNodeDefinition {
	const node = {
		type: "parallel",
		...parseAttributeTokens(tokens, stringLiteralPlaceholders),
	} as ParallelNodeDefinition;

	// 这是一个组合节点，因此我们期望有一个开括号 '{'。
	popAndCheck(tokens, "{");

	// 返回并行节点定义。
	return node;
}

/**
 * 创建竞态节点 JSON 定义。
 * @param tokens 树定义标记。
 * @param stringLiteralPlaceholders 替换的字符串字面量占位符。
 * @returns 竞态节点 JSON 定义。
 */
function createRaceNode(
	tokens: string[],
	stringLiteralPlaceholders: StringLiteralPlaceholders,
): RaceNodeDefinition {
	const node = {
		type: "race",
		...parseAttributeTokens(tokens, stringLiteralPlaceholders),
	} as RaceNodeDefinition;

	// 这是一个组合节点，因此我们期望有一个开括号 '{'。
	popAndCheck(tokens, "{");

	// 返回竞态节点定义。
	return node;
}

/**
 * 创建全部节点 JSON 定义。
 * @param tokens 树定义标记。
 * @param stringLiteralPlaceholders 替换的字符串字面量占位符。
 * @returns 全部节点 JSON 定义。
 */
function createAllNode(
	tokens: string[],
	stringLiteralPlaceholders: StringLiteralPlaceholders,
): AllNodeDefinition {
	const node = {
		type: "all",
		...parseAttributeTokens(tokens, stringLiteralPlaceholders),
	} as AllNodeDefinition;

	// 这是一个组合节点，因此我们期望有一个开括号 '{'。
	popAndCheck(tokens, "{");

	// 返回全部节点定义。
	return node;
}

/**
 * 创建抽签节点 JSON 定义。
 * @param tokens 树定义标记。
 * @param stringLiteralPlaceholders 替换的字符串字面量占位符。
 * @returns 抽签节点 JSON 定义。
 */
function createLottoNode(
	tokens: string[],
	stringLiteralPlaceholders: StringLiteralPlaceholders,
): LottoNodeDefinition {
	// 如果定义了任何节点参数，则它们必须是我们的权重。
	const nodeArguments = parseArgumentTokens(tokens, stringLiteralPlaceholders);

	// 所有抽签节点参数必须是非负整数或 agent 属性引用（$xxx）。
	nodeArguments.forEach((arg) => {
		if (arg.type === "number") {
			if (!arg.isInteger || arg.value < 0) {
				throw new Error(
					`lotto node weight arguments must be non-negative integer values`,
				);
			}
			return;
		}
		if (arg.type === "property_reference") {
			return;
		}
		throw new Error(
			`lotto node weight arguments must be non-negative integer values or agent property references`,
		);
	});

	const node = {
		type: "lotto",
		...parseAttributeTokens(tokens, stringLiteralPlaceholders),
	} as LottoNodeDefinition;

	// 如果定义了权重，则应用它们。
	if (nodeArguments.length) {
		node.weights = nodeArguments.map(getArgumentJsonValue);
	}

	// 这是一个组合节点，因此我们期望有一个开括号 '{'。
	popAndCheck(tokens, "{");

	// 返回抽签节点定义。
	return node;
}

/**
 * 创建动作节点 JSON 定义。
 * @param tokens 树定义标记。
 * @param stringLiteralPlaceholders 替换的字符串字面量占位符。
 * @returns 动作节点 JSON 定义。
 */
function createActionNode(
	tokens: string[],
	stringLiteralPlaceholders: StringLiteralPlaceholders,
): ActionNodeDefinition {
	// 解析任何节点参数，我们应该至少有一个，这将是动作名称的标识符参数
	// 和用于动作的 agent 函数，所有其他参数将作为该函数的参数传递。
	const [actionNameIdentifier, ...agentFunctionArgs] = parseArgumentTokens(
		tokens,
		stringLiteralPlaceholders,
	);

	// 我们的第一个参数必须已定义且是标识符，因为我们需要动作名称参数。
	if (actionNameIdentifier?.type !== "identifier") {
		throw new Error("expected action name identifier argument");
	}

	// 只有第一个参数应该是标识符，所有后续的 agent 函数参数必须是 string、number、boolean、agent 属性引用或 null。
	agentFunctionArgs
		.filter((arg) => arg.type === "identifier")
		.forEach((arg) => {
			throw new Error(
				`invalid action node argument value '${arg.value}', must be string, number, boolean, agent property reference or null`,
			);
		});

	// 返回动作节点定义。
	return {
		type: "action",
		call: actionNameIdentifier.value,
		args: agentFunctionArgs.map(getArgumentJsonValue),
		...parseAttributeTokens(tokens, stringLiteralPlaceholders),
	};
}

/**
 * 创建条件节点 JSON 定义。
 * @param tokens 树定义标记。
 * @param stringLiteralPlaceholders 替换的字符串字面量占位符。
 * @returns 条件节点 JSON 定义。
 */
function createConditionNode(
	tokens: string[],
	stringLiteralPlaceholders: StringLiteralPlaceholders,
): ConditionNodeDefinition {
	// 解析任何节点参数，我们应该至少有一个，这将是条件名称的标识符参数
	// 和用于条件的 agent 函数，所有其他参数将作为该函数的参数传递。
	const [conditionNameIdentifier, ...agentFunctionArgs] = parseArgumentTokens(
		tokens,
		stringLiteralPlaceholders,
	);

	// 我们的第一个参数必须已定义且是标识符，因为我们需要条件名称参数。
	if (conditionNameIdentifier?.type !== "identifier") {
		throw new Error("expected condition name identifier argument");
	}

	// 只有第一个参数应该是标识符，所有后续的 agent 函数参数必须是 string、number、boolean、agent 属性引用或 null。
	agentFunctionArgs
		.filter((arg) => arg.type === "identifier")
		.forEach((arg) => {
			throw new Error(
				`invalid condition node argument value '${arg.value}', must be string, number, boolean, agent property reference or null`,
			);
		});

	// 返回条件节点定义。
	return {
		type: "condition",
		call: conditionNameIdentifier.value,
		args: agentFunctionArgs.map(getArgumentJsonValue),
		...parseAttributeTokens(tokens, stringLiteralPlaceholders),
	};
}

/**
 * 创建等待节点 JSON 定义。
 * @param tokens 树定义标记。
 * @param stringLiteralPlaceholders 替换的字符串字面量占位符。
 * @returns 等待节点 JSON 定义。
 */
function createWaitNode(
	tokens: string[],
	stringLiteralPlaceholders: StringLiteralPlaceholders,
): WaitNodeDefinition {
	const node = { type: "wait" } as WaitNodeDefinition;

	// 获取节点参数。
	const nodeArguments = parseArgumentTokens(tokens, stringLiteralPlaceholders);

	// 等待节点的参数是可选的。我们可能有：
	// - 没有节点参数，在这种情况下，等待将无限期，直到被中止。
	// - 一个节点参数，这将是明确的等待持续时间。
	// - 两个节点参数，定义最小和最大持续时间边界，从中将随机选择持续时间。
	if (nodeArguments.length) {
		// 所有等待节点参数必须是整数数字或 agent 属性引用（$xxx）。
		nodeArguments.forEach((arg) => {
			if (arg.type === "number") {
				if (!arg.isInteger) {
					throw new Error(`wait node durations must be integer values`);
				}
				return;
			}
			if (arg.type === "property_reference") {
				return;
			}
			throw new Error(
				`wait node durations must be integer values or agent property references`,
			);
		});

		// 我们可能有：
		// - 一个节点参数，这将是明确的等待持续时间。
		// - 两个节点参数，定义最小和最大持续时间边界，从中将随机选择持续时间。
		// - 太多参数，这是无效的。
		if (nodeArguments.length === 1) {
			// 定义了明确的持续时间（或 agent 属性引用）。
			node.duration = getArgumentJsonValue(nodeArguments[0]);

			// 如果定义了明确的持续时间且是数字，则它必须是正数。
			if (
				nodeArguments[0].type === "number" &&
				(nodeArguments[0].value as number) < 0
			) {
				throw new Error("a wait node must have a positive duration");
			}
		} else if (nodeArguments.length === 2) {
			// 定义了最小和最大持续时间边界，从中将随机选择持续时间。
			node.duration = [
				getArgumentJsonValue(nodeArguments[0]),
				getArgumentJsonValue(nodeArguments[1]),
			];

			// 等待节点必须具有正数的最小和最大持续时间（如果它们是数字）。
			if (
				nodeArguments[0].type === "number" &&
				(nodeArguments[0].value as number) < 0
			) {
				throw new Error(
					"a wait node must have a positive minimum and maximum duration",
				);
			}
			if (
				nodeArguments[1].type === "number" &&
				(nodeArguments[1].value as number) < 0
			) {
				throw new Error(
					"a wait node must have a positive minimum and maximum duration",
				);
			}

			// 等待节点的最小持续时间不能超过最大持续时间（当两者都是数字时）。
			if (
				nodeArguments[0].type === "number" &&
				nodeArguments[1].type === "number" &&
				(nodeArguments[0].value as number) > (nodeArguments[1].value as number)
			) {
				throw new Error(
					"a wait node must not have a minimum duration that exceeds the maximum duration",
				);
			}
		} else if (nodeArguments.length > 2) {
			// 定义了不正确的持续时间参数数量。
			throw new Error("invalid number of wait node duration arguments defined");
		}
	}

	// 返回等待节点定义。
	return {
		...node,
		...parseAttributeTokens(tokens, stringLiteralPlaceholders),
	};
}

/**
 * 创建分支节点 JSON 定义。
 * @param tokens 树定义标记。
 * @param stringLiteralPlaceholders 替换的字符串字面量占位符。
 * @returns 分支节点 JSON 定义。
 */
function createBranchNode(
	tokens: string[],
	stringLiteralPlaceholders: StringLiteralPlaceholders,
): BranchNodeDefinition {
	// 解析任何节点参数，我们应该有一个，这将是根引用的标识符参数。
	const nodeArguments = parseArgumentTokens(tokens, stringLiteralPlaceholders);

	// 对于分支节点，我们应该只有一个标识符参数，这是根引用。
	if (nodeArguments.length !== 1 || nodeArguments[0].type !== "identifier") {
		throw new Error("expected single branch name argument");
	}

	// 返回分支节点定义。
	return { type: "branch", ref: nodeArguments[0].value };
}

/**
 * 验证从树栈中弹出的完全填充的节点定义。
 * @param definition 要验证的弹出节点。
 */
function validatePoppedNode(definition: AnyNodeDefinition): void {
	// 装饰器必须定义子节点。
	if (
		isDecoratorNodeDefinition(definition) &&
		isNullOrUndefined(definition.child)
	) {
		throw new Error(
			`a ${definition.type} node must have a single child node defined`,
		);
	}

	// 组合节点必须至少定义一个子节点。
	if (isCompositeNodeDefinition(definition) && !definition.children?.length) {
		throw new Error(
			`a ${definition.type} node must have at least a single child node defined`,
		);
	}

	// 我们需要确保定义了权重的抽签节点具有与子节点数量匹配的权重数量。
	if (definition.type === "lotto") {
		// 检查是否定义了 'weights' 属性，如果定义了，我们期望它是权重数组。
		if (typeof definition.weights !== "undefined") {
			// 检查权重属性是否为正整数数组，每个子节点元素对应一个元素。
			if (definition.weights.length !== definition.children.length) {
				throw new Error(
					"expected a number of weight arguments matching the number of child nodes for lotto node",
				);
			}
		}
	}
}
