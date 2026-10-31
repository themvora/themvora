/**
 * A controllable fake of the `vscode` module.
 *
 * The real module only exists inside the extension host, so `vitest.config.ts`
 * aliases `vscode` to this file. Tests arrange the responses they want in
 * {@link __state}, run the real extension code, and assert on what the extension
 * asked the editor to do.
 *
 * **Filesystem calls are real.** `workspace.fs.readFile`, `readDirectory` and
 * `writeFile` go to disk. That is deliberate: it lets a test hand the file the
 * real command handler produced to the real CLI, which is the round-trip this
 * suite exists to protect. Faking the filesystem would have made that test
 * assert against a mock's opinion of a file.
 *
 * Everything else — dialogs, messages, views, the status bar — is recorded only,
 * because there is no headless equivalent of a dialog.
 *
 * Only the surface the extension actually calls is implemented. A fake that
 * modelled all of `vscode` would be a second implementation to keep correct, and
 * it would let a test pass against behaviour the host does not have.
 *
 * @packageDocumentation
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/** One file the extension wrote through `workspace.fs`. */
export interface WrittenFile {
  /** The absolute path, as VS Code would report it. */
  path: string;
  /** The contents, decoded as UTF-8. */
  contents: string;
}

/** A registered command handler. */
export type CommandHandler = (...args: unknown[]) => unknown;

/** A recorded status bar item. */
export interface RecordedStatusBarItem {
  name?: string;
  text: string;
  tooltip?: string;
  command?: string;
  backgroundColor?: ThemeColor;
  visible: boolean;
  disposed: boolean;
}

/** A recorded tree view. */
export interface RecordedTreeView {
  id: string;
  provider: unknown;
  disposed: boolean;
}

/** A recorded file-system watcher, so a test can emit what the host would. */
export interface RecordedFileWatcher {
  glob: unknown;
  createListeners: ((uri: Uri) => void)[];
  changeListeners: ((uri: Uri) => void)[];
  deleteListeners: ((uri: Uri) => void)[];
  disposed: boolean;
}

/** A document the fake workspace can hand out. */
export interface FakeDocument {
  uri: Uri;
  getText(range?: Range): string;
  isDirty: boolean;
  languageId?: string;
  version?: number;
  positionAt?(offset: number): Position;
  offsetAt?(position: Position): number;
  getWordRangeAtPosition?(position: Position, regex?: RegExp): Range | undefined;
}

/** A recorded diagnostic collection. */
export interface RecordedDiagnosticCollection {
  name: string;
  /** uri string -> the diagnostics last set for it. */
  entries: Map<string, unknown[]>;
  setCalls: number;
  deleteCalls: number;
  disposed: boolean;
}

/** A recorded webview panel. */
export interface RecordedWebviewPanel {
  viewType: string;
  title: string;
  options: unknown;
  html: string;
  posted: unknown[];
  revealed: boolean;
  disposed: boolean;
  messageHandlers: ((message: unknown) => void)[];
  disposeHandlers: (() => void)[];
  /** Set through `panel.iconPath`, which is how a tab gets its icon. */
  iconPath?: unknown;
  /** Close the panel, as the user would. */
  close(): void;
}

/** A recorded output channel. */
export interface RecordedOutputChannel {  name: string;
  /** Every line appended, in order. */
  lines: string[];
  /** Whether `show` was called. */
  shown: boolean;
  /** Whether `clear` was called at least once. */
  cleared: boolean;
  disposed: boolean;
}

