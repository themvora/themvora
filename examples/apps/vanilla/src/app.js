/**
 * The application module — the only script that runs after the page exists.
 *
 * The pre-paint bootstrap has already applied the resolved theme, so this file
 * does not resolve a theme, does not read storage, and does not pass a
 * configuration: `new Themvora()` adopts the state already on `<html>` and the
 * configuration the bootstrap published. Its job is to wire the controls.
 */
import { Themvora } from "@themvora/core/vanilla";

const kit = new Themvora();

const familySelect = document.querySelector("#family");
const modeButtons = [...document.querySelectorAll("[data-mode]")];
const toggle = document.querySelector("#toggle");

const readouts = {
  theme: document.querySelector('[data-tv-readout="theme"]'),
  mode: document.querySelector('[data-tv-readout="mode"]'),
  effective: document.querySelector('[data-tv-readout="effective-mode"]'),
  family: document.querySelector('[data-tv-readout="family"]'),
};

/**
 * Mirror the runtime into the page.
 *
 * Everything here is read from the instance, never from a local variable, so a
 * change made anywhere — a control, another tab via the storage event, the
 * operating system while the mode is `system` — lands in the same place.
 */
function render() {
  readouts.theme.textContent = String(kit.theme.name);
  readouts.mode.textContent = kit.mode;
  readouts.effective.textContent = kit.resolvedMode;
  readouts.family.textContent = kit.family;

  for (const button of modeButtons) {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.mode === kit.mode),
    );
  }

  familySelect.value = kit.family;

  toggle.setAttribute(
    "aria-label",
    kit.resolvedMode === "dark"
      ? "Switch to light mode"
      : "Switch to dark mode",
  );
}

document.querySelector(".segmented").addEventListener("click", (event) => {
  const button = event.target.closest("[data-mode]");
  if (!button) return;
  kit.setMode(button.dataset.mode);
});

familySelect.addEventListener("change", () => {
  kit.setFamily(familySelect.value);
});

toggle.addEventListener("click", () => {
  // `toggleTheme()` ignores `"system"`: it flips the appearance on screen into
  // an explicit choice, which is what a visitor pressing it expects.
  kit.toggleTheme();
});

// One subscription per event name. Each is emitted once per logical change, so
// a single handler can render the whole page without ordering concerns.
kit.on("themeChange", render);
kit.on("modeChange", render);
kit.on("familyChange", render);

render();

// Exposed for the console — `themvora.setFamily("plum")` from devtools is the
// fastest way to confirm the page and the runtime agree.
window.themvora = kit;
