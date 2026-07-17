import { describe, expect, it, vi } from "vitest";
import type { StageData } from "../../../../Pipeline/stageEnv";
import type { DamageDispatchPayload } from "../../../Area/types";
import { createHitSession, type HitSession, resolveDamageAndApply, resolveHitCheck } from "./DamageResolution";

// 构造一个合法的受击载荷；各测试按需覆盖字段。
const makePayload = (over: Partial<DamageDispatchPayload> = {}): DamageDispatchPayload => ({
	sourceId: "caster-1",
	areaId: "area-1",
	damageFormula: "self.atk",
	casterSnapshot: { hit: 500, atk: 1000 },
	skillLv: 10,
	damageCount: 1,
	damageIndex: 0,
	damageTags: [],
	warningZone: "none" as DamageDispatchPayload["warningZone"],
	lockCasterAttributes: false,
	direction: "front" as DamageDispatchPayload["direction"],
	isFatal: false,
	vars: { distance: 5, targetCount: 1 },
	...over,
});

// 便捷 runPipeline 桩：按管线名返回固定输出。
const stubPipeline = (byName: Record<string, Record<string, unknown>>) =>
	((name: string) => (byName[name] ?? {}) as StageData) as (
		pipelineName: string,
		params?: Record<string, unknown>,
	) => StageData;

describe("createHitSession", () => {
	it("初始化所有结果字段为 null，持有原始请求", () => {
		const req = makePayload();
		const s = createHitSession(req);
		expect(s.damageRequest).toBe(req);
		expect(s.hitRate).toBeNull();
		expect(s.hit).toBeNull();
		expect(s.finalDamage).toBeNull();
		expect(s.hpAfter).toBeNull();
	});
});

describe("resolveHitCheck — 命中判定", () => {
	it("roll < hitRate 判定命中", () => {
		const session = createHitSession(makePayload());
		const pipeline = stubPipeline({ hitCheck: { hitRate: 80 } });
		// 注入确定性随机：0.5 * 100 = 50 < 80 → 命中。
		resolveHitCheck(pipeline, session, () => 0.5);
		expect(session.hitRate).toBe(80);
		expect(session.hit).toBe(true);
	});

	it("roll >= hitRate 判定未命中", () => {
		const session = createHitSession(makePayload());
		const pipeline = stubPipeline({ hitCheck: { hitRate: 30 } });
		// 0.5 * 100 = 50 >= 30 → 未命中。
		resolveHitCheck(pipeline, session, () => 0.5);
		expect(session.hit).toBe(false);
	});

	it("魔法伤害无视 roll 强制命中", () => {
		const session = createHitSession(makePayload({ damageTags: ["magical"] }));
		const pipeline = stubPipeline({ hitCheck: { hitRate: 0 } });
		// 即便 hitRate=0、roll 必然 >=，magical 仍强制命中。
		resolveHitCheck(pipeline, session, () => 0.99);
		expect(session.hit).toBe(true);
	});

	it("hitRate 缺省时按 0 处理 → 物理必不命中", () => {
		const session = createHitSession(makePayload());
		const pipeline = stubPipeline({ hitCheck: {} });
		resolveHitCheck(pipeline, session, () => 0.0);
		// roll = 0 < hitRate=0 为 false → 未命中。
		expect(session.hitRate).toBe(0);
		expect(session.hit).toBe(false);
	});

	it("向管线传入 isMagical / casterHit / skillMpCost 参数", () => {
		const session = createHitSession(
			makePayload({ damageTags: ["magical"], casterSnapshot: { hit: 300, "skill.mpCost": 100 } }),
		);
		const runPipeline = vi.fn(() => ({ hitRate: 100 }) as StageData);
		resolveHitCheck(runPipeline, session, () => 0.5);
		expect(runPipeline).toHaveBeenCalledWith("hitCheck", {
			isMagical: 1,
			casterHit: 300,
			skillMpCost: 100,
			damageTags: ["magical"],
		});
	});
});

