import { JSX } from 'solid-js';
import { render } from 'solid-js/web';

export class Presenter {
  public static render(className: string, rootRef: HTMLElement | null, element: JSX.Element): HTMLElement {
    Presenter.tryDestroy(rootRef);

    // 创建一个新的 DOM 容器
    const container = document.createElement('div');
    container.className = className;
    rootRef = container;

    // 使用 SolidJS 的 render 函数来渲染组件到 DOM 容器中
    render(() => element, container);

    return container;
  }

  public static tryDestroy(rootRef: HTMLElement | null) {
    if (rootRef) {
      const oldRoot = rootRef;
      rootRef = null;
      // 移除 DOM 节点，SolidJS 会自动处理卸载逻辑
      setTimeout(() => {
        oldRoot.remove(); // 直接移除 DOM 节点
      });
    }
  }
}