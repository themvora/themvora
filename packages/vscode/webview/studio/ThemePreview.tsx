/**
 * The Components scenario.
 *
 * The panel, the Studio and the Create drawer all render the same gallery from
 * `previewSurfaceMarkup`; this wrapper only adapts Studio props to it. The
 * Dashboard has its own wrapper over `dashboardMarkup`.
 */
import type { StudioPreviewSurface, StudioToken } from "../../src/shared/studioProtocol";
import { SurfaceHost } from "./SurfaceHost";

/** Props for the components preview. */
export interface ThemePreviewProps {
  readonly tokens: readonly StudioToken[];
  readonly mode?: string;
  readonly family?: string;
  /** The host's model for these tokens, for the header facts. */
  readonly surface?: StudioPreviewSurface;
  /** The label the Theme Preview panel shows for the same theme. */
  readonly source?: string;
  readonly highlight?: string;
  /** A denser layout for comparison panels. */
  readonly compact?: boolean;
  /** Hover-to-inspect is armed from the toolbar. */
  readonly inspect?: boolean;
  /** Called when a rendered region is inspected. */
  readonly onRegion?: (id: string) => void;
  /** Called with a camel-case role when an inspect click lands. */
  readonly onToken?: (role: string) => void;
}

/**
 * The components gallery.
 *
 * @param props - The resolved tokens and presentation flags.
 * @returns The preview.
 */
export function ThemePreview(props: ThemePreviewProps): React.JSX.Element {
  return <SurfaceHost kind="components" {...props} />;
}
