/**
 * Provider-aware theme discovery.
 *
 * A provider already knows which themes it was given. This module turns that
 * collection into a grouped, variant-preserving, reactive view so a consumer can
 * build a theme picker from the provider itself instead of reaching back into a
 * separate preset catalog (`Object.entries(getPresetThemes())`) and hoping the
 * two collections agree.
 *
 * @packageDocumentation
 */
import type { ThemeDefinition, ThemeMeta, ThemeMode, ThemeTokens } from "./model";
import { getThemeFamily, getThemeMode } from "./model";
import { resolveTokens } from "./resolve";

/**
 * Provenance a theme definition declares about itself.
 *
 * Only markers the library itself writes are read — `meta.generation.kind` for
 * generator output and a `pack:<name>` tag for an installed theme pack. Nothing
 * is inferred from a theme's name, family or colours: a theme called
 * `mint-light` is not thereby a preset.
 *
 * @see {@link ProvidedThemeFamily.provenance}
 */
export type ProvidedThemeProvenance =
  | {
      /** The theme was produced by the public `generateTheme()` call. */
      kind: "generated";
      /** The generation algorithm, e.g. `"semantic-v2"`. */
      algorithm: string;
    }
  | {
      /** The theme was installed through `runtime.use({ name, themes })`. */
      kind: "pack";
      /** The pack's name, from its `pack:<name>` tag. */
      pack: string;
    };

/**
 * One variant of a theme family: a single registered theme definition.
 *
 * @typeParam T - The theme definition type used by the application.
 *
 * @see {@link ProvidedThemeFamily}
 */
export interface ProvidedThemeVariant<
  T extends ThemeDefinition = ThemeDefinition,
> {
  /** The theme's registered name, e.g. `"mint-dark"`. */
  name: string;
  /** The variant's resolved colour mode. */
  mode: ThemeMode;
  /**
   * The metadata supplied with this variant, exactly as the provider holds it.
   *
   * This is the authoritative per-variant metadata; the family-level `meta` is a
   * documented roll-up of it.
   */
  meta?: ThemeMeta;
  /**
   * The variant's semantic tokens, resolved.
   *
   * Token references, `auto()` / `contrast()` calls and expressions are already
   * evaluated, so a consumer can read a value directly (`tokens.colors?.primary`)
   * without re-running the resolver.
   */
  tokens: ThemeTokens;
  /**
   * The definition the provider holds for this variant.
   *
   * Reading a field the grouped view does not model (a custom `extends`, an
   * application-specific extension) is always possible from here.
   */
  theme: T;
}

/**
 * A discoverable theme family: every variant the provider was given for one
 * canonical family, in the order they were supplied.
 *
 * @typeParam T - The theme definition type used by the application.
 *
 * @example
 * ```tsx
 * const themes = useProvidedThemes();
 *
 * return themes.map((family) => (
 *   <fieldset key={family.id}>
 *     <legend>{family.name}</legend>
 *     {family.variants.map((variant) => (
 *       <button key={variant.name} onClick={() => setTheme(variant.name)}>
 *         {variant.mode}
 *       </button>
 *     ))}
 *   </fieldset>
 * ));
 * ```
 *
 * @see {@link normalizeProvidedThemes}
 * @see {@link createProvidedThemesSource}
 */
export interface ProvidedThemeFamily<T extends ThemeDefinition = ThemeDefinition> {
  /**
   * Stable identifier for this family.
   *
   * Derived from the canonical family identity (`meta.family`, or `"default"`),
   * so it survives a change of display label and is unique within one provider.
   */
  id: string;
  /** The canonical family identifier used for selection. */
  family: string;
  /**
   * Display name for the family: the first variant's `meta.label`, else the
   * family identifier.
   */
  name: string;
  /**
   * Roll-up of the family's metadata, taken from its first variant that carries
   * any. Per-variant values live on {@link ProvidedThemeVariant.meta}.
   */
  meta?: ThemeMeta;
  /**
   * Provenance declared by the family's first variant that declares one.
   *
   * Absent when nothing in the input declares provenance — the API never guesses
   * a source from a name.
   */
  provenance?: ProvidedThemeProvenance;
  /** The family's variants, in supplied order. Never empty. */
  variants: readonly ProvidedThemeVariant<T>[];
}

/**
 * The minimal runtime surface the discovery source needs.
 *
 * Structural rather than nominal so `ThemeRuntime` satisfies it without this
 * module importing the runtime (which would create a cycle).
 *
 * @internal
 */
export interface ProvidedThemesRuntime<T extends ThemeDefinition> {
  /** The runtime's live theme list. */
  readonly themes: readonly T[];
  /** The registry, whose notification means "the theme list changed". */
  readonly registry: { subscribe(listener: () => void): () => void };
}

