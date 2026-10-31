/**
 * Resolving the sidebar webview the way VS Code does.
 *
 * A webview view does nothing until the host calls `resolveWebviewView`, and
 * everything a refresh produces is posted through the object handed to it. Tests
 * that assert on *what the sidebar was told* have to perform that step, so it
 * lives here instead of being rebuilt in each file.
 *
 * @packageDocumentation
 */
import { __state } from "../stubs/vscode";

/** The messages a resolved sidebar received, and a way to post to it. */
export interface ResolvedWorkspaceView {
  /** Every message the host posted, in order. */
  readonly messages: unknown[];
  /** The messages of one type, for assertions that do not care about others. */
  ofType(type: string): { type: string }[];
  /** Post a message as the webview would. */
  send(message: unknown): void;
  /** The HTML the view was given. */
  readonly html: string;
}

/**
 * Resolve the registered sidebar provider and record what it posts.
 *
 * @param options - `ready` posts the webview's `ready` message immediately,
 *   which is what triggers the first state render.
 * @returns The recorded view.
 */
export function resolveWorkspaceView(options: { ready?: boolean } = {}): ResolvedWorkspaceView {
  const provider = __state.webviewViewProviders.find(
    (entry) => entry.id === "themvora.workspace",
  )?.provider as { resolveWebviewView(view: unknown): void } | undefined;

  if (provider === undefined) throw new Error("no workspace view provider registered");

  const messages: unknown[] = [];
  let html = "";
  let handler: ((message: unknown) => void) | undefined;

  provider.resolveWebviewView({
    webview: {
      options: {},
      get html(): string {
        return html;
      },
      set html(value: string) {
        html = value;
      },
      cspSource: "vscode-webview:",
      asWebviewUri: (uri: { toString(): string }) => uri,
      onDidReceiveMessage(callback: (message: unknown) => void) {
        handler = callback;
        return { dispose() {} };
      },
      postMessage(message: unknown) {
        messages.push(message);
        return Promise.resolve(true);
      },
    },
    onDidDispose() {
      return { dispose() {} };
    },
  });

  const view: ResolvedWorkspaceView = {
    messages,
    ofType(type: string) {
      return messages.filter(
        (message): message is { type: string } =>
          typeof message === "object" && message !== null && (message as { type?: unknown }).type === type,
      );
    },
    send(message: unknown) {
      handler?.(message);
    },
    get html() {
      return html;
    },
  };

  if (options.ready === true) view.send({ type: "ready" });

  return view;
}
