// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "../interfaces/ICrossChainAdapter.sol";
import "../interfaces/IRestakingPool.sol";
import "../rebalancer/TransactionStorage.sol";

contract MockCrossChainAdapter is ICrossChainAdapter {
    TransactionStorage public transactionStorage;
    IRestakingPool public restakingPool;

    uint32[] public chainIds;
    address public owner;
    uint256 public constant ARBITRUM_CHAIN_ID = 42161;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    constructor(address _transactionStorage, address _restakingPool) {
        require(
            _transactionStorage != address(0),
            "Invalid TransactionStorage address"
        );
        require(_restakingPool != address(0), "Invalid RestakingPool address");

        transactionStorage = TransactionStorage(_transactionStorage);
        restakingPool = IRestakingPool(_restakingPool);
        owner = msg.sender;
    }

    function addChainId(uint32 newChainId) external override onlyOwner {
        for (uint i = 0; i < chainIds.length; i++) {
            if (chainIds[i] == newChainId) {
                revert("Chain ID already exists");
            }
        }
        chainIds.push(newChainId);
    }

    function receiveL2Info(
        uint256 _timestamp,
        uint256 _balance,
        uint256 _totalSupply
    ) external override {
        // Ensure the timestamp is not in the future
        if (_timestamp > block.timestamp) {
            revert FutureTimestamp();
        }

        // Call the handleL2Info function in TransactionStorage
        transactionStorage.handleL2Info(
            ARBITRUM_CHAIN_ID, // Use the constant for Arbitrum
            _timestamp,
            _balance,
            _totalSupply
        );

        emit L2InfoReceived(
            ARBITRUM_CHAIN_ID,
            _timestamp,
            _balance,
            _totalSupply
        );
    }

    function receiveL2Eth() external payable override {
        require(msg.value > 0, "No ETH received");

        // Forward the received ETH to the Restaking Pool contract
        restakingPool.deposit{value: msg.value}();

        emit L2EthReceived(msg.value);
    }

    function getAllChainIds() external view override returns (uint32[] memory) {
        return chainIds;
    }

    function setLiqPool(address payable _liqPool) external override onlyOwner {
        require(_liqPool != address(0), "Setting zero address");
        restakingPool = IRestakingPool(_liqPool);
    }

    receive() external payable {
        // Resend ETH to the restaking pool when received via fallback
        if (msg.value > 0) {
            restakingPool.deposit{value: msg.value}();
            emit L2EthReceived(msg.value);
        }
    }
}
