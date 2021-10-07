import {ascending} from "d3-array";
import {create} from "d3-selection";
import {arc as shapeArc} from "d3-shape";
import {filter, nonempty} from "../defined.js";
import {Mark, maybeNumber} from "../mark.js";
import {applyDirectStyles, applyIndirectStyles, applyTransform, applyChannelStyles, offset} from "../style.js";

const defaults = {
  fill: "currentColor",
  stroke: "none"
};

export class Arc extends Mark {
  constructor(data, options = {}) {
    const {
      x,
      y,
      startAngle = d => d.startAngle,
      endAngle = d => d.endAngle,
      innerRadius,
      outerRadius,
      padAngle,      
      z,
      title,
      label
    } = options;
    const [vsa, csa] = maybeNumber(startAngle, 0);
    const [vea, cea] = maybeNumber(endAngle, 2 * Math.PI);
    const [vpa, cpa] = maybeNumber(padAngle, 0);
    const [vri, cri] = maybeNumber(innerRadius, 0);
    const [vro, cro] = maybeNumber(outerRadius, 100);
    super(
      data,
      [
        {name: "x", value: x, scale: "x", optional: true},
        {name: "y", value: y, scale: "y", optional: true},
        {name: "startAngle", value: vsa, optional: true},
        {name: "endAngle", value: vea, optional: true},
        {name: "innerRadius", value: vri, scale: "r", optional: true},
        {name: "outerRadius", value: vro, scale : "r", optional: true},
        {name: "padAngle", value: vpa, optional: true},
        {name: "z", value: z, optional: true},
        {name: "title", value: title, optional: true},
        {name: "label", value: label, optional: true}
      ],
      options,
      defaults
    );
    this.sa = csa;
    this.ea = cea;
    this.ri = cri;
    this.ro = cro;
    this.pa = cpa;
  }
  render(
    I,
    {x, y},
    channels,
    {width, height, marginTop, marginRight, marginBottom, marginLeft}
  ) {
    const {
      startAngle: SA, 
      endAngle: EA, 
      innerRadius: RI, 
      outerRadius: RO, 
      padAngle: PA, 
      x: X, y: Y, z: Z, 
      label: L
    } = channels;    
    const {dx, dy} = this;
    let index = filter(I, SA, EA);
    if (Z) index.sort((i, j) => ascending(Z[i], Z[j]));
    
    // const r0 = Math.min(width - marginLeft - marginRight, height - marginTop - marginBottom) / 200;
    const r0 = 1;
    
    const arc = shapeArc()
      .startAngle(SA ? (i => SA[i]) : this.sa)
      .endAngle(EA ? (i => EA[i]) : this.ea)
      .innerRadius(RI ? (i => r0 * RI[i]) : r0 * this.ri)
      .outerRadius(RO ? (i => r0 * RO[i]) : r0 * this.ro)
      .padAngle(PA ? (i => PA[i]) : this.pa);
    
    const wrapper = create("svg:g")
      // wrapper
      //   .append("g")
        .call(applyIndirectStyles, this)
        .call(applyTransform, x, y, offset + dx, offset + dy)
        .call(g => g.selectAll()
          .data(index)
          .join("path")
            .call(applyDirectStyles, this)
            .attr("d", arc)
            .attr("transform", i => `translate(${X ? X[i] : x},${Y ? Y[i] : y})`)
            .call(applyChannelStyles, channels));
    if (L) wrapper.append("g").call(_label(L, index, arc));
    return wrapper.node();
  
  function _label(L, index, arc) {
    return L ? g => {
      g.append("g")
      .selectAll("text")
      .data(index.filter(i => nonempty(L[i])))
      .join("g")
      .attr("transform", i => `translate(${x(X[i])},${y(Y[i])})`)
        .append("text")
        .text(i => L[i])
        .attr("transform", i => `translate(${arc.centroid(i)})`)
        .attr("text-anchor", "center")
        .style("fill", "black");
      } : () => {};
    }
  }
}

export function arc(data, options) {
  return new Arc(data, options);
}