/** Everything a test can control or observe. */
export const __state = {
  /** Absolute workspace folder paths. Empty means no folder is open. */
  folders: [] as string[],
  /** What the next `showInputBox` resolves to. `undefined` means cancelled. */
  inputBox: undefined as string | undefined,
  /**
   * Successive input-box answers, consumed in order before `inputBox`.
   *
   * A command that asks for a seed and then a family cannot use one shared
   * value: the second prompt would receive the first answer.
   */
  inputBoxQueue: [] as (string | undefined)[],
  /** What the next `showSaveDialog` resolves to. `undefined` means cancelled. */
  saveDialog: undefined as Uri | undefined,
  /** Command id to handler, in registration order. */
  commands: new Map<string, CommandHandler>(),
  /**
   * Every `executeCommand` call, in order.
   *
   * Recorded *and* dispatched: a command that hands off to another command is
   * only correct if the hand-off actually reaches it.
   */
  executed: [] as { readonly id: string; readonly args: readonly unknown[] }[],
  /** Files written through `workspace.fs.writeFile`. */
  written: [] as WrittenFile[],
  /** Messages shown through `showInformationMessage`. */
  info: [] as string[],
  /** Messages shown through `showErrorMessage`. */
  errors: [] as string[],
  /** Paths offered as `defaultUri` to the save dialog. */
  saveDialogDefaults: [] as (string | undefined)[],
  /** What the next `showOpenDialog` resolves to. `undefined` means cancelled. */
  openDialog: undefined as Uri[] | undefined,
  /**
   * Successive `showOpenDialog` results, consumed in order before `openDialog`.
   *
   * Needed for a command that prompts twice: one shared value would make the
   * second prompt return the first file, and a test could not tell the two
   * dialogs apart.
   */
  openDialogQueue: [] as Uri[][],
  /** Messages shown through `showWarningMessage`. */
  warnings: [] as string[],
  /**
   * What a modal confirmation resolves to.
   *
   * A warning with action items is a question, and the answer is the item the
   * user picked; `undefined` is a dismissal, exactly as VS Code reports it.
   */
  modalAnswer: undefined as string | undefined,
  /** Every output channel created, in creation order. */
  outputChannels: [] as RecordedOutputChannel[],
  /** Every webview panel created, in creation order. */
  webviewPanels: [] as RecordedWebviewPanel[],
  /** Documents opened through `showTextDocument`, with the selected position. */
  openedDocuments: [] as { path: string; line?: number; column?: number }[],
  /** The documents `workspace.textDocuments` reports. */
  textDocuments: [] as FakeDocument[],
  /** Document text, keyed by fsPath, so edits are visible to `getText`. */
  documentText: new Map<string, string>(),
  /** Registered `onDidOpenTextDocument` listeners. */
  openListeners: [] as ((document: FakeDocument) => void)[],
  /** Registered `onDidCloseTextDocument` listeners. */
  closeListeners: [] as ((document: FakeDocument) => void)[],
  /** Every diagnostic collection created. */
  diagnosticCollections: [] as RecordedDiagnosticCollection[],
  /** Registered hover providers. */
  hoverProviders: [] as { language: string; provider: unknown }[],
  /** Registered colour providers. */
  colorProviders: [] as { language: string; provider: unknown }[],
  /** Registered file-decoration providers. */
  fileDecorationProviders: [] as unknown[],
  /** Registered webview view providers. */
  webviewViewProviders: [] as { id: string; provider: unknown; options: unknown }[],
  /** Registered `onDidChangeTextDocument` listeners. */
  changeListeners: [] as ((event: { document: { uri: Uri } }) => void)[],
  /** Registered `onDidChangeActiveTextEditor` listeners. */
  activeEditorListeners: [] as ((editor: { document: FakeDocument } | undefined) => void)[],
  /** The active editor, when a test sets one. */
  activeTextEditor: undefined as { document: FakeDocument } | undefined,
  /** Every text written to the clipboard, in order. */
  clipboard: [] as string[],
  /** When set, the next clipboard write rejects with this error. */
  clipboardError: null as Error | null,
  /** The label to return from the next `showQuickPick`. `undefined` cancels. */
  quickPickSelection: undefined as string | undefined,
  /**
   * Successive quick-pick answers, consumed in order before `quickPickSelection`.
   *
   * A command that prompts twice cannot use one shared value: the second prompt
   * would return the first answer, and a test could not tell the two apart.
   */
  quickPickQueue: [] as (string | undefined)[],
  /** The items offered to the last `showQuickPick`, for assertions. */
  quickPickItems: [] as { label: string; description: string | undefined; detail: string | undefined }[],
  /** The placeholder offered to the last `showQuickPick`. */
  quickPickPlaceHolder: undefined as string | undefined,
  /** Every status bar item created, in creation order. */
  statusBarItems: [] as RecordedStatusBarItem[],
  /** Every tree view created, in creation order. */
  treeViews: [] as RecordedTreeView[],
  /** Registered `onDidChangeWorkspaceFolders` listeners. */
  folderListeners: [] as ((event: unknown) => void)[],
  /** Registered `onDidSaveTextDocument` listeners. */
  saveListeners: [] as ((document: { uri: Uri }) => void)[],
  /**
   * Filesystem calls the extension made through `workspace.fs`.
   *
   * This is how a test measures *work* rather than intent: a full inspection
   * enumerates directories and reads files, so the count moves when a scan
   * happens and stays put when one does not. Nothing else in the fake is
   * consulted, which is what makes the numbers evidence.
   */
  fsCalls: { readFile: 0, readDirectory: 0 },
  /** Registered `createFileSystemWatcher` instances, for firing events. */
  fileWatchers: [] as RecordedFileWatcher[],
  /** Registered `onDidCreateFiles` listeners. */
  createFilesListeners: [] as ((event: unknown) => void)[],
  /** Registered `onDidDeleteFiles` listeners. */
  deleteFilesListeners: [] as ((event: unknown) => void)[],
  /** Registered `onDidRenameFiles` listeners. */
  renameFilesListeners: [] as ((event: unknown) => void)[],
};

