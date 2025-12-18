/**
 * An example definition and board combination.
 */
 export type ExampleCategory = "advanced" | "leaf" | "composite" | "decorator" | "misc";

/**
 * An example definition and board combination.
 */
export type Example = {
    name: string;
    caption: string;
    category: ExampleCategory;
    definition: string;
    board: string;
};

/**
 * An array of example definition and board combinations.
 */
export const Examples: Example[] = [    
    {
        name: "sorting-lunch",
        caption: "Sorting Lunch",
        category: "advanced",
        definition: `root {
    selector while(IsHungry) {
        sequence {
            condition [HasDollars, 15]
            action [OrderFood, "Pizza"]
        }
        sequence {
            condition [HasIngredient, "Steak"]
            condition [HasIngredient, "Lobster"]
            action [CookFood, "Surf 'n' Turf"]
        }
        sequence {
            condition [HasIngredient, "Egg"]
            lotto {
                action [CookFood, "Omelette"]
                action [CookFood, "Scrambled Eggs"]
                action [CookFood, "Fried Eggs"]
            }
        }
        sequence {
            condition [HasIngredient, "Oats"]
            action [CookFood, "Gruel"]
        }
        action [Starve]
    }
}`,
        board: `class Agent {
    IsHungry() {
        return true;
    }
    HasDollars(amount) {
        return getNumberValue("How many dollars do we have?") >= amount;
    }
    HasIngredient(ingredient) {
        return getBooleanValue(\`Do we have \${ingredient}?\`);
    }
    OrderFood(foodType) {
        showInfoToast(\`Ordered \${foodType}!\`);
        return State.SUCCEEDED;
    }
    CookFood(foodType) {
        showInfoToast(\`We are cooking \${foodType}!\`);
        return State.SUCCEEDED;
    }
    Starve() {
        showErrorToast(\`Oh no! We Starved!\`);
        return State.SUCCEEDED;
    }
}`
    },

    {
        name: "action",
        caption: "Action",
        category: "leaf",
        definition: `root {
    action [SomeAction]
}`,
        board: `class Agent {
    SomeAction() {
        showInfoToast("Action Completed!");
        return State.SUCCEEDED;
    }
}`
    },

    {
        name: "action-with-args",
        caption: "Action with arguments",
        category: "leaf",
        definition: `root {
    action [Say, "hello world", 5, true]
}`,
        board: `class Agent {
    Say(dialog, times = 1, shout = false) {
        for (var index = 0; index < times; index++) {
            showInfoToast(shout ? dialog.toUpperCase() + "!!!" : dialog);
        }
        return State.SUCCEEDED;
    }
}`
    },

    {
        name: "async-action",
        caption: "Asynchronous Action",
        category: "leaf",
        definition: `root {
    action [SomeAsyncAction]
}`,
        board: `class Agent {
    SomeAsyncAction() {
        return new Promise(function(resolve, reject) {
            setTimeout(function() {
                resolve(State.SUCCEEDED);
            }, 3000);
        });
    }
}`
    },

    {
        name: "condition",
        caption: "Condition",
        category: "leaf",
        definition: `root {
    condition [SomeCondition]
}`,
        board: `class Agent {
    SomeCondition() {
        return true;
    }
}`
    },

    {
        name: "condition-with-args",
        caption: "Condition with arguments",
        category: "leaf",
        definition: `root {
    condition [HasItem, "gold", 500]
}`,
        board: `class Agent {
    HasItem(item, quantity = 1) {
        return getBooleanValue(\`Do we have \${quantity} \${item}?\`);
    }
}`
    },

    {
        name: "wait",
        caption: "Wait",
        category: "leaf",
        definition: `root {
    sequence {
        wait [2000]
        wait [1000, 5000]
        wait
    }
}`,
        board: `class Agent {}`
    },

    {
        name: "branch",
        caption: "Branch",
        category: "leaf",
        definition: `root {
    branch [AttemptDance]
}

root [AttemptDance] {
    sequence {
        condition [CanDance]
        action [Dance]
    }
}`,
        board: `class Agent {
    CanDance() {
        return true;
    }
    Dance() {
        showInfoToast("Dancing!");
        return State.SUCCEEDED;
    }
}`
    },

    {
        name: "sequence",
        caption: "Sequence",
        category: "composite",
        definition: `root {
    sequence {
        action [Walk]
        wait [1000]
        action [Fall]
        wait [1000]
        action [Laugh]
    }
}`,
        board: `class Agent {
    Walk() {
        showInfoToast("Walking!");
        return State.SUCCEEDED;
    }
    Fall() {
        showInfoToast("Falling!");
        return State.SUCCEEDED;
    }
    Laugh() {
        showInfoToast("Laughing!");
        return State.SUCCEEDED;
    }
}`
    },

    {
        name: "selector",
        caption: "Selector",
        category: "composite",
        definition: `root {
    selector {
        action [TeleportHome]
        action [FlyHome]
        action [DriveHome]
        action [WalkHome]
    }
}`,
        board: `class Agent {
    TeleportHome() {
        showErrorToast("We cannot teleport home, the technology simply doesn't exist!");
        return State.FAILED;
    }
    FlyHome() {
        showErrorToast("We can't afford a plane ticket!");
        return State.FAILED;
    }
    DriveHome() {
        showInfoToast("We have a car, we drive home!");
        return State.SUCCEEDED;
    }
    WalkHome() {
        showInfoToast("We walk home, it took ages!");
        return State.SUCCEEDED;
    }
}`
    },

    {
        name: "lotto",
        caption: "Lotto",
        category: "composite",
        definition: `root {
    lotto {
        action [PickPath, "left"]
        action [PickPath, "right"]
    }
}`,
        board: `class Agent {
    PickPath(direction) {
        showInfoToast(\`We picked the \${direction} path!\`);
        return State.SUCCEEDED;
    }
}`
    },

    {
        name: "weighted-lotto",
        caption: "Weighted Lotto",
        category: "composite",
        definition: `root {
    lotto [20,10,3,1] {
        action [CommonAction]
        action [UncommonAction]
        action [RareAction]
        action [VeryRareAction]
    }
}`,
        board: `class Agent {
    CommonAction() {
        showInfoToast("We very often do this action!");
        return State.SUCCEEDED;
    }
    UncommonAction() {
        showInfoToast("We sometimes do this action!");
        return State.SUCCEEDED;
    }
    RareAction() {
        showInfoToast("We do not do this action very often!");
        return State.SUCCEEDED;
    }
    VeryRareAction() {
        showInfoToast("We hardly ever do this action!");
        return State.SUCCEEDED;
    }
}`
    },

    {
        name: "parallel",
        caption: "Parallel",
        category: "composite",
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
        board: `class Agent {
    Succeed() {
        return State.SUCCEEDED;
    }
    Fail() {
        return State.FAILED;
    }
}`
    },

    {
        name: "race",
        caption: "Race",
        category: "composite",
        definition: `root {
    race {
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
        sequence {
            wait[500, 4000]
            lotto {
                action [Succeed]
                action [Fail]
            }
        }
    }
}`,
        board: `class Agent {
    Succeed() {
        return State.SUCCEEDED;
    }
    Fail() {
        return State.FAILED;
    }
}`
    },

    {
        name: "all",
        caption: "All",
        category: "composite",
        definition: `root {
    all {
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
        sequence {
            wait[500, 4000]
            lotto {
                action [Succeed]
                action [Fail]
            }
        }
    }
}`,
        board: `class Agent {
    Succeed() {
        return State.SUCCEEDED;
    }
    Fail() {
        return State.FAILED;
    }
}`
    },

    {
        name: "repeat",
        caption: "Repeat",
        category: "decorator",
        definition: `root {
    sequence {
        repeat [2] {
            action [Say, "We will do this twice"]
        }
        repeat [2, 6] {
            action [Say, "We will do this between two and six times"]
        }
        repeat {
            sequence {
                action [Say, "We will do this indefinitely"]
                wait [1000]
            }
        }
    }
}`,
        board: `class Agent {
    Say(text) {
        showInfoToast(text);
        return State.SUCCEEDED;
    }
}`
    },

    {
        name: "retry",
        caption: "Retry",
        category: "decorator",
        definition: `root {
    selector {
        retry [2] {
            action [Say, "We will attempt this twice"]
        }
        retry [2, 6] {
            action [Say, "We will attempt this between two and six times"]
        }
        retry {
            sequence {
                wait [1000]
                action [Say, "We will attempt this indefinitely"]
            }
        }
    }
}`,
        board: `class Agent {
    Say(text) {
        showInfoToast(text);
        return State.FAILED;
    }
}`
    },

    {
        name: "flip",
        caption: "Flip",
        category: "decorator",
        definition: `root {
    sequence {
        flip {
            action [Fail]
        }
        flip {
            action [Succeed]
        }
    }
}`,
        board: `class Agent {
    Succeed() {
        return State.SUCCEEDED;
    }
    Fail() {
        return State.FAILED;
    }
}`
    },

    {
        name: "succeed",
        caption: "Succeed",
        category: "decorator",
        definition: `root {
    sequence {
        succeed {
            action [Fail]
        }
        succeed {
            action [Succeed]
        }
    }
}`,
        board: `class Agent {
    Succeed() {
        return State.SUCCEEDED;
    }
    Fail() {
        return State.FAILED;
    }
}`
    },

    {
        name: "fail",
        caption: "Fail",
        category: "decorator",
        definition: `root {
    selector {
        fail {
            action [Fail]
        }
        fail {
            action [Succeed]
        }
    }
}`,
        board: `class Agent {
    Succeed() {
        return State.SUCCEEDED;
    }
    Fail() {
        return State.FAILED;
    }
}`
    },

    {
        name: "guards",
        caption: "Guards",
        category: "misc",
        definition: `root {
    selector {
        action [IndefiniteAction] until(IsKeyDown, "Enter")
        action [IndefiniteAction] while(IsKeyDown, "Enter")
        action [IndefiniteAction] until(IsKeyDown, "Backspace")
        action [IndefiniteAction] while(IsKeyDown, "Backspace")
    }
}`,
        board: `class Agent {
    constructor() {
        // We should keep track of which keys are currently down.
        // It's rather hacky to be doing this in the agent constructor
        // but it's being done here just for the sake of this example.
        const pressedKeyCodes = {};
        window.onkeyup = (event) => {
            pressedKeyCodes[event.key] = false;
        }
        window.onkeydown = (event) => {
            pressedKeyCodes[event.key] = true;
        }
        
        // Register the global "IsKeyDown" function. It's
        // rather hacky to be doing this in the agent constructor but
        // it's being done here just for the sake of this example.
        BehaviourTree.register("IsKeyDown", (agent, key) => {
            return !!pressedKeyCodes[key];
        });
    }
    IndefiniteAction() { /** Do something indefinitely */ }
}`
    },

    {
        name: "callbacks",
        caption: "Callbacks",
        category: "misc",
        definition: `root entry(OnRootStart) exit(OnRootFinish) {
    sequence entry(OnSequenceStart) exit(OnSequenceFinish) {
        action [Succeed] entry(OnActionStart) exit(OnActionFinish) step(OnActionStep)
    }
}`,
        board: `class Agent {
    Succeed() {
        return State.SUCCEEDED;
    }
    OnRootStart() {
        showInfoToast("On Root Start!");
    }
    OnRootFinish() {
        showInfoToast("On Root Finish!");
    }
    OnSequenceStart() {
        showInfoToast("On Sequence Start!");
    }
    OnSequenceFinish() {
        showInfoToast("On Sequence Finish!");
    }
    OnActionStart() {
        showInfoToast("On Action Start!");
    }
    OnActionStep() {
        showInfoToast("On Action Step!");
    }
    OnActionFinish() {
        showInfoToast("On Action Finish!");
    }
}`
    },

    {
        name: "global-subtrees",
        caption: "Global Subtrees",
        category: "misc",
        definition: `root {
    sequence {
        action [AttemptDifficultTask]
        branch [Celebrate]
    }
}`,
        board: `class Agent {
    constructor() {
        // Register the global subtree for some celebratory behaviour.
        // It's rather hacky to be doing this in the agent constructor
        // but it's being done here just for the sake of this example.
        BehaviourTree.register("Celebrate", \`root {
            sequence {
                action [Jump]
                action [Say, "We did it!"]
            }
        }\`);
    }
    AttemptDifficultTask() {
        return State.SUCCEEDED;
    }
    Jump() {
        return State.SUCCEEDED;
    }
    Say(text) {
        showInfoToast(text);
        return State.SUCCEEDED;
    }
}`
    },


    {
        name: "global-functions",
        caption: "Global Functions",
        category: "misc",
        definition: `root {
    repeat {
        selector {
            sequence {
                condition [IsSimulationRunning]
                action [Say, "I have work to do!"]
            }
            action [Relax]
        }
    }
}`,
        board: `class Agent {
    constructor() {
        // Register the global "Say" function. It's rather hacky 
        // to be doing this in the agent constructor but it's being
        // done here just for the sake of this example.
        BehaviourTree.register("Say", (agent, text) => {
            showInfoToast(\`\${agent.GetName()}: \${text}\`);
            return State.SUCCEEDED;
        });

        // We should keep track of whether any key is currently down.
        // It's rather hacky to be doing this in the agent constructor
        // but it's being done here just for the sake of this example.
        let isKeyDown = false;
        window.onkeyup = (event) => { isKeyDown = false; }
        window.onkeydown = (event) => { isKeyDown = true; }
        
        // Register the global "IsSimulationRunning" function. It's
        // rather hacky to be doing this in the agent constructor but
        // it's being done here just for the sake of this example.
        BehaviourTree.register("IsSimulationRunning", (agent) => {
            // The simulation is running if we have a key down.
            return isKeyDown;
        });
    }
    Relax() {
        return State.SUCCEEDED;
    }
    GetName() {
        return "Barry";
    }
}`
    },


    {
        name: "agent-property-references",
        caption: "Agent Property References",
        category: "misc",
        definition: `root {
    sequence {
        condition [HasTarget]
        condition [CanSee, $target]
        action [MoveTowards, $target]
    }
}`,
        board: `class Agent {
    get target() {
        return {
            name: "Enemy",
            xPosition: 100,
            yPosition: 100
        };
    }
    HasTarget() {
        return !!this.target;
    }
    CanSee(target) {
        // ... Check whether this agent can see the specified target ...
        showInfoToast(\`Can see \${target.name}\`);
        return true;
    }
    MoveTowards(target) {
        // ... Move towards the specified target ...
        showInfoToast(\`Moving towards x:\${target.xPosition} y:\${target.yPosition}\`);
        return State.SUCCEEDED;
    }
}`
    }
];