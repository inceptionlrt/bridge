// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "../interfaces/IRestakingPool.sol";
import "../interfaces/IInceptionToken.sol";
import "../interfaces/IInceptionRatioFeed.sol";

contract MockRestakingPool is IRestakingPool {
    IInceptionToken public inETH;
    IInceptionRatioFeed public ratioFeed;

    /**
     * @dev Constructor that initializes the contract with inETH token address and ratio feed address
     * @param _inETH The address of the InceptionToken (inETH)
     * @param _ratioFeed The address of the InceptionRatioFeed contract
     */
    constructor(address _inETH, address _ratioFeed) {
        require(_inETH != address(0), "PoolZeroAddress");
        require(_ratioFeed != address(0), "PoolZeroAddress");
        inETH = IInceptionToken(_inETH);
        ratioFeed = IInceptionRatioFeed(_ratioFeed);
    }

    /**
     * @dev Deposit function that accepts ETH and mints inETH based on the ratio
     */
    function deposit() external payable override {
        require(msg.value > 0, "PoolZeroAmount");

        // Get the current ratio from the ratioFeed contract
        uint256 ratio = ratioFeed.getRatioFor(address(inETH));

        // Calculate the amount of inETH to mint based on the ETH sent and the ratio
        uint256 amountToMint = (msg.value * ratio) / 1e18; // Assuming ratio is in 18 decimals

        // Mint the calculated inETH amount to the sender
        inETH.mint(msg.sender, amountToMint);

        emit Received(msg.sender, msg.value);
    }

    // Mock functions to satisfy the IRestakingPool interface

    function getMinStake() external pure override returns (uint256) {
        return 0;
    }

    function getMinUnstake() external pure override returns (uint256) {
        return 0;
    }
}
