export type SeerTheme = "dark" | "light";

export const SEER_THEME_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )seer-theme=(dark|light)/);localStorage.setItem("theme",m?m[1]:"dark");}catch(e){}})();`;

export function writeSeerTheme(theme: SeerTheme) {
  if (typeof document === "undefined") return;
  const host = window.location.hostname;
  const domain =
    host === "seer.pm" || host.endsWith(".seer.pm") ? "; domain=.seer.pm" : "";
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `seer-theme=${theme}; path=/; max-age=31536000; SameSite=Lax${domain}${secure}`;
}
