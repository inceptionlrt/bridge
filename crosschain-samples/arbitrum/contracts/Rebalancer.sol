// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@arbitrum/nitro-contracts/src/bridge/Inbox.sol";
import "@arbitrum/nitro-contracts/src/bridge/Outbox.sol";

contract Rebalancer is Ownable {
    address public liquidPool;
    address public inETHAddress;

    uint256 public totalETH;
    uint256 public totalInETH;
    uint256 public ratio = 0.5 ether;

    IInbox public inbox = IInbox(0xaAe29B0366299461418F5324a79Afc425BE5ae21); // Address of the Arbitrum Inbox on L1

    address public l2Target; // Address of the LiquidityPool contract on Arbitrum (L2)

    uint256 public l2TotalSupply;
    uint256 public l2Balance;

    event ETHReceived(address sender, uint256 amount);
    event ETHDepositedToLiquidPool(address liquidPool, uint256 amountETH);
    event RatioUpdated(uint256 newRatio);
    event L2InfoReceived(uint256 l2TotalSupply, uint256 l2Balance);
    event RetryableTicketCreated(uint256 indexed ticketId);

    modifier onlyLiquidPool() {
        require(msg.sender == liquidPool);
        _;
    }

    constructor() Ownable(msg.sender) {}

    function updateL2Target(address _l2Target) public {
        l2Target = _l2Target;
    }

    function setInbox(address _inbox) external {
        inbox = IInbox(_inbox);
    }

    /// @notice only l2Target can update greeting
    function receiveL2Info(uint256 _balance, uint256 _totalSupply) public {
        IBridge bridge = inbox.bridge();
        // this prevents reentrancies on L2 to L1 txs
        require(msg.sender == address(bridge), "NOT_BRIDGE");
        IOutbox outbox = IOutbox(bridge.activeOutbox());
        address l2Sender = outbox.l2ToL1Sender();
        require(l2Sender == l2Target, "Rebalancer only updateable by L2");

        l2TotalSupply = _totalSupply;
        l2Balance = _balance;

        //Omnivault mints additional +=_totalSupply tokens

        emit L2InfoReceived(_totalSupply, _balance);
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
