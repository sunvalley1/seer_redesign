import SeerLogoSvg from "@/assets/svg/seer-logo.svg";

import { cn } from "@/utils";

const SeerLogo: React.FC<{ className?: string; title?: string }> = ({
  className,
  title = "Seer",
}) => (
  <SeerLogoSvg
    role="img"
    aria-label={title}
    className={cn("text-sb-ink h-7 w-auto shrink-0", className)}
  />
);

export default SeerLogo;
