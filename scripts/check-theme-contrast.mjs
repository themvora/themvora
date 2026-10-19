/**
 * Enforces the semantic contrast contract for every built-in theme.
 *
 * ## Why this is a check and not a report
 *
 * The preset pages display these ratios. Before this existed, six distinct pairs were
 * failing across the built-in themes — `successForeground/success` at **3.30:1 in
 * seventeen themes**, plus `destructiveForeground`, `mutedForeground`,
 * `secondaryForeground`, `accentForeground` and `primaryForeground`.
 *
 * The pages were showing the failures, which is honest, but a preset gallery that
 * knowingly displays palettes violating their own semantic contract is advertising
 * the defect. The ratios are now enforced at the point themes are built, and this
 * check keeps them enforced.
 *
 * ## What it asserts
 *
 * For every built-in theme, every semantic foreground/background pair meets the WCAG
 * AA floor of **4.5:1** for normal text.
 *
 * Read-only. Run: node scripts/check-theme-contrast.mjs
 */
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const REPO = join(import.meta.dirname, "..");

/** WCAG relative luminance. */
function relativeLuminance(hex) {
  const h = hex.replace("#", "");
  const linear = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const [r = 0, g = 0, b = 0] = [0, 2, 4].map((k) => linear(parseInt(h.slice(k, k + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colors. */
function contrastRatio(a, b) {
  const [hi = 1, lo = 0] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Every pair the semantic system promises to keep readable. */
const PAIRS = [
  ["foreground", "background"],
  ["cardForeground", "card"],
  ["popoverForeground", "popover"],
  ["primaryForeground", "primary"],
  ["secondaryForeground", "secondary"],
  ["accentForeground", "accent"],
  ["mutedForeground", "muted"],
  ["destructiveForeground", "destructive"],
  ["successForeground", "success"],
  ["warningForeground", "warning"],
];

const AA_NORMAL_TEXT = 4.5;

const core = await import(
  pathToFileURL(join(REPO, "packages", "core", "dist", "index.js")).href
);
const themes = core.getBuiltInThemes();

const failures = [];
let checked = 0;

for (const theme of themes) {
  const colors = theme.tokens?.colors ?? {};
  for (const [fgKey, bgKey] of PAIRS) {
    const fg = colors[fgKey];
    const bg = colors[bgKey];
    if (typeof fg !== "string" || typeof bg !== "string") continue;
    checked += 1;
    const ratio = contrastRatio(fg, bg);
    if (ratio < AA_NORMAL_TEXT) {
      failures.push(
        `${theme.name}  ${fgKey}/${bgKey}  ${ratio.toFixed(2)}:1  (fg=${fg} bg=${bg})`,
      );
    }
  }
}

console.log(`themes: ${themes.length}   pairs checked: ${checked}`);

if (failures.length) {
  console.log(`\nFAIL  ${failures.length} pair(s) below ${AA_NORMAL_TEXT}:1:`);
  for (const f of failures.slice(0, 20)) console.log("  -", f);
  if (failures.length > 20) console.log(`  ... ${failures.length - 20} more`);
  console.log("\nA preset page must not display a palette that fails its own contract.");
  process.exit(1);
}

console.log(`PASS  every semantic pair meets ${AA_NORMAL_TEXT}:1 across all ${themes.length} themes`);