/** Reset every controllable and observed value. */
export function __reset(): void {
  __state.folders = [];
  __state.inputBox = undefined;
  __state.inputBoxQueue = [];
  __state.saveDialog = undefined;
  __state.commands.clear();
  __state.executed = [];
  __state.written.length = 0;
  __state.info.length = 0;
  __state.errors.length = 0;
  __state.saveDialogDefaults.length = 0;
  __state.openDialog = undefined;
  __state.openDialogQueue = [];
  __state.warnings.length = 0;
  __state.modalAnswer = undefined;
  __state.outputChannels.length = 0;
  __state.webviewPanels.length = 0;
  __state.openedDocuments.length = 0;
  __state.textDocuments.length = 0;
  __state.documentText.clear();
  __state.openListeners.length = 0;
  __state.closeListeners.length = 0;
  __state.diagnosticCollections.length = 0;
  __state.hoverProviders.length = 0;
  __state.colorProviders.length = 0;
  __state.fileDecorationProviders.length = 0;
  __state.webviewViewProviders.length = 0;
  __state.changeListeners.length = 0;
  __state.activeEditorListeners.length = 0;
  __state.activeTextEditor = undefined;
  __state.clipboard.length = 0;
  __state.clipboardError = null;
  __state.quickPickSelection = undefined;
  __state.quickPickQueue = [];
  __state.quickPickItems = [];
  __state.quickPickPlaceHolder = undefined;
  __state.statusBarItems.length = 0;
  __state.treeViews.length = 0;
  __state.folderListeners.length = 0;
  __state.saveListeners.length = 0;
  __state.fsCalls = { readFile: 0, readDirectory: 0 };
  __state.fileWatchers.length = 0;
  __state.createFilesListeners.length = 0;
  __state.deleteFilesListeners.length = 0;
  __state.renameFilesListeners.length = 0;
}

/**
 * Invoke a registered command, failing loudly when it was never registered.
 *
 * @param id - The command id.
 * @param args - Arguments to pass, as `executeCommand` would.
 * @returns The handler's result.
 */
export async function __invoke(id: string, ...args: unknown[]): Promise<unknown> {
  const handler = __state.commands.get(id);
  if (!handler) throw new Error(`command not registered: ${id}`);
  return handler(...args);
}

/**
 * Convert a position to an offset.
 *
 * @param content - The document text.
 * @param position - The position.
 * @returns The character offset.
 */
function offsetFor(content: string, position: Position): number {
  const lines = content.split("\n");
  let offset = 0;
  for (let index = 0; index < position.line; index += 1) {
    offset += (lines[index] ?? "").length + 1;
  }
  return offset + position.character;
}

/**
 * Convert an offset to a position.
 *
 * @param content - The document text.
 * @param offset - The character offset.
 * @returns The position.
 */
function positionFor(content: string, offset: number): Position {
  const clamped = Math.max(0, Math.min(offset, content.length));
  const before = content.slice(0, clamped);
  const lines = before.split("\n");
  return new Position(lines.length - 1, (lines[lines.length - 1] ?? "").length);
}

/**
 * Open a document the way VS Code would.
 *
 * @param fsPath - Its path.
 * @param text - Its initial contents.
 * @param languageId - Its language, defaulting to `json`.
 * @returns The document, for assertions.
 */
export function __openDocument(fsPath: string, text: string, languageId = "json"): FakeDocument {
  __state.documentText.set(fsPath, text);

  const document: FakeDocument = {
    uri: Uri.file(fsPath),
    languageId,
    version: 1,
    isDirty: false,
    getText: (range?: Range): string => {
      const content = __state.documentText.get(fsPath) ?? "";
      if (range === undefined) return content;
      return content.slice(offsetFor(content, range.start), offsetFor(content, range.end));
    },
    positionAt: (offset: number): Position =>
      positionFor(__state.documentText.get(fsPath) ?? "", offset),
    offsetAt: (position: Position): number =>
      offsetFor(__state.documentText.get(fsPath) ?? "", position),
    getWordRangeAtPosition: (position: Position): Range | undefined => {
      const content = __state.documentText.get(fsPath) ?? "";
      const offset = offsetFor(content, position);
      const isWord = (character: string): boolean => /[A-Za-z0-9]/.test(character);

      let start = offset;
      while (start > 0 && isWord(content.charAt(start - 1))) start -= 1;
      let end = offset;
      while (end < content.length && isWord(content.charAt(end))) end += 1;

      if (start === end) return undefined;
      return new Range(positionFor(content, start), positionFor(content, end));
    },
  };

  __state.textDocuments.push(document);
  for (const listener of __state.openListeners) listener(document);
  return document;
}

