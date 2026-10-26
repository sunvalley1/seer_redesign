import Image from "next/image";

import ConnectWallet from "@/components/ConnectWallet";
import EmailUpdates from "@/components/EmailUpdates";
import LightButton from "@/components/LightButton";
import QuickGuideButton from "@/components/QuickGuideButton";
import ThemeToggle from "@/components/ThemeToggle";

import HelpIcon from "@/assets/menu-icons/help.svg";

import Logo from "./Logo";

interface IDesktopNavbar {
  toggleIsHelpOpen: () => void;
}

const DesktopNavbar: React.FC<IDesktopNavbar> = ({ toggleIsHelpOpen }) => {
  return (
    <div className="relative hidden h-16 w-full items-center justify-between md:flex">
      <Logo />

      <div className="ml-2 flex items-center gap-2">
        <QuickGuideButton />
        <span
          title="Gnosis Network"
          className="inline-flex items-center gap-[7px] rounded-full py-1 pr-3 pl-1.5 font-mono text-[10.5px] font-semibold tracking-wider whitespace-nowrap uppercase"
          style={{
            color: "#04795B",
            backgroundColor: "rgba(4, 121, 91, 0.10)",
          }}
        >
          <Image
            src="/gnosis.webp"
            alt=""
            width={14}
            height={14}
            className="shrink-0 rounded-full"
            style={{
              boxShadow:
                "0 0 0 1px color-mix(in srgb, #04795B 30%, transparent)",
            }}
          />
          Gnosis Network
        </span>
        <ConnectWallet />
        <div className="flex items-center gap-2">
          <EmailUpdates className="bg-sb-bg-2 hover:bg-sb-bg-3 size-9 justify-center rounded-full! p-0" />
          <LightButton
            ariaLabel="Help"
            text=""
            onPress={toggleIsHelpOpen}
            icon={<HelpIcon className="size-4" />}
            className="bg-sb-bg-2 hover:bg-sb-bg-3 flex size-9 items-center justify-center rounded-full! p-0"
          />
          <ThemeToggle className="bg-sb-bg-2 hover:bg-sb-bg-3 size-9 justify-center rounded-full! p-0" />
        </div>
      </div>
    </div>
  );
};

export default DesktopNavbar;
