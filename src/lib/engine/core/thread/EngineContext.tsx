import { createContext, createSignal, onCleanup, onMount, type ParentProps, useContext } from "solid-js";
import { waitFor } from "~/lib/bootstrap/context-standalone";
import { createLogger } from "~/lib/Logger";
import type { MemberSerializeData } from "../World/Member/Member";
import { EngineService } from "./EngineService";
import type { SimulationEngine } from "./SimulationEngine";

const log = createLogger("EngineCtx");

// ==================== Context 值类型 ====================

export interface EngineContextValue {
	/** EngineService 单例（可用于高级 / 命令式操作） */
	service: EngineService;
	/** 主业务实时模拟常驻引擎（ADR 0015） */
	simulatorEngine: () => SimulationEngine;
	/** 角色配置预览常驻引擎（ADR 0015） */
	characterEngine: () => SimulationEngine;

	// ---- reactive signals ----
	/** 两引擎是否均已就绪 */
	ready: () => boolean;

	/** character 引擎成员列表快照（[characterId] 与 SkillPreview 经页面 model 共享） */
	characterMembers: () => MemberSerializeData[];
	/** 手动刷新 character 引擎成员列表 */
	refreshCharacterMembers: () => Promise<MemberSerializeData[]>;
}

const EngineCtx = createContext<EngineContextValue>();

// ==================== Provider ====================

export function EngineProvider(props: ParentProps) {
	const service = EngineService.getInstance();
	const simulatorEngine = () => service.getSimulatorEngine();
	const characterEngine = () => service.getCharacterEngine();
	const [ready, setReady] = createSignal(false);
	const [characterMembers, setCharacterMembers] = createSignal<MemberSerializeData[]>([]);
	let disposed = false;

	onMount(() => {
		void (async () => {
			try {
				// 设计目的：Provider 只桥接 bootstrap 统一编排后的 engine 状态，避免渲染 Provider 时抢跑初始化计算 Worker。
				await waitFor("engine");
				if (disposed) return;
				// bootstrap 已 gate 两引擎就绪；此处 Promise.all 为防御性，两引擎同阶段并行就绪。
				await Promise.all([simulatorEngine().whenReady(), characterEngine().whenReady()]);
				if (disposed) return;
				setReady(true);
				log.info("simulator & character engines ready");
			} catch (error) {
				if (!disposed) {
					log.error("engine init failed", error);
				}
			}
		})();
	});

	onCleanup(() => {
		disposed = true;
		log.info("cleanup");
		void service.shutdown();
	});

	const refreshCharacterMembers = async (): Promise<MemberSerializeData[]> => {
		const list = await characterEngine().getMembers();
		setCharacterMembers(list);
		return list;
	};

	const value: EngineContextValue = {
		service,
		simulatorEngine,
		characterEngine,
		ready,
		characterMembers,
		refreshCharacterMembers,
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