// resolveDamageAndApply 的固定依赖桩集合。
const makeDeps = (over: Partial<Record<string, unknown>> = {}) => {
	const notifyDomainEvent = vi.fn();
	const emitProc = vi.fn();
	const hpApplyer = vi.fn();
	const mpApplyer = vi.fn();
	return {
		id: "target-1",
		currentTimeMs: 1000,
		tickIndex: 42,
		hpGetter: () => 5000,
		mpGetter: () => 300,
		hpApplyer,
		mpApplyer,
		notifyDomainEvent,
		emitProc,
		...over,
	};
};

// 用固定顺序参数调用 resolveDamageAndApply 的适配器。
const runResolve = (
	deps: ReturnType<typeof makeDeps>,
	runPipeline: (name: string, p?: Record<string, unknown>) => StageData,
	evaluator: ((expr: string, ctx: unknown) => number | boolean) | null,
	session: HitSession,
) =>
	resolveDamageAndApply(
		deps.id,
		deps.currentTimeMs,
		deps.tickIndex,
		deps.hpGetter,
		deps.mpGetter,
		deps.hpApplyer,
		deps.mpApplyer,
		deps.notifyDomainEvent,
		deps.emitProc,
		runPipeline,
		evaluator as never,
		session,
	);

describe("resolveDamageAndApply — 未命中分支", () => {
	it("hit=false 时零伤害早退，不改 HP/MP", () => {
		const deps = makeDeps();
		const session = createHitSession(makePayload());
		session.hit = false;

		runResolve(deps, stubPipeline({}), null, session);

		expect(session.finalDamage).toBe(0);
		expect(session.baseDamage).toBe(0);
		expect(session.isFatal).toBe(false);
		expect(deps.hpApplyer).not.toHaveBeenCalled();
		expect(deps.mpApplyer).not.toHaveBeenCalled();
	});

	it("未命中仍上报 hit domain event 与 damage.received（hit:false）", () => {
		const deps = makeDeps();
		const session = createHitSession(makePayload());
		session.hit = false;

		runResolve(deps, stubPipeline({}), null, session);

		expect(deps.notifyDomainEvent).toHaveBeenCalledWith(
			expect.objectContaining({ type: "hit", memberId: "target-1", damage: 0 }),
		);
		expect(deps.emitProc).toHaveBeenCalledWith(
			"damage.received",
			expect.objectContaining({ hit: false, finalDamage: 0 }),
		);
	});

	it("未命中不派发 damage.fatal", () => {
		const deps = makeDeps({ hpGetter: () => 0 }); // 即便当前 HP 为 0
		const session = createHitSession(makePayload());
		session.hit = false;

		runResolve(deps, stubPipeline({}), null, session);

		const fatalCalls = deps.emitProc.mock.calls.filter((c) => c[0] === "damage.fatal");
		expect(fatalCalls).toHaveLength(0);
	});
});

