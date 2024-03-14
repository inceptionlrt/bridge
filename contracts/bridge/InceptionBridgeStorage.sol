// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
pragma abicoder v2;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import "../interfaces/IInceptionBridge.sol";
import "../interfaces/IInceptionBridgeErrors.sol";

import "../lib/EthereumVerifier.sol";
import "../lib/ProofParser.sol";
import "../lib/Utils.sol";

/// @author The InceptionLRT team
/// @title The InceptionBridgeStorage contract
/// @notice Stores variables for the InceptionBridge contract and facilitates their updates.
abstract contract InceptionBridgeStorage is
    OwnableUpgradeable,
    PausableUpgradeable,
    IInceptionBridgeStorage,
    IInceptionBridgeErrors
{
    uint256 internal _globalNonce;
    address internal _operatorAddress;

    mapping(bytes32 => bool) internal _usedProofs;
    mapping(uint256 => address) internal _bridgeAddressByChainId;

    /// @dev keccak256(fromToken,fromChain,_bridgeAddressByChainId(destinationChain), destinationChain) => destinationToken
    mapping(bytes32 => address) internal _destinationTokens;

    uint256 public shortCapDuration;
    /// @dev token => Cap per 'shortCapTime'
    mapping(address => uint256) public shortCaps;

    /// @dev token => (epochTime/shortCapDuration) => Current Deposits
    mapping(address => mapping(uint256 => uint256)) public shortCapsDeposit;
    /// @dev token => (epochTime/shortCapDuration) => Current Withdraws
    mapping(address => mapping(uint256 => uint256)) public shortCapsWithdraw;

    uint256 public longCapDuration;
    /// @dev token => cap per 'longCapTime'
    mapping(address => uint256) public longCaps;
    /// @dev token => (epochTime/longCapDuration) => Current Deposits
    mapping(address => mapping(uint256 => uint256)) public longCapsDeposit;
    /// @dev token => (epochTime/longCapDuration) => Current Withdraws
    mapping(address => mapping(uint256 => uint256)) public longCapsWithdraw;

    function __initInceptionBridgeStorage(address operatorAddress) internal {
        _operatorAddress = operatorAddress;
        _setDefaultCrosschainThreshold();
    }

    function _updateDepositCaps(address fromToken, uint256 amount) internal {
        /// Short(default: per hour)
        if (
            shortCapsDeposit[fromToken][getCurrentStamp(shortCapDuration)] +
                amount >
            shortCaps[fromToken]
        ) {
            revert ShortCapExceeded(
                shortCaps[fromToken],
                shortCapsDeposit[fromToken][getCurrentStamp(shortCapDuration)] +
                    amount
            );
        }
        shortCapsDeposit[fromToken][
            getCurrentStamp(shortCapDuration)
        ] += amount;
        /// Long(default: per day)
        if (
            longCapsDeposit[fromToken][getCurrentStamp(longCapDuration)] +
                amount >
            longCaps[fromToken]
        ) {
            revert LongCapExceeded(
                longCaps[fromToken],
                longCapsDeposit[fromToken][getCurrentStamp(longCapDuration)] +
                    amount
            );
        }
        longCapsDeposit[fromToken][getCurrentStamp(longCapDuration)] += amount;
    }

    function _updateWithdrawCaps(address token, uint256 amount) internal {
        /// Short(default: per hour)
        if (
            shortCapsWithdraw[token][getCurrentStamp(shortCapDuration)] +
                amount >
            shortCaps[token]
        ) {
            revert ShortCapExceeded(
                shortCaps[token],
                shortCapsWithdraw[token][getCurrentStamp(shortCapDuration)] +
                    amount
            );
        }
        shortCapsWithdraw[token][getCurrentStamp(shortCapDuration)] += amount;

        /// Long(default: per day)
        if (
            longCapsWithdraw[token][getCurrentStamp(longCapDuration)] + amount >
            longCaps[token]
        ) {
            revert LongCapExceeded(
                longCaps[token],
                longCapsWithdraw[token][getCurrentStamp(longCapDuration)] +
                    amount
            );
        }
        longCapsWithdraw[token][getCurrentStamp(longCapDuration)] += amount;
    }

    function _setOperator(address operatorAddress) internal {
        if (operatorAddress == address(0x0)) {
            revert NullAddress();
        }
        emit OperatorChanged(_operatorAddress, operatorAddress);
        _operatorAddress = operatorAddress;
    }

    function _setMetadata(
        address token,
        bytes32 tokenName,
        bytes32 tokenSymbol
    ) internal {
        IERC20MetadataChangeable(token).changeName(tokenName);
        IERC20MetadataChangeable(token).changeSymbol(tokenSymbol);
    }

    /*//////////////////////////
    ////// SET functions //////
    ////////////////////////*/

    function _setShortCap(address token, uint256 newValue) internal {
        if (token == address(0x0)) {
            revert NullAddress();
        }
        uint256 prevValue = shortCaps[token];
        emit ShortCapChanged(token, prevValue, newValue);
        shortCaps[token] = newValue;
    }

    function _setShortCapDuration(uint256 newValue) internal {
        emit ShortCapDurationChanged(shortCapDuration, newValue);
        shortCapDuration = newValue;
    }

    function _setLongCapDuration(uint256 newValue) internal {
        emit LongCapDurationChanged(longCapDuration, newValue);
        longCapDuration = newValue;
    }

    function _setLongCap(address token, uint256 newValue) internal {
        if (token == address(0x0)) {
            revert NullAddress();
        }
        emit LongCapChanged(token, longCaps[token], newValue);
        longCaps[token] = newValue;
    }

    function _setDefaultCrosschainThreshold() internal {
        shortCapDuration = 1 hours;
        longCapDuration = 1 days;
    }

    function _addBridge(address bridge, uint256 destinationChain) internal {
        if (bridge == address(0x0)) {
            revert NullAddress();
        }
        if (destinationChain == 0) {
            revert InvalidChain();
        }
        if (_bridgeAddressByChainId[destinationChain] != address(0x00)) {
            revert BridgeAlreadyAdded();
        }

        _bridgeAddressByChainId[destinationChain] = bridge;

        emit BridgeAdded(bridge, destinationChain);
    }

    function _removeBridge(uint256 destinationChain) internal {
        if (_bridgeAddressByChainId[destinationChain] == address(0x00)) {
            revert BridgeNotExist();
        }
        address bridge = _bridgeAddressByChainId[destinationChain];
        delete _bridgeAddressByChainId[destinationChain];

        emit BridgeRemoved(bridge, destinationChain);
    }

    function _addDestination(
        address fromToken,
        uint256 destinationChain,
        address toToken
    ) internal {
        if (_bridgeAddressByChainId[destinationChain] == address(0)) {
            revert UnknownDestinationChain();
        }
        bytes32 direction = keccak256(
            abi.encodePacked(
                fromToken,
                block.chainid,
                _bridgeAddressByChainId[destinationChain],
                destinationChain
            )
        );

        if (_destinationTokens[direction] != address(0)) {
            revert DestinationAlreadyExists();
        }
        _destinationTokens[direction] = toToken;

        emit DestinationAdded(fromToken, toToken, destinationChain);
    }

    function _removeDestination(
        address fromToken,
        uint256 destinationChain,
        address toToken
    ) internal {
        if (_bridgeAddressByChainId[destinationChain] == address(0)) {
            revert UnknownDestinationChain();
        }
        bytes32 direction = keccak256(
            abi.encodePacked(
                fromToken,
                block.chainid,
                _bridgeAddressByChainId[destinationChain],
                destinationChain
            )
        );

        if (_destinationTokens[direction] == address(0)) {
            revert DestinationNotExist();
        }
        delete _destinationTokens[direction];

        emit DestinationRemoved(fromToken, toToken, destinationChain);
    }

    function getCurrentStamp(uint256 duration) public view returns (uint256) {
        return (block.timestamp / duration) * duration;
    }
}
