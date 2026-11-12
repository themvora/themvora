import { useProvidedThemes, useTheme } from "@themvora/remix";

export function ThemeSwitcher() {
  const provided = useProvidedThemes();
  const { setFamily, family } = useTheme();

  return (
    <div>
      <h1>Use Theme Families</h1>

      <select
        name="families"
        id="families"
        onChange={(e) => setFamily(e.target.value)}
        value={family}
      >
        {provided.map((p) => (
          <option key={p.family} value={p.family}>
            {p.family}
          </option>
        ))}
      </select>
    </div>
  );
}
