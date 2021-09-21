import * as Plot from "@observablehq/plot";
import * as d3 from "d3";

export default async function () {
  const data = [
    {x: "b", y: "a", value: 2},
    {x: "c", y: "b", value: 1},
    {x: "d", y: "a", value: 2},
    {x: "d", y: "b", value: 2}
  ];
  const domain = [
    ...new Set([...Plot.valueof(data, "x"), ...Plot.valueof(data, "y")])
  ].sort();

  return Plot.plot({
    marks: [
      Plot.cell(d3.cross(domain, domain), {
        filter: ([x, y]) => y <= x,
        x: "0",
        y: "1",
        fill: "white",
        stroke: "black"
      }),
      Plot.dot(data, {
        x: "x",
        y: "y",
        stroke: "brown",
        fill: "brown",
        fillOpacity: d => d.value > 1,
        strokeWidth: 5,
        r: 11
      }),
      Plot.text(domain, {
        x: d => d,
        y: d => d,
        text: d => d.toUpperCase(),
        rotate: -45
      })
    ],
    width: 230,
    height: 230,
    marginTop: 40,
    marginLeft: 40,
    marginBottom: 40,
    marginRight: 40,
    x: {tickSize: 0, padding: 0, tickRotate: -45, axis: "top"},
    y: {tickSize: 0, padding: 0, tickRotate: -45, axis: "right"},
    style: "transform: rotate(45deg); background: transparent;"
  });
}
