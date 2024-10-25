import { createSignal, onMount } from "solid-js";
import * as d3 from "d3";
import { CharacterData } from "~/routes/(app)/(functionPage)/analyzer/worker";
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
    }
  }

  const nodes = Object.entries(data())
  console.log(nodes);

  onMount(() => {
    const svg = d3.select(root);
     // 定义线性渐变
     const gradient = svg.append("defs")
     .append("linearGradient")
     .attr("id", "gradient")
     .attr("x1", "0%")
     .attr("y1", "0%")
     .attr("x2", "100%")
     .attr("y2", "0%");
   
   gradient.append("stop")
     .attr("offset", "0%")
     .attr("stop-color", "yellow");

   gradient.append("stop")
     .attr("offset", "100%")
     .attr("stop-color", "red");

   // 竖线1
   svg.append("line")
     .attr("x1", 50)
     .attr("y1", 50)
     .attr("x2", 50)
     .attr("y2", 150)
     .attr("stroke", "black")
     .attr("stroke-width", 2);

   // 竖线2
   svg.append("line")
     .attr("x1", 150)
     .attr("y1", 50)
     .attr("x2", 150)
     .attr("y2", 150)
     .attr("stroke", "black")
     .attr("stroke-width", 2);

   // 创建贝塞尔曲线连接两条竖线
   svg.append("path")
     .attr("d", `
       M 50 50
       C 100 20, 100 20, 150 50
       L 150 150
       C 100 120, 100 120, 50 150
       Z`)
     .attr("fill", "url(#gradient)")
     .attr("stroke", "black")
     .attr("stroke-width", 2);
  });

  return (
    <div class="fixed left-0 top-0 z-50 flex h-dvh w-dvw bg-primary-color">
      <svg ref={root!} width={dimensions.width} height={dimensions.height}>
        <g transform={`translate(${dimensions.margin.left}, ${dimensions.margin.top})`}>
          <rect x="0" width={dimensions.boundedWidth} y="0" height={dimensions.boundedHeight} fill="currentColor" />
        </g>
      </svg>
    </div>
  );
}

export default SankeyChart;
