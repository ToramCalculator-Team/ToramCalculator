import { createResource, createSignal, For, onCleanup, onMount } from "solid-js";
import Button from "~/components/controls/button";

type Item = {
  id: number;
  name: string;
};

const itemList: Item[] = [];

for (let i = 0; i < 100; i++) {
  itemList.push({
    id: i,
    name: `Item ${i}`,
  });
}

async function getItems(): Promise<Item[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(itemList);
    }, 3000);
  });
}

async function getItem(id: number): Promise<Item> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(itemList.find((item) => item.id === id)!);
    }, 3000);
  });
}

function Test() {
  const [itemId, setItemId] = createSignal(1);
  const [items, { refetch: refetchItems }] = createResource(getItems);
  const [item, { refetch: refetchItem }] = createResource(() => itemId(), getItem);
  let intervalId: NodeJS.Timeout;

  const logItem = () => {
    console.log(item());
  };

  onMount(() => {
    intervalId = setInterval(logItem, 500);
  });

  onCleanup(() => {
    clearInterval(intervalId);
  });

  return (
    <div
      class="z-50 h-full w-full"
    >
      <div class="Content flex flex-1 flex-wrap gap-3 rounded p-6">
        <For each={items()}>
          {(item, index) => {
            return (
              <Button
                onClick={() => {
                  setItemId(item.id);
                }}
              >
                {item.name}
              </Button>
            );
          }}
        </For>
      </div>
      <h1>{itemId()}</h1>
      <pre class="bg-primary-color">{item.latest?.name}</pre>
    </div>
  );
}

export default Test;
