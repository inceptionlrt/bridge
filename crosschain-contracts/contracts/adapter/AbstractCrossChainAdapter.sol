// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/ICrossChainAdapter.sol";
import "../rebalancer/TransactionStorage.sol";

abstract contract AbstractCrossChainAdapter is ICrossChainAdapter, Ownable {
    TransactionStorage public transactionStorage;
    address public rebalancer;
    address payable public liqPool;
    address public l2Target;

    event L2EthDeposit(uint256 value);

    constructor(
        address _owner,
        address payable _liqPool,
        address _transactionStorage
    ) Ownable(_owner) {
        liqPool = _liqPool;
        transactionStorage = TransactionStorage(_transactionStorage);
    }

    function setRebalancer(address _rebalancer) external onlyOwner {
        require(_rebalancer != address(0), SettingZeroAddress());
        rebalancer = _rebalancer;
    }

    function setLiqPool(address payable _liqPool) external onlyOwner {
        require(_liqPool != address(0), SettingZeroAddress());
        liqPool = _liqPool;
    }

    function updateL2Target(address _l2Target) external onlyOwner {
        require(_l2Target != address(0), SettingZeroAddress());
        l2Target = _l2Target;
    }

    function handleL2Info(
        uint256 _chainId,
        uint256 _timestamp,
        uint256 _balance,
        uint256 _totalSupply
    ) internal {
        require(_timestamp <= block.timestamp, FutureTimestamp());

        transactionStorage.handleL2Info(
            _chainId,
            _timestamp,
            _balance,
            _totalSupply
        );
    }

    receive() external payable {
        (bool success, ) = rebalancer.call{value: msg.value}("");
        require(success, TransferToRebalancerFailed());
        emit L2EthDeposit(msg.value);
    }

    function receiveL2Info(
        uint256 _timestamp,
        uint256 _balance,
        uint256 _totalSupply
    ) external virtual;
}
