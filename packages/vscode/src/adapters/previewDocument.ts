/**
 * The host ↔ webview wire contract.
 *
 * Four messages, two each way, defined as discriminated unions so a handler
 * cannot receive a shape it does not expect. Everything crossing from the
 * webview is untrusted: {@link parseWebviewMessage} is the only way in, and it
 * returns `null` for anything unknown or malformed rather than throwing.
 *
 * @packageDocumentation
 */
import type { PreviewModel, PreviewMode } from "../domain/previewModel.js";

/**
 * Host → webview.
 *
 * Both carry a `revision`, monotonic per panel. The webview ignores anything not
 * newer than what it already applied, so a debounced refresh can never overwrite
 * a newer mode switch.
 */
export type HostToWebview =
  | { readonly type: "preview"; readonly revision: number; readonly model: PreviewModel }
  | {
      readonly type: "error";
      readonly revision: number;
      readonly message: string;
      /** `true` when a previous valid preview is still on screen. */
      readonly stale: boolean;
    };

/** Webview → host. */
export type WebviewToHost =
  | { readonly type: "ready" }
  | { readonly type: "setMode"; readonly mode: PreviewMode };

/**
 * Validate one message from the webview.
 *
 * Accepts only the two known shapes. Unknown types, wrong payload types, arrays,
 * `null` and primitives all return `null` — the caller logs and drops them. It
 * never throws, because a malformed message must not take down the host.
 *
 * @param value - Whatever arrived on the channel.
 * @returns The typed message, or `null`.
 */
export function parseWebviewMessage(value: unknown): WebviewToHost | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;

  const candidate = value as { type?: unknown; mode?: unknown };

  if (candidate.type === "ready") return { type: "ready" };

  if (candidate.type === "setMode") {
    if (candidate.mode !== "light" && candidate.mode !== "dark") return null;
    return { type: "setMode", mode: candidate.mode };
  }

  return null;
}
