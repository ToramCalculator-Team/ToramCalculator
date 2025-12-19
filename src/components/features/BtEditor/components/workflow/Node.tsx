import { Component } from 'solid-js';
import { NodeType } from '../../types/workflow';

export type NodeProps = {
  wrapped: Component<any>;
  model: NodeType;
};

export const Node: Component<NodeProps> = (props) => {
  const Wrapped = props.wrapped;
  return (
    <div class="select-none">
      <Wrapped {...props.model} />
    </div>
  );
};

