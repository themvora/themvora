/**
 * The Dashboard preview: a complete analytics app painted from a theme's 21
 * tokens. It renders in the Studio's Dashboard view, the Theme Preview panel
 * and the New-theme live preview, from this one module.
 *
 * Every element that paints a token says so through `data-token`
 * (`bg:card fg:card-foreground bd:border`), which is what the inspect overlay
 * reads. Nothing samples computed colours to find out.
 *
 * The data is fixed and illustrative. The chart's series travel to the
 * controller as a JSON attribute, so markup and behaviour cannot disagree.
 *
 * @packageDocumentation
 */
import { escapeHtml, previewIcon, previewMark } from "./previewTokens.js";

/** The ranges the top bar offers. */
export type DashboardRange = "7d" | "30d" | "90d";

interface RangeSeries {
  readonly labels: readonly string[];
  readonly revenue: readonly number[];
  readonly revenueLy: readonly number[];
  readonly revenueMax: number;
  readonly orders: readonly number[];
  readonly ordersLy: readonly number[];
  readonly ordersMax: number;
  readonly active: number;
}

interface Kpi {
  readonly value: string;
  readonly delta: string;
  readonly up: boolean;
}

interface RangeKpis {
  readonly caption: string;
  readonly revenue: Kpi;
  readonly customers: Kpi;
  readonly orders: Kpi;
  readonly avg: Kpi;
}

/** The chart data per range. */
export const DASHBOARD_SERIES: Readonly<Record<DashboardRange, RangeSeries>> = {
  "7d": {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    revenue: [1320, 1580, 1470, 1710, 1620, 1890, 1830],
    revenueLy: [1200, 1300, 1350, 1420, 1500, 1550, 1600],
    revenueMax: 2000,
    orders: [28, 33, 31, 36, 34, 40, 39],
    ordersLy: [25, 27, 29, 30, 31, 33, 34],
    ordersMax: 50,
    active: 5,
  },
  "30d": {
    labels: ["Oct 1", "Oct 4", "Oct 7", "Oct 10", "Oct 13", "Oct 16", "Oct 19", "Oct 22", "Oct 25", "Oct 28"],
    revenue: [3240, 3910, 3580, 4820, 4410, 5630, 5120, 6300, 5940, 6640],
    revenueLy: [2810, 3120, 3390, 3610, 3920, 4130, 4290, 4610, 4830, 5020],
    revenueMax: 8000,
    orders: [68, 82, 75, 101, 94, 118, 106, 131, 122, 127],
    ordersLy: [60, 64, 70, 73, 79, 83, 88, 92, 95, 99],
    ordersMax: 160,
    active: 7,
  },
  "90d": {
    labels: ["Aug 4", "Aug 11", "Aug 18", "Aug 25", "Sep 1", "Sep 8", "Sep 15", "Sep 22", "Sep 29", "Oct 6", "Oct 13", "Oct 20"],
    revenue: [8600, 9400, 9100, 10300, 10800, 11200, 10600, 12100, 12600, 13400, 12900, 14200],
    revenueLy: [7900, 8200, 8500, 8700, 9000, 9200, 9500, 9800, 10000, 10300, 10600, 10900],
    revenueMax: 16000,
    orders: [182, 197, 191, 214, 226, 233, 221, 251, 262, 279, 268, 296],
    ordersLy: [165, 171, 176, 181, 187, 192, 198, 204, 209, 215, 220, 226],
    ordersMax: 320,
    active: 9,
  },
};

/** The KPI figures per range. */
export const DASHBOARD_KPIS: Readonly<Record<DashboardRange, RangeKpis>> = {
  "7d": {
    caption: "vs previous 7 days",
    revenue: { value: "$11,420", delta: "+4.1%", up: true },
    customers: { value: "652", delta: "+2.3%", up: true },
    orders: { value: "241", delta: "+6.8%", up: true },
    avg: { value: "$47.39", delta: "−0.6%", up: false },
  },
  "30d": {
    caption: "vs previous 30 days",
    revenue: { value: "$48,290", delta: "+12.5%", up: true },
    customers: { value: "2,847", delta: "+8.2%", up: true },
    orders: { value: "1,024", delta: "+23.1%", up: true },
    avg: { value: "$47.20", delta: "−2.4%", up: false },
  },
  "90d": {
    caption: "vs previous 90 days",
    revenue: { value: "$139,870", delta: "+18.9%", up: true },
    customers: { value: "7,912", delta: "+14.6%", up: true },
    orders: { value: "2,968", delta: "+27.4%", up: true },
    avg: { value: "$47.12", delta: "−3.1%", up: false },
  },
};

/** The chart's drawing box, in SVG units. */
const CHART_W = 600;
const CHART_BASE = 210;
const CHART_SPAN = 200;

/**
 * A smooth path through points (uniform Catmull-Rom as cubic Béziers).
 *
 * @param points - x/y pairs.
 * @returns An SVG path.
 */
