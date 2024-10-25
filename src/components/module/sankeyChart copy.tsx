import { For, Show } from "solid-js";
import * as d3 from "d3";

export interface WeatherData {
  time: number;
  summary: string;
  icon: string;
  sunriseTime: number;
  sunsetTime: number;
  moonPhase: number;
  precipIntensity: number;
  precipIntensityMax: number;
  precipProbability: number;
  //? precipType only exists if precipProbability is higher than 0
  precipType?: precipTypeOption;
  temperatureHigh: number;
  temperatureHighTime: number;
  temperatureLow: number;
  temperatureLowTime: number;
  apparentTemperatureHigh: number;
  apparentTemperatureHighTime: number;
  apparentTemperatureLow: number;
  apparentTemperatureLowTime: number;
  dewPoint: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windGust: number;
  windGustTime: number;
  windBearing: number;
  cloudCover: number;
  uvIndex: number;
  uvIndexTime: number;
  visibility: number;
  temperatureMin: number;
  temperatureMinTime: number;
  temperatureMax: number;
  temperatureMaxTime: number;
  apparentTemperatureMin: number;
  apparentTemperatureMinTime: number;
  apparentTemperatureMax: number;
  apparentTemperatureMaxTime: number;
  date: string;
}

export type precipTypeOption = "rain" | "sleet" | "snow";

//? Get the metrics from WeatherData which return a number
//? https://stackoverflow.com/questions/56863875/typescript-how-do-you-filter-a-types-properties-to-those-of-a-certain-type
export type NumericWeatherDataMetric = {
  [K in keyof WeatherData]-?: WeatherData[K] extends d3.Numeric ? K : never;
}[keyof WeatherData];

export interface Dimensions {
  height: number;
  width: number;
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface BoundedDimensions extends Dimensions {
  boundedWidth: number;
  boundedHeight: number;
}

function SankeyChart(props: {
  dataset: WeatherData[];
  dimensions: BoundedDimensions;
  metric: NumericWeatherDataMetric;
}) {
  //* Step 1b. Access Data
  const dateParser = d3.timeParse("%Y-%m-%d");
  const xAccessor = (d: WeatherData) => dateParser(d.date) as Date;
  const yAccessor = (d: WeatherData) => d[props.metric];

  //* Step 4. Create scales
  const xScale = d3
    .scaleTime()
    .domain(d3.extent(props.dataset, xAccessor) as [Date, Date])
    .range([0, props.dimensions.boundedWidth]);

  const yScale = d3
    .scaleLinear()
    .domain(d3.extent(props.dataset, yAccessor) as [number, number])
    .range([props.dimensions.boundedHeight, 0]);

  const freezingTemperaturePlacement = yScale(32);

  const lineGenerator = d3
    .line<WeatherData>()
    .x((d) => xScale(xAccessor(d)))
    .y((d) => yScale(yAccessor(d)));

  const xTicks = xScale.ticks();
  const yTicks = yScale.ticks();

  return (
    <div class="fixed left-0 top-0 z-50 flex h-dvh w-dvw bg-primary-color">
      {/* Step 3. Draw canvas */}
      <svg width={props.dimensions.width} height={props.dimensions.height}>
        <g
          transform={`translate(${props.dimensions.margin.left}, ${props.dimensions.margin.top})`}
        >
          <rect
            x="0"
            width={props.dimensions.boundedWidth}
            y={freezingTemperaturePlacement}
            height={
              props.dimensions.boundedHeight - freezingTemperaturePlacement
            }
            fill="hsl(180deg 44% 92%)"
          />
          {/* Step 5. Draw data */}
          <path
            d={lineGenerator(props.dataset) ?? ""}
            fill="none"
            stroke="hsl(41deg 35% 52%)"
            stroke-width={2}
          />
          {/* Step 6. Draw peripherals */}
          <g
            font-size={10}
            font-family="sans-serif"
            text-anchor="middle"
            transform={`translate(0, ${props.dimensions.boundedHeight})`}
          >
            <line stroke="black" x2={props.dimensions.boundedWidth} />
            <For each={xTicks}>
              {(tick, i) => (
                <g transform={`translate(${xScale(tick)}, 0)`}>
                  <line stroke="black" y2={6} />
                  <text y={9} dy="0.71em">
                    {d3.timeFormat("%B")(tick)}
                  </text>
                </g>
              )}
            </For>
          </g>
          <g font-size={10} font-family="sans-serif" text-anchor="end">
            <line stroke="black" y2={props.dimensions.boundedHeight} />
            <For each={yTicks}>
              {(tick, i) => (
                <g transform={`translate(0, ${yScale(tick)})`}>
                  <line stroke="black" x2={-6} />
                  <text x={-9} dy="0.32em">
                    {tick}
                  </text>
                </g>
              )}
            </For>
          </g>
        </g>
      </svg>
    </div>
  );
}

export default SankeyChart;