/** Edit an open document. */
export function __changeDocument(fsPath: string, text: string): void {
  __state.documentText.set(fsPath, text);

  const document = __state.textDocuments.find((candidate) => candidate.uri.fsPath === fsPath);
  if (document === undefined) return;
  document.version = (document.version ?? 1) + 1;
  // An edit makes the buffer unsaved, which is what the host reports and what
  // any "should this read the buffer or the file?" decision turns on.
  document.isDirty = true;

  const event = { document: { uri: document.uri } };
  for (const listener of __state.changeListeners) listener(event);
}

/** Close an open document. */
export function __closeDocument(fsPath: string): void {
  const index = __state.textDocuments.findIndex((candidate) => candidate.uri.fsPath === fsPath);
  if (index < 0) return;

  const [document] = __state.textDocuments.splice(index, 1);
  __state.documentText.delete(fsPath);
  if (document !== undefined) {
    for (const listener of __state.closeListeners) listener(document);
  }
}

/** Focus a document, as clicking its tab would. */
export function __setActiveEditor(document: FakeDocument | undefined): void {
  __state.activeTextEditor = document === undefined ? undefined : { document };
  for (const listener of __state.activeEditorListeners) {
    listener(__state.activeTextEditor);
  }
}

/** Simulate the webview posting a message back to the host. */
export function __sendWebviewMessage(index: number, message: unknown): void {
  const panel = __state.webviewPanels[index];
  if (!panel) throw new Error(`no webview panel at index ${index}`);
  for (const handler of panel.messageHandlers) handler(message);
}

/** Simulate an edit to a document. */
export function __fireDocumentChange(fsPath: string): void {
  const event = { document: { uri: Uri.file(fsPath) } };
  for (const listener of __state.changeListeners) listener(event);
}

/** Simulate a document save, as VS Code would emit it. */
export function __fireSave(fsPath: string): void {
  const document = { uri: Uri.file(fsPath) };
  // A save makes the buffer clean again; the file is now what the editor holds.
  const open = __state.textDocuments.find((candidate) => candidate.uri.fsPath === fsPath);
  if (open !== undefined) open.isDirty = false;
  for (const listener of __state.saveListeners) listener(document);
}

/**
 * Emit a file-system watcher event.
 *
 * @param kind - Which watcher event to emit.
 * @param fsPath - The absolute path the watcher reports.
 */
export function __fireWatcher(kind: "create" | "change" | "delete", fsPath: string): void {
  const uri = Uri.file(fsPath);
  for (const watcher of __state.fileWatchers) {
    if (watcher.disposed) continue;
    const listeners =
      kind === "create"
        ? watcher.createListeners
        : kind === "change"
          ? watcher.changeListeners
          : watcher.deleteListeners;
    for (const listener of listeners) listener(uri);
  }
}

/**
 * Emit a workspace file operation, as the host reports it for an API-driven
 * create, delete or rename.
 *
 * @param kind - Which workspace event to emit.
 * @param paths - The affected absolute paths.
 */
export function __fireWorkspaceFiles(
  kind: "create" | "delete" | "rename",
  paths: string[],
): void {
  const uris = paths.map((path) => Uri.file(path));
  const event =
    kind === "rename"
      ? { files: uris.map((uri) => ({ oldUri: uri, newUri: uri })) }
      : { files: uris };
  const listeners =
    kind === "create"
      ? __state.createFilesListeners
      : kind === "delete"
        ? __state.deleteFilesListeners
        : __state.renameFilesListeners;
  for (const listener of listeners) listener(event);
}

/**
 * Wait for real time to pass.
 *
 * Debounce tests need the timer to fire; the extension uses real timers, so the
 * wait is real too. Callers pass a value comfortably above the debounce so the
 * assertion is about behaviour rather than about scheduling luck.
 *
 * @param ms - Milliseconds to wait.
 */
export function __wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** A disposable that does nothing, as VS Code's own subscriptions expect. */
export class Disposable {
  constructor(private readonly onDispose?: () => void) {}
  dispose(): void {
    this.onDispose?.();
  }
}

/** The event-type values VS Code uses. */
export const FileType = { Unknown: 0, File: 1, Directory: 2, SymbolicLink: 64 } as const;

/** The tree item collapse states. */
export const TreeItemCollapsibleState = { None: 0, Collapsed: 1, Expanded: 2 } as const;

/** The status bar alignments. */
export const StatusBarAlignment = { Left: 1, Right: 2 } as const;

/** A position in a document. */
export class Position {
  constructor(
    readonly line: number,
    readonly character: number,
  ) {}
}

/** A range in a document. */
export class Range {
  constructor(
    readonly start: Position,
    readonly end: Position,
  ) {}
}

/** Markdown content for a hover. */
export class MarkdownString {
  value: string;

  constructor(value = "") {
    this.value = value;
  }

  appendMarkdown(text: string): MarkdownString {
    this.value += text;
    return this;
  }
}

/** A hover. */
export class Hover {
  constructor(
    readonly contents: MarkdownString | MarkdownString[],
    readonly range?: Range,
  ) {}
}

