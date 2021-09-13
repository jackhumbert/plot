import {registry, position, radius, opacity} from "./scales/index.js";
import {ScaleLinear, ScaleSqrt, ScalePow, ScaleLog, ScaleSymlog, ScaleQuantile, ScaleThreshold, ScaleIdentity} from "./scales/quantitative.js";
import {ScaleDiverging, ScaleDivergingSqrt, ScaleDivergingPow, ScaleDivergingLog, ScaleDivergingSymlog} from "./scales/diverging.js";
import {ScaleTime, ScaleUtc} from "./scales/temporal.js";
import {ScaleOrdinal, ScalePoint, ScaleBand} from "./scales/ordinal.js";
import {isOrdinal, isTemporal} from "./mark.js";
import {parse as isoParse} from "isoformat";

export function Scales(channels, {inset, round, nice, align, padding, ...options} = {}) {
  const scales = {};
  for (const key of registry.keys()) {
    if (channels.has(key) || options[key]) {
      const scale = Scale(key, channels.get(key), {
        inset: key === "x" || key === "y" ? inset : undefined, // not for facet
        round: registry.get(key) === position ? round : undefined, // only for position
        nice,
        align,
        padding,
        ...options[key]
      });
      if (scale) scales[key] = scale;
    }
  }
  return scales;
}

// Mutates scale.range!
export function autoScaleRange({x, y, fx, fy}, dimensions) {
  if (fx) autoScaleRangeX(fx, dimensions);
  if (fy) autoScaleRangeY(fy, dimensions);
  if (x) autoScaleRangeX(x, fx ? {width: fx.scale.bandwidth()} : dimensions);
  if (y) autoScaleRangeY(y, fy ? {height: fy.scale.bandwidth()} : dimensions);
}

function autoScaleRangeX(scale, dimensions) {
  if (scale.range === undefined) {
    const {inset = 0} = scale;
    const {width, marginLeft = 0, marginRight = 0} = dimensions;
    scale.scale.range([marginLeft + inset, width - marginRight - inset]);
  }
  autoScaleRound(scale);
}

function autoScaleRangeY(scale, dimensions) {
  if (scale.range === undefined) {
    const {inset = 0} = scale;
    const {height, marginTop = 0, marginBottom = 0} = dimensions;
    const range = [height - marginBottom - inset, marginTop + inset];
    if (isOrdinalScale(scale)) range.reverse();
    scale.scale.range(range);
  }
  autoScaleRound(scale);
}

function autoScaleRound(scale) {
  if (scale.round === undefined && isOrdinalScale(scale) && scale.scale.step() >= 5) {
    scale.scale.round(true);
  }
}

function Scale(key, channels = [], options = {}) {
  const type = inferScaleType(key, channels, options);
  options.type = type;

  // Once the scale type is known, coerce the associated channel values and any
  // explicitly-specified domain to the expected type.
  switch (type) {
    case "diverging":
    case "diverging-sqrt":
    case "diverging-pow":
    case "diverging-log":
    case "diverging-symlog":
    case "cyclical":
    case "sequential":
    case "linear":
    case "sqrt":
    case "threshold":
    case "quantile":
    case "pow":
    case "log":
    case "symlog":
      options = coerceType(channels, options, coerceNumber, Float64Array);
      break;
    case "identity":
      if (registry.get(key) === position) options = coerceType(channels, options, coerceNumber, Float64Array);
      break;
    case "utc":
    case "time":
      options = coerceType(channels, options, coerceDate);
      break;
  }

  switch (type) {
    case "diverging": return ScaleDiverging(key, channels, options);
    case "diverging-sqrt": return ScaleDivergingSqrt(key, channels, options);
    case "diverging-pow": return ScaleDivergingPow(key, channels, options);
    case "diverging-log": return ScaleDivergingLog(key, channels, options);
    case "diverging-symlog": return ScaleDivergingSymlog(key, channels, options);
    case "categorical": case "ordinal": return ScaleOrdinal(key, channels, options);
    case "cyclical": case "sequential": case "linear": return ScaleLinear(key, channels, options);
    case "sqrt": return ScaleSqrt(key, channels, options);
    case "threshold": return ScaleThreshold(key, channels, options);
    case "quantile": return ScaleQuantile(key, channels, options);
    case "pow": return ScalePow(key, channels, options);
    case "log": return ScaleLog(key, channels, options);
    case "symlog": return ScaleSymlog(key, channels, options);
    case "utc": return ScaleUtc(key, channels, options);
    case "time": return ScaleTime(key, channels, options);
    case "point": return ScalePoint(key, channels, options);
    case "band": return ScaleBand(key, channels, options);
    case "identity": return registry.get(key) === position ? ScaleIdentity(key, channels, options) : undefined;
    case undefined: return;
    default: throw new Error(`unknown scale type: ${options.type}`);
  }
}

