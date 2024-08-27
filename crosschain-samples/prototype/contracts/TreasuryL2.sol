// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@arbitrum/nitro-contracts/src/bridge/Inbox.sol";

/**
 * @title TreasuryL2
 * @dev
 */
contract TreasuryL2 is Ownable {
    IInbox inbox = IInbox(address(100));
    address public l1ReceiverAddress;
    address public refundAddress;
    uint256 public gasLimit;
    uint256 public maxSubmissionCost;

    constructor() Ownable(msg.sender) {}

    function withdrawETHToL1(uint256 amount) external {
        inbox.createRetryableTicket(
            l1ReceiverAddress, // Address on L1 to receive ETH
            amount, // Amount of ETH to transfer
            gasLimit,
            refundAddress,
            refundAddress,
            gasLimit,
            maxSubmissionCost,
            ""
        );
    }

    receive() external payable {}
}