describe("resolveDamageAndApply — 命中伤害链路", () => {
	const pipeline = () =>
		stubPipeline({
			damageCalc: { finalDamage: 1000, crit: 0 },
			applyDamage: { hpAfter: 4000, mpAfter: 300 },
		});

	it("公式求值结果作为 baseDamage 传入 damageCalc", () => {
		const deps = makeDeps();
		const session = createHitSession(makePayload({ damageFormula: "self.atk" }));
		session.hit = true;
		const evaluator = vi.fn(() => 777);
		const runPipeline = vi.fn(pipeline());

		runResolve(deps, runPipeline, evaluator, session);

		expect(evaluator).toHaveBeenCalledWith("self.atk", expect.objectContaining({ targetId: "target-1" }));
		expect(runPipeline).toHaveBeenCalledWith("damageCalc", expect.objectContaining({ baseDamage: 777 }));
		expect(session.baseDamage).toBe(777);
	});

	it("hpDelta 非零时调用 hpApplyer（HP 5000→4000，delta=-1000）", () => {
		const deps = makeDeps();
		const session = createHitSession(makePayload());
		session.hit = true;

		runResolve(deps, pipeline(), () => 1000, session);

		expect(deps.hpApplyer).toHaveBeenCalledWith(-1000);
		expect(session.hpAfter).toBe(4000);
		expect(session.finalDamage).toBe(1000);
	});

	it("布尔公式结果转 1/0", () => {
		const deps = makeDeps();
		const session = createHitSession(makePayload());
		session.hit = true;
		const runPipeline = vi.fn(pipeline());

		runResolve(deps, runPipeline, () => true, session);

		expect(runPipeline).toHaveBeenCalledWith("damageCalc", expect.objectContaining({ baseDamage: 1 }));
	});

	it("damageCount 分段：finalDamage 按段数均分", () => {
		const deps = makeDeps();
		const session = createHitSession(makePayload({ damageCount: 4 }));
		session.hit = true;
		// damageCalc 输出 1000，分 4 段 → 每段 250。
		const runPipeline = vi.fn(
			stubPipeline({
				damageCalc: { finalDamage: 1000, crit: 0 },
				applyDamage: { hpAfter: 4750, mpAfter: 300 },
			}),
		);

		runResolve(deps, runPipeline, () => 1000, session);

		expect(runPipeline).toHaveBeenCalledWith("applyDamage", expect.objectContaining({ finalDamage: 250 }));
		expect(session.finalDamage).toBe(250);
	});

	it("crit 输出 >=1 时标记暴击", () => {
		const deps = makeDeps();
		const session = createHitSession(makePayload());
		session.hit = true;
		runResolve(
			deps,
			stubPipeline({ damageCalc: { finalDamage: 100, crit: 1 }, applyDamage: { hpAfter: 4900, mpAfter: 300 } }),
			() => 100,
			session,
		);
		expect(session.crit).toBe(true);
	});

	it("hpAfter<=0 标记致死并派发 damage.fatal", () => {
		const deps = makeDeps();
		const session = createHitSession(makePayload());
		session.hit = true;

		runResolve(
			deps,
			stubPipeline({ damageCalc: { finalDamage: 9999, crit: 0 }, applyDamage: { hpAfter: 0, mpAfter: 300 } }),
			() => 9999,
			session,
		);

		expect(session.isFatal).toBe(true);
		const fatalCalls = deps.emitProc.mock.calls.filter((c) => c[0] === "damage.fatal");
		expect(fatalCalls).toHaveLength(1);
		expect(fatalCalls[0][1]).toMatchObject({ sourceId: "caster-1", hpAfter: 0 });
	});

	it("锁定施法者属性时公式上下文带 selfOverride，实时时不带", () => {
		// evaluator 桩显式声明 (expr, ctx) 签名，便于断言传入的上下文。
		// 读取传入 evaluator 的第二个参数（ctx），断言 selfOverride 有无。
		const ctxOf = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls[0][1] as { selfOverride?: unknown };

		const session = createHitSession(makePayload({ lockCasterAttributes: true }));
		session.hit = true;
		const lockedEval = vi.fn(() => 100);
		runResolve(makeDeps(), pipeline(), lockedEval, session);
		expect(ctxOf(lockedEval)).toHaveProperty("selfOverride");
		expect(ctxOf(lockedEval).selfOverride).toBeDefined();

		const session2 = createHitSession(makePayload({ lockCasterAttributes: false }));
		session2.hit = true;
		const liveEval = vi.fn(() => 100);
		runResolve(makeDeps(), pipeline(), liveEval, session2);
		expect(ctxOf(liveEval).selfOverride).toBeUndefined();
	});

	it("无 evaluator 时 baseDamage 为 0", () => {
		const deps = makeDeps();
		const session = createHitSession(makePayload());
		session.hit = true;
		const runPipeline = vi.fn(pipeline());

		runResolve(deps, runPipeline, null, session);

		expect(runPipeline).toHaveBeenCalledWith("damageCalc", expect.objectContaining({ baseDamage: 0 }));
		expect(session.baseDamage).toBe(0);
	});
});
