// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface L2CrossDomainMessenger {
    function xDomainMessageSender() external view returns (address);
}

contract OptimismLiquidityPool is ERC20 {
    address public l1Contract;  // Address of the corresponding L1 contract
    address public l2Messenger; // Address of the L2CrossDomainMessenger on Optimism

    constructor(address _l1Contract, address _l2Messenger) ERC20("inETH", "inETH") {
        l1Contract = _l1Contract;
        l2Messenger = _l2Messenger;
    }

    modifier onlyFromL1() {
        require(msg.sender == l2Messenger, "Only L2 messenger can trigger this function.");
        require(
            L2CrossDomainMessenger(l2Messenger).xDomainMessageSender() == l1Contract,
            "Only the authorized L1 contract can trigger this function."
        );
        _;
    }

    // Function to deposit ETH and mint inETH
    function depositETH() external payable {
        require(msg.value > 0, "Must send ETH to deposit");
        _mint(msg.sender, msg.value); // Mint inETH tokens 1:1 with ETH
    }

    // Function to send balance information back to L1
    function getBalances(address user) external onlyFromL1 {
        uint256 ethBalance = address(this).balance;
        uint256 inEthBalance = balanceOf(user);

        bytes memory data = abi.encodeWithSignature(
            "receiveBalanceInfo(uint256,uint256)",
            ethBalance,
            inEthBalance
        );

        // Send the data back to the L1 contract via the L2 messenger
        (bool success, ) = l2Messenger.call(
            abi.encodeWithSignature("sendMessage(address,bytes,uint32)", l1Contract, data, 2000000)
        );
        require(success, "Failed to send message to L1");
    }
}
