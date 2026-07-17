import { describe, expect, it } from "vitest";
import { ControllerDomainEventSchema, type MemberDomainEvent, MemberDomainEventSchema } from "../types";
import { DomainEventBus } from "./DomainEventBus";

describe("DomainEventBus", () => {
	it("成员与控制器目标判决使用可解析且互不混合的事件契约", () => {
		const memberEvent: MemberDomainEvent = {
			type: "target_selection_accepted",
			memberId: "member-1",
			targetId: "target-1",
			inputId: "input-1",
		};
		expect(MemberDomainEventSchema.parse(memberEvent)).toEqual(memberEvent);
		expect(
			ControllerDomainEventSchema.parse({
				...memberEvent,
				controllerId: "controller-1",
			}),
		).toEqual({ ...memberEvent, controllerId: "controller-1" });
	});

	it("同一 tick 合并同类事件，并在 tick 0 首次 flush 时分发", () => {
		const bus = new DomainEventBus();
		const received: MemberDomainEvent[] = [];
		bus.subscribe((event) => received.push(event));

		bus.emit({ type: "state_changed", memberId: "member-1", hp: 100, mp: 20 });
		bus.emit({ type: "state_changed", memberId: "member-1", hp: 80, mp: 10 });
		bus.flush(0);

		expect(received).toEqual([{ type: "state_changed", memberId: "member-1", hp: 80, mp: 10 }]);
	});

	it("相同 tickIndex 的后续 flush 仍会分发新产生的同步事件", () => {
		const bus = new DomainEventBus();
		const received: MemberDomainEvent[] = [];
		bus.subscribe((event) => received.push(event));

		bus.emit({ type: "death", memberId: "member-1" });
		bus.flush(3);
		bus.emit({ type: "death", memberId: "member-2" });
		bus.flush(3);

		expect(received).toEqual([
			{ type: "death", memberId: "member-1" },
			{ type: "death", memberId: "member-2" },
		]);
	});

	it("reset 清除待分发事件但保留固定订阅", () => {
		const bus = new DomainEventBus();
		const received: MemberDomainEvent[] = [];
		bus.subscribe((event) => received.push(event));

		bus.emit({ type: "death", memberId: "stale-member" });
		bus.reset();
		bus.flush(0);
		bus.emit({ type: "death", memberId: "current-member" });
		bus.flush(0);

		expect(received).toEqual([{ type: "death", memberId: "current-member" }]);
	});
});
