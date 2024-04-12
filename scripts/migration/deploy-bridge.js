const fs = require("fs");
const { ethers, network } = require("hardhat");
const { printBalance } = require("../utils");
const eth = require("ethereumjs-util");
const rlp = require("rlp");
const Web3 = require("web3");
const abiCoder = require("web3-eth-abi");

/** @var web3 {Web3} */

let tx;

async function bridgeInit(initialOwner, operatorAddress) {
  const methodId = abiCoder.encodeFunctionSignature("initialize(address,address)");
  const params = abiCoder.encodeParameters(["address", "address"], [initialOwner, operatorAddress]);
  return methodId + params.substr(2);
}

function readConfig(dirPath) {
  try {
    const fileContent = fs.readFileSync(dirPath, "utf8");
    const jsonData = JSON.parse(fileContent);
    return jsonData;
  } catch (error) {
    console.error("Error reading JSON files:", error);
  }

  return "";
}

/*******************************************
 ************ Bridge Deployment ************
 *******************************************/

async function deployBridge(bridgeTokens, bridgesToAdd) {
  const [deployer] = await ethers.getSigners();
  printBalance(deployer);

  /// 1. get the implementation from config/addresses
  const bridgePath = `./config/addresses/bridges/${network.name}.json`;
  console.log("bridgePath: ", bridgePath);
  const bridgeAddresses = readConfig(bridgePath.toString());
  console.log(bridgeAddresses);
  const implementationAddress = bridgeAddresses.bridgeImplAddress;
  if (implementationAddress == "") {
    console.error("implementation address is null");
  }

  /// 2. get the Factory address from config/addresses
  const factoryPath = `./config/addresses/factory/${network.name}.json`;
  const factoryAddress = (await readConfig(factoryPath)).factoryAddress;
  if (factoryAddress == "") {
    console.error("factory address is null");
  }

  const factory = await ethers.getContractAt("BridgeFactory", factoryAddress);

  /******************************************
   ************ Proxy Deployment ************
   ******************************************/

  /// Deploy ProxyAdmin
  const proxyAdmin = await ethers.deployContract("ProxyAdmin");
  await proxyAdmin.waitForDeployment();
  const proxyAdminAddress = await proxyAdmin.getAddress();

  console.log(`ProxyAdmin address: ${proxyAdminAddress}`);

  /// Deploy TransparentUpgradeableProxy
  const ProxyFactory = await ethers.getContractFactory("InitializableTransparentUpgradeableProxy");
  const proxyBytecode = ProxyFactory.bytecode;
  const proxyAddress = (await factory.getDeploymentCreate2Address(proxyBytecode, await deployer.getAddress())).toString();
  console.log(`Bridge Proxy address: ${proxyAddress}`);

  tx = await factory.deployCreate2(proxyBytecode);
  await tx.wait();

  const calldata = await bridgeInit(await deployer.getAddress(), "");

  const bridgeProxy = ProxyFactory.attach(proxyAddress);
  tx = await bridgeProxy.initialize(implementationAddress, proxyAdminAddress, calldata);
  await tx.wait();
}

module.exports = {
  deployBridge,
};

async function main() {
  await deployBridge();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
