import { useToggle } from "react-use";

import BookIcon from "@/assets/svg/book-open.svg";

import { cn } from "@/utils";

import FirstVisitGuide from "./Guides/FirstVisit";

import LightButton from "./LightButton";

type QuickGuideButtonProps = {
  className?: string;
};

const QuickGuideButton: React.FC<QuickGuideButtonProps> = ({ className }) => {
  const [isOpen, toggleGuide] = useToggle(false);
  return (
    <>
      <LightButton
        text={"Guide"}
        Icon={BookIcon}
        className={cn(
          "[&_.button-text]:text-sb-ink-3! hover:[&_.button-text]:text-sb-ink!",
          "[&_.button-text]:text-sm [&_.button-text]:font-medium!",
          "hover:bg-sb-bg-2 rounded-md! px-3.5 py-2 [&>svg]:mr-1.5",
          "[&>svg_path]:fill-sb-ink-4 hover:[&>svg_path]:fill-sb-ink",
          className,
        )}
        small
        onPress={toggleGuide}
      />

      <FirstVisitGuide
        isVisible={isOpen}
        closeGuide={() => {
          toggleGuide(false);
        }}
      />
    </>
  );
};
export default QuickGuideButton;
