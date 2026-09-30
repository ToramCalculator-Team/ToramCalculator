import type { MemberType } from "@db/schema/enums";
import type { MemberBehaviorCapabilities } from "~/engine/core/World/Member/Behavior/Bindings";
import { createEffectBindings } from "~/engine/core/World/Member/EffectBehavior/Bindings";
import { createBtContext } from "~/engine/core/World/Member/EffectBehavior/EffectBtContextFactory";
import type {
	EffectBtManagerEnv,
	MemberBtCapabilities,
} from "~/engine/core/World/Member/EffectBehavior/EffectBtManagerEnv";
import { MemberBaseNestedSchema } from "~/engine/core/World/Member/MemberBaseSchema";
import type { MemberRuntimeServices } from "~/engine/core/World/Member/RuntimeServices";
import { AttributeContainer } from "~/engine/core/World/Member/runtime/AttributeContainer/AttributeContainer";
import type { MemberSharedRuntime, MobRuntime, PlayerRuntime } from "~/engine/core/World/Member/runtime/SharedRuntime";
import type { MemberFSMEvent } from "~/engine/core/World/Member/StateMachine/types";
import { createMobBehaviorBindings } from "~/engine/core/World/Member/types/Mob/Behavior/Bindings";
import { createMobEffectBindings } from "~/engine/core/World/Member/types/Mob/EffectBehavior/Bindings";
import { createPlayerBehaviorBindings } from "~/engine/core/World/Member/types/Player/Behavior/Bindings";
import { createPlayerEffectBindings } from "~/engine/core/World/Member/types/Player/EffectBehavior/Bindings";
import { DefaultMobLocomotionProfile, PlayerLocomotionProfile } from "~/game/locomotion";
import { BehaviourTree, type BehaviourTreeOptions, State } from "~/lib/mistreevous";
import type { Agent } from "~/lib/mistreevous/Agent";
import type {
	AnyChildNodeDefinition,
	NodeAttributeDefinition,
	NodeGuardDefinition,
	RootNodeDefinition,
} from "~/lib/mistreevous/BehaviourTreeDefinition";
import type { BehaviorTreeKind } from "../modes/mdslMemberTypeProfiles";
import type { MdslIntellisenseRegistry } from "../modes/mdslIntellisense";
import type { BtAuthoringDiagnostic } from "./authoringValidator";

export type BtPreviewResult = {
	tree: BehaviourTree;
	diagnostics: BtAuthoringDiagnostic[];
};

type PreviewRuntime = (PlayerRuntime | MobRuntime | (MemberSharedRuntime<string> & { type: MemberType })) &
	MemberSharedRuntime<string>;

type PreviewBtRuntime = {
	env: EffectBtManagerEnv<MemberFSMEvent, string, PreviewRuntime>;
	btBindings: Record<string, unknown>;
};

type PreviewFallbackCalls = {
	actions: Set<string>;
	conditions: Set<string>;
	callbacks: Set<string>;
	guards: Set<string>;
};

const createPreviewRuntime = (memberType: MemberType): PreviewRuntime => {
	const locomotionProfile = memberType === "Mob" ? DefaultMobLocomotionProfile : PlayerLocomotionProfile;
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
		yaw: 0,
		movement: null,
		verticalVelocity: 0,
		grounded: true,
		locomotion: {
			walkSpeed: locomotionProfile.WALK_SPEED,
			runSpeed: locomotionProfile.RUN_SPEED,
			gravity: locomotionProfile.GRAVITY,
			jumpSpeed: locomotionProfile.JUMP_SPEED,
		},
		statusTags: [],
		currentSkill: null,
		nextSkillExecutionInstance: 0,
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
	treeKind: BehaviorTreeKind,
	capabilities: MemberBtCapabilities<string>,
	behaviorCapabilities: MemberBehaviorCapabilities,
): Record<string, unknown> => {
	if (treeKind === "control") {
		return memberType === "Mob"
			? createMobBehaviorBindings(behaviorCapabilities)
			: memberType === "Player"
				? createPlayerBehaviorBindings(behaviorCapabilities)
				: {};
	}

	return memberType === "Mob"
		? createMobEffectBindings(capabilities)
		: memberType === "Player"
			? createPlayerEffectBindings(capabilities)
			: createEffectBindings(
				{} as PreviewRuntime & Record<string, unknown>,
				{},
				{},
				capabilities,
			);
};

export const createPreviewBtRuntime = (
	memberType: MemberType,
	treeKind: BehaviorTreeKind = "effect",
): PreviewBtRuntime => {
	const runtime = createPreviewRuntime(memberType);
	const services: MemberRuntimeServices = {
		getCurrentTimeMs: () => runtime.currentTimeMs,
		getTickIndex: () => runtime.tickIndex,
		expressionEvaluator: () => 0,
		executeInstantDamage: null,
		createDamageArea: null,
		domainEventSender: () => undefined,
		targetResolver: (_sourceMemberId, requestedTargetId) => requestedTargetId ?? "preview-target",
		targetDirectionResolver: null,
		random: () => 0.5,
	};

	const attributeContainer = new AttributeContainer<string>(MemberBaseNestedSchema);
	const parallelBts = new Set<string>();
	let nextThresholdRegistrationId = 1;

	const capabilities: MemberBtCapabilities<string> = {
		attributeContainer,
		services,
		declareState: () => undefined,
		clearActiveEffectStateDeclaration: () => undefined,
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
		// 预览不运行真实 ProcBus，但必须返回稳定的注册 ID，保持 watchThreshold 的能力契约。
		registerThreshold: () => nextThresholdRegistrationId++,
		unregisterThresholdBySource: () => undefined,
		notifyDomainEvent: () => undefined,
	};
	const behaviorCapabilities: MemberBehaviorCapabilities = {
		submitControlInput: () => undefined,
	};

	const env: EffectBtManagerEnv<MemberFSMEvent, string, PreviewRuntime> = {
		name: "BtEditorPreview",
		getContext: () => runtime,
		getCapabilities: () => capabilities,
		getDeltaTimeMs: () => runtime.deltaTimeMs,
		send: () => undefined,
	};

	return {
		env,
		btBindings: createPreviewBtBindings(memberType, treeKind, capabilities, behaviorCapabilities),
	};
};

export function createPreviewBehaviourTree(options: {
	definition: RootNodeDefinition[];
	agent: string;
	memberType: MemberType;
	treeKind: BehaviorTreeKind;
	registry: MdslIntellisenseRegistry;
	onDiagnostic?: (diagnostic: BtAuthoringDiagnostic) => void;
	behaviourTreeOptions?: BehaviourTreeOptions;
}): BtPreviewResult {
	const diagnostics: BtAuthoringDiagnostic[] = [];
	const emitDiagnostic = (diagnostic: BtAuthoringDiagnostic): void => {
		diagnostics.push(diagnostic);
		options.onDiagnostic?.(diagnostic);
	};
	const { env, btBindings } = createPreviewBtRuntime(options.memberType, options.treeKind);
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
