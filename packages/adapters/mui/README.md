<!--
  Generated file — do not edit by hand.

  Integration content comes from apps/docs/lib/libraries.tsx
  (FRAMEWORK_RECIPES); package prose from scripts/readme/library-notes.mjs.

  Regenerate:  pnpm docs:sync-library-readmes
  Verify:      pnpm docs:check-library-readmes
-->

# @themvora/mui

Themvora adapter for Material UI.

Derive a Material UI theme from Themvora semantic tokens and rebuild it automatically whenever the active theme changes.

- **Package** — `@themvora/mui`
- **Library** — Material UI
- **Bridge** — Generated theme
- **Frameworks** — React, Next.js, Remix, Astro
- **Documentation** — [themvora-dev.vercel.app/libraries/mui](https://themvora-dev.vercel.app/libraries/mui)
- **License** — MIT

## How it works

`@themvora/mui` builds Material UI's own theme object from the active Themvora theme and renders MUI's `ThemeProvider` with it. The object is rebuilt whenever the theme, family or mode changes, so MUI's palette, typography and component overrides all follow — including `sx` props and `color="text.secondary"`. No MUI component takes a Themvora prop.

The adapter maps these Themvora roles onto the library's own vocabulary:

| Themvora role | Material UI target |
| --- | --- |
| `primary` | `palette.primary.main` |
| `primaryForeground` | `palette.primary.contrastText` |
| `secondary` | `palette.secondary.main` |
| `background` | `palette.background.default` |
| `card` | `palette.background.paper` |
| `foreground` | `palette.text.primary` |
| `mutedForeground` | `palette.text.secondary` |
| `destructive` | `palette.error.main` |
| `success` | `palette.success.main` |
| `border` | `palette.divider` |
| `radius` | `shape.borderRadius` |
| `typography.fontFamilies.sans` | `typography.fontFamily` |

## Features

`@themvora/mui` ships 7 exports in 3 categories. Each one is documented, with a runnable example, on the [library page](https://themvora-dev.vercel.app/libraries/mui/examples).

### Provider

- **`MuiThemeProvider`** — Wraps MUI's own `ThemeProvider` with a theme derived
  from Themvora semantic tokens (palette, shape, typography, shadows,
  breakpoints).
- **`useMuiTheme(runtime)`** — Subscribes to a Themvora runtime and returns a
  `Theme` rebuilt whenever the theme changes.

### Create

- **`createMuiTheme(source)`** — Builds a MUI `Theme` from a theme definition,
  its tokens, or a runtime.
- **`buildMuiThemeOptions(theme)`** — Maps an `AdapterResolvedTheme` to MUI
  `ThemeOptions` — colors, spacing, shape, shadows, breakpoints.

### Registry

- **`createMuiAdapter(options)`** — Framework-neutral `ThemeAdapter` you
  register via `runtime.adapters.use()` — alternative to the provider, with
  `getSnapshot`/`subscribe` for use outside React.
- **`CreateMuiAdapterOptions`** — Options for the registry adapter — including
  `strategy` for how faithfully tokens map onto MUI's theme.
- **`MuiAdapterOptions`** — Base adapter options type (strategy + defaults) used
  by both the provider and the registry adapter.

## Supported frameworks

Material UI is documented for 4 frameworks here. Each combination below has its own recipe on the documentation page, and its own section in this README.

| Framework | Verified against | Setup |
| --- | --- | --- |
| React | 19.3.1 | [React setup](#react) |
| Next.js | 15.5.28 | [Next.js setup](#nextjs) |
| Remix | 2.17.0 | [Remix setup](#remix) |
| Astro | 5.14.1 | [Astro setup](#astro) |

## Requirements

- **Node.js** — 22.22.2. This is the version the integration is verified
  against, not a hard floor.
- **Material UI** — 9.0.0.
- **Peer dependencies** — `@emotion/react` 11.14.0, `@emotion/styled` 11.14.0.

The project each framework expects is listed per framework:

| Framework | Project |
| --- | --- |
| React | Vite + React project (`npm create vite@latest -- --template react-ts`). |
| Next.js | Next.js App Router project. The recipe edits `app/layout.tsx`. |
| Remix | Remix (Vite) project. The recipe edits `app/root.tsx`. |
| Astro | Astro project with the React integration (`npx astro add react`). The adapter runs in a `client:only="react"` island. |

## Installation

Installing this integration is two commands: the library first, then Themvora.
The commands are **framework-specific** — the library's own toolchain differs
between Vite, Next.js, Nuxt, Angular and Astro, and shadcn/ui, daisyUI and
UnoCSS install through a CLI or a build plugin rather than a plain package.
There is therefore no single install line that is correct for every framework;
the exact commands for yours are in its section below.

The documentation page shows them behind package-manager tabs. A README cannot,
so every section repeats the same commands under all four headings. The verbs
each manager uses:

| Package manager | Add a dependency | Add a dev dependency | Run a package |
| --- | --- | --- | --- |
| pnpm | `pnpm add` | `pnpm add -D` | `pnpm dlx` |
| npm | `npm install` | `npm install -D` | `npx` |
| yarn | `yarn add` | `yarn add -D` | `yarn dlx` |
| bun | `bun add` | `bun add -d` | `bunx` |

`@themvora/core` is a normal dependency of `@themvora/mui` and of the framework
integration, so it arrives with them. Naming it in the command pins the
runtime version in your own manifest.

## React

Verified against React 19.3.1 and Node.js 22.22.2.

### Install

Install Material UI first, then Themvora. Both commands are the ones the
documentation page shows for React.

#### pnpm

```bash
pnpm add @mui/material @emotion/react @emotion/styled
pnpm add @themvora/core @themvora/react @themvora/mui
```

#### npm

```bash
npm install @mui/material @emotion/react @emotion/styled
npm install @themvora/core @themvora/react @themvora/mui
```

#### yarn

```bash
yarn add @mui/material @emotion/react @emotion/styled
yarn add @themvora/core @themvora/react @themvora/mui
```

#### bun

```bash
bun add @mui/material @emotion/react @emotion/styled
bun add @themvora/core @themvora/react @themvora/mui
```

### Build configuration and global styles

The global stylesheet. Themvora writes its tokens as CSS custom properties on
the root element, so the document rule only has to read them.

**`src/index.css`**

```css
html,
body {
  margin: 0;
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
}
```

### Mount the runtime

The entry file that mounts Themvora's provider and loads the stylesheet above.

**`src/main.tsx`**

```tsx
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@themvora/react";
import "./index.css";
import { App } from "./App";
createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="plum-light" initialMode="system">
    <App />
  </ThemeProvider>,
);
```

### Attach the adapter

This is where Material UI's own theme object is built from the runtime and
handed to Material UI's provider. It re-runs on every theme, family and mode
change.

**`src/ThemeZone.tsx`**

```tsx
import type { ReactNode } from "react";
import { useThemeRuntime } from "@themvora/react";
import { MuiThemeProvider } from "@themvora/mui";
// Rebuilds Material UI's own theme object on every selection change.
export function ThemeZone({ children }: { children: ReactNode }) {
  const runtime = useThemeRuntime();
  return <MuiThemeProvider runtime={runtime}>{children}</MuiThemeProvider>;
}
```

### Use Material UI

Real Material UI components. None of them takes a Themvora prop — the theme
reaches them through Material UI's own provider.

**`src/Example.tsx`**

```tsx
import { Button, Card, CardContent, Stack, Typography } from "@mui/material";
export function Example() {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="h6">Themvora + Material UI</Typography>
          <Typography variant="body2" color="text.secondary">
            These are MUI's own components — the palette comes from the theme.
          </Typography>
          <Button variant="contained">Primary action</Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
```

### Theme switching

Mode changes go through Themvora's runtime. The controls below are Material UI's
own components, and they are the only code that changes when the mode does.

**`src/ThemeControls.tsx`**

```tsx
import { useTheme } from "@themvora/react";
import { Button, Stack, Typography } from "@mui/material";
export function ThemeControls() {
  const { mode, setMode, toggleTheme } = useTheme();
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      <Typography variant="body2" color="text.secondary">
        Mode: {mode}
      </Typography>
      <Button variant="contained" onClick={toggleTheme}>Toggle</Button>
      <Button variant="outlined" onClick={() => setMode("light")}>Light</Button>
      <Button variant="outlined" onClick={() => setMode("dark")}>Dark</Button>
    </Stack>
  );
}
```

### Theme family

A family is the second axis: the same mode, a different palette. The runtime
carries it beside the mode, so a family picker is one more control and needs no
re-mount.

```tsx
// The same hook carries the family and its setter.
const { family, setFamily } = useTheme();

// One control per family you ship. The literals are checked against your
// theme registry, so a family that does not exist is a compile error.
setFamily("mint"); // "plum" | "mint" | "berry" | "iris" | "citrus" | …
```

### Put it together

The last file composes what the steps above created: the runtime, the adapter
zone, the components and the controls.

**`src/App.tsx`**

```tsx
import { ThemeZone } from "./ThemeZone";
import { Example } from "./Example";
import { ThemeControls } from "./ThemeControls";
export function App() {
  return (
    <ThemeZone>
      <Example />
      <ThemeControls />
    </ThemeZone>
  );
}
```

## Next.js

Verified against Next.js 15.5.28 and Node.js 22.22.2.

### Install

Install Material UI first, then Themvora. Both commands are the ones the
documentation page shows for Next.js.

#### pnpm

```bash
pnpm add @mui/material @emotion/react @emotion/styled
pnpm add @mui/material-nextjs @emotion/cache @emotion/server
pnpm add @themvora/core @themvora/next @themvora/mui
```

#### npm

```bash
npm install @mui/material @emotion/react @emotion/styled
npm install @mui/material-nextjs @emotion/cache @emotion/server
npm install @themvora/core @themvora/next @themvora/mui
```

#### yarn

```bash
yarn add @mui/material @emotion/react @emotion/styled
yarn add @mui/material-nextjs @emotion/cache @emotion/server
yarn add @themvora/core @themvora/next @themvora/mui
```

#### bun

```bash
bun add @mui/material @emotion/react @emotion/styled
bun add @mui/material-nextjs @emotion/cache @emotion/server
bun add @themvora/core @themvora/next @themvora/mui
```

### Build configuration and global styles

The global stylesheet. Themvora writes its tokens as CSS custom properties on
the root element, so the document rule only has to read them.

**`app/globals.css`**

```css
html,
body {
  margin: 0;
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
}
```

### Mount the runtime

The entry file that mounts Themvora's provider and loads the stylesheet above.

**`app/layout.tsx`**

```tsx
import type { ReactNode } from "react";
import { ThemeProvider } from "@themvora/next";
// The subpath follows the Next.js major: v15-appRouter for Next 15,
// v16-appRouter for Next 16.
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import "./globals.css";
// ThemeProvider renders <html> and <body> itself — do not wrap it in them.
// AppRouterCacheProvider collects the Emotion styles MUI generates during
// streaming SSR and flushes them into <head>; without it they arrive in
// the streamed body chunk and hydration fails with React error #418.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider defaultTheme="plum-light">
      <AppRouterCacheProvider options={{ key: "mui" }}>
        {children}
      </AppRouterCacheProvider>
    </ThemeProvider>
  );
}
```

### Attach the adapter

This is where Material UI's own theme object is built from the runtime and
handed to Material UI's provider. It re-runs on every theme, family and mode
change.

**`app/theme-zone.tsx`**

```tsx
"use client";
import type { ReactNode } from "react";
import { useThemeRuntime } from "@themvora/next/client";
import { MuiThemeProvider } from "@themvora/mui";
// Rebuilds Material UI's own theme object on every selection change.
export function ThemeZone({ children }: { children: ReactNode }) {
  const runtime = useThemeRuntime();
  return <MuiThemeProvider runtime={runtime}>{children}</MuiThemeProvider>;
}
```

### Use Material UI

Real Material UI components. None of them takes a Themvora prop — the theme
reaches them through Material UI's own provider.

**`app/example.tsx`**

```tsx
"use client";

import { Button, Card, CardContent, Stack, Typography } from "@mui/material";
export function Example() {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="h6">Themvora + Material UI</Typography>
          <Typography variant="body2" color="text.secondary">
            These are MUI's own components — the palette comes from the theme.
          </Typography>
          <Button variant="contained">Primary action</Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
```

### Theme switching

Mode changes go through Themvora's runtime. The controls below are Material UI's
own components, and they are the only code that changes when the mode does.

**`app/theme-controls.tsx`**

```tsx
"use client";

import { useTheme } from "@themvora/next/client";
import { Button, Stack, Typography } from "@mui/material";
export function ThemeControls() {
  const { mode, setMode, toggleTheme } = useTheme();
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      <Typography variant="body2" color="text.secondary">
        Mode: {mode}
      </Typography>
      <Button variant="contained" onClick={toggleTheme}>Toggle</Button>
      <Button variant="outlined" onClick={() => setMode("light")}>Light</Button>
      <Button variant="outlined" onClick={() => setMode("dark")}>Dark</Button>
    </Stack>
  );
}
```

### Theme family

A family is the second axis: the same mode, a different palette. The runtime
carries it beside the mode, so a family picker is one more control and needs no
re-mount.

```tsx
// The same hook carries the family and its setter.
const { family, setFamily } = useTheme();

// One control per family you ship. The literals are checked against your
// theme registry, so a family that does not exist is a compile error.
setFamily("mint"); // "plum" | "mint" | "berry" | "iris" | "citrus" | …
```

### Put it together

The last file composes what the steps above created: the runtime, the adapter
zone, the components and the controls.

**`app/page.tsx`**

```tsx
import { ThemeZone } from "./theme-zone";
import { Example } from "./example";
import { ThemeControls } from "./theme-controls";
export default function Page() {
  return (
    <ThemeZone>
      <Example />
      <ThemeControls />
    </ThemeZone>
  );
}
```

## Remix

Verified against Remix 2.17.0 and Node.js 22.22.2.

### Install

Install Material UI first, then Themvora. Both commands are the ones the
documentation page shows for Remix.

#### pnpm

```bash
pnpm add @mui/material @emotion/react @emotion/styled
pnpm add @themvora/core @themvora/remix @themvora/mui
```

#### npm

```bash
npm install @mui/material @emotion/react @emotion/styled
npm install @themvora/core @themvora/remix @themvora/mui
```

#### yarn

```bash
yarn add @mui/material @emotion/react @emotion/styled
yarn add @themvora/core @themvora/remix @themvora/mui
```

#### bun

```bash
bun add @mui/material @emotion/react @emotion/styled
bun add @themvora/core @themvora/remix @themvora/mui
```

### Build configuration and global styles

The global stylesheet. Themvora writes its tokens as CSS custom properties on
the root element, so the document rule only has to read them.

**`app/styles.css`**

```css
html,
body {
  margin: 0;
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
}
```

### Mount the runtime

Remix owns the document, so this file does more than mount a provider.
`createThemeDocument()` declares the configuration once; the loader resolves the
request's selection from it, and `<theming.Document>` renders the pre-paint
script, the matching `<html>` shell and the runtime provider from that same
configuration. The stylesheet is linked through `links` rather than imported for
side effects.

**`app/root.tsx`**

```tsx
import type { ReactNode } from "react";
import type { LinksFunction } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import { getBuiltInThemes } from "@themvora/core";
import { createThemeDocument } from "@themvora/remix";
import styles from "./styles.css?url";
export const links: LinksFunction = () => [
  { rel: "stylesheet", href: styles },
];
const themes = getBuiltInThemes();
const theming = createThemeDocument({
  themes,
  defaultTheme: "plum-light",
  mode: "system",
});
// Resolve the selection on the server so hydration matches exactly.
export async function loader({ request }: { request: Request }) {
  return { theme: await theming.resolveInitial(request) };
}
export function Layout({ children }: { children: ReactNode }) {
  const { theme } = useLoaderData<typeof loader>();
  return (
    // Remix owns the document; Document supplies the theme-owned parts: the
    // blocking bootstrap, the matching <html> shell and the runtime provider.
    <theming.Document
      initial={theme}
      htmlProps={{ lang: "en" }}
      head={[
        <meta key="charset" charSet="utf-8" />,
        <Meta key="meta" />,
        <Links key="links" />,
      ]}
      afterContent={
        <>
          <ScrollRestoration />
          <Scripts />
        </>
      }
    >
      {children}
    </theming.Document>
  );
}
export default function App() {
  return <Outlet />;
}
```

### Attach the adapter

This is where Material UI's own theme object is built from the runtime and
handed to Material UI's provider. It re-runs on every theme, family and mode
change.

**`app/components/theme-zone.tsx`**

```tsx
import type { ReactNode } from "react";
import { useThemeRuntime } from "@themvora/remix";
import { MuiThemeProvider } from "@themvora/mui";
// Rebuilds Material UI's own theme object on every selection change.
export function ThemeZone({ children }: { children: ReactNode }) {
  const runtime = useThemeRuntime();
  return <MuiThemeProvider runtime={runtime}>{children}</MuiThemeProvider>;
}
```

### Use Material UI

Real Material UI components. None of them takes a Themvora prop — the theme
reaches them through Material UI's own provider.

**`app/components/example.tsx`**

```tsx
import { Button, Card, CardContent, Stack, Typography } from "@mui/material";
export function Example() {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="h6">Themvora + Material UI</Typography>
          <Typography variant="body2" color="text.secondary">
            These are MUI's own components — the palette comes from the theme.
          </Typography>
          <Button variant="contained">Primary action</Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
```

### Theme switching

Mode changes go through Themvora's runtime. The controls below are Material UI's
own components, and they are the only code that changes when the mode does.

**`app/components/theme-controls.tsx`**

```tsx
import { useTheme } from "@themvora/remix";
import { Button, Stack, Typography } from "@mui/material";
export function ThemeControls() {
  const { mode, setMode, toggleTheme } = useTheme();
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      <Typography variant="body2" color="text.secondary">
        Mode: {mode}
      </Typography>
      <Button variant="contained" onClick={toggleTheme}>Toggle</Button>
      <Button variant="outlined" onClick={() => setMode("light")}>Light</Button>
      <Button variant="outlined" onClick={() => setMode("dark")}>Dark</Button>
    </Stack>
  );
}
```

### Theme family

A family is the second axis: the same mode, a different palette. The runtime
carries it beside the mode, so a family picker is one more control and needs no
re-mount.

```tsx
// The same hook carries the family and its setter.
const { family, setFamily } = useTheme();

// One control per family you ship. The literals are checked against your
// theme registry, so a family that does not exist is a compile error.
setFamily("mint"); // "plum" | "mint" | "berry" | "iris" | "citrus" | …
```

### Put it together

The last file composes what the steps above created: the runtime, the adapter
zone, the components and the controls.

**`app/routes/_index.tsx`**

```tsx
import { ThemeZone } from "../components/theme-zone";
import { Example } from "../components/example";
import { ThemeControls } from "../components/theme-controls";
export default function Page() {
  return (
    <ThemeZone>
      <Example />
      <ThemeControls />
    </ThemeZone>
  );
}
```

## Astro

Verified against Astro 5.14.1 and Node.js 22.22.2.

### Install

Install Material UI first, then Themvora. Both commands are the ones the
documentation page shows for Astro.

#### pnpm

```bash
pnpm add @mui/material @emotion/react @emotion/styled
pnpm add @themvora/core @themvora/astro @themvora/mui
```

#### npm

```bash
npm install @mui/material @emotion/react @emotion/styled
npm install @themvora/core @themvora/astro @themvora/mui
```

#### yarn

```bash
yarn add @mui/material @emotion/react @emotion/styled
yarn add @themvora/core @themvora/astro @themvora/mui
```

#### bun

```bash
bun add @mui/material @emotion/react @emotion/styled
bun add @themvora/core @themvora/astro @themvora/mui
```

### Build configuration and global styles

The global stylesheet. Themvora writes its tokens as CSS custom properties on
the root element, so the document rule only has to read them.

**`src/styles/global.css`**

```css
html,
body {
  margin: 0;
  background: var(--theme-color-background);
  color: var(--theme-color-foreground);
}
```

### Mount the runtime

The entry file that mounts Themvora's provider and loads the stylesheet above.

**`src/layouts/BaseLayout.astro`**

```astro
---
// src/layouts/BaseLayout.astro
import ThemeIsland from "../components/ThemeIsland";
import "../styles/global.css";
---
<html lang="en">
  <body>
    <ThemeIsland client:only="react" />
    <slot />
  </body>
</html>
```

### Attach the adapter

This is where Material UI's own theme object is built from the runtime and
handed to Material UI's provider. It re-runs on every theme, family and mode
change.

**`src/components/ThemeIsland.tsx`**

```tsx
import type { ReactNode } from "react";
import { ThemeProviderClient, useThemeRuntime } from "@themvora/astro/client";
import { MuiThemeProvider } from "@themvora/mui";
import { Example } from "./Example";
import { ThemeControls } from "./ThemeControls";
function Bridged({ children }: { children: ReactNode }) {
  const runtime = useThemeRuntime();
  return <MuiThemeProvider runtime={runtime}>{children}</MuiThemeProvider>;
}
// Astro cannot hand React children to a client:only island, so the island
// renders the example and the controls inside the provider itself.
export default function ThemeIsland() {
  return (
    <>
      <ThemeProviderClient defaultTheme="plum-light" initialMode="system" />
      <Bridged>
        <Example />
        <ThemeControls />
      </Bridged>
    </>
  );
}
```

### Use Material UI

Real Material UI components. None of them takes a Themvora prop — the theme
reaches them through Material UI's own provider.

**`src/components/Example.tsx`**

```tsx
import { Button, Card, CardContent, Stack, Typography } from "@mui/material";
export function Example() {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="h6">Themvora + Material UI</Typography>
          <Typography variant="body2" color="text.secondary">
            These are MUI's own components — the palette comes from the theme.
          </Typography>
          <Button variant="contained">Primary action</Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
```

### Theme switching

Mode changes go through Themvora's runtime. The controls below are Material UI's
own components, and they are the only code that changes when the mode does.

**`src/components/ThemeControls.tsx`**

```tsx
import { useTheme } from "@themvora/astro/client";
import { Button, Stack, Typography } from "@mui/material";
export function ThemeControls() {
  const { mode, setMode, toggleTheme } = useTheme();
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      <Typography variant="body2" color="text.secondary">
        Mode: {mode}
      </Typography>
      <Button variant="contained" onClick={toggleTheme}>Toggle</Button>
      <Button variant="outlined" onClick={() => setMode("light")}>Light</Button>
      <Button variant="outlined" onClick={() => setMode("dark")}>Dark</Button>
    </Stack>
  );
}
```

### Theme family

A family is the second axis: the same mode, a different palette. The runtime
carries it beside the mode, so a family picker is one more control and needs no
re-mount.

```tsx
// The same hook carries the family and its setter.
const { family, setFamily } = useTheme();

// One control per family you ship. The literals are checked against your
// theme registry, so a family that does not exist is a compile error.
setFamily("mint"); // "plum" | "mint" | "berry" | "iris" | "citrus" | …
```

### Put it together

The last file composes what the steps above created: the runtime, the adapter
zone, the components and the controls.

```tsx
---
import BaseLayout from "../layouts/BaseLayout.astro";
---
<BaseLayout>
  <h1>Themvora</h1>
  <p>Every colour on this page comes from the active theme.</p>
</BaseLayout>
```

## Development and production commands

These are the scripts each framework's own scaffold creates; Themvora adds no
build step to them. The adapter builds the library's theme object at runtime, so
nothing extra is compiled.

| Framework | Development | Production build | Preview |
| --- | --- | --- | --- |
| React | `pnpm dev` | `pnpm build` | `pnpm preview` |
| Next.js | `pnpm dev` | `pnpm build` | `pnpm start` |
| Remix | `pnpm dev` | `pnpm build` | `pnpm start` |
| Astro | `pnpm dev` | `pnpm build` | `pnpm preview` |

With npm, yarn or bun the same scripts run as `npm run dev`, `yarn dev` and
`bun run dev`.

## Troubleshooting

- **The components are themed but the page background is not.** The global
  stylesheet is missing the `html, body` rule from *Build configuration and global
  styles*. Themvora writes `--theme-color-*` on the root element; something has to
  read them.
- **Nothing happens when you switch themes.** The adapter is attached to a
  different runtime than the one the provider created. Call the adapter *inside*
  the provider — that is what the *Attach the adapter* file does — rather than
  beside it.
- **The library's own colours win.** Its stylesheet has to load before the
  adapter's variable map. The import order in the global stylesheet is an
  instruction, not a preference.
- **Next.js: styles arrive late and hydration warns (React error #418).** MUI
  generates Emotion styles during streaming SSR. `AppRouterCacheProvider` collects
  them and flushes them into `<head>`; without it they land in the streamed body.
  Keep its subpath in step with the Next.js major — `v15-appRouter` for Next 15,
  `v16-appRouter` for Next 16.
- **`@emotion/react` cannot be resolved at runtime.** It is a peer dependency,
  not a dependency. The install command names it for that reason.

## Documentation

- [Material UI integration](https://themvora-dev.vercel.app/libraries/mui) — the page this README mirrors
- [Worked examples for every export](https://themvora-dev.vercel.app/libraries/mui/examples)
- [Material UI installation guide](https://mui.com/material-ui/getting-started/installation/)
- [Framework guides](https://themvora-dev.vercel.app/framework-guides)
- [All packages on npm](https://www.npmjs.com/org/themvora)
- [Changelog](https://github.com/themvora/themvora/blob/main/packages/adapters/mui/CHANGELOG.md)

## License

MIT — see [LICENSE](https://github.com/themvora/themvora/blob/main/packages/adapters/mui/LICENSE).
