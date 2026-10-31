/**
 * The one host both preview scenarios share.
 *
 * The markup comes from the same modules the Theme Preview panel inlines, the
 * colours come from the same 21-role contract, and the behaviour comes from the
 * same controller. The Studio therefore cannot drift from the panel: it uses
 * the panel's code, not a lookalike.
 *
 * The wrapper is the token boundary. Only the short role properties are set on
 * it, every role is set (missing ones to `initial`), and every rule below it
 * reads those or an sRGB mix of two. No host variable reaches the preview.
 */
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";

import {
  mountPreview,
  type PreviewController,
  type PreviewElement,
} from "../../src/shared/previewController";
import { dashboardMarkup } from "../../src/shared/dashboardSurface";
import {
  previewRoleStyle,
} from "../../src/shared/previewTokens";
import {
  previewSurfaceMarkup,
  type PreviewSurfaceContent,
} from "../../src/shared/previewSurface";
import type {
  StudioPreviewSurface,
  StudioToken,
} from "../../src/shared/studioProtocol";
import { PREVIEW_REGION_BY_ID } from "./previewMap";

/** Which scenario to paint. */
export type SurfaceKind = "dashboard" | "components";

/** Props shared by the two scenario wrappers. */
export interface SurfaceHostProps {
  readonly kind: SurfaceKind;
  readonly tokens: readonly StudioToken[];
  readonly mode?: string;
  readonly family?: string;
  readonly surface?: StudioPreviewSurface;
  readonly source?: string;
  readonly highlight?: string;
  /** A denser layout for comparison panels. */
  readonly compact?: boolean;
  /** Hover-to-inspect is armed. */
  readonly inspect?: boolean;
  readonly onRegion?: (id: string) => void;
  /** Called with a camel-case role when an inspect click lands. */
  readonly onToken?: (role: string) => void;
  /** Log painted colours that do not derive from tokens. */
  readonly dev?: boolean;
}

/** Controls that keep their own click behaviour inside a region. */
const CONTROL = "button, a, input, select, textarea, [role='tab'], [role='menuitem']";

/**
 * Painter of the shared preview surfaces.
 *
 * @param props - The theme, presentation and callbacks.
 * @returns The `.tvp` root and its markup.
 */
export function SurfaceHost({
  kind,
  tokens,
  mode,
  family,
  surface,
  source,
  highlight,
  compact = false,
  inspect = false,
  onRegion,
  onToken,
  dev = false,
}: SurfaceHostProps): React.JSX.Element {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<PreviewController | null>(null);
  const tokenHandler = useRef(onToken);
  tokenHandler.current = onToken;
  const prefix = useId();

  const style = useMemo(
    () =>
      previewRoleStyle(
        tokens.map((token) => ({ role: token.name, value: token.value })),
      ) as React.CSSProperties,
    [tokens],
  );

  const content = useMemo((): PreviewSurfaceContent => {
    const concreteMode = mode ?? surface?.mode ?? "";
    return {
      themeName: surface?.themeName?.trim() || family || "Theme",
      family: family ?? surface?.family ?? "",
      contrast: surface?.contrast ?? "",
      mode: concreteMode,
      modeLabel:
        surface?.systemMode === true && concreteMode.length > 0
          ? `system → ${concreteMode}`
          : concreteMode,
      source: source ?? "",
      roles: tokens.map((token) => ({ role: token.name, value: token.value })),
      modes: surface?.modes ?? [],
    };
  }, [tokens, mode, family, surface, source]);

  const markup = useMemo(
    () =>
      kind === "dashboard"
        ? dashboardMarkup({ idPrefix: prefix })
        : previewSurfaceMarkup(content, { ids: false, compact }),
    [kind, prefix, content, compact],
  );

  // The surface changes when the selected theme changes. Rather than patch the
  // old DOM, remount on the new markup: the controller's listeners and the
  // markup are replaced together, so no stale node keeps an old listener.
  useLayoutEffect(() => {
    const root = host.current;
    if (root === null) return;
    const mounted = mountPreview(root as unknown as PreviewElement, {
      inspect,
      animate: !compact,
      dev,
      onToken: (role) => tokenHandler.current?.(role),
    });
    controller.current = mounted;
    return () => {
      mounted.destroy();
      controller.current = null;
    };
    // `inspect` is synced by the effect below, so a toggle does not remount the
    // surface and lose the chart's selected range. That is why it is not in the
    // dependency list.
  }, [markup, compact]);

  useEffect(() => {
    controller.current?.setInspect(inspect);
  }, [inspect, markup]);

  // Swatch-free inspection: region affordances are applied after each render
  // because the markup is injected rather than composed in JSX.
  useLayoutEffect(() => {
    const root = host.current;
    if (root === null) return;

    for (const element of root.querySelectorAll<HTMLElement>(
      "[data-preview-region]",
    )) {
      const region = PREVIEW_REGION_BY_ID.get(element.dataset.previewRegion ?? "");
      element.classList.toggle(
        "tvp-highlighted",
        highlight !== undefined && region?.tokens.includes(highlight) === true,
      );

      // Inputs are already focusable, and a region that holds controls or
      // announces its own role (the chart is an image) keeps that role.
      const ownRole = element.getAttribute("role");
      if (
        element.tagName === "INPUT" ||
        element.querySelector(CONTROL) !== null ||
        (ownRole !== null && ownRole !== "button")
      ) {
        element.removeAttribute("role");
        element.removeAttribute("tabindex");
        element.removeAttribute("aria-label");
        delete element.dataset.inspect;
        continue;
      }
      if (onRegion === undefined) {
        element.removeAttribute("role");
        element.removeAttribute("tabindex");
        element.removeAttribute("aria-label");
        delete element.dataset.inspect;
      } else {
        element.setAttribute("role", "button");
        element.tabIndex = 0;
        element.setAttribute("aria-label", `Inspect ${region?.label ?? "region"}`);
        element.dataset.inspect = "";
      }
    }
  }, [markup, highlight, onRegion]);

  const regionFrom = (target: EventTarget | null): string | undefined => {
    if (!(target instanceof Element) || host.current === null) return undefined;
    if (target.closest(CONTROL) !== null) return undefined;
    const region = target.closest<HTMLElement>("[data-preview-region]");
    if (region === null || !host.current.contains(region)) return undefined;
    return region.dataset.previewRegion;
  };

  return (
    <div
      ref={host}
      className={`tvp${compact ? " tvp-compact" : ""}`}
      style={style}
      {...(mode === undefined ? {} : { "data-mode": mode })}
      data-surface={kind}
      onClick={(event) => {
        if (onRegion === undefined) return;
        const id = regionFrom(event.target);
        if (id === undefined) return;
        event.stopPropagation();
        onRegion(id);
      }}
      onKeyDown={(event) => {
        if (
          onRegion === undefined ||
          (event.key !== "Enter" && event.key !== " ")
        )
          return;
        if (
          !(event.target instanceof HTMLElement) ||
          event.target.dataset.inspect === undefined
        )
          return;
        const id = event.target.dataset.previewRegion;
        if (id === undefined) return;
        event.preventDefault();
        event.stopPropagation();
        onRegion(id);
      }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
