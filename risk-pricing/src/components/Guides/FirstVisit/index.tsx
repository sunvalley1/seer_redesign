import WelcomeSvg from "@/assets/miniguides/first-visit/welcome.svg";

import GuideStructure, { IGuide } from "../GuideStructure";

import { SubTitle as WelcomeSubtitle, Title as WelcomeTitle } from "./Welcome";

const content = [
  {
    title: <WelcomeTitle />,
    subtitle: <WelcomeSubtitle />,
    svg: <WelcomeSvg className="max-h-110" />,
  },
  // {
  //   title: <ProcessAndTimelineTitle />,
  //   subtitle: <ProcessAndTimelineSubtitle />,
  //   svg: <ProcessAndTimelineSvg className="max-h-110" />,
  // },
  // {
  //   title: <MarketInfoTitle />,
  //   subtitle: <MarketInfoSubtitle />,
  //   svg: <SliderSvg className="max-h-110" />,
  // },
  // {
  //   title: <ProfitOrLossTitle />,
  //   subtitle: <ProfitOrLossSubtitle />,
  //   svg: <ProfitOrLossSvg className="max-h-110" />,
  // },
];

const FirstVisitGuide: React.FC<IGuide> = ({ isVisible, closeGuide }) => {
  return <GuideStructure content={content} {...{ isVisible, closeGuide }} />;
};

export default FirstVisitGuide;
