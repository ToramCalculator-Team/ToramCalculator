import { createSignal, onMount } from "solid-js";
import { BtEditor } from "~/components/features/BtEditor/BtEditor";

export default function BtEditorPage() {
  const [initValues, setInitValues] = createSignal<{ definition: string; agent: string }>({
    definition: `root {
    parallel {
        sequence {
            wait[500, 4000]
            lotto {
                action [Succeed]
                action [Fail]
            }
        }
        sequence {
            wait[500, 4000]
            lotto {
                action [Succeed]
                action [Fail]
            }
        }
    }
}`,
    agent: `class Agent {
    Succeed() {
        return State.SUCCEEDED;
    }
    Fail() {
        return State.FAILED;
    }
}`,
  });

  const onSave = (definition: string, agent: string) => {
    console.log(definition, agent);
  };

  return <BtEditor initValues={initValues()} onSave={onSave} />;
}
