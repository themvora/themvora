function escapeHTML(str: string): string {
  const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return str.replace(/[&<>"']/g, (c) => map[c] ?? c);
}

function renderEntries(entries: unknown[]): string {
  if (entries.length === 0) return "<p class='tv-devtools-empty'>No entries recorded.</p>";
  return entries.map((e: any, i: number) => `
    <div class="tv-devtools-entry">
      <span class="tv-devtools-time">${new Date(e.timestamp).toLocaleTimeString()}</span>
      <span class="tv-devtools-type tv-type-${e.type}">${escapeHTML(e.type)}</span>
      <span class="tv-devtools-label">${escapeHTML(e.label)}</span>
    </div>
  `).join("");
}

function renderPerformance(perf: unknown[]): string {
  if (perf.length === 0) return "<p class='tv-devtools-empty'>No performance data.</p>";
  const maxDur = Math.max(...perf.map((p: any) => p.duration), 1);
  return perf.map((p: any) => `
    <div class="tv-devtools-perf-row">
      <span class="tv-devtools-perf-type">${escapeHTML(p.type)}</span>
      <div class="tv-devtools-bar-wrap">
        <div class="tv-devtools-bar" style="width:${(p.duration / maxDur) * 100}%"></div>
      </div>
      <span class="tv-devtools-perf-val">${p.duration.toFixed(2)}ms</span>
    </div>
  `).join("");
}

function renderCSSVariables(vars: Record<string, string>): string {
  const entries = Object.entries(vars);
  if (entries.length === 0) return "<p class='tv-devtools-empty'>No CSS variables.</p>";
  return entries.map(([key, val]) => `
    <div class="tv-devtools-css-row">
      <span class="tv-devtools-css-prop">${escapeHTML(key)}</span>
      <span class="tv-devtools-css-val">${escapeHTML(val)}</span>
      <span class="tv-devtools-css-swatch" style="background:${val}"></span>
    </div>
  `).join("");
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

  let currentTab = "inspector";

  function render() {
    const state = inspector.getState();
    root.innerHTML = `
      <div class="tv-devtools-header">
        <h3>Themvora DevTools</h3>
        <nav class="tv-devtools-tabs">
          <button class="tv-tab ${currentTab === "inspector" ? "active" : ""}" data-tab="inspector">Inspector</button>
          <button class="tv-tab ${currentTab === "events" ? "active" : ""}" data-tab="events">Events</button>
          <button class="tv-tab ${currentTab === "performance" ? "active" : ""}" data-tab="performance">Perf</button>
          <button class="tv-tab ${currentTab === "css" ? "active" : ""}" data-tab="css">CSS Vars</button>
          <button class="tv-tab ${currentTab === "history" ? "active" : ""}" data-tab="history">History</button>
        </nav>
      </div>
      <div class="tv-devtools-body">
        ${renderTab(state)}
      </div>
      <div class="tv-devtools-footer">
        <button id="tv-clear-entries">Clear Events</button>
        <button id="tv-clear-perf">Clear Perf</button>
        <button id="tv-export-json">Export JSON</button>
        <button id="tv-export-css">Export CSS</button>
      </div>
    `;

    root.querySelectorAll(".tv-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentTab = (btn as HTMLButtonElement).dataset.tab!;
        render();
      });
    });

    const clearBtn = root.querySelector("#tv-clear-entries") as HTMLButtonElement;
    if (clearBtn) clearBtn.addEventListener("click", () => inspector.clearEntries());

    const perfBtn = root.querySelector("#tv-clear-perf") as HTMLButtonElement;
    if (perfBtn) perfBtn.addEventListener("click", () => inspector.clearPerformance());

    const jsonBtn = root.querySelector("#tv-export-json") as HTMLButtonElement;
    if (jsonBtn) jsonBtn.addEventListener("click", () => {
      const blob = new Blob([inspector.exportState()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "themvora-state.json"; a.click();
      URL.revokeObjectURL(url);
    });

    const cssBtn = root.querySelector("#tv-export-css") as HTMLButtonElement;
    if (cssBtn) cssBtn.addEventListener("click", () => {
      const cssVars = inspector.exportCSS();
      const css = Object.entries(cssVars).map(([k, v]) => `${k}: ${v};`).join("\n  ");
      const blob = new Blob([`/* Themvora CSS Variables */\n:root {\n  ${css}\n}`], { type: "text/css" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "themvora.css"; a.click();
      URL.revokeObjectURL(url);
    });
  }

  function renderTab(state: any): string {
    const history = (state.history ?? []) as Array<{ index: number }>;
    const cssVars = (state.cssVariables ?? {}) as Record<string, string>;
    switch (currentTab) {
      case "inspector":
        return `
          <section class="tv-devtools-section">
            <h4>Current Theme</h4>
            <pre>${escapeHTML(JSON.stringify(state.currentTheme, null, 2))}</pre>
          </section>
          <section class="tv-devtools-section">
            <h4>Selection</h4>
            <pre>${escapeHTML(JSON.stringify(state.selection, null, 2))}</pre>
          </section>
        `;
      case "events":
        return `<section class="tv-devtools-section"><h4>Lifecycle Events</h4>${renderEntries(inspector.getEntries())}</section>`;
      case "performance":
        return `<section class="tv-devtools-section"><h4>Performance</h4>${renderPerformance(inspector.getPerformance())}</section>`;
      case "css":
        return `<section class="tv-devtools-section"><h4>CSS Variables</h4>${renderCSSVariables(state.cssVariables || {})}</section>`;
      case "history":
        return `
          <section class="tv-devtools-section">
            <h4>History (${state.history.length} entries)</h4>
            <div class="tv-devtools-history">
              ${state.history.map((h: any) => `
                <div class="tv-devtools-history-entry">
                  <span>#${h.index}</span>
                  <button data-jump="${h.index}">Jump</button>
                </div>
              `).join("")}
            </div>
          </section>
        `;
      default:
        return "";
    }
  }

  root.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target.dataset.tab) {
      currentTab = target.dataset.tab;
      render();
    }
    if (target.dataset.jump !== undefined) {
      inspector.jump(Number(target.dataset.jump));
    }
  });

  render();
  return root;
}