export function catmullRomPath(points: readonly (readonly [number, number])[]): string {
  if (points.length === 0) return "";
  const r = (value: number): number => Math.round(value * 10) / 10;
  let d = `M${r(points[0]![0])},${r(points[0]![1])}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] ?? points[index]!;
    const p1 = points[index]!;
    const p2 = points[index + 1]!;
    const p3 = points[index + 2] ?? p2;
    d += ` C${r(p1[0] + (p2[0] - p0[0]) / 6)},${r(p1[1] + (p2[1] - p0[1]) / 6)} ${r(p2[0] - (p3[0] - p1[0]) / 6)},${r(p2[1] - (p3[1] - p1[1]) / 6)} ${r(p2[0])},${r(p2[1])}`;
  }
  return d;
}

/** Chart coordinates for a series. */
function chartPoints(values: readonly number[], max: number): [number, number][] {
  const step = values.length > 1 ? CHART_W / (values.length - 1) : 0;
  return values.map((value, index) => [index * step, CHART_BASE - (value / max) * CHART_SPAN]);
}

/** A y-axis label. */
function axisLabel(value: number, metric: "revenue" | "orders"): string {
  if (metric === "orders") return String(value);
  if (value >= 1000) return `$${String(Math.round((value / 1000) * 10) / 10)}k`;
  return `$${String(value)}`;
}

/** A small sparkline: a line plus a soft area. */
function sparkline(values: readonly number[], tone: string): string {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const points = values.map(
    (value, index): [number, number] => [
      (index / (values.length - 1)) * 100,
      28 - ((value - min) / (max - min || 1)) * 24,
    ],
  );
  const line = catmullRomPath(points);
  return `<svg class="tvd-spark tvd-spark-${tone}" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="tvd-spark-area" d="${line} L100,32 L0,32 Z"/><path class="tvd-spark-line" d="${line}" vector-effect="non-scaling-stroke"/></svg>`;
}

/** A `data-token` attribute. */
function tok(spec: string): string {
  return ` data-token="${spec}"`;
}

/** Options for the dashboard markup. */
export interface DashboardMarkupOptions {
  /** Makes SVG ids unique when several dashboards share a document. */
  readonly idPrefix: string;
  /** Emit element ids the panel addresses (`surface-dashboard`). */
  readonly ids?: boolean;
}

/**
 * Render the dashboard.
 *
 * @param options - Id prefix and density.
 * @returns The markup of one `.tvd` element, to be placed inside a `.tvp` root.
 */
export function dashboardMarkup(options: DashboardMarkupOptions): string {
  const prefix = options.idPrefix.replace(/[^a-zA-Z0-9_-]/g, "");
  const gradient = `${prefix}-area`;
  const range: DashboardRange = "30d";
  const series = DASHBOARD_SERIES[range];
  const kpis = DASHBOARD_KPIS[range];
  const line = catmullRomPath(chartPoints(series.revenue, series.revenueMax));
  const lastYear = catmullRomPath(chartPoints(series.revenueLy, series.revenueMax));
  const data = escapeHtml(JSON.stringify({ series: DASHBOARD_SERIES, kpis: DASHBOARD_KPIS }));

  const navItem = (icon: string, label: string, current = false, count?: string): string =>
    `<button type="button" class="tvd-nav-item" data-nav${current ? ' aria-current="page"' : ""}${tok(current ? "bg:primary/12+card fg:card-foreground ic:primary" : "bg:card fg:muted-foreground")} title="${label}">${previewIcon(icon)}<span class="tvd-label">${label}</span>${count === undefined ? "" : `<span class="tvd-count"${tok("bg:muted fg:muted-foreground")}>${count}</span>`}</button>`;

  const kpi = (
    key: "revenue" | "customers" | "orders" | "avg",
    label: string,
    icon: string,
    spark: readonly number[],
    tone: string,
    featured = false,
  ): string => {
    const figure = kpis[key];
    return `<article class="tvd-kpi${featured ? " is-featured" : ""}" data-kpi="${key}" data-preview-region="stat"${tok(featured ? "bg:primary fg:primary-foreground" : "bg:card fg:card-foreground bd:border")}>
        <div class="tvd-kpi-head">
          <span class="tvd-kpi-label"${featured ? "" : tok("bg:card fg:muted-foreground")}>${label}</span>
          <span class="tvd-kpi-icon"${tok(featured ? "bg:primary-foreground/14+primary fg:primary-foreground" : "bg:muted fg:muted-foreground")}>${previewIcon(icon)}</span>
        </div>
        <p class="tvd-kpi-value" data-kpi-value>${figure.value}</p>
        <div class="tvd-kpi-foot">
          <span class="tvd-delta${figure.up ? " is-up" : " is-down"}" data-kpi-delta${tok(featured ? "bg:primary-foreground/14+primary fg:primary-foreground" : `fg:card-foreground ic:${figure.up ? "success" : "destructive"}`)}>${previewIcon("up", "tvp-icon tvd-arrow-up")}${previewIcon("down", "tvp-icon tvd-arrow-down")}<span data-kpi-delta-text>${figure.delta}</span></span>
          <span class="tvd-kpi-caption" data-kpi-caption>${kpis.caption}</span>
        </div>
        ${sparkline(spark, tone)}
      </article>`;
  };

  const yLabels = [4, 3, 2, 1, 0]
    .map((step) => `<span class="tvd-y${String(step)}">${axisLabel((series.revenueMax / 4) * step, "revenue")}</span>`)
    .join("");
  const xLabels = series.labels.map((label) => `<span>${label}</span>`).join("");
  const grid = [10, 60, 110, 160, 210]
    .map((y) => `<line class="tvd-grid" x1="0" x2="${CHART_W}" y1="${y}" y2="${y}" vector-effect="non-scaling-stroke"/>`)
    .join("");

  const order = (
    id: string,
    initials: string,
    name: string,
    email: string,
    date: string,
    status: "Paid" | "Pending" | "Failed",
    amount: string,
  ): string => {
    const tone = status === "Paid" ? "success" : status === "Pending" ? "secondary" : "destructive";
    return `<tr${tok("bg:card fg:card-foreground bd:border")}>
          <td class="tvd-order-id">${id}</td>
          <td><span class="tvd-who"><span class="tvd-initials"${tok("bg:secondary fg:secondary-foreground")}>${initials}</span><span class="tvd-who-text"><strong>${name}</strong><span class="tvd-who-mail">${email}</span></span></span></td>
          <td class="tvd-date">${date}</td>
          <td><span class="tvd-status is-${tone}"${tok(`bg:${tone} fg:${tone}-foreground`)}${status === "Failed" ? ' data-preview-region="destructive"' : ""}>${status}</span></td>
          <td class="tvd-amount">${amount}</td>
        </tr>`;
  };

  const activity = (tone: string, text: string, time: string): string =>
    `<li><span class="tvd-feed-dot is-${tone}"${tok(`bg:${tone}`)}></span><span class="tvd-feed-text">${text}</span><span class="tvd-feed-time">${time}</span></li>`;

  return `<div class="tvd"${options.ids === true ? ' id="surface-dashboard"' : ""} data-preview-region="canvas"${tok("bg:background fg:foreground")}>
  <aside class="tvd-side" data-preview-region="sidebar"${tok("bg:card fg:card-foreground bd:border")}>
    <div class="tvd-brand">
      <span class="tvd-logo"${tok("bg:primary fg:primary-foreground")}>${previewMark("tvd-logo-mark")}</span>
      <span class="tvd-brand-name tvp-brand-name">Themvora</span>
    </div>
    <p class="tvd-overline"${tok("bg:card fg:muted-foreground")}>Main</p>
    <nav class="tvd-nav" aria-label="Main">
      ${navItem("overview", "Overview", true)}
      ${navItem("analytics", "Analytics")}
      ${navItem("orders", "Orders", false, "12")}
      ${navItem("customers", "Customers")}
      ${navItem("products", "Products")}
    </nav>
    <p class="tvd-overline"${tok("bg:card fg:muted-foreground")}>Workspace</p>
    <nav class="tvd-nav" aria-label="Workspace">
      ${navItem("reports", "Reports")}
      ${navItem("settings", "Settings")}
      ${navItem("help", "Help")}
    </nav>
    <div class="tvd-plan"${tok("bg:muted fg:foreground")}>
      <div class="tvd-plan-head"><strong>Pro plan</strong><span class="tvd-plan-meta"${tok("bg:muted fg:muted-foreground")}>72%</span></div>
      <p class="tvd-plan-sub"${tok("bg:muted fg:muted-foreground")}>7.2 GB of 10 GB used</p>
      <div class="tvd-progress"${tok("bg:card")}><span class="tvd-progress-bar"${tok("bg:primary")}></span></div>
      <button type="button" class="tvd-btn tvd-btn-primary tvd-btn-block"${tok("bg:primary fg:primary-foreground")}>Upgrade</button>
    </div>
  </aside>

  <div class="tvd-main">
    <header class="tvd-top" data-preview-region="topbar"${tok("bg:background fg:foreground bd:border")}>
      <label class="tvd-search" data-preview-region="search"${tok("bg:card fg:card-foreground bd:input")}>
        ${previewIcon("search")}
        <input type="search" class="tvp-search" placeholder="Search orders, customers…" aria-label="Search" />
        <kbd class="tvd-kbd"${tok("bg:muted fg:muted-foreground bd:border")}>⌘K</kbd>
      </label>
      <div class="tvd-top-actions">
        <div class="tvd-seg" role="group" aria-label="Date range"${tok("bg:muted fg:muted-foreground")}>
          <button type="button" data-range="7d" aria-pressed="false">7d</button>
          <button type="button" data-range="30d" aria-pressed="true"${tok("bg:card fg:card-foreground")}>30d</button>
          <button type="button" data-range="90d" aria-pressed="false">90d</button>
        </div>
        <button type="button" class="tvd-icon-btn" aria-label="Notifications"${tok("bg:card fg:card-foreground bd:border")}>${previewIcon("bell")}<span class="tvd-bell-dot"${tok("bg:destructive bd:card")}></span></button>
        <button type="button" class="tvd-btn tvd-btn-primary tvd-btn-new" data-preview-region="primary-action"${tok("bg:primary fg:primary-foreground")}>${previewIcon("plus")}<span class="tvd-label">New report</span></button>
        <span class="tvd-avatar"${tok("bg:accent fg:accent-foreground")}>AM</span>
      </div>
    </header>

    <div class="tvd-content">
      <section class="tvd-greet" data-preview-region="hero">
        <div>
          <h1 class="tvd-h1"${tok("bg:background fg:foreground")}>Good morning, Alex</h1>
          <p class="tvd-sub"${tok("bg:background fg:muted-foreground")}>Here’s what’s happening with your store today.</p>
        </div>
        <div class="tvd-greet-actions" data-preview-region="secondary-action">
          <button type="button" class="tvd-btn tvd-btn-outline"${tok("bg:card fg:card-foreground bd:border")}>${previewIcon("download")}Export</button>
          <button type="button" class="tvd-btn tvd-btn-secondary"${tok("bg:secondary fg:secondary-foreground")}>${previewIcon("share")}Share</button>
        </div>
      </section>

      <section class="tvd-kpis" data-kpis="${data}">
        ${kpi("revenue", "Revenue", "dollar", [12, 14, 13, 17, 16, 19, 18, 22], "featured", true)}
        ${kpi("customers", "Customers", "customers", [20, 21, 23, 22, 25, 24, 27, 28], "accent")}
        ${kpi("orders", "Orders", "receipt", [8, 10, 9, 13, 12, 15, 17, 19], "success")}
        ${kpi("avg", "Avg. order", "orders", [30, 29, 31, 28, 27, 28, 26, 25], "destructive")}
      </section>

      <div class="tvd-row">
        <section class="tvd-card tvd-chart-card" data-preview-region="revenue-card"${tok("bg:card fg:card-foreground bd:border")}>
          <div class="tvd-card-head">
            <div>
              <h2 class="tvd-h2" data-chart-title>Revenue</h2>
              <p class="tvd-chart-total"><strong data-chart-total>${kpis.revenue.value}</strong><span class="tvd-delta is-up" data-chart-delta${tok("fg:card-foreground ic:success")}>${previewIcon("up", "tvp-icon tvd-arrow-up")}${previewIcon("down", "tvp-icon tvd-arrow-down")}<span data-chart-delta-text>${kpis.revenue.delta}</span></span></p>
            </div>
            <div class="tvd-card-tools">
              <span class="tvd-legend"><span class="tvd-legend-line"${tok("bg:primary")}></span>This period</span>
              <span class="tvd-legend"><span class="tvd-legend-line is-dashed"${tok("bd:muted-foreground")}></span>Last year</span>
              <div class="tvd-seg tvd-seg-sm" role="group" aria-label="Metric"${tok("bg:muted fg:muted-foreground")}>
                <button type="button" data-metric="revenue" aria-pressed="true">Revenue</button>
                <button type="button" data-metric="orders" aria-pressed="false">Orders</button>
              </div>
            </div>
          </div>
          <div class="tvd-chart">
            <div class="tvd-yaxis" aria-hidden="true" data-chart-y>${yLabels}</div>
            <div class="tvd-plot" tabindex="0" role="img" aria-label="Revenue over the selected range. Use the arrow keys to read values." data-preview-region="chart"${tok("bg:card st:primary bd:border")}>
              <svg class="tvd-svg" viewBox="0 0 ${CHART_W} 220" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                <defs>
                  <linearGradient id="${gradient}" x1="0" y1="0" x2="0" y2="1">
                    <stop class="tvd-stop-top" offset="0"/>
                    <stop class="tvd-stop-bottom" offset="1"/>
                  </linearGradient>
                </defs>
                ${grid}
                <path class="tvd-area" data-chart-area fill="url(#${gradient})" d="${line} L${CHART_W},${CHART_BASE} L0,${CHART_BASE} Z"/>
                <path class="tvd-ly" data-chart-ly d="${lastYear}" vector-effect="non-scaling-stroke"/>
                <path class="tvd-line" data-chart-line d="${line}" vector-effect="non-scaling-stroke"/>
              </svg>
              <span class="tvd-guide" data-chart-guide hidden${tok("bd:ring")}></span>
              <span class="tvd-point" data-chart-point hidden${tok("bg:primary bd:card")}></span>
              <div class="tvd-tip" data-chart-tip hidden role="status"${tok("bg:popover fg:popover-foreground bd:border")}>
                <span class="tvd-tip-label" data-tip-label></span>
                <strong class="tvd-tip-value" data-tip-value></strong>
                <span class="tvd-tip-delta"><span class="tvd-tip-dot"${tok("bg:success")}></span><span data-tip-delta></span></span>
              </div>
            </div>
            <span></span>
            <div class="tvd-xaxis" aria-hidden="true" data-chart-x>${xLabels}</div>
          </div>
        </section>

        <section class="tvd-card tvd-goal" data-preview-region="goal-card"${tok("bg:card fg:card-foreground bd:border")}>
          <div class="tvd-card-head">
            <div>
              <h2 class="tvd-h2">Monthly goal</h2>
              <p class="tvd-card-sub">October target</p>
            </div>
            <button type="button" class="tvd-icon-btn tvd-icon-btn-sm" aria-label="More"${tok("bg:card fg:card-foreground bd:border")}>${previewIcon("more")}</button>
          </div>
          <div class="tvd-donut">
            <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
              <circle class="tvd-track" cx="60" cy="60" r="50"/>
              <circle class="tvd-track" cx="60" cy="60" r="36"/>
              <circle class="tvd-arc is-primary" cx="60" cy="60" r="50" pathLength="100" stroke-dasharray="80 100" transform="rotate(-90 60 60)"${tok("st:primary")}/>
              <circle class="tvd-arc is-accent" cx="60" cy="60" r="36" pathLength="100" stroke-dasharray="85 100" transform="rotate(-90 60 60)"${tok("st:accent")}/>
            </svg>
            <div class="tvd-donut-center"><strong>80%</strong><span>of $60k</span></div>
          </div>
          <ul class="tvd-goal-legend">
            <li><span class="tvd-legend-dot is-primary"${tok("bg:primary")}></span>Revenue<strong>$48.3k</strong></li>
            <li><span class="tvd-legend-dot is-accent"${tok("bg:accent")}></span>Orders<strong>1,024 / 1,200</strong></li>
            <li><span class="tvd-legend-dot is-success"${tok("bg:success")}></span>Growth<strong>+12.5%</strong></li>
          </ul>
        </section>
      </div>

      <div class="tvd-row">
        <section class="tvd-card tvd-orders" data-preview-region="table"${tok("bg:card fg:card-foreground bd:border")}>
          <div class="tvd-card-head tvd-card-head-pad">
            <div>
              <h2 class="tvd-h2">Recent orders</h2>
              <p class="tvd-card-sub">4 of 1,024 this month</p>
            </div>
            <button type="button" class="tvd-btn tvd-btn-outline tvd-btn-sm"${tok("bg:card fg:card-foreground bd:border")}>View all</button>
          </div>
          <div class="tvd-table-wrap">
            <table class="tvd-table">
              <thead><tr${tok("bg:muted fg:muted-foreground")}><th>Order</th><th>Customer</th><th class="tvd-date">Date</th><th>Status</th><th class="tvd-amount">Amount</th></tr></thead>
              <tbody>
                ${order("#3210", "OM", "Olivia Martin", "olivia@example.com", "Oct 24, 09:41", "Paid", "$1,999.00")}
                ${order("#3209", "JL", "Jackson Lee", "jackson@example.com", "Oct 24, 08:12", "Pending", "$39.00")}
                ${order("#3208", "IN", "Isabella Nguyen", "isabella@example.com", "Oct 23, 17:30", "Paid", "$299.00")}
                ${order("#3207", "WK", "William Kim", "will@example.com", "Oct 23, 14:05", "Failed", "$99.00")}
              </tbody>
            </table>
          </div>
        </section>

        <section class="tvd-card tvd-activity" data-preview-region="activity-card"${tok("bg:card fg:card-foreground bd:border")}>
          <div class="tvd-card-head">
            <div>
              <h2 class="tvd-h2">Activity</h2>
              <p class="tvd-card-sub">Across your store</p>
            </div>
            <span class="tvd-live" data-preview-region="success"${tok("bg:success fg:success-foreground")}><span class="tvd-live-dot"></span>Live</span>
          </div>
          <ul class="tvd-feed">
            ${activity("primary", "<strong>Olivia Martin</strong> placed order #3210", "2m")}
            ${activity("success", "Payout of <strong>$12,400</strong> sent", "18m")}
            ${activity("accent", "<strong>Jackson Lee</strong> joined as a customer", "1h")}
            ${activity("destructive", "Payment failed for order #3207", "3h")}
            ${activity("primary", "<strong>Isabella Nguyen</strong> left a 5-star review", "5h")}
          </ul>
        </section>
      </div>

      <footer class="tvd-foot">
        <span>Sample data · figures are illustrative</span>
        <span>Every colour here is one of the theme’s 21 tokens</span>
      </footer>
    </div>
  </div>
</div>`;
}

/** The dashboard stylesheet. Every colour is a role or a mix of two roles. */
export const DASHBOARD_SURFACE_CSS = `
.tvp .tvd {
  display: grid;
  grid-template-columns: 232px minmax(0, 1fr);
  min-height: 100%;
  background: var(--background);
  color: var(--foreground);
  font-variant-numeric: tabular-nums;
}

/* Sidebar */
.tvp .tvd-side {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 20px 16px;
  background: var(--card);
  color: var(--card-foreground);
  border-right: 1px solid var(--border);
  min-width: 0;
}

.tvp .tvd-brand { display: flex; align-items: center; gap: 10px; padding: 0 8px 16px; }
.tvp .tvd-logo {
  width: 32px;
  height: 32px;
  border-radius: var(--tvp-r-md);
  display: grid;
  place-items: center;
  flex: none;
  background: var(--primary);
  color: var(--primary-foreground);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--primary) 30%, transparent);
}
.tvp .tvd-logo-mark { width: 18px; height: 18px; }
.tvp .tvd-brand-name { font-size: 15px; font-weight: 600; letter-spacing: -0.01em; }

