export type Position = { x: number; y: number; };

/**
 * Connector variant types
 */
export type ConnectorVariant = 'default' | 'active' | 'succeeded' | 'failed';

/**
 * Common props for all connector components
 */
export type ConnectorProps = {
  source: Position;
  target: Position;
  containerWidth: number;
  containerHeight: number;
};

/**
 * The Node type.
 */
export type NodeType = {
  id: string;
  variant: string;
};

/**
 * The Connector type.
 */
export type ConnectorType = {
  id: string;
  from: string;
  to: string;
  variant: ConnectorVariant;
};

export type ChildNode = {
  connector: ConnectorType;
  child: NodeWithChildren;
};

export type NodeWithChildren = {
  node: NodeType;
  children: ChildNode[];
};

