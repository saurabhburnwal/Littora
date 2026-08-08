import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const stored = localStorage.getItem("littora_theme");
    return (stored === "earth" || stored === "dark") ? stored : "earth";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("littora_theme", theme);
  }, [theme]);

  const setTheme = useCallback((newTheme) => {
    if (["earth", "dark"].includes(newTheme)) {
      setThemeState(newTheme);
    }
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return { theme: "earth", setTheme: () => {} };
  }
  return context;
}
