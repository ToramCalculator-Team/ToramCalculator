import { createEffect, createSignal, For, Show } from "solid-js";
import { useZero } from "~/components/module/zeroContex";
import "./test.css";
import Button from "~/components/ui/button";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";

const requests = [
  "Hey guys, is the zero package ready yet?",
  "I tried installing the package, but it's not there.",
  "The package does not install...",
  "Hey, can you ask Aaron when the npm package will be ready?",
  "npm npm npm npm npm",
  "n --- p --- m",
  "npm wen",
  "npm package?",
];

const replies = [
  "It will be ready next week",
  "We'll let you know",
  "It's not ready - next week",
  "next week i think",
  "Didn't we say next week",
  "I could send you a tarball, but it won't work",
];

const randBetween = (min: number, max: number) => Math.floor(Math.random() * (max - min) + min);
const randInt = (max: number) => randBetween(0, max);
const randID = () => Math.random().toString(36).slice(2);

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

function App() {
  const z = useZero();
  const [users, { refetch: refetchUsers }] = createResource(findUsers);
  const [users, { refetch: refetchUsers }] = createResource(findUsers);

  const [filterUser, setFilterUser] = createSignal<string>("");
  const [filterMedium, setFilterMedium] = createSignal<string>("");
  const [filterText, setFilterText] = createSignal<string>("");
  const [filterDate, setFilterDate] = createSignal<string>("");

  const filteredMessages = useQuery(() => {
    let filtered = z.query.message
      .related("medium", (medium) => medium.one())
      .related("sender", (sender) => sender.one())
      .orderBy("timestamp", "desc");

    if (filterUser()) {
      filtered = filtered.where("senderID", filterUser());
    }

    if (filterMedium()) {
      filtered = filtered.where("mediumID", filterMedium());
    }

    if (filterText()) {
      filtered = filtered.where("body", "LIKE", `%${escapeLike(filterText())}%`);
    }

    if (filterDate()) {
      filtered = filtered.where("timestamp", ">=", new Date(filterDate()).getTime());
    }
    return filtered;
  });

  const hasFilters = () => filterUser() || filterMedium() || filterText() || filterDate();
  const [action, setAction] = createSignal<"add" | "remove" | undefined>(undefined);

  createEffect(() => {
    if (action() !== undefined) {
      const interval = setInterval(() => {
        if (!handleAction()) {
          clearInterval(interval);
          setAction(undefined);
        }
      }, 1000 / 60);
    }
  });

  const handleAction = () => {
    if (action() === undefined) {
      return false;
    }
    if (action() === "add") {
      z.mutate.message.insert(randomMessage(users(), mediums()));
      return true;
    } else {
      const messages = allMessages();
      if (messages.length === 0) {
        return false;
      }
      const index = randInt(messages.length);
      z.mutate.message.delete({ id: messages[index].id });
      return true;
    }
  };

  const addMessages = () => setAction("add");

  const removeMessages = (e: MouseEvent) => {
    if (z.userID === "anon" && !e.shiftKey) {
      alert("删除消息需要登录，或者按住shift删除无视此规则.");
      return;
    }
    setAction("remove");
  };

  const stopAction = () => setAction(undefined);

  const editMessage = (e: MouseEvent, id: string, senderID: string, prev: string) => {
    if (senderID !== z.userID && !e.shiftKey) {
      alert("编辑消息需要登录，或者按住shift编辑无视此规则.");
      return;
    }
    const body = prompt("Edit message", prev);
    z.mutate.message.update({
      id,
      body: body ?? prev,
    });
  };

  // If initial sync hasn't completed, these can be empty.
  const initialSyncComplete = () => users().length && mediums().length;

  const user = () => users().find((user) => user.id === z.userID)?.name ?? "anon";

  return (
    <OverlayScrollbarsComponent
      element="div"
      options={{ scrollbars: { autoHide: "scroll" } }}
      defer
      class="z-50 h-full w-full"
    >
      <Show when={initialSyncComplete()}>
        <div class="Content flex flex-1 flex-col gap-3 rounded p-6">
          <div class="ControlsBox gap-1 rounded bg-area-color p-3">
            <div class="controls">
              <div>
                <Button onMouseDown={addMessages} onMouseUp={stopAction}>
                  添加记录
                </Button>
                <Button onMouseDown={removeMessages} onMouseUp={stopAction}>
                  删除记录
                </Button>
                <em>(可以长按)</em>
              </div>
              <div
                style={{
                  "justify-content": "end",
                }}
              >
                {user() === "anon" ? "" : `当前用户 ${user()}`}
                <Button
                  onMouseDown={() => {
                    console.log(user());
                    if (user() === "anon") {
                      fetch("/api/user/login");
                    } else {
                      fetch("/api/user/logout");
                    }
                    location.reload();
                  }}
                >
                  {user() === "anon" ? "随机登录" : "登出"}
                </Button>
              </div>
            </div>
            <div class="controls">
              <div>
                来自:
                <select onChange={(e) => setFilterUser(e.target.value)} style={{ flex: 1 }}>
                  <option value="">发送者</option>
                  <For each={users()}>{(user) => <option value={user.id}>{user.name}</option>}</For>
                </select>
              </div>
              <div>
                通过:
                <select onChange={(e) => setFilterMedium(e.target.value)} style={{ flex: 1 }}>
                  <option value="">媒体</option>

                  <For each={mediums()}>{(medium) => <option value={medium.id}>{medium.name}</option>}</For>
                </select>
              </div>
              <div>
                内容:
                <input
                  type="text"
                  placeholder="message"
                  onChange={(e) => setFilterText(e.target.value)}
                  style={{ flex: 1 }}
                />
              </div>
              <div>
                于:
                <input type="date" onChange={(e) => setFilterDate(e.target.value)} style={{ flex: 1 }} />
              </div>
            </div>
            <div class="controls">
              <em>
                {!hasFilters() ? (
                  <>Showing all {filteredMessages().length} messages</>
                ) : (
                  <>
                    Showing {filteredMessages().length} of {allMessages().length} messages. Try opening{" "}
                    <a href="/" target="_blank">
                      another tab
                    </a>{" "}
                    to see them all!
                  </>
                )}
              </em>
            </div>
          </div>
          {filteredMessages().length === 0 ? (
            <h3>
              <em>No posts found 😢</em>
            </h3>
          ) : (
            <table class="messages">
              <thead>
                <tr>
                  <th>发送者</th>
                  <th>媒体</th>
                  <th>消息内容</th>
                  <th>发送时间</th>
                  <th>编辑</th>
                </tr>
              </thead>
              <tbody>
                <For each={filteredMessages()}>
                  {(message) => (
                    <tr>
                      <td>{message.sender?.name}</td>
                      <td>{message.medium?.name}</td>
                      <td>{message.body}</td>
                      <td>{formatDate(message.timestamp)}</td>
                      <td onMouseDown={(e) => editMessage(e, message.id, message.senderID, message.body)}>✏️</td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          )}
        </div>
      </Show>
    </OverlayScrollbarsComponent>
  );
}

export default App;
