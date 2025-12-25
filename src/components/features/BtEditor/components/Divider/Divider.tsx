import { type Component, splitProps } from 'solid-js';

export type DividerProps = {
  orientation?: 'horizontal' | 'vertical';
  class?: string;
};

const Divider: Component<DividerProps> = (props) => {
  const [local, others] = splitProps(props, ['orientation', 'class']);

  const orientation = () => local.orientation || 'horizontal';
  
  const classes = () => {
    if (orientation() === 'vertical') {
      return `w-px h-full bg-dividing-color ${local.class || ''}`;
    }
    return `w-full h-px bg-dividing-color ${local.class || ''}`;
  };

  return <div class={classes()} {...others} />;
};

export { Divider };

