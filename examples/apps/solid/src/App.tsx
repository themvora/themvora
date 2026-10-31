import { For } from "solid-js";
import { ThemeProvider, ThemeScrollbar } from "@themvora/solid";
import { themes, defaultTheme, initialMode, transition } from "@themvora/app-shared/themes";
import { scrollbarIcons } from "@themvora/app-shared/icons";
import ThemvoraDefault from "./components/ThemvoraDefault";

export default function App() {
  return (
    <ThemeProvider
      themes={themes}
      defaultTheme={defaultTheme}
      initialMode={initialMode}
      transition={transition}
    >
      <main class="page flex flex-col">
        <ThemeScrollbar behavior={{ autoHide: false }} icons={scrollbarIcons} />

        <ThemvoraDefault />

        <div class="max-h-40 max-w-lg overflow-auto my-8 border-2 border-border">
          <For each={Array.from({ length: 100 })}>
            {() => (
              <p>
                Hello for the scrollbar example very very very very very very
                very very very very long content
              </p>
            )}
          </For>
        </div>
      </main>
    </ThemeProvider>
  );
}
