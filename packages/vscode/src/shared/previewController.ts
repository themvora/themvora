/**
 * The dashboard's behaviour, as one self-contained function.
 *
 * The Theme Preview panel must be a single HTML string with no module graph, so
 * this function travels as text: the panel embeds `mountPreview.toString()` and
 * calls it. That rules out every reference to module scope, imports included,
 * so the Catmull-Rom spline, the WCAG maths and the colour resolver are all
 * repeated inside. The Studio imports it normally and calls the same function,
 * which is the point — one implementation, two hosts.
 *
 * The controller knows the markup only through the data attributes
 * `dashboardSurface` writes: `data-kpis`, `data-range`, `data-metric`,
 * `data-chart-*`, `data-token`. It never sniffs a colour to decide what an
 * element is; computed colours are read only to report contrast and, in
 * development, to prove every painted colour came from a token.
 *
 * @packageDocumentation
 */

/**
 * The element surface this controller touches.
 *
 * Declared structurally rather than as `HTMLElement` because the extension host
 * is compiled without the DOM lib; the browser's own elements satisfy it.
 */
export interface PreviewElement {
  readonly tagName: string;
  className: string;
  textContent: string | null;
  hidden: boolean;
  readonly style: { left: string; top: string; background: string };
  readonly classList: {
    add(...tokens: string[]): void;
    remove(...tokens: string[]): void;
    toggle(token: string, force?: boolean): void;
  };
  readonly parentElement: PreviewElement | null;
  readonly offsetWidth: number;
  readonly offsetHeight: number;
  readonly scrollHeight: number;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  closest(selector: string): PreviewElement | null;
  contains(other: PreviewElement | null): boolean;
  querySelector(selector: string): PreviewElement | null;
  querySelectorAll(selector: string): ArrayLike<PreviewElement>;
  appendChild(child: PreviewElement): PreviewElement;
  append(...children: PreviewElement[]): void;
  remove(): void;
  getBoundingClientRect(): {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  };
  addEventListener(
    type: string,
    listener: (event: PreviewEvent) => void,
    capture?: boolean,
  ): void;
  removeEventListener(
    type: string,
    listener: (event: PreviewEvent) => void,
    capture?: boolean,
  ): void;
}

/** The event surface, likewise structural. */
export interface PreviewEvent {
  readonly target: unknown;
  readonly key?: string;
  readonly clientX?: number;
  preventDefault(): void;
  stopPropagation(): void;
}

/** A colour that was not a token, a token with alpha, or a two-token mix. */
export interface PreviewColorProblem {
  readonly element: PreviewElement;
  readonly property: string;
  readonly value: string;
}

/** What a host may configure when mounting a surface. */
export interface PreviewMountOptions {
  /** Called with a camel-case role when an element is clicked while inspecting. */
  readonly onToken?: (role: string) => void;
  /** Start with the inspect overlay on. */
  readonly inspect?: boolean;
  /** Play the staggered entrance on first paint. */
  readonly animate?: boolean;
  /** Log painted colours that do not derive from tokens. */
  readonly dev?: boolean;
}

/** The mounted surface's controls. */
export interface PreviewController {
  /** Arm or disarm hover-to-inspect. */
  setInspect(on: boolean): void;
  /** Select a date range, as the top bar's buttons do. */
  setRange(range: string): void;
  /** Select the chart's metric. */
  setMetric(metric: string): void;
  /** Report painted colours that are not derived from the 21 roles. */
  audit(): PreviewColorProblem[];
  /** Remove every listener and timer this mount added. */
  destroy(): void;
}

type Rgba = readonly [number, number, number, number];

interface PreviewSeries {
  labels: string[];
  revenue: number[];
  revenueLy: number[];
  revenueMax: number;
  orders: number[];
  ordersLy: number[];
  ordersMax: number;
  active: number;
}

interface PreviewKpi {
  value: string;
  delta: string;
  up: boolean;
}

interface PreviewRangeKpis {
  caption: string;
  revenue: PreviewKpi;
  customers: PreviewKpi;
  orders: PreviewKpi;
  avg: PreviewKpi;
}

interface PreviewData {
  series: Record<string, PreviewSeries>;
  kpis: Record<string, PreviewRangeKpis>;
}

interface TokenEntry {
  kind: string;
  base: string;
  percent: number;
  other: string | undefined;
}

interface RgbaCanvas {
  width: number;
  height: number;
  getContext(id: string): {
    fillStyle: string;
    clearRect(x: number, y: number, width: number, height: number): void;
    fillRect(x: number, y: number, width: number, height: number): void;
    getImageData(x: number, y: number, width: number, height: number): {
      data: ArrayLike<number>;
    };
  } | null;
}

