import { Character, CharacterInsert, createCharacter, findCharacters } from "@db/repositories/character";
import { BabylonBg } from "~/components/features/BabylonGame";
import { createEffect, createMemo, createResource, createSignal, JSX, onMount, ParentProps, Show } from "solid-js";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";
import { LoadingBar } from "~/components/controls/loadingBar";
import { Select } from "~/components/controls/select";
import { useNavigate } from "@solidjs/router";
import { Button } from "~/components/controls/button";
import { getDB } from "@db/repositories/database";
import { defaultData } from "@db/defaultData";
import { createAccount, findAccountById } from "@db/repositories/account";
import { createPlayer, findPlayers, findPlayersByAccountId, Player } from "@db/repositories/player";
import { createId } from "@paralleldrive/cuid2";

export default function CharacterIndexPage(props: ParentProps) {
  // 导航
  const navigate = useNavigate();

  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));

  // 状态管理参数
  const [characters, { refetch: refetchCharacters }] = createResource(() =>
    findCharacters(store.session.user.account?.id ?? ""),
  );
  const [characterIndex, setCharacterIndex] = createSignal(0);

  createEffect(() => {
    console.log("accountId", store.session.user.account?.id);
    console.log("characters.latest", characters.latest);
    if (characters.latest && characters.latest.length > 0) {
      const characterId = characters.latest[characterIndex()].id;
      if (characterId) {
        navigate(`/character/${characterId}`);
      }
    }
  });

  onMount(() => {
    console.log("--CharacterIndexPage Render");

    return () => {
      console.log("--CharacterIndexPage Unmount");
    };
  });

  const handleCreateCharacter = async () => {
    const db = await getDB();
    const character = await db.transaction().execute(async (trx) => {
      let account;
      if (store.session.user.account?.id) {
        account = await findAccountById(store.session.user.account.id, trx);
        console.log("account", account);
        if (!account) {
          throw new Error("Account not found");
        }
      } else {
        account = await createAccount(trx, {
          ...defaultData.account,
          id: createId(),
        });
        setStore("session", "user", "account", {
          id: account.id,
          type: "User",
        });
      }
      console.log("account", account);
      let player: Player;
      const players = await findPlayersByAccountId(account.id, trx);
      if (players.length > 0) {
        player = players[0];
      } else {
        player = await createPlayer(trx, {
          ...defaultData.player,
          id: createId(),
          accountId: account.id,
        });
      }
      console.log("player", player);
      const character = await createCharacter(trx, {
        ...defaultData.character,
        id: createId(),
        masterId: player.id,
      });
      console.log("character", character);
      return character;
    });
    navigate(`/character/${character.id}`);
  };

  return (
    <Show
      when={characters.latest}
      fallback={
        <div class="LoadingState flex h-full w-full flex-col items-center justify-center gap-3">
          <LoadingBar center class="h-12 w-1/2 min-w-[320px]" />
        </div>
      }
    >
      {(characters) => (
        <div class="CharacterPage flex h-full w-full flex-col">
          <Show
            when={characters().length > 0}
            fallback={
              <div class="flex flex-col gap-3 h-full w-full p-6">
                <Button class="h-full w-full border-2 border-dashed" onClick={handleCreateCharacter}>
                  {dictionary().ui.actions.create}
                </Button>
                <Button class="h-full w-full border-2 border-dashed" onClick={() => {}}>
                  {dictionary().ui.actions.logIn}
                </Button>
              </div>
            }
          >
            <div class={`Title w-full`}>
              <Select
                value={characters()[characterIndex()].name}
                setValue={(value) => {
                  navigate(`/character/${value}`);
                }}
                options={characters().map((character) => ({ label: character.name, value: character.id }))}
                placeholder={characters()[characterIndex()].name}
                styleLess
                textCenter
              />
            </div>
            <div class="Content h-full w-full flex-1">{props.children}</div>
          </Show>
        </div>
      )}
    </Show>
  );
}
