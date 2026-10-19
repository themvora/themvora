"use client";

import type { ReactNode } from "react";
import {
  CONTACT_EMAIL,
  GITHUB_DISCUSSIONS,
  GITHUB_ISSUES,
  GITHUB_SECURITY,
  GITHUB_URL,
} from "../../lib/site";
import { PageMasthead, STANDALONE_SHELL } from "../../components/page-shell";
import { ContactForm } from "./contact-form";
import { LiveTokens } from "./live-tokens";

/**
 * The contact page.
 *
 * ## A contact page, not a docs page
 *
 * It deliberately does **not** use `DocsLayout` or `PageHeader`. The docs shell
 * puts a sidebar, breadcrumbs and an "on this page" rail around reference
 * material; the docs header puts a monospace eyebrow and version badges above an
 * `h1`. Both are right for `/tokens` and wrong here — a contact page is a single
 * destination whose whole job is to get someone to press send.
 *
 * So the shape is the one a contact page actually has:
 *
 *   - a centred hero that says what this is and who is behind it,
 *   - the form as the centrepiece, not one card in a grid of cards,
 *   - the other channels beside it, for people who would rather not use a form,
 *   - one quiet footer strip noting what the page is built from.
 *
 * The header and footer come from the root layout, so the page still sits inside
 * the site chrome.
 *
 * ## Tokens
 *
 * Every colour is a Themvora token — the wash behind the hero, the cards, the
 * field boundaries, the focus ring, the button. The strip at the bottom prints
 * the resolved values so the claim is checkable rather than decorative.
 */

/** Small inline icons, sized to the current font. */
const icon = (paths: ReactNode) => (
  <svg
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    {paths}
  </svg>
);

const ICONS = {
  mail: icon(
    <>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
      <path d="m3 7 8.1 5.6a1.6 1.6 0 0 0 1.8 0L21 7" />
    </>,
  ),
  chat: icon(
    <>
      <path d="M21 11.5a8 8 0 0 1-8.5 8 9 9 0 0 1-3.4-.7L4 20.5l1.3-4A8 8 0 0 1 12.5 3.5a8 8 0 0 1 8.5 8Z" />
      <path d="M9 11h.01M12.5 11h.01M16 11h.01" />
    </>,
  ),
  bug: icon(
    <>
      <rect x="8" y="6" width="8" height="12" rx="4" />
      <path d="M8 10H4m16 0h-4M8 15H4m16 0h-4M9.5 6 8 4m6.5 2L16 4M9.5 18 8 20m6.5-2 1.5 2" />
    </>,
  ),
  shield: icon(
    <>
      <path d="M12 3 5 6v5.5c0 4.2 2.9 7.9 7 9 4.1-1.1 7-4.8 7-9V6Z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </>,
  ),
  arrow: icon(<path d="M5 12h13m-5-5 5 5-5 5" />),
  clock: icon(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 1.8" />
    </>,
  ),
} as const;

interface Channel {
  label: string;
  value: string;
  note: string;
  href: string;
  icon: ReactNode;
  external: boolean;
}

const CHANNELS: readonly Channel[] = [
  {
    label: "Email",
    value: CONTACT_EMAIL,
    note: "Anything that does not fit a form.",
    href: `mailto:${CONTACT_EMAIL}`,
    icon: ICONS.mail,
    external: false,
  },
  {
    label: "Discussions",
    value: "GitHub Discussions",
    note: "Setup help, answered in the open.",
    href: GITHUB_DISCUSSIONS,
    icon: ICONS.chat,
    external: true,
  },
  {
    label: "Bug reports",
    value: "GitHub Issues",
    note: "A reproducible defect in a package.",
    href: GITHUB_ISSUES,
    icon: ICONS.bug,
    external: true,
  },
  {
    label: "Security",
    value: "Private advisories",
    note: "Never a public issue.",
    href: GITHUB_SECURITY,
    icon: ICONS.shield,
    external: true,
  },
];

const EXPECTATIONS: readonly { label: string; detail: string }[] = [
  { label: "First reply", detail: "Within one business day, usually sooner." },
  {
    label: "Maintained by",
    detail: "A small team, in the open, since day one.",
  },
  {
    label: "Licence",
    detail: "MIT — issues and pull requests welcome from anyone.",
  },
];