.tvp .tvd-overline {
  margin: 16px 10px 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted-foreground);
  /* The collapsed layout turns this into a 24px rule. Transitioning the
     background would leave a ghost bar while crossing the breakpoint. */
  transition: color 200ms var(--tvp-ease);
}

.tvp .tvd-nav { display: flex; flex-direction: column; gap: 2px; }

.tvp .tvd-nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  height: 36px;
  padding: 0 10px;
  border-radius: var(--tvp-r-sm);
  color: var(--muted-foreground);
  font-weight: 500;
  white-space: nowrap;
  transition: background-color 160ms var(--tvp-ease), color 160ms var(--tvp-ease);
}
.tvp .tvd-nav-item .tvp-icon { width: 18px; height: 18px; }
.tvp .tvd-nav-item:hover { background: var(--muted); color: var(--card-foreground); }
.tvp .tvd-nav-item[aria-current="page"] {
  background: color-mix(in srgb, var(--primary) 12%, var(--card));
  color: var(--card-foreground);
  font-weight: 600;
}
.tvp .tvd-nav-item[aria-current="page"]::before {
  content: "";
  position: absolute;
  left: -16px;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--primary);
}
.tvp .tvd-nav-item[aria-current="page"] .tvp-icon { color: var(--primary); }

.tvp .tvd-count {
  margin-left: auto;
  min-width: 22px;
  height: 20px;
  padding: 0 7px;
  display: inline-grid;
  place-items: center;
  border-radius: 999px;
  background: var(--muted);
  color: var(--muted-foreground);
  font-size: 11px;
  font-weight: 600;
}

