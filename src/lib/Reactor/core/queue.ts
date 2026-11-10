/**
 * @file A collection of classes for handling queues.
 * @author Marten Lohstroh <marten@berkeley.edu>
 */

/**
 * Interface for prioritized elements than be hooked into a linked list.
 * 可挂接到链表中的优先级元素接口。
 */
export interface PrioritySetElement<P> {
  /**
   * Pointer to the next node in the priority set.
   * 指向优先级集合中的下一个节点。
   */
  next: PrioritySetElement<P> | undefined;

  /**
   * Return the priority of this node.
   * 返回此节点的优先级。
   */
  getPriority: () => P;

  /**
   * Return true if this node has priority over the given node, false otherwise.
   * 若此节点的优先级高于给定节点则返回 true，否则返回 false。
   * @param node A node to compare the priority of this node to.
   */
  hasPriorityOver: (node: PrioritySetElement<P>) => boolean;

  /**
   * If the given node is considered a duplicate of this node, then
   * update this node if needed, and return true. Return false otherwise.
   * 如果给定节点被视为此节点的重复项，则在需要时更新此节点并返回 true；否则返回 false。
   * @param node A node that may or may not be a duplicate of this node.
   */
  updateIfDuplicateOf: (node: PrioritySetElement<P> | undefined) => boolean;
}

/**
 * A deduplicating priority queue that overwrites duplicate entries,
 * based on a singly-linked list.
 * 基于单向链表实现的去重优先级队列；遇到重复条目时会覆盖已有条目。
 */
export class PrioritySet<P> {
  /**
   * The number of elements in the queue.
   * 队列中的元素数量。
   */
  private count = 0;

  /**
   * The first-in-line element in the queue.
   * 队列首部的元素。
   */
  private head: PrioritySetElement<P> | undefined;

  /**
   * Empty the queue.
   * 清空队列。
   */
  empty(): void {
    this.head = undefined;
    this.count = 0;
  }

  /**
   * Return the first-in-line element of the queue, but do not remove it.
   * 返回队列首部元素，但不将其移除。
   */
  peek(): PrioritySetElement<P> | undefined {
    if (this.head != null) {
      return this.head;
    }
  }

  /**
   * Return the first-in-line element of the queue and remove it.
   * 返回并移除队列首部元素。
   */
  pop(): PrioritySetElement<P> | undefined {
    if (this.head != null) {
      const node = this.head;
      this.head = this.head.next;
      node.next = undefined; // unhook from linked list
      this.count--;
      return node;
    }
  }

  /**
   * Insert a new element into the queue based on its priority.
   * If a duplicate entry already exists, abort the insertion.
   * 根据优先级将新元素插入队列。若队列中已存在重复条目，则取消插入。
   * @param element The element to push onto the queue.
   */
  push(element: PrioritySetElement<P>): void {
    // update linked list
    if (this.head === undefined) {
      // create head
      element.next = undefined;
      this.head = element;
      this.count++;
    } else if (element.updateIfDuplicateOf(this.head)) {
      // updateIfDuplicateOf returned true, i.e.,
      // it has updated the value of this.head to
      // equal that of element.
    } else {
      // prepend
      if (element.hasPriorityOver(this.head)) {
        element.next = this.head;
        this.head = element;
        this.count++;
        return;
      }
      // seek
      let curr: PrioritySetElement<P> | undefined = this.head;
      while (curr != null) {
        const next: PrioritySetElement<P> | undefined = curr.next;
        if (next != null) {
          if (element.updateIfDuplicateOf(next)) {
            // updateIfDuplicateOf returned true, i.e.,
            // it has updated the value of this.head to
            // equal that of element.
            return;
          } else if (element.hasPriorityOver(next)) {
            break;
          } else {
            curr = next;
          }
        } else {
          break;
        }
      }
      if (curr != null) {
        // insert
        element.next = curr.next; // undefined if last
        curr.next = element;
        this.count++;
      }
    }
  }

  /**
   * Return the number of elements in the queue.
   * 返回队列中的元素数量。
   */
  size(): number {
    return this.count;
  }
}
