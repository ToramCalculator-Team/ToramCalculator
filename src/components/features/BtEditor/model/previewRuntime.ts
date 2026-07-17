import type { MemberType } from "@db/schema/enums";
import { MemberBaseNestedSchema } from "~/lib/engine/core/World/Member/MemberBaseSchema";
import type { MemberRuntimeServices } from "~/lib/engine/core/World/Member/RuntimeServices";
import { createBtContext } from "~/lib/engine/core/World/Member/runtime/BehaviourTree/BtContextFactory";
import type {
	MemberBtCapabilities,
	MemberBtManagerEnv,
} from "~/lib/engine/core/World/Member/runtime/BehaviourTree/BtManagerEnv";
import { StatContainer } from "~/lib/engine/core/World/Member/runtime/StatContainer/StatContainer";
import type { MemberFSMEvent } from "~/lib/engine/core/World/Member/runtime/StateMachine/types";
import type { MemberSharedRuntime, MobRuntime, PlayerRuntime } from "~/lib/engine/core/World/Member/runtime/types";
import { createMobBtBindings } from "~/lib/engine/core/World/Member/types/Mob/Agents/BtBindings";
import type { MobAttrKey } from "~/lib/engine/core/World/Member/types/Mob/MobAttrSchema";
import type { MobFSMEvent } from "~/lib/engine/core/World/Member/types/Mob/MobStateMachine";
import { createPlayerBtBindings } from "~/lib/engine/core/World/Member/types/Player/Agents/BtBindings";
import type { PlayerAttrKey } from "~/lib/engine/core/World/Member/types/Player/PlayerAttrSchema";
import type { PlayerFSMEvent } from "~/lib/engine/core/World/Member/types/Player/PlayerStateMachine";
import { BehaviourTree, type BehaviourTreeOptions, State } from "~/lib/mistreevous";
import type { Agent } from "~/lib/mistreevous/Agent";
import type {
	AnyChildNodeDefinition,
	NodeAttributeDefinition,
	NodeGuardDefinition,
	RootNodeDefinition,
} from "~/lib/mistreevous/BehaviourTreeDefinition";
import type { MdslIntellisenseRegistry } from "../modes/mdslIntellisense";
import type { BtAuthoringDiagnostic } from "./authoringValidator";

export type BtPreviewResult = {
	tree: BehaviourTree;
	diagnostics: BtAuthoringDiagnostic[];
};

type PreviewRuntime = (PlayerRuntime | MobRuntime | (MemberSharedRuntime<string> & { type: MemberType })) &
	MemberSharedRuntime<string>;

type PreviewBtRuntime = {
	env: MemberBtManagerEnv<MemberFSMEvent, string, PreviewRuntime>;
	btBindings: Record<string, unknown>;
};

type PreviewFallbackCalls = {
	actions: Set<string>;
	conditions: Set<string>;
	callbacks: Set<string>;
	guards: Set<string>;
};

const createPreviewRuntime = (memberType: MemberType): PreviewRuntime => {
	const common: MemberSharedRuntime<string> = {
		memberId: "preview-member-id",
		name: "PreviewMember",
		campId: "preview",
		teamId: "preview",
		tickIndex: 0,
		currentTimeMs: 0,
		deltaTimeMs: 1000 / 60,
		position: { x: 0, y: 0, z: 0 },
		targetId: "preview-target",
		statusTags: [],
		currentSkill: null,
		previousSkill: null,
		skillCooldowns: [],
	};
	if (memberType === "Player") {
		return {
			...common,
			type: "Player",
			skillList: [],
			data: null,
		} as PreviewRuntime;
	}
	if (memberType === "Mob") {
		return {
			...common,
			type: "Mob",
			skillList: [],
			data: null,
		} as PreviewRuntime;
	}
	return { ...common, type: memberType } as PreviewRuntime;
};

const createPreviewBtBindings = (
	memberType: MemberType,
	capabilities: MemberBtCapabilities<string, MemberFSMEvent>,
): Record<string, unknown> => {
	// 预览环境使用 string 宽属性槽来承接 MDSL 动态输入；这里收窄到具体成员类型只用于复用真实 binding 工厂。
	if (memberType === "Mob") {
		return createMobBtBindings(capabilities as unknown as MemberBtCapabilities<MobAttrKey, MobFSMEvent>);
	}
	return createPlayerBtBindings(capabilities as unknown as MemberBtCapabilities<PlayerAttrKey, PlayerFSMEvent>);
};

