import type { PrioritySetElement } from "./queue";
import type { Tag } from "./time";
import type { ScheduledTrigger } from "./trigger";

/**
 * An event is caused by a timer or a scheduled action. Each event is tagged
 * with a time instant and may carry a value of arbitrary type. The tag will
 * determine the event's position with respect to other events in the event
 * queue.
 * 事件由定时器或已调度的动作产生。每个事件都带有一个时间标签，并可携带任意类型的值。
 * 标签决定事件在事件队列中的位置。
 */
export class TaggedEvent<T> implements PrioritySetElement<Tag> {
	/**
	 * Pointer to the next element of the priority set that this event might
	 * be hooked into.
	 * 指向此事件可能挂接到的优先级集合中的下一个元素。
	 */
	public next: PrioritySetElement<Tag> | undefined;

	/**
	 * Construct a new tagged event.
	 * 创建一个新的带标签事件。
	 * @param trigger The trigger of this event.
	 * @param tag The tag at which this event occurs.
	 * @param value The value associated with this event.
	 *
	 */
	constructor(
		public trigger: ScheduledTrigger<T>,
		public tag: Tag,
		public value: T,
	) {}

	/**
	 * Return true if this event has a smaller tag than the given event, false
	 * otherwise.
	 * 若此事件的标签小于给定事件的标签，则返回 true，否则返回 false。
	 * @param node The event to compare this event's tag against.
	 */
	hasPriorityOver(node: PrioritySetElement<Tag> | undefined): boolean {
		if (node != null) {
			return this.getPriority().isSmallerThan(node.getPriority());
		} else {
			return false;
		}
	}

	/**
	 * Determine whether the given event is a duplicate of this one. If so, assign the
	 * value this event to the given one. Otherwise, return false.
	 * 判断给定事件是否为此事件的重复项。若是，则将此事件的值赋给给定事件；否则返回 false。
	 * @param node The event adopt the value from if it is a duplicate of this one.
	 */
	updateIfDuplicateOf(node: PrioritySetElement<Tag> | undefined): boolean {
		if (node != null && node instanceof TaggedEvent) {
			if (this.trigger === node.trigger && this.tag.isSimultaneousWith(node.tag)) {
				node.value = this.value; // update the value
				return true;
			}
		}
		return false;
	}

	/**
	 * Return the tag associated with this event.
	 * 返回与此事件关联的标签。
	 */
	getPriority(): Tag {
		return this.tag;
	}
}
