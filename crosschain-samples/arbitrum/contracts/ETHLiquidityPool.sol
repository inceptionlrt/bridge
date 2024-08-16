// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@arbitrum/nitro-contracts/src/precompiles/ArbSys.sol";
import "@arbitrum/nitro-contracts/src/libraries/AddressAliasHelper.sol";

interface IRebalancer {
    function receiveL2Info(uint256 _totalSupply, uint256 _balance) external;
}

contract ETHLiquidityPool is ERC20 {
    uint256 public immutable mintingRatio = 0.5 ether; // Ratio of LPTs minted per ETH deposited
    ArbSys constant arbsys = ArbSys(address(100));

    address public l1Contract; // Address of the Rebalancer contract on L1
    bool public messageSent;

    event L2ToL1TxCreated(uint256 indexed withdrawalId);

    constructor() ERC20("ETH Liquidity Pool Token", "inETH") {}

    // Deposit ETH to the pool and mint corresponding LPTs
    function deposit() external payable {
        uint256 ethAmount = msg.value;
        require(ethAmount > 0, "Invalid deposit amount");

        uint256 liquidity = ethAmount * mintingRatio;
        _mint(msg.sender, liquidity);

        // The totalSupply() function will now reflect the increase
    }

    function setL1Contract(address _l1Contract) external {
        l1Contract = _l1Contract;
    }

    function sendInfoToL1() public returns (uint256) {
        uint256 balance = address(this).balance;
        uint256 _totalSupply = totalSupply();

        bytes memory data = abi.encodeWithSelector(
            IRebalancer.receiveL2Info.selector,
            balance,
            _totalSupply
        );

        uint256 withdrawalId = arbsys.sendTxToL1(l1Contract, data);

        emit L2ToL1TxCreated(withdrawalId);
        return withdrawalId;
    }

    function setL1Target(address _l1Target) external {
        l1Contract = _l1Target;
    }

    // Withdraw ETH from the pool by burning LP tokens
    function withdraw(uint256 _liquidity) external {
        require(_liquidity > 0, "Invalid withdraw amount");

        // Calculate the amount of ETH to withdraw based on the user's LPT share
        uint256 ethAmount = (_liquidity * address(this).balance) /
            totalSupply();

        // Burn the user's LPTs to decrease the total supply
        _burn(msg.sender, _liquidity);

        // Transfer the corresponding amount of ETH back to the user
        payable(msg.sender).transfer(ethAmount);
    }

    function mint(uint256 _amount) external {
        _mint(address(this), _amount);
    }

    receive() external payable {}
}
