// ==================== 场景配置数据 ====================

import { z } from "zod/v4";
import { TerrainDefinitionSchema } from "~/lib/terrain/terrainDefinition";
import { WorldScenarioSchema } from "./ScenarioSchema";

export const WorldScenarioDataSchema = z.object({
	scenario: WorldScenarioSchema,
	terrain: TerrainDefinitionSchema,
});

export type WorldScenarioData = z.output<typeof WorldScenarioDataSchema>;
