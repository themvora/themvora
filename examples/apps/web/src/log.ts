/**
 * The event log.
 *
 * The elements are registered by a blocking script in `<head>`, so they upgrade
 * while the parser builds the body — before any module runs. `index.html`
 * therefore installs a small bridge that buffers the boot diagnostic and
 * `theme-ready`, forwards to the real console, and hands over to this module as
 * soon as it loads. This file drains that buffer and becomes the sink.
 *
 * Kept dependency-free so the hand-over stays obvious.
 */

type Tone = "info" | "good" | "warn" | "bad";

interface Entry {
  readonly at: number;
  readonly channel: string;
  readonly message: string;
  readonly tone: Tone;
}

type EarlyEntry = [channel: string, message: string, tone: Tone];

declare global {
  interface Window {
    /** Filled by the bridge in `index.html` until this module takes over. */
    __tvEarlyLog?: EarlyEntry[];
    /** Set by this module; the bridge pushes here afterwards. */
    __tvLogSink?: (channel: string, message: string, tone: Tone) => void;
  }
}

const MAX_ROWS = 80;

const list = document.querySelector<HTMLOListElement>("#log");
const entries: Entry[] = [];

function row(entry: Entry): HTMLLIElement {
  const li = document.createElement("li");
  li.className = `log-row log-row-${entry.tone}`;

  const time = document.createElement("span");
  time.className = "log-time";
  time.textContent = `${entry.at.toFixed(0)}ms`;

  const channel = document.createElement("span");
  channel.className = "log-channel";
  channel.textContent = entry.channel;

  const message = document.createElement("span");
  message.className = "log-message";
  message.textContent = entry.message;

  li.append(time, channel, message);
  return li;
}

/** Appends one row. `tone` drives the colour, never the content. */
export function log(
  channel: string,
  message: string,
  tone: Tone = "info",
): void {
  const entry: Entry = { at: performance.now(), channel, message, tone };
  entries.push(entry);

  if (!list) return;
  // The markup ships one "waiting for the provider…" row so the panel is never
  // empty before the first event. It stops being true the moment a real row
  // exists, so it goes with the first one.
  list.querySelector("[data-log-placeholder]")?.remove();
  list.append(row(entry));

  while (entries.length > MAX_ROWS && list.firstElementChild) {
    entries.shift();
    list.firstElementChild.remove();
  }

  list.scrollTop = list.scrollHeight;
}

/** Empties the panel, keeping a marker so the user sees the action landed. */
export function clearLog(): void {
  entries.length = 0;
  if (!list) return;
  list.replaceChildren();
  log("log", "cleared", "info");
}

/**
 * Takes over from the bridge in `index.html`.
 *
 * Everything the parser produced before this module ran is replayed first, in
 * order, so the panel reads as one continuous timeline. From then on the bridge
 * calls `log()` directly.
 */
for (const [channel, message, tone] of window.__tvEarlyLog ?? []) {
  log(channel, message, tone);
}
window.__tvEarlyLog = [];
window.__tvLogSink = (channel, message, tone) => log(channel, message, tone);
