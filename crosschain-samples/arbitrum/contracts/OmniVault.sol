// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ETHLiquidityPool.sol";

/**
 * @title
 * @dev
 */
contract OmniVault {
    ETHLiquidityPool public immutable pool;

    constructor(address payable _poolAddr) {
        pool = ETHLiquidityPool(_poolAddr);
    }

    function getAssetInfo() external view returns (uint256, uint256) {
        uint256 ethBalance = address(pool).balance;
        uint256 tokenBalance = pool.totalSupply();
    }
}
