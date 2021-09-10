import {legendColor} from "./legends/color.js";
import {legendOpacity} from "./legends/opacity.js";
import {legendRadius} from "./legends/radius.js";

export function createLegends(descriptors, dimensions) {
  const legends = [];
  for (let key in descriptors) {
    let {legend, ...options} = descriptors[key];
    if (key === "color" && legend === true) legend = legendColor;
    if (key === "opacity" && legend === true) legend = legendOpacity;
    if (key === "r" && legend === true) legend = legendRadius;
    if (typeof legend === "function") {
      const l = legend(options, dimensions);
      if (l instanceof Node) legends.push(l);
    }
  }
  return legends;
}
