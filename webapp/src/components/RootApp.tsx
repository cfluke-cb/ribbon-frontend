import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import styled from "styled-components";

import Header from "./Header/Header";
import Homepage from "../pages/Home/Homepage";
import DepositPage from "../pages/DepositPage/DepositPage";
import useEagerConnect from "shared/lib/hooks/useEagerConnect";
import PortfolioPage from "../pages/Portfolio/PortfolioPage";
import Footer from "./Footer/Footer";
import useScreenSize from "shared/lib/hooks/useScreenSize";
import { TxStatusToast, WithdrawReminderToast } from "./Common/toasts";
import WalletConnectModal from "./Wallet/WalletConnectModal";
import StakingPage from "../pages/Staking/StakingPage";
import NotFound from "shared/lib/pages/NotFound";
import colors from "shared/lib/designSystem/colors";
import YourPositionModal from "./Vault/Modal/YourPositionModal";
import PausePositionModal from "./Vault/Modal/PausePositionModal";
import ResumePositionModal from "./Vault/Modal/ResumePositionModal";
import EarnPage from "../pages/DepositPage/EarnPage";
const Root = styled.div<{ screenHeight: number }>`
  background-color: ${colors.background.one};
  min-height: ${(props) =>
    props.screenHeight ? `${props.screenHeight}px` : `100vh`};
`;

const RootApp = () => {
  useEagerConnect();
  const { height: screenHeight } = useScreenSize();

  return (
    <Root id="appRoot" screenHeight={screenHeight}>
      <WalletConnectModal />
      <YourPositionModal />
      <PausePositionModal />
      <ResumePositionModal />
      <Router>
        <Header />
        <WithdrawReminderToast />
        <TxStatusToast />
        <Switch>
          <Route path="/" exact>
            <Homepage />
          </Route>
          <Route path="/theta-vault/:vaultSymbol">
            <DepositPage />
          </Route>
          <Route path="/v2/theta-vault/:vaultSymbol">
            <DepositPage />
          </Route>
          <Route path="/R-EARN">
            <EarnPage />
          </Route>
          <Route path="/portfolio">
            <PortfolioPage />
          </Route>
          <Route path="/staking">
            <StakingPage />
          </Route>
          <Route>
            <NotFound />
          </Route>
        </Switch>
        <Footer />
      </Router>
    </Root>
  );
};

export default RootApp;