/** A colour, channels 0–1. */
export class Color {
  constructor(
    readonly red: number,
    readonly green: number,
    readonly blue: number,
    readonly alpha = 1,
  ) {}
}

/** A text edit. */
export class TextEdit {
  static replace(range: Range, newText: string): TextEdit {
    return new TextEdit(range, newText);
  }

  constructor(
    readonly range: Range,
    readonly newText: string,
  ) {}
}

/** The diagnostic severities. */
export const DiagnosticSeverity = { Error: 0, Warning: 1, Information: 2, Hint: 3 } as const;

/** A diagnostic. */
export class Diagnostic {
  code?: string | number;
  source?: string;

  constructor(
    readonly range: Range,
    readonly message: string,
    readonly severity: number,
  ) {}
}

/** The editor columns. */
export const ViewColumn = { Active: -1, Beside: -2, One: 1, Two: 2 } as const;

/** A codicon icon. */
export class ThemeIcon {
  constructor(
    readonly id: string,
    readonly color?: ThemeColor,
  ) {}
}

/** A theme colour reference. */
export class ThemeColor {
  constructor(readonly id: string) {}
}

/**
 * A file-system URI.
 *
 * Carries the full `vscode.Uri` shape — including `authority`, `query`,
 * `fragment`, `with` and `toJSON` — so values of this class are assignable to
 * the real `Uri` type. Without that, every call into extension code that takes a
 * `Uri` would need a cast in the tests, which would hide exactly the kind of
 * structural mismatch worth knowing about.
 */
export class Uri {
  scheme = "file";
  authority = "";
  query = "";
  fragment = "";
  readonly fsPath: string;
  readonly path: string;

  constructor(fsPath: string) {
    this.fsPath = fsPath;
    this.path = fsPath.replace(/\\/g, "/");
  }

  static file(fsPath: string): Uri {
    return new Uri(fsPath);
  }

  static joinPath(base: Uri, ...segments: string[]): Uri {
    const joined = [base.fsPath.replace(/[\\/]+$/, ""), ...segments].join("/");
    return new Uri(joined);
  }

  with(change: {
    scheme?: string;
    authority?: string;
    path?: string;
    query?: string;
    fragment?: string;
  }): Uri {
    const next = new Uri(change.path ?? this.fsPath);
    next.scheme = change.scheme ?? this.scheme;
    next.authority = change.authority ?? this.authority;
    next.query = change.query ?? this.query;
    next.fragment = change.fragment ?? this.fragment;
    return next;
  }

  toJSON(): { scheme: string; authority: string; path: string; query: string; fragment: string } {
    return {
      scheme: this.scheme,
      authority: this.authority,
      path: this.path,
      query: this.query,
      fragment: this.fragment,
    };
  }

  toString(): string {
    return `${this.scheme}://${this.authority}${this.path}`;
  }
}

/** A tree item. */
export class TreeItem {
  label: string;
  collapsibleState: number;
  description?: string;
  iconPath?: ThemeIcon;
  tooltip?: string;
  contextValue?: string;
  command?: unknown;

  constructor(label: string, collapsibleState: number) {
    this.label = label;
    this.collapsibleState = collapsibleState;
  }
}

/** A minimal event emitter matching the `EventEmitter` surface the source uses. */
export class EventEmitter<T> {
  private readonly listeners: ((value: T) => void)[] = [];

  readonly event = (listener: (value: T) => void): Disposable => {
    this.listeners.push(listener);
    return new Disposable(() => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) this.listeners.splice(index, 1);
    });
  };

  fire(value: T): void {
    for (const listener of this.listeners) listener(value);
  }

  dispose(): void {
    this.listeners.length = 0;
  }
}

/** The language-feature surface the extension uses. */
export const languages = {
  createDiagnosticCollection(name: string): RecordedDiagnosticCollection & {
    set(uri: Uri, diagnostics: readonly unknown[]): void;
    delete(uri: Uri): void;
    clear(): void;
    dispose(): void;
  } {
    const record: RecordedDiagnosticCollection = {
      name,
      entries: new Map(),
      setCalls: 0,
      deleteCalls: 0,
      disposed: false,
    };
    __state.diagnosticCollections.push(record);

    return Object.assign(record, {
      set(uri: Uri, diagnostics: readonly unknown[]): void {
        record.setCalls += 1;
        record.entries.set(uri.toString(), [...diagnostics]);
      },
      delete(uri: Uri): void {
        record.deleteCalls += 1;
        record.entries.delete(uri.toString());
      },
      clear(): void {
        record.entries.clear();
      },
      dispose(): void {
        record.disposed = true;
        record.entries.clear();
      },
    });
  },

  registerHoverProvider(language: string, provider: unknown): Disposable {
    __state.hoverProviders.push({ language, provider });
    return new Disposable(() => {
      const index = __state.hoverProviders.findIndex((entry) => entry.provider === provider);
      if (index >= 0) __state.hoverProviders.splice(index, 1);
    });
  },

  registerColorProvider(language: string, provider: unknown): Disposable {
    __state.colorProviders.push({ language, provider });
    return new Disposable(() => {
      const index = __state.colorProviders.findIndex((entry) => entry.provider === provider);
      if (index >= 0) __state.colorProviders.splice(index, 1);
    });
  },
};

