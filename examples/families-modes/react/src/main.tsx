import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@themvora/react";
import App from "./App";
import { themes } from "./themes";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider themes={themes}>
    <App />
  </ThemeProvider>,
);
