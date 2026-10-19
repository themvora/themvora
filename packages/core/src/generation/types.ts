/**
 * Shared types for the semantic palette engine.
 *
 * @packageDocumentation
 */
import type { Oklch } from "../color";
import type { CoreColor } from "../model/semantic-roles";
import type { ThemeIdentity } from "./identity";
import type { StyleParams } from "./styles";

/** A generation mode. Light and dark are generated independently (Phase 4). */
export type Mode = "light" | "dark";

/**
 * Everything a generator needs: which mode, what the seed means, and which
 * style is in force. Generators are pure functions of this context, which is
 * what makes generation deterministic.
 */
export interface PaletteContext {
  /** The mode being generated. */
  mode: Mode;
  /** The resolved seed identity. */
  identity: ThemeIdentity;
  /** The style parameters. */
  style: StyleParams;
  /**
   * Roles pinned to an exact brand value.
   *
   * A brand preset supplies these from its published reference palette. The
   * generator emits the anchor exactly rather than clamping it into the style's
   * band; the contrast solver may still move one if a contract pair fails, and
   * reports that it did rather than doing it silently.
   */
  anchors?: Partial<Record<CoreColor, Oklch>>;
}

/** The roles the surface generator emits. */
export interface SurfaceRoles {
  background: Oklch;
  card: Oklch;
  popover: Oklch;
  muted: Oklch;
  secondary: Oklch;
}

/** The roles the content (text) generator emits. */
export interface ContentRoles {
  foreground: Oklch;
  cardForeground: Oklch;
  popoverForeground: Oklch;
  secondaryForeground: Oklch;
  mutedForeground: Oklch;
}

/** The roles the action generator emits. */
export interface ActionRoles {
  primary: Oklch;
  primaryForeground: Oklch;
  accent: Oklch;
  accentForeground: Oklch;
}

/** The roles the status generator emits. */
export interface StatusRoles {
  destructive: Oklch;
  destructiveForeground: Oklch;
  success: Oklch;
  successForeground: Oklch;
}

/** The roles the interaction generator emits. */
export interface InteractionRoles {
  border: Oklch;
  input: Oklch;
  ring: Oklch;
}

/**
 * A complete set of role candidates, before contrast solving.
 *
 * The intersection of the five generators' outputs — which is exactly the 21
 * core roles. Typing it this way means the composer cannot silently drop a role.
 */
export type Palette = SurfaceRoles &
  ContentRoles &
  ActionRoles &
  StatusRoles &
  InteractionRoles;

/** A partial set, for generators that only fill part of a palette. */
export type PartialPalette = Partial<Palette>;
