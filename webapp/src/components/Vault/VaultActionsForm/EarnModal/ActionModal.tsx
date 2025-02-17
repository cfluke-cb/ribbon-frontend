import React, { useCallback, useState } from "react";
import styled from "styled-components";
import MobileOverlayMenu from "shared/lib/components/Common/MobileOverlayMenu";
import colors from "shared/lib/designSystem/colors";
import { Title } from "shared/lib/designSystem";
import ActionSteps from "./ActionSteps";
import { ActionType, Steps, STEPS, V2WithdrawOption } from "./types";
import sizes from "shared/lib/designSystem/sizes";
import { ThinBackIcon, CloseIcon } from "shared/lib/assets/icons/icons";
import { VaultOptions, VaultVersion } from "shared/lib/constants/constants";
import theme from "shared/lib/designSystem/theme";

import { capitalize } from "shared/lib/utils/text";

const ModalNavigation = styled.div`
  position: absolute;
  top: 28px;
  left: 14px;
  width: calc(100% - 14px);
  padding-right: 28px;
`;

const ArrowBack = styled.i`
  color: ${colors.primaryText};
  height: 14px;
  margin-right: 20px;
`;

const ModalNavigationCloseButton = styled.span`
  margin-left: auto;
`;

interface ModalBodyProps extends ModalProps {
  isFormStep: boolean;
  steps: Steps;
  actionType: ActionType;
}

const ModalBody = styled.div<ModalBodyProps>`
  display: flex;
  flex-direction: column;
  background: ${colors.background.two};
  box-sizing: border-box;
  border-radius: 8px;
  width: ${(props) => (props.variant === "desktop" ? "343px" : "375px")};
  max-width: 450px;
  min-height: ${(props) => {
    switch (props.steps) {
      case STEPS.confirmationStep:
      case STEPS.submittedStep:
      case STEPS.previewStep:
      case STEPS.formStep:
        return "unset";
      default:
        return "396px";
    }
  }};

  ${(props) =>
    props.variant === "mobile" &&
    props.isFormStep &&
    `
      background: none;
      border: none;
  `}

  @media (max-width: ${sizes.md}px) {
    max-height: unset;
    min-height: unset;
  }
`;

const modalPadding = 16;

const ModalHeaderWithBackground = styled.div`
  background: ${colors.background.one};
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  padding-top: 20px;
  padding-bottom: 20px;
  padding-left: ${modalPadding}px;
  padding-right: ${modalPadding}px;
  margin-bottom: 24px;
`;

const InvisibleModalHeader = styled.div`
  padding-top: 32px;
`;

const ModalContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 100%;
`;

const ModalHeaderCloseButton = styled.i`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: ${theme.border.width} ${theme.border.style} ${colors.border};
  border-radius: 48px;
  cursor: pointer;
  position: absolute;
  right: ${modalPadding}px;
  z-index: 10;
`;

const ModalHeaderBackButton = styled.i`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: ${theme.border.width} ${theme.border.style} ${colors.border};
  border-radius: 48px;
  cursor: pointer;
  position: absolute;
  left: ${modalPadding}px;
  z-index: 10;
`;

const StepsContainer = styled.div<ModalProps>`
  display: flex;
  flex-direction: column;
  flex: 1;
  ${(props) =>
    props.variant === "desktop" &&
    `
    height: 100%;
    `}

  width: 100%;
  padding-left: ${modalPadding}px;
  padding-right: ${modalPadding}px;
`;

interface ModalProps {
  variant: "desktop" | "mobile";
}

interface ActionModalProps extends ModalProps {
  vault: {
    vaultOption: VaultOptions;
    vaultVersion: VaultVersion;
  };
  show: boolean;
  onClose: () => void;
  withdrawOption: V2WithdrawOption;
  actionType: ActionType;
}

const ActionModal: React.FC<ActionModalProps> = ({
  vault,
  show,
  onClose,
  variant,
  withdrawOption,
  actionType,
}) => {
  const [step, setStep] = useState<Steps>(0);
  const isDesktop = variant === "desktop";

  const renderModalNavigationItem = useCallback(() => {
    if (isDesktop) {
      return;
    }

    if (step === STEPS.confirmationStep || step === STEPS.submittedStep) {
      return (
        <>
          <ModalNavigationCloseButton onClick={onClose}>
            <CloseIcon></CloseIcon>
          </ModalNavigationCloseButton>
        </>
      );
    }

    return (
      <div onClick={onClose} role="button">
        <ArrowBack className="fas fa-arrow-left"></ArrowBack>
        <Title>Back</Title>
      </div>
    );
  }, [isDesktop, onClose, step]);

  const renderModalCloseButton = useCallback(() => {
    if (!isDesktop) {
      return;
    }

    return (
      <ModalHeaderCloseButton onClick={onClose}>
        <CloseIcon />
      </ModalHeaderCloseButton>
    );
  }, [isDesktop, onClose]);

  const renderModalBackButton = useCallback(() => {
    if (!isDesktop) {
      return;
    }

    return (
      withdrawOption !== "complete" && (
        <ModalHeaderBackButton onClick={() => setStep(STEPS.formStep)}>
          <ThinBackIcon />
        </ModalHeaderBackButton>
      )
    );
  }, [isDesktop, withdrawOption]);

  const renderModalHeader = useCallback(() => {
    if (step === STEPS.formStep) {
      return (
        <InvisibleModalHeader className="position-relative d-flex align-items-center justify-content-center">
          {renderModalCloseButton()}
        </InvisibleModalHeader>
      );
    }
    if (step === STEPS.previewStep) {
      return (
        <InvisibleModalHeader className="position-relative d-flex align-items-center justify-content-center">
          {renderModalCloseButton()}
          {renderModalBackButton()}
        </InvisibleModalHeader>
      );
    }

    const actionWord = capitalize(actionType);
    const titles = {
      [STEPS.formStep]: "Deposit",
      [STEPS.previewStep]: "Deposit Preview",
      [STEPS.confirmationStep]: `Confirm ${actionWord}`,
      [STEPS.submittedStep]: "Transaction Submitted",
    };

    return (
      <ModalHeaderWithBackground className="position-relative d-flex align-items-center justify-content-center">
        <Title>{titles[step]}</Title>
        {renderModalCloseButton()}
      </ModalHeaderWithBackground>
    );
  }, [actionType, renderModalBackButton, renderModalCloseButton, step]);

  return (
    <div>
      <MobileOverlayMenu
        isMenuOpen={show}
        onClick={onClose}
        mountRoot="div#root"
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ModalNavigation className="d-flex flex-row align-items-center">
          {renderModalNavigationItem()}
        </ModalNavigation>
        <ModalBody
          isFormStep={step === STEPS.formStep}
          variant={variant}
          steps={step}
          actionType={actionType}
        >
          {renderModalHeader()}

          <ModalContent className="position-relative">
            <StepsContainer variant={variant}>
              <ActionSteps
                actionType={actionType}
                vault={vault}
                skipToPreview={isDesktop}
                v2WithdrawOption={withdrawOption}
                show={show}
                onClose={onClose}
                step={step}
                onChangeStep={setStep}
              />
            </StepsContainer>
          </ModalContent>
        </ModalBody>
      </MobileOverlayMenu>
    </div>
  );
};

export default ActionModal;
