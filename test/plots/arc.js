import * as Plot from "@observablehq/plot";
import * as d3 from "d3";

export default async function() {
  const data = d3.pie()([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  console.log(data);
  return Plot.plot({
    marks: [
      Plot.arc(data, {
        x: 0, y: 0,
          innerRadius: d => 10 * d.value,
          outerRadius: d => 30 * d.value,
          fill: d => `a${d.value}`
        })
    ]
  });
}