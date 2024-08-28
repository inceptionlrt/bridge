// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "./Rebalancer.sol";

contract Lockbox {
    using SafeERC20 for IERC20;
    using SafeCast for uint256;

    /**
     * @notice The InETH token of this contract
     */
    InETH public immutable inETH;

    /**
     * @notice The Rebalancer contract
     */
    Rebalancer public rebalancer;

    /**
     * @notice Whether the ERC20 token is the native gas token of this chain
     */
    bool public immutable isNative;

    event Deposit(address indexed to, uint256 amount);
    event Withdraw(address indexed to, uint256 amount);

    /**
     * @param _inETH The address of the InETH contract
     * @param _rebalancer The address of the Rebalancer contract
     * @param _isNative Whether the token is the native gas token of this chain
     */
    constructor(address _inETH, address _rebalancer, bool _isNative) payable {
        inETH = InETH(_inETH);
        rebalancer = Rebalancer(_rebalancer);
        isNative = _isNative;
    }

    /**
     * @notice Deposit native tokens into the lockbox
     */
    function depositNative() public payable {
        if (!isNative) revert("Not Native Token");
        _deposit(msg.sender, msg.value);
    }

    /**
     * @notice Deposit InETH tokens into the lockbox
     * @param _amount The amount of tokens to deposit
     */
    function deposit(uint256 _amount) external {
        if (isNative) revert("Native Token Not Supported");
        _deposit(msg.sender, _amount);
    }

    /**
     * @notice Deposit InETH tokens into the lockbox, and send the InETH to a user
     * @param _to The user to send the InETH to
     * @param _amount The amount of tokens to deposit
     */
    function depositTo(address _to, uint256 _amount) external {
        if (isNative) revert("Native Token Not Supported");
        _deposit(_to, _amount);
    }

    /**
     * @notice Deposit the native asset into the lockbox, and send the InETH to a user
     * @param _to The user to send the InETH to
     */
    function depositNativeTo(address _to) external payable {
        if (!isNative) revert("Not Native Token");
        _deposit(_to, msg.value);
    }

    /**
     * @notice Withdraw InETH tokens from the lockbox
     * @param _amount The amount of tokens to withdraw
     */
    function withdraw(uint256 _amount) external {
        _withdraw(msg.sender, _amount);
    }

    /**
     * @notice Withdraw tokens from the lockbox
     * @param _to The user to withdraw to
     * @param _amount The amount of tokens to withdraw
     */
    function withdrawTo(address _to, uint256 _amount) external {
        _withdraw(_to, _amount);
    }

    /**
     * @notice Withdraw tokens from the lockbox
     * @param _to The user to withdraw to
     * @param _amount The amount of tokens to withdraw
     */
    function _withdraw(address _to, uint256 _amount) internal {
        if (_to == address(this)) revert("Wrong Receiver");
        _updateRebalancerOnWithdraw(_amount, _amount);
        inETH.burn(msg.sender, _amount);
        if (isNative) {
            (bool _success, ) = payable(_to).call{value: _amount}("");
            if (!_success) revert("Withdraw Failed");
        } else {
            inETH.safeTransfer(_to, _amount);
        }
        emit Withdraw(_to, _amount);
    }

    /**
     * @notice Deposit tokens into the lockbox
     * @param _to The address to send the InETH to
     * @param _amount The amount of tokens to deposit
     */
    function _deposit(address _to, uint256 _amount) internal {
        if (_to == address(this)) revert("Wrong Receiver");
        _updateRebalancerOnDeposit(_amount, _amount);
        if (!isNative)
            inETH.safeTransferFrom(msg.sender, address(this), _amount);

        inETH.mint(_to, _amount);
        emit Deposit(_to, _amount);
    }

    function _updateRebalancerOnDeposit(
        uint256 _amount,
        uint256 _amountX
    ) internal {
        rebalancer.updateBalanceOnDeposit(_amount, _amountX);
    }

    function _updateRebalancerOnWithdraw(
        uint256 _amount,
        uint256 _amountX
    ) internal {
        rebalancer.updateBalanceOnWithdraw(_amount, _amountX);
    }

    /**
     * @notice Fallback function to deposit native tokens
     */
    receive() external payable {
        depositNative();
    }
}
