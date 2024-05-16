const fs = require("fs");
const { ethers, network } = require("hardhat");
const { printBalance, readJson } = require("../utils");
// const eth = require("ethereumjs-util");
// const rlp = require("rlp");
// const Web3 = require("web3");
const abiCoder = require("web3-eth-abi");

/** @var web3 {Web3} */

let tx;

async function bridgeInit(initialOwner, operatorAddress) {
  const methodId = abiCoder.encodeFunctionSignature("initialize(address,address)");
  const params = abiCoder.encodeParameters(["address", "address"], [initialOwner, operatorAddress]);
  return methodId + params.substr(2);
}

/***************************************************
 ************ Implementation Deployment ************
 ***************************************************/

async function deployBridgeImpl() {
  [deployer] = await ethers.getSigners();
  await printBalance(deployer);

  const bridgeImplFactory = await ethers.deployContract("InceptionBridge");
  await bridgeImplFactory.waitForDeployment();

  const bridgeImplAddress = await bridgeImplFactory.getAddress();
  console.log(`Bridge Impl address: ${bridgeImplAddress}`);

  return bridgeImplAddress;
}

/******************************************
 ************ Proxy Deployment ************
 ******************************************/

async function deployBridge(implementationAddress, factoryAddress) {
  if (implementationAddress == "") {
    console.error("implementation address is null");
  }
  if (factoryAddress == "") {
    console.error("factory address is null");
  }

  /// Init Factory
  const factory = await ethers.getContractAt("BridgeFactory", factoryAddress);

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

  return proxyAddress;
}

async function main() {
  /// 2. get the Factory address from config/addresses
  const factoryPath = `./config/addresses/factory/${network.name}.json`;
  const factoryAddress = (await readJson(factoryPath)).factoryAddress;
  if (factoryAddress == "") {
    console.error("factory address is null");
  }

  const bridgeImplAddress = await deployBridgeImpl();
  const bridgeProxyAddress = await deployBridge();

  // Save the Bridge Impl address
  const bridgeAddresses = {
    proxy: bridgeProxyAddress,
    bridgeImplAddress: bridgeImplAddress,
  };

  const json_addresses = JSON.stringify(bridgeAddresses);
  console.log(json_addresses);
  fs.writeFileSync(`./config/addresses/bridges/${network.name}.json`, json_addresses);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
