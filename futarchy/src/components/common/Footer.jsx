// components/common/Footer.jsx
import { SeerLogo } from "./SeerLogo";

const SOCIAL_LINKS = [
  { src: '/assets/social/discord.svg', alt: 'Discord', href: 'https://discord.com/invite/rBEB4MYQwV' },
  { src: '/assets/social/x.svg', alt: 'X (Twitter)', href: 'https://x.com/seer_pm' },
  { src: '/assets/social/telegram.svg', alt: 'Telegram', href: 'https://t.me/Seerpredictionmarket' },
  { src: '/assets/social/github.svg', alt: 'GitHub', href: 'https://github.com/seer-pm/futarchy' },
];

const FOOTER_LINKS = [
  { label: 'Seer App', href: 'https://app.seer.pm' },
  { label: 'Documentation', href: 'https://seer-3.gitbook.io/seer-documentation' },
];

const KLEROS_PATH =
  "M91.5278 0L105.116 0.607306L110.618 12.8297L102.856 24L89.1939 23.1252L83.5928 9.88237L91.5278 0ZM101.49 7.04523L91.6419 11.3475L100.061 17.8565L101.49 7.04523ZM100.35 4.88942L92.4796 1.50108L90.8263 8.62522L100.35 4.88942ZM98.3549 19.4943L89.8016 13.3873L90.0085 21.6626L98.3549 19.4943ZM109.252 12.8027L103.423 6.88869L101.884 18.261L109.252 12.8027ZM100.36 20.8245L93.1467 22.7097L101.63 23.2528L100.36 20.8245ZM108.112 15.4858L101.798 20.1893L103.053 22.6411L108.112 15.4858ZM105.126 2.315L103.899 4.83252L108.464 9.47253L105.126 2.315ZM103.598 1.11028L95.5811 0.784918L102.194 3.67694L103.598 1.11028ZM90.3572 2.27448L84.7422 9.36387L88.4963 10.159L90.3572 2.27448ZM88.2699 11.5497L84.4977 10.7511L88.4337 20.0227L88.2699 11.5497Z";

const Footer = ({ className = '' }) => {
  return (
    <footer className={`w-full mt-auto border-t border-futarchyGray62 dark:border-futarchyDarkGray42 bg-white dark:bg-futarchyDarkGray3 py-7 ${className}`}>
      <div className="container mx-auto px-5 flex flex-col items-start gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <a
          href="https://app.seer.pm"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Seer"
          className="inline-flex items-center text-futarchyGray12 dark:text-futarchyGray3 transition-colors hover:text-futarchyViolet9"
        >
          <SeerLogo className="h-[22px] w-auto" />
        </a>

        <div className="inline-flex items-center gap-3.5 text-futarchyGray112 dark:text-futarchyGray11" aria-label="Social links">
          {SOCIAL_LINKS.map((social) => (
            <a
              key={social.alt}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.alt}
              title={social.alt}
              className="inline-flex transition-colors hover:text-futarchyGray12 dark:hover:text-white"
            >
              <span
                aria-hidden="true"
                className="block h-[15px] w-[15px] bg-current"
                style={{
                  WebkitMask: `url(${social.src}) center / contain no-repeat`,
                  mask: `url(${social.src}) center / contain no-repeat`,
                }}
              />
            </a>
          ))}
        </div>

        <nav className="flex flex-wrap gap-[18px] text-[13px] text-futarchyGray112 dark:text-futarchyGray11 lg:mr-[120px]">
          {FOOTER_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-futarchyGray12 dark:hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.04em] text-futarchyGray112 dark:text-futarchyGray11">
          © 2026 ·
          <a
            href="https://kleros.io"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center transition-colors hover:text-futarchyGray12 dark:hover:text-white"
          >
            Secured by Kleros{' '}
            <svg width="14" height="14" viewBox="83.5 0 27.2 24" className="ml-1.5 text-futarchyViolet9" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd" fill="currentColor" d={KLEROS_PATH} />
            </svg>
          </a>
        </span>
      </div>
    </footer>
  );
};

export default Footer;
