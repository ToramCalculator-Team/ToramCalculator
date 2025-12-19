import { Component, JSX, splitProps } from 'solid-js';

export type ChipProps = {
  label: string;
  variant?: 'default' | 'outlined';
  size?: 'small' | 'medium';
  onClick?: () => void;
  class?: string;
};

const Chip: Component<ChipProps> = (props) => {
  const [local, others] = splitProps(props, ['label', 'variant', 'size', 'onClick', 'class']);

  const baseClasses = () => {
    let classes = 'inline-flex items-center justify-center rounded-full font-medium';
    
    // Size
    if (local.size === 'small') {
      classes += ' text-xs px-2 py-0.5 h-5';
    } else {
      classes += ' text-sm px-3 py-1 h-6';
    }
    
    // Variant
    if (local.variant === 'outlined') {
      classes += ' border border-dividing-color bg-transparent text-accent-color hover:bg-area-color';
      if (local.onClick) {
        classes += ' cursor-pointer';
      }
    } else {
      classes += ' bg-area-color text-accent-color';
    }
    
    return classes;
  };

  const handleClick = () => {
    if (local.onClick) {
      local.onClick();
    }
  };

  return (
    <span
      class={`${baseClasses()} ${local.class || ''}`}
      onClick={local.onClick ? handleClick : undefined}
      role={local.onClick ? 'button' : undefined}
      tabIndex={local.onClick ? 0 : undefined}
      {...others}
    >
      {local.label}
    </span>
  );
};

export { Chip };

