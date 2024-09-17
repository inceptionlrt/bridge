// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./AbstractCrossChainAdapter.sol";

contract CrossChainBridgeOptimism is AbstractCrossChainAdapter {
    address public inboxOptimism;

    uint24 public constant OPTIMISM_CHAIN_ID = 17000;

    constructor(
        address _owner,
        address payable _liqPool,
        address _transactionStorage
    ) AbstractCrossChainAdapter(_owner, _liqPool, _transactionStorage) {}

    function receiveL2Info(
        uint256 _timestamp,
        uint256 _balance,
        uint256 _totalSupply
    ) external override {
        require(msg.sender == inboxOptimism, NotBridge());

        handleL2Info(OPTIMISM_CHAIN_ID, _timestamp, _balance, _totalSupply);
    }

    function setInboxOptimism(address _inbox) external onlyOwner {
        require(_inbox != address(0), SettingZeroAddress());
        inboxOptimism = _inbox;
    }
}
