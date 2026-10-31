/**
 * The Dashboard scenario.
 *
 * A complete analytics surface painted from the theme's 21 roles: sidebar, top
 * bar, KPI cards, revenue chart, goal donut, orders table and activity. The
 * markup is static and synthetic; the controller supplies the range switch,
 * chart hover, inspect overlay and first-paint entrance.
 */
import type { StudioPreviewSurface, StudioToken } from "../../src/shared/studioProtocol";
import { SurfaceHost } from "./SurfaceHost";

/** Props for the dashboard preview. */
export interface DashboardPreviewProps {
  readonly tokens: readonly StudioToken[];
  readonly mode?: string;
  readonly family?: string;
  readonly surface?: StudioPreviewSurface;
  readonly source?: string;
  readonly highlight?: string;
  readonly compact?: boolean;
  readonly inspect?: boolean;
  readonly onRegion?: (id: string) => void;
  readonly onToken?: (role: string) => void;
}

/**
 * The dashboard.
 *
 * @param props - The resolved tokens and presentation flags.
 * @returns The preview.
 */
export function DashboardPreview(props: DashboardPreviewProps): React.JSX.Element {
  return <SurfaceHost kind="dashboard" {...props} />;
}
