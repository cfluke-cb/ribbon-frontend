import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useTranslation } from "react-i18next";

import BasicModal from "shared/lib/components/Common/BasicModal";
import {
  BaseInputContainer,
  BaseInputLabel,
  SecondaryText,
  Title,
  BaseInput,
} from "shared/lib/designSystem";
import BasicInput from "shared/lib/components/Inputs/BasicInput";
import { getAssetLogo } from "shared/lib/utils/asset";
import {
  LockupPeriodKey,
  lockupPeriodToDays,
} from "shared/lib/models/lockupPeriod";
import colors from "shared/lib/designSystem/colors";
import {
  getDisplayAssets,
  VaultLiquidityMiningMap,
  VaultOptions,
} from "shared/lib/constants/constants";
import StakingPoolDropdown, { StakingPoolOption } from "./StakingPoolDropdown";
import FilterDropdown from "shared/lib/components/Common/FilterDropdown";
import {
  useLiquidityGaugeV5PoolData,
  useV2VaultData,
} from "shared/lib/hooks/web3DataContext";
import useVotingEscrow from "shared/lib/hooks/useVotingEscrow";
import { formatUnits, parseUnits } from "ethers/lib/utils";
import useLoadingText from "shared/lib/hooks/useLoadingText";
import {
  calculateBaseRewards,
  calculateBoostMultiplier,
  calculateInitialveRBNAmount,
  calculateBoostedRewards,
} from "shared/lib/utils/governanceMath";
import { useAssetsPrice } from "shared/lib/hooks/useAssetPrice";
import { BigNumber } from "ethers";
import moment from "moment";
import APYTable from "../APYTable";

const ModalContainer = styled(BasicModal)``;

const ModalColumn = styled.div<{ marginTop?: number | "auto" }>`
  display: flex;
  justify-content: center;
  margin-top: ${(props) =>
    props.marginTop === "auto"
      ? props.marginTop
      : `${props.marginTop === undefined ? 24 : props.marginTop}px`};
`;

const StakingPoolContainer = styled.div`
  width: 100%;
`;

const SmallerInputContainer = styled(BaseInputContainer)`
  height: 48px;
`;
const SmallerInput = styled(BaseInput)`
  font-size: 16px;
`;

const DurationDropdown = styled(FilterDropdown)`
  position: absolute;
  top: 50%;
  transform: translate(-8px, -50%);
  right: 0;
  z-index: 1;
`;

interface RewardsCalculatorModalProps {
  show: boolean;
  onClose: () => void;
}

const lockupPeriodDisplay = (key: LockupPeriodKey) => {
  switch (key) {
    case "WEEK":
      return "1 WEEK";
    case "MONTH":
      return "1 MONTH";
    case "3MONTH":
      return "3 MONTHS";
    case "6MONTH":
      return "6 MONTHS";
    case "YEAR":
      return "1 YEAR";
    case "2YEAR":
      return "2 YEARS";
  }
};

const stakingPools = Object.keys(VaultLiquidityMiningMap.lg5) as VaultOptions[];
const stakingPoolDropdownOptions: StakingPoolOption[] = (
  Object.keys(VaultLiquidityMiningMap.lg5) as VaultOptions[]
).map((option) => {
  const Logo = getAssetLogo(getDisplayAssets(option));
  return {
    value: option,
    label: option,
    logo: (
      <div
        style={{
          width: 32,
          height: 32,
        }}
      >
        <Logo style={{ margin: 0 }} />
      </div>
    ),
  };
});
const lockupDurationOptions = (
  Object.keys(lockupPeriodToDays) as LockupPeriodKey[]
).map((key) => {
  return {
    display: lockupPeriodDisplay(key),
    value: key,
  };
});

