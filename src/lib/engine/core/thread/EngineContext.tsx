import { createContext, createSignal, onCleanup, onMount, type ParentProps, useContext } from "solid-js";
import { waitFor } from "~/lib/bootstrap/context-standalone";
import { createLogger } from "~/lib/Logger";
import type { EngineScenarioData, RuntimeConfig } from "../types";
import type { MemberSerializeData } from "../World/Member/Member";
import { EngineService } from "./EngineService";
import type { SimulationEngine } from "./SimulationEngine";

const log = createLogger("EngineCtx");

// ==================== Context 值类型 ====================

export interface EngineContextValue {
	/** EngineService 单例（可用于高级 / 命令式操作） */
	service: EngineService;
	defaultEngine: () => SimulationEngine;
	createEngine: (id?: string) => SimulationEngine;
	getEngine: (id: string) => SimulationEngine | null;
	disposeEngine: (id: string) => Promise<void>;

	// ---- reactive signals ----
	/** 引擎是否已就绪（pool 初始化完成） */
	ready: () => boolean;

	/** 当前成员列表快照 */
	members: () => MemberSerializeData[];
	/** 手动刷新成员列表 */
	refreshMembers: () => Promise<MemberSerializeData[]>;

	// ---- actions (thin delegates to EngineService) ----
	loadScenario: (data: EngineScenarioData) => Promise<void>;
	setRuntimeConfig: (config: RuntimeConfig) => Promise<void>;
	patchMemberConfig: (memberId: string, memberData: unknown) => Promise<void>;
}

const EngineCtx = createContext<EngineContextValue>();

// ==================== Provider ====================

export function EngineProvider(props: ParentProps) {
	const service = EngineService.getInstance();
	const defaultEngine = () => service.getDefaultEngine();
	const [ready, setReady] = createSignal(false);
	const [members, setMembers] = createSignal<MemberSerializeData[]>([]);
	let disposed = false;

	onMount(() => {
		void (async () => {
			try {
				// 设计目的：Provider 只桥接 bootstrap 统一编排后的 engine 状态，避免渲染 Provider 时抢跑初始化计算 Worker。
				await waitFor("engine");
				if (disposed) return;
				await defaultEngine().whenReady();
				if (disposed) return;
				setReady(true);
				log.info("default engine ready");
			} catch (error) {
				if (!disposed) {
					log.error("default engine init failed", error);
				}
			}
		})();
	});

	onCleanup(() => {
		disposed = true;
		log.info("cleanup");
		void service.shutdown();
	});

	const refreshMembers = async (): Promise<MemberSerializeData[]> => {
		const list = await defaultEngine().getMembers();
		setMembers(list);
		return list;
	};

	const loadScenario = async (data: EngineScenarioData): Promise<void> => {
		await service.loadScenario(data);
		await refreshMembers();
	};

	const setRuntimeConfig = async (config: RuntimeConfig): Promise<void> => {
		await service.setRuntimeConfig(config);
		await refreshMembers();
	};

	const patchMemberConfig = async (memberId: string, memberData: unknown): Promise<void> => {
		await service.patchMemberConfig(memberId, memberData);
		await refreshMembers();
	};

	const value: EngineContextValue = {
		service,
		defaultEngine,
		createEngine: (id?: string) => service.createEngine(id),
		getEngine: (id: string) => service.getEngine(id),
		disposeEngine: (id: string) => service.disposeEngine(id),
		ready,
		members,
		refreshMembers,
		loadScenario,
		setRuntimeConfig,
		patchMemberConfig,
	};

	return <EngineCtx.Provider value={value}>{props.children}</EngineCtx.Provider>;
}

// ==================== Hook ====================

export function useEngine(): EngineContextValue {
	const ctx = useContext(EngineCtx);
	if (!ctx) {
		throw new Error("useEngine must be used within an EngineProvider");
	}
	return ctx;
}
