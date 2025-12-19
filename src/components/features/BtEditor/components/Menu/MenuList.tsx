import { Component, JSX } from 'solid-js';

export type MenuListProps = {
  dense?: boolean;
  children?: JSX.Element;
  class?: string;
};

const MenuList: Component<MenuListProps> = (props) => {
  return (
    <div
      class={`${props.dense ? 'py-1' : 'py-2'} ${props.class || ''}`}
      role="menu"
    >
      {props.children}
    </div>
  );
};

export { MenuList };

