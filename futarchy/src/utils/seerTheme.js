export const SEER_THEME_SCRIPT = `(function(){var t='dark';try{var m=document.cookie.match(/(?:^|; )seer-theme=(dark|light)/);if(m)t=m[1];}catch(e){}var c=document.documentElement.classList;if(t==='dark'){c.add('dark')}else{c.remove('dark')}})();`;

export function readSeerTheme() {
  if (typeof document === 'undefined') return 'dark';
  const match = document.cookie.match(/(?:^|; )seer-theme=(dark|light)/);
  return match ? match[1] : 'dark';
}

export function writeSeerTheme(theme) {
  if (typeof document === 'undefined') return;
  const host = window.location.hostname;
  const domain = host === 'seer.pm' || host.endsWith('.seer.pm') ? '; domain=.seer.pm' : '';
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `seer-theme=${theme}; path=/; max-age=31536000; SameSite=Lax${domain}${secure}`;
}
