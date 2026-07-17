import type { CharacterAggregateIdentity } from "../data/characterAggregateQuery";
import type { CharacterEdit } from "../edit/characterEditProtocol";

export type CharacterSessionIntent =
	| ({ type: "character.load" } & CharacterAggregateIdentity)
	| ({ type: "character.switch.requested" } & CharacterAggregateIdentity)
	| { type: "character.edit.submit"; edit: CharacterEdit }
	| { type: "character.edits.retryFailed" }
	| { type: "character.edits.discardFailed" }
	| { type: "character.preview.refresh" }
	| { type: "character.preview.retryFailed"; candidateSkillId?: string };
