import { Component, JSX, splitProps } from 'solid-js';

export type ButtonProps = {
  variant?: 'default' | 'fab';
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'inherit';
  onClick?: (e: MouseEvent) => void;
  href?: string;
  children?: JSX.Element;
  class?: string;
  disabled?: boolean;
};

const Button: Component<ButtonProps> = (props) => {
  const [local, others] = splitProps(props, [
    'variant',
    'size',
    'color',
    'onClick',
    'href',
    'children',
    'class',
    'disabled',
  ]);

  const baseClasses = () => {
    const variant = local.variant || 'default';
    const size = local.size || 'medium';
    const color = local.color || 'primary';
    
    let classes = 'inline-flex items-center justify-center font-medium uppercase outline-none transition-all';
    
    // Variant styles
    if (variant === 'fab') {
      classes += ' rounded-full shadow-lg hover:shadow-xl active:shadow-2xl';
    } else {
      classes += ' rounded px-4 py-2';
    }
    
    // Size styles
    if (variant === 'fab') {
      if (size === 'small') classes += ' w-10 h-10';
      else if (size === 'large') classes += ' w-16 h-16';
      else classes += ' w-14 h-14';
    } else {
      if (size === 'small') classes += ' text-xs px-2 py-1';
      else if (size === 'large') classes += ' text-base px-6 py-3';
      else classes += ' text-sm';
    }
    
    // Color styles
    if (color === 'primary') {
      classes += ' bg-brand-color-1st text-white hover:opacity-90 active:opacity-80';
    } else if (color === 'secondary') {
      classes += ' bg-brand-color-3rd text-white hover:opacity-90 active:opacity-80';
    } else {
      classes += ' bg-transparent text-current hover:bg-area-color';
    }
    
    // Disabled styles
    if (local.disabled) {
      classes += ' opacity-60 cursor-not-allowed pointer-events-none';
    }
    
    return classes;
  };

  const handleClick = (e: MouseEvent) => {
    if (!local.disabled && local.onClick) {
      local.onClick(e);
    }
  };

  if (local.href) {
    return (
      <a
        href={local.href}
        class={`${baseClasses()} ${local.class || ''}`}
        onClick={handleClick}
        {...others}
      >
        {local.children}
      </a>
    );
  }

  return (
    <button
      class={`${baseClasses()} ${local.class || ''}`}
      onClick={handleClick}
      disabled={local.disabled}
      {...others}
    >
      {local.children}
    </button>
  );
};

export { Button };
