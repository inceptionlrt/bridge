// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@arbitrum/nitro-contracts/src/bridge/Inbox.sol";
import "@arbitrum/nitro-contracts/src/bridge/Outbox.sol";
import "hardhat/console.sol";

import "../interfaces/ICrossChainAdapter.sol";
import "../rebalancer/Rebalancer.sol";
import "../rebalancer/TransactionStorage.sol";

contract CrossChainBridgeArbitrum is ICrossChainAdapter, Ownable {
    TransactionStorage public transactionStorage;
    address public rebalancer;
    address payable public liqPool;
    address public inboxArbitrum;
    address public l2Target;

    constructor(
        address _owner,
        address payable _liqPool,
        address _transactionStorage
    ) Ownable(_owner) {
        liqPool = _liqPool;
        transactionStorage = TransactionStorage(_transactionStorage);
    }

    function receiveL2InfoArbitrum(
        uint256 _timestamp,
        uint256 _balance,
        uint256 _totalSupply
    ) public {
        IBridge bridge = IInbox(inboxArbitrum).bridge();
        require(msg.sender == address(bridge), NotBridge.selector);
        require(_timestamp <= block.timestamp, FutureTimestamp.selector);
        IOutbox outbox = IOutbox(bridge.activeOutbox());
        address l2Sender = outbox.l2ToL1Sender();
        require(l2Sender == l2Target, NotAuthorizedByL2.selector);

        transactionStorage.handleL2Info(
            ARBITRUM_CHAIN_ID,
            _timestamp,
            _balance,
            _totalSupply
        );
    }

    function setLiqPool(address payable _liqPool) external onlyOwner {
        require(_liqPool != address(0), SettingZeroAddress());
        liqPool = _liqPool;
    }

    function setRebalancer(address _rebalancer) external onlyOwner {
        require(_rebalancer != address(0), SettingZeroAddress());
        rebalancer = _rebalancer;
    }

    function setInboxArbitrum(address _inbox) external onlyOwner {
        require(_inbox != address(0), SettingZeroAddress());
        inboxArbitrum = _inbox;
    }

    function updateL2Target(address _l2Target) external onlyOwner {
        require(_l2Target != address(0), SettingZeroAddress());
        l2Target = _l2Target;
    }

    receive() external payable {
        (bool success, ) = rebalancer.call{value: msg.value}("");
        require(success, TransferToRebalancerFailed.selector);
        emit L2EthDeposit(msg.value);
    }
}
