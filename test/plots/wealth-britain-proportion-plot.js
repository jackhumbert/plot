import * as Plot from "@observablehq/plot";
import * as d3 from "d3";

export default async function() {
  const wide = await d3.csv("data/wealth-britain.csv", d3.autoType);
  const columns = wide.columns.slice(1);
  const data = columns.flatMap(type => wide.map(d => ({age: d.age, type, value: d[type]})));
  const stack = {
    x: "type",
    y: "value",
    z: "age",
    order: d3.sort(wide, d => d.shareA).map(d => d.age)
  };
  return Plot.plot({
    marginLeft: 45,
    marginRight: 55,
    x: {
      domain: columns,
      axis: "top",
      label: "",
      tickFormat: d => `Share of ${d}`,
      tickSize: 0,
      padding: 0 // see margins
    },
    y: {
      axis: null,
      reverse: true
    },
    color: {
      scheme: "prgn",
      reverse: true
    },
    marks: [
      Plot.areaY(data, Plot.stackY({
        ...stack,
        curve: "bump-x",
        fill: "age",
        stroke: "white"
      })),
      Plot.text(
        data.filter(d => d.type === "population"),
        Plot.stackY({
          ...stack,
          text: d => `${d.value}%`,
          textAnchor: "end",
          dx: -6
        })
      ),
      Plot.text(
        data.filter(d => d.type === "wealth"),
        Plot.stackY({
          ...stack,
          text: d => `${d.value}%`,
          textAnchor: "start",
          dx: +6
        })
      ),
      Plot.text(
        data.filter(d => d.type === "population"),
        Plot.stackY({
          ...stack,
          text: "age",
          textAnchor: "start",
          fill: "white",
          fontSize: 20,
          dx: +18
        })
      )
    ],
    caption: "“Who owns Britain?,” by Richard Speigal; data: U.K. Office for National Statistics. Proportion plot by Stephanie Evergreen."
  });
}
