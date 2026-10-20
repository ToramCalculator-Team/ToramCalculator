import type { WorldCharacterSkill, WorldMob } from "../../../ScenarioSchema";
import { DefaultMemberRuntime, type MemberRuntime } from "../../types";

/** Mob 专用 runtime 扩展。 */
export interface MobRuntime extends MemberRuntime {
	type: "Mob";
	skillList: WorldCharacterSkill[];
	data: WorldMob | null;
}
export const MobRuntimeDefaults: MobRuntime = {
	...DefaultMemberRuntime,
	type: "Mob",
	skillList: [],
	data: null,
};
