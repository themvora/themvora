# Security Policy

## Supported versions

Each package is supported at its latest published release. The packages are
versioned independently — `@themvora/core` and `@themvora/web` on the 1.x
foundation line, the framework integrations and adapters on 2.x — so check the
version you have installed rather than assuming a single repository-wide number.
Security fixes are released on the current line; older majors do not receive
backports unless an advisory affects them specifically.

## Reporting a vulnerability

**Please report privately. Do not open a public issue, discussion, or pull
request for a security problem.**

- **Primary channel — GitHub Security Advisories:**
  <https://github.com/themvora/themvora/security/advisories> — use the
  **Report a vulnerability** button there. This creates a private advisory that
  only the maintainers can see, and it is the fastest route to a fix and a
  coordinated disclosure.
- **Email:** <themvoraproductions@gmail.com> — for reports that cannot use the
  advisory system. Use a descriptive subject line and include as much detail as
  you can.

If you are unsure whether something is a vulnerability, use one of the private
channels anyway; we would rather triage a non-issue than miss a real one.

### What to include

- The affected package and version, and the framework integration if relevant.
- A minimal reproduction — a repository, a snippet, or exact steps.
- The impact you believe it has, and any preconditions (for example "requires
  the application to accept user-supplied theme definitions").
- Whether you intend to disclose publicly, and on what timeline.

### What to expect

1. We acknowledge receipt within a few business days.
2. We triage, confirm severity, and identify affected versions.
3. We prepare and release a fix through the normal release process. Critical
   issues may warrant an immediate patch release.
4. We publish the advisory once the fix is available, with credit to the
   reporter if they want it.

## Scope

### In scope

- The published `@themvora/*` packages: core, the framework integrations
  (React, Next, Vue, Nuxt, Svelte, Solid, Angular, Astro, Remix), the
  component-library adapters, the CLI, devtools and web components.
- **The inline bootstrap script and the pre-paint CSS.** These are emitted into
  your application's HTML and execute before your own code. Injection into them
  is a vulnerability in Themvora, not in the application.
- The CLI's code generation and its path guards — anything that writes outside
  the project you asked it to modify.

### Out of scope

- Vulnerabilities in the frameworks Themvora integrates with (Next.js, Nuxt,
  Astro, React, Angular, …). Report those upstream.
- Transitive advisories in framework peer dependencies. The `@themvora/*`
  packages have no third-party runtime dependencies apart from `tslib` in
  `@themvora/angular`; the advisory tree of your application is determined by
  the frameworks you choose.
- Applications that pass untrusted input to options documented as accepting
  **trusted markup** — see the note below.

## Trust boundaries worth knowing

Themvora treats _theme definitions_ as trusted application code. They are
TypeScript/JavaScript objects that ship with your build, and the library encodes
them for the output context they are written into (script, style, CSS value), but
it does not sandbox them. If your application accepts theme definitions from
users or third parties, treat that data as untrusted input and validate it
before registering it.

One public option accepts markup by design: the scrollbar `arrowIcon` (and its
per-direction variants) is inserted with `insertAdjacentHTML`, so it accepts
**trusted HTML/SVG markup only**. Never pass user-controlled content to it; pass
a DOM `Node` instead if the value is not fully trusted.

## Security work already done

`Themvora Security & Reliability Remediation.md` at the repository root records
the findings of the last review, what was fixed, and the regression tests that
cover each one. It is a useful starting point if you are auditing the library.
