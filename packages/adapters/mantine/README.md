# @themvora/mantine
Mantine adapter for Themvora.
## Install
```bash
npm install @themvora/core @themvora/react @themvora/mantine @mantine/core @mantine/hooks
```
## Set up

```tsx
import { ThemeProvider, useThemeRuntime } from "@themvora/react";
import { MantineThemeProvider } from "@themvora/mantine";

function ThemeZone({ children }: { children: React.ReactNode }) {
  const runtime = useThemeRuntime();
  return <MantineThemeProvider runtime={runtime}>{children}</MantineThemeProvider>;
}
```

## Add a small UI

A heading, a card and a button, using the library's real components. Nothing
is styled yet.

```tsx
import { Button, Card, Stack, Text, Title } from "@mantine/core";

export function Page() {
  return (
    <Stack maw={480}>
      <Title order={2}>An ordinary Mantine card</Title>
      <Card withBorder>
        <Text>No Themvora props — the theme arrives through MantineProvider.</Text>
        <Button mt="md">Primary action</Button>
      </Card>
    </Stack>
  );
}
```

## Style it with Themvora tokens

Themvora emits the active theme's tokens as CSS custom properties, so the
document itself is themed and your own classes read the same variables without
any per-theme CSS. The rules use only required semantic colours — spacing,
typography and layout stay ordinary CSS:

```css
html,
body {
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
}

.page {
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
}

.card {
  background: var(--theme-color-card);
  color: var(--theme-color-cardForeground);
  border: 1px solid var(--theme-color-border);
  border-radius: var(--theme-radius-lg, 12px);
  padding: 1rem;
}
```

Nothing is re-rendered on a switch — the variables change and the styles follow.

