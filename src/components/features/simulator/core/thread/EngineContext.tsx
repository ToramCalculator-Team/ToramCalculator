import {
	createContext,
	createSignal,
	onCleanup,
	onMount,
	type ParentProps,
	useContext,
} from "solid-js";
import { createLogger } from "~/lib/Logger";
import type { PreviewReport } from "../Preview/types";
import type { EngineScenarioData, SimulationProfile } from "../types";
import type { MemberSerializeData } from "../World/Member/Member";
import { EngineService } from "./EngineService";
import {
	batchSimulatorPool,
	realtimeSimulatorPool,
	type SimulatorPool,
} from "./SimulatorPool";

const log = createLogger("EngineCtx");

// ==================== Context 值类型 ====================

export interface EngineContextValue {
	/** EngineService 单例（可用于高级 / 命令式操作） */
	service: EngineService;

	/** 底层 pool 引用（供 Simulator 页面高级用法，如 EngineLifecycleController） */
	realtimePool: SimulatorPool;

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
	setProfile: (profile: SimulationProfile) => Promise<void>;
	patchMemberConfig: (memberId: string, memberData: unknown) => Promise<void>;
	runSkillPreview: (memberId: string) => Promise<PreviewReport>;
}

const EngineCtx = createContext<EngineContextValue>();

// ==================== Provider ====================

export function EngineProvider(props: ParentProps) {
	const service = EngineService.getInstance();
	const [ready, setReady] = createSignal(false);
	const [members, setMembers] = createSignal<MemberSerializeData[]>([]);
	const [previewReport, setPreviewReport] = createSignal<PreviewReport | null>(null);

	onMount(() => {
		service.attachRealtimePool(realtimeSimulatorPool);
		service.attachBatchPool(batchSimulatorPool);
		setReady(true);
		log.info("pools attached, ready");
	});

	onCleanup(() => {
		log.info("cleanup");
	});

	const refreshMembers = async (): Promise<MemberSerializeData[]> => {
		const pool = service.getRealtimePool();
		if (!pool) return [];
		const list = await pool.getMembers();
		setMembers(list);
		return list;
	};

	const loadScenario = async (data: EngineScenarioData): Promise<void> => {
		await service.loadScenario(data);
		await refreshMembers();
	};

	const setProfile = async (profile: SimulationProfile): Promise<void> => {
		await service.setProfile(profile);
	};

	const patchMemberConfig = async (memberId: string, memberData: unknown): Promise<void> => {
		await service.patchMemberConfig(memberId, memberData);
		await refreshMembers();
	};

	const runSkillPreview = async (memberId: string): Promise<PreviewReport> => {
		const report = await service.runSkillPreview(memberId);
		setPreviewReport(report);
		return report;
	};

	const value: EngineContextValue = {
		service,
		realtimePool: realtimeSimulatorPool,
		ready,
		members,
		refreshMembers,
		previewReport,
		loadScenario,
		setProfile,
		patchMemberConfig,
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
