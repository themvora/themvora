import { useTheme } from "@themvora/react";

const ThemeSwitcher = () => {
  const { toggleTheme } = useTheme();

  return (
    <div className="my-4 flex items-center justify-center">
      {/* Theme toggler */}
      <button
        type="button"
        onClick={toggleTheme}
        className="w-full max-w-fit cursor-pointer rounded-md bg-primary px-4 py-2 text-primary-foreground transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--theme-color-ring)"
      >
        Toggle light/dark
      </button>
    </div>
  );
};

export default ThemeSwitcher;