/** The command registry. */
export const commands = {
  registerCommand(id: string, handler: CommandHandler): Disposable {
    __state.commands.set(id, handler);
    return new Disposable(() => {
      __state.commands.delete(id);
    });
  },

  /**
   * Run a command by id, recording the call.
   *
   * A command that hands off to another one — `Browse Presets` opening the
   * Studio — is only correct if the hand-off reaches a registered handler, so
   * this dispatches rather than only recording.
   *
   * @param id - The command id.
   * @param args - Its arguments.
   * @returns The handler's result, or `undefined` when nothing is registered.
   */
  executeCommand(id: string, ...args: unknown[]): Promise<unknown> {
    __state.executed.push({ id, args });
    const handler = __state.commands.get(id);
    return Promise.resolve(handler === undefined ? undefined : handler(...args));
  },
};

/** The window surface the extension uses. */
export const window = {
  showInputBox(): Promise<string | undefined> {
    return Promise.resolve(
      __state.inputBoxQueue.length > 0 ? __state.inputBoxQueue.shift() : __state.inputBox,
    );
  },

  showSaveDialog(options: { defaultUri?: Uri }): Promise<Uri | undefined> {
    __state.saveDialogDefaults.push(options.defaultUri?.fsPath);
    return Promise.resolve(__state.saveDialog);
  },

  showTextDocument(uri: Uri, options?: { selection?: Range }): Promise<unknown> {
    const start = options?.selection?.start;
    __state.openedDocuments.push({
      path: uri.fsPath,
      ...(start === undefined ? {} : { line: start.line, column: start.character }),
    });
    return Promise.resolve({ document: { uri } });
  },

  showInformationMessage(message: string): Promise<undefined> {
    __state.info.push(message);
    return Promise.resolve(undefined);
  },

  showWarningMessage(
    message: string,
    optionsOrItem?: unknown,
    ...items: string[]
  ): Promise<string | undefined> {
    __state.warnings.push(message);
    // A warning with no action items is a notification, not a question.
    const choices = [
      ...(typeof optionsOrItem === "string" ? [optionsOrItem] : []),
      ...items,
    ];
    if (choices.length === 0) return Promise.resolve(undefined);
    return Promise.resolve(__state.modalAnswer);
  },

  showOpenDialog(): Promise<Uri[] | undefined> {
    if (__state.openDialogQueue.length > 0) {
      return Promise.resolve(__state.openDialogQueue.shift());
    }
    return Promise.resolve(__state.openDialog);
  },

  /**
   * Pick by label.
   *
   * Selecting by label rather than by index is what makes a test read as the
   * user's intent ("copy the dark theme") instead of a positional guess.
   */
  showQuickPick<T extends { label: string; description?: string; detail?: string }>(
    items: readonly T[],
    options?: { placeHolder?: string },
  ): Promise<T | undefined> {
    __state.quickPickItems = items.map((item) => ({
      label: item.label,
      description: item.description,
      detail: item.detail,
    }));
    __state.quickPickPlaceHolder = options?.placeHolder;

    const wanted =
      __state.quickPickQueue.length > 0 ? __state.quickPickQueue.shift() : __state.quickPickSelection;
    if (wanted === undefined) return Promise.resolve(undefined);
    return Promise.resolve(items.find((item) => item.label === wanted));
  },

  /** The editor the user is looking at, when a test sets one. */
  onDidChangeActiveTextEditor(
    listener: (editor: { document: FakeDocument } | undefined) => void,
  ): Disposable {
    __state.activeEditorListeners.push(listener);
    return new Disposable(() => {
      const index = __state.activeEditorListeners.indexOf(listener);
      if (index >= 0) __state.activeEditorListeners.splice(index, 1);
    });
  },

  get activeTextEditor(): { document: FakeDocument } | undefined {
    return __state.activeTextEditor;
  },

  registerWebviewViewProvider(id: string, provider: unknown, options: unknown): Disposable {
    __state.webviewViewProviders.push({ id, provider, options });
    return new Disposable(() => {
      const index = __state.webviewViewProviders.findIndex((entry) => entry.provider === provider);
      if (index >= 0) __state.webviewViewProviders.splice(index, 1);
    });
  },

  registerFileDecorationProvider(provider: unknown): Disposable {
    __state.fileDecorationProviders.push(provider);
    return new Disposable(() => {
      const index = __state.fileDecorationProviders.indexOf(provider);
      if (index >= 0) __state.fileDecorationProviders.splice(index, 1);
    });
  },

  createWebviewPanel(
    viewType: string,
    title: string,
    _column: number,
    options: unknown,
  ): unknown {
    const record: RecordedWebviewPanel = {
      viewType,
      title,
      options,
      html: "",
      posted: [],
      revealed: false,
      disposed: false,
      messageHandlers: [],
      disposeHandlers: [],
      close: () => undefined,
    };
    __state.webviewPanels.push(record);

    const handle = {
      webview: {
        cspSource: "vscode-webview://stub",
        // Real panels rewrite a disk path into a webview URI; the stub keeps the
        // path so a test can assert what the document references.
        asWebviewUri(uri: unknown): unknown {
          return uri;
        },
        get html(): string {
          return record.html;
        },
        set html(value: string) {
          record.html = value;
        },
        onDidReceiveMessage(handler: (message: unknown) => void): Disposable {
          record.messageHandlers.push(handler);
          return new Disposable(() => {
            const index = record.messageHandlers.indexOf(handler);
            if (index >= 0) record.messageHandlers.splice(index, 1);
          });
        },
        postMessage(message: unknown): Promise<boolean> {
          if (record.disposed) return Promise.resolve(false);
          record.posted.push(message);
          return Promise.resolve(true);
        },
      },
      get iconPath(): unknown {
        return record.iconPath;
      },
      set iconPath(value: unknown) {
        record.iconPath = value;
      },
      onDidDispose(handler: () => void): Disposable {
        record.disposeHandlers.push(handler);
        return new Disposable(() => {
          const index = record.disposeHandlers.indexOf(handler);
          if (index >= 0) record.disposeHandlers.splice(index, 1);
        });
      },
      reveal(): void {
        record.revealed = true;
      },
      dispose(): void {
        if (record.disposed) return;
        record.disposed = true;
        for (const handler of record.disposeHandlers.slice()) handler();
      },
    };

    record.close = () => {
      handle.dispose();
    };

    return handle;
  },

  createOutputChannel(name: string): RecordedOutputChannel & {
    appendLine(value: string): void;
    append(value: string): void;
    clear(): void;
    show(): void;
    hide(): void;
    dispose(): void;
  } {
    const channel: RecordedOutputChannel = {
      name,
      lines: [],
      shown: false,
      cleared: false,
      disposed: false,
    };
    __state.outputChannels.push(channel);

    return Object.assign(channel, {
      appendLine(value: string): void {
        channel.lines.push(value);
      },
      append(value: string): void {
        channel.lines.push(value);
      },
      clear(): void {
        channel.lines.length = 0;
        channel.cleared = true;
      },
      show(): void {
        channel.shown = true;
      },
      hide(): void {
        channel.shown = false;
      },
      dispose(): void {
        channel.disposed = true;
      },
    });
  },

  showErrorMessage(message: string): Promise<undefined> {
    __state.errors.push(message);
    return Promise.resolve(undefined);
  },

  createTreeView(id: string, options: { treeDataProvider: unknown }): Disposable {
    const record: RecordedTreeView = { id, provider: options.treeDataProvider, disposed: false };
    __state.treeViews.push(record);
    return new Disposable(() => {
      record.disposed = true;
    });
  },

  createStatusBarItem(): RecordedStatusBarItem {
    const item: RecordedStatusBarItem = { text: "", visible: false, disposed: false };
    __state.statusBarItems.push(item);

    return Object.assign(item, {
      show(): void {
        item.visible = true;
      },
      hide(): void {
        item.visible = false;
      },
      dispose(): void {
        item.disposed = true;
        item.visible = false;
      },
    });
  },
};