function inferScaleType(key, channels, {type, domain, range}) {
  if (key === "fx" || key === "fy") return "band";
  if (type !== undefined) {
    for (const {type: t} of channels) {
      if (t !== undefined && type !== t) {
        throw new Error(`scale incompatible with channel: ${type} !== ${t}`);
      }
    }
    return type;
  }
  if (registry.get(key) === radius) return "sqrt";
  if (registry.get(key) === opacity) return "linear";
  for (const {type} of channels) if (type !== undefined) return type;
  if ((domain || range || []).length > 2) return asOrdinalType(key);
  if (domain !== undefined) {
    if (isOrdinal(domain)) return asOrdinalType(key, type);
    if (isTemporal(domain)) return "utc";
    return "linear";
  }
  // If any channel is ordinal or temporal, it takes priority.
  const values = channels.map(({value}) => value).filter(value => value !== undefined);
  if (values.some(isOrdinal)) return asOrdinalType(key);
  if (values.some(isTemporal)) return "utc";
  return "linear";
}

// Positional scales default to a point scale instead of an ordinal scale.
function asOrdinalType(key, type = "categorical") {
  return registry.get(key) === position ? "point" : type;
}

export function isTemporalScale({type}) {
  return type === "time" || type === "utc";
}

export function isOrdinalScale({type}) {
  return type === "ordinal" || type === "categorical" || type === "point" || type === "band";
}

// TODO use Float64Array.from for position and radius scales?
export function applyScales(channels = [], scales) {
  const values = Object.create(null);
  for (let [name, {value, scale}] of channels) {
    if (name !== undefined) {
      if (scale !== undefined) {
        scale = scales[scale];
        if (scale !== undefined) {
          value = Array.from(value, scale);
        }
      }
      values[name] = value;
    }
  }
  return values;
}

// Certain marks have special behavior if a scale is collapsed, i.e. if the
// domain is degenerate and represents only a single value such as [3, 3]; for
// example, a rect will span the full extent of the chart along a collapsed
// dimension (whereas a dot will simply be drawn in the center).
export function isCollapsed(scale) {
  const domain = scale.domain();
  const value = scale(domain[0]);
  for (let i = 1, n = domain.length; i < n; ++i) {
    if (scale(domain[i]) - value) {
      return false;
    }
  }
  return true;
}

// Mutates channel.value!
function coerceType(channels, options, coerce, type) {
  for (const c of channels) c.value = coerceArray(c.value, coerce, type);
  return {...options, domain: coerceArray(options.domain, coerce, type)};
}

function coerceArray(array, coerce, type = Array) {
  if (array !== undefined) return type.from(array, coerce);
}

// Unlike Mark’s number, here we want to convert null and undefined to NaN,
// since the result will be stored in a Float64Array and we don’t want null to
// be coerced to zero.
function coerceNumber(x) {
  return x == null ? NaN : +x;
}

// When coercing strings to dates, we only want to allow the ISO 8601 format
// since the built-in string parsing of the Date constructor varies across
// browsers. (In the future, this could be made more liberal if desired, though
// it is still generally preferable to do date parsing yourself explicitly,
// rather than rely on Plot.) Any non-string values are coerced to number first
// and treated as milliseconds since UNIX epoch.
function coerceDate(x) {
  return x instanceof Date && !isNaN(x) ? x
    : typeof x === "string" ? isoParse(x)
    : x == null || isNaN(x = +x) ? undefined
    : new Date(x);
}

// prepare scales for exposure through the plot's scales() function
export function exposeScales(scaleDescriptors) {
  return key => {
    if (registry.has(key += ""))
      return key in scaleDescriptors ? exposeScale(scaleDescriptors[key]) : undefined;
    throw new Error(`unknown scale: ${key}`);
  };
}

function exposeScale({scale, ...options}) {
  for (const remove of ["domain", "range", "interpolate", "clamp", "round", "nice", "padding", "inset", "reverse"]) delete options[remove];
  return {
    domain: scale.domain(),
    range: scale.range(),
    ...scale.interpolate && {interpolate: scale.interpolate()},
    ...scale.interpolator && {interpolate: scale.interpolator(), range: undefined},
    ...scale.clamp && {clamp: scale.clamp()},
    ...options
  };
}
