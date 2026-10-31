/**
 * The VS Code webview API, typed at the one boundary the browser owns.
 */
import type { StudioIntent } from "../../src/shared/studioProtocol";

/** The VS Code API surface this webview uses. */
interface VsCodeApi {
  postMessage(message: StudioIntent): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

/** The single acquired API handle. */
export const host = acquireVsCodeApi();
