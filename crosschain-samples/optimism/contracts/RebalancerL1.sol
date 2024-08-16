// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface L1CrossDomainMessenger {
    function sendMessage(address _target, bytes calldata _message, uint32 _gasLimit) external;
}

contract Rebalancer {
    address public messenger;  // Address of the L1CrossDomainMessenger on Ethereum
    address public l2Contract; // Address of the target OptimismLiquidityPool contract on Optimism

    uint256 public ethBalance;
    uint256 public inEthBalance;

    event BalancesReceived(uint256 ethBalance, uint256 inEthBalance);

    constructor(address _messenger, address _l2Contract) {
        messenger = _messenger;
        l2Contract = _l2Contract;
    }

    // Function to request balance info from L2
    function requestBalances(address user) external {
        bytes memory message = abi.encodeWithSignature("getBalances(address)", user);

        // Send the message to Optimism
        L1CrossDomainMessenger(messenger).sendMessage(
            l2Contract,    // Target contract on L2
            message,       // Encoded function call
            2000000        // Gas limit for L2 execution
        );
    }

    // Function to receive balance information from L2
    function receiveBalanceInfo(uint256 _ethBalance, uint256 _inEthBalance) external {
        ethBalance = _ethBalance;
        inEthBalance = _inEthBalance;

        emit BalancesReceived(_ethBalance, _inEthBalance);
    }
}
