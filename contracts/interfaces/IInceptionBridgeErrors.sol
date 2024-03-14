// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IInceptionBridgeErrors {
    /// @dev
    error ShortCapExceeded(uint256 limit, uint256 current);
    /// @dev
    error LongCapExceeded(uint256 limit, uint256 current);

    /// @dev
    error BridgeAlreadyAdded();
    error BridgeNotExist();

    error InvalidChain();

    /// @dev
    error ReceiptWrongChain(uint256 required, uint256 provided);

    /// @dev
    error InvalidContractAddress();

    error NullAddress();

    /// @dev
    /// vent-from-unknown-bridge
    error UnknownBridge();

    /// @dev
    /// vent-from-unknown-bridge
    error WrongSignature();

    error WithdrawalProofUsed();

    error InvalidAssetType();

    /// invalid-fromToken
    error InvalidFromTokenAddress();

    /// bridge-from-unknown-destination
    error UnknownDestination();

    /// non-existing-bridge
    error UnknownDestinationChain();

    error DestinationAlreadyExists();

    error DestinationNotExist();

    error BurnFailed();

    error MintFailed();
}
