import React, { useCallback, useMemo } from "react";
import styled from "styled-components";
import moment from "moment";

import {
  Chains,
  getAssets,
  getExplorerURI,
  isPutVault,
  getOptionAssets,
  VaultOptions,
  getVaultChain,
} from "shared/lib/constants/constants";
import { SecondaryText, Title } from "shared/lib/designSystem";
import colors from "shared/lib/designSystem/colors";
import { VaultActivity, VaultActivityType } from "shared/lib/models/vault";
import {
  assetToUSD,
  formatBigNumber,
  formatOptionAmount,
  formatOptionStrike,
} from "shared/lib/utils/math";
import { useAssetsPriceHistory } from "shared/lib/hooks/useAssetPrice";
import sizes from "shared/lib/designSystem/sizes";
import useScreenSize from "shared/lib/hooks/useScreenSize";
import useLoadingText from "shared/lib/hooks/useLoadingText";
import { getAssetDecimals, getAssetDisplay } from "shared/lib/utils/asset";
import TableWithFixedHeader from "shared/lib/components/Common/TableWithFixedHeader";

const VaultActivityIcon = styled.div<{ type: VaultActivityType }>`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  border-radius: 100px;
  background-color: ${(props) => colors.vaultActivity[props.type]}14;

  i {
    color: ${(props) => colors.vaultActivity[props.type]};
  }
`;

const VaultPrimaryText = styled(Title)<{
  variant?: "green";
}>`
  margin-bottom: 4px;

  ${(props) => {
    switch (props.variant) {
      case "green":
        return `color: ${colors.green};`;
      default:
        return null;
    }
  }}

  &:last-child {
    margin-bottom: 0px;
  }
`;

const VaultSecondaryText = styled(SecondaryText)<{
  fontFamily?: string;
}>`
  font-size: 12px;
  ${(props) =>
    props.fontFamily ? `font-family: ${props.fontFamily}, sans-serif;` : ""}
`;

interface DesktopVaultActivityListProps {
  activities: VaultActivity[];
  vaultOption: VaultOptions;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  perPage: number;
}

