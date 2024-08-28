// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@arbitrum/nitro-contracts/src/bridge/Inbox.sol";
import "@arbitrum/nitro-contracts/src/bridge/Outbox.sol";
import "hardhat/console.sol";

import "./Rebalancer.sol";

contract CrossChainBridge is Ownable {
    struct Transaction {
        uint256 timestamp;
        uint256 ethBalance;
        uint256 inEthBalance;
    }

    mapping(uint256 => Transaction) public txs;
    uint24 public constant ARBITRUM_CHAIN_ID = 421614;
    uint24 public constant OPTIMISM_CHAIN_ID = 17000;

    uint32[] public chainIds = [ARBITRUM_CHAIN_ID, OPTIMISM_CHAIN_ID]; // Track all chain IDs with stored transactions

    address public rebalancer;
    address payable public liqPool;
    address public inboxArbitrum;
    address public inboxOptimism;
    address public l2Target; // Address of the LiquidityPool contract on Arbitrum (L2)

    event L2InfoReceived(
        uint256 indexed networkId,
        uint256 timestamp,
        uint256 ethBalance,
        uint256 inEthBalance
    );

    event L2EthDeposit(uint256 indexed value);

    modifier onlyRebalancer() {
        require(msg.sender == rebalancer, "Only rebalancer can call");
        _;
    }

    constructor(address _owner, address payable _liqPool) Ownable(_owner) {
        liqPool = _liqPool;
    }

    function setRebalancer(address _rebalancer) external onlyOwner {
        rebalancer = _rebalancer;
    }

    function setInboxArbitrum(address _inbox) external onlyOwner {
        inboxArbitrum = _inbox;
    }

    function setInboxOptimism(address _inbox) external onlyOwner {
        inboxOptimism = _inbox;
    }

    function updateL2Target(address _l2Target) external onlyOwner {
        l2Target = _l2Target;
    }

    function addChainId(uint32 newChainId) external onlyOwner {
        for (uint i = 0; i < chainIds.length; i++) {
            if (chainIds[i] == newChainId) {
                revert("Chain ID already exists");
            }
        }
        chainIds.push(newChainId);
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

        _handleL2Info(ARBITRUM_CHAIN_ID, _timestamp, _balance, _totalSupply);
    }

    function receiveL2InfoOptimism(
        uint256 _timestamp,
        uint256 _balance,
        uint256 _totalSupply
    ) public {
        // require(msg.sender == inboxOptimism, "NOT_OPTIMISM_INBOX");
        _handleL2Info(OPTIMISM_CHAIN_ID, _timestamp, _balance, _totalSupply);
    }

    function _handleL2Info(
        uint256 chainId,
        uint256 _timestamp,
        uint256 _balance,
        uint256 _totalSupply
    ) internal {
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

    function getTransactionData(
        uint256 chainId
    ) external view onlyRebalancer returns (Transaction memory) {
        return txs[chainId];
    }

    function getAllChainIds()
        external
        view
        onlyRebalancer
        returns (uint32[] memory)
    {
        return chainIds;
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
