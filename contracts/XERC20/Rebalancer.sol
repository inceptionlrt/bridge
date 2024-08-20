// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@arbitrum/nitro-contracts/src/bridge/Inbox.sol";
import "@arbitrum/nitro-contracts/src/bridge/Outbox.sol";

contract MintableToken is ERC20, Ownable {
    constructor(
        string memory name,
        string memory symbol
    ) ERC20("Mintable inETH", "InETH.Mint") {}

    // Function that allows the owner to mint new tokens
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}

contract Rebalancer is Ownable {
    address public liquidPool;
    address public inETHAddress;

    uint256 public totalETH;
    uint256 public totalInETH;
    uint256 public ratio = 0.5 ether;
    uint256 public MULTIPLIER = 10000000;
    uint256 public MAX_DIFF = 100000;

    IInbox public inboxArbitrum =
        IInbox(0xaAe29B0366299461418F5324a79Afc425BE5ae21); // Address of the Arbitrum Inbox on L1

    uint256 public l2TotalSupply;
    uint256 public l2Balance;

    address public inboxOptimism;
    address public l2Target; // Address of the LiquidityPool contract on Arbitrum (L2)
    address lockbox;

    mapping(uint256 => Transaction) txs;

    struct Transaction {
        uint timestamp;
        uint ethBalance;
        uint inEthBalance;
    }

    event ETHReceived(address sender, uint256 amount);
    event ETHDepositedToLiquidPool(address liquidPool, uint256 amountETH);
    event InETHDepositedToLockbox(uint256 mintAmount);
    event RatioUpdated(uint256 newRatio);
    event L2InfoReceived(
        uint256 networkId,
        uint256 l2TotalSupply,
        uint256 l2Balance
    );
    event RetryableTicketCreated(uint256 indexed ticketId);

    modifier onlyLiquidPool() {
        require(msg.sender == liquidPool);
        _;
    }

    constructor() Ownable(msg.sender) {}

    function updateL2Target(address _l2Target) public {
        l2Target = _l2Target;
    }

    function setInboxArbitrum(address _inbox) external {
        inboxArbitrum = IInbox(_inbox);
    }

    function setInboxOptimism(address _inbox) external {
        inboxOptimism = _inbox;
    }

    /// @notice only l2Target can update greeting
    function receiveL2InfoArbitrum(
        uint256 _balance,
        uint256 _totalSupply
    ) public {
        IBridge bridge = inboxArbitrum.bridge();
        // this prevents reentrancies on L2 to L1 txs
        require(msg.sender == address(bridge), "NOT_BRIDGE");
        IOutbox outbox = IOutbox(bridge.activeOutbox());
        address l2Sender = outbox.l2ToL1Sender();
        require(l2Sender == l2Target, "Rebalancer only updateable by L2");
        calculateMint(421614, _balance, _totalSupply);
        emit L2InfoReceived(_totalSupply, _balance);
    }

    // Function to receive balance information from Optimism and other networks
    function receiveBalanceInfoGeneric(
        uint256 _ethBalance,
        uint256 _inEthBalance
    ) external {
        require(msg.sender == inboxOptimism);
        emit L2InfoReceived(10, _inEthBalance, _ethBalance);
        calculateMint(10, _ethBalance, _inEthBalance);
    }

    function calculateMint(
        uint256 _networkId,
        uint256 _balance,
        uint256 _totalSupply
    ) internal {
        int256 l2Ratio = (int256(_balance) * int256(MULTIPLIER)) /
            int256(_totalSupply);

        require(
            l2Ratio - int256(ratio) < int256(MAX_DIFF),
            "Rebalancer: ratio diff too high"
        );

        //TODO : calculate common ratio code here

        Transaction memory tx = txs[_networkId];
        int256 prevInEthBalance = tx.inEthBalance;

        int256 diff = _totalSupply - prevInEthBalance;

        if (diff > 0) {
            uint256 mintAmount = uint256(diff);
            MintableToken(inETHAddress).mint(lockbox, mintAmount);
            emit InETHDepositedToLockbox(mintAmount);
        }
    }

    /// @notice called by the Lockbox to update on withdraw
    function updateBalanceOnDeposit(
        uint256 _tokenAmount,
        uint256 _tokenAmountX
    ) external {
        totalETH += _tokenAmountX;
        totalInETH -= _tokenAmount;
    }
}
