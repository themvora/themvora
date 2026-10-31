import type { ReactNode } from "react";
import { ThemeProvider } from "@themvora/next";
import { themes, defaultTheme, transition } from "@themvora/app-shared/themes";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      lang="en"
      themes={themes}
      defaultTheme={defaultTheme}
      transition={transition}
      scrollbar
    >
      {children}
    </ThemeProvider>
  );
}
