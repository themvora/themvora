// Used inside the root provider, so it does NOT create a second runtime of its own.
import { ThemeScope, useThemeHistory } from "@themvora/remix";

export function HistoryScope() {
  const { undo, redo, canUndo, canRedo } = useThemeHistory();

  return (
    <div>
      <div>
        <button onClick={undo} disabled={!canUndo}>
          Undo
        </button>
        <button onClick={redo} disabled={!canRedo}>
          Redo
        </button>
      </div>

      <ThemeScope theme="plum-dark" transition={{ duration: 300, easing: "ease" }}>
        <span>Always plum-dark</span>
      </ThemeScope>
    </div>
  );
}
