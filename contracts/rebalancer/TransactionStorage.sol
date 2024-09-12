// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Rebalancer.sol";
import "../interfaces/ICrossChainAdapter.sol";

contract TransactionStorage {
    struct Transaction {
        uint256 timestamp;
        uint256 ethBalance;
        uint256 inEthBalance;
    }

    mapping(uint256 => Transaction) public txs;
    mapping(uint256 => address) public adapters; // Mapping to store adapters by Chain ID
    uint32[] public chainIds; // Track all chain IDs with stored transactions

    event L2InfoReceived(
        uint256 indexed networkId,
        uint256 timestamp,
        uint256 ethBalance,
        uint256 inEthBalance
    );

    event AdapterAdded(uint256 indexed chainId, address adapterAddress); // Event for adding an adapter

    /**
     * @notice Add a new Chain ID to the storage
     * @param newChainId The new Chain ID to add
     */
    function addChainId(uint32 newChainId) external {
        for (uint i = 0; i < chainIds.length; i++) {
            if (chainIds[i] == newChainId) {
                revert("Chain ID already exists");
            }
        }
        chainIds.push(newChainId);
    }

    /**
     * @notice Handle Layer 2 information and update transaction data
     * @param chainId The Chain ID of the transaction
     * @param _timestamp The timestamp of the transaction
     * @param _balance The balance of the transaction
     * @param _totalSupply The total supply for the transaction
     */
    function handleL2Info(
        uint256 chainId,
        uint256 _timestamp,
        uint256 _balance,
        uint256 _totalSupply
    ) external {
        require(_timestamp <= block.timestamp, "Time cannot be in the future");

        Transaction memory lastUpdate = txs[chainId];
        if (lastUpdate.timestamp != 0) {
            require(
                _timestamp > lastUpdate.timestamp,
                "Time before than prev recorded"
            );
        }

        Transaction memory newUpdate = Transaction({
            timestamp: _timestamp,
            ethBalance: _balance,
            inEthBalance: _totalSupply
        });

        txs[chainId] = newUpdate;

        emit L2InfoReceived(chainId, _timestamp, _balance, _totalSupply);
    }

    /**
     * @notice Get transaction data for a specific Chain ID
     * @param chainId The Chain ID to retrieve the transaction data for
     * @return The transaction data for the specified Chain ID
     */
    function getTransactionData(
        uint256 chainId
    ) external view returns (Transaction memory) {
        return txs[chainId];
    }

    /**
     * @notice Get all stored Chain IDs
     * @return An array of all stored Chain IDs
     */
    function getAllChainIds() external view returns (uint32[] memory) {
        return chainIds;
    }

    /**
     * @notice Add a new adapter for a specific Chain ID
     * @param chainId The Chain ID associated with the adapter
     * @param adapterAddress The address of the adapter to add
     */
    function addAdapter(uint256 chainId, address adapterAddress) external {
        require(
            adapters[chainId] == address(0),
            "Adapter already exists for this Chain ID"
        );
        adapters[chainId] = adapterAddress;

        emit AdapterAdded(chainId, adapterAddress);
    }
}
