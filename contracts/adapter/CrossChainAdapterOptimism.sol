// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

import "./Rebalancer.sol";
import "../interfaces/ICrossChainAdapter.sol";
import "./TransactionStorage.sol";

contract CrossChainBridgeOptimism is ICrossChainAdapter, Ownable {
    TransactionStorage public transactionStorage;
    address public rebalancer;
    address payable public liqPool;
    address public inboxOptimism;
    address public l2Target; // Address of the LiquidityPool contract on Optimism (L2)

    uint24 public constant OPTIMISM_CHAIN_ID = 17000;

    constructor(
        address _owner,
        address payable _liqPool,
        address _transactionStorage
    ) Ownable(_owner) {
        liqPool = _liqPool;
        transactionStorage = TransactionStorage(_transactionStorage);
    }

    function setRebalancer(address _rebalancer) external onlyOwner {
        rebalancer = _rebalancer;
    }

    function setInboxOptimism(address _inbox) external onlyOwner {
        inboxOptimism = _inbox;
    }

    function updateL2Target(address _l2Target) external onlyOwner {
        l2Target = _l2Target;
    }

    function receiveL2InfoOptimism(
        uint256 _timestamp,
        uint256 _balance,
        uint256 _totalSupply
    ) public {
        // Verify sender is from the Optimism bridge (assuming a similar mechanism exists)
        require(msg.sender == inboxOptimism, NotBridge());
        require(_timestamp <= block.timestamp, FutureTimestamp());

        transactionStorage.handleL2Info(
            OPTIMISM_CHAIN_ID,
            _timestamp,
            _balance,
            _totalSupply
        );
    }

    function setLiqPool(address payable _liqPool) external onlyOwner {
        liqPool = _liqPool;
    }

    receive() external payable {
        (bool success, ) = rebalancer.call{value: msg.value}("");

        require(success, TransferToRebalancerFailed());
        emit L2EthDeposit(msg.value);
    }
}
