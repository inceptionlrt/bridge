const fs = require("fs");
const { ethers } = require("hardhat");
const { printBalance } = require("../utils");
const abiCoder = require("web3-eth-abi");

const DEPLOYER_ADDRESS = "";
const DEPLOYER_NONCE = "0";

// ############ XERC20LockBox ############

// bytes32 _salt = keccak256(abi.encodePacked(_xerc20, _baseToken, msg.sender));
// bytes memory _creation = type(XERC20Lockbox).creationCode;
// bytes memory _bytecode = abi.encodePacked(_creation, abi.encode(_xerc20, _baseToken, _isNative));

const deployXERC20 = async () => {
  console.log("##################################################################");
  console.log("###################### XERC20 deployment #######################");
  console.log("##################################################################\n");

  const [deployer] = await ethers.getSigners();

  //   if ((await deployer.getNonce()).toString() != DEPLOYER_NONCE) {
  //     console.error("WRONG DEPLOYER NONCE");
  //     return;
  //   }
  //   if ((await deployer.getAddress()).toString() != DEPLOYER_ADDRESS) {
  //     console.error("WRONG DEPLOYER NONCE");
  //     return;
  //   }

  await printBalance(deployer);

  /**
   * Factory Deployment
   */

  // bytes32 _salt = keccak256(abi.encodePacked(_name, _symbol, msg.sender));
  // bytes memory _creation = type(XERC20).creationCode;
  // bytes memory _bytecode = abi.encodePacked(_creation, abi.encode(_name, _symbol, address(this)));

  const factoryFac = await ethers.getContractFactory("Create3Factory");
  const factory = factoryFac.attach("");
  const factoryAddress = await factory.getAddress();

  const salt = ethers.solidityPackedKeccak256(["string", "string", "address"], ["Inception Restaked stETH", "InstETH", deployer.address]);
  const abiX = abiCoder.encodeParameters(["string", "string", "address"], ["Inception Restaked stETH", "InstETH", factoryAddress]);

  const xerc20Factory = await ethers.getContractFactory("XERC20");
  const creationCode = xerc20Factory.bytecode;
  const deploymentByteCode = ethers.solidityPacked(["bytes", "bytes"], [creationCode, abiX]);

  const tx = await factory.deploy(salt, deploymentByteCode);
  await tx.wait();
};

async function main() {
  await deployXERC20();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
