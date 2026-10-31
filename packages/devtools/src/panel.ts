/**
 * The tab identifiers the panel renders.
 *
 * @remarks
 * A fixed list, used both to build the tab bar and to validate `data-tab`
 * values read back off the DOM. Nothing from a theme can add an entry.
 */
const TABS = [
  ["inspector", "Inspector"],
  ["events", "Events"],
  ["performance", "Perf"],
  ["css", "CSS Vars"],
  ["history", "History"],
] as const;

type TabId = (typeof TABS)[number][0];

/**
 * The `DevToolsEntry["type"]` values, used as an allowlist for the
 * `tv-type-<type>` class.
 *
 * @remarks
 * The class name is built from recorded data, so it is only ever taken from
 * this set: an unknown value gets the neutral base class instead of being
 * spliced into `class="..."` where a space or a quote would let it name
 * additional classes or break out of the attribute.
 */
const ENTRY_TYPES = new Set([
  "theme-change",
  "mode-change",
  "family-change",
  "persist",
  "restore",
  "batch",
]);

function isTabId(value: string | undefined): value is TabId {
  return value !== undefined && TABS.some(([id]) => id === value);
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function emptyState(message: string): HTMLParagraphElement {
  return element("p", "tv-devtools-empty", message);
}

function renderEntries(entries: unknown[]): DocumentFragment {
  const section = document.createDocumentFragment();

  if (entries.length === 0) {
    section.appendChild(emptyState("No entries recorded."));
    return section;
  }

  for (const raw of entries as Array<Record<string, unknown>>) {
    const row = element("div", "tv-devtools-entry");
    const type = typeof raw.type === "string" ? raw.type : "";

    row.appendChild(
      element(
        "span",
        "tv-devtools-time",
        new Date(Number(raw.timestamp)).toLocaleTimeString(),
      ),
    );
    row.appendChild(
      element(
        "span",
        ENTRY_TYPES.has(type) ? `tv-devtools-type tv-type-${type}` : "tv-devtools-type",
        type,
      ),
    );
    row.appendChild(
      element(
        "span",
        "tv-devtools-label",
        typeof raw.label === "string" ? raw.label : String(raw.label ?? ""),
      ),
    );

    section.appendChild(row);
  }

  return section;
}

function renderPerformance(perf: unknown[]): DocumentFragment {
  const section = document.createDocumentFragment();

  if (perf.length === 0) {
    section.appendChild(emptyState("No performance data."));
    return section;
  }

  const rows = perf as Array<Record<string, unknown>>;
  const maxDur = Math.max(...rows.map((p) => Number(p.duration) || 0), 1);

  for (const p of rows) {
    const duration = Number(p.duration) || 0;
    const row = element("div", "tv-devtools-perf-row");

    row.appendChild(
      element(
        "span",
        "tv-devtools-perf-type",
        typeof p.type === "string" ? p.type : String(p.type ?? ""),
      ),
    );

    const wrap = element("div", "tv-devtools-bar-wrap");
    const bar = element("div", "tv-devtools-bar");
    // A number is the only thing a width may be, so it is set as a property
    // rather than interpolated into a style attribute.
    bar.style.setProperty("width", `${(duration / maxDur) * 100}%`);
    wrap.appendChild(bar);
    row.appendChild(wrap);

    row.appendChild(
      element("span", "tv-devtools-perf-val", `${duration.toFixed(2)}ms`),
    );

    section.appendChild(row);
  }

  return section;
}

function renderCSSVariables(vars: Record<string, string>): DocumentFragment {
  const section = document.createDocumentFragment();
  const entries = Object.entries(vars ?? {});

  if (entries.length === 0) {
    section.appendChild(emptyState("No CSS variables."));
    return section;
  }

  for (const [key, value] of entries) {
    const row = element("div", "tv-devtools-css-row");
    row.appendChild(element("span", "tv-devtools-css-prop", key));
    row.appendChild(element("span", "tv-devtools-css-val", String(value)));

    const swatch = element("span", "tv-devtools-css-swatch");
    // `setProperty` parses the value as a single declaration value: a payload
    // such as `red; background-image: url(…)` is rejected outright instead of
    // becoming two declarations, which is what the old
    // `style="background:${val}"` attribute interpolation allowed.
    swatch.style.setProperty("background", String(value));
    row.appendChild(swatch);

    section.appendChild(row);
  }

  return section;
}

/**
 * Creates a devtools panel DOM element bound to an inspector.
 *
 * Renders a tabbed panel (Inspector, Events, Perf, CSS Vars, History) that
 * reads from the inspector and wires up the clear and export buttons. The
 * returned element is a live DOM node; attach it to the document to display
 * the panel.
 *
 * @param inspector The inspector to render and control.
 * @returns An `HTMLElement` containing the devtools panel.
 *
 * @remarks
 * Every value the inspector reports — theme names, family names, CSS variable
 * names and values, entry labels and types — is written with `textContent`,
 * `style.setProperty()` or a validated `className`, never interpolated into an
 * HTML string. Escaping alone would not have been enough: the CSS-variable
 * swatch is a *CSS* context, where an HTML escape leaves the declaration
 * separator and `url()` intact.
 *
 * @see {@link createDevToolsInspector}
 */
export function createDevToolsPanel(inspector: {
  getState(): { currentTheme: unknown; selection: unknown; history: unknown[]; cssVariables: Record<string, string> };
  getEntries(): unknown[];
  getPerformance(): unknown[];
  jump(index: number): void;
  clearEntries(): void;
  clearPerformance(): void;
  exportState(): string;
  exportCSS(): Record<string, string>;
  destroy(): void;
}): HTMLElement {
  const root = document.createElement("div");
  root.className = "tv-devtools";
  root.setAttribute("role", "complementary");
  root.setAttribute("aria-label", "Themvora DevTools");

  let currentTab: TabId = "inspector";

  function download(contents: string, type: string, filename: string) {
    const blob = new Blob([contents], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function buildTab(state: any): DocumentFragment {
    const history = (state.history ?? []) as Array<{ index: number }>;

    switch (currentTab) {
      case "inspector": {
        const fragment = document.createDocumentFragment();

        const themeSection = element("section", "tv-devtools-section");
        themeSection.appendChild(element("h4", undefined, "Current Theme"));
        const themePre = document.createElement("pre");
        themePre.textContent = JSON.stringify(state.currentTheme, null, 2);
        themeSection.appendChild(themePre);
        fragment.appendChild(themeSection);

        const selectionSection = element("section", "tv-devtools-section");
        selectionSection.appendChild(element("h4", undefined, "Selection"));
        const selectionPre = document.createElement("pre");
        selectionPre.textContent = JSON.stringify(state.selection, null, 2);
        selectionSection.appendChild(selectionPre);
        fragment.appendChild(selectionSection);

        return fragment;
      }
      case "events": {
        const fragment = document.createDocumentFragment();
        const section = element("section", "tv-devtools-section");
        section.appendChild(element("h4", undefined, "Lifecycle Events"));
        section.appendChild(renderEntries(inspector.getEntries()));
        fragment.appendChild(section);
        return fragment;
      }
      case "performance": {
        const fragment = document.createDocumentFragment();
        const section = element("section", "tv-devtools-section");
        section.appendChild(element("h4", undefined, "Performance"));
        section.appendChild(renderPerformance(inspector.getPerformance()));
        fragment.appendChild(section);
        return fragment;
      }
      case "css": {
        const fragment = document.createDocumentFragment();
        const section = element("section", "tv-devtools-section");
        section.appendChild(element("h4", undefined, "CSS Variables"));
        section.appendChild(renderCSSVariables(state.cssVariables ?? {}));
        fragment.appendChild(section);
        return fragment;
      }
      case "history": {
        const fragment = document.createDocumentFragment();
        const section = element("section", "tv-devtools-section");
        section.appendChild(
          element("h4", undefined, `History (${history.length} entries)`),
        );
        const list = element("div", "tv-devtools-history");

        for (const entry of history) {
          const row = element("div", "tv-devtools-history-entry");
          row.appendChild(element("span", undefined, `#${entry.index}`));
          const jump = element("button", undefined, "Jump");
          jump.dataset.jump = String(entry.index);
          row.appendChild(jump);
          list.appendChild(row);
        }

        section.appendChild(list);
        fragment.appendChild(section);
        return fragment;
      }
      default:
        return document.createDocumentFragment();
    }
  }

  function render() {
    root.innerHTML = "";

    const header = element("div", "tv-devtools-header");
    header.appendChild(element("h3", undefined, "Themvora DevTools"));

    const nav = element("nav", "tv-devtools-tabs");
    for (const [id, label] of TABS) {
      const button = element(
        "button",
        currentTab === id ? "tv-tab active" : "tv-tab",
        label,
      );
      button.dataset.tab = id;
      nav.appendChild(button);
    }
    header.appendChild(nav);
    root.appendChild(header);

    const body = element("div", "tv-devtools-body");
    body.appendChild(buildTab(inspector.getState()));
    root.appendChild(body);

    const footer = element("div", "tv-devtools-footer");

    const clearEntries = element("button", undefined, "Clear Events");
    clearEntries.id = "tv-clear-entries";
    clearEntries.addEventListener("click", () => inspector.clearEntries());
    footer.appendChild(clearEntries);

    const clearPerf = element("button", undefined, "Clear Perf");
    clearPerf.id = "tv-clear-perf";
    clearPerf.addEventListener("click", () => inspector.clearPerformance());
    footer.appendChild(clearPerf);

    const exportJson = element("button", undefined, "Export JSON");
    exportJson.id = "tv-export-json";
    exportJson.addEventListener("click", () =>
      download(inspector.exportState(), "application/json", "themvora-state.json"),
    );
    footer.appendChild(exportJson);

    const exportCss = element("button", undefined, "Export CSS");
    exportCss.id = "tv-export-css";
    exportCss.addEventListener("click", () => {
      const cssVars = inspector.exportCSS();
      const css = Object.entries(cssVars)
        .map(([k, v]) => `${k}: ${v};`)
        .join("\n  ");
      download(
        `/* Themvora CSS Variables */\n:root {\n  ${css}\n}`,
        "text/css",
        "themvora.css",
      );
    });
    footer.appendChild(exportCss);

    root.appendChild(footer);
  }

  // Delegated so a re-render does not stack listeners on fresh nodes.
  root.addEventListener("click", (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const tab = target.dataset.tab;
    if (isTabId(tab)) {
      currentTab = tab;
      render();
      return;
    }

    if (target.dataset.jump !== undefined) {
      inspector.jump(Number(target.dataset.jump));
    }
  });

  render();
  return root;
}
