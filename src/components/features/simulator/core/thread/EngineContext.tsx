import {
	createContext,
	createSignal,
	onCleanup,
	type ParentProps,
	useContext,
} from "solid-js";
import { createLogger } from "~/lib/Logger";
import type { PreviewReport } from "../Preview/types";
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

	/** 最近一次 PreviewReport */
	previewReport: () => PreviewReport | null;

	// ---- actions ----
	loadScenario: (data: EngineScenarioData) => Promise<void>;
	setRuntimeConfig: (config: RuntimeConfig) => Promise<void>;
	patchMemberConfig: (memberId: string, memberData: unknown) => Promise<void>;
	predictSkillDamage: (memberId: string, skillIds?: string[]) => Promise<PreviewReport>;
	runSkillPreview: (memberId: string) => Promise<PreviewReport>;
}

const EngineCtx = createContext<EngineContextValue>();

// ==================== Provider ====================

export function EngineProvider(props: ParentProps) {
	const service = EngineService.getInstance();
	const defaultEngine = () => service.getDefaultEngine();
	const [ready, setReady] = createSignal(false);
	const [members, setMembers] = createSignal<MemberSerializeData[]>([]);
	const [previewReport, setPreviewReport] = createSignal<PreviewReport | null>(null);

	defaultEngine()
		.whenReady()
		.then(() => {
			setReady(true);
			log.info("default engine ready");
		})
		.catch((error) => log.error("default engine init failed", error));

	onCleanup(() => {
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

	const runSkillPreview = async (memberId: string): Promise<PreviewReport> => {
		const report = await service.runSkillPreview(memberId, defaultEngine().id);
		setPreviewReport(report);
		return report;
	};

	const predictSkillDamage = async (memberId: string, skillIds?: string[]): Promise<PreviewReport> => {
		const report = await service.predictSkillDamage(defaultEngine().id, memberId, skillIds);
		setPreviewReport(report);
		return report;
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
		previewReport,
		loadScenario,
		setRuntimeConfig,
		patchMemberConfig,
		predictSkillDamage,
		runSkillPreview,
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
