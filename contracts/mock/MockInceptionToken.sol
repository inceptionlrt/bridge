// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "../interfaces/IInceptionToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockInceptionToken is IInceptionToken, Ownable {
    // Mapping to store accounts with minter role
    mapping(address => bool) public minters;

    // Mapping to store balances of accounts
    mapping(address => uint256) private _balances;

    bool private _paused;

    event MinterAssigned(address indexed account);
    event MinterRevoked(address indexed account);

    modifier onlyMinter() {
        require(minters[msg.sender], "Caller is not a minter");
        _;
    }

    modifier whenNotPaused() {
        require(!_paused, "InceptionToken: paused");
        _;
    }

    modifier whenPaused() {
        require(_paused, "InceptionToken: not paused");
        _;
    }

    constructor() {
        _paused = false;
    }

    // Assign minter role to an address (only callable by the owner)
    function assignMinter(address account) external onlyOwner {
        require(account != address(0), "Cannot assign zero address");
        minters[account] = true;
        emit MinterAssigned(account);
    }

    // Revoke minter role from an address (only callable by the owner)
    function revokeMinter(address account) external onlyOwner {
        require(minters[account], "Account is not a minter");
        minters[account] = false;
        emit MinterRevoked(account);
    }

    // Mint new tokens (only callable by a minter)
    function mint(
        address account,
        uint256 amount
    ) external override onlyMinter whenNotPaused {
        require(account != address(0), "Cannot mint to zero address");
        require(amount > 0, "Mint amount must be greater than zero");

        _balances[account] += amount;
    }

    // Burn tokens (only callable by a minter)
    function burn(
        address account,
        uint256 amount
    ) external override onlyMinter whenNotPaused {
        require(account != address(0), "Cannot burn from zero address");
        require(_balances[account] >= amount, "Insufficient balance to burn");

        _balances[account] -= amount;
    }

    // Pause minting and burning (only callable by the owner)
    function pause() external onlyOwner whenNotPaused {
        _paused = true;
        emit Paused(msg.sender);
    }

    // Unpause minting and burning (only callable by the owner)
    function unpause() external onlyOwner whenPaused {
        _paused = false;
        emit Unpaused(msg.sender);
    }

    // Return balance of a specific account
    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }
}
