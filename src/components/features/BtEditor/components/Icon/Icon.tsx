import { Component, JSX } from 'solid-js';

export type IconProps = {
  src?: string;
  children?: JSX.Element;
  size?: 'small' | 'medium' | 'large';
  class?: string;
};

const Icon: Component<IconProps> = (props) => {
  const sizeClasses = () => {
    switch (props.size) {
      case 'small':
        return 'w-5 h-5';
      case 'large':
        return 'w-9 h-9';
      default:
        return 'w-6 h-6';
    }
  };

  return (
    <span class={`inline-flex items-center justify-center ${sizeClasses()} ${props.class || ''}`}>
      {props.src ? (
        <img src={props.src} alt="" class="w-full h-full object-contain" />
      ) : (
        props.children
      )}
    </span>
  );
};

export { Icon };