/** The environment surface the extension uses. */
export const env = {
  clipboard: {
    async writeText(text: string): Promise<void> {
      if (__state.clipboardError !== null) throw __state.clipboardError;
      __state.clipboard.push(text);
    },
  },
};

/** The workspace surface the extension uses. */
export const workspace = {
  get workspaceFolders(): { uri: Uri; name: string; index: number }[] | undefined {
    if (__state.folders.length === 0) return undefined;
    return __state.folders.map((fsPath, index) => ({
      uri: new Uri(fsPath),
      name: fsPath.replace(/[\\/]+$/, "").split(/[\\/]/).pop() ?? fsPath,
      index,
    }));
  },

  fs: {
    async readFile(uri: Uri): Promise<Uint8Array> {
      __state.fsCalls.readFile += 1;
      return readFileSync(uri.fsPath);
    },

    async readDirectory(uri: Uri): Promise<[string, number][]> {
      __state.fsCalls.readDirectory += 1;
      return readdirSync(uri.fsPath, { withFileTypes: true }).map((entry) => [
        entry.name,
        entry.isFile() ? FileType.File : entry.isDirectory() ? FileType.Directory : FileType.SymbolicLink,
      ]);
    },

    async writeFile(uri: Uri, content: Uint8Array): Promise<void> {
      mkdirSync(dirname(uri.fsPath), { recursive: true });
      writeFileSync(uri.fsPath, content);
      __state.written.push({
        path: uri.fsPath,
        contents: Buffer.from(content).toString("utf8"),
      });
    },
  },

  onDidChangeWorkspaceFolders(listener: (event: unknown) => void): Disposable {
    __state.folderListeners.push(listener);
    return new Disposable(() => {
      const index = __state.folderListeners.indexOf(listener);
      if (index >= 0) __state.folderListeners.splice(index, 1);
    });
  },

  /**
   * The folder containing a URI, matching the host's prefix semantics.
   *
   * Longest match wins, as in VS Code, so nested folders resolve to the innermost
   * one rather than to whichever happened to be listed first.
   */
  getWorkspaceFolder(uri: Uri): { uri: Uri; name: string; index: number } | undefined {
    const candidates = (workspace.workspaceFolders ?? []).filter((folder) => {
      const base = folder.uri.fsPath.replace(/[\\/]+$/, "");
      return uri.fsPath === base || uri.fsPath.startsWith(`${base}/`) || uri.fsPath.startsWith(`${base}\\`);
    });

    return candidates.sort((a, b) => b.uri.fsPath.length - a.uri.fsPath.length)[0];
  },

  get textDocuments(): { uri: Uri; getText(): string; isDirty: boolean }[] {
    return __state.textDocuments;
  },

  onDidOpenTextDocument(listener: (document: FakeDocument) => void): Disposable {
    __state.openListeners.push(listener);
    return new Disposable(() => {
      const index = __state.openListeners.indexOf(listener);
      if (index >= 0) __state.openListeners.splice(index, 1);
    });
  },

  onDidCloseTextDocument(listener: (document: FakeDocument) => void): Disposable {
    __state.closeListeners.push(listener);
    return new Disposable(() => {
      const index = __state.closeListeners.indexOf(listener);
      if (index >= 0) __state.closeListeners.splice(index, 1);
    });
  },

  onDidChangeTextDocument(listener: (event: { document: { uri: Uri } }) => void): Disposable {
    __state.changeListeners.push(listener);
    return new Disposable(() => {
      const index = __state.changeListeners.indexOf(listener);
      if (index >= 0) __state.changeListeners.splice(index, 1);
    });
  },

  onDidSaveTextDocument(listener: (document: { uri: Uri }) => void): Disposable {
    __state.saveListeners.push(listener);
    return new Disposable(() => {
      const index = __state.saveListeners.indexOf(listener);
      if (index >= 0) __state.saveListeners.splice(index, 1);
    });
  },

  createFileSystemWatcher(glob: unknown): {
    onDidCreate(listener: (uri: Uri) => void): Disposable;
    onDidChange(listener: (uri: Uri) => void): Disposable;
    onDidDelete(listener: (uri: Uri) => void): Disposable;
    dispose(): void;
  } {
    const record: RecordedFileWatcher = {
      glob,
      createListeners: [],
      changeListeners: [],
      deleteListeners: [],
      disposed: false,
    };
    __state.fileWatchers.push(record);

    const register = (
      listeners: ((uri: Uri) => void)[],
      listener: (uri: Uri) => void,
    ): Disposable => {
      listeners.push(listener);
      return new Disposable(() => {
        const index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
      });
    };

    return {
      onDidCreate: (listener) => register(record.createListeners, listener),
      onDidChange: (listener) => register(record.changeListeners, listener),
      onDidDelete: (listener) => register(record.deleteListeners, listener),
      dispose(): void {
        record.disposed = true;
        record.createListeners.length = 0;
        record.changeListeners.length = 0;
        record.deleteListeners.length = 0;
      },
    };
  },

  onDidCreateFiles(listener: (event: unknown) => void): Disposable {
    __state.createFilesListeners.push(listener);
    return new Disposable(() => {
      const index = __state.createFilesListeners.indexOf(listener);
      if (index >= 0) __state.createFilesListeners.splice(index, 1);
    });
  },

  onDidDeleteFiles(listener: (event: unknown) => void): Disposable {
    __state.deleteFilesListeners.push(listener);
    return new Disposable(() => {
      const index = __state.deleteFilesListeners.indexOf(listener);
      if (index >= 0) __state.deleteFilesListeners.splice(index, 1);
    });
  },

  onDidRenameFiles(listener: (event: unknown) => void): Disposable {
    __state.renameFilesListeners.push(listener);
    return new Disposable(() => {
      const index = __state.renameFilesListeners.indexOf(listener);
      if (index >= 0) __state.renameFilesListeners.splice(index, 1);
    });
  },
};