.tvp .tvd-plan {
  margin-top: auto;
  padding: 14px;
  border-radius: var(--tvp-r-lg);
  background: var(--muted);
  color: var(--foreground);
  display: grid;
  gap: 8px;
}
.tvp .tvd-side .tvd-plan { margin-top: 24px; }
.tvp .tvd-plan-head { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
.tvp .tvd-plan-meta, .tvp .tvd-plan-sub { color: var(--muted-foreground); font-size: 12px; }
.tvp .tvd-progress { height: 6px; border-radius: 999px; background: var(--card); overflow: hidden; }
.tvp .tvd-progress-bar { display: block; width: 72%; height: 100%; border-radius: inherit; background: var(--primary); }

/* Buttons */
.tvp .tvd-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 38px;
  padding: 0 14px;
  border-radius: var(--tvp-r-md);
  font-weight: 600;
  font-size: 13px;
  white-space: nowrap;
  transition: transform 160ms var(--tvp-ease), box-shadow 160ms var(--tvp-ease), background-color 200ms var(--tvp-ease), color 200ms var(--tvp-ease), border-color 200ms var(--tvp-ease);
}
.tvp .tvd-btn-sm { height: 32px; padding: 0 12px; font-size: 12.5px; }
.tvp .tvd-btn-block { width: 100%; height: 34px; }
.tvp .tvd-btn-primary {
  background: var(--primary);
  color: var(--primary-foreground);
  box-shadow: 0 6px 16px color-mix(in srgb, var(--primary) 30%, transparent);
}
.tvp .tvd-btn-primary:hover {
  background: color-mix(in srgb, var(--primary-foreground) 8%, var(--primary));
  transform: translateY(-1px);
  box-shadow: 0 8px 20px color-mix(in srgb, var(--primary) 30%, transparent);
}
.tvp .tvd-btn-block { box-shadow: none; }
.tvp .tvd-btn-outline { background: var(--card); color: var(--card-foreground); border: 1px solid var(--border); }
.tvp .tvd-btn-outline:hover { background: var(--muted); }
.tvp .tvd-btn-secondary { background: var(--secondary); color: var(--secondary-foreground); }
.tvp .tvd-btn-secondary:hover { background: color-mix(in srgb, var(--secondary-foreground) 8%, var(--secondary)); }
.tvp .tvd-btn:active { transform: translateY(0); }

