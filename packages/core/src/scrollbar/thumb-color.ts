/**
 * Scrollbar thumb colour selection.
 *
 * ## Why this is its own module
 *
 * It used to live inside `manager.ts`, which touches `document` and
 * `getComputedStyle` and therefore cannot be unit-tested. The selection rule is
 * the part with a contract attached — `scrollbar-thumb-on-canvas` in
 * `generation/contexts.ts` — so it belongs somewhere a test can reach it.
 *
 * ## The rule
 *
 * The thumb is **interaction at low visual weight**, not a brand element. It is
 * the only thing telling a reader where they are in a document, so it has to be
 * *visible*; whether it is also on-brand is a preference that gives way.
 *
 * Candidates are therefore tried in identity order — `primary`, `accent`,
 * `foreground` — and the first one that clears the non-text floor against the
 * canvas wins. `primary` is a candidate, not a promise. `foreground` is the
 * guaranteed floor, because `foreground` on `background` is a required text pair
 * and clears 4.5:1 in every shipped theme.
 *
 * ## What this replaced
 *
 * "The first of `primary → accent → foreground → text` that exists", with no
 * visibility check and a `text` role Themvora does not define. In Slack dark
 * that produced a purple thumb on a near-black canvas at **1.42:1**.
 *
 * @packageDocumentation
 */

/**
 * The non-text floor a scrollbar thumb must clear against the canvas.
 *
 * WCAG 2.1 AA for a non-text affordance.
 */
export const THUMB_CONTRAST_FLOOR = 3;

/**
 * The roles a thumb may be drawn from, in preference order.
 *
 * A chain rather than a rule, because the choice is a *search*: the first
 * candidate that satisfies the `scrollbar-thumb-on-canvas` context wins.
 *
 * ```
 * primary    -> clears the floor?  yes -> use it
 *            ->                    no  -> next
 * accent     -> clears the floor?  yes -> use it
 *            ->                    no  -> next
 * foreground -> clears the floor?  always -> use it
 * ```
 *
 * `foreground` is last because it is the reading colour: guaranteed visible on
 * the canvas, and the least interesting choice. `primary` is first because brand
 * identity is the *preference* — but a preference, not a promise.
 *
 * ## The integration never modifies the theme
 *
 * If `primary` is unsuitable, the fix is to move down the chain. Repainting
 * `primary` so the scrollbar can use it would be backwards: the theme is correct
 * and the consumer chose a colour its context does not support. That is the same
 * rule the docs migration follows — change the consumer, not the generator.
 */
export const SCROLLBAR_THUMB_CANDIDATES = ["primary", "accent", "foreground"] as const;

/** Parse `#rgb` / `#rrggbb` into an 8-bit RGB triple, or `null`. */
export function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.trim().replace(/^#/, "");
  if (/^[0-9a-f]{6}$/i.test(m)) {
    const n = parseInt(m, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  if (/^[0-9a-f]{3}$/i.test(m)) {
    const n = parseInt(
      m
        .split("")
        .map((c) => c + c)
        .join(""),
      16,
    );
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  return null;
}

/** WCAG relative luminance of an 8-bit RGB triple. */
export function luminance([r, g, b]: [number, number, number]): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two 8-bit RGB triples. */
export function contrast(a: [number, number, number], b: [number, number, number]): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Pick the thumb colour from a theme's semantic colours.
 *
 * @param colors - The active theme's `tokens.colors` (or a CSS-variable map).
 * @returns The thumb colour, or `null` when no usable role is present.
 */
export function pickThumbColor(
  colors: Record<string, unknown>,
): [number, number, number] | null {
  const canvasHex = colors.background;
  const canvas = typeof canvasHex === "string" ? hexToRgb(canvasHex) : null;

  // Identity order: brand first, the reading colour last as the guaranteed floor.
  const candidates = SCROLLBAR_THUMB_CANDIDATES.map((role) =>
    typeof colors[role] === "string" ? hexToRgb(colors[role] as string) : null,
  );

  if (canvas) {
    for (const candidate of candidates) {
      if (candidate && contrast(candidate, canvas) >= THUMB_CONTRAST_FLOOR) return candidate;
    }
  }

  // Unreachable for a well-formed theme: `foreground`/`background` is a required
  // text pair. Return it anyway rather than inventing a colour that belongs to no
  // theme — a wrong-but-themed thumb beats a right-but-foreign one.
  const reading = candidates[2];
  if (reading) return reading;
  for (const candidate of candidates) if (candidate) return candidate;
  return null;
}

/**
 * Pick the thumb colour from already-parsed candidates.
 *
 * The CSS-variable path cannot hand over a theme object, so it parses the
 * variables first and calls this.
 *
 * @param candidates - Candidate colours in identity order.
 * @param canvas - The canvas colour, when it could be read.
 * @returns The chosen colour, or `null` when there are no candidates.
 */
export function pickThumbFromCandidates(
  candidates: Array<[number, number, number] | null>,
  canvas: [number, number, number] | null,
): [number, number, number] | null {
  if (canvas) {
    for (const candidate of candidates) {
      if (candidate && contrast(candidate, canvas) >= THUMB_CONTRAST_FLOOR) return candidate;
    }
  }
  const reading = candidates[2];
  if (reading) return reading;
  for (const candidate of candidates) if (candidate) return candidate;
  return null;
}