/**
 * A reactive source of the themes a provider was given.
 *
 * @typeParam T - The theme definition type used by the application.
 *
 * @see {@link createProvidedThemesSource}
 */
export interface ProvidedThemesSource<T extends ThemeDefinition = ThemeDefinition> {
  /**
   * The current collection. Returns the same array instance until the
   * provider's theme collection actually changes, which is what makes it safe as
   * a `useSyncExternalStore` snapshot.
   */
  get(): readonly ProvidedThemeFamily<T>[];
  /**
   * Subscribe to changes in the collection.
   *
   * @param listener Called after the provider's theme list settles.
   * @returns An unsubscribe function.
   */
  subscribe(listener: () => void): () => void;
}

const PACK_TAG = /^pack:(.+)$/;

function declaredProvenance(meta: ThemeMeta | undefined): ProvidedThemeProvenance | undefined {
  const generation = meta?.generation;
  if (generation?.kind === "generated") {
    return { kind: "generated", algorithm: generation.algorithm };
  }

  for (const tag of meta?.tags ?? []) {
    const match = PACK_TAG.exec(tag);
    if (match?.[1]) return { kind: "pack", pack: match[1] };
  }

  return undefined;
}

/**
 * Compare two token groups structurally.
 *
 * Used only to decide whether a derived family can be reused across a provider
 * update, so it must be exact: a changed token value has to read as a change.
 * Object keys are compared as sets, so declaration order does not matter.
 */
function tokensEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
    return false;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((value, index) => tokensEqual(value, b[index]));
  }

  const aKeys = Object.keys(a as Record<string, unknown>);
  const bKeys = Object.keys(b as Record<string, unknown>);
  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!tokensEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
      return false;
    }
  }
  return true;
}

/**
 * Metadata comparison that ignores the registry's bookkeeping stamps.
 *
 * `ThemeRegistry.register()` copies each definition and fills in `meta.created` /
 * `meta.updated` with the current time. Re-registering an unchanged catalog
 * therefore produces new timestamps for identical content; treating that as a
 * content change would hand every consumer a brand-new family object on every
 * provider update. Nothing a caller supplied is ignored.
 */
function metaEqual(a: ThemeMeta | undefined, b: ThemeMeta | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return !a && !b;

  const { created: _aCreated, updated: _aUpdated, ...aRest } = a;
  const { created: _bCreated, updated: _bUpdated, ...bRest } = b;
  return tokensEqual(aRest, bRest);
}

function variantEqual<T extends ThemeDefinition>(
  a: ProvidedThemeVariant<T>,
  b: ProvidedThemeVariant<T>,
): boolean {
  if (a === b) return true;
  return (
    a.name === b.name &&
    a.mode === b.mode &&
    a.theme === b.theme &&
    metaEqual(a.meta, b.meta) &&
    tokensEqual(a.tokens, b.tokens)
  );
}

function familyEqual<T extends ThemeDefinition>(
  a: ProvidedThemeFamily<T>,
  b: ProvidedThemeFamily<T>,
): boolean {
  if (a === b) return true;
  if (
    a.id !== b.id ||
    a.family !== b.family ||
    a.name !== b.name ||
    !metaEqual(a.meta, b.meta) ||
    !tokensEqual(a.provenance, b.provenance) ||
    a.variants.length !== b.variants.length
  ) {
    return false;
  }
  return a.variants.every((variant, index) => variantEqual(variant, b.variants[index]!));
}

function createVariant<T extends ThemeDefinition>(
  theme: T,
  previous?: ProvidedThemeVariant<T>,
): ProvidedThemeVariant<T> {
  // Fast path: the provider handed back the very same definition object, so its
  // resolved tokens cannot have changed either.
  if (previous && previous.theme === theme) return previous;

  return {
    name: String(theme.name),
    mode: getThemeMode(theme),
    ...(theme.meta ? { meta: theme.meta } : {}),
    tokens: resolveTokens(theme.tokens ?? {}),
    theme,
  };
}

/**
 * Group a provider's theme collection into discoverable families.
 *
 * Preserves the supplied order of both families and variants, keeps light/dark
 * (and any other mode) as siblings rather than flattening them, and never
 * mutates or extends the input — a family appears only if a theme for it was
 * supplied.
 *
 * @typeParam T - The theme definition type used by the application.
 * @param themes - The collection the provider was given, in registration order.
 * @param previous - A previous derivation to reuse unchanged entries from.
 *   Passing the result of the last call keeps family and variant identities
 *   stable across ordinary provider updates.
 * @returns The grouped collection, ordered by first appearance.
 *
 * @example
 * ```ts
 * const families = normalizeProvidedThemes(runtime.themes);
 * const mint = families.find((family) => family.family === "mint");
 * mint?.variants.map((variant) => variant.tokens.colors?.background);
 * ```
 *
 * @see {@link createProvidedThemesSource}
 */