.tvp .tvd-icon-btn {
  position: relative;
  width: 38px;
  height: 38px;
  display: inline-grid;
  place-items: center;
  flex: none;
  border-radius: var(--tvp-r-md);
  background: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  transition: background-color 160ms var(--tvp-ease), color 200ms var(--tvp-ease), border-color 200ms var(--tvp-ease);
}
.tvp .tvd-icon-btn:hover { background: var(--muted); }
.tvp .tvd-icon-btn .tvp-icon { width: 18px; height: 18px; }
.tvp .tvd-icon-btn-sm { width: 30px; height: 30px; border-radius: var(--tvp-r-sm); }
.tvp .tvd-icon-btn-sm .tvp-icon { width: 16px; height: 16px; }
.tvp .tvd-bell-dot {
  position: absolute;
  top: 8px;
  right: 9px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--destructive);
  box-shadow: 0 0 0 2px var(--card);
}

/* Top bar */
.tvp .tvd-main { min-width: 0; display: flex; flex-direction: column; }
.tvp .tvd-top {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  min-height: 64px;
  padding: 12px 28px;
  background: var(--background);
  border-bottom: 1px solid var(--border);
}

.tvp .tvd-search {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 1 360px;
  min-width: 180px;
  height: 38px;
  padding: 0 6px 0 12px;
  border-radius: var(--tvp-r-md);
  background: var(--card);
  color: var(--muted-foreground);
  border: 1px solid var(--input);
  cursor: text;
}
.tvp .tvd-search:has(input:focus-visible) { outline: 1px solid var(--ring); outline-offset: 0; border-color: var(--ring); }
.tvp .tvd-search input { flex: 1; min-width: 0; height: 100%; color: var(--card-foreground); font: inherit; font-size: 13px; }
.tvp .tvd-search input:focus-visible { outline: none; }
.tvp .tvd-search input::-webkit-search-cancel-button { display: none; }
.tvp .tvd-kbd {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 6px;
  border-radius: 6px;
  background: var(--muted);
  color: var(--muted-foreground);
  border: 1px solid var(--border);
  font-size: 11px;
  font-weight: 500;
  flex: none;
}

