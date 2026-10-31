/**
 * Generate the premium Studio CSS.
 *
 * Writes the full studio.css with design tokens, premium enhancements,
 * and all preview surface styles preserved.
 */
import { writeFileSync } from "node:fs";

const css = `/*
 * Themvora Studio \u2014 Premium UI.
 *
 * Every piece of chrome is styled from VS Code theme variables. The preview is
 * the only place Themvora colours appear, and those are inline styles from the
 * selected theme's own tokens.
 *
 * Design tokens (--ts-*) provide consistent spacing, radii, shadows, and
 * transitions. All colours remain sourced from --vscode-* variables.
 */

:root {
  color-scheme: light dark;

  --ts-radius-sm: 4px;
  --ts-radius-md: 6px;
  --ts-radius-lg: 10px;
  --ts-radius-xl: 14px;

  --ts-shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.06);
  --ts-shadow-sm: 0 1px 4px rgba(0, 0, 0, 0.08);
  --ts-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
  --ts-shadow-lg: 0 8px 28px rgba(0, 0, 0, 0.14);
  --ts-shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.2);

  --ts-transition-fast: 80ms ease;
  --ts-transition-base: 150ms ease;
  --ts-transition-slow: 250ms ease;

  --ts-font-mono: var(--vscode-editor-font-family, monospace);
}

* {
  box-sizing: border-box;
}

html,
body,
#root {
  height: 100%;
}

body {
  margin: 0;
  overflow: hidden;
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
  color: var(--vscode-foreground);
  background: var(--vscode-editor-background);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

button,
input,
select {
  font: inherit;
  color: inherit;
}

button {
  height: 28px;
  padding: 0 12px;
  border: 1px solid var(--vscode-button-border, var(--vscode-panel-border));
  border-radius: var(--ts-radius-sm);
  background: var(--vscode-button-secondaryBackground, transparent);
  color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
  cursor: pointer;
  white-space: nowrap;
  transition: background-color var(--ts-transition-fast),
    border-color var(--ts-transition-fast),
    opacity var(--ts-transition-fast),
    transform 50ms ease,
    box-shadow var(--ts-transition-fast);
  font-weight: 500;
}

button:hover:not(:disabled) {
  background: var(--vscode-button-secondaryHoverBackground, var(--vscode-toolbar-hoverBackground));
  border-color: var(--vscode-focusBorder, var(--vscode-panel-border));
  box-shadow: var(--ts-shadow-xs);
}

button:active:not(:disabled) {
  transform: translateY(1px);
  box-shadow: none;
}

button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

button.primary {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border-color: transparent;
  font-weight: 600;
}

button.primary:hover:not(:disabled) {
  background: var(--vscode-button-hoverBackground);
  box-shadow: var(--ts-shadow-sm);
}

button.compact {
  height: 24px;
  padding: 0 9px;
  font-size: 0.88em;
}

button.icon-button {
  height: auto;
  padding: 4px;
  border: 1px solid transparent;
  border-radius: var(--ts-radius-sm);
  background: none;
  color: inherit;
  opacity: 0.7;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: opacity var(--ts-transition-fast),
    background-color var(--ts-transition-fast),
    border-color var(--ts-transition-fast);
}

button.icon-button:hover:not(:disabled) {
  opacity: 1;
  background: var(--vscode-toolbar-hoverBackground);
  border-color: var(--vscode-panel-border);
}

button.link-button {
  height: auto;
  padding: 2px 4px;
  border: 1px solid transparent;
  border-radius: var(--ts-radius-sm);
  background: none;
  color: var(--vscode-textLink-foreground);
  text-align: left;
  white-space: normal;
  font-weight: 500;
}

button.link-button:hover:not(:disabled) {
  background: var(--vscode-toolbar-hoverBackground);
  border-color: var(--vscode-panel-border);
  text-decoration: underline;
}

button:focus-visible,
input:focus-visible,
select:focus-visible,
summary:focus-visible,
[role="button"]:focus-visible {
  outline: 2px solid var(--vscode-focusBorder);
  outline-offset: 2px;
  box-shadow: 0 0 0 1px var(--vscode-focusBorder);
}

button:focus-visible {
  z-index: 1;
}

input,
select {
  height: 28px;
  width: 100%;
  min-width: 0;
  padding: 0 9px;
  border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
  border-radius: var(--ts-radius-sm);
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  transition: border-color var(--ts-transition-fast),
    box-shadow var(--ts-transition-fast);
}

input:hover:not(:disabled),
select:hover:not(:disabled) {
  border-color: var(--vscode-focusBorder, var(--vscode-input-border));
}

input::placeholder {
  color: var(--vscode-input-placeholderForeground);
  opacity: 0.8;
}

select {
  cursor: pointer;
  padding-right: 24px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-thumb {
  background: var(--vscode-scrollbarSlider-background);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--vscode-scrollbarSlider-hoverBackground);
}

::-webkit-scrollbar-track {
  background: transparent;
}

.muted {
  color: var(--vscode-descriptionForeground);
}

.small {
  font-size: 0.86em;
}

.ok {
  color: var(--vscode-testing-iconPassed, var(--vscode-gitDecoration-addedResourceForeground, #3fb950));
}

.bad,
.error {
  color: var(--vscode-errorForeground);
}

.warn {
  color: var(--vscode-editorWarning-foreground, #d29922);
}

/* --------------------------------------------------------------------------
 * Shell
 * ----------------------------------------------------------------------- */

.studio {
  display: flex;
  flex-direction: column;
  height: 100vh;
  min-width: 0;
}

.topbar {
  flex: none;
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 52px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--vscode-panel-border);
  background: var(--vscode-sideBar-background);
  flex-wrap: wrap;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  flex: none;
}

.brand-mark {
  width: 24px;
  height: 24px;
  color: var(--vscode-textLink-foreground);
  flex: none;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.brand-name {
  font-weight: 600;
  letter-spacing: -0.01em;
}

.brand-sub {
  font-size: 0.72em;
  color: var(--vscode-descriptionForeground);
  letter-spacing: 0.02em;
}

.project-context {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  flex-wrap: wrap;
}

.project-name {
  max-width: 26ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.project-counts {
  font-size: 0.85em;
  color: var(--vscode-descriptionForeground);
  white-space: nowrap;
}

.actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 2px 8px;
  border: 1px solid transparent;
  border-radius: var(--ts-radius-sm);
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
  font-size: 0.78em;
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
  transition: background-color var(--ts-transition-fast),
    border-color var(--ts-transition-fast),
    color var(--ts-transition-fast);
}

.badge.muted {
  background: transparent;
  color: var(--vscode-descriptionForeground);
  border-color: var(--vscode-panel-border);
}

.badge.ok {
  background: transparent;
  color: var(--vscode-testing-iconPassed, var(--vscode-gitDecoration-addedResourceForeground, #3fb950));
  border-color: currentColor;
}

.badge.bad {
  background: transparent;
  color: var(--vscode-errorForeground);
  border-color: currentColor;
}

.badge.warn {
  background: transparent;
  color: var(--vscode-editorWarning-foreground, #d29922);
  border-color: currentColor;
}

.badge.action {
  height: auto;
  cursor: pointer;
  background: transparent;
  color: var(--vscode-textLink-foreground);
  border-color: var(--vscode-textLink-foreground);
  padding: 2px 8px;
  font-weight: 500;
}

.badge.action:hover {
  background: var(--vscode-toolbar-hoverBackground);
  border-color: var(--vscode-focusBorder);
  color: var(--vscode-focusBorder);
}

.badge.action:active {
  transform: translateY(1px);
}

.notice {
  flex: none;
  margin: 0;
  padding: 9px 14px;
  border-bottom: 1px solid var(--vscode-panel-border);
  background: var(--vscode-textBlockQuote-background);
  font-size: 0.92em;
  line-height: 1.5;
  transition: background-color var(--ts-transition-base);
}

.notice.error {
  color: var(--vscode-errorForeground);
  background: rgba(228, 86, 73, 0.08);
  border-bottom-color: var(--vscode-errorForeground);
}

.studio-workspace {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(280px, 300px) minmax(0, 1fr) minmax(300px, 352px);
}

.studio-statusbar {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: 24px;
  padding: 0 12px;
  border-top: 1px solid var(--vscode-panel-border);
  background: var(--vscode-statusBar-background);
  color: var(--vscode-statusBar-foreground);
  font-size: 0.78em;
  white-space: nowrap;
  overflow: hidden;
}

.statusbar-right {
  opacity: 0.8;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* --------------------------------------------------------------------------
 * Rail
 * ----------------------------------------------------------------------- */

.library-shell {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  min-height: 0;
  min-width: 0;
}

.studio-rail {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 2px;
  padding: 6px 0;
  border-right: 1px solid var(--vscode-panel-border);
  background: var(--vscode-activityBar-background, var(--vscode-sideBar-background));
  color: var(--vscode-activityBar-inactiveForeground, var(--vscode-descriptionForeground));
}

.rail-button {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  height: 50px;
  padding: 0;
  border: 0;
  border-left: 3px solid transparent;
  border-radius: 0;
  background: transparent;
  color: inherit;
  font-size: 0.66em;
  transition: all var(--ts-transition-fast);
}

.rail-button:hover:not(:disabled) {
  background: var(--vscode-toolbar-hoverBackground);
  border-left-color: var(--vscode-activityBar-inactiveForeground, var(--vscode-descriptionForeground));
}

.rail-button.active {
  color: var(--vscode-activityBar-foreground, var(--vscode-foreground));
  border-left-color: var(--vscode-activityBar-activeBorder, var(--vscode-focusBorder));
  background: var(--vscode-list-activeSelectionBackground);
  font-weight: 600;
}

.rail-button svg {
  width: 18px;
  height: 18px;
  opacity: 0.9;
}

.rail-count {
  position: absolute;
  top: 5px;
  right: 7px;
  min-width: 14px;
  padding: 0 3px;
  border-radius: 7px;
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
  font-size: 0.78em;
  line-height: 14px;
  text-align: center;
}

/* --------------------------------------------------------------------------
 * Library
 * ----------------------------------------------------------------------- */

.library {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  border-right: 1px solid var(--vscode-panel-border);
  background: var(--vscode-sideBar-background);
}

.panel-heading {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 12px 6px;
}

.panel-heading h2 {
  margin: 0;
  font-size: 0.72em;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vscode-descriptionForeground);
}

.panel-heading p {
  margin: 3px 0 0;
  font-size: 0.86em;
  color: var(--vscode-descriptionForeground);
}

.search {
  flex: none;
  width: calc(100% - 20px);
  margin: 4px 10px;
}

.search input {
  height: 30px;
  padding: 0 10px 0 32px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath fill='%23666' d='M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: 10px center;
  background-size: 14px;
  border-radius: var(--ts-radius-md);
}

.search input:focus {
  border-color: var(--vscode-focusBorder);
  box-shadow: 0 0 0 1px var(--vscode-focusBorder);
}

.segments {
  flex: none;
  display: flex;
  gap: 2px;
  margin: 2px 10px 4px;
  padding: 3px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: var(--ts-radius-lg);
  background: var(--vscode-editor-background);
}

.segments button {
  flex: 1;
  height: 26px;
  padding: 0 8px;
  border: 0;
  border-radius: var(--ts-radius-md);
  background: transparent;
  color: var(--vscode-descriptionForeground);
  font-size: 0.86em;
  font-weight: 500;
  transition: all var(--ts-transition-fast);
}

.segments button:hover:not(:disabled) {
  background: var(--vscode-toolbar-hoverBackground);
  color: var(--vscode-foreground);
}

.segments button[aria-pressed="true"] {
  background: var(--vscode-list-activeSelectionBackground);
  color: var(--vscode-list-activeSelectionForeground);
  font-weight: 600;
  box-shadow: var(--ts-shadow-xs);
}

.select-row {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 10px 6px;
}

.select-row span {
  flex: none;
}

.select-row select {
  height: 26px;
  flex: 1;
}

.library-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 2px 10px 14px;
}

.library-section {
  margin-top: 8px;
}

.section-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 10px 0 6px;
  padding: 0 2px;
  font-size: 0.72em;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vscode-descriptionForeground);
}

.section-label::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--vscode-panel-border);
  margin-left: 8px;
  opacity: 0.5;
}

.theme-cards {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.theme-card {
  border: 1px solid var(--vscode-panel-border);
  border-radius: var(--ts-radius-md);
  background: var(--vscode-editorWidget-background, var(--vscode-editor-background));
  overflow: hidden;
  transition: border-color var(--ts-transition-base),
    background-color var(--ts-transition-base),
    box-shadow var(--ts-transition-base),
    transform var(--ts-transition-fast);
}

.theme-card:hover {
  border-color: var(--vscode-focusBorder);
  box-shadow: var(--ts-shadow-sm);
  transform: translateY(-1px);
}

.theme-card.selected {
  border-color: var(--vscode-focusBorder);
  border-width: 2px;
  background: var(--vscode-list-activeSelectionBackground);
  color: var(--vscode-list-activeSelectionForeground);
  box-shadow: var(--ts-shadow-md);
  transform: none;
}

.theme-card-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  height: auto;
  padding: 0 10px 8px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  white-space: normal;
}

.theme-card-main:hover:not(:disabled) {
  background: transparent;
}

.preset-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  height: auto;
  padding: 0 10px 10px;
  color: var(--vscode-foreground);
  text-align: left;
  white-space: normal;
}

.preset-card:hover:not(:disabled) {
  background: var(--vscode-list-hoverBackground);
}

.swatch-strip {
  display: flex;
  width: calc(100% + 20px);
  height: 28px;
  margin: 0 -10px 2px;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.swatch-strip > span {
  flex: 1;
  min-width: 0;
}

.swatch-empty {
  background: var(--vscode-editor-background);
  opacity: 0.5;
}

.theme-card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.theme-card-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 1.15em;
  font-weight: 600;
}

.status-dot {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8em;
}

.status-dot::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.theme-card-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.theme-card-source {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--ts-font-mono);
  font-size: 0.8em;
  color: var(--vscode-descriptionForeground);
}

.theme-card.selected .theme-card-source,
.theme-card.selected .badge.muted {
  color: inherit;
  opacity: 0.8;
}

.theme-card.selected .badge.muted {
  border-color: currentColor;
}

.theme-card-modes {
  font-size: 0.85em;
  color: var(--vscode-descriptionForeground);
}

.mode-row {
  display: flex;
  gap: 2px;
  padding: 0 10px 8px;
}

.mode-chip {
  height: 22px;
  padding: 0 9px;
  border-radius: 11px;
  border: 1px solid var(--vscode-panel-border);
  background: transparent;
  color: var(--vscode-descriptionForeground);
  font-size: 0.78em;
  text-transform: capitalize;
  font-weight: 500;
  transition: all var(--ts-transition-fast);
}

.mode-chip:hover:not(:disabled) {
  background: var(--vscode-toolbar-hoverBackground);
  border-color: var(--vscode-focusBorder);
}

.mode-chip:active:not(:disabled) {
  transform: translateY(1px);
}

.mode-chip.active {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border-color: transparent;
  font-weight: 600;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 32px 20px;
  border: 2px dashed var(--vscode-panel-border);
  border-radius: var(--ts-radius-md);
  text-align: center;
  color: var(--vscode-descriptionForeground);
  background: var(--vscode-editor-background);
  transition: border-color var(--ts-transition-base);
}

.empty-state:hover {
  border-color: var(--vscode-focusBorder);
}

.empty-state strong {
  color: var(--vscode-foreground);
  font-size: 1.05em;
}

.empty-state p {
  margin: 0;
  max-width: 38ch;
  line-height: 1.6;
}

.small-empty {
  margin-top: 14px;
  padding: 18px 14px;
}

.source-list,
.consumer-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.source-card {
  border: 1px solid var(--vscode-panel-border);
  border-radius: var(--ts-radius-md);
  background: var(--vscode-editorWidget-background, var(--vscode-editor-background));
  transition: border-color var(--ts-transition-base),
    box-shadow var(--ts-transition-base);
}

.source-card:hover {
  border-color: var(--vscode-focusBorder);
  box-shadow: var(--ts-shadow-sm);
}

.source-card summary {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 10px 12px;
  cursor: pointer;
  list-style: none;
  transition: background-color var(--ts-transition-fast);
}

.source-card summary:hover {
  background: var(--vscode-toolbar-hoverBackground);
}

.source-card summary::-webkit-details-marker {
  display: none;
}

.source-card[open] summary {
  border-bottom: 1px solid var(--vscode-panel-border);
  background: var(--vscode-list-hoverBackground);
}

.source-title {
  flex: 1 1 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--ts-font-mono);
  font-size: 0.86em;
}

.source-body {
  padding: 8px 9px 10px;
}

.source-body p {
  margin: 0 0 6px;
}

.source-definitions,
.source-problems {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.source-definitions li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
  padding: 5px 0;
  border-top: 1px solid var(--vscode-panel-border);
}

.source-definitions li:first-child {
  border-top: 0;
}

.source-problems {
  margin-top: 8px;
  gap: 3px;
}

.source-actions {
  margin-top: 8px;
}

.inline-code {
  padding: 1px 4px;
  border-radius: 3px;
  background: var(--vscode-textCodeBlock-background);
  font-family: var(--ts-font-mono);
  font-size: 0.9em;
  color: var(--vscode-descriptionForeground);
}

.consumer-card {
  padding: 10px 12px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: var(--ts-radius-md);
  background: var(--vscode-editorWidget-background, var(--vscode-editor-background));
  transition: border-color var(--ts-transition-base),
    box-shadow var(--ts-transition-base);
}

.consumer-card:hover {
  border-color: var(--vscode-focusBorder);
  box-shadow: var(--ts-shadow-sm);
}

.consumer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
}

.consumer-headline {
  margin: 4px 0 5px;
  line-height: 1.4;
}

.consumer-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
}

.consumer-detail {
  margin: 4px 0 0;
  font-size: 0.86em;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

/* --------------------------------------------------------------------------
 * Canvas
 * ----------------------------------------------------------------------- */

.canvas {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: var(--vscode-editor-background);
}

.canvas-toolbar {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 42px;
  padding: 6px 14px;
  border-bottom: 1px solid var(--vscode-panel-border);
  flex-wrap: wrap;
}

.canvas-identity {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex-wrap: wrap;
}

.canvas-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 28ch;
  font-weight: 600;
}

.canvas-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.mode-switch {
  display: inline-flex;
  padding: 2px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: var(--ts-radius-lg);
  background: var(--vscode-editor-background);
}

.mode-switch button {
  height: 24px;
  padding: 0 10px;
  border: 0;
  border-radius: var(--ts-radius-md);
  background: transparent;
  color: var(--vscode-descriptionForeground);
  font-size: 0.84em;
  text-transform: capitalize;
  font-weight: 500;
  transition: all var(--ts-transition-fast);
}

.mode-switch button:hover:not(:disabled) {
  background: var(--vscode-toolbar-hoverBackground);
  color: var(--vscode-foreground);
}

.mode-switch button[aria-pressed="true"] {
  background: var(--vscode-list-activeSelectionBackground);
  color: var(--vscode-list-activeSelectionForeground);
  font-weight: 600;
  box-shadow: var(--ts-shadow-xs);
}

.scenario-switch {
  display: inline-flex;
  padding: 2px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: var(--ts-radius-lg);
  margin-left: 8px;
  background: var(--vscode-editor-background);
}

.scenario-switch button {
  height: 24px;
  padding: 0 10px;
  border: 0;
  border-radius: var(--ts-radius-md);
  background: transparent;
  color: var(--vscode-descriptionForeground);
  font-size: 0.84em;
  font-weight: 500;
  transition: all var(--ts-transition-fast);
}

.scenario-switch button:hover:not(:disabled) {
  background: var(--vscode-toolbar-hoverBackground);
  color: var(--vscode-foreground);
}

.scenario-switch button[aria-pressed="true"] {
  background: var(--vscode-list-activeSelectionBackground);
  color: var(--vscode-list-activeSelectionForeground);
  font-weight: 600;
  box-shadow: var(--ts-shadow-xs);
}

.comparison-switch {
  display: inline-flex;
  padding: 2px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: var(--ts-radius-lg);
  margin-left: 8px;
  background: var(--vscode-editor-background);
}

.comparison-switch button {
  height: 24px;
  padding: 0 10px;
  border: 0;
  border-radius: var(--ts-radius-md);
  background: transparent;
  color: var(--vscode-descriptionForeground);
  font-size: 0.84em;
  font-weight: 500;
  transition: all var(--ts-transition-fast);
}

.comparison-switch button:hover:not(:disabled) {
  background: var(--vscode-toolbar-hoverBackground);
  color: var(--vscode-foreground);
}

.comparison-switch button[aria-pressed="true"] {
  background: var(--vscode-list-activeSelectionBackground);
  color: var(--vscode-list-activeSelectionForeground);
  font-weight: 600;
  box-shadow: var(--ts-shadow-xs);
}

/* Dashboard preview scenario */
.preview.dashboard {
  min-height: 600px;
}

.dashboard-app {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.dashboard-shell {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 0;
  flex: 1;
}

.dashboard-main {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.dashboard-card {
  padding: 16px;
  border: 1px solid var(--preview-border, #e0e0e0);
  border-radius: var(--ts-radius-md);
}

.dashboard-card h3 {
  margin: 0 0 12px 0;
  font-size: 1em;
  font-weight: 600;
}

.dashboard-chart {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 120px;
  padding: 8px 0;
}

.dashboard-bar {
  flex: 1;
  border-radius: 3px 3px 0 0;
  min-height: 4px;
  transition: opacity 0.2s;
}

.dashboard-bar:hover {
  opacity: 1 !important;
}

.dashboard-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9em;
}

.dashboard-table th {
  text-align: left;
  padding: 8px;
  border-bottom: 2px solid var(--preview-border, #e0e0e0);
  font-weight: 600;
  color: var(--preview-mutedForeground, #666);
}

.dashboard-table td {
  padding: 8px;
  border-bottom: 1px solid var(--preview-border, #e0e0e0);
}

.dashboard-table tr:last-child td {
  border-bottom: none;
}

.dashboard-status {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 0.85em;
  font-weight: 500;
}

.dashboard-activity {
  margin-top: 0;
}

.dashboard-activity-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dashboard-activity-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.dashboard-activity-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
}

.dashboard-activity-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dashboard-activity-text strong {
  font-weight: 500;
}

.highlight-chip {
  gap: 4px;
  border-color: var(--vscode-focusBorder);
  background: transparent;
  color: var(--vscode-foreground);
}

.draft-strip {
  flex: none;
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  padding: 6px 14px;
  border-bottom: 1px solid var(--vscode-panel-border);
  background: var(--vscode-textBlockQuote-background);
  font-size: 0.82em;
}

.draft-strip strong {
  font-size: 0.95em;
}

.canvas-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 16px;
}

.canvas-empty {
  min-height: 100%;
  border: 0;
}

.empty-mark {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 32px;
}

.empty-mark span {
  width: 12px;
  border-radius: 2px 2px 0 0;
  background: var(--vscode-textLink-foreground);
  opacity: 0.35;
}

.empty-mark span:nth-child(1) {
  height: 18px;
}

.empty-mark span:nth-child(2) {
  height: 30px;
  opacity: 0.55;
}

.empty-mark span:nth-child(3) {
  height: 23px;
  opacity: 0.75;
}

.invalid-canvas {
  max-width: 620px;
  margin: 18px auto;
  padding: 16px 18px;
  border: 1px solid var(--vscode-errorForeground);
  border-radius: var(--ts-radius-md);
  background: var(--vscode-inputValidation-errorBackground, var(--vscode-editorWidget-background));
}

.invalid-canvas h2 {
  margin: 0 0 8px;
  font-size: 1.05em;
}

.invalid-canvas ul {
  margin: 8px 0;
  padding-left: 18px;
  line-height: 1.6;
}

.invalid-canvas p {
  margin: 6px 0;
}

.preview-frame {
  container-type: inline-size;
  max-width: 1180px;
  margin: 0 auto;
  border: 1px solid var(--vscode-panel-border);
  border-radius: var(--ts-radius-lg);
  background: var(--vscode-editorWidget-background);
  box-shadow: var(--ts-shadow-lg);
  overflow: hidden;
  transition: box-shadow var(--ts-transition-slow),
    transform var(--ts-transition-slow);
}

.preview-frame:hover {
  box-shadow: var(--ts-shadow-xl);
  transform: translateY(-2px);
}

.compare {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  max-width: 1180px;
  margin: 0 auto;
}

.compare-panel {
  margin: 0;
  border: 1px solid var(--vscode-panel-border);
  border-radius: var(--ts-radius-md);
  overflow: hidden;
  background: var(--vscode-editorWidget-background);
  transition: border-color var(--ts-transition-base),
    box-shadow var(--ts-transition-base);
}

.compare-panel:hover {
  border-color: var(--vscode-focusBorder);
  box-shadow: var(--ts-shadow-md);
}

.compare-panel figcaption {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--vscode-panel-border);
  font-size: 0.9em;
  text-transform: capitalize;
  font-weight: 600;
  background: var(--vscode-list-hoverBackground);
}

.save-summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin-top: 9px;
  padding: 6px 8px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: var(--ts-radius-sm);
  background: var(--vscode-textBlockQuote-background);
  font-size: 0.82em;
}

.save-summary strong {
  font-weight: 600;
}

.compare-tokens {
  max-width: 1180px;
  margin: 14px auto 0;
  border: 1px solid var(--vscode-panel-border);
  border-radius: var(--ts-radius-md);
  background: var(--vscode-editorWidget-background);
  overflow: hidden;
}

.compare-tokens h3 {
  margin: 0;
  padding: 8px 10px;
  border-bottom: 1px solid var(--vscode-panel-border);
  font-size: 0.9em;
}

.compare-table {
  display: flex;
  flex-direction: column;
  max-height: 300px;
  overflow: auto;
}

.compare-tr {
  display: grid;
  grid-template-columns: minmax(120px, 1.2fr) 1fr 1fr;
  gap: 8px;
  align-items: center;
  padding: 4px 10px;
  font-size: 0.84em;
  border-top: 1px solid var(--vscode-panel-border);
}

.compare-tr:first-child {
  border-top: 0;
}

.compare-th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--vscode-editorWidget-background);
  color: var(--vscode-descriptionForeground);
  font-weight: 600;
  text-transform: capitalize;
}

.compare-tr.differs {
  background: var(--vscode-editor-inactiveSelectionBackground, transparent);
}

.compare-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.compare-tr code {
  margin-left: 5px;
  font-family: var(--ts-font-mono);
}

.swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: 50%;
  vertical-align: -1px;
}

/* --------------------------------------------------------------------------
 * Save
 * ----------------------------------------------------------------------- */

.save-panel {
  max-width: 1180px;
  margin: 14px auto 0;
  padding: 18px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: var(--ts-radius-md);
  background: var(--vscode-editorWidget-background);
  box-shadow: var(--ts-shadow-sm);
}

.save-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;
}

.save-panel-head h3 {
  margin: 0;
  font-size: 1em;
  font-weight: 600;
}

.save-panel-head p {
  margin: 3px 0 0;
  font-size: 0.88em;
  color: var(--vscode-descriptionForeground);
}

.save-grid {
  display: grid;
  grid-template-columns: 1.3fr 1.2fr 1.1fr;
  gap: 10px;
  margin-top: 10px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.field > span {
  font-size: 0.78em;
  color: var(--vscode-descriptionForeground);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.field input:invalid,
.field select:invalid {
  border-color: var(--vscode-errorForeground);
}

.field input:invalid:focus,
.field select:invalid:focus {
  outline-color: var(--vscode-errorForeground);
  box-shadow: 0 0 0 1px var(--vscode-errorForeground);
}

.save-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.file-preview {
  max-height: 240px;
  margin: 10px 0 0;
  padding: 10px;
  overflow: auto;
  border: 1px solid var(--vscode-panel-border);
  border-radius: var(--ts-radius-sm);
  background: var(--vscode-textCodeBlock-background);
  font-family: var(--ts-font-mono);
  font-size: 0.82em;
  white-space: pre;
}

/* --------------------------------------------------------------------------
 * Inspector
 * ----------------------------------------------------------------------- */

.inspector {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  border-left: 1px solid var(--vscode-panel-border);
  background: var(--vscode-sideBar-background);
}

.inspector-tabs {
  flex: none;
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.inspector-tabs button {
  flex: 1;
  height: 36px;
  padding: 0 4px;
  border: 0;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  background: transparent;
  color: var(--vscode-descriptionForeground);
  font-size: 0.86em;
  transition: color var(--ts-transition-fast),
    border-color var(--ts-transition-fast),
    background-color var(--ts-transition-fast);
}

.inspector-tabs button:hover:not(:disabled) {
  background: var(--vscode-toolbar-hoverBackground);
}

.inspector-tabs button[aria-selected="true"] {
  color: var(--vscode-foreground);
  border-bottom-color: var(--vscode-focusBorder);
  font-weight: 600;
}

.tab-count {
  display: inline-block;
  margin-left: 4px;
  padding: 0 4px;
  border-radius: 7px;
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
  font-size: 0.76em;
  line-height: 14px;
}

.inspector-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 10px;
}

.inspector-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.source-hint {
  margin: 0;
  font-family: var(--ts-font-mono);
  font-size: 0.78em;
  overflow-wrap: anywhere;
}

/* --------------------------------------------------------------------------
 * Grouped token editor
 * ----------------------------------------------------------------------- */

.preview-usage {
  padding: 8px;
  border: 1px solid var(--vscode-focusBorder);
  border-radius: var(--ts-radius-sm);
  background: var(--vscode-editorWidget-background);
}

.preview-usage-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.preview-usage p {
  margin: 3px 0 5px;
}

.editor-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.editor-head h3 {
  margin: 0;
  font-size: 0.92em;
}

.editor-head p {
  margin: 2px 0 0;
}

.editor-head-actions {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.read-only-note {
  margin: 0;
  padding: 6px 8px;
  border-radius: var(--ts-radius-sm);
  background: var(--vscode-textBlockQuote-background);
  color: var(--vscode-descriptionForeground);
  font-size: 0.8em;
}

.token-search {
  width: 100%;
  margin: 0;
}

.editor-token-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.token-group-head {
  display: flex;
  align-items: center;
  gap: 4px;
}

.token-group-toggle {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  height: auto;
  padding: 5px 3px;
  border: 0;
  background: none;
  text-align: left;
  white-space: normal;
}

.token-group-toggle:hover:not(:disabled) {
  background: var(--vscode-list-hoverBackground);
}

.token-group-toggle strong {
  font-size: 0.74em;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--vscode-descriptionForeground);
}

.group-swatches {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
}

.group-swatches > span {
  width: 9px;
  height: 9px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: 2px;
}

.editor-token {
  border: 1px solid transparent;
  border-radius: var(--ts-radius-sm);
}

.editor-token:hover {
  background: var(--vscode-list-hoverBackground);
}

.editor-token.selected {
  background: var(--vscode-list-activeSelectionBackground);
  color: var(--vscode-list-activeSelectionForeground);
}

.editor-token.expanded {
  border-color: var(--vscode-panel-border);
  background: var(--vscode-editorWidget-background);
  margin: 3px 0;
}

.editor-token.expanded.selected {
  background: var(--vscode-list-activeSelectionBackground);
}

.editor-token-head {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
}

.editor-token-main {
  flex: 1;
  display: grid;
  grid-template-columns: 10px 12px minmax(0, 1fr) auto minmax(0, 88px) 30px;
  align-items: center;
  gap: 5px;
  min-width: 0;
  height: auto;
  min-height: 27px;
  padding: 1px 2px;
  border: 0;
  background: none;
  color: inherit;
  text-align: left;
  white-space: nowrap;
}

.editor-token-main:hover:not(:disabled) {
  background: none;
}

.editor-chevron {
  font-size: 0.72em;
  opacity: 0.7;
}

.token-type {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 12px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: 2px;
  font-size: 0.64em;
  color: var(--vscode-descriptionForeground);
}

.editor-token-name {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.editor-token-label {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.88em;
}

.editor-token-sub {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.72em;
  color: var(--vscode-descriptionForeground);
}

.editor-token.selected .editor-token-sub {
  color: inherit;
  opacity: 0.75;
}

.editor-token-value {
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--ts-font-mono);
  font-size: 0.76em;
  color: var(--vscode-descriptionForeground);
  text-align: right;
}

.editor-token.selected .editor-token-value {
  color: inherit;
}

.editor-flags {
  display: flex;
  align-items: center;
  gap: 2px;
  width: 14px;
  flex: none;
}

.changed-dot,
.issue-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex: none;
}

.changed-dot {
  background: var(--vscode-editorWarning-foreground, #d29922);
}

.issue-dot {
  background: var(--vscode-errorForeground);
}

.editor-token-body {
  padding: 4px 8px 9px 27px;
}

.editor-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.editor-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.color-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1 1 100%;
  min-width: 0;
}

.color-preview {
  width: 22px;
  height: 22px;
  flex: none;
  border: 1px solid var(--vscode-panel-border);
  border-radius: var(--ts-radius-sm);
}

.picker-toggle {
  height: 26px;
  padding: 0 8px;
  font-size: 0.8em;
  font-weight: 500;
}

.color-controls input[type="color"] {
  width: 32px;
  height: 28px;
  padding: 2px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: var(--ts-radius-sm);
  background: var(--vscode-input-background);
  cursor: pointer;
  transition: border-color var(--ts-transition-fast);
}

.color-controls input[type="color"]:hover {
  border-color: var(--vscode-focusBorder);
}

.color-controls input[type="color"]:focus-visible {
  outline: 2px solid var(--vscode-focusBorder);
  outline-offset: 2px;
}

.token-input {
  flex: 1;
  min-width: 90px;
  height: 26px;
  font-family: var(--ts-font-mono);
  font-size: 0.82em;
}

.token-input:focus {
  border-color: var(--vscode-focusBorder);
  box-shadow: 0 0 0 1px var(--vscode-focusBorder);
}

.token-input:invalid {
  border-color: var(--vscode-errorForeground);
}

.token-input:invalid:focus {
  border-color: var(--vscode-errorForeground);
  box-shadow: 0 0 0 1px var(--vscode-errorForeground);
}

.editor-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
  font-size: 0.8em;
}

.token-contrasts {
  list-style: none;
  margin: 2px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.source-panel .file-preview {
  margin-top: 0;
  max-height: 360px;
}

.source-panel p {
  margin: 0;
}

.inspector-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 0;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--vscode-panel-border);
  font-size: 0.82em;
  color: var(--vscode-descriptionForeground);
}

.token-group h3,
.issue-group h3 {
  margin: 6px 0 4px;
  font-size: 0.72em;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--vscode-descriptionForeground);
}

.token-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.token-list li {
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr) auto auto auto;
  align-items: center;
  gap: 6px;
  min-height: 25px;
  padding: 1px 3px;
  border-radius: var(--ts-radius-sm);
}

.token-list li:hover {
  background: var(--vscode-list-hoverBackground);
}

.token-list li.selected {
  background: var(--vscode-list-activeSelectionBackground);
  color: var(--vscode-list-activeSelectionForeground);
}

.token-name {
  height: auto;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9em;
}

.token-name:hover:not(:disabled) {
  background: none;
  text-decoration: underline;
}

.token-name.selected {
  font-weight: 600;
}

.token-value {
  font-family: var(--ts-font-mono);
  font-size: 0.8em;
  color: var(--vscode-descriptionForeground);
}

.token-list li.selected .token-value {
  color: inherit;
}

.contrast {
  min-width: 28px;
  font-family: var(--ts-font-mono);
  font-size: 0.78em;
  text-align: right;
}

.contrast.unavailable {
  color: var(--vscode-descriptionForeground);
}

.row-actions {
  display: flex;
  align-items: center;
  gap: 1px;
  opacity: 0.65;
}

.token-list li:hover .row-actions {
  opacity: 1;
}

.token-list li.selected .row-actions {
  opacity: 1;
}

.validation-banner {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border: 1px solid var(--vscode-panel-border);
  border-left-width: 4px;
  border-radius: var(--ts-radius-md);
  background: var(--vscode-textBlockQuote-background);
  font-size: 0.9em;
  line-height: 1.5;
  transition: border-color var(--ts-transition-base);
}

.validation-banner:hover {
  border-color: var(--vscode-focusBorder);
}

.validation-banner.ok {
  border-left-color: var(--vscode-testing-iconPassed, #3fb950);
  background: rgba(63, 185, 80, 0.05);
}

.validation-banner.warn {
  border-left-color: var(--vscode-editorWarning-foreground, #d29922);
  background: rgba(210, 153, 34, 0.05);
}

.validation-banner.bad {
  border-left-color: var(--vscode-errorForeground);
  background: rgba(228, 86, 73, 0.05);
}

.validation-banner strong {
  color: var(--vscode-foreground);
  font-weight: 600;
}

.issue-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.issue-card {
  padding: 10px 12px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: var(--ts-radius-md);
  background: var(--vscode-editorWidget-background);
  transition: border-color var(--ts-transition-base),
    box-shadow var(--ts-transition-base);
}

.issue-card:hover {
  border-color: var(--vscode-focusBorder);
  box-shadow: var(--ts-shadow-sm);
}

.issue-card p {
  margin: 0;
  line-height: 1.5;
  font-size: 0.9em;
}

.issue-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 5px;
  font-size: 0.82em;
}

.issue-meta button.badge {
  height: auto;
  cursor: pointer;
}

.clean-state {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: var(--ts-radius-sm);
}

.clean-state p {
  margin: 0;
  color: var(--vscode-descriptionForeground);
}

.detail-section {
  padding: 8px 0 10px;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.detail-section:last-child {
  border-bottom: 0;
}

.detail-section h3 {
  margin: 0 0 6px;
  font-size: 0.72em;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--vscode-descriptionForeground);
}

.detail-row {
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr);
  gap: 8px;
  padding: 3px 0;
  font-size: 0.86em;
  line-height: 1.4;
}

.detail-label {
  color: var(--vscode-descriptionForeground);
}

.detail-value {
  min-width: 0;
  overflow-wrap: anywhere;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
}

.chip-row code {
  font-family: var(--ts-font-mono);
  color: var(--vscode-descriptionForeground);
}

/* --------------------------------------------------------------------------
 * Create drawer
 * ----------------------------------------------------------------------- */

.drawer {
  position: fixed;
  top: 58px;
  right: 14px;
  z-index: 20;
  width: min(620px, calc(100vw - 28px));
  max-height: calc(100vh - 90px);
  overflow: auto;
  padding: 18px;
  border: 1px solid var(--vscode-widget-border, var(--vscode-focusBorder));
  border-radius: var(--ts-radius-xl);
  background: var(--vscode-editorWidget-background);
  box-shadow: var(--ts-shadow-xl);
  animation: drawer-enter var(--ts-transition-slow) ease-out;
}

@keyframes drawer-enter {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.drawer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.drawer-head p {
  margin: 2px 0 0;
}

.create-kinds {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-bottom: 10px;
}

.create-kinds button {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  height: auto;
  padding: 10px;
  white-space: normal;
  text-align: left;
  color: var(--vscode-descriptionForeground);
  border-radius: var(--ts-radius-md);
}

.create-kinds button strong {
  color: var(--vscode-foreground);
  font-size: 0.9em;
}

.create-kinds button span {
  font-size: 0.78em;
  line-height: 1.35;
}

.create-kinds button.active {
  border-color: var(--vscode-focusBorder);
  background: var(--vscode-list-activeSelectionBackground);
  color: inherit;
}

.create-kinds button.active strong {
  color: inherit;
}

.drawer .field {
  margin-bottom: 8px;
}

.drawer-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
}

.seed-input-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.seed-input-group input[type="text"] {
  flex: 1;
  min-width: 0;
}

.seed-input-group input[type="color"] {
  width: 32px;
  height: 28px;
  padding: 2px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: var(--ts-radius-sm);
  background: var(--vscode-input-background);
  cursor: pointer;
}

.seed-input-group input[type="color"]:hover {
  border-color: var(--vscode-focusBorder);
}

.seed-input-group input[type="color"]:focus-visible {
  outline: 2px solid var(--vscode-focusBorder);
  outline-offset: 2px;
}

.live-preview {
  margin: 4px 0 10px;
  padding: 10px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: var(--ts-radius-md);
  background: var(--vscode-editor-background);
}

.live-preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.drawer-preview {
  max-height: 360px;
  overflow: auto;
  border: 1px solid var(--vscode-panel-border);
  border-radius: var(--ts-radius-sm);
  background: var(--vscode-editorWidget-background);
}

.drawer-preview .preview,
.drawer-preview .tvp {
  min-width: 360px;
}

.live-preview-summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin: 7px 0 0;
  font-size: 0.86em;
}

.live-preview-placeholder,
.live-preview-error {
  margin: 4px 0 10px;
  padding: 18px 12px;
  border: 1px dashed var(--vscode-panel-border);
  border-radius: var(--ts-radius-md);
  color: var(--vscode-descriptionForeground);
  font-size: 0.86em;
  text-align: center;
}

.live-preview-error {
  border-style: solid;
  border-color: var(--vscode-errorForeground);
  color: var(--vscode-errorForeground);
  text-align: left;
}

.live-preview-error p {
  margin: 4px 0 0;
}

.pick-list {
  list-style: none;
  margin: 4px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.pick-item {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  width: 100%;
  height: auto;
  padding: 6px 8px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: var(--ts-radius-md);
  background: var(--vscode-editor-background);
  color: var(--vscode-foreground);
  text-align: left;
  white-space: normal;
  transition: all var(--ts-transition-base);
}

.pick-item:hover:not(:disabled) {
  border-color: var(--vscode-focusBorder);
  background: var(--vscode-list-hoverBackground);
  box-shadow: var(--ts-shadow-sm);
  transform: translateY(-1px);
}

.pick-item:active:not(:disabled) {
  transform: translateY(0);
}

.pick-item .swatch-strip {
  width: 54px;
  height: 36px;
  margin: 0;
  border: 1px solid var(--vscode-panel-border);
  border-radius: 3px;
  overflow: hidden;
}

.pick-copy {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.pick-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0;
  font-size: 0.88em;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: var(--ts-radius-sm);
  transition: background-color var(--ts-transition-fast);
}

.checkbox:hover {
  background: var(--vscode-toolbar-hoverBackground);
}

.checkbox input {
  width: auto;
  height: auto;
  margin: 0;
  accent-color: var(--vscode-focusBorder);
  cursor: pointer;
}

.checkbox input:focus-visible {
  outline: 2px solid var(--vscode-focusBorder);
  outline-offset: 2px;
}

.hint {
  margin: 10px 0;
  padding: 10px 12px;
  border-radius: var(--ts-radius-sm);
  border-left: 3px solid var(--vscode-focusBorder);
  background: var(--vscode-textBlockQuote-background);
  color: var(--vscode-descriptionForeground);
  font-size: 0.84em;
  line-height: 1.5;
}

.hint code {
  font-family: var(--ts-font-mono);
  background: var(--vscode-textCodeBlock-background);
  padding: 1px 4px;
  border-radius: 2px;
}

.drawer-actions {
  display: flex;
  gap: 6px;
  margin-top: 12px;
}

/* --------------------------------------------------------------------------
 * Preview surface (theme tokens only)
 * ----------------------------------------------------------------------- */

.preview {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  font-size: 13px;
  line-height: 1.45;
  min-width: 0;
}

.preview-app {
  min-width: 0;
}

.preview-appbar {
  display: flex;
  align-items: center;
  gap: 18px;
  min-height: 44px;
  padding: 0 16px;
  border-bottom: 1px solid;
}

.preview-brand {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.95em;
}

.preview-logo {
  width: 14px;
  height: 14px;
  border-radius: 4px;
}

.preview-topnav {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 0.86em;
}

.preview-topnav > span:first-child {
  font-weight: 600;
}

.preview-account {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 7px;
}

.preview-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 0.74em;
  font-weight: 600;
}

.preview-avatar.small {
  width: 18px;
  height: 18px;
  font-size: 0.68em;
}

.preview-badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 9px;
  font-size: 0.72em;
  font-weight: 500;
  white-space: nowrap;
}

.preview-shell {
  display: grid;
  grid-template-columns: 148px minmax(0, 1fr);
  min-height: 480px;
}

.preview-side {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 8px;
  border-right: 1px solid;
  font-size: 0.82em;
}

.preview-nav-item {
  padding: 4px 8px;
  border-radius: 4px;
}

.preview-nav-active {
  font-weight: 600;
}

.preview-side-title {
  margin: 12px 8px 2px;
  font-size: 0.78em;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.65;
}

.preview-side-card {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: auto;
  padding: 9px;
  border: 1px solid;
  border-radius: 5px;
  font-size: 0.9em;
}

.preview-side-card > span:nth-child(2) {
  font-size: 0.82em;
}

.preview-side-card .preview-button {
  align-self: flex-start;
  margin-top: 5px;
}

.preview-main {
  min-width: 0;
  padding: 16px 18px 20px;
}

.preview-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;
}

.preview-eyebrow {
  margin: 0 0 3px;
  font-size: 0.72em;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.preview-title-row h1 {
  margin: 0;
  font-size: 1.55em;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.preview-title-row p {
  margin: 4px 0 0;
  font-size: 0.86em;
}

.preview-actions {
  display: flex;
  gap: 6px;
  flex: none;
}

.preview-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 26px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 0.82em;
  font-weight: 500;
  white-space: nowrap;
}

.preview-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 10px;
}

.preview-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 9px;
  border: 1px solid;
  border-left-width: 3px;
  border-radius: 4px;
}

.preview-stat-label {
  font-size: 0.72em;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.preview-stat strong {
  font-size: 1.05em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-grid {
  display: grid;
  grid-template-columns: 1.35fr 1fr;
  gap: 10px;
  margin-bottom: 10px;
}

.preview-card {
  min-width: 0;
  padding: 11px 12px;
  border: 1px solid;
  border-radius: 5px;
}

.preview-card h2 {
  margin: 0;
  font-size: 0.92em;
}

.preview-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 9px;
}

.preview-card-head p {
  margin: 2px 0 0;
  font-size: 0.76em;
}

.preview-chart {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 92px;
  padding-top: 4px;
}

.preview-chart > span {
  flex: 1;
  min-width: 2px;
  border-radius: 2px 2px 0 0;
  opacity: 0.85;
}

.preview-live {
  padding: 1px 6px;
  border-radius: 9px;
  font-size: 0.68em;
  font-weight: 600;
}

.preview-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-size: 0.8em;
}

.preview-list li {
  display: flex;
  align-items: center;
  gap: 7px;
}

.preview-list li > span:last-child {
  margin-left: auto;
  font-size: 0.9em;
  white-space: nowrap;
}

.preview-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex: none;
}

.preview-table-card {
  margin-bottom: 10px;
}

.preview-table {
  display: flex;
  flex-direction: column;
  font-size: 0.8em;
}

.preview-tr {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) 0.7fr 0.7fr 0.7fr;
  gap: 8px;
  align-items: center;
  padding: 5px 0;
  border-top: 1px solid;
  border-color: inherit;
}

.preview-tr:first-child {
  border-top: 0;
}

.preview-tr > .preview-badge {
  justify-self: start;
}

.preview-th {
  font-size: 0.92em;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.7;
}

.preview-person {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-bottom {
  display: grid;
  grid-template-columns: 1.35fr 1fr;
  gap: 10px;
}

.preview-bottom .preview-card p {
  margin: 4px 0 8px;
  font-size: 0.8em;
}

.preview-form-row {
  display: flex;
  gap: 6px;
}

.preview-input {
  flex: 1;
  min-width: 0;
  padding: 6px 10px;
  border: 1px solid;
  border-radius: 4px;
  font-size: 0.82em;
  outline: 2px solid transparent;
  outline-offset: 2px;
  transition: border-color 100ms ease, outline-color 100ms ease;
}

.preview-input:hover {
  border-color: var(--preview-foreground, #333);
  opacity: 0.9;
}

.preview-input:focus {
  outline: 2px solid var(--preview-primary, #0066cc);
  border-color: var(--preview-primary, #0066cc);
}

.preview-status {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.preview .highlighted {
  outline: 2px solid var(--vscode-focusBorder);
  outline-offset: -2px;
}

.preview [data-preview-region][role="button"] {
  cursor: pointer;
}

.preview [data-preview-region][role="button"]:focus-visible {
  outline: 2px solid var(--vscode-focusBorder);
  outline-offset: -2px;
}

.preview.compact .preview-side,
.preview.compact .preview-topnav,
.preview.compact .preview-bottom,
.preview.compact .preview-table-card {
  display: none;
}

.preview.compact .preview-shell {
  grid-template-columns: minmax(0, 1fr);
  min-height: 0;
}

.preview.compact .preview-main {
  padding: 12px;
}

.preview.compact .preview-stats {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.preview.compact .preview-grid {
  grid-template-columns: minmax(0, 1fr);
}

@container (max-width: 680px) {
  .preview-side {
    display: none;
  }

  .preview-shell {
    grid-template-columns: minmax(0, 1fr);
    min-height: 0;
  }

  .preview-topnav {
    display: none;
  }

  .preview-main {
    padding: 12px;
  }

  .preview-title-row {
    flex-direction: column;
  }

  .preview-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .preview-grid,
  .preview-bottom {
    grid-template-columns: minmax(0, 1fr);
  }

  .preview-tr {
    grid-template-columns: minmax(0, 1.3fr) 0.7fr 0.7fr;
  }

  .preview-tr > span:nth-child(3) {
    display: none;
  }
}

@container (max-width: 460px) {
  .preview-appbar {
    padding: 0 10px;
  }

  .preview-main {
    padding: 10px;
  }

  .preview-title-row h1 {
    font-size: 1.3em;
  }

  .preview-stats {
    grid-template-columns: 1fr 1fr;
  }

  .preview-tr {
    grid-template-columns: minmax(0, 1fr) 0.7fr;
  }

  .preview-tr > span:nth-child(2),
  .preview-tr > span:nth-child(3) {
    display: none;
  }

  .preview-actions {
    flex-wrap: wrap;
  }
}

/* --------------------------------------------------------------------------
 * Loading and empty states
 * ----------------------------------------------------------------------- */

.loading-studio {
  gap: 0;
}

.loading-label {
  position: absolute;
  left: 50%;
  bottom: 34px;
  transform: translateX(-50%);
  margin: 0;
  color: var(--vscode-descriptionForeground);
  font-size: 0.84em;
}

.skeleton-line,
.skeleton-button,
.skeleton-rail,
.skeleton-card,
.skeleton-preview {
  display: block;
  border-radius: var(--ts-radius-sm);
  background: var(--vscode-editorWidget-background);
  animation: skeleton-pulse 1.4s ease-in-out infinite;
}

.skeleton-line {
  height: 10px;
  margin: 7px 10px;
  width: 130px;
}

.skeleton-line.short {
  width: 80px;
}

.skeleton-button {
  width: 72px;
  height: 24px;
  margin: 0;
}

.skeleton-rail {
  width: 100%;
  height: 100%;
  border-radius: 0;
}

.skeleton-card {
  height: 74px;
  margin: 8px 10px;
}

.skeleton-preview {
  height: calc(100% - 40px);
  margin: 12px;
}

.library .skeleton-line,
.library .skeleton-card {
  margin-left: 10px;
  margin-right: 10px;
}

.empty-project {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px;
  text-align: center;
}

.empty-project .brand-mark {
  width: 42px;
  height: 42px;
  opacity: 0.75;
}

.empty-project h1 {
  margin: 4px 0 0;
  font-size: 1.2em;
}

.empty-project p {
  max-width: 42ch;
  margin: 0;
  color: var(--vscode-descriptionForeground);
}

@keyframes skeleton-pulse {
  0%,
  100% {
    opacity: 0.35;
  }
  50% {
    opacity: 0.7;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* --------------------------------------------------------------------------
 * Responsive
 * ----------------------------------------------------------------------- */

@media (max-width: 1180px) {
  .studio-workspace {
    grid-template-columns: minmax(250px, 280px) minmax(0, 1fr) 288px;
  }

  .library-shell {
    grid-template-columns: 52px minmax(0, 1fr);
  }

  .project-counts {
    display: none;
  }

  .preview-side {
    display: none;
  }

  .preview-shell {
    grid-template-columns: minmax(0, 1fr);
    min-height: 0;
  }
}

@media (max-width: 980px) {
  body {
    overflow: auto;
  }

  .studio {
    height: 100vh;
    min-height: 640px;
  }

  .studio-workspace {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(220px, 36vh) minmax(0, 1fr) minmax(180px, 30vh);
  }

  .library-shell {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
  }

  .studio-rail {
    flex-direction: row;
    align-items: stretch;
    padding: 0;
    border-right: 0;
    border-bottom: 1px solid var(--vscode-panel-border);
  }

  .rail-button {
    flex: 1;
    flex-direction: row;
    gap: 6px;
    height: 30px;
    border-left: 0;
    border-bottom: 2px solid transparent;
    font-size: 0.78em;
  }

  .rail-button.active {
    border-left-color: transparent;
    border-bottom-color: var(--vscode-focusBorder);
  }

  .rail-count {
    position: static;
    margin-left: 2px;
  }

  .library {
    border-right: 0;
  }

  .canvas {
    border-top: 1px solid var(--vscode-panel-border);
    border-bottom: 1px solid var(--vscode-panel-border);
  }

  .inspector {
    border-left: 0;
  }

  .canvas-scroll {
    padding: 10px;
  }

  .topbar {
    min-height: 44px;
  }

  .brand-sub {
    display: none;
  }

  .save-grid {
    grid-template-columns: 1fr 1fr;
  }

  .studio-statusbar {
    height: 20px;
  }
}

@media (max-width: 640px) {
  .studio-workspace {
    grid-template-rows: minmax(200px, 32vh) minmax(0, 1fr) minmax(180px, 30vh);
  }

  .topbar {
    gap: 8px;
    padding: 6px 8px;
  }

  .brand {
    gap: 6px;
  }

  .brand-name {
    font-size: 0.92em;
  }

  .project-context .badge {
    display: none;
  }

  .project-name {
    max-width: 18ch;
  }

  .actions {
    gap: 4px;
  }

  .actions button {
    height: 24px;
    padding: 0 7px;
    font-size: 0.82em;
  }

  .canvas-toolbar {
    padding: 5px 8px;
  }

  .canvas-controls {
    gap: 5px;
  }

  .canvas-title {
    max-width: 18ch;
  }

  .canvas-scroll {
    padding: 6px;
  }

  .library-scroll {
    padding: 2px 6px 10px;
  }

  .panel-heading {
    padding: 8px 8px 2px;
  }

  .search,
  .segments,
  .select-row {
    margin-left: 8px;
    margin-right: 8px;
    width: calc(100% - 16px);
  }

  .select-row {
    width: auto;
  }

  .save-grid {
    grid-template-columns: 1fr;
  }

  .detail-row {
    grid-template-columns: 76px minmax(0, 1fr);
  }

  .inspector-scroll {
    padding: 8px;
  }

  .drawer {
    top: 50px;
    right: 8px;
    width: calc(100vw - 16px);
    max-height: calc(100vh - 70px);
    border-radius: var(--ts-radius-lg);
  }

  .drawer-form-grid {
    grid-template-columns: 1fr;
  }

  .drawer-preview .preview,
  .drawer-preview .tvp {
    min-width: 320px;
  }

  .compare {
    grid-template-columns: 1fr;
  }

  .statusbar-right {
    display: none;
  }
}

@media (max-width: 430px) {
  .brand-text {
    display: none;
  }

  .topbar {
    align-items: center;
  }

  .project-name {
    max-width: 12ch;
  }

  .actions button:not(.primary) {
    padding: 0 5px;
  }

  .compare-tr {
    grid-template-columns: minmax(90px, 1fr) 1fr 1fr;
    font-size: 0.78em;
  }
}

/* Phase 1: Severity badges and direction hints */
.severity-badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: var(--ts-radius-sm);
  font-size: 0.75em;
  font-weight: 500;
  margin-left: 6px;
}

.severity-near-miss {
  background: var(--vscode-editorWarning-foreground, #f5a623);
  color: var(--vscode-editor-background, #1e1e1e);
}

.severity-moderate {
  background: var(--vscode-editorError-foreground, #e45649);
  color: var(--vscode-editor-background, #1e1e1e);
  opacity: 0.7;
}

.severity-critical {
  background: var(--vscode-editorError-foreground, #e45649);
  color: var(--vscode-editor-background, #1e1e1e);
}

.direction-hint {
  display: block;
  margin-top: 4px;
  font-size: 0.85em;
  color: var(--vscode-foreground);
  opacity: 0.7;
  font-style: italic;
}

.direction-hint.small {
  display: inline;
  margin-left: 4px;
  font-size: 0.85em;
}

.badge.related {
  margin-left: 4px;
  opacity: 0.8;
}

.badge.related:hover {
  opacity: 1;
}

/* Phase 2: Patch preview dialog */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: overlay-enter var(--ts-transition-base) ease-out;
}

@keyframes overlay-enter {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: var(--vscode-editor-background, #1e1e1e);
  border: 1px solid var(--vscode-panel-border, #3c3c3c);
  border-radius: var(--ts-radius-lg);
  max-width: 800px;
  max-height: 80vh;
  width: 90%;
  display: flex;
  flex-direction: column;
  box-shadow: var(--ts-shadow-xl);
  animation: modal-enter var(--ts-transition-slow) ease-out;
}

@keyframes modal-enter {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--vscode-panel-border, #3c3c3c);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.2em;
  font-weight: 600;
}

.icon-button {
  background: none;
  border: none;
  color: var(--vscode-foreground);
  font-size: 1.5em;
  cursor: pointer;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--ts-radius-sm);
  transition: background-color var(--ts-transition-fast);
}

.icon-button:hover {
  background: var(--vscode-toolbar-hoverBackground, #2a2d2e);
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.patch-info {
  margin-bottom: 20px;
}

.patch-info > div {
  margin-bottom: 8px;
}

.patch-info code {
  background: var(--vscode-textCodeBlock-background, #2d2d30);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: var(--ts-font-mono);
}

.patch-description {
  color: var(--vscode-foreground);
  opacity: 0.8;
  font-style: italic;
}

.patch-diff {
  margin-bottom: 20px;
}

.patch-diff h3 {
  margin: 0 0 12px 0;
  font-size: 1em;
  font-weight: 600;
}

.diff-new-file pre,
.diff-section pre {
  background: var(--vscode-textCodeBlock-background, #2d2d30);
  border: 1px solid var(--vscode-panel-border, #3c3c3c);
  border-radius: var(--ts-radius-sm);
  padding: 12px;
  overflow-x: auto;
  margin: 0;
}

.diff-new-file code,
.diff-section code {
  font-family: var(--ts-font-mono);
  font-size: 0.9em;
  line-height: 1.5;
}

.diff-section {
  margin-bottom: 16px;
}

.diff-section h4 {
  margin: 0 0 8px 0;
  font-size: 0.9em;
  font-weight: 600;
  color: var(--vscode-foreground);
  opacity: 0.7;
}

.patch-imports {
  margin-bottom: 20px;
}

.patch-imports h3 {
  margin: 0 0 12px 0;
  font-size: 1em;
  font-weight: 600;
}

.patch-imports ul {
  margin: 0;
  padding-left: 20px;
}

.patch-imports li {
  margin-bottom: 4px;
}

.patch-imports code {
  background: var(--vscode-textCodeBlock-background, #2d2d30);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: var(--ts-font-mono);
  font-size: 0.9em;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid var(--vscode-panel-border, #3c3c3c);
}

.modal-footer button {
  padding: 8px 16px;
  border-radius: var(--ts-radius-sm);
  font-size: 0.9em;
  cursor: pointer;
  border: 1px solid transparent;
  height: auto;
}

.modal-footer button.secondary {
  background: var(--vscode-button-secondaryBackground, #3a3d41);
  color: var(--vscode-button-secondaryForeground, #ffffff);
  border-color: var(--vscode-button-secondaryBorder, #3a3d41);
}

.modal-footer button.secondary:hover {
  background: var(--vscode-button-secondaryHoverBackground, #45494e);
}

.modal-footer button.primary {
  background: var(--vscode-button-background, #0e639c);
  color: var(--vscode-button-foreground, #ffffff);
  border-color: var(--vscode-button-border, #0e639c);
}

.modal-footer button.primary:hover {
  background: var(--vscode-button-hoverBackground, #1177bb);
}
`;

writeFileSync("D:/Code/NPM Packages/themvora/packages/vscode/webview/studio.css", css);
console.log("Written", css.length, "chars,", css.split("\n").length, "lines");
