// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Lockbox.sol";
import "./CrossChainBridge.sol";

contract InETH is ERC20, Ownable {
    address public rebalancer;
    address public lockbox;

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

    function setRebalancer(address _rebalancer) external onlyOwnerOrRebalancer {
        rebalancer = _rebalancer;
    }

    function setLockbox(address _lockbox) external onlyOwnerOrRebalancer {
        lockbox = _lockbox;
    }

    function mint(uint256 amount) external onlyOwnerOrRebalancer {
        require(lockbox != address(0), "lockbox not set");
        _mint(lockbox, amount);
    }

    function burn(uint256 amount) external onlyOwnerOrRebalancer {
        require(lockbox != address(0), "lockbox not set");
        _burn(lockbox, amount);
    }
}

contract Rebalancer is Ownable {
    address public inETHAddress;
    address public lockboxAddress;
    address payable public crossChainBridge;
    address payable public liqPool;

    uint256 public totalETH;
    uint256 public constant ratio = 0.5 ether;
    uint256 public constant MULTIPLIER = 1e18;
    uint256 public constant MAX_DIFF = 50000000000000000; // 0.05 * 1e18
    uint256 public totalAmountToWithdraw = 0; //stub for getRatio()

    event ETHReceived(address sender, uint256 amount);
    event ETHDepositedToLiquidPool(address liquidPool, uint256 amountETH);
    event InETHDepositedToLockbox(uint256 mintAmount);
    event RatioUpdated(uint256 newRatio);
    event ChainIdAdded(uint32 newChainId);
    event RetryableTicketCreated(uint256 indexed ticketId);

    constructor(address _owner) Ownable(_owner) {}

    function setCrossChainBridge(
        address payable _crossChainBridge
    ) external onlyOwner {
        crossChainBridge = _crossChainBridge;
    }

    function setInETHAddress(address _inETHAddress) external onlyOwner {
        inETHAddress = _inETHAddress;
    }

    function setLockboxAddress(address _lockboxAddress) external onlyOwner {
        lockboxAddress = _lockboxAddress;
    }

    function setLiqPool(address payable _liqPool) external onlyOwner {
        liqPool = _liqPool;
    }

    function updateTreasuryData() public {
        uint256 totalL2InETH = 0;
        uint256 total2ETH = 0;

        CrossChainBridge bridge = CrossChainBridge(crossChainBridge);
        uint32[] memory allChainIds = bridge.getAllChainIds();

        for (uint i = 0; i < allChainIds.length; i++) {
            uint32 chainId = allChainIds[i];
            CrossChainBridge.Transaction memory txData = bridge
                .getTransactionData(chainId);
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
            mintInceptionToken(totalSupplyDiff);
        } else if (_totalInETH > totalL2InETH) {
            burnInceptionToken(totalSupplyDiff);
        }

        // Automatically re-deposit all InETH to Lockbox after treasury update
        uint256 inETHBalance = IERC20(inETHAddress).balanceOf(address(this));
        if (inETHBalance > 0) {
            require(
                IERC20(inETHAddress).transfer(lockboxAddress, inETHBalance),
                "Transfer to Lockbox failed"
            );
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

    function getRatio() public view returns (uint256) {
        uint256 totalDeposited = getTotalDeposited();
        uint256 totalSupply = IERC20(inETHAddress).totalSupply();
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

    function getTotalDeposited() public view returns (uint256) {
        require(liqPool != address(0), "Liquidity pool not set");
        return liqPool.balance;
    }

    function totalInETH() internal view returns (uint256) {
        return IERC20(inETHAddress).balanceOf(lockboxAddress);
    }

    function abs(int256 x) internal pure returns (uint256) {
        return x < 0 ? uint256(-x) : uint256(x);
    }

    function isAGreaterThanB(int256 a, int256 b) internal pure returns (bool) {
        uint256 absA = abs(a);
        uint256 absB = abs(b);
        return absA > absB;
    }

    receive() external payable {
        LiquidPool lp = LiquidPool(liqPool);
        lp.deposit{value: msg.value}();
    }
}

contract LiquidPool {
    address public owner;
    address payable public rebalancerAddress;
    address public inETHAddress;

    event Deposit(address indexed sender, uint256 amount);
    event MintInETH(address indexed recipient, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call");
        _;
    }

    constructor(
        address payable _rebalancerAddress,
        address _inETHAddress,
        address _owner
    ) {
        rebalancerAddress = _rebalancerAddress;
        inETHAddress = _inETHAddress;
        owner = _owner;
    }

    // Function to receive ETH deposits and mint InETH tokens
    function deposit() external payable {
        require(msg.value > 0, "No ETH sent");

        // Get the current minting ratio from Rebalancer
        uint256 mintingRatio = Rebalancer(rebalancerAddress).getRatio();

        // Calculate the amount of InETH to mint
        uint256 inETHToMint = (msg.value * mintingRatio) / 1e18;

        // Mint InETH tokens to the sender
        require(
            IERC20(inETHAddress).transfer(msg.sender, inETHToMint),
            "Minting failed"
        );

        emit Deposit(msg.sender, msg.value);
        emit MintInETH(msg.sender, inETHToMint);
    }

    function setRebalancer(
        address payable _rebalancerAddress
    ) external onlyOwner {
        rebalancerAddress = _rebalancerAddress;
    }

    function setInETHAddress(address _inETHAddress) external onlyOwner {
        inETHAddress = _inETHAddress;
    }
}