const RewardsCalculatorModal: React.FC<RewardsCalculatorModalProps> = ({
  show,
  onClose,
}) => {
  const votingEscrowContract = useVotingEscrow();
  const { t } = useTranslation();

  // Current Gauge
  const [currentGauge, setCurrentGauge] = useState(stakingPools[0]);

  const { prices } = useAssetsPrice();
  const { data: lg5Data, loading: lg5DataLoading } =
    useLiquidityGaugeV5PoolData(currentGauge);
  const {
    data: { asset, decimals, pricePerShare },
    loading: vaultDataLoading,
  } = useV2VaultData(currentGauge);

  const loadingText = useLoadingText();

  // Used for boost rewards calculation
  const [totalVeRBN, setTotalVeRBN] = useState<BigNumber>();

  // INPUTS
  const [stakeInput, setStakeInput] = useState<string>("");
  const [poolSizeInput, setPoolSizeInput] = useState<string>("");
  const [rbnLockedInput, setRBNLockedInput] = useState<string>("");
  const [lockupPeriod, setLockupPeriod] = useState<string>(
    lockupDurationOptions[0].value
  );

  // Initial data
  useEffect(() => {
    if (lg5Data) {
      setPoolSizeInput(formatUnits(lg5Data.poolSize, decimals));
    }
  }, [lg5Data, decimals]);

  // Fetch totalverbn
  useEffect(() => {
    if (votingEscrowContract && !totalVeRBN) {
      votingEscrowContract["totalSupply()"]().then((totalSupply: BigNumber) => {
        setTotalVeRBN(totalSupply);
      });
    }
  }, [votingEscrowContract, totalVeRBN]);

  const stakeInputHasError = useMemo(() => {
    return false;
  }, []);

  // =======================================================
  // CALCULATE REWARDS BOOSTER (using formula from CurveDAO)
  // =======================================================
  const getRewardsBooster = useCallback(() => {
    if (!stakeInput || !poolSizeInput) {
      return 0;
    }

    let working_balances = lg5Data?.workingBalances || BigNumber.from("0");
    let working_supply = lg5Data?.workingSupply || BigNumber.from("0");

    // Staking Pool
    let gaugeBalance = BigNumber.from("0");
    let poolLiquidity = BigNumber.from("0");
    let rbnLockedAmount = BigNumber.from("0");

    // If parseUnits fails, it means the number overflowed.
    // defaults to the largest number when that happens.
    try {
      gaugeBalance = parseUnits(stakeInput || "0", decimals);
    } catch (error) {
      gaugeBalance = BigNumber.from(String(Number.MAX_SAFE_INTEGER));
    }
    try {
      poolLiquidity = parseUnits(poolSizeInput || "0", decimals);
    } catch (error) {
      poolLiquidity = BigNumber.from(String(Number.MAX_SAFE_INTEGER));
    }
    try {
      rbnLockedAmount = parseUnits(rbnLockedInput || "0", 18);
    } catch (error) {
      rbnLockedAmount = BigNumber.from(String(Number.MAX_SAFE_INTEGER));
    }

    const duration = moment.duration(
      lockupPeriodToDays[lockupPeriod as LockupPeriodKey],
      "days"
    );
    const veRBNAmount = calculateInitialveRBNAmount(rbnLockedAmount, duration);
    return calculateBoostMultiplier({
      workingBalance: working_balances,
      workingSupply: working_supply,
      gaugeBalance,
      poolLiquidity,
      veRBNAmount,
      totalVeRBN: totalVeRBN || BigNumber.from("0"),
    });
  }, [
    lg5Data,
    decimals,
    lockupPeriod,
    poolSizeInput,
    rbnLockedInput,
    stakeInput,
    totalVeRBN,
  ]);

  // For display
  const displayRewards = useMemo(() => {
    let totalAPY: JSX.Element | string;
    let baseRewards: JSX.Element | string;
    let boostedRewards: JSX.Element | string;
    let rewardsBooster: JSX.Element | string;

    const assetPricesLoading = prices["RBN"].loading || prices[asset].loading;

    if (stakeInputHasError) {
      totalAPY = "---";
      baseRewards = "---";
      boostedRewards = "---";
      rewardsBooster = "---";
    } else if (lg5DataLoading || assetPricesLoading || vaultDataLoading) {
      totalAPY = loadingText;
      baseRewards = loadingText;
      boostedRewards = loadingText;
      rewardsBooster = loadingText;
    } else {
      let base = 0;
      if (lg5Data) {
        let poolLiquidity = BigNumber.from("0");
        // If parseUnits fails, it means the number overflowed.
        // defaults to the largest number when that happens.
        try {
          const yourStake = parseUnits(stakeInput || "0", decimals);
          poolLiquidity = parseUnits(poolSizeInput || "0", decimals).add(
            yourStake
          );
        } catch (error) {
          poolLiquidity = BigNumber.from(String(Number.MAX_SAFE_INTEGER));
        }
        base = calculateBaseRewards({
          poolSize: poolLiquidity,
          poolReward: lg5Data.poolRewardForDuration,
          pricePerShare,
          decimals,
          assetPrice: prices[asset].price,
          rbnPrice: prices["RBN"].price,
        });
      }
      const boosterMultiplier = getRewardsBooster();
      const boosted = calculateBoostedRewards(base, boosterMultiplier);
      baseRewards = `${base.toFixed(2)}%`;
      boostedRewards = `${boosted.toFixed(2)}%`;
      rewardsBooster = boosterMultiplier ? boosterMultiplier.toFixed(2) : "---";
      totalAPY = `${(base + boosted).toFixed(2)}%`;
    }

    return {
      totalAPY,
      baseRewards,
      boostedRewards,
      rewardsBooster,
    };
  }, [
    asset,
    decimals,
    lg5Data,
    pricePerShare,
    prices,
    stakeInputHasError,
    lg5DataLoading,
    vaultDataLoading,
    loadingText,
    getRewardsBooster,
    poolSizeInput,
    stakeInput,
  ]);

  // Parse input to number
  const parseInput = useCallback((input: string) => {
    const parsedInput = parseFloat(input);
    return isNaN(parsedInput) || parsedInput < 0 ? "" : input;
  }, []);

  const onMaxStake = useCallback(() => {
    if (lg5Data) {
      setStakeInput(formatUnits(lg5Data.unstakedBalance, decimals));
    }
  }, [lg5Data, decimals]);

  return (
    <ModalContainer show={show} headerBackground height={532} onClose={onClose}>
      <>
        <ModalColumn marginTop={8}>
          <Title style={{ zIndex: 1 }}>REWARDS CALCULATOR</Title>
        </ModalColumn>
        <ModalColumn marginTop={40} className="justify-content-start">
          <StakingPoolContainer>
            <BaseInputLabel>STAKING POOL</BaseInputLabel>
            <StakingPoolDropdown
              selectedValue={currentGauge}
              options={stakingPoolDropdownOptions}
              onSelectOption={(option: string) =>
                setCurrentGauge(option as VaultOptions)
              }
            />
          </StakingPoolContainer>
        </ModalColumn>
        <ModalColumn marginTop={16}>
          <BasicInput
            size="xs"
            rightButtonProps={{
              text: "MAX",
              onClick: onMaxStake,
            }}
            inputProps={{
              min: "0",
              placeholder: "0",
              value: stakeInput,
              onChange: (e) => setStakeInput(parseInput(e.target.value)),
            }}
            labelProps={{
              text: "YOUR STAKE",
            }}
          />
          <div className="mr-2" />
          <BasicInput
            size="xs"
            rightButtonProps={{
              text: "MAX",
              onClick: onMaxStake,
            }}
            inputProps={{
              min: "0",
              placeholder: lg5Data
                ? formatUnits(lg5Data.poolSize, decimals)
                : "0",
              value: poolSizeInput,
              onChange: (e) => setPoolSizeInput(parseInput(e.target.value)),
            }}
            labelProps={{
              text: "TOTAL STAKED",
            }}
          />
        </ModalColumn>
        {stakeInputHasError && (
          <SecondaryText
            fontSize={12}
            lineHeight={16}
            color={colors.red}
            className="mt-2"
          >
            Your stake must be smaller than the total pool size
          </SecondaryText>
        )}
        <ModalColumn marginTop={16}>
          <div className="d-flex flex-column w-100">
            <BaseInputLabel>RBN LOCKED</BaseInputLabel>
            <SmallerInputContainer>
              <SmallerInput
                type="number"
                min="0"
                className="form-control"
                placeholder="0"
                contentEditable={false}
                value={rbnLockedInput}
                onChange={(e) => setRBNLockedInput(parseInput(e.target.value))}
              />
              <DurationDropdown
                options={lockupDurationOptions}
                value={lockupPeriodDisplay(lockupPeriod as LockupPeriodKey)}
                onSelect={(option: string) => {
                  setLockupPeriod(option);
                }}
                buttonConfig={{
                  background: colors.background.four,
                  activeBackground: colors.background.four,
                  paddingHorizontal: 8,
                  paddingVertical: 8,
                  color: colors.primaryText,
                }}
                dropdownMenuConfig={{
                  horizontalOrientation: "right",
                  topBuffer: 8,
                  backgroundColor: colors.background.three,
                }}
                menuItemConfig={{
                  firstItemPaddingTop: "8px",
                  lastItemPaddingBottom: "8px",
                }}
                menuItemTextConfig={{
                  fontSize: 12,
                  lineHeight: 16,
                }}
                className="flex-grow-1"
              />
            </SmallerInputContainer>
          </div>
        </ModalColumn>
        <ModalColumn marginTop={32}>
          <APYTable
            color={colors.asset[getDisplayAssets(currentGauge)]}
            overallAPY={{
              title: "APY",
              value: displayRewards.totalAPY,
            }}
            baseAPY={{
              title: t("webapp:TooltipExplanations:baseRewards:title"),
              value: displayRewards.baseRewards,
              tooltip: {
                title: t("webapp:TooltipExplanations:baseRewards:title"),
                explanation: t(
                  "webapp:TooltipExplanations:baseRewards:description"
                ),
              },
            }}
            boostedAPY={{
              title: t("webapp:TooltipExplanations:boostedRewards:title"),
              value: displayRewards.boostedRewards,
              tooltip: {
                title: t("webapp:TooltipExplanations:boostedRewards:title"),
                explanation: t(
                  "webapp:TooltipExplanations:boostedRewards:description"
                ),
              },
            }}
            extras={[
              {
                title: t("webapp:TooltipExplanations:rewardsBooster:title"),
                value: displayRewards.rewardsBooster,
                tooltip: {
                  title: t("webapp:TooltipExplanations:rewardsBooster:title"),
                  explanation: t(
                    "webapp:TooltipExplanations:rewardsBooster:description"
                  ),
                },
              },
            ]}
          />
        </ModalColumn>
      </>
    </ModalContainer>
  );
};

export default RewardsCalculatorModal;
