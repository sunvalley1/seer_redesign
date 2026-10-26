import { create } from "zustand";
import { type StateStorage, createJSONStorage, persist } from "zustand/middleware";

type Theme = "light" | "dark";

const readCookieTheme = (): Theme | null => {
  const match = document.cookie.match(/(?:^|; )seer-theme=(dark|light)/);
  return match ? (match[1] as Theme) : null;
};

const writeCookieTheme = (theme: Theme) => {
  const host = window.location.hostname;
  const domain = host === "seer.pm" || host.endsWith(".seer.pm") ? "; domain=.seer.pm" : "";
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `seer-theme=${theme}; path=/; max-age=31536000; SameSite=Lax${domain}${secure}`;
};

// Shared seer-theme cookie
const themeStorage: StateStorage = {
  getItem: () => {
    const theme = readCookieTheme();
    return theme ? JSON.stringify({ state: { theme }, version: 0 }) : null;
  },
  setItem: (_name, value) => {
    try {
      const theme = JSON.parse(value)?.state?.theme;
      if (theme === "dark" || theme === "light") writeCookieTheme(theme);
    } catch {
      // ignore malformed state
    }
  },
  removeItem: () => {},
};

type ThemeState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const updateDocumentTheme = (theme: Theme) => {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", theme);
  }
};

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "dark",
      setTheme: (theme: Theme) => {
        set({ theme });
        updateDocumentTheme(theme);
      },
      toggleTheme: () => {
        set((state) => {
          const newTheme = state.theme === "light" ? "dark" : "light";
          updateDocumentTheme(newTheme);
          return { theme: newTheme };
        });
      },
    }),
    {
      name: "theme-storage",
      storage: createJSONStorage(() => {
        if (typeof document === "undefined") throw new Error("no document");
        return themeStorage;
      }),
      onRehydrateStorage: () => (state) => {
        // Set theme on initial load after rehydration
        if (state && typeof document !== "undefined") {
          updateDocumentTheme(state.theme);
        }
      },
    },
  ),
);