## Documentation
Full API reference and guides: [Themvora docs](https://themvora-dev.vercel.app).
All packages: [npm](https://www.npmjs.com/org/themvora).
## License
MIT

<!-- Generated from apps/docs/lib/libraries.tsx → FRAMEWORK_RECIPES. Do not edit by hand. -->

## Frameworks

| Framework | Setup |
| --------- | ----- |
| Astro | [View setup](#astro) |
| Next.js | [View setup](#nextjs) |
| React | [View setup](#react) |
| Remix | [View setup](#remix) |

Each section installs only what that framework needs. The Themvora foundation and
`@themvora/mantine` are common to all of them.

## Astro

**Install**

```bash
npm install @themvora/core @themvora/mantine @themvora/astro
```

`@themvora/astro` is the framework integration — it owns the provider and the
runtime the adapter attaches to.

**Set up**

Mount the framework provider, then the library adapter inside it. The adapter
builds the target library's own theme object from the runtime.

```ts
---
// src/layouts/BaseLayout.astro
import Provider from "@themvora/astro/provider.astro";
import themeConfig from "../../theme.config";
---

<Provider config={themeConfig} lang="en">
  <slot />
</Provider>
```

**Use the library**

Real @mantine/core components. There is no Themvora-specific prop on any of them.

```ts
// src/components/Example.tsx — a React island, because Mantine is React-only.
import { Button, Card, Title } from "@mantine/core";

export function Example() {
  return (
    <Card withBorder padding="lg">
      <Title order={5}>Themvora + Mantine</Title>
      <Button>Primary action</Button>
    </Card>
  );
}
```

**Theme switching**

```ts
---
// src/pages/index.astro
import ThemeToggle from "@themvora/astro/ThemeToggle.astro";
---

<!-- Astro ships the toggle as a component — no hook, no script. -->
<ThemeToggle />
```

**Complete example**

```ts
---
// src/layouts/BaseLayout.astro
import Provider from "@themvora/astro/provider.astro";
import themeConfig from "../../theme.config";
---

<Provider config={themeConfig} lang="en">
  <slot />
</Provider>

<!-- src/pages/index.astro
     Mantine is a React component library, so its tree runs as an island. -->
---
import BaseLayout from "../layouts/BaseLayout.astro";
import { ThemeZone } from "../components/ThemeZone";
---

<BaseLayout>
  <ThemeZone client:only="react" />
</BaseLayout>

<!-- src/components/ThemeZone.tsx
     The island. The bridge sits inside it, below ThemeProvider. -->
---
"use client";

import { ThemeProvider, useThemeRuntime } from "@themvora/react";
import { MantineThemeProvider } from "@themvora/mantine";

import { Example } from "./Example";

function Bridge() {
  const runtime = useThemeRuntime();
  return (
    <MantineThemeProvider runtime={runtime}>
      <Example />
    </MantineThemeProvider>
  );
}

export function ThemeZone() {
  return (
    <ThemeProvider defaultTheme="plum-light" initialMode="system">
      <Bridge />
    </ThemeProvider>
  );
}
-->
```

## Next.js

**Install**

```bash
npm install @themvora/core @themvora/mantine @themvora/next
```

`@themvora/next` is the framework integration — it owns the provider and the
runtime the adapter attaches to.

**Set up**

Mount the framework provider, then the library adapter inside it. The adapter
builds the target library's own theme object from the runtime.

```ts
// app/layout.tsx
import { ThemeProvider } from "@themvora/next";

import { ThemeZone } from "./theme-zone";

// ThemeProvider renders <html> and <body> itself — do not wrap it in them.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider lang="en" defaultTheme="plum-light">
      <ThemeZone>{children}</ThemeZone>
    </ThemeProvider>
  );
}
```

**Use the library**

Real @mantine/core components. There is no Themvora-specific prop on any of them.

```ts
// app/example.tsx
"use client";

import { Button, Card, Title } from "@mantine/core";

export function Example() {
  return (
    <Card withBorder padding="lg">
      <Title order={5}>Themvora + Mantine</Title>
      <Button>Primary action</Button>
    </Card>
  );
}
```

**Theme switching**

```ts
// app/theme-controls.tsx
"use client";

import { useTheme } from "@themvora/next/client";
import { Button, Stack } from "@mantine/core";

export function ThemeControls() {
  const { setMode, toggleTheme } = useTheme();

  return (
    <Stack direction="row" spacing={1}>
      <Button onClick={toggleTheme}>Toggle</Button>
      <Button onClick={() => setMode("light")}>Light</Button>
      <Button onClick={() => setMode("dark")}>Dark</Button>
    </Stack>
  );
}
```

**Complete example**

```ts
// app/theme-zone.tsx
"use client";

import { useThemeRuntime } from "@themvora/next/client";
import { MantineThemeProvider } from "@themvora/mantine";

import { Example } from "./example";

export function ThemeZone() {
  const runtime = useThemeRuntime();

  return (
    <MantineThemeProvider runtime={runtime}>
      <Example />
    </MantineThemeProvider>
  );
}

// ---------------------------------------------------------------- app/layout.tsx
import { ThemeProvider } from "@themvora/next";

import { ThemeZone } from "./theme-zone";

// ThemeProvider renders <html> and <body> itself — do not wrap it in them.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider lang="en" defaultTheme="plum-light">
      <ThemeZone />
      {children}
    </ThemeProvider>
  );
}
```

## React

**Install**

```bash
npm install @themvora/core @themvora/mantine @themvora/react
```

`@themvora/react` is the framework integration — it owns the provider and the
runtime the adapter attaches to.

**Set up**

Mount the framework provider, then the library adapter inside it. The adapter
builds the target library's own theme object from the runtime.

```ts
// src/App.tsx
import { ThemeProvider } from "@themvora/react";

import { Page } from "./Page";
import { ThemeZone } from "./components/ThemeZone";

export default function App() {
  return (
    <ThemeProvider defaultTheme="plum-light" initialMode="system">
      <ThemeZone>
        <Page />
      </ThemeZone>
    </ThemeProvider>
  );
}
```

**Use the library**

Real @mantine/core components. There is no Themvora-specific prop on any of them.

```ts
// src/Example.tsx
import { Button, Card, Title } from "@mantine/core";

export function Example() {
  return (
    <Card withBorder padding="lg">
      <Title order={5}>Themvora + Mantine</Title>
      <Button>Primary action</Button>
    </Card>
  );
}
```

**Theme switching**

```ts
// src/ThemeControls.tsx
import { useTheme } from "@themvora/react";
import { Button, Stack } from "@mantine/core";

export function ThemeControls() {
  const { setMode, toggleTheme } = useTheme();

  return (
    <Stack direction="row" spacing={1}>
      <Button onClick={toggleTheme}>Toggle</Button>
      <Button onClick={() => setMode("light")}>Light</Button>
      <Button onClick={() => setMode("dark")}>Dark</Button>
    </Stack>
  );
}
```

**Complete example**

```ts
// src/App.tsx
import { ThemeProvider, useThemeRuntime } from "@themvora/react";
import { MantineThemeProvider } from "@themvora/mantine";

import { Example } from "./Example";

// The bridge rebuilds Mantine's theme whenever Themvora's active theme changes.
function ThemeZone() {
  const runtime = useThemeRuntime();

  return (
    <MantineThemeProvider runtime={runtime}>
      <Example />
    </MantineThemeProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="plum-light" initialMode="system">
      <ThemeZone />
    </ThemeProvider>
  );
}
```

## Remix

**Install**

```bash
npm install @themvora/core @themvora/mantine @themvora/remix
```

`@themvora/remix` is the framework integration — it owns the provider and the
runtime the adapter attaches to.

**Set up**

Mount the framework provider, then the library adapter inside it. The adapter
builds the target library's own theme object from the runtime.

```ts
// app/root.tsx
import type { ReactNode } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "@remix-run/react";
import { getBuiltInThemes } from "@themvora/core";
import { ThemeHead, ThemeProvider } from "@themvora/remix";
import { getInitialThemeState } from "@themvora/remix/server";

import { ThemeZone } from "./components/theme-zone";

const themes = getBuiltInThemes();
const INITIAL_MODE = "system";

// Resolve the selection server-side so hydration matches exactly.
export async function loader({ request }: { request: Request }) {
  return {
    initial: await getInitialThemeState(request, {
      themes,
      defaultTheme: "light",
      mode: INITIAL_MODE,
    }),
  };
}

export function Layout({ children }: { children: ReactNode }) {
  const { initial } = useLoaderData<typeof loader>();

  return (
    <html lang="en" data-theme={initial.theme.name} data-theme-ready="true">
      <head>
        <meta charSet="utf-8" />
        <Meta />
        <Links />
        <ThemeHead themes={themes} defaultTheme="light" mode={INITIAL_MODE} />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { initial } = useLoaderData<typeof loader>();

  return (
    <ThemeProvider initial={initial} themes={themes} defaultTheme="light">
      <ThemeZone>
        <Outlet />
      </ThemeZone>
    </ThemeProvider>
  );
}
```

**Use the library**

Real @mantine/core components. There is no Themvora-specific prop on any of them.

```ts
// app/components/Example.tsx
import { Button, Card, Title } from "@mantine/core";

export function Example() {
  return (
    <Card withBorder padding="lg">
      <Title order={5}>Themvora + Mantine</Title>
      <Button>Primary action</Button>
    </Card>
  );
}
```

**Theme switching**

```ts
// app/components/ThemeControls.tsx
import { useTheme } from "@themvora/remix";
import { Button, Stack } from "@mantine/core";

export function ThemeControls() {
  const { setMode, toggleTheme } = useTheme();

  return (
    <Stack direction="row" spacing={1}>
      <Button onClick={toggleTheme}>Toggle</Button>
      <Button onClick={() => setMode("light")}>Light</Button>
      <Button onClick={() => setMode("dark")}>Dark</Button>
    </Stack>
  );
}
```

**Complete example**

```ts
// app/root.tsx
import type { ReactNode } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "@remix-run/react";
import { getBuiltInThemes } from "@themvora/core";
import { ThemeHead, ThemeProvider, useThemeRuntime } from "@themvora/remix";
import { getInitialThemeState } from "@themvora/remix/server";
import { MantineThemeProvider } from "@themvora/mantine";

const themes = getBuiltInThemes();
const INITIAL_MODE = "system";

// Resolve the selection server-side so hydration matches exactly.
export async function loader({ request }: { request: Request }) {
  return {
    initial: await getInitialThemeState(request, {
      themes,
      defaultTheme: "light",
      mode: INITIAL_MODE,
    }),
  };
}

export function Layout({ children }: { children: ReactNode }) {
  const { initial } = useLoaderData<typeof loader>();

  return (
    <html lang="en" data-theme={initial.theme.name} data-theme-ready="true">
      <head>
        <meta charSet="utf-8" />
        <Meta />
        <Links />
        <ThemeHead themes={themes} defaultTheme="light" mode={INITIAL_MODE} />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { initial } = useLoaderData<typeof loader>();
  const runtime = useThemeRuntime();

  return (
    <ThemeProvider initial={initial} themes={themes} defaultTheme="light">
      <MantineThemeProvider runtime={runtime}>
        <Outlet />
      </MantineThemeProvider>
    </ThemeProvider>
  );
}
```

<!-- THEME-KIT:GENERATED:FRAMEWORK-RECIPES:START -->
<!-- Generated from apps/docs/lib/libraries.tsx → FRAMEWORK_RECIPES. Do not edit by hand. -->

## Frameworks

| Framework | Setup |
| --------- | ----- |
| Astro | [View setup](#astro) |
| Next.js | [View setup](#nextjs) |
| React | [View setup](#react) |
| Remix | [View setup](#remix) |

Each section installs only what that framework needs. The Themvora foundation and
`@themvora/mantine` are common to all of them.

## Astro

**Install**

```bash
npm install @themvora/core @themvora/mantine @themvora/astro
```

`@themvora/astro` is the framework integration — it owns the provider and the
runtime the adapter attaches to.

**Set up**

Mount the framework provider, then the library adapter inside it. The adapter
builds the target library's own theme object from the runtime.

```ts
---
import Provider from "@themvora/astro/provider.astro";
import themeConfig from "../../theme.config";
---

<Provider config={themeConfig} lang="en">
  <slot />
</Provider>
```

**Use the library**

Real @mantine/core components. There is no Themvora-specific prop on any of them.

```ts
// src/components/Example.tsx — a React island, because Mantine is React-only.
import { Button, Card, Title } from "@mantine/core";

export function Example() {
  return (
    <Card withBorder padding="lg">
      <Title order={5}>Themvora + Mantine</Title>
      <Button>Primary action</Button>
    </Card>
  );
}
```

**Theme switching**

```ts
---
import ThemeToggle from "@themvora/astro/ThemeToggle.astro";
---

<!-- Astro ships the toggle as a component — no hook, no script. -->
<ThemeToggle />
```

**Complete example**

```ts
---
import Provider from "@themvora/astro/provider.astro";
import themeConfig from "../../theme.config";
---

<Provider config={themeConfig} lang="en">
  <slot />
</Provider>

<!-- src/pages/index.astro
     Mantine is a React component library, so its tree runs as an island. -->
---
import BaseLayout from "../layouts/BaseLayout.astro";
import { ThemeZone } from "../components/ThemeZone";
---

<BaseLayout>
  <ThemeZone client:only="react" />
</BaseLayout>

<!-- src/components/ThemeZone.tsx
     The island. The bridge sits inside it, below ThemeProvider. -->
---
"use client";

import { ThemeProvider, useThemeRuntime } from "@themvora/react";
import { MantineThemeProvider } from "@themvora/mantine";

import { Example } from "./Example";

function Bridge() {
  const runtime = useThemeRuntime();
  return (
    <MantineThemeProvider runtime={runtime}>
      <Example />
    </MantineThemeProvider>
  );
}

export function ThemeZone() {
  return (
    <ThemeProvider defaultTheme="plum-light" initialMode="system">
      <Bridge />
    </ThemeProvider>
  );
}
-->
```

## Next.js

**Install**

```bash
npm install @themvora/core @themvora/mantine @themvora/next
```

`@themvora/next` is the framework integration — it owns the provider and the
runtime the adapter attaches to.

**Set up**

Mount the framework provider, then the library adapter inside it. The adapter
builds the target library's own theme object from the runtime.

```ts
import { ThemeProvider } from "@themvora/next";

import { ThemeZone } from "./theme-zone";

// ThemeProvider renders <html> and <body> itself — do not wrap it in them.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider lang="en" defaultTheme="plum-light">
      <ThemeZone>{children}</ThemeZone>
    </ThemeProvider>
  );
}
```

**Use the library**

Real @mantine/core components. There is no Themvora-specific prop on any of them.

```ts
"use client";

import { Button, Card, Title } from "@mantine/core";

export function Example() {
  return (
    <Card withBorder padding="lg">
      <Title order={5}>Themvora + Mantine</Title>
      <Button>Primary action</Button>
    </Card>
  );
}
```

**Theme switching**

```ts
"use client";

import { useTheme } from "@themvora/next/client";
import { Button, Stack } from "@mantine/core";

export function ThemeControls() {
  const { setMode, toggleTheme } = useTheme();

  return (
    <Stack direction="row" spacing={1}>
      <Button onClick={toggleTheme}>Toggle</Button>
      <Button onClick={() => setMode("light")}>Light</Button>
      <Button onClick={() => setMode("dark")}>Dark</Button>
    </Stack>
  );
}
```

**Complete example**

```ts
"use client";

import { useThemeRuntime } from "@themvora/next/client";
import { MantineThemeProvider } from "@themvora/mantine";

import { Example } from "./example";

export function ThemeZone() {
  const runtime = useThemeRuntime();

  return (
    <MantineThemeProvider runtime={runtime}>
      <Example />
    </MantineThemeProvider>
  );
}

// ---------------------------------------------------------------- app/layout.tsx
import { ThemeProvider } from "@themvora/next";

import { ThemeZone } from "./theme-zone";

// ThemeProvider renders <html> and <body> itself — do not wrap it in them.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider lang="en" defaultTheme="plum-light">
      <ThemeZone />
      {children}
    </ThemeProvider>
  );
}
```

## React

**Install**

```bash
npm install @themvora/core @themvora/mantine @themvora/react
```

`@themvora/react` is the framework integration — it owns the provider and the
runtime the adapter attaches to.

**Set up**

Mount the framework provider, then the library adapter inside it. The adapter
builds the target library's own theme object from the runtime.

```ts
import { ThemeProvider } from "@themvora/react";

import { Page } from "./Page";
import { ThemeZone } from "./components/ThemeZone";

export default function App() {
  return (
    <ThemeProvider defaultTheme="plum-light" initialMode="system">
      <ThemeZone>
        <Page />
      </ThemeZone>
    </ThemeProvider>
  );
}
```

**Use the library**

Real @mantine/core components. There is no Themvora-specific prop on any of them.

```ts
import { Button, Card, Title } from "@mantine/core";

export function Example() {
  return (
    <Card withBorder padding="lg">
      <Title order={5}>Themvora + Mantine</Title>
      <Button>Primary action</Button>
    </Card>
  );
}
```

**Theme switching**

```ts
import { useTheme } from "@themvora/react";
import { Button, Stack } from "@mantine/core";

export function ThemeControls() {
  const { setMode, toggleTheme } = useTheme();

  return (
    <Stack direction="row" spacing={1}>
      <Button onClick={toggleTheme}>Toggle</Button>
      <Button onClick={() => setMode("light")}>Light</Button>
      <Button onClick={() => setMode("dark")}>Dark</Button>
    </Stack>
  );
}
```

**Complete example**

```ts
import { ThemeProvider, useThemeRuntime } from "@themvora/react";
import { MantineThemeProvider } from "@themvora/mantine";

import { Example } from "./Example";

// The bridge rebuilds Mantine's theme whenever Themvora's active theme changes.
function ThemeZone() {
  const runtime = useThemeRuntime();

  return (
    <MantineThemeProvider runtime={runtime}>
      <Example />
    </MantineThemeProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="plum-light" initialMode="system">
      <ThemeZone />
    </ThemeProvider>
  );
}
```

## Remix

**Install**

```bash
npm install @themvora/core @themvora/mantine @themvora/remix
```

`@themvora/remix` is the framework integration — it owns the provider and the
runtime the adapter attaches to.

**Set up**

Mount the framework provider, then the library adapter inside it. The adapter
builds the target library's own theme object from the runtime.

```ts
import type { ReactNode } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "@remix-run/react";
import { getBuiltInThemes } from "@themvora/core";
import { ThemeHead, ThemeProvider } from "@themvora/remix";
import { getInitialThemeState } from "@themvora/remix/server";

import { ThemeZone } from "./components/theme-zone";

const themes = getBuiltInThemes();
const INITIAL_MODE = "system";

// Resolve the selection server-side so hydration matches exactly.
export async function loader({ request }: { request: Request }) {
  return {
    initial: await getInitialThemeState(request, {
      themes,
      defaultTheme: "light",
      mode: INITIAL_MODE,
    }),
  };
}

export function Layout({ children }: { children: ReactNode }) {
  const { initial } = useLoaderData<typeof loader>();

  return (
    <html lang="en" data-theme={initial.theme.name} data-theme-ready="true">
      <head>
        <meta charSet="utf-8" />
        <Meta />
        <Links />
        <ThemeHead themes={themes} defaultTheme="light" mode={INITIAL_MODE} />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { initial } = useLoaderData<typeof loader>();

  return (
    <ThemeProvider initial={initial} themes={themes} defaultTheme="light">
      <ThemeZone>
        <Outlet />
      </ThemeZone>
    </ThemeProvider>
  );
}
```

**Use the library**

Real @mantine/core components. There is no Themvora-specific prop on any of them.

```ts
import { Button, Card, Title } from "@mantine/core";

export function Example() {
  return (
    <Card withBorder padding="lg">
      <Title order={5}>Themvora + Mantine</Title>
      <Button>Primary action</Button>
    </Card>
  );
}
```

**Theme switching**

```ts
import { useTheme } from "@themvora/remix";
import { Button, Stack } from "@mantine/core";

export function ThemeControls() {
  const { setMode, toggleTheme } = useTheme();

  return (
    <Stack direction="row" spacing={1}>
      <Button onClick={toggleTheme}>Toggle</Button>
      <Button onClick={() => setMode("light")}>Light</Button>
      <Button onClick={() => setMode("dark")}>Dark</Button>
    </Stack>
  );
}
```

**Complete example**

```ts
import type { ReactNode } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "@remix-run/react";
import { getBuiltInThemes } from "@themvora/core";
import { ThemeHead, ThemeProvider, useThemeRuntime } from "@themvora/remix";
import { getInitialThemeState } from "@themvora/remix/server";
import { MantineThemeProvider } from "@themvora/mantine";

const themes = getBuiltInThemes();
const INITIAL_MODE = "system";

// Resolve the selection server-side so hydration matches exactly.
export async function loader({ request }: { request: Request }) {
  return {
    initial: await getInitialThemeState(request, {
      themes,
      defaultTheme: "light",
      mode: INITIAL_MODE,
    }),
  };
}

export function Layout({ children }: { children: ReactNode }) {
  const { initial } = useLoaderData<typeof loader>();

  return (
    <html lang="en" data-theme={initial.theme.name} data-theme-ready="true">
      <head>
        <meta charSet="utf-8" />
        <Meta />
        <Links />
        <ThemeHead themes={themes} defaultTheme="light" mode={INITIAL_MODE} />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { initial } = useLoaderData<typeof loader>();
  const runtime = useThemeRuntime();

  return (
    <ThemeProvider initial={initial} themes={themes} defaultTheme="light">
      <MantineThemeProvider runtime={runtime}>
        <Outlet />
      </MantineThemeProvider>
    </ThemeProvider>
  );
}
```

<!-- THEME-KIT:GENERATED:FRAMEWORK-RECIPES:END -->
