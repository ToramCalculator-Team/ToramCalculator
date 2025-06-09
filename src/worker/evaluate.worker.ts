import { ActorRefFrom, createActor, setup } from "xstate";

// Character machine definition
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
    },
    checkSkillRequirements: ({ context, event }, params) => {
      console.log("checkSkillRequirements");
    },
    applyEffects: ({ context, event }, params) => {
      console.log("applyEffects");
    },
    clearHpMpAndStatus: ({ context, event }, params) => {
      console.log("clearHpMpAndStatus");
    },
  },
  guards: {
    SufficientHpForSkillCombo: function ({ context, event }) {
      return true;
    },
    HasChargeAction: function ({ context, event }) {
      return true;
    },
    HasNextCombo: function ({ context, event }) {
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
      states: {
        Operable: {
          initial: "Idle",
          on: {
            CONTROLLED: {
              target: "CONTROLLEDState",
            },
          },
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
    },
  },
});

// Main simulator machine
export const machine = setup({
  types: {
    context: {} as {
      characterActor: ActorRefFrom<typeof characterMachine> | null;
    },
    events: {} as
      | { type: "START" }
      | { type: "PAUSE" }
      | { type: "CANCEL" }
      | { type: "RESET" }
      | { type: "TERMINATION_CONDITION_MET" }
      | { type: "ADDITION_COMPLETE" }
      | { type: "ITERATION_COMPLETE" },
  },
  actions: {
    loadConfigAndGenerateTeamData: function ({ context, event }, params) {
      // Initialize character actor
      const actor = createActor(characterMachine);
      actor.start();
      context.characterActor = actor;
    },
    readEventQueue: function ({ context, event }, params) {
      // Read and process event queue
    },
    checkExecutionConditions: function ({ context, event }, params) {
      // Check if conditions are met for execution
    },
    executeAndRemoveSatisfiedEvents: function ({ context, event }, params) {
      // Execute events and remove them from queue
    },
    getMainCharacterAction: function ({ context, event }, params) {
      // Get main character's action and send to character machine
      if (context.characterActor) {
        context.characterActor.send({ type: "USE_SKILL" });
      }
    },
    addAdditionalEvents: function ({ context, event }, params) {
      // Add additional events based on character state
    },
  },
}).createMachine({
  context: {
    characterActor: null,
  },
  id: "Simulator",
  initial: "Idle",
  entry: {
    type: "loadConfigAndGenerateTeamData",
  },
  states: {
    Idle: {
      on: {
        START: {
          target: "Running",
        },
      },
    },
    Running: {
      initial: "FrameByFrameCalculation",
      on: {
        CANCEL: {
          target: "Idle",
        },
        TERMINATION_CONDITION_MET: {
          target: "CalculationComplete",
        },
      },
      states: {
        FrameByFrameCalculation: {
          initial: "ProcessEvents",
          on: {
            PAUSE: {
              target: "Paused",
            },
          },
          states: {
            ProcessEvents: {
              on: {
                ITERATION_COMPLETE: {
                  target: "AddEvents",
                },
              },
              entry: [
                {
                  type: "readEventQueue",
                },
                {
                  type: "checkExecutionConditions",
                },
                {
                  type: "executeAndRemoveSatisfiedEvents",
                },
              ],
            },
            AddEvents: {
              on: {
                ADDITION_COMPLETE: {
                  target: "OutputData",
                },
              },
              entry: [
                {
                  type: "getMainCharacterAction",
                },
                {
                  type: "addAdditionalEvents",
                },
              ],
            },
            OutputData: {},
          },
        },
        Paused: {},
      },
    },
    CalculationComplete: {
      on: {
        RESET: {
          target: "Idle",
        },
      },
    },
  },
});