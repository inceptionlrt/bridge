// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Rebalancer is Ownable {
    address public lockbox;
    address public liquidPool;
    address public inETHAddress;

    uint256 public totalETH;
    uint256 public totalInETH;
    uint256 public ratio;

    event ETHReceived(address sender, uint256 amount);
    event InETHDepositedToLockbox(address lockbox, uint256 amountInETH);
    event ETHDepositedToLiquidPool(address liquidPool, uint256 amountETH);
    event RatioUpdated(uint256 newRatio);

    modifier onlyLiquidPool() {
        require(msg.sender == liquidPool);
        _;
    }

    modifier onlyLockbox() {
        require(msg.sender == lockbox);
        _;
    }

    constructor(address _lockbox, address _liquidPool, address _inETHAddress) {
        lockbox = _lockbox;
        liquidPool = _liquidPool;
        inETHAddress = _inETHAddress;
    }

    /// @notice called by the Lockbox to update on withdraw
    function updateBalanceOnDeposit(
        uint256 _tokenAmount,
        uint256 _tokenAmountX
    ) external onlyLockbox {
        totalETH += _tokenAmountX;
        totalInETH -= _tokenAmount;
    }

    /// @notice called by the Lockbox to update on deposit
    function updateBalanceOnWithdraw(
        uint256 _tokenAmount,
        uint256 _tokenAmountX
    ) external onlyLockbox {
        totalETH += _tokenAmount;
        totalInETH += _tokenAmount;
    }

    function setRatio(uint256 newRatio) external onlyOwner {
        require(newRatio > 0, "Ratio must be greater than zero");

        // Ensure the ratio is consistent with the total ETH and inETH
        uint256 expectedInETH = (totalETH * 1e18) / newRatio;
        require(
            expectedInETH <= totalInETH,
            "Invalid ratio: Insufficient inETH"
        );

        ratio = newRatio;
        emit RatioUpdated(newRatio);
    }

    receive() external payable {
        require(msg.value > 0, "No ETH sent");
        emit ETHReceived(msg.sender, msg.value);
        _handleReceivedETH(msg.value);
    }

    function _handleReceivedETH(uint256 amount) internal {
        // Increase total ETH by the received amount
        totalETH += amount;

        // Calculate the equivalent amount of inETH based on the current ratio
        uint256 amountInETH = _calculateInETH(amount);

        // Ensure inETH is minted and deposited into the Lockbox
        depositInETHToLockbox(lockbox, amountInETH);

        // Update the totalInETH only after successful deposit
        totalInETH += amountInETH;

        // Deposit the received ETH into the LiquidPool
        depositETHToLiquidPool(liquidPool, amount);
    }

    function _calculateInETH(
        uint256 amountETH
    ) internal view returns (uint256) {
        return (amountETH * 1e18) / ratio;
    }

    function depositInETHToLockbox(
        address _lockbox,
        uint256 amountInETH
    ) internal {
        require(_lockbox != address(0), "Invalid Lockbox address");
        require(amountInETH > 0, "Amount must be greater than zero");

        IERC20(inETHAddress).approve(_lockbox, amountInETH);
        try IXERC20Lockbox(_lockbox).deposit(amountInETH) {
            emit InETHDepositedToLockbox(_lockbox, amountInETH);
        } catch {
            revert("Lockbox deposit failed");
        }
    }

    function depositETHToLiquidPool(
        address _liquidPool,
        uint256 amountETH
    ) internal {
        require(_liquidPool != address(0), "Invalid LiquidPool address");
        require(amountETH > 0, "Amount must be greater than zero");

        try ILiquidPool(_liquidPool).deposit{value: amountETH}() {
            emit ETHDepositedToLiquidPool(_liquidPool, amountETH);
        } catch {
            revert("LiquidPool deposit failed");
        }
    }
}
