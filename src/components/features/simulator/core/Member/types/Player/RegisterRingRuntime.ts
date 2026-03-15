import type { CharacterWithRelations } from "@db/generated/repositories/character";
import { z } from "zod/v4";
import { createLogger } from "~/lib/Logger";
import { ModifierType, type StatContainer } from "../../runtime/StatContainer/StatContainer";
import type { PlayerAttrType } from "./Player";

const log = createLogger("PlayerRegisterRing");

const registerRingConfigSchema = z.object({
	id: z.string(),
	level: z.number().int().min(1).default(1),
});

const characterRuntimeAugmentSchema = z.object({
	registerRings: z.array(registerRingConfigSchema).default([]),
});

type CharacterRuntimeAugmentConfig = z.output<typeof characterRuntimeAugmentSchema>;

type RegisterRingEffectDef = {
	maxLevel: number;
	apply: (params: {
		level: number;
		statContainer: StatContainer<PlayerAttrType>;
		sourceId: string;
		sourceName: string;
	}) => void;
};

/**
 * 玩家托环运行时挂载器。
 *
 * 目标：
 * - 从角色的纯数据配置中读取托环
 * - 把托环翻译成成员级 stat modifier
 *
 * 当前范围：
 * - 数据入口：`character.details` 内的 JSON
 * - 仅支持 `registerRings`
 * - 仅先实现 `sleep_insufficient`
 */
const BuiltinRegisterRingEffects: Record<string, RegisterRingEffectDef> = {
	sleep_insufficient: {
		maxLevel: 5,
		apply: ({ level, statContainer, sourceId, sourceName }) => {
			statContainer.addModifier("status.sleep.durationRate", ModifierType.STATIC_FIXED, -10 * level, {
				id: sourceId,
				name: sourceName,
				type: "equipment",
			});
		},
	},
};

const normalizeRegisterRingId = (id: string): string => id.trim().toLowerCase();

const parseRuntimeAugments = (details?: string | null): CharacterRuntimeAugmentConfig => {
	if (!details) {
		return { registerRings: [] };
	}

	try {
		const parsed = JSON.parse(details);
		const result = characterRuntimeAugmentSchema.safeParse(parsed);
		if (!result.success) {
			log.warn(`角色 details 中的运行时增强配置无效，已忽略: ${result.error.message}`);
			return { registerRings: [] };
		}
		return result.data;
	} catch (error) {
		log.warn(`角色 details 不是有效 JSON，已忽略托环配置: ${error instanceof Error ? error.message : String(error)}`);
		return { registerRings: [] };
	}
};

export const mountCharacterRegisterRings = (
	character: CharacterWithRelations,
	statContainer: StatContainer<PlayerAttrType>,
): void => {
	const config = parseRuntimeAugments(character.details);

	for (const ring of config.registerRings) {
		const normalizedId = normalizeRegisterRingId(ring.id);
		const effect = BuiltinRegisterRingEffects[normalizedId];
		if (!effect) {
			log.warn(`未实现的托环效果，已跳过: ${ring.id}`);
			continue;
		}

		const level = Math.max(1, Math.min(ring.level, effect.maxLevel));
		const sourceId = `register_ring.${normalizedId}`;
		effect.apply({
			level,
			statContainer,
			sourceId,
			sourceName: normalizedId,
		});
	}
};
