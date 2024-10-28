import { createSignal, For, onMount } from "solid-js";
import * as d3 from "d3";
import {
  CharacterData,
  dynamicTotalValue,
  isModifiers,
  modifiers,
} from "~/routes/(app)/(functionPage)/analyzer/worker";
import { Character } from "~/repositories/character";
import { sankey } from "d3-sankey";
import stringToColor from "~/lib/untils/stringToColor";

function SankeyChart(props: { character: Character }) {
  let root: SVGSVGElement;
  const [data, setData] = createSignal(new CharacterData(props.character));
  const dimensions = {
    width: window.innerWidth,
    height: window.innerHeight,
    margin: {
      top: 15,
      right: 15,
      bottom: 15,
      left: 15,
    },
    boundedWidth: 0,
    boundedHeight: 0,
  };
  dimensions.boundedWidth = dimensions.width - dimensions.margin.left - dimensions.margin.right;
  dimensions.boundedHeight = dimensions.height - dimensions.margin.top - dimensions.margin.bottom;
  const nodeSize = {
    width: 12,
    margin: {
      top: 4,
      right: 4,
      bottom: 4,
      left: 4,
    },
  };

  const generatePosition = (
    obj: Record<string, any>,
    x: number = 0,
    result: { obj: modifiers; x: number; y: number }[] = [],
    visited = new Set<Record<string, any>>(), // Track visited nodes
    levelYMap: Record<number, number> = {}, // Track y values per level
  ): { obj: modifiers; x: number; y: number }[] => {
    if (visited.has(obj)) {
      return result; // Avoid reprocessing the same object
    }
    visited.add(obj); // Mark current object as visited

    // Initialize y for current depth if not already done
    if (levelYMap[x] === undefined) {
      levelYMap[x] = 0;
    }

    if (isModifiers(obj)) {
      if (obj.relations && obj.relations.length > 0) {
        obj.relations.forEach((relation) => {
          result = result.concat(generatePosition(relation, x + 1, [], visited, levelYMap));
        });
      } else {
        result.push({ obj, x, y: levelYMap[x] });
        levelYMap[x]++; // Increment y for this depth after adding the node
      }
    } else {
      Object.entries(obj).forEach(([key, value]) => {
        result = result.concat(generatePosition(value, x, [], visited, levelYMap));
      });
    }

    return result;
  };

  const baseNodes = generatePosition(data());
  let maxDepth = 0;
  baseNodes.forEach((node) => {
    if (node.x > maxDepth) {
      maxDepth = node.x;
    }
  });
  const stepWidth = (dimensions.boundedWidth - nodeSize.width) / maxDepth;
  const offsetHeight = Array.from({ length: maxDepth + 1 }, () => 0);
  const nodes: { obj: modifiers; name: string; depth: number; height: number; x: number; y: number }[] = [];

  // 计算原始值
  baseNodes.forEach((node) => {
    const nodeHeight = dynamicTotalValue(node.obj);
    const columnIndex = node.x;
    nodes.push({
      obj: node.obj,
      name: node.obj.name?.toString() ?? "未知属性",
      depth: columnIndex,
      height: nodeHeight,
      x: columnIndex * stepWidth,
      y: offsetHeight[columnIndex],
    });
    offsetHeight[columnIndex] += nodeHeight;
  });

  // 缩放y
  nodes.forEach((node) => {
    node.height = node.height * (dimensions.boundedHeight / offsetHeight[node.depth]) - 10;
    node.y = node.y * (dimensions.boundedHeight / offsetHeight[node.depth]);
  });

  onMount(() => {
    // // 定义线性渐变
    // const gradient = svg
    //   .append("defs")
    //   .append("linearGradient")
    //   .attr("id", "gradient")
    //   .attr("x1", "0%")
    //   .attr("y1", "0%")
    //   .attr("x2", "100%")
    //   .attr("y2", "0%");
    // gradient.append("stop").attr("offset", "0%").attr("stop-color", "yellow");
    // gradient.append("stop").attr("offset", "100%").attr("stop-color", "red");
    // // 创建贝塞尔曲线连接两条竖线
    // svg
    //   .append("path")
    //   .attr(
    //     "d",
    //     `
    //    M 50 50
    //    C 100 20, 100 20, 150 50
    //    L 150 150
    //    C 100 120, 100 120, 50 150
    //    Z`,
    //   )
    //   .attr("fill", "url(#gradient)")
    //   .attr("stroke", "black")
    //   .attr("stroke-width", 2);
  });

  return (
    <div class="fixed left-0 top-0 z-50 flex h-dvh w-dvw bg-primary-color">
      <svg ref={root!} width={dimensions.width} height={dimensions.height}>
        <g transform={`translate(${dimensions.margin.left}, ${dimensions.margin.top})`}>
          <rect x="0" width={dimensions.boundedWidth} y="0" height={dimensions.boundedHeight} fill="rgba(0,0,0,0.1)" />
          <For each={nodes}>
            {(node) => {
              return (
                <>
                  <rect
                    x={node.x}
                    y={node.y}
                    width={nodeSize.width}
                    height={node.height}
                    fill={stringToColor(node.obj.name?.toString() ?? "未知属性")}
                  />
                  <text x={node.x} y={node.y} font-size="12" transform={`rotate(30 ${node.x} ${node.y})`}>
                    {node.name}
                  </text>
                </>
              );
            }}
          </For>
        </g>
      </svg>
    </div>
  );
}

export default SankeyChart;
