// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@arbitrum/nitro-contracts/src/bridge/Inbox.sol";
import "@arbitrum/nitro-contracts/src/bridge/Outbox.sol";

/// @dev stub for Inception Token
contract InETH is ERC20, Ownable {
    address public rebalancer;

    modifier onlyOwnerOrRebalancer() {
        require(
            msg.sender == owner() || msg.sender == rebalancer,
            "Only owner or rebalancer can call"
        );
        _;
    }

    constructor(
        address _owner,
        address _rebalancer
    ) ERC20("inETH", "inETH") Ownable(_owner) {
        rebalancer = _rebalancer;
    }

    /// @notice Allows the owner to update the Rebalancer contract address
    /// @param _rebalancer The address of the new Rebalancer contract
    function setRebalancer(address _rebalancer) external onlyOwnerOrRebalancer {
        rebalancer = _rebalancer;
    }

    /// @notice Mints `amount` of inETH
    /// @param amount The amount of tokens to mint
    function mint(uint256 amount) external onlyOwnerOrRebalancer {
        require(rebalancer != address(0), "rebalancer not set");
        _mint(rebalancer, amount);
    }

    /// @notice Burns `amount` of inETH from `account`
    /// @param amount The amount of tokens to burn
    function burn(uint256 amount) external onlyOwnerOrRebalancer {
        require(rebalancer != address(0), "rebalancer not set");
        _burn(msg.sender, amount);
    }
}

