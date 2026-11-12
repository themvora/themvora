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
import "@themvora/core/scrollbar.css";
import { createThemeDocument, ThemeScrollbar } from "@themvora/remix";
import { scrollbarIcons } from "./components/scrollbar-icons";
import styles from "./styles.css?url";
import { presets } from "./themes";
import { ThemeSwitcher } from "./components/theme-switcher";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: styles }];

const themes = getBuiltInThemes();

// One configuration. The loader helper, the blocking head script, the <html>
// shell and the runtime provider are all derived from this object.
const theming = createThemeDocument({
  themes: [...themes, ...presets],
  defaultTheme: "light",
  mode: "system",
  scrollbar: true,
  transition: { enabled: true, duration: 100 },
});

// Resolve the selection server-side so hydration matches exactly.
export async function loader({ request }: { request: Request }) {
  return { theme: await theming.resolveInitial(request) };
}

export function Layout({ children }: { children: ReactNode }) {
  const { theme } = useLoaderData<typeof loader>();

  return (
    // Remix still owns the document; Document supplies only the theme-owned
    // parts. It writes the blocking bootstrap in <head>, renders the matching
    // attributes and CSS variables on <html>, and mounts the provider around
    // the route tree.
    <theming.Document
      initial={theme}
      htmlProps={{ lang: "en", className: "" }}
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
  return (
    <>
      <ThemeScrollbar icons={scrollbarIcons} />
      <Outlet />
      <ThemeSwitcher />
    </>
  );
}
