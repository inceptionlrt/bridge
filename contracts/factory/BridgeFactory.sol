// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @author The InceptionLRT team
/// @title The BridgeFactory Contract
/// @notice Facilitates the deployment of contracts via create2
contract BridgeFactory {
    event ContractCreated(address indexed addr);

    bytes32 public bridgeSalt = "InceptionLRT Factory";

    function deployContract(
        bytes calldata creationCode
    ) external returns (address) {
        return _deploy(creationCode, msg.sender);
    }

    function _deploy(
        bytes memory bytecode,
        address _sender
    ) internal returns (address) {
        address addr = _create2(bytecode, _sender);
        emit ContractCreated(addr);

        return addr;
    }

    function _create2(
        bytes memory bytecode,
        address _sender
    ) internal returns (address) {
        address payable addr;
        bytes32 salt = _getSalt(bridgeSalt, _sender);

        assembly {
            addr := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
            if iszero(extcodesize(addr)) {
                revert(0, 0)
            }
        }

        return addr;
    }

    function getDeploymentAddress(
        bytes memory bytecode,
        address _sender
    ) public view returns (address) {
        bytes32 salt = _getSalt(bridgeSalt, _sender);
        bytes32 rawAddress = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt,
                keccak256(bytecode)
            )
        );

        return address(bytes20(rawAddress << 96));
    }

    function _getSalt(
        bytes32 _salt,
        address _sender
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_salt, _sender));
    }
}
