/** Simulator CUI 可提交给 Session child 的具体语义意图。 */
export type SimulatorSessionIntent =
	| { type: "session.initialLoad.requested"; design: unknown }
	| { type: "session.switch.requested"; design: unknown }
	| { type: "session.end.requested" }
	| { type: "validation.start.requested" }
	| { type: "validation.finish.requested" }
	| { type: "validation.finish.retry" }
	| { type: "validation.pause.requested" }
	| { type: "validation.resume.requested" }
	| { type: "validation.step.requested" }
	| { type: "validation.retry.requested" }
	| { type: "validation.returnToDesign.requested" }
	| { type: "skill.cast.requested"; skillId: string }
	| { type: "controller.selected"; controllerId: string }
	| { type: "design.copy.selected"; copyId: string }
	| { type: "run.selected"; side: "A" | "B"; runId: string | null }
	| {
			type: "design.characterNumber.changed";
			field: "lv" | "str" | "int" | "vit" | "agi" | "dex";
			value: number;
	  }
	| { type: "design.simulatorNumber.changed"; field: "randomSeed" | "logicHz"; value: number }
	| { type: "design.apply.requested" }
	| { type: "run.behavior.save.requested"; runId: string };

/** AUI 对 Session 上行提案作出决策后发送的下行控制。 */
export type SimulatorSessionParentControl =
	| { type: "session.switch.authorized" }
	| { type: "session.switch.denied"; reason: string }
	| { type: "session.end.authorized" }
	| { type: "session.end.denied"; reason: string }
	| { type: "validation.start.authorized" }
	| { type: "validation.start.denied"; reason: string }
	| { type: "validation.finish.authorized" }
	| { type: "validation.finish.denied"; reason: string }
	| { type: "validation.returnToDesign.authorized" }
	| { type: "validation.returnToDesign.denied"; reason: string };

export type SimulatorSessionEvent = SimulatorSessionIntent | SimulatorSessionParentControl;

/** Session child 向 AUI 报告的应用级提案与已发生事实。 */
export type SimulatorSessionParentEvent =
	| { type: "simulator.session.loaded"; simulatorId: string }
	| { type: "simulator.session.switch.proposed"; simulatorId: string }
	| { type: "simulator.session.switched"; simulatorId: string }
	| { type: "simulator.session.end.proposed"; simulatorId: string }
	| { type: "simulator.session.ended"; simulatorId: string }
	| { type: "simulator.validation.start.proposed"; simulatorId: string }
	| { type: "simulator.validation.started"; simulatorId: string }
	| { type: "simulator.validation.startRejected"; simulatorId: string; reason: string }
	| { type: "simulator.validation.finish.proposed"; simulatorId: string }
	| { type: "simulator.validation.finished"; simulatorId: string; runId: string }
	| { type: "simulator.validation.finishRejected"; simulatorId: string; reason: string }
	| { type: "simulator.validation.returnToDesign.proposed"; simulatorId: string }
	| { type: "simulator.validation.returnedToDesign"; simulatorId: string };
