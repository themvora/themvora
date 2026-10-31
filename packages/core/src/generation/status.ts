/**
 * Status generator — `destructive`, `success` and their foregrounds.
 *
 * Status colors are **independent of the brand seed**. A destructive button is
 * red because red means danger, not because the brand is red. Deriving them from
 * the primary hue (e.g. `primary + 150°`) is how a blue brand ends up with a
 * green "delete" button — theme-generation.md §1 forbids it.
 *
 * Hues are fixed OKLCH angles: red ≈ 27°, amber ≈ 75°, green ≈ 148°, blue ≈ 250°.
 * `warning` and `info` are *optional* roles (`model/semantic-roles.ts`) and are
 * not emitted into a generated theme's core token set.
 *
 * @packageDocumentation
 */
import { gamutMapOklch, type Oklch } from "../color";
import { chooseForeground } from "./foreground-policy";
import type { PaletteContext, StatusRoles } from "./types";

/** Fixed OKLCH hue angles for the status families. Never seeded from the brand. */
export const STATUS_HUES = {
  /** Red family. */
  destructive: 27,
  /** Amber family. */
  warning: 75,
  /** Green family. */
  success: 148,
  /** Blue/cyan family. */
  info: 250,
} as const;

/** Light-mode status surfaces. Lightness low enough for white text to pass AA 4.5:1. */
const LIGHT_DESTRUCTIVE = { l: 0.50, c: 0.2 } as const;
const LIGHT_SUCCESS = { l: 0.50, c: 0.15 } as const;
/** Dark-mode status surfaces. Lightness low enough for white text to pass AA 4.5:1. */
const DARK_DESTRUCTIVE = { l: 0.55, c: 0.21 } as const;
const DARK_SUCCESS = { l: 0.55, c: 0.16 } as const;

/** Generate the status roles for a mode. */
export function generateStatus(ctx: PaletteContext): StatusRoles {
  const isLight = ctx.mode === "light";

  const destructiveSpec = isLight ? LIGHT_DESTRUCTIVE : DARK_DESTRUCTIVE;
  const successSpec = isLight ? LIGHT_SUCCESS : DARK_SUCCESS;

  const destructive = gamutMapOklch({
    l: destructiveSpec.l,
    c: destructiveSpec.c,
    h: STATUS_HUES.destructive,
  });
  const success = gamutMapOklch({
    l: successSpec.l,
    c: successSpec.c,
    h: STATUS_HUES.success,
  });

  return {
    destructive,
    destructiveForeground: chooseForeground("destructiveForeground", destructive, ctx),
    success,
    successForeground: chooseForeground("successForeground", success, ctx),
  };
}

/** The status surface colors, for the separation checks. */
export function statusSurfaces(ctx: PaletteContext): Oklch[] {
  const roles = generateStatus(ctx);
  return [roles.destructive, roles.success];
}
