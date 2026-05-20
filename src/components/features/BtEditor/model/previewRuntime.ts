import type { MemberType } from "@db/schema/enums";
import type { MemberBtEnv } from "~/lib/engine/core/World/Member/runtime/Agent/BtContext";
import type { MemberRuntimeServices } from "~/lib/engine/core/World/Member/runtime/Agent/RuntimeServices";
import { createBtContext } from "~/lib/engine/core/World/Member/runtime/BehaviourTree/BtContextFactory";
import type { MemberStateContext } from "~/lib/engine/core/World/Member/runtime/StateMachine/types";
import type { MemberSharedRuntime, MobRuntime, PlayerRuntime } from "~/lib/engine/core/World/Member/runtime/types";
import { MobBtBindings } from "~/lib/engine/core/World/Member/types/Mob/Agents/BtBindings";
import { PlayerBtBindings } from "~/lib/engine/core/World/Member/types/Player/Agents/BtBindings";
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

type PreviewEvent = { type: string; data?: Record<string, unknown> };

type PreviewRuntime = PlayerRuntime | MobRuntime | (MemberSharedRuntime & { type: MemberType });

type PreviewFallbackCalls = {
	actions: Set<string>;
	conditions: Set<string>;
	callbacks: Set<string>;
	guards: Set<string>;
};

const createPreviewRuntime = (memberType: MemberType): PreviewRuntime => {
	const common = {
		tickIndex: 0,
		currentTimeMs: 0,
		deltaTimeMs: 1000 / 60,
		position: { x: 0, y: 0, z: 0 },
		targetId: "preview-target",
		statusTags: [],
	};
	if (memberType === "Player") {
		return {
			...common,
			type: "Player",
			skillList: [],
			skillCooldowns: [],
			currentSkill: null,
			previousSkill: null,
			currentSkillVariant: null,
			currentSkillStartupMs: 0,
			currentSkillChargingMs: 0,
			currentSkillChantingMs: 0,
			currentSkillActionMs: 0,
			character: null,
		} as PlayerRuntime;
	}
	if (memberType === "Mob") {
		return {
			...common,
			type: "Mob",
			skillList: [],
			skillCooldowns: [],
			character: null,
		} as MobRuntime;
	}
	return { ...common, type: memberType };
};

export const getPreviewBtBindings = (memberType: MemberType): Record<string, unknown> => {
	if (memberType === "Mob") return MobBtBindings;
	return PlayerBtBindings;
};

export const createPreviewMemberBtEnv = (
	memberType: MemberType,
): MemberBtEnv<string, PreviewEvent, MemberStateContext> => {
	const runtime = createPreviewRuntime(memberType);
	const services: MemberRuntimeServices = {
		getCurrentTimeMs: () => runtime.currentTimeMs,
		getTickIndex: () => runtime.tickIndex,
		expressionEvaluator: () => 0,
		damageRequestHandler: () => undefined,
		renderMessageSender: () => undefined,
		domainEventSender: () => undefined,
		targetResolver: (_sourceMemberId, requestedTargetId) => requestedTargetId ?? "preview-target",
		pipelineEventSink: null,
		random: () => 0.5,
	};

	return {
		id: "bt-editor-preview",
		type: memberType,
		name: "BtEditorPreview",
		campId: "preview",
		teamId: "preview",
		position: runtime.position,
		runtime,
		statContainer: createPreviewStatContainer(),
		services,
		btManager: {
			registerParallelBt: () => undefined,
			unregisterParallelBt: () => undefined,
			hasBuff: () => false,
		},
		procBus: null,
		attributeWatchers: createPreviewAttributeWatchers(),
		renderState: {},
		notifyDomainEvent: () => undefined,
		runPipeline: () => ({ original: 0, result: 0 }) as never,
		send: () => undefined,
		// 设计说明：预览环境只实现 BT 调用需要的最小 MemberBtEnv 面，缺失的引擎能力必须通过 mock 行为显式给出。
	} as unknown as MemberBtEnv<string, PreviewEvent, MemberStateContext>;
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
	const env = createPreviewMemberBtEnv(options.memberType);
	const { context, warnings } = createBtContext({
		owner: env,
		btBindings: getPreviewBtBindings(options.memberType),
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

function createPreviewStatContainer() {
	const values = new Map<string, number>();
	return {
		getValue: (path: string) => values.get(path) ?? 0,
		setValue: (path: string, value: number) => values.set(path, value),
		addModifier: (path: string, _type: unknown, value: number) => {
			values.set(path, (values.get(path) ?? 0) + value);
		},
		removeModifiersBySourceIdPrefix: () => undefined,
		onChange: () => () => undefined,
	};
}

function createPreviewAttributeWatchers() {
	return {
		watch: () => 0,
		unwatchBySource: () => undefined,
	};
}