export function ContactView() {
  return (
    <div className="relative">
      {/* A soft wash behind the hero, in the theme's own primary. It is the one
          piece of decoration on the page, and it fades rather than fights a
          high-contrast theme. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-120"
        style={{
          background:
            "radial-gradient(60% 80% at 50% 0%, color-mix(in srgb, var(--theme-color-primary) 16%, transparent), transparent 70%)," +
            "radial-gradient(45% 60% at 82% 8%, color-mix(in srgb, var(--theme-color-accent) 22%, transparent), transparent 72%)",
        }}
      />

      <div className={`relative ${STANDALONE_SHELL}`}>
        {/* ---------------------------------------------------------------- */}
        <PageMasthead
          align="center"
          eyebrow={
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-medium"
              style={{
                background:
                  "color-mix(in srgb, var(--theme-color-primary) 12%, transparent)",
                color: "var(--theme-color-primary)",
              }}
            >
              {ICONS.chat}
              Contact
            </span>
          }
          title={<>Let&rsquo;s build better themes together.</>}
          lead={
            <>
              Questions, feedback, a bug you cannot pin down, or an idea for
              something we have not thought of — we read all of it. Everything
              here is built in the open, and the people who answer are the people
              who write the code.
            </>
          }
          actions={
            <>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center gap-1.5 text-foreground no-underline font-medium hover:decoration-foreground"
            >
              {ICONS.mail}
              {CONTACT_EMAIL}
            </a>
            <a
              href={GITHUB_DISCUSSIONS}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-foreground no-underline font-medium hover:decoration-foreground"
            >
              {ICONS.chat}
              Join a discussion
            </a>
            </>
          }
        />

        {/* ---------------------------------------------------------------- */}
        {/* The form sits on the right, where a reader's eye lands after the
            hero; the channels take the narrower left column for the people who
            would rather not use a form at all. The form comes first in the DOM
            so it is also first on a phone, where it is the primary action —
            `order` puts it back on the right once there is room for two
            columns. */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] lg:items-start">
          <div className="lg:order-2 min-w-0">
            <ContactForm />
          </div>

          <div className="lg:order-1 flex flex-col gap-6 min-w-0">
            <section>
              <h2 className="text-sm font-semibold tracking-tight mb-1">
                Prefer another channel?
              </h2>
              <p className="text-[12px] opacity-55 leading-snug mb-3">
                Each has a different job — using the right one is the fastest
                route to an answer.
              </p>
              <ul className="flex flex-col gap-2">
                {CHANNELS.map((channel) => (
                  <li key={channel.label}>
                    <a
                      href={channel.href}
                      {...(channel.external
                        ? { target: "_blank", rel: "noreferrer noopener" }
                        : {})}
                      className="group flex items-start gap-3 rounded-xl border border-border bg-card p-3 no-underline transition-all duration-150 hover:border-ring hover:-translate-y-px"
                    >
                      <span
                        className="shrink-0 w-8 h-8 grid place-items-center rounded-lg text-[15px]"
                        style={{
                          background:
                            "color-mix(in srgb, var(--theme-color-primary) 12%, transparent)",
                          color: "var(--theme-color-primary)",
                        }}
                      >
                        {channel.icon}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold tracking-tight">
                          {channel.label}
                        </span>
                        <span className="block mono text-[11px] opacity-60 break-all">
                          {channel.value}
                        </span>
                        <span className="block text-[11px] opacity-55 leading-snug mt-0.5">
                          {channel.note}
                        </span>
                      </span>

                      <span
                        className="shrink-0 self-center opacity-30 transition-all duration-150 group-hover:translate-x-0.5 group-hover:opacity-90"
                        style={{ color: "var(--theme-color-primary)" }}
                      >
                        {ICONS.arrow}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            <section
              className="rounded-xl p-4"
              style={{
                background:
                  "color-mix(in srgb, var(--theme-color-muted) 60%, transparent)",
                border: "1px solid var(--theme-color-border)",
              }}
            >
              <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight mb-4">
                <span className="opacity-60">{ICONS.clock}</span>
                What to expect
              </h2>
              <dl className="flex flex-col gap-3">
                {EXPECTATIONS.map((item) => (
                  <div
                    key={item.label}
                    className="min-w-0 pl-3 border-l-2"
                    style={{ borderColor: "var(--theme-color-primary)" }}
                  >
                    <dt className="text-[13px] font-medium">{item.label}</dt>
                    <dd className="text-[12px] opacity-60 leading-snug">
                      {item.detail}
                    </dd>
                  </div>
                ))}
              </dl>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 text-[12px] text-foreground no-underline font-medium hover:decoration-foreground mt-3.5"
              >
                Read the source →
              </a>
            </section>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* One quiet strip. The page argues that a theme is a system rather than
            a set of colours; this is the evidence, kept out of the way. */}
        <LiveTokens />
      </div>
    </div>
  );
}