.tvp .tvd-top-actions { display: flex; align-items: center; gap: 10px; margin-left: auto; flex-wrap: wrap; }

.tvp .tvd-seg { display: inline-flex; padding: 3px; gap: 2px; border-radius: var(--tvp-r-md); background: var(--muted); }
.tvp .tvd-seg button {
  height: 30px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  border-radius: var(--tvp-r-sm);
  color: var(--muted-foreground);
  font-weight: 500;
  font-size: 12.5px;
  transition: background-color 160ms var(--tvp-ease), color 160ms var(--tvp-ease), box-shadow 160ms var(--tvp-ease);
}
.tvp .tvd-seg button:hover { color: var(--foreground); }
.tvp .tvd-seg button[aria-pressed="true"] {
  background: var(--card);
  color: var(--card-foreground);
  font-weight: 600;
  box-shadow: 0 1px 2px color-mix(in srgb, var(--foreground) 10%, transparent), 0 1px 1px color-mix(in srgb, var(--foreground) 6%, transparent);
}
.tvp .tvd-seg-sm button { height: 26px; padding: 0 10px; font-size: 12px; }

.tvp .tvd-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: inline-grid;
  place-items: center;
  flex: none;
  background: var(--accent);
  color: var(--accent-foreground);
  font-size: 12.5px;
  font-weight: 600;
}

/* Content */
.tvp .tvd-content { display: flex; flex-direction: column; gap: 20px; padding: 28px; min-width: 0; }

.tvp .tvd-greet { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.tvp .tvd-h1 { font-size: 24px; line-height: 32px; font-weight: 600; letter-spacing: -0.02em; color: var(--foreground); }
.tvp .tvd-sub { margin-top: 4px; color: var(--muted-foreground); font-size: 13.5px; }
.tvp .tvd-greet-actions { display: flex; gap: 10px; }

/* KPI cards */
.tvp .tvd-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }

.tvp .tvd-kpi {
  position: relative;
  display: grid;
  gap: 6px;
  padding: 18px 18px 16px;
  min-width: 0;
  overflow: hidden;
  border-radius: var(--tvp-r-lg);
  background: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  box-shadow: var(--tvp-shadow-card);
  transition: transform 160ms var(--tvp-ease), box-shadow 160ms var(--tvp-ease), background-color 200ms var(--tvp-ease), color 200ms var(--tvp-ease), border-color 200ms var(--tvp-ease);
}
.tvp .tvd-kpi:hover { transform: translateY(-2px); }
.tvp .tvd-kpi.is-featured {
  background: var(--primary);
  color: var(--primary-foreground);
  border-color: var(--primary);
  box-shadow: 0 1px 2px color-mix(in srgb, var(--foreground) 6%, transparent), 0 12px 28px color-mix(in srgb, var(--primary) 30%, transparent);
}

.tvp .tvd-kpi-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.tvp .tvd-kpi-label { font-size: 13px; font-weight: 500; color: var(--muted-foreground); }
.tvp .tvd-kpi.is-featured .tvd-kpi-label { color: var(--primary-foreground); }
.tvp .tvd-kpi-icon {
  width: 30px;
  height: 30px;
  display: inline-grid;
  place-items: center;
  border-radius: var(--tvp-r-sm);
  background: var(--muted);
  color: var(--muted-foreground);
}
.tvp .tvd-kpi.is-featured .tvd-kpi-icon { background: color-mix(in srgb, var(--primary-foreground) 14%, var(--primary)); color: var(--primary-foreground); }
.tvp .tvd-kpi-value { font-size: 26px; line-height: 34px; font-weight: 600; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.tvp .tvd-kpi-foot { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; position: relative; z-index: 1; max-width: calc(100% - 92px); }
.tvp .tvd-kpi-caption { min-width: 0; overflow: hidden; font-size: 12px; color: var(--muted-foreground); white-space: nowrap; text-overflow: ellipsis; }
.tvp .tvd-kpi.is-featured .tvd-kpi-caption { color: var(--primary-foreground); }

.tvp .tvd-delta {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--card-foreground);
  white-space: nowrap;
}
.tvp .tvd-delta .tvp-icon { width: 14px; height: 14px; stroke-width: 2.4; }
.tvp .tvd-delta.is-up .tvd-arrow-up { color: var(--success); }
.tvp .tvd-delta.is-down .tvd-arrow-down { color: var(--destructive); }
.tvp .tvd-delta.is-up .tvd-arrow-down, .tvp .tvd-delta.is-down .tvd-arrow-up { display: none; }
.tvp .tvd-kpi.is-featured .tvd-delta {
  padding: 2px 8px 2px 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary-foreground) 14%, var(--primary));
  color: var(--primary-foreground);
}
.tvp .tvd-kpi.is-featured .tvd-delta .tvp-icon { color: var(--primary-foreground); }

