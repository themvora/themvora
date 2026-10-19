"use client";

import { useState, type ChangeEvent, type CSSProperties } from "react";
import { Select, type SelectOption } from "../../components/ui/select";
import { CONTACT_EMAIL } from "../../lib/site";

/**
 * The contact form.
 *
 * ## What it actually does
 *
 * There is no backend, so it does not pretend to have one: on submit it composes
 * a `mailto:` URL from the fields and hands it to the visitor's own mail client.
 * The message really is sent, nothing is stored, and the page says so rather than
 * showing a fake "thanks, we'll be in touch".
 *
 * ## Why it looks like this
 *
 * The field styling is the theme's own tokens — `border-input` for the resting
 * boundary, `ring-ring` for focus, `bg-background` inside a `bg-card` panel. That
 * is the point of the section above it: the form is a live demonstration, so a
 * hard-coded hex anywhere here would undercut the claim.
 */

/**
 * Shared field styling.
 *
 * ## Why the focus ring is inline
 *
 * `globals.css` puts a `:focus-visible` outline on everything, and it sits in
 * `@layer base`. Three attempts to override it from CSS all failed, and the
 * reasons are worth recording so nobody repeats them:
 *
 * - a Tailwind `outline-none` / `focus:border-*` utility *should* win, since
 *   `utilities` sorts after `base` — measured on the live page, it did not;
 * - a rule appended to `globals.css` lands inside that file's single
 *   `@layer base { ... }`, which runs to the end of the file, so "appending it
 *   last" is still `base`;
 * - a separate `@layer utilities` block did not take either.
 *
 * Rather than keep guessing at the cascade, the field owns its focus state in
 * React and applies it inline. An inline `outline: none` outranks every rule and
 * every layer, so this cannot silently regress — which is what the previous two
 * attempts did.
 *
 * The result is one edge: the resting grey border becomes the ring colour, and
 * no outline is drawn beside it.
 */
const FIELD =
  "w-full rounded-lg border-2 border-border bg-card px-3 py-2 text-sm text-foreground " +
  "placeholder:text-muted-foreground transition-colors";

const LABEL = "text-[13px] font-medium";

const TOPICS = [
  "General enquiry",
  "Technical support",
  "Bug report",
  "Documentation",
  "Feature request",
  "Partnership",
  "Something else",
] as const;

const TOPIC_OPTIONS: SelectOption[] = TOPICS.map((topic) => ({
  value: topic,
  label: topic,
}));

/** How long a message may be, so the `mailto:` URL stays a sane length. */
const MAX_MESSAGE = 1500;

export function ContactForm() {
  const [topic, setTopic] = useState<string>(TOPICS[1]);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  /** Inline focus style — see the note on `FIELD`. */
  const ringFor = (field: string): CSSProperties | undefined =>
    focused === field
      ? { outline: "none", borderColor: "var(--theme-color-ring)" }
      : undefined;

  /** Focus/blur handlers for one field. */
  const focusProps = (field: string) => ({
    onFocus: () => setFocused(field),
    onBlur: () => setFocused(null),
  });

  function handleSubmit(event: ChangeEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const body = String(data.get("message") ?? "").trim();

    const subject = `[Themvora] ${topic}${name ? ` — ${name}` : ""}`;
    const composed = `${body}\n\n—\n${name}\n${email}`;

    window.location.href =
      `mailto:${CONTACT_EMAIL}` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(composed)}`;

    setSent(true);
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden min-w-0">
      {/* A one-pixel brand rule. Cheap, and it is the only decoration the panel
          needs — the tokens do the rest. */}
      <div
        className="h-1"
        style={{
          background:
            "linear-gradient(90deg, var(--theme-color-primary), var(--theme-color-accent))",
        }}
      />

      <div className="p-5 sm:p-6">
        <div className="mb-5">
          <div className="text-lg font-semibold tracking-tight">
            Send us a message
          </div>
          <p className="text-[13px] opacity-60 leading-snug mt-1">
            Fill this in and it opens in your own mail client — nothing is
            stored on a server, and no account is needed.
          </p>
        </div>

        {sent ? (
          <div
            className="rounded-lg p-4"
            style={{
              background:
                "color-mix(in srgb, var(--theme-color-success) 10%, transparent)",
              border: "1px solid var(--theme-color-border)",
            }}
          >
            <div className="font-medium text-sm">
              Your mail client should be open.
            </div>
            <p className="text-[13px] opacity-70 leading-snug mt-1">
              If nothing happened, write to{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="underline break-all"
              >
                {CONTACT_EMAIL}
              </a>{" "}
              directly.
            </p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="btn btn-ghost btn-sm mt-3"
            >
              Write another
            </button>
          </div>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 min-w-0">
                <label htmlFor="contact-name" className={LABEL}>
                  Name
                </label>
                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Your name"
                  className={FIELD}
                  style={ringFor("name")}
                  {...focusProps("name")}
                />
              </div>

              <div className="flex flex-col gap-1.5 min-w-0">
                <label htmlFor="contact-email" className={LABEL}>
                  Email
                </label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={FIELD}
                  style={ringFor("email")}
                  {...focusProps("email")}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 min-w-0">
              {/* A `<span>`, not a `<label htmlFor>`: `Select` is a button-based
                  combobox, so there is no form control to point at. The
                  accessible name comes from its `label` prop. */}
              <span className={LABEL}>Topic</span>
              <Select
                value={topic}
                onChange={setTopic}
                options={TOPIC_OPTIONS}
                label="Topic"
                className="w-full"
              />
            </div>

            <div className="flex flex-col gap-1.5 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor="contact-message" className={LABEL}>
                  Message
                </label>
                <span
                  className={`mono text-[10px] ${
                    message.length > MAX_MESSAGE * 0.9
                      ? "text-destructive"
                      : "opacity-45"
                  }`}
                >
                  {message.length}/{MAX_MESSAGE}
                </span>
              </div>
              <textarea
                id="contact-message"
                name="message"
                required
                rows={6}
                maxLength={MAX_MESSAGE}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="What are you building, and what is getting in the way? A package version and a small reproduction help a lot."
                className={`${FIELD} resize-none min-h-36`}
                style={ringFor("message")}
                {...focusProps("message")}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full mt-1"
            >
              Send message
            </button>

            <p className="text-[11px] opacity-50 leading-snug">
              Security issue? Use{" "}
              <span className="mono">GitHub Security Advisories</span> instead —
              a public message cannot be un-published.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
