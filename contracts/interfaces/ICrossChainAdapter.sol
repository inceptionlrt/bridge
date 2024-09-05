// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface ICrossChainBridge {
    struct Transaction {
        uint256 timestamp;
        uint256 ethBalance;
        uint256 inEthBalance;
    }

    error NotBridge();
    error FutureTimestamp();
    error NotAuthorizedByL2();
    error TransferToRebalancerFailed();
    error SettingZeroAddress();

    event L2InfoReceived(
        uint256 indexed networkId,
        uint256 timestamp,
        uint256 ethBalance,
        uint256 inEthBalance
    );

    event L2EthDeposit(uint256 indexed value);

    function setRebalancer(address _rebalancer) external;

    function setInboxArbitrum(address _inbox) external;

    function setInboxOptimism(address _inbox) external;

    function updateL2Target(address _l2Target) external;

    function addChainId(uint32 newChainId) external;

    function receiveL2InfoArbitrum(
        uint256 _timestamp,
        uint256 _balance,
        uint256 _totalSupply
    ) external;

    function receiveL2InfoOptimism(
        uint256 _timestamp,
        uint256 _balance,
        uint256 _totalSupply
    ) external;

    function getTransactionData(
        uint256 chainId
    ) external view returns (Transaction memory);

    function getAllChainIds() external view returns (uint32[] memory);

    function setLiqPool(address payable _liqPool) external;
}
