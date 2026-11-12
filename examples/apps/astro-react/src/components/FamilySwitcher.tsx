import { useProvidedThemes, useTheme } from "@themvora/astro/client";

const FamilySwitcher = () => {
  const { setFamily } = useTheme();
  const provided = useProvidedThemes();

  return (
    <select
      name="families"
      id="families"
      onChange={(e) => setFamily(e.target.value)}
    >
      {provided.map((familiy) => (
        <option key={familiy.family}>{familiy.family}</option>
      ))}
    </select>
  );
};

export default FamilySwitcher;
