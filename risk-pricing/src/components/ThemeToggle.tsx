import { useMemo } from "react";

import { useTheme } from "next-themes";

import MoonIcon from "@/assets/svg/moon.svg";
import SunIcon from "@/assets/svg/sun.svg";

import { cn } from "@/utils";
import { writeSeerTheme } from "@/utils/seerTheme";

import LightButton from "./LightButton";

const ThemeToggle: React.FC<{
  className?: string;
  iconClassName?: string;
  withText?: boolean;
}> = ({ className, iconClassName, withText = false }) => {
  const { resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    const next = resolvedTheme === "light" ? "dark" : "light";
    setTheme(next);
    writeSeerTheme(next);
  };

  const text = useMemo(
    () => (resolvedTheme === "light" ? "Dark Mode" : "Light Mode"),
    [resolvedTheme],
  );
  return (
    <LightButton
      ariaLabel={text}
      text={withText ? text : ""}
      onPress={toggleTheme}
      icon={
        resolvedTheme === "light" ? (
          <MoonIcon className={cn("size-4", iconClassName)} />
        ) : (
          <SunIcon className={cn("size-4", iconClassName)} />
        )
      }
      className={cn(
        "flex min-h-8 items-center",
        "[&>p]:text-klerosUIComponentsPrimaryText [&>p]:font-normal",
        { "[&>p]:ml-2": withText },
        className,
      )}
    />
  );
};

export default ThemeToggle;
