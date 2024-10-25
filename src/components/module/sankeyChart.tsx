import { createSignal, onMount } from "solid-js";
import * as d3 from "d3";
import { CharacterData, dynamicTotalValue, isModifiers, modifiers } from "~/routes/(app)/(functionPage)/analyzer/worker";
import { Character } from "~/repositories/character";
import { sankey } from "d3-sankey";

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
    width: 24,
    height: 24,
    margin: {
      top: 4,
      right: 4,
      bottom: 4,
      left: 4,
    },
  };

  const checkDepth = (
    obj: Record<string, any>,
    currDepth: number = 0,
    result: { obj: modifiers; currDepth: number }[] = [],
    visited = new Set<Record<string, any>>(), // Track visited nodes
  ): {obj: modifiers; currDepth: number}[] => {
    if (visited.has(obj)) {
      return result; // Avoid reprocessing the same object
    }
    visited.add(obj); // Mark current object as visited

    if (isModifiers(obj)) {
      if (obj.relations && obj.relations.length > 0) {
        obj.relations.forEach((relation) => {
          result = result.concat(checkDepth(relation, currDepth + 1, [], visited));
        });
      } else {
        result.push({ obj, currDepth });
      }
    } else {
      Object.entries(obj).forEach(([key, value]) => {
        result = result.concat(checkDepth(value, currDepth, [], visited));
      });
    }

    return result;
  };

  onMount(() => {
    const svg = d3.select(root);
    const baseNodes = checkDepth(data());
    let maxDepth = 0;
    baseNodes.forEach((node) => {
      if (node.currDepth > maxDepth) {
        maxDepth = node.currDepth;
      }
    });
    const stepWidth = (dimensions.boundedWidth - nodeSize.width) / maxDepth;
    let offsetHeight: [][] = [];
    const nodes: { obj: modifiers; name: string; depth: number; height: number; x: number; y: number }[] = [];
    baseNodes.forEach((node) => {
      nodes.push({
        obj: node.obj,
        name: node.obj.name?.toString() ?? "未知属性",
        depth: node.currDepth,
        height: dynamicTotalValue(node.obj),
        x: dimensions.margin.left + node.currDepth * stepWidth,
        y: 0,
      });
    })

    nodes.forEach((node) => {
      svg
        .append("rect")
        .attr("x", node.x)
        .attr("y", dimensions.margin.top)
        .attr("width", nodeSize.width)
        .attr("height", node.height)
        .attr("fill", `rgba(${(255 * (node.depth + 1)) / maxDepth}, 0, 0, 0.3)`);
    });

    // 定义线性渐变
    const gradient = svg
      .append("defs")
      .append("linearGradient")
      .attr("id", "gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    gradient.append("stop").attr("offset", "0%").attr("stop-color", "yellow");

    gradient.append("stop").attr("offset", "100%").attr("stop-color", "red");

    // 创建贝塞尔曲线连接两条竖线
    svg
      .append("path")
      .attr(
        "d",
        `
       M 50 50
       C 100 20, 100 20, 150 50
       L 150 150
       C 100 120, 100 120, 50 150
       Z`,
      )
      .attr("fill", "url(#gradient)")
      .attr("stroke", "black")
      .attr("stroke-width", 2);
  });

  return (
    <div class="fixed left-0 top-0 z-50 flex h-dvh w-dvw bg-primary-color">
      <svg ref={root!} width={dimensions.width} height={dimensions.height}>
        <g transform={`translate(${dimensions.margin.left}, ${dimensions.margin.top})`}>
          <rect x="0" width={dimensions.boundedWidth} y="0" height={dimensions.boundedHeight} fill="rgba(0,0,0,0.1)" />
        </g>
      </svg>
    </div>
  );
}

export default SankeyChart;
