// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@arbitrum/nitro-contracts/src/bridge/Inbox.sol";
import "@arbitrum/nitro-contracts/src/bridge/Outbox.sol";

contract InETH is ERC20, Ownable {
    address public rebalancer;

    constructor(
        address _owner,
        address _rebalancer
    ) ERC20("inETH", "inETH") Ownable(_owner) {
        rebalancer = _rebalancer;
    }

    /// @notice Allows the owner to update the Rebalancer contract address
    /// @param _rebalancer The address of the new Rebalancer contract
    function setRebalancer(address _rebalancer) external onlyOwner {
        rebalancer = _rebalancer;
    }

    /// @notice Mints `amount` of inETH to `account`
    /// @param account The address to receive the minted tokens
    /// @param amount The amount of tokens to mint
    function mint(address account, uint256 amount) external {
        require(msg.sender == rebalancer, "inETH: Only Rebalancer can mint");
        _mint(account, amount);
    }

    /// @notice Burns `amount` of inETH from `account`
    /// @param amount The amount of tokens to burn
    function burn(uint256 amount) external {
        require(msg.sender == rebalancer, "inETH: Only Rebalancer can burn");
        _burn(msg.sender, amount);
    }
}

contract Rebalancer is Ownable {
    address public liquidPool;
    address public inETHAddress;

    uint256 public totalETH;
    uint256 public totalInETH;
    uint256 public constant ratio = 0.5 ether;
    uint256 public constant DENOMINATOR = 1e18;
    uint256 public constant MAX_DIFF = 100000;

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

        // Calculate the ratio between _totalSupply and _balance from L2
        uint256 calculatedRatio = (_totalSupply * DENOMINATOR) / _balance;

        // Get the current ratio of the Rebalancer
        uint256 currentRatio = getRatio();

        // Ensure the difference between the calculated ratio and the current ratio is within the allowed threshold
        require(
            calculatedRatio <= currentRatio + MAX_DIFF &&
                calculatedRatio >= currentRatio - MAX_DIFF,
            "Calculated ratio difference exceeds allowed threshold"
        );

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

        for (uint i = 0; i < chainIds.length; i++) {
            uint32 chainId = chainIds[i];
            Transaction memory txData = txs[chainId];
            totalL2InETH += txData.inEthBalance;
        }

        int256 difference = int256(totalL2InETH) - int256(totalInETH);

        if (difference > 0) {
            mintInETH(uint256(difference));
        } else if (difference < 0) {
            burnInETH(uint256(-difference));
        }

        totalInETH = totalL2InETH;
    }

    function mintAdmin(uint256 _inEth, uint256 _Eth) external onlyOwner {
        totalETH += _Eth;
        totalInETH += _inEth;
    }

    function burnAdmin(uint256 _inEth, uint256 _Eth) external onlyOwner {
        totalETH -= _Eth;
        totalInETH -= _inEth;
    }

    function getRatio() public view returns (uint256) {
        if (totalInETH == 0 || totalETH == 0) {
            return 0;
        }
        uint256(totalInETH * DENOMINATOR) / totalETH;
    }

    function mintInETH(uint256 amount) internal {
        require(inETHAddress != address(0), "inETH address is not set");
        InETH(inETHAddress).mint(address(this), amount);
    }

    function burnInETH(uint256 amount) internal {
        require(inETHAddress != address(0), "inETH address is not set");
        InETH(inETHAddress).burn(amount);
    }

    function updateBalanceOnDeposit(
        uint256 _tokenAmount,
        uint256 _tokenAmountX
    ) external {
        totalETH += _tokenAmountX;
        totalInETH -= _tokenAmount;
    }
}
