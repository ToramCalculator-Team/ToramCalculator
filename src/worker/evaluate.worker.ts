import { createActor, setup } from "xstate";

const characterMachine = setup({
  types: {
    context: {} as {},
    events: {} as
      | { type: "CONTROLLED" }
      | { type: "MOVE_START" }
      | { type: "HP_LESS_OR_EQUAL_TO_0" }
      | { type: "MOVE_END" }
      | { type: "CONTROL_TIME_ENDED" }
      | { type: "REVIVE_COUNTDOWN_CLEARED" }
      | { type: "PRE_CAST_ENDED" }
      | { type: "CHARGE_ENDED" }
      | { type: "USE_SKILL" }
      | { type: "POST_CAST_ENDED" },
  },
  actions: {
    generateInitialStateFromConfig: () => {
      console.log("generateInitialStateFromConfig");
      // Add your action code here
      // ...
    },
    checkSkillRequirements: ({ context, event }, params) => {
      console.log("checkSkillRequirements");
      // Add your action code here
      // ...
    },
    applyEffects: ({ context, event }, params) => {
      console.log("applyEffects");
      // Add your action code here
      // ...
    },
    clearHpMpAndStatus: ({ context, event }, params) => {
      // Add your action code here
      // ...
    },
  },
  guards: {
    SufficientHpForSkillCombo: function ({ context, event }) {
      // Add your guard condition here
      return true;
    },
    HasChargeAction: function ({ context, event }) {
      // Add your guard condition here
      return true;
    },
    HasNextCombo: function ({ context, event }) {
      // Add your guard condition here
      return true;
    },
  },
}).createMachine({
  context: {},
  id: "Player",
  initial: "Alive",
  entry: {
    type: "generateInitialStateFromConfig",
  },
  states: {
    Alive: {
      initial: "Operable",
      on: {
        HP_LESS_OR_EQUAL_TO_0: {
          target: "Dead",
        },
      },
      description: "Player is alive, can operate and affect context",
      states: {
        Operable: {
          initial: "Idle",
          on: {
            CONTROLLED: {
              target: "CONTROLLEDState",
            },
          },
          description: "Can respond to input actions",
          states: {
            Idle: {
              on: {
                MOVE_START: {
                  target: "Moving",
                },
                USE_SKILL: [
                  {
                    target: "CastingSkill",
                    guard: {
                      type: "SufficientHpForSkillCombo",
                    },
                  },
                  {
                    target: "Idle",
                  },
                ],
              },
            },
            Moving: {
              on: {
                MOVE_END: {
                  target: "Idle",
                },
              },
            },
            CastingSkill: {
              initial: "PreCast",
              states: {
                PreCast: {
                  on: {
                    PRE_CAST_ENDED: [
                      {
                        target: "Charging",
                        guard: {
                          type: "HasChargeAction",
                        },
                      },
                      {
                        target: "PostCast",
                      },
                    ],
                  },
                  entry: {
                    type: "checkSkillRequirements",
                  },
                },
                Charging: {
                  on: {
                    CHARGE_ENDED: {
                      target: "PostCast",
                    },
                  },
                },
                PostCast: {
                  on: {
                    POST_CAST_ENDED: [
                      {
                        target: "PreCast",
                        guard: {
                          type: "HasNextCombo",
                        },
                      },
                      {
                        target: "#Player.Alive.Operable.Idle",
                      },
                    ],
                  },
                  entry: {
                    type: "applyEffects",
                  },
                },
              },
            },
          },
        },
        CONTROLLEDState: {
          on: {
            CONTROL_TIME_ENDED: {
              target: "#Player.Alive.Operable.Idle",
            },
          },
        },
      },
    },
    Dead: {
      on: {
        REVIVE_COUNTDOWN_CLEARED: {
          target: "#Player.Alive.Operable",
          actions: {
            type: "clearHpMpAndStatus",
          },
        },
      },
      description: "Player is dead, cannot operate, interrupts actions, and is removed from context",
    },
  },
});

const actor = createActor(characterMachine);
actor.start();