import { defaultData } from "@db/defaultData";
import { findAccountById, createAccount } from "@db/repositories/account";
import { createCharacter } from "@db/repositories/character";
import { getDB } from "@db/repositories/database";
import { Player, findPlayersByAccountId, createPlayer } from "@db/repositories/player";
import { createId } from "@paralleldrive/cuid2";
import { createMemo, Show } from "solid-js";
import { LoadingBar } from "~/components/controls/loadingBar";
import { Select } from "~/components/controls/select";
import { Button } from "~/components/controls/button";
import dictionary from "~/locales/dictionaries/zh_CN";
import { store, setStore } from "~/store";
import { getDictionary } from "~/locales/i18n";
import { useNavigate } from "@solidjs/router";

export default function CreateCharacterPage() {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.userInterface.language));

  const navigate = useNavigate();

  const handleCreateCharacter = async () => {
    const db = await getDB();
    const character = await db.transaction().execute(async (trx) => {
      let account;
      if (store.session.account?.id) {
        account = await findAccountById(store.session.account.id, trx);
        console.log("account", account);
        if (!account) {
          throw new Error("Account not found");
        }
      } else {
        account = await createAccount(trx, {
          ...defaultData.account,
          id: createId(),
        });
        console.log("account22", account);
        setStore("session", "account", {
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
      setStore("session", "account", {
        id: account.id,
        type: account.type,
        player: {
          id: player.id,
          character: {
            id: character.id,
          },
        },
      });
      return character;
    });
    navigate(`/character/${character.id}`);
  };

  return (
    <>
      <div class="flex h-full w-full flex-col gap-3 p-6">
        <Button class="h-full w-full border-2 border-dashed" onClick={handleCreateCharacter}>
          {dictionary().ui.actions.create}
          <Show when={!store.session.user?.id}>在本地</Show>
        </Button>
        <Show when={!store.session.user?.id}>
          <Button
            class="h-full w-full border-2 border-dashed"
            onClick={() => {
              setStore("pages", "loginDialogState", true);
            }}
          >
            {dictionary().ui.actions.logIn}
          </Button>
        </Show>
      </div>
    </>
  );
}
