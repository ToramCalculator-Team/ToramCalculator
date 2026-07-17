import type { MemberType } from "@db/schema/enums";
import type { AttributeSlotDeclarationData } from "@db/schema/jsons";
import { createBtContext } from "~/lib/engine/core/World/Member/runtime/BehaviourTree/BtContextFactory";
import { validateSlotDeclarationPath } from "~/lib/engine/core/World/Member/runtime/StatContainer/SchemaMerge";
import { validateDefinition } from "~/lib/mistreevous";
import type { NodeArgument } from "~/lib/mistreevous/BehaviourTreeDefinition";
import type { MdslIntellisenseRegistry } from "../modes/mdslIntellisense";
import { getRequiredParamCount } from "../modes/mdslIntellisense";
import { getErrorMessage } from "../utils/errors";
import {
	COMPOSITE_NODE_TYPES,
	DECORATOR_NODE_TYPES,
	type EditableBtAttribute,
	type EditableBtDocument,
	type EditableBtNode,
	editableDocumentToRootDefinitions,
} from "./editableTree";
import { createPreviewBtRuntime } from "./previewRuntime";

export type BtAuthoringDiagnosticSeverity = "error" | "warning" | "info";

export type BtAuthoringDiagnostic = {
	severity: BtAuthoringDiagnosticSeverity;
	code: string;
	message: string;
	rootKey?: string;
	nodeId?: string;
};

export type BtAuthoringValidationInput = {
	document: EditableBtDocument;
	memberType: MemberType;
	agent: string;
	attributeSlots: AttributeSlotDeclarationData[];
	registry: MdslIntellisenseRegistry;
};

export function validateBtAuthoring(input: BtAuthoringValidationInput): BtAuthoringDiagnostic[] {
	const diagnostics: BtAuthoringDiagnostic[] = [];
	diagnostics.push(...validateDocumentStructure(input.document));
	diagnostics.push(...validateCalls(input.document, input.registry));
	diagnostics.push(...validateMdslSerializableArguments(input.document));
	diagnostics.push(...validateAgentContext(input.memberType, input.agent));
	diagnostics.push(
		...validateAttributeSlots(input.attributeSlots).map((message) => ({
			severity: "error" as const,
			code: "slot.invalid",
			message,
		})),
	);

	try {
		const validation = validateDefinition(editableDocumentToRootDefinitions(input.document));
		if (!validation.succeeded) {
			diagnostics.push({
				severity: "error",
				code: "definition.invalid",
				message: validation.errorMessage ?? "行为树定义无效",
			});
		}
	} catch (error) {
		diagnostics.push({
			severity: "error",
			code: "definition.invalid",
			message: getErrorMessage(error),
		});
	}

	return dedupeDiagnostics(diagnostics);
}

export function getBlockingDiagnostics(diagnostics: readonly BtAuthoringDiagnostic[]): BtAuthoringDiagnostic[] {
	return diagnostics.filter((diagnostic) => diagnostic.severity === "error");
}

export function validateAttributeSlots(slots: readonly AttributeSlotDeclarationData[]): string[] {
	const errors: string[] = [];
	const seen = new Map<string, string>();

	for (const slot of slots) {
		const path = slot.path.trim();
		const pathError = validateSlotDeclarationPath(path);
		if (pathError) {
			errors.push(pathError);
			continue;
		}
		if (!slot.attribute.displayName.trim()) {
			errors.push(`${path}：displayName 不能为空`);
		}
		if (!slot.attribute.expression.trim()) {
			errors.push(`${path}：expression 不能为空`);
		}
		const signature = JSON.stringify(slot.attribute);
		const existing = seen.get(path);
		if (existing && existing !== signature) {
			errors.push(`${path}：重复路径定义不一致`);
		}
		seen.set(path, signature);
	}

	return errors;
}

function validateDocumentStructure(document: EditableBtDocument): BtAuthoringDiagnostic[] {
	const diagnostics: BtAuthoringDiagnostic[] = [];
	const primaryRoots = document.roots.filter((root) => !root.name);
	if (primaryRoots.length !== 1) {
		diagnostics.push({
			severity: "error",
			code: "root.primary.count",
			message: "行为树必须有且只有一个未命名主入口",
		});
	}

	const rootNames = new Map<string, string>();
	for (const root of document.roots) {
		if (!root.name) continue;
		const existing = rootNames.get(root.name);
		if (existing) {
			diagnostics.push({
				severity: "error",
				code: "root.name.duplicate",
				rootKey: root.key,
				message: `重复子树名称：${root.name}`,
			});
		}
		rootNames.set(root.name, root.key);
	}

	const walk = (rootKey: string, node: EditableBtNode): void => {
		if (COMPOSITE_NODE_TYPES.has(node.type) && node.children.length === 0) {
			diagnostics.push({
				severity: "error",
				code: "node.children.empty",
				rootKey,
				nodeId: node.id,
				message: `${node.type} 节点至少需要一个子节点`,
			});
		}
		if (DECORATOR_NODE_TYPES.has(node.type) && node.children.length !== 1) {
			diagnostics.push({
				severity: "error",
				code: "node.child.count",
				rootKey,
				nodeId: node.id,
				message: `${node.type} 节点必须有且只有一个子节点`,
			});
		}
		if (node.type === "branch") {
			const ref = node.ref?.trim();
			if (!ref || !rootNames.has(ref)) {
				diagnostics.push({
					severity: "error",
					code: "branch.ref.missing",
					rootKey,
					nodeId: node.id,
					message: ref ? `branch 引用的子树不存在：${ref}` : "branch ref 不能为空",
				});
			}
		}
		for (const child of node.children) walk(rootKey, child);
	};

	for (const root of document.roots) {
		walk(root.key, root.tree.root);
	}
	return diagnostics;
}

