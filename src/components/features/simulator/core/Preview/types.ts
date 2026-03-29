/**
 * Preview / DPS-impact shapes exchanged between worker PreviewRunner and UI.
 */

export interface SkillProbeResult {
	skillId: string;
	skillName: string;
	predictedDamage: number;
	mpCost: number;
	castTimeFrames: number;
	cooldownFrames: number;
	isAvailable: boolean;
	meta?: Record<string, unknown>;
}

export interface PreviewReport {
	memberId: string;
	statSnapshot: Record<string, unknown>;
	skillProbes: SkillProbeResult[];
	elapsedMs: number;
}

export interface DPSImpactResult {
	itemId: string;
	dpsDelta: number;
	dpsPercent: string;
}
