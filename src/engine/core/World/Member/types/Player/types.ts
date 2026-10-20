import type { WorldCharacter, WorldCharacterSkill } from "../../../ScenarioSchema";
import { DefaultMemberRuntime, type MemberRuntime } from "../../types";

/** Player 专用 runtime 扩展。 */
export interface PlayerRuntime extends MemberRuntime {
	type: "Player";
	skillList: WorldCharacterSkill[];
	data: WorldCharacter | null;
}
export const PlayerRuntimeDefaults: PlayerRuntime = {
	...DefaultMemberRuntime,
	type: "Player",
	skillList: [],
	data: null,
};
