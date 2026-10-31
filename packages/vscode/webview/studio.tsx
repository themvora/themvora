/**
 * The Theme Studio, as a React webview.
 *
 * The mount is deliberately tiny: the shell, panels and preview surface live in
 * `webview/studio/`, and every theme fact arrives from the extension host in one
 * serialized state object. Nothing here reads a file, calls core, or decides
 * whether a theme is valid.
 *
 * @packageDocumentation
 */
import { createRoot } from "react-dom/client";

import "./studio.css";
import { parseStudioAppearance } from "../src/shared/studioProtocol";
import { StudioApp } from "./studio/StudioApp";

// The host writes the persisted preference into the document before the bundle
// runs, so the first paint is already in the right appearance. Reading the
// attribute — rather than asking for state after mount — is what prevents a
// light flash when the Studio is forced dark under a light workbench.
const initialAppearance = parseStudioAppearance(document.documentElement.dataset.studioAppearance);

createRoot(document.getElementById("root")!).render(<StudioApp initialAppearance={initialAppearance} />);
