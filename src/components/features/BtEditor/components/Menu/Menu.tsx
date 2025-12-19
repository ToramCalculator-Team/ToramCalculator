import { Component, JSX, Show, onCleanup, createEffect } from 'solid-js';
import { Portal } from 'solid-js/web';

export type MenuProps = {
  anchorEl?: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  children?: JSX.Element;
  class?: string;
};

const Menu: Component<MenuProps> = (props) => {
  let menuRef: HTMLDivElement | undefined;


  // 点击外部关闭菜单
  const handleClickOutside = (event: MouseEvent) => {
    if (
      props.open &&
      menuRef &&
      !menuRef.contains(event.target as Node) &&
      props.anchorEl &&
      !props.anchorEl.contains(event.target as Node)
    ) {
      props.onClose();
    }
  };

  createEffect(() => {
    if (props.open) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
  });

  onCleanup(() => {
    document.removeEventListener('mousedown', handleClickOutside);
  });

  return (
    <Show when={props.open}>
      <Portal>
        <div
          ref={menuRef}
          class={`fixed z-50 mt-1 bg-primary-color rounded shadow-lg border border-dividing-color min-w-[200px] ${props.class || ''}`}
          style={{
            top: props.anchorEl ? `${props.anchorEl.getBoundingClientRect().bottom}px` : '0',
            left: props.anchorEl ? `${props.anchorEl.getBoundingClientRect().left}px` : '0',
          }}
          role="menu"
        >
          {props.children}
        </div>
      </Portal>
    </Show>
  );
};

export { Menu };

