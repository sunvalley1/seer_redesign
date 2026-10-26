import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

function readTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, readTheme, () => "dark");
}

export function setTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const host = window.location.hostname;
  const domain = host === "seer.pm" || host.endsWith(".seer.pm") ? "; domain=.seer.pm" : "";
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `seer-theme=${theme}; path=/; max-age=31536000; SameSite=Lax${domain}${secure}`;
}

export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(`--sb-${name}`).trim();
}