.tvp .tvd-spark { position: absolute; right: 16px; bottom: 16px; width: 84px; height: 32px; overflow: visible; }
.tvp .tvd-spark-line { fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.tvp .tvd-spark-featured .tvd-spark-line { stroke: var(--primary-foreground); }
.tvp .tvd-spark-featured .tvd-spark-area { fill: color-mix(in srgb, var(--primary-foreground) 14%, transparent); }
.tvp .tvd-spark-accent .tvd-spark-line { stroke: var(--accent); }
.tvp .tvd-spark-accent .tvd-spark-area { fill: color-mix(in srgb, var(--accent) 14%, transparent); }
.tvp .tvd-spark-success .tvd-spark-line { stroke: var(--success); }
.tvp .tvd-spark-success .tvd-spark-area { fill: color-mix(in srgb, var(--success) 14%, transparent); }
.tvp .tvd-spark-destructive .tvd-spark-line { stroke: var(--destructive); }
.tvp .tvd-spark-destructive .tvd-spark-area { fill: color-mix(in srgb, var(--destructive) 14%, transparent); }

/* Cards */
.tvp .tvd-row { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 16px; }

.tvp .tvd-card {
  padding: 20px;
  min-width: 0;
  border-radius: var(--tvp-r-lg);
  background: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  box-shadow: var(--tvp-shadow-card);
}
.tvp .tvd-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.tvp .tvd-h2 { font-size: 15px; line-height: 22px; font-weight: 600; letter-spacing: -0.01em; }
.tvp .tvd-card-sub { margin-top: 2px; font-size: 12.5px; color: var(--muted-foreground); }
.tvp .tvd-card-tools { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }

/* Revenue chart */
.tvp .tvd-chart-total { display: flex; align-items: baseline; gap: 10px; margin-top: 4px; }
.tvp .tvd-chart-total strong { font-size: 22px; line-height: 30px; font-weight: 600; letter-spacing: -0.02em; }

.tvp .tvd-legend { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted-foreground); }
.tvp .tvd-legend-line { width: 14px; height: 0; border-top: 2.5px solid var(--primary); border-radius: 2px; }
.tvp .tvd-legend-line.is-dashed { border-top: 2px dashed var(--muted-foreground); }

.tvp .tvd-chart { display: grid; grid-template-columns: 44px minmax(0, 1fr); grid-template-rows: 220px auto; }
.tvp .tvd-yaxis { position: relative; font-size: 11px; color: var(--muted-foreground); }
.tvp .tvd-yaxis span { position: absolute; right: 10px; transform: translateY(-50%); white-space: nowrap; }
.tvp .tvd-yaxis .tvd-y4 { top: 4.545%; }
.tvp .tvd-yaxis .tvd-y3 { top: 27.27%; }
.tvp .tvd-yaxis .tvd-y2 { top: 50%; }
.tvp .tvd-yaxis .tvd-y1 { top: 72.73%; }
.tvp .tvd-yaxis .tvd-y0 { top: 95.45%; }
.tvp .tvd-xaxis { display: flex; justify-content: space-between; padding-top: 8px; font-size: 11px; color: var(--muted-foreground); }
.tvp .tvd-xaxis span { flex: 0 0 auto; }

.tvp .tvd-plot { position: relative; height: 220px; border-radius: var(--tvp-r-sm); }
.tvp .tvd-plot:focus-visible { outline-offset: 4px; }
.tvp .tvd-svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; display: block; }
.tvp .tvd-grid { stroke: var(--border); stroke-width: 1; }
.tvp .tvd-stop-top { stop-color: var(--primary); stop-opacity: 0.28; }
.tvp .tvd-stop-bottom { stop-color: var(--primary); stop-opacity: 0; }
.tvp .tvd-area { stroke: none; }
.tvp .tvd-line { fill: none; stroke: var(--primary); stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; }
.tvp .tvd-ly { fill: none; stroke: var(--muted-foreground); stroke-width: 1.6; stroke-dasharray: 5 5; stroke-linecap: round; }

.tvp .tvd-guide { position: absolute; top: 0; bottom: 0; width: 0; border-left: 1px dashed var(--ring); pointer-events: none; transition: none; }
.tvp .tvd-point {
  position: absolute;
  width: 12px;
  height: 12px;
  margin: -6px 0 0 -6px;
  border-radius: 50%;
  background: var(--primary);
  box-shadow: 0 0 0 3px var(--card), 0 0 0 9px color-mix(in srgb, var(--primary) 18%, transparent);
  pointer-events: none;
  transition: none;
}
.tvp .tvd-tip {
  position: absolute;
  z-index: 3;
  display: grid;
  gap: 2px;
  min-width: 132px;
  padding: 8px 12px;
  border-radius: var(--tvp-r-md);
  background: var(--popover);
  color: var(--popover-foreground);
  border: 1px solid var(--border);
  box-shadow: var(--tvp-shadow-pop);
  transform: translate(-50%, calc(-100% - 16px));
  pointer-events: none;
  white-space: nowrap;
  transition: none;
}
.tvp .tvd-tip.is-start { transform: translate(-12px, calc(-100% - 16px)); }
.tvp .tvd-tip.is-end { transform: translate(calc(-100% + 12px), calc(-100% - 16px)); }
.tvp .tvd-tip.is-below { transform: translate(-50%, 18px); }
.tvp .tvd-tip.is-below.is-start { transform: translate(-12px, 18px); }
.tvp .tvd-tip.is-below.is-end { transform: translate(calc(-100% + 12px), 18px); }
.tvp .tvd-tip-label { font-size: 11px; font-weight: 500; }
.tvp .tvd-tip-value { font-size: 15px; font-weight: 600; letter-spacing: -0.01em; }
.tvp .tvd-tip-delta { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; }
.tvp .tvd-tip-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--success); }

/* Goal donut */
.tvp .tvd-goal { display: flex; flex-direction: column; }
.tvp .tvd-donut { position: relative; width: 168px; height: 168px; margin: 4px auto 18px; }
.tvp .tvd-donut svg { width: 100%; height: 100%; display: block; }
.tvp .tvd-track { fill: none; stroke: var(--muted); stroke-width: 10; }
.tvp .tvd-arc { fill: none; stroke-width: 10; stroke-linecap: round; }
.tvp .tvd-arc.is-primary { stroke: var(--primary); }
.tvp .tvd-arc.is-accent { stroke: var(--accent); }
.tvp .tvd-donut-center { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; }
.tvp .tvd-donut-center strong { font-size: 24px; line-height: 30px; font-weight: 600; letter-spacing: -0.02em; }
.tvp .tvd-donut-center span { font-size: 12px; color: var(--muted-foreground); }
.tvp .tvd-goal-legend { display: grid; gap: 10px; margin-top: auto; }
.tvp .tvd-goal-legend li { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--muted-foreground); }
.tvp .tvd-goal-legend strong { margin-left: auto; color: var(--card-foreground); font-weight: 600; }
.tvp .tvd-legend-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
.tvp .tvd-legend-dot.is-primary { background: var(--primary); }
.tvp .tvd-legend-dot.is-accent { background: var(--accent); }
.tvp .tvd-legend-dot.is-success { background: var(--success); }