const DesktopVaultActivityList: React.FC<DesktopVaultActivityListProps> = ({
  activities,
  vaultOption,
  page,
  setPage,
  perPage,
}) => {
  const { asset, decimals } = useMemo(() => {
    const asset = getAssets(vaultOption);
    return {
      asset: asset,
      decimals: getAssetDecimals(asset),
    };
  }, [vaultOption]);
  const chain = getVaultChain(vaultOption);

  const { searchAssetPriceFromTimestamp, histories } = useAssetsPriceHistory();

  const { width: screenWidth } = useScreenSize();
  const loadingText = useLoadingText();

  const getVaultActivityExternalURL = useCallback(
    (activity: VaultActivity) => {
      switch (activity.type) {
        case "minting":
          return `${getExplorerURI(chain || Chains.Ethereum)}/tx/${
            activity.openTxhash
          }`;
        case "sales":
          return `${getExplorerURI(chain || Chains.Ethereum)}/tx/${
            activity.txhash
          }`;
        case "openLoan":
          return `${getExplorerURI(chain || Chains.Ethereum)}/tx/${
            activity.openTxhash
          }`;
        case "closeLoan":
          return `${getExplorerURI(chain || Chains.Ethereum)}/tx/${
            activity.closeTxhash
          }`;
        case "optionSold":
          return `${getExplorerURI(chain || Chains.Ethereum)}/tx/${
            activity.txhash
          }`;
        case "optionYield":
          return `${getExplorerURI(chain || Chains.Ethereum)}/tx/${
            activity.txhash
          }`;
      }
    },
    [chain]
  );

  const getVaultActivityTableData = useCallback(
    (activity: VaultActivity) => {
      const currentAssetPrice = searchAssetPriceFromTimestamp(
        asset,
        activity.date.valueOf()
      );

      switch (activity.type) {
        case "openLoan":
          return [
            <>
              <VaultPrimaryText>LOAN OPENED</VaultPrimaryText>
              <VaultSecondaryText>
                {moment(activity.openedAt * 1000).fromNow()}
              </VaultSecondaryText>
            </>,
            <>
              <VaultPrimaryText>R-EARN</VaultPrimaryText>
            </>,
            <VaultPrimaryText>
              {formatBigNumber(activity.loanAmount, decimals)}
            </VaultPrimaryText>,
            <>
              <VaultPrimaryText>-</VaultPrimaryText>
              <VaultSecondaryText>-</VaultSecondaryText>
            </>,
          ];
        case "closeLoan":
          return [
            <>
              <VaultPrimaryText>LOAN CLOSED</VaultPrimaryText>
              <VaultSecondaryText>
                {moment(activity.closedAt * 1000).fromNow()}
              </VaultSecondaryText>
            </>,
            <>
              <VaultPrimaryText>R-EARN</VaultPrimaryText>
            </>,
            <VaultPrimaryText>
              {formatBigNumber(activity.paidAmount, decimals)}
            </VaultPrimaryText>,
            <>
              <VaultPrimaryText>
                {formatBigNumber(activity._yield, decimals)}
              </VaultPrimaryText>
              <VaultSecondaryText>
                {formatBigNumber(activity._yield, decimals)}
              </VaultSecondaryText>
            </>,
          ];
        case "optionSold":
          return [
            <>
              <VaultPrimaryText>OPTION SOLD</VaultPrimaryText>
              <VaultSecondaryText>
                {moment(activity.soldAt * 1000).fromNow()}
              </VaultSecondaryText>
            </>,
            <>
              <VaultPrimaryText>R-EARN</VaultPrimaryText>
            </>,
            <VaultPrimaryText>
              {formatBigNumber(activity.premium, decimals)}
            </VaultPrimaryText>,
            <>
              <VaultPrimaryText>-</VaultPrimaryText>
              <VaultSecondaryText>-</VaultSecondaryText>
            </>,
          ];
        case "optionYield":
          return [
            <>
              <VaultPrimaryText>OPTION PAID</VaultPrimaryText>
              <VaultSecondaryText>
                {moment(activity.paidAt * 1000).fromNow()}
              </VaultSecondaryText>
            </>,
            <>
              <VaultPrimaryText>R-EARN</VaultPrimaryText>
            </>,
            <VaultPrimaryText>
              {formatBigNumber(activity._yield, decimals)}
            </VaultPrimaryText>,
            <>
              <VaultPrimaryText>
                {formatBigNumber(activity._yield, decimals)}
              </VaultPrimaryText>
              <VaultSecondaryText>
                {formatBigNumber(activity._yield, decimals)}
              </VaultSecondaryText>
            </>,
          ];
        case "minting":
          return [
            <>
              <VaultPrimaryText>
                {screenWidth > sizes.lg ? "MINTED CONTRACTS" : "MINTED"}
              </VaultPrimaryText>
              <VaultSecondaryText>
                {moment(activity.openedAt * 1000).fromNow()}
              </VaultSecondaryText>
            </>,
            <>
              <VaultPrimaryText>
                O-{asset} {moment(activity.expiry, "X").format("M/DD")}{" "}
                {isPutVault(vaultOption)
                  ? `${getOptionAssets(vaultOption)} PUT`
                  : "CALL"}
              </VaultPrimaryText>
              <VaultSecondaryText>
                Strike {formatOptionStrike(activity.strikePrice, chain)}
              </VaultSecondaryText>
            </>,
            <VaultPrimaryText>
              {formatBigNumber(activity.depositAmount, decimals)}
            </VaultPrimaryText>,
            <>
              <VaultPrimaryText>-</VaultPrimaryText>
              <VaultSecondaryText>-</VaultSecondaryText>
            </>,
          ];
        case "sales":
          return [
            <>
              <VaultPrimaryText>
                {screenWidth > sizes.lg ? "SOLD CONTRACTS" : "SOLD"}
              </VaultPrimaryText>
              <VaultSecondaryText>
                {moment(activity.timestamp * 1000).fromNow()}
              </VaultSecondaryText>
            </>,
            <>
              <VaultPrimaryText>
                O-{asset + " "}
                {moment(activity.vaultShortPosition.expiry, "X").format(
                  "M/DD"
                )}{" "}
                {isPutVault(vaultOption)
                  ? `${getOptionAssets(vaultOption)} PUT`
                  : "CALL"}
              </VaultPrimaryText>
              <VaultSecondaryText>
                Strike{" "}
                {formatOptionStrike(
                  activity.vaultShortPosition.strikePrice,
                  chain
                )}
              </VaultSecondaryText>
            </>,
            <>
              <VaultPrimaryText>
                {formatOptionAmount(
                  activity.sellAmount,
                  chain
                ).toLocaleString()}
              </VaultPrimaryText>
            </>,
            <>
              <VaultPrimaryText variant="green">
                +{formatBigNumber(activity.premium, decimals)}{" "}
                {getAssetDisplay(asset)}
              </VaultPrimaryText>
              <VaultSecondaryText fontFamily="VCR">
                {histories[asset].loading
                  ? loadingText
                  : `+${assetToUSD(
                      activity.premium,
                      currentAssetPrice,
                      decimals
                    )}`}
              </VaultSecondaryText>
            </>,
          ];
      }
    },
    [
      chain,
      screenWidth,
      loadingText,
      asset,
      decimals,
      searchAssetPriceFromTimestamp,
      vaultOption,
      histories,
    ]
  );

  const getActivityLogo = useCallback((activity: VaultActivity) => {
    switch (activity.type) {
      case "minting":
        return (
          <VaultActivityIcon type={activity.type}>
            <i className="fas fa-layer-group" />
          </VaultActivityIcon>
        );
      case "sales":
        return (
          <VaultActivityIcon type={activity.type}>
            <i className="fas fa-dollar-sign" />
          </VaultActivityIcon>
        );
      case "openLoan":
      case "closeLoan":
      case "optionYield":
      case "optionSold":
        return <></>;
    }
  }, []);

  return (
    <TableWithFixedHeader
      weights={[0.25, 0.35, 0.15, 0.25]}
      orientations={["left", "left", "right", "right"]}
      labels={["Action", "Contract", "Quantity", "Yield"]}
      data={activities.map((activity) => getVaultActivityTableData(activity))}
      externalLinks={activities.map((activity) =>
        getVaultActivityExternalURL(activity)
      )}
      logos={activities.map((activity) => getActivityLogo(activity))}
      perPage={perPage}
      pageController={{
        page,
        setPage,
      }}
    />
  );
};

export default DesktopVaultActivityList;