export const createPreviewBtRuntime = (memberType: MemberType): PreviewBtRuntime => {
	const runtime = createPreviewRuntime(memberType);
	const services: MemberRuntimeServices = {
		getCurrentTimeMs: () => runtime.currentTimeMs,
		getTickIndex: () => runtime.tickIndex,
		expressionEvaluator: () => 0,
		damageRequestHandler: () => undefined,
		renderMessageSender: () => undefined,
		domainEventSender: () => undefined,
		targetResolver: (_sourceMemberId, requestedTargetId) => requestedTargetId ?? "preview-target",
		random: () => 0.5,
	};

	const statContainer = new StatContainer<string>(MemberBaseNestedSchema);
	const renderState: MemberBtCapabilities<string, MemberFSMEvent>["renderState"] = {};
	const parallelBts = new Set<string>();

	const capabilities: MemberBtCapabilities<string, MemberFSMEvent> = {
		statContainer,
		services,
		renderState,
		registerParallelBt: (name) => {
			parallelBts.add(name);
			return undefined;
		},
		unregisterParallelBt: (name) => {
			parallelBts.delete(name);
		},
		hasParallelBt: (name) => parallelBts.has(name),
		subscribeByName: () => 0,
		unsubscribeBySource: () => undefined,
		registerThreshold: () => undefined,
		unregisterThresholdBySource: () => undefined,
		notifyDomainEvent: () => undefined,
		submitControlInput: () => undefined,
		send: () => undefined,
	};

	const env: MemberBtManagerEnv<MemberFSMEvent, string, PreviewRuntime> = {
		name: "BtEditorPreview",
		getContext: () => runtime,
		getCapabilities: () => capabilities,
		getDeltaTimeMs: () => runtime.deltaTimeMs,
		send: capabilities.send,
	};

	return {
		env,
		btBindings: createPreviewBtBindings(memberType, capabilities),
	};
};

export function createPreviewBehaviourTree(options: {
	definition: RootNodeDefinition[];
	agent: string;
	memberType: MemberType;
	registry: MdslIntellisenseRegistry;
	onDiagnostic?: (diagnostic: BtAuthoringDiagnostic) => void;
	behaviourTreeOptions?: BehaviourTreeOptions;
}): BtPreviewResult {
	const diagnostics: BtAuthoringDiagnostic[] = [];
	const emitDiagnostic = (diagnostic: BtAuthoringDiagnostic): void => {
		diagnostics.push(diagnostic);
		options.onDiagnostic?.(diagnostic);
	};
	const { env, btBindings } = createPreviewBtRuntime(options.memberType);
	const { context, warnings } = createBtContext({
		env,
		btBindings,
		agent: options.agent,
	});
	for (const warning of warnings) {
		emitDiagnostic({
			severity:
				warning.code === "agent.compile.failed" || warning.code === "agent.initialize.failed" ? "error" : "warning",
			code: warning.code,
			message: warning.message,
		});
	}
	const fallbackCalls = collectPreviewFallbackCalls(options.definition, options.registry);
	const agent = wrapPreviewAgentWithFallback(context, fallbackCalls, emitDiagnostic);
	return {
		tree: new BehaviourTree(options.definition, agent, options.behaviourTreeOptions),
		diagnostics,
	};
}

function wrapPreviewAgentWithFallback(
	context: Record<string, unknown>,
	fallbackCalls: PreviewFallbackCalls,
	emitDiagnostic: (diagnostic: BtAuthoringDiagnostic) => void,
): Agent {
	const reported = new Set<string>();
	return new Proxy(context, {
		get(target, prop, receiver) {
			const value = Reflect.get(target, prop, receiver);
			if (typeof prop !== "string") return value;
			if (typeof value === "function" || value !== undefined) return value;
			return (...args: unknown[]) => {
				const isBooleanCall = fallbackCalls.conditions.has(prop) || fallbackCalls.guards.has(prop);
				const code = isBooleanCall ? "preview.unknown.condition" : "preview.unknown.action";
				if (!reported.has(`${code}:${prop}`)) {
					reported.add(`${code}:${prop}`);
					emitDiagnostic({
						severity: "warning",
						code,
						message: `${prop}(${args.map(String).join(", ")}) 使用预览 fallback`,
					});
				}
				if (isBooleanCall) return false;
				return State.SUCCEEDED;
			};
		},
		// 设计说明：Proxy 动态补齐未知 action/condition，类型边界由 fallback 诊断暴露给编辑器。
	}) as unknown as Agent;
}

function collectPreviewFallbackCalls(
	definitions: readonly RootNodeDefinition[],
	registry: MdslIntellisenseRegistry,
): PreviewFallbackCalls {
	const calls: PreviewFallbackCalls = {
		actions: new Set(),
		conditions: new Set(),
		callbacks: new Set(),
		guards: new Set(),
	};

	const addAttribute = (
		kind: "callbacks" | "guards",
		attribute: NodeAttributeDefinition | NodeGuardDefinition | undefined,
	): void => {
		const call = attribute?.call?.trim();
		if (!call) return;
		const known = kind === "callbacks" ? registry.callbacks[call] : registry.guards[call];
		if (!known) calls[kind].add(call);
	};

	const visit = (node: RootNodeDefinition | AnyChildNodeDefinition): void => {
		if (node.type === "action" && !registry.actions[node.call]) {
			calls.actions.add(node.call);
		}
		if (node.type === "condition" && !registry.conditions[node.call]) {
			calls.conditions.add(node.call);
		}
		addAttribute("callbacks", node.entry);
		addAttribute("callbacks", node.step);
		addAttribute("callbacks", node.exit);
		addAttribute("guards", node.while);
		addAttribute("guards", node.until);
		if ("children" in node) {
			for (const child of node.children) visit(child);
		}
		if ("child" in node) {
			visit(node.child);
		}
	};

	for (const definition of definitions) visit(definition);
	return calls;
}
