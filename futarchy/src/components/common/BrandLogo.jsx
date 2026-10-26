// components/common/BrandLogo.jsx
//
// The site wordmark: the Seer lockup next to the product name. Header, Footer
// and CompaniesHeader all render it, so the brand lives in one place.

import { SeerLogo } from "./SeerLogo";

const BrandLogo = ({ className = '' }) => (
  <span className={`inline-flex items-center gap-3 ${className}`}>
    <SeerLogo className="h-5 w-auto shrink-0" />
    <span aria-hidden="true" className="h-4 w-px bg-futarchyGray62 dark:bg-futarchyGray6" />
    <span className="text-sm font-medium leading-none opacity-80">
      Futarchy
    </span>
  </span>
);

export default BrandLogo;