/** The globals the controller may use, each optional so a fake DOM is harmless. */
interface PreviewHost {
  readonly document?: { createElement(tag: string): PreviewElement };
  readonly getComputedStyle?: (element: PreviewElement) => {
    color: string;
    getPropertyValue(name: string): string;
  };
  readonly matchMedia?: (query: string) => { matches: boolean };
  readonly setTimeout?: (handler: () => void, milliseconds: number) => number;
  readonly clearTimeout?: (handle: number) => void;
  readonly requestAnimationFrame?: (callback: (time: number) => void) => number;
  readonly cancelAnimationFrame?: (handle: number) => void;
  readonly console?: { warn: (...values: unknown[]) => void };
}

/**
 * Mount the dashboard controller on a preview root.
 *
 * @param root - The `.tvp` element containing the surface.
 * @param options - Inspect callback and first-paint flags.
 * @returns Controls, including an audit for development.
 */
export function mountPreview(
  root: PreviewElement,
  options: PreviewMountOptions = {},
): PreviewController {
  const CHART_W = 600;
  const CHART_BASE = 210;
  const CHART_SPAN = 200;
  const DURATIONS = { morph: 200, enter: 780 } as const;

  const host = globalThis as unknown as PreviewHost;
  const listening: {
    target: PreviewElement;
    type: string;
    handler: (event: PreviewEvent) => void;
    capture: boolean;
  }[] = [];
  const cleanups: (() => void)[] = [];
  let disposed = false;
  let inspecting = options.inspect === true;

  const isElement = (value: unknown): value is PreviewElement =>
    typeof value === "object" &&
    value !== null &&
    typeof (value as { closest?: unknown }).closest === "function";

  const on = (
    target: PreviewElement | null,
    type: string,
    handler: (event: PreviewEvent) => void,
    capture = false,
  ): void => {
    if (target === null) return;
    target.addEventListener(type, handler, capture);
    listening.push({ target, type, handler, capture });
  };

  const find = (selector: string): PreviewElement | null => root.querySelector(selector);
  const all = (selector: string): PreviewElement[] =>
    Array.from(root.querySelectorAll(selector));

  const reduceMotion = (): boolean =>
    host.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

  /* ---------------------------------------------------------------- colour */

  let canvas: RgbaCanvas | null = null;

  /** Resolve any CSS colour to straight sRGB, through the browser's own parser. */
  const toRgb = (value: string): Rgba | null => {
    if (value.length === 0) return null;
    const text = value.trim().toLowerCase();

    // Parse the forms computed styles actually return. A canvas round-trip
    // loses precision at low alpha (premultiplied 8-bit storage), which made a
    // 6%-alpha shadow look like a foreign colour to the audit.
    const hex = /^#([0-9a-f]{3,8})$/u.exec(text);
    if (hex !== null) {
      let digits = hex[1]!;
      if (digits.length === 3 || digits.length === 4) {
        digits = digits
          .split("")
          .map((digit) => digit + digit)
          .join("");
      }
      if (digits.length === 6 || digits.length === 8) {
        const channel = (offset: number): number =>
          Number.parseInt(digits.slice(offset, offset + 2), 16);
        return [
          channel(0),
          channel(2),
          channel(4),
          digits.length === 8 ? channel(6) / 255 : 1,
        ];
      }
    }

    const functional = /^(rgba?|color)\(([^)]*)\)$/u.exec(text);
    if (functional !== null) {
      const kind = functional[1]!;
      let parts = functional[2]!.split(/[\s,/]+/u).filter((part) => part.length > 0);
      if (kind === "color") {
        if (parts[0] !== "srgb") return null;
        parts = parts.slice(1);
        if (parts.length < 3) return null;
        // `color(srgb …)` channels are 0–1, unlike the 0–255 in `rgb()`.
        const alpha =
          parts[3] === undefined
            ? 1
            : parts[3].endsWith("%")
              ? Number.parseFloat(parts[3]) / 100
              : Number.parseFloat(parts[3]);
        return [
          Number.parseFloat(parts[0]!) * 255,
          Number.parseFloat(parts[1]!) * 255,
          Number.parseFloat(parts[2]!) * 255,
          Number.isFinite(alpha) ? alpha : 1,
        ];
      }
      if (parts.length >= 3) {
        const channel = (part: string, max: number): number =>
          part.endsWith("%") ? (Number.parseFloat(part) / 100) * max : Number.parseFloat(part);
        const alpha =
          parts[3] === undefined
            ? 1
            : parts[3].endsWith("%")
              ? Number.parseFloat(parts[3]) / 100
              : Number.parseFloat(parts[3]);
        return [
          channel(parts[0]!, 255),
          channel(parts[1]!, 255),
          channel(parts[2]!, 255),
          Number.isFinite(alpha) ? alpha : 1,
        ];
      }
    }

    if (host.document === undefined) return null;
    if (canvas === null) {
      canvas = host.document.createElement("canvas") as unknown as RgbaCanvas;
      canvas.width = 1;
      canvas.height = 1;
    }
    const context = canvas.getContext("2d");
    if (context === null) return null;
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = "rgba(0, 0, 0, 0)";
    context.fillStyle = value;
    context.fillRect(0, 0, 1, 1);
    const data = context.getImageData(0, 0, 1, 1).data;
    return [data[0] ?? 0, data[1] ?? 0, data[2] ?? 0, (data[3] ?? 0) / 255];
  };

  const over = (top: Rgba, bottom: Rgba): Rgba => {
    const alpha = top[3] + bottom[3] * (1 - top[3]);
    if (alpha === 0) return [0, 0, 0, 0];
    return [
      (top[0] * top[3] + bottom[0] * bottom[3] * (1 - top[3])) / alpha,
      (top[1] * top[3] + bottom[1] * bottom[3] * (1 - top[3])) / alpha,
      (top[2] * top[3] + bottom[2] * bottom[3] * (1 - top[3])) / alpha,
      alpha,
    ];
  };

  const luminance = (rgb: Rgba): number => {
    const channel = (value: number): number => {
      const unit = value / 255;
      return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
  };

  const contrast = (a: Rgba, b: Rgba): number => {
    const first = luminance(a);
    const second = luminance(b);
    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
  };

  const camel = (role: string): string =>
    role.replace(/-([a-z0-9])/g, (_match, letter: string) => letter.toUpperCase());

  const parseTokens = (spec: string): TokenEntry[] => {
    const entries: TokenEntry[] = [];
    for (const part of spec.split(/\s+/)) {
      const colon = part.indexOf(":");
      if (colon < 0) continue;
      const kind = part.slice(0, colon);
      const body = part.slice(colon + 1);
      const slash = body.indexOf("/");
      const plus = body.indexOf("+");
      const base = slash >= 0 ? body.slice(0, slash) : plus >= 0 ? body.slice(0, plus) : body;
      const percent =
        slash < 0 ? 100 : Number.parseFloat(body.slice(slash + 1, plus >= 0 ? plus : undefined));
      const other = plus >= 0 ? body.slice(plus + 1) : undefined;
      if (base.length === 0) continue;
      entries.push({
        kind,
        base,
        percent: Number.isFinite(percent) ? percent : 100,
        other: other === undefined || other.length === 0 ? undefined : other,
      });
    }
    return entries;
  };

  const rootStyle = host.getComputedStyle?.(root) ?? null;

  const roleValue = (role: string): string =>
    rootStyle === null ? "" : rootStyle.getPropertyValue(`--${role}`).trim();

  const roleRgb = (role: string): Rgba | null => toRgb(roleValue(role));

  /** The background a token spec paints, before alpha is folded in. */
  const entryRgb = (entry: TokenEntry): Rgba | null => {
    const base = roleRgb(entry.base);
    if (base === null) return null;
    if (entry.other === undefined || entry.percent >= 100) {
      if (entry.percent >= 100) return base;
      return [base[0], base[1], base[2], base[3] * (entry.percent / 100)];
    }
    const other = roleRgb(entry.other);
    if (other === null) return base;
    const weight = Math.max(0, Math.min(1, entry.percent / 100));
    const alpha = weight * base[3] + (1 - weight) * other[3];
    if (alpha === 0) return [0, 0, 0, 0];
    return [
      (base[0] * weight * base[3] + other[0] * (1 - weight) * other[3]) / alpha,
      (base[1] * weight * base[3] + other[1] * (1 - weight) * other[3]) / alpha,
      (base[2] * weight * base[3] + other[2] * (1 - weight) * other[3]) / alpha,
      alpha,
    ];
  };

  /** The opaque colour actually behind an element's text. */
  const paintedBackground = (element: PreviewElement): Rgba => {
    const rootBackground =
      entryRgb({ kind: "bg", base: "background", percent: 100, other: undefined }) ??
      ([255, 255, 255, 1] as Rgba);
    const layers: Rgba[] = [];
    let node: PreviewElement | null = element;
    while (node !== null) {
      const spec = node.getAttribute("data-token");
      if (spec !== null) {
        const background = parseTokens(spec).find((entry) => entry.kind === "bg");
        if (background !== undefined) {
          const rgb = entryRgb(background);
          if (rgb !== null) {
            layers.push(rgb);
            if (rgb[3] >= 0.999) break;
          }
        }
      }
      node = node === root ? null : node.parentElement;
    }
    let result = rootBackground;
    for (let index = layers.length - 1; index >= 0; index -= 1) {
      const layer = layers[index];
      if (layer !== undefined) result = over(layer, result);
    }
    return result;
  };

  /* ----------------------------------------------------------------- chart */

  const dataNode = find("[data-kpis]");
  let data: PreviewData = { series: {}, kpis: {} };
  if (dataNode !== null) {
    try {
      data = JSON.parse(dataNode.getAttribute("data-kpis") ?? "{}") as PreviewData;
    } catch {
      data = { series: {}, kpis: {} };
    }
  }

  const plot = find(".tvd-plot");
  const line = find("[data-chart-line]");
  const area = find("[data-chart-area]");
  const lastYear = find("[data-chart-ly]");
  const guide = find("[data-chart-guide]");
  const point = find("[data-chart-point]");
  const tip = find("[data-chart-tip]");
  const tipLabel = find("[data-tip-label]");
  const tipValue = find("[data-tip-value]");
  const tipDelta = find("[data-tip-delta]");
  const xAxis = find("[data-chart-x]");
  const yAxis = find("[data-chart-y]");
  const chartTitle = find("[data-chart-title]");
  const chartTotal = find("[data-chart-total]");
  const chartDelta = find("[data-chart-delta]");
  const chartDeltaText = find("[data-chart-delta-text]");

  let activeRange = "30d";
  let metric: "revenue" | "orders" = "revenue";
  let activeIndex = 0;
  let currentPoints: [number, number][] = [];
  let frame = 0;
  let tipVisible = false;

  const spline = (points: readonly (readonly [number, number])[]): string => {
    if (points.length === 0) return "";
    const round = (value: number): number => Math.round(value * 10) / 10;
    let d = `M${round(points[0]?.[0] ?? 0)},${round(points[0]?.[1] ?? 0)}`;
    for (let index = 0; index < points.length - 1; index += 1) {
      const p0 = points[index - 1] ?? points[index] ?? [0, 0];
      const p1 = points[index] ?? [0, 0];
      const p2 = points[index + 1] ?? p1;
      const p3 = points[index + 2] ?? p2;
      d += ` C${round(p1[0] + (p2[0] - p0[0]) / 6)},${round(p1[1] + (p2[1] - p0[1]) / 6)} ${round(p2[0] - (p3[0] - p1[0]) / 6)},${round(p2[1] - (p3[1] - p1[1]) / 6)} ${round(p2[0])},${round(p2[1])}`;
    }
    return d;
  };

  const pointsFor = (values: readonly number[], max: number): [number, number][] => {
    const step = values.length > 1 ? CHART_W / (values.length - 1) : 0;
    return values.map((value, index) => [
      index * step,
      CHART_BASE - (max === 0 ? 0 : value / max) * CHART_SPAN,
    ]);
  };

  const draw = (points: readonly [number, number][]): void => {
    const d = spline(points);
    line?.setAttribute("d", d);
    area?.setAttribute("d", `${d} L${CHART_W},${CHART_BASE} L0,${CHART_BASE} Z`);
    currentPoints = points.map(([x, y]) => [x, y]);
  };

  const axisText = (value: number, kind: "revenue" | "orders"): string => {
    if (kind === "orders") return String(Math.round(value));
    if (value >= 1000) return `$${String(Math.round((value / 1000) * 10) / 10)}k`;
    return `$${String(Math.round(value))}`;
  };

  const money = (value: number, kind: "revenue" | "orders"): string =>
    kind === "orders" ? String(Math.round(value)) : `$${Math.round(value).toLocaleString("en-US")}`;

  const seriesNow = (): PreviewSeries | undefined => data.series[activeRange];

  const valuesNow = (series: PreviewSeries): readonly number[] =>
    metric === "orders" ? series.orders : series.revenue;

  const maxNow = (series: PreviewSeries): number =>
    metric === "orders" ? series.ordersMax : series.revenueMax;

  const placeTip = (index: number, visible: boolean): void => {
    const series = seriesNow();
    const current = currentPoints[index];
    if (series === undefined || current === undefined || guide === null || point === null) return;
    const values = valuesNow(series);
    const last = metric === "orders" ? series.ordersLy : series.revenueLy;
    const percentX = (current[0] / CHART_W) * 100;
    const percentY = (current[1] / 220) * 100;
    guide.hidden = false;
    point.hidden = false;
    guide.style.left = `${percentX}%`;
    point.style.left = `${percentX}%`;
    point.style.top = `${percentY}%`;

    const label = series.labels[index] ?? "";
    const value = values[index] ?? 0;
    if (tipLabel !== null) tipLabel.textContent = label;
    if (tipValue !== null) tipValue.textContent = money(value, metric);
    const previous = last[index] ?? 0;
    const change = previous === 0 ? 0 : ((value - previous) / previous) * 100;
    const sign = change >= 0 ? "+" : "\u2212";
    if (tipDelta !== null) {
      tipDelta.textContent = `${sign}${Math.abs(change).toFixed(1)}% vs last year`;
    }
    if (tip !== null) {
      tip.hidden = !visible;
      tip.classList.toggle("is-start", index === 0 || percentX < 10);
      tip.classList.toggle("is-end", index === values.length - 1 || percentX > 90);
      tip.classList.toggle("is-below", percentY < 38);
      tip.style.left = `${percentX}%`;
      tip.style.top = `${percentY}%`;
    }
    if (plot !== null) {
      plot.setAttribute(
        "aria-label",
        `${metric === "orders" ? "Orders" : "Revenue"}, ${label}: ${money(value, metric)}. Use the arrow keys to read another point.`,
      );
    }
    tipVisible = visible;
  };

  const setActive = (index: number, visible: boolean): void => {
    const series = seriesNow();
    if (series === undefined || currentPoints.length === 0) return;
    activeIndex = Math.max(0, Math.min(currentPoints.length - 1, index));
    placeTip(activeIndex, visible);
  };

  const animateTo = (
    next: [number, number][],
    series: PreviewSeries,
    instant: boolean,
  ): void => {
    if (frame !== 0) {
      host.cancelAnimationFrame?.(frame);
      frame = 0;
    }
    if (
      instant ||
      reduceMotion() ||
      currentPoints.length !== next.length ||
      host.requestAnimationFrame === undefined
    ) {
      draw(next);
      setActive(series.active, false);
      return;
    }
    const from = currentPoints.map(([x, y]) => [x, y] as [number, number]);
    let started = 0;
    const step = (now: number): void => {
      if (disposed) return;
      if (started === 0) started = now;
      const progress = Math.min(1, (now - started) / DURATIONS.morph);
      const eased = 1 - (1 - progress) ** 3;
      const blended: [number, number][] = next.map((target, index) => {
        const origin = from[index] ?? target;
        return [origin[0] + (target[0] - origin[0]) * eased, origin[1] + (target[1] - origin[1]) * eased];
      });
      draw(blended);
      if (progress < 1) {
        frame = host.requestAnimationFrame?.(step) ?? 0;
      } else {
        frame = 0;
        draw(next);
        setActive(series.active, tipVisible);
      }
    };
    frame = host.requestAnimationFrame?.(step) ?? 0;
  };

  const paintSeries = (series: PreviewSeries, instant: boolean): void => {
    const values = valuesNow(series);
    const max = maxNow(series);
    const ly = metric === "orders" ? series.ordersLy : series.revenueLy;
    lastYear?.setAttribute("d", spline(pointsFor(ly, max)));
    animateTo(pointsFor(values, max), series, instant);
  };

  const paintAxis = (series: PreviewSeries): void => {
    if (yAxis !== null) {
      for (const step of [4, 3, 2, 1, 0]) {
        const label = yAxis.querySelector(`.tvd-y${String(step)}`);
        if (label !== null) {
          label.textContent = axisText((maxNow(series) / 4) * step, metric);
        }
      }
    }
    if (xAxis !== null && host.document !== undefined) {
      xAxis.textContent = "";
      for (const label of series.labels) {
        const span = host.document.createElement("span");
        span.textContent = label;
        xAxis.appendChild(span);
      }
    }
  };

  const paintKpis = (): void => {
    const kpis = data.kpis[activeRange];
    if (kpis === undefined) return;
    for (const card of all("[data-kpi]")) {
      const key = card.getAttribute("data-kpi") as "revenue" | "customers" | "orders" | "avg" | null;
      if (key === null) continue;
      const figure = kpis[key];
      if (figure === undefined) continue;
      const value = card.querySelector("[data-kpi-value]");
      const delta = card.querySelector("[data-kpi-delta]");
      const deltaText = card.querySelector("[data-kpi-delta-text]");
      const caption = card.querySelector("[data-kpi-caption]");
      if (value !== null) value.textContent = figure.value;
      if (deltaText !== null) deltaText.textContent = figure.delta;
      if (caption !== null) caption.textContent = kpis.caption;
      if (delta !== null) {
        delta.classList.toggle("is-up", figure.up);
        delta.classList.toggle("is-down", !figure.up);
        const featured = delta.getAttribute("data-token")?.startsWith("bg:primary-foreground") === true;
        if (!featured) {
          delta.setAttribute(
            "data-token",
            `fg:card-foreground ic:${figure.up ? "success" : "destructive"}`,
          );
        }
      }
    }
  };

  const paintHeader = (): void => {
    const kpis = data.kpis[activeRange];
    if (kpis === undefined) return;
    const figure = kpis[metric];
    if (chartTitle !== null) chartTitle.textContent = metric === "orders" ? "Orders" : "Revenue";
    if (chartTotal !== null) chartTotal.textContent = figure.value;
    if (chartDeltaText !== null) chartDeltaText.textContent = figure.delta;
    if (chartDelta !== null) {
      chartDelta.classList.toggle("is-up", figure.up);
      chartDelta.classList.toggle("is-down", !figure.up);
      chartDelta.setAttribute(
        "data-token",
        `fg:card-foreground ic:${figure.up ? "success" : "destructive"}`,
      );
    }
  };

  const paintRange = (range: string, instant: boolean): void => {
    const series = data.series[range];
    if (series === undefined) return;
    activeRange = range;
    for (const button of all("[data-range]")) {
      const pressed = button.getAttribute("data-range") === range;
      button.setAttribute("aria-pressed", pressed ? "true" : "false");
      if (pressed) button.setAttribute("data-token", "bg:card fg:card-foreground");
      else button.removeAttribute("data-token");
    }
    paintKpis();
    paintHeader();
    paintAxis(series);
    paintSeries(series, instant);
  };

  const paintMetric = (next: "revenue" | "orders"): void => {
    const series = seriesNow();
    if (series === undefined || next === metric) return;
    metric = next;
    for (const button of all("[data-metric]")) {
      const pressed = button.getAttribute("data-metric") === metric;
      button.setAttribute("aria-pressed", pressed ? "true" : "false");
      if (pressed) button.setAttribute("data-token", "bg:card fg:card-foreground");
      else button.removeAttribute("data-token");
    }
    paintHeader();
    paintAxis(series);
    paintSeries(series, false);
  };

  if (data.series["30d"] !== undefined && plot !== null) {
    const initial = data.series["30d"];
    if (initial !== undefined) {
      activeIndex = initial.active;
      paintRange("30d", true);
      for (const button of all("[data-metric]")) {
        if (button.getAttribute("data-metric") === metric) {
          button.setAttribute("data-token", "bg:card fg:card-foreground");
        }
      }
    }
  }

  /* -------------------------------------------------------------- controls */

  on(root, "click", (event) => {
    const target = event.target;
    if (!isElement(target)) return;
    const range = target.closest("[data-range]");
    if (range !== null) {
      const value = range.getAttribute("data-range");
      if (value !== null) paintRange(value, false);
      return;
    }
    const metricButton = target.closest("[data-metric]");
    if (metricButton !== null) {
      const value = metricButton.getAttribute("data-metric");
      if (value === "revenue" || value === "orders") paintMetric(value);
      return;
    }
    const nav = target.closest("[data-nav]");
    if (nav !== null) {
      for (const item of all("[data-nav]")) {
        const current = item === nav;
        if (current) item.setAttribute("aria-current", "page");
        else item.removeAttribute("aria-current");
        item.setAttribute(
          "data-token",
          current
            ? "bg:primary/12+card fg:card-foreground ic:primary"
            : "bg:card fg:muted-foreground",
        );
      }
    }
  });

  on(plot, "pointermove", (event) => {
    if (plot === null || currentPoints.length === 0) return;
    const rect = plot.getBoundingClientRect();
    if (rect.width === 0) return;
    const fraction = Math.max(0, Math.min(1, ((event.clientX ?? 0) - rect.left) / rect.width));
    setActive(Math.round(fraction * (currentPoints.length - 1)), true);
  });

  on(plot, "pointerleave", () => {
    setActive(activeIndex, false);
  });

  on(plot, "focus", () => {
    setActive(activeIndex, true);
  });

  on(plot, "blur", () => {
    setActive(activeIndex, false);
  });

  on(plot, "keydown", (event) => {
    const key = event.key;
    const series = seriesNow();
    if (series === undefined) return;
    let next: number | undefined;
    if (key === "ArrowRight") next = activeIndex + 1;
    else if (key === "ArrowLeft") next = activeIndex - 1;
    else if (key === "Home") next = 0;
    else if (key === "End") next = series.labels.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    setActive(next, true);
  });

  /* --------------------------------------------------------------- inspect */

  let inspectTarget: PreviewElement | null = null;
  let popover: PreviewElement | null = null;

  const ensurePopover = (): PreviewElement | null => {
    if (popover !== null) return popover;
    if (host.document === undefined || typeof root.appendChild !== "function") return null;
    popover = host.document.createElement("div");
    popover.className = "tvp-pop";
    popover.hidden = true;
    root.appendChild(popover);
    return popover;
  };

  const buildPopover = (element: PreviewElement): void => {
    const surface = ensurePopover();
    if (surface === null || host.document === undefined) return;
    surface.textContent = "";
    const entries = parseTokens(element.getAttribute("data-token") ?? "");
    const roles: string[] = [];
    for (const entry of entries) {
      if (!roles.includes(entry.base)) roles.push(entry.base);
      if (entry.other !== undefined && !roles.includes(entry.other)) roles.push(entry.other);
    }

    const title = host.document.createElement("span");
    title.className = "tvp-pop-title";
    title.textContent = roles.length === 1 ? "1 token" : `${String(roles.length)} tokens`;
    surface.appendChild(title);

    for (const role of roles) {
      const row = host.document.createElement("span");
      row.className = "tvp-pop-row";
      const chip = host.document.createElement("span");
      chip.className = "tvp-pop-chip";
      chip.style.background = `var(--${role})`;
      const name = host.document.createElement("span");
      name.textContent = role;
      const value = host.document.createElement("span");
      value.textContent = roleValue(role) || "missing";
      row.append(chip, name, value);
      surface.appendChild(row);
    }

    const foreground = toRgb(host.getComputedStyle?.(element)?.color ?? "");
    const background = paintedBackground(element);
    const foot = host.document.createElement("span");
    foot.className = "tvp-pop-foot";
    if (foreground !== null) {
      const ratio = contrast(over(foreground, background), background);
      const dot = host.document.createElement("span");
      dot.className = `tvp-pop-dot ${ratio >= 4.5 ? "is-pass" : "is-fail"}`;
      const text = host.document.createElement("span");
      text.textContent = `${ratio.toFixed(1)}:1 ${ratio >= 4.5 ? "AA" : "below AA"}`;
      foot.append(dot, text);
    } else {
      foot.textContent = "Contrast unavailable";
    }
    surface.appendChild(foot);
  };

  const placePopover = (element: PreviewElement): void => {
    const surface = popover;
    if (surface === null) return;
    surface.hidden = false;
    const rootRect = root.getBoundingClientRect();
    const targetRect = element.getBoundingClientRect();
    const width = surface.offsetWidth;
    const height = surface.offsetHeight;
    let left = targetRect.left - rootRect.left;
    left = Math.max(8, Math.min(left, rootRect.width - width - 8));
    let top = targetRect.bottom - rootRect.top + 8;
    if (top + height > root.scrollHeight - 8) {
      top = Math.max(8, targetRect.top - rootRect.top - height - 8);
    }
    surface.style.left = `${left}px`;
    surface.style.top = `${top}px`;
  };

  const hideInspect = (): void => {
    if (inspectTarget !== null) inspectTarget.classList.remove("tvp-inspect-target");
    inspectTarget = null;
    if (popover !== null) popover.hidden = true;
  };

  const showInspect = (element: PreviewElement): void => {
    if (inspectTarget === element) {
      placePopover(element);
      return;
    }
    hideInspect();
    inspectTarget = element;
    element.classList.add("tvp-inspect-target");
    buildPopover(element);
    placePopover(element);
  };

  on(root, "pointerover", (event) => {
    if (!inspecting) return;
    const target = event.target;
    if (!isElement(target)) return;
    const element = target.closest("[data-token]");
    if (element === null || !root.contains(element)) return;
    showInspect(element);
  });

  on(root, "pointerleave", () => {
    if (!inspecting) return;
    hideInspect();
  });

  on(
    root,
    "click",
    (event) => {
      if (!inspecting) return;
      const target = event.target;
      if (!isElement(target)) return;
      const element = target.closest("[data-token]");
      if (element === null || !root.contains(element)) return;
      const entries = parseTokens(element.getAttribute("data-token") ?? "");
      const entry =
        entries.find((candidate) => candidate.kind === "bg") ??
        entries.find((candidate) => candidate.kind === "fg") ??
        entries[0];
      event.preventDefault();
      event.stopPropagation();
      if (entry !== undefined && options.onToken !== undefined) options.onToken(camel(entry.base));
    },
    true,
  );

  /* --------------------------------------------------------------- the audit */

  const audit = (): PreviewColorProblem[] => {
    const problems: PreviewColorProblem[] = [];
    if (rootStyle === null || host.getComputedStyle === undefined) return problems;
    const roles = [
      "background", "foreground", "muted", "muted-foreground", "card", "card-foreground",
      "popover", "popover-foreground", "primary", "primary-foreground", "secondary",
      "secondary-foreground", "accent", "accent-foreground", "destructive",
      "destructive-foreground", "success", "success-foreground", "border", "input", "ring",
    ];
    const tokens = new Map<string, string>();
    const resolved: { role: string; rgb: Rgba }[] = [];
    for (const role of roles) {
      const raw = roleValue(role);
      if (raw.length === 0 || raw === "initial") {
        problems.push({ element: root, property: `--${role}`, value: raw || "missing" });
        continue;
      }
      const rgb = toRgb(raw);
      if (rgb === null) {
        problems.push({ element: root, property: `--${role}`, value: raw });
        continue;
      }
      resolved.push({ role, rgb });
      tokens.set(`${String(Math.round(rgb[0]))},${String(Math.round(rgb[1]))},${String(Math.round(rgb[2]))}`, role);
    }

    const keyOf = (rgb: Rgba): string =>
      `${String(Math.round(rgb[0]))},${String(Math.round(rgb[1]))},${String(Math.round(rgb[2]))}`;

    // A computed colour is legitimate when it is a token (opaque or with alpha)
    // or an sRGB mix of two tokens at a whole percentage. Browser rounding makes
    // exact equality fragile, so a channel may be off by up to three.
    const cache = new Map<string, boolean>();
    const derived = (rgb: Rgba): boolean => {
      const key = keyOf(rgb);
      const cached = cache.get(key);
      if (cached !== undefined) return cached;
      let known = tokens.has(key);
      if (!known) {
        const red = Math.round(rgb[0]);
        const green = Math.round(rgb[1]);
        const blue = Math.round(rgb[2]);
        for (const first of resolved) {
          if (known) break;
          for (const second of resolved) {
            if (known) break;
            for (let percent = 1; percent < 100; percent += 1) {
              const weight = percent / 100;
              if (
                Math.abs(first.rgb[0] * weight + second.rgb[0] * (1 - weight) - red) <= 3 &&
                Math.abs(first.rgb[1] * weight + second.rgb[1] * (1 - weight) - green) <= 3 &&
                Math.abs(first.rgb[2] * weight + second.rgb[2] * (1 - weight) - blue) <= 3
              ) {
                known = true;
                break;
              }
            }
          }
        }
      }
      cache.set(key, known);
      return known;
    };

    const colorPattern =
      /rgba?\([^)]*\)|color\([^)]*\)|(?:oklch|oklab|lab|lch|hsla?)\([^)]*\)|#[0-9a-f]{3,8}/gi;
    const explain = (value: string): string | null => {
      const found = value.match(colorPattern);
      if (found === null) return null;
      for (const color of found) {
        const rgb = toRgb(color);
        if (rgb === null || rgb[3] === 0) continue;
        if (!derived(rgb)) return color;
      }
      return null;
    };

    const shapes = new Set(["path", "circle", "rect", "polygon", "ellipse"]);
    const baseProperties = [
      "color", "backgroundColor", "borderTopColor", "borderRightColor", "borderBottomColor",
      "borderLeftColor", "outlineColor", "textDecorationColor", "caretColor", "boxShadow",
    ];

    const nodes: PreviewElement[] = [root, ...all("*")];
    for (const node of nodes) {
      const style = host.getComputedStyle(node);
      const tag = node.tagName.toLowerCase();
      const properties =
        tag === "stop"
          ? [...baseProperties, "stopColor"]
          : shapes.has(tag)
            ? [...baseProperties, "fill", "stroke"]
            : baseProperties;
      for (const property of properties) {
        const value = style.getPropertyValue(
          property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`),
        );
        if (value.length === 0 || value === "none" || value === "auto" || value.startsWith("url(")) {
          continue;
        }
        const unknown = explain(value);
        if (unknown !== null) problems.push({ element: node, property, value: unknown });
      }
    }

    if (problems.length > 0) {
      host.console?.warn(
        `[Themvora] ${String(problems.length)} painted colour${problems.length === 1 ? "" : "s"} in the preview do not derive from the theme's 21 tokens.`,
        problems.slice(0, 20),
      );
    }
    return problems;
  };

  /* ------------------------------------------------------------- lifecycle */

  if (options.animate !== false && plot !== null && !reduceMotion()) {
    root.classList.add("tvp-enter");
    const timer =
      host.setTimeout?.(() => root.classList.remove("tvp-enter"), DURATIONS.enter) ?? 0;
    cleanups.push(() => {
      host.clearTimeout?.(timer);
      root.classList.remove("tvp-enter");
    });
  }

  const setInspect = (enabled: boolean): void => {
    inspecting = enabled;
    root.classList.toggle("tvp-inspecting", enabled);
    if (!enabled) hideInspect();
  };

  setInspect(inspecting);

  if (options.dev === true) {
    const timer =
      host.setTimeout?.(() => {
        audit();
      }, 800) ?? 0;
    cleanups.push(() => host.clearTimeout?.(timer));
  }

  return {
    setInspect,
    setRange(range: string): void {
      paintRange(range, false);
    },
    setMetric(next: string): void {
      if (next === "revenue" || next === "orders") paintMetric(next);
    },
    audit,
    destroy(): void {
      disposed = true;
      if (frame !== 0) host.cancelAnimationFrame?.(frame);
      for (const listener of listening) {
        listener.target.removeEventListener(listener.type, listener.handler, listener.capture);
      }
      listening.length = 0;
      for (const cleanup of cleanups) cleanup();
      cleanups.length = 0;
      hideInspect();
      popover?.remove();
      popover = null;
      root.classList.remove("tvp-enter", "tvp-inspecting");
    },
  };
}