export function normalizeProvidedThemes<T extends ThemeDefinition>(
  themes: readonly T[],
  previous: readonly ProvidedThemeFamily<T>[] = [],
): readonly ProvidedThemeFamily<T>[] {
  const byFamily = new Map<string, ProvidedThemeVariant<T>[]>();

  for (const theme of themes) {
    const family = getThemeFamily(theme);
    const variants = byFamily.get(family);
    if (variants) {
      // A duplicate name is already deduped by the registry, but a caller can
      // hand this function any list; the first definition wins, as everywhere
      // else in the theme model.
      if (!variants.some((variant) => variant.name === theme.name)) {
        variants.push(createVariant(theme));
      }
    } else {
      byFamily.set(family, [createVariant(theme)]);
    }
  }

  const previousByFamily = new Map(previous.map((family) => [family.id, family]));
  const result: ProvidedThemeFamily<T>[] = [];

  for (const [family, variants] of byFamily) {
    const prior = previousByFamily.get(family);
    const priorVariants = new Map(
      (prior?.variants ?? []).map((variant) => [variant.name, variant]),
    );
    const stableVariants = variants.map((variant) =>
      createVariant(variant.theme, priorVariants.get(variant.name)),
    );

    const labelled = stableVariants.find((variant) => variant.meta?.label);
    const meta = stableVariants.find((variant) => variant.meta)?.meta;
    const provenance = stableVariants
      .map((variant) => declaredProvenance(variant.meta))
      .find((value): value is ProvidedThemeProvenance => value !== undefined);

    const next: ProvidedThemeFamily<T> = {
      id: family,
      family,
      name: labelled?.meta?.label ?? family,
      ...(meta ? { meta } : {}),
      ...(provenance ? { provenance } : {}),
      variants: stableVariants,
    };

    result.push(prior && familyEqual(prior, next) ? prior : next);
  }

  // A collection that is identical to the previous one keeps the previous array
  // instance, so a `useSyncExternalStore` snapshot stays referentially stable.
  if (previous.length === result.length && result.every((family, i) => family === previous[i])) {
    return previous;
  }

  return result;
}

/** One discovery source per runtime. Weak, so a destroyed provider takes its
 *  source with it. */
const sources = new WeakMap<object, ProvidedThemesSource<ThemeDefinition>>();

/**
 * One discovery source per runtime.
 *
 * Every framework binding resolves the source through here rather than creating
 * its own, so a page with five theme pickers derives the collection once. The
 * cache is weak, so a destroyed provider takes its source with it.
 *
 * @internal — the public surface is each framework's `useProvidedThemes()`.
 *
 * @param runtime - The provider's runtime.
 * @returns The runtime's shared discovery source.
 */
export function providedThemesSourceFor<T extends ThemeDefinition>(
  runtime: ProvidedThemesRuntime<T>,
): ProvidedThemesSource<T> {
  const existing = sources.get(runtime as object);
  if (existing) return existing as ProvidedThemesSource<T>;

  const source = createProvidedThemesSource(runtime);
  sources.set(runtime as object, source as ProvidedThemesSource<ThemeDefinition>);
  return source;
}

/**
 * Create a reactive source over one provider's theme collection.
 *
 * The derivation runs once per settled change to the provider's registry and is
 * cached in between, so:
 *
 * - the returned array is referentially stable while nothing changes,
 * - a `register` / `unregister` / `use` / `configure` is reflected on the next
 *   read,
 * - two providers never share a collection.
 *
 * @typeParam T - The theme definition type used by the application.
 * @param runtime - The provider's runtime.
 * @returns A source with `get()` and `subscribe()`.
 *
 * @example
 * ```ts
 * const source = createProvidedThemesSource(runtime);
 * source.subscribe(() => console.log(source.get().length));
 * ```
 *
 * @see {@link normalizeProvidedThemes}
 */
export function createProvidedThemesSource<T extends ThemeDefinition>(
  runtime: ProvidedThemesRuntime<T>,
): ProvidedThemesSource<T> {
  let cache: readonly ProvidedThemeFamily<T>[] | null = null;
  let dirty = true;

  // One invalidation listener for the lifetime of the source. It is deliberately
  // not tied to the consumer subscriptions below: a component unmounting must not
  // stop the source from noticing later changes, and the registry it listens to
  // is destroyed with the provider's runtime.
  runtime.registry.subscribe(() => {
    dirty = true;
  });

  return {
    get() {
      if (!dirty && cache) return cache;
      cache = normalizeProvidedThemes(runtime.themes, cache ?? []);
      dirty = false;
      return cache;
    },
    subscribe(listener: () => void) {
      return runtime.registry.subscribe(listener);
    },
  };
}
