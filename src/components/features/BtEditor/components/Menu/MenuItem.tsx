import { Component, JSX, splitProps } from 'solid-js';

export type MenuItemProps = {
  dense?: boolean;
  onClick?: () => void;
  children?: JSX.Element;
  class?: string;
};

const MenuItem: Component<MenuItemProps> = (props) => {
  const [local, others] = splitProps(props, ['dense', 'onClick', 'children', 'class']);

  return (
    <div
      class={`px-4 cursor-pointer hover:bg-area-color transition-colors ${
        local.dense ? 'py-1' : 'py-2'
      } ${local.class || ''}`}
      onClick={local.onClick}
      role="menuitem"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          local.onClick?.();
        }
      }}
      {...others}
    >
      {local.children}
    </div>
  );
};

export { MenuItem };