contract Rebalancer is Ownable {
    address public liquidPool;
    address public inETHAddress;

    uint256 public totalETH;
    uint256 public constant ratio = 0.5 ether;
    uint256 public constant MULTIPLIER = 1e18;
    uint256 public constant MAX_DIFF = 50000000000000000; // 0.05 * 1e18
    uint256 public totalAmountToWithdraw = 0; //stub for getRatio()

    uint24 public constant ARBITRUM_CHAIN_ID = 421614;
    uint24 public constant OPTIMISM_CHAIN_ID = 17000;

    IInbox public inboxArbitrum =
        IInbox(0xaAe29B0366299461418F5324a79Afc425BE5ae21); // Address of the Arbitrum Inbox on L1

    uint256 public l2TotalSupply;
    uint256 public l2Balance;

    address public inboxOptimism;
    address public l2Target; // Address of the LiquidityPool contract on Arbitrum (L2)
    address lockbox;

    mapping(uint256 => Transaction) txs;
    uint32[] public chainIds = [ARBITRUM_CHAIN_ID, OPTIMISM_CHAIN_ID];

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
        uint256 timestamp,
        uint256 l2TotalSupply,
        uint256 l2Balance
    );
    event ChainIdAdded(uint32 newChainId);
    event RetryableTicketCreated(uint256 indexed ticketId);

    modifier onlyLiquidPool() {
        require(msg.sender == liquidPool);
        _;
    }

    constructor(address _owner) Ownable(_owner) {}

    function updateL2Target(address _l2Target) public onlyOwner {
        l2Target = _l2Target;
    }

    function setInboxArbitrum(address _inbox) external onlyOwner {
        inboxArbitrum = IInbox(_inbox);
    }

    function setInboxOptimism(address _inbox) external onlyOwner {
        inboxOptimism = _inbox;
    }

    function setInETHAddress(address _inETHAddress) external onlyOwner {
        inETHAddress = _inETHAddress;
    }

    /// @notice only l2Target can call this
    function receiveL2InfoArbitrum(
        uint256 _timestamp,
        uint256 _balance,
        uint256 _totalSupply
    ) public {
        IBridge bridge = inboxArbitrum.bridge();
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

        emit L2InfoReceived(chainId, _timestamp, _totalSupply, _balance);
    }

    //@notice Function to add a new chain ID to the chainIds array
    function addChainId(uint32 newChainId) external onlyOwner {
        for (uint i = 0; i < chainIds.length; i++) {
            if (chainIds[i] == newChainId) {
                revert("Chain ID already exists");
            }
        }

        chainIds.push(newChainId);
        emit ChainIdAdded(newChainId);
    }

    function receiveBalanceInfoHolesky(
        uint256 _timestamp,
        uint256 _ethBalance,
        uint256 _inEthBalance
    ) external {
        require(msg.sender == inboxOptimism);
        emit L2InfoReceived(
            OPTIMISM_CHAIN_ID,
            _timestamp,
            _inEthBalance,
            _ethBalance
        );
    }

    function updateTreasuryData() external {
        uint256 totalL2InETH = 0;
        uint256 total2ETH = 0;

        for (uint i = 0; i < chainIds.length; i++) {
            uint32 chainId = chainIds[i];
            Transaction memory txData = txs[chainId];
            totalL2InETH += txData.inEthBalance;
            total2ETH += txData.ethBalance;
        }

        uint256 l2Ratio = getRatioL2(totalL2InETH, total2ETH);
        int256 ratioDiff = int256(l2Ratio) - int256(getRatio());

        require(
            !isAGreaterThanB(ratioDiff, int256(MAX_DIFF)),
            "Ratio diff bigger than threshold"
        );

        uint256 _totalInETH = totalInETH();

        uint256 totalSupplyDiff = _totalInETH > totalL2InETH
            ? _totalInETH - totalL2InETH
            : totalL2InETH - _totalInETH;

        if (_totalInETH < totalL2InETH) {
            mintInceptionToken(uint256(totalSupplyDiff));
        } else if (_totalInETH > totalL2InETH) {
            burnInceptionToken(uint256(totalSupplyDiff));
        }
    }

    function mintInceptionToken(uint256 _amountToMint) internal {
        require(inETHAddress != address(0), "inETH address is not set");
        InETH(inETHAddress).mint(_amountToMint);
    }

    function burnInceptionToken(uint256 _amountToBurn) internal {
        require(inETHAddress != address(0), "inETH address is not set");
        InETH(inETHAddress).burn(_amountToBurn);
    }

    function mintAdmin(uint256 _inEth, uint256 _Eth) public onlyOwner {
        require(inETHAddress != address(0), "inETH address is not set");
        totalETH += _Eth;
        InETH(inETHAddress).mint(_inEth);
    }

    function burnAdmin(uint256 _inEth, uint256 _Eth) public onlyOwner {
        require(inETHAddress != address(0), "inETH address is not set");
        totalETH -= _Eth;
        InETH(inETHAddress).burn(_inEth);
    }

    function getRatio() public view returns (uint256) {
        uint256 totalDeposited = getTotalDeposited();
        uint256 totalSupply = IERC20(inETHAddress).totalSupply();
        // take into account the pending withdrawn amount
        uint256 denominator = totalDeposited < totalAmountToWithdraw
            ? 0
            : totalDeposited - totalAmountToWithdraw;

        if (denominator == 0 || totalSupply == 0) return 1e18;

        return (totalSupply * MULTIPLIER) / denominator;
    }

    function getRatioL2(
        uint256 _tokenAmount,
        uint256 _ethAmount
    ) public pure returns (uint256) {
        return (_tokenAmount * MULTIPLIER) / _ethAmount;
    }

    ///@dev stub for getRatio()
    function getTotalDeposited() public view returns (uint256) {
        return totalETH;
    }

    function totalInETH() internal view returns (uint256) {
        return IERC20(inETHAddress).balanceOf(address(this));
    }

    function abs(int256 x) internal pure returns (uint256) {
        return x < 0 ? uint256(-x) : uint256(x);
    }

    // Function to compare the absolute values of two integers
    function isAGreaterThanB(int256 a, int256 b) internal pure returns (bool) {
        uint256 absA = abs(a);
        uint256 absB = abs(b);

        if (absA > absB) {
            return true;
        } else {
            return false;
        }
    }
}
