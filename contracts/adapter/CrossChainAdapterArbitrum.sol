// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@arbitrum/nitro-contracts/src/bridge/Inbox.sol";
import "@arbitrum/nitro-contracts/src/bridge/Outbox.sol";
import "hardhat/console.sol";

import "./Rebalancer.sol";
import "../interfaces/ICrossChainAdapter.sol";
import "./TransactionStorage.sol";

contract CrossChainBridgeArbitrum is ICrossChainAdapter, Ownable {
    TransactionStorage public transactionStorage;
    address public rebalancer;
    address payable public liqPool;
    address public inboxArbitrum;
    address public l2Target;

    event L2InfoReceived(
        uint256 indexed networkId,
        uint256 timestamp,
        uint256 ethBalance,
        uint256 inEthBalance
    );

    event L2EthDeposit(uint256 indexed value);

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

    function setInboxArbitrum(address _inbox) external onlyOwner {
        inboxArbitrum = _inbox;
    }

    function updateL2Target(address _l2Target) external onlyOwner {
        l2Target = _l2Target;
    }

    function receiveL2InfoArbitrum(
        uint256 _timestamp,
        uint256 _balance,
        uint256 _totalSupply
    ) public {
        IBridge bridge = IInbox(inboxArbitrum).bridge();
        require(msg.sender == address(bridge), "NOT_BRIDGE");
        require(_timestamp <= block.timestamp, "Time cannot be in the future");
        IOutbox outbox = IOutbox(bridge.activeOutbox());
        address l2Sender = outbox.l2ToL1Sender();
        require(l2Sender == l2Target, "Rebalancer only updatable by L2");

        transactionStorage.handleL2Info(
            ARBITRUM_CHAIN_ID,
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

        require(success, "Transfer to rebalancer failed");
        emit L2EthDeposit(msg.value);
    }
}
