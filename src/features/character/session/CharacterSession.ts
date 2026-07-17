import { type Accessor, createSignal, onCleanup } from "solid-js";
import { useCharacterSessionActor, useCharacterSessionRuntime } from "~/machines/AppActorContext";
import type { CharacterLiveSnapshot } from "../data/CharacterLiveModel";
import type { CharacterEditQueueSnapshot } from "./CharacterEditQueue";
import type {
	CharacterSessionActorRef,
	CharacterSessionContext,
	CharacterSessionSnapshot,
} from "./characterSessionMachine";
import type { CharacterSessionIntent } from "./characterSessionProtocol";

export type CharacterSessionReadPort = {
	getSnapshot(): CharacterLiveSnapshot | null;
	subscribe(listener: (snapshot: CharacterLiveSnapshot | null) => void): () => void;
};

export type CharacterEditReadPort = {
	getSnapshot(): CharacterEditQueueSnapshot;
	subscribe(listener: (snapshot: CharacterEditQueueSnapshot) => void): () => void;
};

export type CharacterSessionFacade = {
	snapshot: Accessor<CharacterSessionSnapshot>;
	identity: () => CharacterSessionContext["identity"];
	character: () => CharacterLiveSnapshot | null;
	edits: () => CharacterEditQueueSnapshot;
	validation: () => CharacterSessionContext["validation"];
	error: () => CharacterSessionContext["error"];
	send: (intent: CharacterSessionIntent) => void;
};

/**
 * 构造 Character CUI 唯一读写入口。
 * CharacterLiveModel 提供唯一领域读面；facade 不泄露可变运行时控制。
 */
export function createCharacterSessionFacade(
	actor: CharacterSessionActorRef,
	characterReader: CharacterSessionReadPort,
	editReader: CharacterEditReadPort,
): CharacterSessionFacade {
	const [snapshot, setSnapshot] = createSignal<CharacterSessionSnapshot>(actor.getSnapshot(), { equals: false });
	const actorSubscription = actor.subscribe(setSnapshot);
	const [character, setCharacter] = createSignal<CharacterLiveSnapshot | null>(characterReader.getSnapshot());
	const releaseCharacter = characterReader.subscribe(setCharacter);
	const [edits, setEdits] = createSignal<CharacterEditQueueSnapshot>(editReader.getSnapshot());
	const releaseEdits = editReader.subscribe(setEdits);
	onCleanup(() => {
		actorSubscription.unsubscribe();
		releaseCharacter();
		releaseEdits();
	});
	const context = () => snapshot().context;
	return {
		snapshot,
		identity: () => context().identity,
		character,
		edits,
		validation: () => context().validation,
		error: () => context().error,
		send: (intent) => actor.send(intent),
	};
}

/** Character CUI 的唯一 Session 入口。 */
export function useCharacterSession(): CharacterSessionFacade {
	const actor = useCharacterSessionActor();
	const runtime = useCharacterSessionRuntime();
	return createCharacterSessionFacade(
		actor,
		{
			getSnapshot: runtime.getLiveSnapshot,
			subscribe: runtime.subscribeLiveProjection,
		},
		{
			getSnapshot: runtime.getEditSnapshot,
			subscribe: runtime.subscribeEditProjection,
		},
	);
}