/* Orders table */
.tvp .tvd-orders { padding: 0; overflow: hidden; }
.tvp .tvd-card-head-pad { padding: 20px 20px 0; }
.tvp .tvd-table-wrap { overflow-x: auto; }
.tvp .tvd-table { font-size: 13px; }
.tvp .tvd-table thead tr { background: var(--muted); }
.tvp .tvd-table th {
  padding: 10px 20px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted-foreground);
  white-space: nowrap;
}
.tvp .tvd-table td { padding: 12px 20px; border-top: 1px solid var(--border); white-space: nowrap; }
.tvp .tvd-table tbody tr { transition: background-color 160ms var(--tvp-ease); }
.tvp .tvd-table tbody tr:hover { background: var(--muted); }
.tvp .tvd-order-id { font-weight: 600; }
.tvp .tvd-date, .tvp .tvd-who-mail { color: var(--muted-foreground); }
.tvp .tvd-amount { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
.tvp .tvd-who { display: flex; align-items: center; gap: 10px; }
.tvp .tvd-who-text { display: grid; line-height: 1.3; }
.tvp .tvd-who-text strong { font-weight: 500; }
.tvp .tvd-who-mail { font-size: 12px; }
.tvp .tvd-initials {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: inline-grid;
  place-items: center;
  flex: none;
  background: var(--secondary);
  color: var(--secondary-foreground);
  font-size: 11px;
  font-weight: 600;
}
.tvp .tvd-status {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
}
.tvp .tvd-status.is-success { background: var(--success); color: var(--success-foreground); }
.tvp .tvd-status.is-secondary { background: var(--secondary); color: var(--secondary-foreground); }
.tvp .tvd-status.is-destructive { background: var(--destructive); color: var(--destructive-foreground); }

/* Activity */
.tvp .tvd-live {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 22px;
  padding: 0 9px;
  border-radius: 999px;
  background: var(--success);
  color: var(--success-foreground);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.tvp .tvd-live-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--success-foreground); animation: tvd-pulse 1.6s ease-in-out infinite; }
@keyframes tvd-pulse { 50% { opacity: 0.35; } }

.tvp .tvd-feed { display: grid; gap: 0; }
.tvp .tvd-feed li { position: relative; display: grid; grid-template-columns: 10px minmax(0, 1fr) auto; align-items: start; gap: 12px; padding: 0 0 16px; font-size: 13px; }
.tvp .tvd-feed li:last-child { padding-bottom: 0; }
.tvp .tvd-feed li:not(:last-child)::before { content: ""; position: absolute; left: 4px; top: 16px; bottom: 2px; width: 1px; background: var(--border); }
.tvp .tvd-feed-dot { width: 9px; height: 9px; margin-top: 5px; border-radius: 50%; box-shadow: 0 0 0 3px var(--card); }
.tvp .tvd-feed-dot.is-primary { background: var(--primary); }
.tvp .tvd-feed-dot.is-accent { background: var(--accent); }
.tvp .tvd-feed-dot.is-success { background: var(--success); }
.tvp .tvd-feed-dot.is-destructive { background: var(--destructive); }
.tvp .tvd-feed-text strong { font-weight: 600; }
.tvp .tvd-feed-time { font-size: 12px; color: var(--muted-foreground); }

.tvp .tvd-foot { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding-top: 4px; font-size: 12px; color: var(--muted-foreground); }

/* Entrance, first paint only. */
.tvp.tvp-enter .tvd-greet,
.tvp.tvp-enter .tvd-kpi,
.tvp.tvp-enter .tvd-card { animation: tvp-rise 420ms var(--tvp-ease) both; }
.tvp.tvp-enter .tvd-kpi:nth-child(2) { animation-delay: 40ms; }
.tvp.tvp-enter .tvd-kpi:nth-child(3) { animation-delay: 80ms; }
.tvp.tvp-enter .tvd-kpi:nth-child(4) { animation-delay: 120ms; }
.tvp.tvp-enter .tvd-row:nth-of-type(1) .tvd-card { animation-delay: 160ms; }
.tvp.tvp-enter .tvd-row:nth-of-type(1) .tvd-card + .tvd-card { animation-delay: 200ms; }
.tvp.tvp-enter .tvd-row:nth-of-type(2) .tvd-card { animation-delay: 240ms; }
.tvp.tvp-enter .tvd-row:nth-of-type(2) .tvd-card + .tvd-card { animation-delay: 280ms; }

/* Fluid layout */
@container tvp (max-width: 1320px) {
  .tvp .tvd-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@container tvp (max-width: 999px) {
  .tvp .tvd { grid-template-columns: 72px minmax(0, 1fr); }
  .tvp .tvd-side { padding: 20px 12px; align-items: center; }
  .tvp .tvd-brand { padding: 0 0 16px; }
  .tvp .tvd-brand-name, .tvp .tvd-side .tvd-label, .tvp .tvd-count, .tvp .tvd-plan { display: none; }
  .tvp .tvd-overline { margin: 12px 0 4px; font-size: 0; height: 1px; width: 24px; background: var(--border); }
  .tvp .tvd-nav-item { width: 40px; height: 40px; padding: 0; justify-content: center; }
  .tvp .tvd-nav-item[aria-current="page"]::before { left: -12px; }
  .tvp .tvd-row { grid-template-columns: minmax(0, 1fr); }
  .tvp .tvd-top { padding: 12px 20px; }
  .tvp .tvd-content { padding: 20px; }
}

@container tvp (max-width: 720px) {
  .tvp .tvd-kbd, .tvp .tvd-btn-new .tvd-label, .tvp .tvd-date { display: none; }
  .tvp .tvd-btn-new { width: 38px; padding: 0; }
  .tvp .tvd-search { flex: 1 1 100%; order: 2; }
  .tvp .tvd-top-actions { margin-left: 0; }
}

@container tvp (max-width: 600px) {
  .tvp .tvd { grid-template-columns: minmax(0, 1fr); }
  .tvp .tvd-side { display: none; }
  .tvp .tvd-kpis { grid-template-columns: minmax(0, 1fr); }
  .tvp .tvd-content { padding: 16px; gap: 16px; }
  .tvp .tvd-top { padding: 12px 16px; }
  .tvp .tvd-xaxis span:nth-child(even) { visibility: hidden; }
  .tvp .tvd-card-tools .tvd-legend { display: none; }
}
`;