function validateCalls(document: EditableBtDocument, registry: MdslIntellisenseRegistry): BtAuthoringDiagnostic[] {
	const diagnostics: BtAuthoringDiagnostic[] = [];
	const checkCall = (
		rootKey: string,
		nodeId: string,
		kind: "action" | "condition" | "callback" | "guard",
		call: string | undefined,
		args: readonly NodeArgument[],
	): void => {
		if (!call) return;
		const spec =
			kind === "action"
				? registry.actions[call]
				: kind === "condition"
					? registry.conditions[call]
					: kind === "callback"
						? registry.callbacks[call]
						: registry.guards[call];
		if (!spec) {
			diagnostics.push({
				severity: "error",
				code: `${kind}.unknown`,
				rootKey,
				nodeId,
				message:
					kind === "action"
						? `未知动作：${call}`
						: kind === "condition"
							? `未知条件：${call}`
							: `未知回调/守卫：${call}`,
			});
			return;
		}
		const requiredCount = getRequiredParamCount(spec);
		if (args.length < requiredCount || args.length > spec.params.length) {
			const expected =
				requiredCount === spec.params.length ? `${spec.params.length}` : `${requiredCount}~${spec.params.length}`;
			diagnostics.push({
				severity: "error",
				code: `${kind}.arg.count`,
				rootKey,
				nodeId,
				message: `${call} 参数数量应为 ${expected}，当前为 ${args.length}`,
			});
		}
	};
	const checkAttribute = (
		rootKey: string,
		nodeId: string,
		kind: "callback" | "guard",
		attribute: EditableBtAttribute | undefined,
	): void => {
		if (!attribute) return;
		checkCall(rootKey, nodeId, kind, attribute.call, attribute.args);
	};
	const walk = (rootKey: string, node: EditableBtNode): void => {
		if (node.type === "action") checkCall(rootKey, node.id, "action", node.call, node.args);
		if (node.type === "condition") checkCall(rootKey, node.id, "condition", node.call, node.args);
		checkAttribute(rootKey, node.id, "callback", node.entry);
		checkAttribute(rootKey, node.id, "callback", node.step);
		checkAttribute(rootKey, node.id, "callback", node.exit);
		checkAttribute(rootKey, node.id, "guard", node.while);
		checkAttribute(rootKey, node.id, "guard", node.until);
		for (const child of node.children) walk(rootKey, child);
	};
	for (const root of document.roots) {
		walk(root.key, root.tree.root);
	}
	return diagnostics;
}

function validateMdslSerializableArguments(document: EditableBtDocument): BtAuthoringDiagnostic[] {
	const diagnostics: BtAuthoringDiagnostic[] = [];
	const checkArgument = (rootKey: string, nodeId: string, arg: unknown): void => {
		if (!isPropertyReferenceArgument(arg)) return;
		if (isMdslPlainIdentifier(arg.$)) return;
		diagnostics.push({
			severity: "error",
			code: "definition.mdsl.propertyRef",
			rootKey,
			nodeId,
			message: `属性引用无法序列化为 MDSL：$${arg.$}`,
		});
	};
	const checkArguments = (rootKey: string, nodeId: string, args: readonly unknown[] | undefined): void => {
		for (const arg of args ?? []) checkArgument(rootKey, nodeId, arg);
	};
	const checkAttribute = (rootKey: string, nodeId: string, attribute: EditableBtAttribute | undefined): void => {
		checkArguments(rootKey, nodeId, attribute?.args);
	};
	const walk = (rootKey: string, node: EditableBtNode): void => {
		checkArguments(rootKey, node.id, node.args);
		if (node.type === "wait") {
			checkArguments(rootKey, node.id, Array.isArray(node.duration) ? node.duration : [node.duration]);
		}
		if (node.type === "lotto") {
			checkArguments(rootKey, node.id, node.weights);
		}
		checkAttribute(rootKey, node.id, node.entry);
		checkAttribute(rootKey, node.id, node.step);
		checkAttribute(rootKey, node.id, node.exit);
		checkAttribute(rootKey, node.id, node.while);
		checkAttribute(rootKey, node.id, node.until);
		for (const child of node.children) walk(rootKey, child);
	};
	for (const root of document.roots) {
		walk(root.key, root.tree.root);
	}
	return diagnostics;
}

function isPropertyReferenceArgument(arg: unknown): arg is { $: string } {
	return typeof arg === "object" && arg !== null && "$" in arg && typeof arg.$ === "string";
}

function isMdslPlainIdentifier(value: string): boolean {
	const trimmed = value.trim();
	if (!trimmed || trimmed !== value || trimmed.startsWith("$")) return false;
	return !/[\s[\](){},"]/.test(trimmed);
}

function validateAgentContext(memberType: MemberType, agent: string): BtAuthoringDiagnostic[] {
	const diagnostics: BtAuthoringDiagnostic[] = [];
	const { env, btBindings } = createPreviewBtRuntime(memberType);
	const { warnings } = createBtContext({
		env,
		btBindings,
		agent,
	});
	for (const warning of warnings) {
		diagnostics.push({
			severity:
				warning.code === "agent.compile.failed" || warning.code === "agent.initialize.failed" ? "error" : "warning",
			code: warning.code,
			message: warning.message,
		});
	}
	return diagnostics;
}

function dedupeDiagnostics(diagnostics: BtAuthoringDiagnostic[]): BtAuthoringDiagnostic[] {
	const seen = new Set<string>();
	return diagnostics.filter((diagnostic) => {
		const key = `${diagnostic.severity}:${diagnostic.code}:${diagnostic.rootKey ?? ""}:${diagnostic.nodeId ?? ""}:${diagnostic.message}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}
