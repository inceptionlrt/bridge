// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Lockbox is Ownable {
    IERC20 public inETH;

    constructor(address _inETH, address _owner) Ownable(_owner) {
        inETH = IERC20(_inETH);
    }

    // Function to deposit InETH into the Lockbox
    function deposit(uint256 amount) external onlyOwner {
        require(
            inETH.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
    }
}
